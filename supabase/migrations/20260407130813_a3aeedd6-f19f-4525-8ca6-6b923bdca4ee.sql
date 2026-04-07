
-- Allow anyone to upload to verification-docs bucket
CREATE POLICY "Anyone can upload verification docs"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'verification-docs');

-- Allow admins to view verification docs
CREATE POLICY "Admins can view verification docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'verification-docs' AND public.has_role(auth.uid(), 'admin'));

-- Also fix verification_documents table - allow anon inserts (hosts aren't logged in)
CREATE POLICY "Anyone can upload verification document records"
ON public.verification_documents
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
