ALTER TABLE public.verification_documents
  ADD COLUMN IF NOT EXISTS object_id uuid;

CREATE INDEX IF NOT EXISTS idx_verification_documents_object
  ON public.verification_documents(object_id);