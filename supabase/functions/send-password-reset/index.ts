import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'

function buildHtml(name: string, link: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h2 style="color:#2a9d8f;">Место рядом</h2>
      </div>
      <h3>Здравствуйте${name ? `, ${name}` : ''}!</h3>
      <p>Вы запросили смену пароля для своего аккаунта на сервисе «Место рядом».</p>
      <p>Нажмите на кнопку ниже, чтобы задать новый пароль. Ссылка действительна в течение 1 часа.</p>
      <p style="margin:24px 0;">
        <a href="${link}" style="display:inline-block;padding:12px 24px;background:#2a9d8f;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Сменить пароль</a>
      </p>
      <p style="font-size:13px;color:#666;">Если кнопка не работает, скопируйте ссылку в браузер:<br/><a href="${link}" style="color:#2a9d8f;word-break:break-all;">${link}</a></p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="font-size:12px;color:#999;">Если вы не запрашивали смену пароля, просто проигнорируйте это письмо. Аккаунт останется в безопасности.</p>
    </div>
  `
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { email, redirect_to } = await req.json()
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'email required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

    // Generate recovery link via Admin API (does NOT send Supabase's default email)
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: redirect_to || undefined },
    })

    if (linkErr) {
      console.error('generateLink error:', linkErr)
      // Always return success to avoid email enumeration
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const actionLink = linkData?.properties?.action_link
    if (!actionLink) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get user name (optional)
    let name = ''
    try {
      const { data: prof } = await admin
        .from('profiles')
        .select('name')
        .eq('email', email)
        .maybeSingle()
      name = (prof?.name as string) || ''
    } catch (_) {}

    const resp = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: 'Место рядом <onboarding@resend.dev>',
        to: [email],
        subject: 'Смена пароля — Место рядом',
        html: buildHtml(name, actionLink),
      }),
    })

    const result = await resp.json()
    if (!resp.ok) {
      console.error('Resend error:', resp.status, result)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('send-password-reset error:', e)
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
