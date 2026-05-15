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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiId = Deno.env.get("SMSRU_API_ID");
    if (!apiId) {
      return new Response(JSON.stringify({ error: "Сервис верификации не настроен" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: pv, error: pvErr } = await admin
      .from("phone_verifications")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pvErr || !pv) {
      return new Response(JSON.stringify({ error: "Активная сессия подтверждения не найдена. Запросите новую." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (pv.expires_at && new Date(pv.expires_at).getTime() < Date.now()) {
      await admin.from("phone_verifications").update({ status: "failed" }).eq("id", pv.id);
      return new Response(JSON.stringify({ status: "expired", error: "Время ожидания истекло. Запросите новую проверку." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const checkId = String(pv.auth_id ?? "");
    const params = new URLSearchParams({ api_id: apiId, check_id: checkId, json: "1" });
    const smsRes = await fetch(`${SMSRU_CALLCHECK_STATUS}?${params.toString()}`);
    const smsJson = await smsRes.json().catch(() => ({} as any));

    // sms.ru: check_status 401 = ожидание звонка, 402 = звонок принят (успех)
    const checkStatus = Number(smsJson?.check_status);
    const verified = smsJson?.status === "OK" && checkStatus === 402;

    if (!verified) {
      return new Response(JSON.stringify({
        status: "pending",
        check_status: checkStatus,
        check_status_text: smsJson?.check_status_text,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await admin
      .from("phone_verifications")
      .update({ status: "verified", verified_at: new Date().toISOString() })
      .eq("id", pv.id);

    await admin.from("profiles").update({ phone_verified: true, phone: pv.phone }).eq("user_id", userId);
    await admin.from("verification_logs").insert({
      user_id: userId,
      verification_type: "phone",
      verification_status: "verified",
      comment: "sms.ru callcheck verified (incoming call)",
    });

    return new Response(JSON.stringify({ ok: true, status: "verified" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("phone-otp-verify error", e);
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
