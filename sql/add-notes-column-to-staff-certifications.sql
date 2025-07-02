-- Add notes column to staff_certifications table
-- This migration adds support for optional notes when assigning certifications to staff members

-- Add the notes column to the staff_certifications table
ALTER TABLE public.staff_certifications 
ADD COLUMN IF NOT EXISTS notes text;

-- Add a comment to document the purpose of this column
COMMENT ON COLUMN public.staff_certifications.notes IS 'Optional notes or comments about this certification assignment';

-- No need to update existing records - they will have NULL notes by default which is fine

-- Verify the column was added (optional verification query)
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'staff_certifications' 
-- AND column_name = 'notes';

-- Success message
SELECT '✅ Successfully added notes column to staff_certifications table' as result; 