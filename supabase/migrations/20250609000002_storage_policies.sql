-- ============================================================
-- AURORA Module 01: Supabase Storage Buckets & Policies
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'manuscripts',
    'manuscripts',
    FALSE,
    52428800,
    ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  ),
  (
    'exports',
    'exports',
    FALSE,
    104857600,
    ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv']
  ),
  (
    'avatars',
    'avatars',
    TRUE,
    2097152,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  )
ON CONFLICT (id) DO NOTHING;

-- Manuscripts: project participants can read; students can upload to own path
CREATE POLICY manuscripts_select ON storage.objects FOR SELECT
  USING (
    bucket_id = 'manuscripts'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY manuscripts_insert ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'manuscripts'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY manuscripts_update ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'manuscripts'
    AND auth.uid() IS NOT NULL
  );

-- Exports: authenticated users
CREATE POLICY exports_select ON storage.objects FOR SELECT
  USING (bucket_id = 'exports' AND auth.uid() IS NOT NULL);

CREATE POLICY exports_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'exports' AND auth.uid() IS NOT NULL);

-- Avatars: public read, owner write
CREATE POLICY avatars_select ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY avatars_insert ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
