CREATE POLICY "Anyone can upload lot photos"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'lot-photos');