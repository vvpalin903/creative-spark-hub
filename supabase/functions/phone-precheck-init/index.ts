import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SMSRU_CALLCHECK_ADD = "https://sms.ru/callcheck/add";

function normalizePhone(raw: string): string | null {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return null;
  if (digits.length === 11 && digits.startsWith("8")) return "7" + digits.slice(1);
  return digits;
}

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
    const phone = normalizePhone(body.phone ?? "");
    if (!phone) {
      return new Response(JSON.stringify({ error: "Некорректный номер телефона" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Rate-limit by phone: max 1 init per 60 sec
    const { data: recent } = await admin
      .from("pending_phone_verifications")
      .select("created_at")
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recent && Date.now() - new Date(recent.created_at).getTime() < 60_000) {
      return new Response(JSON.stringify({ error: "Подождите перед повторной проверкой" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const params = new URLSearchParams({ api_id: apiId, phone, ip: "-1", json: "1" });
    const smsRes = await fetch(`${SMSRU_CALLCHECK_ADD}?${params.toString()}`);
    const smsJson = await smsRes.json().catch(() => ({} as any));

    if (smsJson?.status !== "OK" || !smsJson?.check_id || !smsJson?.call_phone) {
      console.error("sms.ru callcheck/add error", smsJson);
      return new Response(JSON.stringify({
        error: smsJson?.status_text || "Не удалось инициировать проверку",
        details: smsJson,
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sessionToken = crypto.randomUUID();
    const checkId = String(smsJson.check_id);
    const callPhone = String(smsJson.call_phone);
    const callPhonePretty = String(smsJson.call_phone_pretty ?? smsJson.call_phone);
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();

    const { error: insErr } = await admin.from("pending_phone_verifications").insert({
      session_token: sessionToken,
      phone,
      check_id: checkId,
      call_phone: callPhone,
      status: "pending",
      expires_at: expiresAt,
    });
    if (insErr) {
      console.error("DB insert error", insErr);
      return new Response(JSON.stringify({ error: "Не удалось сохранить сессию" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      ok: true,
      session_token: sessionToken,
      phone,
      call_phone: callPhone,
      call_phone_pretty: callPhonePretty,
      expires_at: expiresAt,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("phone-precheck-init error", e);
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
