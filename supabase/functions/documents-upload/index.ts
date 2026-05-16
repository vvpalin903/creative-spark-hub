import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface UploadBody {
  object_id: string;
  document_type: string;
  file_url?: string;            // already uploaded file URL (preferred)
  file_base64?: string;         // optional: raw base64 (no data: prefix)
  file_name?: string;
  content_type?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claims?.claims?.sub) return json({ error: "unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const body = (await req.json().catch(() => null)) as UploadBody | null;
    if (!body || !body.object_id || !body.document_type || (!body.file_url && !body.file_base64)) {
      return json({ error: "invalid_body", required: ["object_id", "document_type", "file_url|file_base64"] }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify the user owns the object
    const { data: obj, error: objErr } = await admin
      .from("host_objects")
      .select("id, host_user_id")
      .eq("id", body.object_id)
      .maybeSingle();
    if (objErr) return json({ error: "object_lookup_failed", details: objErr.message }, 500);
    if (!obj || obj.host_user_id !== userId) return json({ error: "forbidden" }, 403);

    let fileUrl = body.file_url || "";

    // Optional inline upload to existing verification-docs bucket
    if (!fileUrl && body.file_base64) {
      const bytes = Uint8Array.from(atob(body.file_base64), (c) => c.charCodeAt(0));
      const name = body.file_name || `${crypto.randomUUID()}.bin`;
      const path = `${userId}/${body.object_id}/${Date.now()}-${name}`;
      const { error: upErr } = await admin.storage
        .from("verification-docs")
        .upload(path, bytes, {
          contentType: body.content_type || "application/octet-stream",
          upsert: false,
        });
      if (upErr) return json({ error: "storage_upload_failed", details: upErr.message }, 500);
      const { data: signed } = await admin.storage
        .from("verification-docs")
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      fileUrl = signed?.signedUrl || path;
    }

    const { data: row, error: insertErr } = await admin
      .from("object_documents")
      .insert({
        object_id: body.object_id,
        host_user_id: userId,
        document_type: body.document_type,
        file_url: fileUrl,
        status: "uploaded",
      })
      .select()
      .single();
    if (insertErr) return json({ error: "insert_failed", details: insertErr.message }, 500);

    return json({ document: row }, 200);
  } catch (e) {
    return json({ error: "internal_error", details: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
