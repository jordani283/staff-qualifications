-- Fix Certificates Bucket Access Issues - V2
-- This will create proper RLS policies for the certificates bucket using correct schema

-- 1. First, let's make the bucket public (simple fix)
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Create simple storage policies for certificates bucket
-- Allow authenticated users to view certificates in the bucket
CREATE POLICY "Authenticated users can view certificates"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'certificates');

-- 3. Allow authenticated users to upload certificates
CREATE POLICY "Authenticated users can upload certificates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'certificates');

-- 4. Allow authenticated users to delete certificates
CREATE POLICY "Authenticated users can delete certificates"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'certificates');

-- 5. Verify the bucket is now public and accessible
SELECT 
    name,
    public,
    'Bucket is now ' || CASE WHEN public THEN 'PUBLIC and accessible' ELSE 'PRIVATE' END as status
FROM storage.buckets 
WHERE name = 'certificates';

-- Success message
SELECT '✅ Certificates bucket is now public and accessible! You should be able to view certificate documents.' as result; 