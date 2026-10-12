-- ============================================================
-- Storage Policies for menu-images bucket
-- Run this in Supabase SQL Editor after creating the bucket
-- (The API auto-creates the bucket, but policies need manual setup)
-- ============================================================

-- Allow public read access to menu images
INSERT INTO storage.policies (name, bucket_id, operation, definition)
SELECT 'Public read menu images', 'menu-images', 'SELECT', 'true'
WHERE NOT EXISTS (
  SELECT 1 FROM storage.policies WHERE name = 'Public read menu images' AND bucket_id = 'menu-images'
);

-- Note: service_role key bypasses RLS automatically,
-- so admin uploads via API will work without additional INSERT policies.
-- If you want authenticated users to upload directly (future):
-- CREATE POLICY "Authenticated upload" ON storage.objects
--   FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'menu-images');
