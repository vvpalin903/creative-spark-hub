import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AcceptanceItem {
  document_id: string;
  document_slug: string;
  document_version: number;
  acceptance_text_snapshot: string;
}

interface Body {
  user_type: "client" | "host" | "other";
  acceptance_type: string;
  related_request_id?: string | null;
  related_object_id?: string | null;
  acceptances: AcceptanceItem[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userData.user.id;

    const body: Body = await req.json();
    if (!body?.acceptances?.length || !body.user_type || !body.acceptance_type) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      null;
    const ua = req.headers.get("user-agent") || null;

    const admin = createClient(supabaseUrl, serviceKey);
    const rows = body.acceptances.map((a) => ({
      document_id: a.document_id,
      document_slug: a.document_slug,
      document_version: a.document_version,
      user_type: body.user_type,
      acceptance_type: body.acceptance_type,
      user_id: userId,
      related_request_id: body.related_request_id ?? null,
      related_object_id: body.related_object_id ?? null,
      ip_address: ip,
      user_agent: ua,
      acceptance_text_snapshot: a.acceptance_text_snapshot,
    }));

    const { error } = await admin.from("document_acceptances").insert(rows);
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, count: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
