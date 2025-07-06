-- Setup Support Chat Storage Bucket
-- Run this in your Supabase SQL Editor after creating the bucket manually

-- Note: You need to first create a bucket called 'support-attachments' in the Supabase Storage UI
-- Then run this SQL to set up the proper policies

-- 1. Create storage policies for support-attachments bucket
-- Users can only upload files to their own user folder
CREATE POLICY "Users can upload files to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'support-attachments' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view files they uploaded and admin files
CREATE POLICY "Users can download their own files and admin files"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'support-attachments' AND
    (
        (storage.foldername(name))[1] = auth.uid()::text OR
        (storage.foldername(name))[1] = 'admin'
    )
);

-- Admin can upload files to admin folder
CREATE POLICY "Admin can upload files to admin folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'support-attachments' AND
    (storage.foldername(name))[1] = 'admin' AND
    (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN auth.users u ON p.id = u.id
            WHERE p.id = auth.uid() 
            AND (u.email = 'jordaningram283@gmail.com' OR p.is_admin = true)
        )
    )
);

-- Admin can view all files
CREATE POLICY "Admin can download all files"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'support-attachments' AND
    (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN auth.users u ON p.id = u.id
            WHERE p.id = auth.uid() 
            AND (u.email = 'jordaningram283@gmail.com' OR p.is_admin = true)
        )
    )
);

-- Success message
SELECT '✅ Storage policies created successfully!' as result; 