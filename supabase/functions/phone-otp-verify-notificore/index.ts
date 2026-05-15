import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NOTIFICORE_BASE = "https://one-api.notificore.ru";
const NOTIFICORE_URL = `${NOTIFICORE_BASE}/api/2fa/authentications/otp`;

let cachedJwt: { token: string; exp: number } | null = null;

async function getNotificoreJwt(apiKey: string): Promise<string> {
  if (cachedJwt && cachedJwt.exp > Date.now() + 60_000) return cachedJwt.token;
  const res = await fetch(`${NOTIFICORE_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !(json?.bearer ?? json?.token)) {
    throw new Error(`Notificore auth failed: ${res.status} ${JSON.stringify(json)}`);
  }
  cachedJwt = { token: json.bearer ?? json.token, exp: Date.now() + 50 * 60_000 };
  return cachedJwt!.token;
}

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

    const apiKey = Deno.env.get("NOTIFICORE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Сервис OTP не настроен" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

    const jwt = await getNotificoreJwt(apiKey);
    const ncRes = await fetch(`${NOTIFICORE_URL}/${pv.auth_id}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jwt}`,
      },
      body: JSON.stringify({ access_code: Number(rawCode) }),
    });

    const ncJson = await ncRes.json().catch(() => ({}));
    const ncData = ncJson?.data ?? ncJson;
    const verified = ncRes.ok && (ncData?.status === "verified" || ncData?.status === "completed" || ncData?.verified === true);

    await admin
      .from("phone_verifications")
      .update({
        attempts: (pv.attempts ?? 0) + 1,
        status: verified ? "verified" : pv.attempts >= 2 ? "failed" : "pending",
        verified_at: verified ? new Date().toISOString() : null,
      })
      .eq("id", pv.id);

    if (!verified) {
      console.warn("Notificore verify failed", ncRes.status, ncJson);
      return new Response(JSON.stringify({ error: "Неверный или просроченный код" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await admin.from("profiles").update({ phone_verified: true, phone: pv.phone }).eq("user_id", userId);
    await admin.from("verification_logs").insert({
      user_id: userId,
      verification_type: "phone",
      verification_status: "verified",
      comment: "Notificore 2FA OTP verified",
    });

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("phone-otp-verify error", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
