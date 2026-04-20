-- Tighten legacy tables (no longer written from frontend)
DROP POLICY IF EXISTS "Anyone can create host applications" ON public.host_applications;
CREATE POLICY "Admins can insert host applications"
ON public.host_applications FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can create client applications" ON public.client_applications;
CREATE POLICY "Admins can insert client applications"
ON public.client_applications FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can upload verification document records" ON public.verification_documents;

-- lot-photos bucket: remove permissive listing policy if exists
DROP POLICY IF EXISTS "Public read access for lot photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view lot photos" ON storage.objects;

-- Recreate read-only policy that does not allow listing the bucket itself
CREATE POLICY "Public can read lot-photos files"
ON storage.objects FOR SELECT
USING (bucket_id = 'lot-photos');

-- Authenticated hosts can upload to lot-photos under their own user_id folder
DROP POLICY IF EXISTS "Hosts can upload lot photos" ON storage.objects;
CREATE POLICY "Hosts can upload lot photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'lot-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Hosts can update own lot photos" ON storage.objects;
CREATE POLICY "Hosts can update own lot photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'lot-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Hosts can delete own lot photos" ON storage.objects;
CREATE POLICY "Hosts can delete own lot photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'lot-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);