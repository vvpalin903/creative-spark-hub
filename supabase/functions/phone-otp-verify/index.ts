import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const rawCode: string = String(body.code ?? "").trim();
    if (!/^\d{3,9}$/.test(rawCode)) {
      return new Response(JSON.stringify({ error: "Введите числовой код" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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
      return new Response(JSON.stringify({ error: "Активная сессия подтверждения не найдена. Запросите код заново." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (pv.expires_at && new Date(pv.expires_at).getTime() < Date.now()) {
      await admin.from("phone_verifications").update({ status: "failed" }).eq("id", pv.id);
      return new Response(JSON.stringify({ error: "Код истёк. Запросите новый." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // auth_id format: "<check_id>|<expected_code>"
    const stored = String(pv.auth_id ?? "");
    const sepIdx = stored.indexOf("|");
    const expectedCode = sepIdx >= 0 ? stored.slice(sepIdx + 1) : stored;
    const verified = expectedCode && rawCode === expectedCode;

    const newAttempts = (pv.attempts ?? 0) + 1;
    await admin
      .from("phone_verifications")
      .update({
        attempts: newAttempts,
        status: verified ? "verified" : newAttempts >= 3 ? "failed" : "pending",
        verified_at: verified ? new Date().toISOString() : null,
      })
      .eq("id", pv.id);

    if (!verified) {
      return new Response(JSON.stringify({ error: "Неверный код. Введите последние 4 цифры номера, с которого был звонок." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await admin.from("profiles").update({ phone_verified: true, phone: pv.phone }).eq("user_id", userId);
    await admin.from("verification_logs").insert({
      user_id: userId,
      verification_type: "phone",
      verification_status: "verified",
      comment: "sms.ru callcheck verified",
    });

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("phone-otp-verify error", e);
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
