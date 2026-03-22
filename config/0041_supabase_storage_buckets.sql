-- Supabase Storage buckets for media assets.
-- Each bucket has RLS policies so authenticated users can only manage
-- their own uploads, while public buckets allow anonymous reads.

-- ─── Drop media: cover images, preview posters, audio/video assets ─────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'drop-media',
  'drop-media',
  true,
  52428800, -- 50 MB
  ARRAY['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm','audio/mpeg','audio/mp4','audio/ogg']
);

-- Anyone can read public drop media.
CREATE POLICY drop_media_public_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'drop-media');

-- Authenticated users can upload to their own folder (account_id prefix).
CREATE POLICY drop_media_owner_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'drop-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owners can update/overwrite their own uploads.
CREATE POLICY drop_media_owner_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'drop-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owners can delete their own uploads.
CREATE POLICY drop_media_owner_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'drop-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── World media: cover images, ambient audio ──────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'world-media',
  'world-media',
  true,
  20971520, -- 20 MB
  ARRAY['image/jpeg','image/png','image/webp','image/avif','audio/mpeg','audio/mp4','audio/ogg']
);

CREATE POLICY world_media_public_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'world-media');

CREATE POLICY world_media_owner_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'world-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY world_media_owner_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'world-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY world_media_owner_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'world-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── Avatars: profile images ───────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg','image/png','image/webp','image/avif']
);

CREATE POLICY avatars_public_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY avatars_owner_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY avatars_owner_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY avatars_owner_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── Certificates: generated certificate images (private) ──────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificates',
  'certificates',
  false,
  10485760, -- 10 MB
  ARRAY['image/png','image/webp','application/pdf']
);

-- Only the certificate owner can read their own certificates.
CREATE POLICY certificates_owner_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'certificates'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Server (postgres role) handles certificate generation inserts, bypassing RLS.
