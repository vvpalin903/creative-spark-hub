import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NOTIFICORE_BASE = "https://one-api.notificore.ru";
const NOTIFICORE_URL = `${NOTIFICORE_BASE}/api/2fa/authentications`;

async function getNotificoreJwt(apiKey: string): Promise<string> {
  const res = await fetch(`${NOTIFICORE_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !(json?.bearer ?? json?.token)) {
    throw new Error(`Notificore auth failed: ${res.status} ${JSON.stringify(json)}`);
  }
  return json.bearer ?? json.token;
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
    const apiKey = Deno.env.get("NOTIFICORE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Сервис OTP не настроен" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const phone = String(body.phone ?? "").replace(/\D/g, "");
    const admin = createClient(supabaseUrl, serviceKey);
    let query = admin.from("phone_verifications").select("auth_id, phone, created_at, expires_at, status").eq("user_id", userData.user.id).order("created_at", { ascending: false }).limit(1);
    if (phone) query = query.eq("phone", phone);
    const { data: verification, error: verificationError } = await query.maybeSingle();
    if (verificationError || !verification) {
      return new Response(JSON.stringify({ error: "OTP-сессия не найдена" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const jwt = await getNotificoreJwt(apiKey);
    const statusRes = await fetch(`${NOTIFICORE_URL}/${verification.auth_id}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const statusJson = await statusRes.json().catch(() => ({}));
    const data = statusJson?.data ?? statusJson;
    const messages = Array.isArray(data?.messages) ? data.messages : [];
    const messageStatuses = messages
      .map((message) => String((message?.data ?? message)?.status ?? ""))
      .filter(Boolean);
    const deliveryStatus = messageStatuses.includes("delivered")
      ? "delivered"
      : messageStatuses.includes("undelivered")
        ? "undelivered"
        : messageStatuses.includes("accepted")
          ? "accepted"
          : "pending";

    return new Response(JSON.stringify({
      ok: statusRes.ok,
      auth_status: data?.status ?? verification.status,
      delivery_status: deliveryStatus,
      expires_at: data?.expired_at ?? verification.expires_at,
    }), {
      status: statusRes.ok ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
