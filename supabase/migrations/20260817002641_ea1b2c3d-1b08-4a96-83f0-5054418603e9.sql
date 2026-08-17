CREATE POLICY "Public can upload comprovantes"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'comprovantes');

CREATE POLICY "Admins can view payment receipts"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'comprovantes'
  AND EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid())
);