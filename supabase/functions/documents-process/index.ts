import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * POST /documents-process
 * Body: { document_id: string }
 *
 * Sends the document payload to the external verification service configured
 * via DOCUMENT_VERIFICATION_WEBHOOK_URL. The external service is expected to
 * process the document asynchronously and POST the result back to the
 * documents-verification-webhook function.
 *
 * Auth: host who owns the document, or admin/back-office.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return json({ error: "unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const body = (await req.json().catch(() => null)) as { document_id?: string } | null;
    if (!body?.document_id) return json({ error: "invalid_body", required: ["document_id"] }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: doc, error: docErr } = await admin
      .from("object_documents")
      .select("*")
      .eq("id", body.document_id)
      .maybeSingle();
    if (docErr) return json({ error: "lookup_failed", details: docErr.message }, 500);
    if (!doc) return json({ error: "not_found" }, 404);

    const { data: hasAdmin } = await admin.rpc("has_admin_access", { _user_id: userId });
    if (!hasAdmin && doc.host_user_id !== userId) return json({ error: "forbidden" }, 403);

    const webhookUrl = Deno.env.get("DOCUMENT_VERIFICATION_WEBHOOK_URL");
    if (!webhookUrl) {
      // Still mark as processing so the admin can finalise manually.
      await admin.from("object_documents")
        .update({ status: "processing", review_comment: "External webhook not configured; manual review required." })
        .eq("id", doc.id);
      return json({
        ok: true,
        warning: "DOCUMENT_VERIFICATION_WEBHOOK_URL is not set — document marked processing without external dispatch.",
      }, 200);
    }

    const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/documents-verification-webhook`;
    const callbackSecret = Deno.env.get("DOCUMENT_VERIFICATION_CALLBACK_SECRET") || "";

    // Set processing before dispatch so the UI reflects state immediately.
    await admin.from("object_documents").update({ status: "processing" }).eq("id", doc.id);

    let externalJobId: string | null = null;
    let externalErr: string | null = null;
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: doc.id,
          object_id: doc.object_id,
          host_user_id: doc.host_user_id,
          document_type: doc.document_type,
          file_url: doc.file_url,
          callback_url: callbackUrl,
          callback_secret: callbackSecret,
        }),
      });
      const text = await res.text();
      if (!res.ok) {
        externalErr = `external service ${res.status}: ${text.slice(0, 500)}`;
      } else {
        try {
          const parsed = JSON.parse(text);
          if (parsed?.external_job_id) externalJobId = String(parsed.external_job_id);
        } catch { /* not json - ignore */ }
      }
    } catch (e) {
      externalErr = `network error: ${String(e)}`;
    }

    if (externalErr) {
      await admin.from("object_documents")
        .update({ status: "error", review_comment: externalErr })
        .eq("id", doc.id);
      return json({ error: "dispatch_failed", details: externalErr }, 502);
    }

    if (externalJobId) {
      await admin.from("object_documents")
        .update({ external_job_id: externalJobId })
        .eq("id", doc.id);
    }

    return json({ ok: true, status: "processing", external_job_id: externalJobId }, 200);
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
