
DO $$ BEGIN
  CREATE TYPE public.object_document_status AS ENUM
    ('uploaded','processing','approved','rejected','manual_review','error');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.object_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id uuid NOT NULL,
  host_user_id uuid NOT NULL,
  document_type text NOT NULL,
  file_url text NOT NULL,
  status public.object_document_status NOT NULL DEFAULT 'uploaded',
  external_job_id text,
  external_result jsonb,
  review_comment text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_object_documents_object ON public.object_documents(object_id);
CREATE INDEX IF NOT EXISTS idx_object_documents_host ON public.object_documents(host_user_id);
CREATE INDEX IF NOT EXISTS idx_object_documents_status ON public.object_documents(status);
CREATE INDEX IF NOT EXISTS idx_object_documents_external_job ON public.object_documents(external_job_id);

ALTER TABLE public.object_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts view own object documents"
ON public.object_documents FOR SELECT
USING (auth.uid() = host_user_id OR public.has_admin_access(auth.uid()));

CREATE POLICY "Hosts insert own object documents"
ON public.object_documents FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = host_user_id
  AND EXISTS (
    SELECT 1 FROM public.host_objects o
    WHERE o.id = object_id AND o.host_user_id = auth.uid()
  )
);

CREATE POLICY "Staff manage object documents"
ON public.object_documents FOR ALL
USING (public.has_admin_access(auth.uid()))
WITH CHECK (public.has_admin_access(auth.uid()));

CREATE TRIGGER trg_object_documents_updated
BEFORE UPDATE ON public.object_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
