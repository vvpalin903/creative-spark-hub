import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SMSRU_CALLCHECK_STATUS = "https://sms.ru/callcheck/status";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiId = Deno.env.get("SMSRU_API_ID");
    if (!apiId) {
      return new Response(JSON.stringify({ error: "Сервис верификации не настроен" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const sessionToken = String(body.session_token ?? "").trim();
    if (!sessionToken) {
      return new Response(JSON.stringify({ error: "Нет токена сессии" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: pv, error: pvErr } = await admin
      .from("pending_phone_verifications")
      .select("*")
      .eq("session_token", sessionToken)
      .maybeSingle();

    if (pvErr || !pv) {
      return new Response(JSON.stringify({ status: "not_found", error: "Сессия не найдена" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (pv.status === "verified") {
      return new Response(JSON.stringify({ status: "verified" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (pv.expires_at && new Date(pv.expires_at).getTime() < Date.now()) {
      await admin.from("pending_phone_verifications").update({ status: "expired" }).eq("id", pv.id);
      return new Response(JSON.stringify({ status: "expired" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const params = new URLSearchParams({ api_id: apiId, check_id: pv.check_id, json: "1" });
    const smsRes = await fetch(`${SMSRU_CALLCHECK_STATUS}?${params.toString()}`);
    const smsJson = await smsRes.json().catch(() => ({} as any));

    // sms.ru codes: 400 = ожидаем звонка, 401 = подтверждён, 402 = истекло
    const checkStatus = Number(smsJson?.check_status);
    const verified = smsJson?.status === "OK" && checkStatus === 401;
    const expired = smsJson?.status === "OK" && checkStatus === 402;

    await admin
      .from("pending_phone_verifications")
      .update({ attempts: (pv.attempts ?? 0) + 1 })
      .eq("id", pv.id);

    if (expired) {
      await admin.from("pending_phone_verifications").update({ status: "expired" }).eq("id", pv.id);
      return new Response(JSON.stringify({ status: "expired", check_status: checkStatus, check_status_text: smsJson?.check_status_text }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!verified) {
      return new Response(JSON.stringify({
        status: "pending",
        check_status: checkStatus,
        check_status_text: smsJson?.check_status_text,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await admin
      .from("pending_phone_verifications")
      .update({ status: "verified", verified_at: new Date().toISOString() })
      .eq("id", pv.id);

    return new Response(JSON.stringify({ status: "verified" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("phone-precheck-status error", e);
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
