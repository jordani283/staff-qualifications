# Mass Data Import Feature

## Overview

The Mass Data Import feature allows authenticated users to bulk import staff members and their associated certifications from a single CSV file. This significantly reduces manual entry time for organizations with multiple employees and certifications.

## Features

- **CSV File Upload**: Drag-and-drop or browse to select CSV files
- **Real-time Validation**: Client-side and server-side validation with detailed error reporting
- **Subscription Limits**: Automatic checking against plan limits before import
- **Batch Processing**: Efficient processing of large datasets (up to 1000 rows)
- **Duplicate Handling**: Smart handling of existing staff and certifications
- **Progress Tracking**: Real-time import progress and detailed results
- **Error Reporting**: Comprehensive error reporting with downloadable error logs

## CSV Format Requirements

### Required Columns
- `staff_full_name`: Full name of the staff member
- `staff_email`: Email address (used as unique identifier)
- `certification_name`: Name of the certification
- `certification_expiry_date`: Expiry date in YYYY-MM-DD format

### Optional Columns
- `staff_job_title`: Job title/position
- `certification_issue_date`: Issue date in YYYY-MM-DD format (defaults to today)
- `certification_notes`: Additional notes about the certification
- `certification_document_url`: URL to certificate document
- `validity_period_months`: Validity period in months (defaults to 12)

### Sample CSV Structure

```csv
staff_full_name,staff_email,staff_job_title,certification_name,certification_issue_date,certification_expiry_date,certification_notes,validity_period_months
John Smith,john.smith@company.com,Safety Manager,First Aid,2024-01-15,2026-01-15,Renewed early,24
John Smith,john.smith@company.com,Safety Manager,Fire Safety,2024-02-10,2025-02-10,,12
Jane Doe,jane.doe@company.com,Site Supervisor,First Aid,2024-01-20,2026-01-20,,24
```

## How It Works

### Frontend (React)
1. **File Upload**: Users drag and drop or select a CSV file
2. **Client Validation**: Immediate validation of file type, size, and required columns
3. **CSV Parsing**: Uses Papa Parse library to convert CSV to JSON
4. **Data Preview**: Shows number of rows and validates data structure
5. **API Call**: Sends parsed data to Supabase Edge Function

### Backend (Supabase Edge Function)
1. **Authentication**: Verifies user JWT token
2. **Subscription Check**: Validates against plan limits
3. **Data Validation**: Server-side validation of all data
4. **Batch Processing**: Processes data in batches of 50 rows
5. **Database Operations**: Handles upserts and conditional inserts
6. **Result Reporting**: Returns comprehensive import results

## Database Operations

### Staff Members (Upsert Logic)
- **Unique Key**: email + user_id
- **If Exists**: Updates full_name and job_title if different
- **If New**: Creates new staff record

### Certification Templates (Upsert Logic)
- **Unique Key**: name + user_id
- **If Exists**: Uses existing template_id
- **If New**: Creates new template with specified validity_period_months

### Staff Certifications (Conditional Insert)
- **Unique Key**: staff_id + template_id + issue_date + user_id
- **If Exists**: Skips insertion (prevents duplicates)
- **If New**: Creates new certification record

## Subscription Limits

The feature respects subscription plan limits:
- **Starter**: 10 staff members maximum
- **Growth**: 50 staff members maximum
- **Professional**: 200 staff members maximum

Import will fail if it would exceed the plan's staff limit.

## File Constraints

- **File Type**: CSV only
- **File Size**: Maximum 10MB
- **Row Limit**: Maximum 1000 rows per import
- **Processing**: Batch processing in groups of 50 rows

## Error Handling

### Client-Side Validation
- File type and size validation
- Required column presence check
- Basic data format validation
- Row limit enforcement

### Server-Side Validation
- Required field validation
- Email format validation
- Date format validation (YYYY-MM-DD)
- Data type validation
- Business logic validation

### Error Reporting
- Row-level error messages
- Detailed error descriptions
- Downloadable error report (CSV)
- Success/failure summary statistics

## Usage Instructions

1. **Access**: Click "Import Data" button on the Dashboard
2. **Upload**: Drag and drop or select your CSV file
3. **Validate**: Review any validation errors and fix them
4. **Import**: Click "Import [X] Rows" to start the process
5. **Monitor**: Watch the progress and wait for completion
6. **Review**: Check the results summary and download error reports if needed

## Implementation Files

### Frontend Components
- `src/components/ImportDataModal.jsx`: Main import modal component
- `src/pages/DashboardPage.jsx`: Integration point (Import Data button)

### Backend Function
- `supabase/functions/mass-import/index.ts`: Edge Function for processing imports

### Dependencies
- `react-dropzone`: File upload component
- `papaparse`: CSV parsing library

## Sample Data

A sample CSV file (`sample-import.csv`) is included in the project root demonstrating the correct format and structure.

## Security Features

- **Authentication**: All operations require valid user authentication
- **Row Level Security**: All data is properly scoped to the authenticated user
- **Subscription Enforcement**: Automatic limit checking prevents quota overruns
- **Data Validation**: Comprehensive validation prevents invalid data insertion
- **Error Isolation**: Failed rows don't affect successful imports

## Performance Considerations

- **Batch Processing**: Large imports are processed in batches to prevent timeouts
- **Memory Management**: Efficient processing prevents memory issues
- **Database Optimization**: Uses proper indexing and upsert strategies
- **Progress Feedback**: Real-time feedback for long-running imports

## Troubleshooting

### Common Issues
1. **Missing Required Columns**: Ensure all required columns are present with correct names
2. **Date Format Errors**: Use YYYY-MM-DD format for all dates
3. **Subscription Limits**: Verify your plan supports the number of staff you're importing
4. **Duplicate Emails**: Each staff member should have a unique email address
5. **File Size**: Keep CSV files under 10MB and 1000 rows

### Error Messages
- **"Missing required columns"**: Add the missing columns to your CSV
- **"Invalid email format"**: Fix email addresses in the specified rows
- **"Exceeds staff limit"**: Upgrade your plan or reduce the number of staff
- **"Invalid date format"**: Use YYYY-MM-DD format for dates

## Future Enhancements

Potential improvements for future versions:
- Excel file support (.xlsx)
- Template validation against existing templates
- Bulk document upload
- Import scheduling
- Advanced duplicate handling options
- Import history and logging 