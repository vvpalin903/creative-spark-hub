import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * POST /documents-verification-webhook
 *
 * Public webhook the external verification service calls back with the result.
 * Authenticated via X-Callback-Secret header (must equal
 * DOCUMENT_VERIFICATION_CALLBACK_SECRET).
 *
 * Body:
 *   {
 *     document_id: string,                            // required
 *     status: "approved" | "rejected" | "manual_review" | "error",
 *     comment?: string,
 *     external_job_id?: string,
 *     external_result?: unknown                       // arbitrary JSON
 *   }
 */
const ALLOWED_STATUSES = ["approved", "rejected", "manual_review", "error"] as const;
type AllowedStatus = typeof ALLOWED_STATUSES[number];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const expected = Deno.env.get("DOCUMENT_VERIFICATION_CALLBACK_SECRET");
  if (!expected) return json({ error: "callback_secret_not_configured" }, 500);

  const provided = req.headers.get("X-Callback-Secret") || req.headers.get("x-callback-secret");
  if (provided !== expected) return json({ error: "invalid_secret" }, 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const documentId = body?.document_id;
  const status = body?.status as AllowedStatus | undefined;
  if (!documentId || !status || !ALLOWED_STATUSES.includes(status)) {
    return json({
      error: "invalid_body",
      required: ["document_id", `status in ${ALLOWED_STATUSES.join("|")}`],
    }, 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const patch: Record<string, unknown> = {
    status,
    review_comment: typeof body.comment === "string" ? body.comment : null,
    external_result: body.external_result ?? null,
  };
  if (typeof body.external_job_id === "string") patch.external_job_id = body.external_job_id;
  if (status === "approved" || status === "rejected") patch.verified_at = new Date().toISOString();

  const { data, error } = await admin
    .from("object_documents")
    .update(patch)
    .eq("id", documentId)
    .select("id, host_user_id, status")
    .maybeSingle();

  if (error) return json({ error: "update_failed", details: error.message }, 500);
  if (!data) return json({ error: "document_not_found" }, 404);

  // Notify host
  try {
    const title =
      status === "approved" ? "Документ одобрен" :
      status === "rejected" ? "Документ отклонён" :
      status === "manual_review" ? "Документ отправлен на ручную проверку" :
      "Ошибка проверки документа";
    await admin.rpc("create_notification", {
      _user_id: data.host_user_id,
      _type: "document_verification",
      _title: title,
      _body: typeof body.comment === "string" ? body.comment : null,
      _link: "/dashboard/host",
    });
  } catch (_) { /* non-fatal */ }

  return json({ ok: true, document_id: data.id, status: data.status }, 200);
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
