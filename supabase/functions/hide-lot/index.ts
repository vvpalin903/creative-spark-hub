import { corsHeaders } from '@supabase/supabase-js/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('token')

    if (!token) {
      return new Response(html('Ошибка', 'Токен не указан'), {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: lot, error } = await supabase
      .from('lots')
      .select('id, title, status')
      .eq('hide_token', token)
      .single()

    if (error || !lot) {
      return new Response(html('Не найдено', 'Объявление не найдено или ссылка недействительна.'), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    if (lot.status === 'archived') {
      return new Response(html('Уже скрыто', `Объявление «${lot.title}» уже было снято с публикации.`), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    const { error: updateError } = await supabase
      .from('lots')
      .update({ status: 'archived' })
      .eq('id', lot.id)

    if (updateError) throw updateError

    return new Response(html('Готово!', `Объявление «${lot.title}» снято с публикации.`), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err: unknown) {
    console.error('hide-lot error:', err)
    return new Response(html('Ошибка', 'Произошла ошибка при обработке запроса.'), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
})

function html(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — Место рядом</title>
<style>body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f0faf8;}
.card{background:white;padding:40px;border-radius:12px;text-align:center;max-width:400px;box-shadow:0 4px 20px rgba(0,0,0,0.1);}
h1{color:#2a9d8f;margin-bottom:16px;}p{color:#555;line-height:1.5;}</style>
</head><body><div class="card"><h1>${title}</h1><p>${message}</p></div></body></html>`
}
