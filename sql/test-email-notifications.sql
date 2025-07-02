-- Test file for Email Notifications System
-- Use this to verify your setup step by step

-- Step 1: Test if the function exists and can be called
SELECT 'Testing function exists...' as test_step;
SELECT * FROM get_expiring_certifications();

-- Step 2: Check if app_settings table was created
SELECT 'Checking app_settings table...' as test_step;
SELECT * FROM app_settings;

-- Step 3: Check your current staff and certifications setup
SELECT 'Checking staff table...' as test_step;
SELECT id, full_name, email FROM staff LIMIT 5;

SELECT 'Checking staff_certifications...' as test_step;
SELECT id, staff_id, template_id, expiry_date FROM staff_certifications LIMIT 5;

SELECT 'Checking certification_templates...' as test_step;
SELECT id, name FROM certification_templates LIMIT 5;

-- Step 4: Test the complete join to make sure all relationships work
SELECT 'Testing complete join...' as test_step;
SELECT 
    s.full_name,
    s.email,
    ct.name as cert_name,
    sc.expiry_date
FROM staff_certifications sc
JOIN staff s ON sc.staff_id = s.id
JOIN certification_templates ct ON sc.template_id = ct.id
LIMIT 5;

-- Step 5: Simulate certifications expiring today (for testing)
-- CAREFUL: This will temporarily modify your data for testing
-- Uncomment the lines below ONLY for testing, then revert afterwards

/*
-- Save original expiry dates first
CREATE TEMP TABLE temp_original_dates AS 
SELECT id, expiry_date FROM staff_certifications WHERE id IN (
    SELECT id FROM staff_certifications LIMIT 2
);

-- Set 2 certifications to expire today for testing
UPDATE staff_certifications 
SET expiry_date = CURRENT_DATE 
WHERE id IN (
    SELECT id FROM staff_certifications LIMIT 2
);

-- Now test the function
SELECT 'Testing with fake expiring certs...' as test_step;
SELECT * FROM get_expiring_certifications();

-- Restore original dates (IMPORTANT!)
UPDATE staff_certifications 
SET expiry_date = temp_original_dates.expiry_date
FROM temp_original_dates 
WHERE staff_certifications.id = temp_original_dates.id;

DROP TABLE temp_original_dates;
*/

-- Step 6: Check if pg_cron extension is available
SELECT 'Checking pg_cron availability...' as test_step;
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Step 7: Check existing cron jobs (if any)
SELECT 'Checking existing cron jobs...' as test_step;
-- This will only work if pg_cron is set up
-- SELECT * FROM cron.job;

-- Final validation message
SELECT '✅ Database setup validation complete!' as result; 