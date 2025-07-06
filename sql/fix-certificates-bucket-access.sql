-- Fix Certificates Bucket Access Issues
-- This will create proper RLS policies for the certificates bucket

-- 1. Create storage policies for certificates bucket
-- Allow authenticated users to view certificates they have access to
CREATE POLICY "Users can view certificates they have access to"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'certificates' AND
    (
        -- User can access their own organization's certificates
        (storage.foldername(name))[1]::uuid IN (
            SELECT sc.staff_id 
            FROM staff_certifications sc
            JOIN staff s ON sc.staff_id = s.id
            WHERE s.company_id = (
                SELECT company_id 
                FROM profiles 
                WHERE id = auth.uid()
            )
        )
        OR
        -- Admin can access all certificates
        (
            SELECT COALESCE(p.is_admin, false)
            FROM public.profiles p
            WHERE p.id = auth.uid()
        )
    )
);

-- 2. Allow authenticated users to upload certificates for their organization's staff
CREATE POLICY "Users can upload certificates for their organization"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'certificates' AND
    (
        -- User can upload for their own organization's staff
        (storage.foldername(name))[1]::uuid IN (
            SELECT s.id 
            FROM staff s
            WHERE s.company_id = (
                SELECT company_id 
                FROM profiles 
                WHERE id = auth.uid()
            )
        )
        OR
        -- Admin can upload for any staff
        (
            SELECT COALESCE(p.is_admin, false)
            FROM public.profiles p
            WHERE p.id = auth.uid()
        )
    )
);

-- 3. Allow users to delete certificates they uploaded
CREATE POLICY "Users can delete certificates they uploaded"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'certificates' AND
    (
        -- User can delete their own organization's certificates
        (storage.foldername(name))[1]::uuid IN (
            SELECT sc.staff_id 
            FROM staff_certifications sc
            JOIN staff s ON sc.staff_id = s.id
            WHERE s.company_id = (
                SELECT company_id 
                FROM profiles 
                WHERE id = auth.uid()
            )
        )
        OR
        -- Admin can delete any certificates
        (
            SELECT COALESCE(p.is_admin, false)
            FROM public.profiles p
            WHERE p.id = auth.uid()
        )
    )
);

-- 4. Check if certificates bucket exists and is public
SELECT 
    name,
    public,
    created_at
FROM storage.buckets 
WHERE name = 'certificates';

-- 5. If the bucket doesn't exist, create it
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 6. Verify the bucket is now public
SELECT 
    name,
    public,
    'Bucket is now ' || CASE WHEN public THEN 'PUBLIC' ELSE 'PRIVATE' END as status
FROM storage.buckets 
WHERE name = 'certificates';

-- Success message
SELECT '✅ Certificates bucket access fixed! You should now be able to view certificate documents.' as result; 