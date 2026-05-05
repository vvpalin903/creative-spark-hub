import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export interface AcceptanceDoc {
  id: string;
  slug: string;
  title: string;
  short_title: string | null;
  version: number;
}

interface Props {
  audience: "client" | "host";
  checked: Record<string, boolean>;
  onChange: (slug: string, value: boolean) => void;
  /** Custom checkbox text per slug. Falls back to "Я ознакомился(-ась) и принимаю «{title}»". */
  textsBySlug?: Record<string, string>;
  /** Extra checkbox items not tied to a document (e.g. "I have the right to rent this place"). */
  extraItems?: { key: string; text: string }[];
}

export const defaultClientTexts: Record<string, string> = {
  terms: "Я принимаю Пользовательское соглашение",
  privacy: "Я даю согласие на обработку персональных данных",
  "consent-host-transfer":
    "Я понимаю и соглашаюсь, что мои данные заявки будут переданы хосту выбранного лота для связи и согласования хранения",
};

export const defaultHostTexts: Record<string, string> = {
  terms: "Я принимаю Пользовательское соглашение",
  privacy: "Я даю согласие на обработку персональных данных",
  "host-rules": "Я ознакомился и согласен с Правилами размещения лотов и хранения для хостов",
};

export const HOST_EXTRA_RIGHTS = "host-right-to-rent";
export const defaultHostExtras = [
  { key: HOST_EXTRA_RIGHTS, text: "Я подтверждаю, что имею право размещать это место и допускать третьих лиц" },
];

export function AcceptanceCheckboxes({ audience, checked, onChange, textsBySlug, extraItems }: Props) {
  const flagColumn =
    audience === "client" ? "requires_acceptance_client" : "requires_acceptance_host";

  const { data: docs, isLoading } = useQuery({
    queryKey: ["acceptance-docs", audience],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_documents")
        .select("id, slug, title, short_title, version")
        .eq("is_active", true)
        .eq(flagColumn, true)
        .order("slug");
      if (error) throw error;
      return data as AcceptanceDoc[];
    },
  });

  const defaults = audience === "client" ? defaultClientTexts : defaultHostTexts;
  const texts = { ...defaults, ...(textsBySlug || {}) };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Загрузка условий…
      </div>
    );
  }

  if (!docs || docs.length === 0) return null;

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      {docs.map((d) => {
        const text = texts[d.slug] || `Я ознакомился(-ась) и принимаю «${d.short_title || d.title}»`;
        return (
          <label key={d.slug} className="flex items-start gap-2 text-xs leading-snug cursor-pointer">
            <Checkbox
              checked={!!checked[d.slug]}
              onCheckedChange={(v) => onChange(d.slug, v === true)}
              className="mt-0.5"
            />
            <span>
              {text}{" "}
              <Link
                to={`/docs/${d.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                (читать)
              </Link>
            </span>
          </label>
        );
      })}
      {extraItems?.map((item) => (
        <label key={item.key} className="flex items-start gap-2 text-xs leading-snug cursor-pointer">
          <Checkbox
            checked={!!checked[item.key]}
            onCheckedChange={(v) => onChange(item.key, v === true)}
            className="mt-0.5"
          />
          <span>{item.text}</span>
        </label>
      ))}
    </div>
  );
}

/** Build payload entries for log-acceptance edge function based on docs + texts. */
export function buildAcceptancePayload(
  docs: AcceptanceDoc[],
  audience: "client" | "host",
  textsBySlug?: Record<string, string>,
) {
  const defaults = audience === "client" ? defaultClientTexts : defaultHostTexts;
  const texts = { ...defaults, ...(textsBySlug || {}) };
  return docs.map((d) => ({
    document_id: d.id,
    document_slug: d.slug,
    document_version: d.version,
    acceptance_text_snapshot: texts[d.slug] || `Принимаю «${d.short_title || d.title}»`,
  }));
}
