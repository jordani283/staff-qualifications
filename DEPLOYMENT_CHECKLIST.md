# Mass Import Feature - Deployment Checklist

## 1. Frontend Dependencies ✅

The following packages have been installed:
- `react-dropzone`: File upload functionality
- `papaparse`: CSV parsing

```bash
npm install react-dropzone papaparse
```

## 2. Frontend Components ✅

- **ImportDataModal.jsx**: Created and integrated
- **Dialog.jsx**: Updated to support large size modals
- **DashboardPage.jsx**: Import Data button added

## 3. Supabase Edge Function ✅

**File**: `supabase/functions/mass-import/index.ts`

**To Deploy**: Run the following command in your Supabase project:

```bash
supabase functions deploy mass-import
```

## 4. Required Environment Variables

Ensure these environment variables are set in your Supabase project:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access

## 5. Database Prerequisites ✅

The following tables must exist (already implemented in your schema):
- `public.profiles` (with subscription_plan column)
- `public.staff` (with user_id, full_name, email, job_title)
- `public.certification_templates` (with user_id, name, validity_period_months)
- `public.staff_certifications` (with all required columns)

## 6. Row Level Security ✅

Ensure RLS policies are in place for:
- `profiles` table: Users can only access their own profile
- `staff` table: Users can only access their own staff
- `certification_templates` table: Users can only access their own templates
- `staff_certifications` table: Users can only access their own certifications

## 7. Subscription Plan Limits

Verify the subscription plan limits in the Edge Function match your business model:
- Starter: 10 staff
- Growth: 50 staff
- Professional: 200 staff

## 8. Testing Checklist

### Frontend Testing
- [ ] Import Data button appears on Dashboard
- [ ] Modal opens when button is clicked
- [ ] File upload drag & drop works
- [ ] CSV validation works (try invalid files)
- [ ] Error messages display correctly
- [ ] Success flow works with valid CSV

### Backend Testing
- [ ] Edge Function deploys successfully
- [ ] Authentication works (try without login)
- [ ] Subscription limit checking works
- [ ] CSV validation works on server side
- [ ] Database operations complete successfully
- [ ] Error handling works for invalid data

### End-to-End Testing
- [ ] Test with sample CSV file (`sample-import.csv`)
- [ ] Verify staff members are created correctly
- [ ] Verify certification templates are created/reused
- [ ] Verify staff certifications are assigned
- [ ] Test duplicate handling (import same file twice)
- [ ] Test subscription limit enforcement
- [ ] Test large file handling (close to 1000 rows)

## 9. Sample Data

Use the provided `sample-import.csv` file for testing:
- Contains 8 rows of sample data
- Demonstrates all required and optional columns
- Shows repeated staff with multiple certifications

## 10. Documentation

- [x] Implementation documentation (`MASS_IMPORT_README.md`)
- [x] Sample CSV file (`sample-import.csv`)
- [x] Deployment checklist (this file)

## 11. Security Verification

- [ ] Verify users can only import data to their own account
- [ ] Verify subscription limits are enforced
- [ ] Verify file size limits are enforced (10MB)
- [ ] Verify row limits are enforced (1000 rows)
- [ ] Verify authentication is required

## 12. Performance Testing

- [ ] Test with small files (10-50 rows)
- [ ] Test with medium files (100-500 rows)
- [ ] Test with large files (500-1000 rows)
- [ ] Verify batch processing works correctly
- [ ] Verify no timeout issues with large imports

## 13. Error Handling Verification

- [ ] Test with missing required columns
- [ ] Test with invalid email formats
- [ ] Test with invalid date formats
- [ ] Test with subscription limit exceeded
- [ ] Test with oversized files
- [ ] Verify error reports can be downloaded

## 14. User Experience Testing

- [ ] Verify intuitive workflow
- [ ] Test progress indicators
- [ ] Test success/error messaging
- [ ] Verify modal closes correctly
- [ ] Test dashboard refresh after import

## 15. Browser Compatibility

Test in major browsers:
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

## Deployment Commands

```bash
# Deploy the Edge Function
supabase functions deploy mass-import

# Build and deploy frontend (if using Vercel)
npm run build

# Test the deployed function
curl -X POST [your-supabase-url]/functions/v1/mass-import \
  -H "Authorization: Bearer [your-jwt-token]" \
  -H "Content-Type: application/json" \
  -d '{"csvData": [...], "fileName": "test.csv"}'
```

## Rollback Plan

If issues arise after deployment:
1. Remove Import Data button from Dashboard
2. Disable the Edge Function
3. Revert database changes if necessary
4. Communicate with users about temporary unavailability

## Monitoring

After deployment, monitor:
- Edge Function logs for errors
- Database performance impact
- User feedback on import success rates
- Support requests related to import issues

## Success Criteria

The feature is successfully deployed when:
- [ ] Users can access the Import Data button
- [ ] CSV files can be uploaded and validated
- [ ] Staff and certifications are created correctly
- [ ] Error handling works as expected
- [ ] Performance is acceptable for typical use cases
- [ ] No security vulnerabilities are present 