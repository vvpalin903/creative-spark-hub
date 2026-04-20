// Periodic check: send email notifications for unread chat messages older than 5 minutes.
// Throttle: max 1 email per (recipient, chat) per hour.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// Test mode: until domain verified, all emails go to admin
const ADMIN_EMAIL = 'vvpalin903@gmail.com'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    // 1. Find unread messages older than 5 minutes (text only, not system)
    const { data: messages, error: msgErr } = await supabase
      .from('messages')
      .select('id, chat_id, sender_user_id, message_text, created_at')
      .eq('message_type', 'text')
      .lt('created_at', fiveMinAgo)
      .order('created_at', { ascending: false })
      .limit(500)
    if (msgErr) throw msgErr
    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ processed: 0, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Group latest message per chat
    const latestByChat = new Map<string, typeof messages[0]>()
    for (const m of messages) {
      if (!latestByChat.has(m.chat_id)) latestByChat.set(m.chat_id, m)
    }

    let sentCount = 0
    let processedCount = 0

    for (const [chatId, lastMsg] of latestByChat) {
      processedCount++

      // 2. Get all participants of this chat
      const { data: parts } = await supabase
        .from('chat_participants')
        .select('user_id, last_read_at')
        .eq('chat_id', chatId)
      if (!parts) continue

      // 3. For each participant who isn't the sender and hasn't read the message
      for (const p of parts) {
        if (p.user_id === lastMsg.sender_user_id) continue
        const lastRead = p.last_read_at || '1970-01-01T00:00:00Z'
        if (new Date(lastRead) >= new Date(lastMsg.created_at)) continue

        // 4. Throttle check: skip if notified within last hour
        const { data: throttle } = await supabase
          .from('chat_email_notifications')
          .select('last_notified_at')
          .eq('recipient_user_id', p.user_id)
          .eq('chat_id', chatId)
          .maybeSingle()
        if (throttle && throttle.last_notified_at >= oneHourAgo) continue

        // 5. Get recipient email + name
        const { data: recipientProfile } = await supabase
          .from('profiles')
          .select('email, name')
          .eq('user_id', p.user_id)
          .maybeSingle()
        if (!recipientProfile?.email) continue

        // 6. Get sender name
        let senderName = 'Пользователь'
        if (lastMsg.sender_user_id) {
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('name')
            .eq('user_id', lastMsg.sender_user_id)
            .maybeSingle()
          if (senderProfile?.name) senderName = senderProfile.name
        }

        // 7. Get lot title (if related)
        let lotTitle = ''
        const { data: chat } = await supabase
          .from('chats')
          .select('related_object_id')
          .eq('id', chatId)
          .maybeSingle()
        if (chat?.related_object_id) {
          const { data: obj } = await supabase
            .from('host_objects')
            .select('title')
            .eq('id', chat.related_object_id)
            .maybeSingle()
          if (obj?.title) lotTitle = obj.title
        }

        // 8. Build chat URL — receiver's dashboard
        const { data: roleRow } = await supabase
          .from('chat_participants')
          .select('role_in_chat')
          .eq('chat_id', chatId)
          .eq('user_id', p.user_id)
          .maybeSingle()
        const dashRole = roleRow?.role_in_chat === 'host' ? 'host' : 'client'
        const origin = req.headers.get('origin') || 'https://id-preview--22b95138-ba6b-4804-a126-6542b1dc1cb0.lovable.app'
        const chatUrl = `${origin}/dashboard/${dashRole}`

        // 9. Send via send-notification (test mode: route to admin)
        const preview = lastMsg.message_text.slice(0, 200) + (lastMsg.message_text.length > 200 ? '…' : '')
        try {
          await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              type: 'chat_unread_message',
              to: ADMIN_EMAIL, // test mode
              data: {
                recipient_name: recipientProfile.name || 'Пользователь',
                sender_name: senderName,
                lot_title: lotTitle,
                message_preview: preview,
                chat_url: chatUrl,
                _real_recipient: recipientProfile.email, // for debugging
              },
            }),
          })
          sentCount++
        } catch (e) {
          console.error('Failed to send notification:', e)
          continue
        }

        // 10. Upsert throttle record
        await supabase
          .from('chat_email_notifications')
          .upsert(
            { recipient_user_id: p.user_id, chat_id: chatId, last_notified_at: new Date().toISOString() },
            { onConflict: 'recipient_user_id,chat_id' }
          )
      }
    }

    return new Response(JSON.stringify({ processed: processedCount, sent: sentCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('notify-unread-messages error:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
