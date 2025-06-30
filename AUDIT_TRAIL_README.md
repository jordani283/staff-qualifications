# Audit Trail Implementation Guide

## Overview

This implementation adds a comprehensive, immutable audit trail feature to the StaffCertify web app. Every significant action taken on certifications is automatically logged with detailed information about what changed, who made the change, and when.

## Features

- **Immutable Logging**: All audit entries are insert-only, ensuring complete data integrity
- **Comprehensive Tracking**: Logs creation, editing, document uploads, deletions, and comments
- **Field-Level Changes**: For edits, tracks specific fields with old and new values
- **User Attribution**: Records which user performed each action
- **Row Level Security**: Proper database permissions ensuring data security
- **Rich UI**: Timeline-style display in the certification modal

## Database Setup

### 1. Run the Database Schema

Execute the SQL commands in `database-setup.sql` in your Supabase SQL editor:

```sql
-- This will create:
-- - certification_audit_logs table
-- - Proper indexes for performance
-- - Row Level Security policies
-- - A view with user information joined
```

### 2. Table Schema

The `certification_audit_logs` table includes:

- `id`: UUID primary key
- `user_id`: Reference to the user who performed the action
- `certification_id`: Reference to the affected certification
- `action_type`: Type of action (CREATE, EDIT, UPLOAD, DELETE, COMMENT)
- `field`: Specific field changed (for EDIT actions)
- `old_value`: Previous value of the field
- `new_value`: New value of the field
- `note`: Additional notes or comments
- `created_at`: Timestamp of the action

### 3. Row Level Security

- **Insert**: Only authenticated users can insert audit logs (and only with their own user_id)
- **Select**: All authenticated users can read audit logs
- **Update/Delete**: Not allowed - audit logs are immutable

## Usage

### Backend Integration

The audit logging system is integrated into all certification CRUD operations:

#### Certification Creation
```javascript
import { logCertificationCreated } from '../utils/auditLogger.js';

// After creating a certification
await logCertificationCreated(certificationId, {
    template_name: 'First Aid Training'
});
```

#### Field Changes
```javascript
import { logCertificationEdited, getFieldChanges } from '../utils/auditLogger.js';

// Compare old and new data
const changes = getFieldChanges(oldData, newData, ['issue_date', 'expiry_date']);
await logCertificationEdited(certificationId, changes);
```

#### Document Upload
```javascript
import { logDocumentUploaded } from '../utils/auditLogger.js';

await logDocumentUploaded(certificationId, filename, isReplacement);
```

#### Certification Deletion
```javascript
import { logCertificationDeleted } from '../utils/auditLogger.js';

await logCertificationDeleted(certificationId, certificationData);
```

#### Comments/Notes
```javascript
import { logCertificationComment } from '../utils/auditLogger.js';

await logCertificationComment(certificationId, "Updated expiry date due to policy change");
```

### Frontend Integration

The audit trail is automatically displayed in the `CertificationModal` component:

```javascript
import { fetchAuditTrail } from '../utils/auditLogger.js';

// Fetch audit trail data
const { data, error } = await fetchAuditTrail(certificationId);
```

## What Actions Are Tracked

### ✅ Currently Implemented

1. **Certification Creation**
   - Logs when a new certification is assigned to staff
   - Includes template name in notes

2. **Document Upload**
   - Logs when documents are uploaded or replaced
   - Includes filename in notes

3. **Certification Deletion**
   - Logs when certifications are deleted
   - Includes certification details in notes

### 🔄 Ready for Implementation

The audit logging system is prepared to track additional actions:

4. **Field Editing**
   - Individual field changes with old → new values
   - Supports any certification field (issue_date, expiry_date, etc.)

5. **Status Changes**
   - Automatic logging when certification status changes
   - System-generated entries for expiry notifications

6. **Comments/Notes**
   - Manual notes added by users
   - Administrative comments and policy updates

## Frontend Display

### Audit Trail UI Features

- **Timeline Layout**: Chronological display of all actions
- **Action Types**: Color-coded and clearly labeled action types
- **Field Changes**: Visual diff showing old → new values with color coding
- **User Attribution**: Shows who performed each action
- **Timestamps**: Formatted dates and times
- **Notes**: Displays additional context and comments
- **Empty State**: Clean message when no audit entries exist

### Visual Elements

- **Field Tags**: Small badges showing which field was changed
- **Value Changes**: Red (old) → Green (new) value display
- **Action Icons**: Different icons for different action types
- **Responsive Design**: Works on desktop and mobile

## Performance Considerations

### Database Indexes

The implementation includes optimized indexes:

```sql
-- For fast certification lookups
certification_audit_logs_certification_id_idx

-- For user-specific queries
certification_audit_logs_user_id_idx

-- For chronological sorting
certification_audit_logs_created_at_idx
```

### View Optimization

The `v_certification_audit_logs` view pre-joins user information to minimize frontend queries.

## Security Features

### Immutable Design
- No UPDATE or DELETE operations allowed on audit logs
- Historical data cannot be modified or removed
- Complete audit trail integrity

### User Attribution
- Every action tied to specific authenticated user
- No anonymous or system-only entries (except where appropriate)
- User information joined for display

### Row Level Security
- Database-level permissions ensure proper access control
- Users can only insert logs with their own user_id
- All authenticated users can read logs (supports transparency)

## Testing the Implementation

### Manual Testing Steps

1. **Create a Certification**
   - Assign a new certification to staff
   - Check audit trail shows CREATE action
   - Verify user attribution and timestamp

2. **Upload Document**
   - Upload a document to an existing certification
   - Check audit trail shows UPLOAD action with filename

3. **Delete Certification**
   - Delete a certification
   - Check audit trail shows DELETE action with details

4. **View Audit Trail**
   - Open certification modal
   - Verify all actions are displayed chronologically
   - Check formatting and user information

### Database Verification

```sql
-- Check audit logs are being created
SELECT * FROM v_certification_audit_logs 
ORDER BY created_at DESC 
LIMIT 10;

-- Verify user attribution
SELECT action_type, performed_by, COUNT(*) 
FROM v_certification_audit_logs 
GROUP BY action_type, performed_by;
```

## Extending the System

### Adding New Action Types

1. Add new action type to `AUDIT_ACTIONS` in `auditLogger.js`
2. Create specific logging function for the action
3. Integrate into relevant CRUD operations
4. Update UI to handle new action type display

### Custom Field Tracking

Use the `getFieldChanges` utility to track any certification fields:

```javascript
const fieldsToTrack = ['issue_date', 'expiry_date', 'status', 'notes'];
const changes = getFieldChanges(oldData, newData, fieldsToTrack);
```

### Bulk Operations

For bulk operations, use `Promise.all()` to log multiple entries:

```javascript
const auditPromises = certifications.map(cert => 
    logCertificationEdited(cert.id, changes)
);
await Promise.all(auditPromises);
```

## Troubleshooting

### Common Issues

1. **Audit logs not appearing**
   - Check RLS policies are enabled
   - Verify user is authenticated
   - Check browser console for errors

2. **User attribution missing**
   - Ensure user profile data exists
   - Check view permissions on auth.users table

3. **Performance issues**
   - Verify indexes are created
   - Consider pagination for large audit trails

### Debug Queries

```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'certification_audit_logs';

-- Verify indexes
SELECT * FROM pg_indexes WHERE tablename = 'certification_audit_logs';

-- Check recent audit activity
SELECT * FROM certification_audit_logs ORDER BY created_at DESC LIMIT 20;
```

## Migration Notes

- The system is backwards compatible
- Existing certifications will start logging from implementation date
- No historical data is lost
- Sample audit data in existing components is replaced with real data

This implementation provides a robust, secure, and user-friendly audit trail system that enhances transparency and accountability in the StaffCertify application. 