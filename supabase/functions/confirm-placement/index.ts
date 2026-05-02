// Хост подтверждает заявку → создаём placement, статус заявки = accepted
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: claims } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (!claims?.claims) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    const userId = claims.claims.sub;

    const { request_id } = await req.json();
    if (!request_id) {
      return new Response(JSON.stringify({ error: 'request_id required' }), { status: 400, headers: corsHeaders });
    }

    // Загружаем заявку
    const { data: br, error: brErr } = await admin
      .from('booking_requests').select('*').eq('id', request_id).single();
    if (brErr || !br) return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404, headers: corsHeaders });

    if (br.host_user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Only host can confirm' }), { status: 403, headers: corsHeaders });
    }
    if (!br.start_date || !br.slot_id) {
      return new Response(JSON.stringify({ error: 'start_date и slot_id должны быть заполнены' }), { status: 400, headers: corsHeaders });
    }
    if (!['new', 'viewed'].includes(br.request_status)) {
      return new Response(JSON.stringify({ error: `Нельзя подтвердить заявку в статусе ${br.request_status}` }), { status: 400, headers: corsHeaders });
    }

    // Создаём placement
    const { data: placement, error: pErr } = await admin
      .from('placements').insert({
        booking_request_id: br.id,
        client_user_id: br.client_user_id,
        host_user_id: br.host_user_id,
        object_id: br.object_id,
        slot_id: br.slot_id,
        placement_status: 'upcoming',
        started_at: br.start_date,
        ended_at: br.end_date,
      }).select().single();
    if (pErr) throw pErr;

    // Обновляем статус заявки
    await admin.from('booking_requests').update({ request_status: 'accepted' }).eq('id', br.id);

    // Системное сообщение в чат
    const { data: chat } = await admin.from('chats').select('id').eq('related_request_id', br.id).maybeSingle();
    if (chat) {
      await admin.from('messages').insert({
        chat_id: chat.id, sender_user_id: null, message_type: 'system',
        message_text: `Хост подтвердил размещение с ${br.start_date}${br.end_date ? ` по ${br.end_date}` : ''}.`,
      });
    }

    // Email клиенту (если есть и в настройках разрешено)
    if (br.client_email) {
      try {
        const { data: prof } = await admin.from('profiles').select('notification_prefs')
          .eq('user_id', br.client_user_id).maybeSingle();
        const prefs = (prof?.notification_prefs as any) || {};
        if (prefs.email_request_status !== false) {
          await admin.functions.invoke('send-notification', {
            body: {
              type: 'host_application_approved',
              to: br.client_email,
              data: { name: br.client_name, address: '' },
            },
          });
        }
      } catch (e) { console.error('email failed', e); }
    }

    return new Response(JSON.stringify({ success: true, placement_id: placement.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
