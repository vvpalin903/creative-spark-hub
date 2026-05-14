import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NOTIFICORE_BASE = "https://one-api.notificore.ru";
const NOTIFICORE_URL = `${NOTIFICORE_BASE}/api/2fa/authentications/otp`;
const NOTIFICORE_TEMPLATES_URL = `${NOTIFICORE_BASE}/api/2fa/authentications/templates`;

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
  // Tokens typically last ~1h; cache for 50 minutes
  cachedJwt = { token: json.bearer ?? json.token, exp: Date.now() + 50 * 60_000 };
  return cachedJwt!.token;
}

type NotificoreTemplate = {
  template_id?: string | number;
  countries?: string[];
  status?: string;
  updated_at?: string;
};

async function resolveTemplateId(jwt: string, configuredTemplateId: string, phone: string): Promise<number> {
  const country = phone.startsWith("7") ? "RU" : undefined;
  const params = new URLSearchParams({
    "filter[status]": "approved",
    "page[limit]": "100",
    sort: "updated_at",
    way: "desc",
  });

  const res = await fetch(`${NOTIFICORE_TEMPLATES_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Notificore template lookup failed: ${res.status} ${JSON.stringify(json)}`);
  }

  const templates: NotificoreTemplate[] = Array.isArray(json?.data) ? json.data : [];
  const configured = Number(configuredTemplateId);
  const approvedConfigured = templates.find((template) => Number(template.template_id) === configured);
  if (Number.isInteger(configured) && configured > 0 && approvedConfigured) return configured;

  const fallback = templates.find((template) => {
    if (!country) return true;
    const countries = Array.isArray(template.countries) ? template.countries.map((item) => String(item).toUpperCase()) : [];
    return countries.length === 0 || countries.includes(country);
  }) ?? templates[0];

  const fallbackId = Number(fallback?.template_id);
  if (Number.isInteger(fallbackId) && fallbackId > 0) {
    console.warn("Configured Notificore template is not approved; using approved fallback template", {
      configuredTemplateId,
      fallbackTemplateId: fallbackId,
    });
    return fallbackId;
  }

  throw new Error(`No approved Notificore OTP template found. Configured template ${configuredTemplateId} is not usable.`);
}

function normalizePhone(raw: string): string | null {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return null;
  // RU: leading 8 -> 7
  if (digits.length === 11 && digits.startsWith("8")) return "7" + digits.slice(1);
  return digits;
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
    const rawPhone: string = body.phone ?? "";
    const phone = normalizePhone(rawPhone);
    if (!phone) {
      return new Response(JSON.stringify({ error: "Некорректный номер телефона" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = Deno.env.get("NOTIFICORE_API_KEY");
    const sender = Deno.env.get("NOTIFICORE_SENDER");
    const templateId = Deno.env.get("NOTIFICORE_TEMPLATE_ID");
    if (!apiKey || !sender || !templateId) {
      console.error("Missing Notificore env vars");
      return new Response(JSON.stringify({ error: "Сервис OTP не настроен" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Rate-limit: max 1 request per 60 sec per user
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: recent } = await admin
      .from("phone_verifications")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recent && Date.now() - new Date(recent.created_at).getTime() < 60_000) {
      return new Response(JSON.stringify({ error: "Подождите перед повторной отправкой кода" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const jwt = await getNotificoreJwt(apiKey);
    const resolvedTemplateId = await resolveTemplateId(jwt, templateId, phone);

    const payload = {
      recipient: phone,
      channel: "sms",
      sender,
      template_id: resolvedTemplateId,
      code_lifetime: 300,
      code_max_tries: 3,
      code_digits: 5,
    };

    const ncRes = await fetch(NOTIFICORE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jwt}`,
      },
      body: JSON.stringify(payload),
    });

    const ncJson = await ncRes.json().catch(() => ({}));
    const ncData = ncJson?.data ?? ncJson;
    if (!ncRes.ok || !ncData?.id) {
      console.error("Notificore send error", ncRes.status, ncJson);
      return new Response(JSON.stringify({ error: "Не удалось отправить код", details: ncJson }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await admin.from("phone_verifications").insert({
      user_id: userId,
      phone,
      auth_id: ncData.id,
      status: "pending",
      expires_at: ncData.expired_at ?? null,
    });

    // Update phone on profile (unverified yet)
    await admin.from("profiles").update({ phone }).eq("user_id", userId);

    return new Response(JSON.stringify({ ok: true, phone, expires_at: ncData.expired_at }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("phone-otp-send error", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
