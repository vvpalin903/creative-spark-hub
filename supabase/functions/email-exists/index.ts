import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizePhone(raw: string): string | null {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) return "7" + digits.slice(1);
  if (digits.length === 11 && digits.startsWith("7")) return digits;
  if (digits.length === 10) return "7" + digits;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { email, phone } = await req.json();
    const normEmail = typeof email === "string" ? email.trim().toLowerCase() : null;
    const normPhone = typeof phone === "string" ? normalizePhone(phone) : null;

    if (!normEmail && !normPhone) {
      return new Response(JSON.stringify({ error: "email or phone required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let emailExists = false;
    let phoneExists = false;

    if (normEmail) {
      const { data: prof } = await admin
        .from("profiles").select("user_id").ilike("email", normEmail).limit(1).maybeSingle();
      if (prof) emailExists = true;
    }
    if (normPhone) {
      const { data: prof } = await admin
        .from("profiles").select("user_id").eq("phone", normPhone).limit(1).maybeSingle();
      if (prof) phoneExists = true;
    }

    // Fallback for email: scan auth.users (covers users without a profile row)
    if (normEmail && !emailExists) {
      let page = 1;
      while (page <= 10) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) break;
        if (data.users.find((u) => (u.email || "").toLowerCase() === normEmail)) {
          emailExists = true;
          break;
        }
        if (data.users.length < 200) break;
        page++;
      }
    }

    return new Response(JSON.stringify({
      exists: emailExists, // legacy field for backward compat
      emailExists,
      phoneExists,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
