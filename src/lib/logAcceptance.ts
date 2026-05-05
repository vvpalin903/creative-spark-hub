import { supabase } from "@/integrations/supabase/client";
import type { AcceptanceDoc } from "@/components/legal/AcceptanceCheckboxes";
import { buildAcceptancePayload } from "@/components/legal/AcceptanceCheckboxes";

interface Args {
  audience: "client" | "host";
  acceptanceType: string;
  relatedRequestId?: string | null;
  relatedObjectId?: string | null;
  textsBySlug?: Record<string, string>;
}

/**
 * Fetches the docs that require acceptance for the given audience and logs them via
 * the `log-acceptance` edge function (which captures IP / user-agent server side).
 * Errors are swallowed but logged — acceptance logging should not block the main flow.
 */
export async function logAcceptances({
  audience,
  acceptanceType,
  relatedRequestId,
  relatedObjectId,
  textsBySlug,
}: Args) {
  try {
    const flagColumn =
      audience === "client" ? "requires_acceptance_client" : "requires_acceptance_host";
    const { data, error } = await supabase
      .from("site_documents")
      .select("id, slug, title, short_title, version")
      .eq("is_active", true)
      .eq(flagColumn, true);
    if (error) throw error;
    const docs = (data || []) as AcceptanceDoc[];
    if (!docs.length) return;

    const acceptances = buildAcceptancePayload(docs, audience, textsBySlug);

    const { error: fnErr } = await supabase.functions.invoke("log-acceptance", {
      body: {
        user_type: audience,
        acceptance_type: acceptanceType,
        related_request_id: relatedRequestId ?? null,
        related_object_id: relatedObjectId ?? null,
        acceptances,
      },
    });
    if (fnErr) throw fnErr;
  } catch (e) {
    console.error("[logAcceptances] failed", e);
  }
}
