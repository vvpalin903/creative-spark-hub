-- Расширяем site_documents
ALTER TABLE public.site_documents
  ADD COLUMN IF NOT EXISTS short_title text,
  ADD COLUMN IF NOT EXISTS doc_type text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS show_in_footer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_acceptance_client boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_acceptance_host boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_acceptance_other boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS site_documents_slug_unique ON public.site_documents(slug);

-- Таблица акцептов
CREATE TABLE IF NOT EXISTS public.document_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.site_documents(id) ON DELETE CASCADE,
  document_version integer NOT NULL,
  document_slug text NOT NULL,
  user_type text NOT NULL,                  -- 'client' | 'host' | 'other'
  acceptance_type text NOT NULL,            -- 'client_request' | 'host_publish' | ...
  user_id uuid,
  related_request_id uuid,
  related_object_id uuid,
  ip_address text,
  user_agent text,
  acceptance_text_snapshot text,
  accepted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_acc_user ON public.document_acceptances(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_acc_doc ON public.document_acceptances(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_acc_request ON public.document_acceptances(related_request_id);

ALTER TABLE public.document_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own acceptances"
  ON public.document_acceptances FOR SELECT
  USING (auth.uid() = user_id OR public.has_admin_access(auth.uid()));

CREATE POLICY "Staff manage acceptances"
  ON public.document_acceptances FOR ALL
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

-- Разрешаем аутентифицированным пользователям записывать только собственные акцепты
CREATE POLICY "Users insert own acceptance"
  ON public.document_acceptances FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);