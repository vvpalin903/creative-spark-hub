const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'

const BodySchema = z.object({
  type: z.enum([
    'host_application_received',
    'host_application_approved',
    'client_application_received',
    'lot_verified',
    'client_app_to_host',
    'chat_unread_message',
  ]),
  to: z.string().email(),
  data: z.record(z.any()).optional(),
})

const subjects: Record<string, string> = {
  host_application_received: 'Ваша заявка на размещение принята — Место рядом',
  host_application_approved: 'Ваша заявка подтверждена — Место рядом',
  client_application_received: 'Ваша заявка на аренду принята — Место рядом',
  lot_verified: 'Ваш лот подтверждён и скоро будет опубликован — Место рядом',
  client_app_to_host: 'Новая заявка на ваш лот — Место рядом',
}

function buildHtml(type: string, data: Record<string, any> = {}): string {
  const base = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h2 style="color:#2a9d8f;">Место рядом</h2>
      </div>
      {{CONTENT}}
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="font-size:12px;color:#999;">Это автоматическое уведомление от сервиса «Место рядом». Координация осуществляется по электронной почте.</p>
    </div>
  `

  let content = ''

  switch (type) {
    case 'host_application_received':
      content = `
        <h3>Здравствуйте, ${data.name || ''}!</h3>
        <p>Ваша заявка на размещение по адресу <strong>${data.address || ''}</strong> успешно принята.</p>
        <p>Мы рассмотрим её в ближайшее время и свяжемся с вами по электронной почте.</p>
      `
      break
    case 'host_application_approved':
      content = `
        <h3>Здравствуйте, ${data.name || ''}!</h3>
        <p>Ваша заявка на размещение по адресу <strong>${data.address || ''}</strong> <strong style="color:#2a9d8f;">подтверждена</strong>!</p>
        <p>Ваш объект добавлен в каталог и скоро будет доступен клиентам.</p>
        ${data.is_mytishchi === false ? '<p style="color:#e76f51;"><strong>Обратите внимание:</strong> сервис работает в тестовом режиме, проверка объектов осуществляется пока только в границах г. Мытищи Московской области.</p>' : ''}
      `
      break
    case 'client_application_received':
      content = `
        <h3>Здравствуйте, ${data.name || ''}!</h3>
        <p>Ваша заявка на аренду места для хранения успешно принята.</p>
        ${data.lot_title ? `<p>Лот: <strong>${data.lot_title}</strong></p>` : ''}
        <p>Мы свяжемся с вами по электронной почте для координации.</p>
        ${data.is_mytishchi === false ? '<p style="color:#e76f51;"><strong>Обратите внимание:</strong> сервис работает в тестовом режиме, проверка объектов осуществляется пока только в границах г. Мытищи Московской области.</p>' : ''}
      `
      break
    case 'lot_verified':
      content = `
        <h3>Здравствуйте, ${data.name || ''}!</h3>
        <p>Ваш лот по адресу <strong>${data.address || ''}</strong> успешно прошёл верификацию и скоро будет опубликован.</p>
        <p>Когда клиент оставит заявку на ваш лот, вы получите уведомление на эту почту.</p>
      `
      break
    case 'client_app_to_host':
      content = `
        <h3>Новая заявка на ваш лот!</h3>
        <p>Клиент <strong>${data.client_name || ''}</strong> оставил заявку на ваш лот: <strong>${data.lot_title || ''}</strong>.</p>
        <p>Email клиента: <a href="mailto:${data.client_email || ''}">${data.client_email || ''}</a></p>
        <p>Телефон клиента: ${data.client_phone || ''}</p>
        ${data.comment ? `<p>Комментарий: ${data.comment}</p>` : ''}
        ${data.desired_date ? `<p>Желаемая дата начала: ${data.desired_date}</p>` : ''}
        ${data.hide_url ? `<br/><p>Если вы хотите снять это объявление с публикации, нажмите кнопку ниже:</p><a href="${data.hide_url}" style="display:inline-block;padding:12px 24px;background:#e76f51;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Скрыть объявление</a>` : ''}
      `
      break
  }

  return base.replace('{{CONTENT}}', content)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured')

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured')

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { type, to, data } = parsed.data

    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: 'Место рядом <onboarding@resend.dev>',
        to: [to],
        subject: subjects[type] || 'Уведомление — Место рядом',
        html: buildHtml(type, data || {}),
      }),
    })

    const result = await response.json()
    if (!response.ok) {
      console.error(`Resend API error [${response.status}]:`, result)
      // Return 200 with warning instead of 500 — email is best-effort
      return new Response(JSON.stringify({ success: false, warning: `Email not sent: ${result?.message || response.status}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    console.error('Error sending notification:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
