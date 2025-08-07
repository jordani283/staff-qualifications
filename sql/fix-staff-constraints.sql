-- Fix Staff Table Constraints
-- Add unique constraint on user_id,email to support proper upsert operations
-- Run this in your Supabase SQL Editor

-- Step 1: Check for existing duplicate records first
SELECT 
    user_id, 
    email, 
    COUNT(*) as count 
FROM public.staff 
GROUP BY user_id, email 
HAVING COUNT(*) > 1;

-- Step 2: If duplicates exist, this query will help you identify them
-- (Only run if the query above returns results)
/*
SELECT 
    s1.id as keep_id,
    s1.user_id,
    s1.email,
    s1.full_name,
    s1.created_at,
    s2.id as duplicate_id,
    s2.created_at as duplicate_created_at
FROM public.staff s1
JOIN public.staff s2 ON s1.user_id = s2.user_id AND s1.email = s2.email
WHERE s1.id != s2.id
AND s1.created_at < s2.created_at
ORDER BY s1.user_id, s1.email;
*/

-- Step 3: Add the unique constraint
-- This will fail if there are duplicate records
ALTER TABLE public.staff 
ADD CONSTRAINT unique_user_email UNIQUE (user_id, email);

-- Step 4: Similarly, add unique constraint for certification templates
ALTER TABLE public.certification_templates 
ADD CONSTRAINT unique_user_template_name UNIQUE (user_id, name);

-- Step 5: Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certification_templates TO authenticated;

-- Success message
SELECT '✅ Successfully added unique constraints to staff and certification_templates tables' as result; 