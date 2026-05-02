// Cron: переводим заявки в expired, если хост не ответил >48ч
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Находим заявки 'new', созданные >48ч назад, с host_user_id
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: stale, error } = await admin
    .from('booking_requests')
    .select('id, client_email, client_name, client_user_id')
    .eq('request_status', 'new')
    .not('host_user_id', 'is', null)
    .lt('created_at', cutoff);

  if (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }

  let expired = 0;
  for (const r of stale || []) {
    await admin.from('booking_requests').update({ request_status: 'expired' }).eq('id', r.id);
    expired++;

    // Email клиенту
    if (r.client_email) {
      try {
        await admin.functions.invoke('send-notification', {
          body: {
            type: 'client_application_received',
            to: r.client_email,
            data: { name: r.client_name, message: 'Хост не ответил в течение 48 часов. Заявка отмечена как истекшая.' },
          },
        });
      } catch (e) { console.error('email failed', e); }
    }
  }

  return new Response(JSON.stringify({ success: true, expired }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
