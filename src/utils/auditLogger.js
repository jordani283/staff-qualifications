import { supabase } from '../supabase.js';

/**
 * Audit Trail Action Types
 */
export const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  EDIT: 'EDIT', 
  UPLOAD: 'UPLOAD',
  DELETE: 'DELETE',
  COMMENT: 'COMMENT'
};

/**
 * Log an audit trail entry for certification actions
 * @param {Object} params - Audit log parameters
 * @param {string} params.certificationId - UUID of the certification
 * @param {string} params.actionType - Type of action (CREATE, EDIT, UPLOAD, DELETE, COMMENT)
 * @param {string} [params.field] - Specific field that was changed (for EDIT actions)
 * @param {string} [params.oldValue] - Previous value of the field
 * @param {string} [params.newValue] - New value of the field
 * @param {string} [params.note] - Additional notes or comments
 * @returns {Promise<Object>} Result of the insert operation
 */
export async function logAuditEntry({
  certificationId,
  actionType,
  field = null,
  oldValue = null,
  newValue = null,
  note = null
}) {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Failed to get user for audit log:', userError);
      return { error: userError || new Error('No authenticated user') };
    }

    // Insert audit log entry
    const { data, error } = await supabase
      .from('certification_audit_logs')
      .insert({
        user_id: user.id,
        certification_id: certificationId,
        action_type: actionType,
        field,
        old_value: oldValue,
        new_value: newValue,
        note
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to log audit entry:', error);
      return { error };
    }

    return { data };
  } catch (err) {
    console.error('Unexpected error logging audit entry:', err);
    return { error: err };
  }
}

/**
 * Log certification creation
 * @param {string} certificationId - UUID of the created certification
 * @param {Object} certificationData - The certification data that was created
 * @returns {Promise<Object>} Result of the audit log
 */
export async function logCertificationCreated(certificationId, certificationData) {
  return logAuditEntry({
    certificationId,
    actionType: AUDIT_ACTIONS.CREATE,
    note: `Certification created for template: ${certificationData.template_name || 'Unknown'}`
  });
}

/**
 * Log field changes during certification editing
 * @param {string} certificationId - UUID of the certification
 * @param {Array} changes - Array of field changes: [{field, oldValue, newValue}]
 * @returns {Promise<Array>} Array of audit log results
 */
export async function logCertificationEdited(certificationId, changes) {
  const promises = changes.map(change => 
    logAuditEntry({
      certificationId,
      actionType: AUDIT_ACTIONS.EDIT,
      field: change.field,
      oldValue: change.oldValue,
      newValue: change.newValue
    })
  );
  
  return Promise.all(promises);
}

/**
 * Log document upload or replacement
 * @param {string} certificationId - UUID of the certification
 * @param {string} filename - Name of the uploaded file
 * @param {boolean} isReplacement - Whether this replaces an existing document
 * @returns {Promise<Object>} Result of the audit log
 */
export async function logDocumentUploaded(certificationId, filename, isReplacement = false) {
  return logAuditEntry({
    certificationId,
    actionType: AUDIT_ACTIONS.UPLOAD,
    note: isReplacement 
      ? `Document replaced: ${filename}` 
      : `Document uploaded: ${filename}`
  });
}

/**
 * Log certification deletion
 * @param {string} certificationId - UUID of the certification
 * @param {Object} certificationData - The certification data before deletion
 * @returns {Promise<Object>} Result of the audit log
 */
export async function logCertificationDeleted(certificationId, certificationData) {
  return logAuditEntry({
    certificationId,
    actionType: AUDIT_ACTIONS.DELETE,
    note: `Certification deleted: ${certificationData.template_name || 'Unknown'} (${certificationData.expiry_date || 'No expiry date'})`
  });
}

/**
 * Log comments or notes added to certification
 * @param {string} certificationId - UUID of the certification
 * @param {string} comment - The comment/note that was added
 * @returns {Promise<Object>} Result of the audit log
 */
export async function logCertificationComment(certificationId, comment) {
  return logAuditEntry({
    certificationId,
    actionType: AUDIT_ACTIONS.COMMENT,
    note: comment
  });
}

/**
 * Fetch audit trail for a specific certification
 * @param {string} certificationId - UUID of the certification
 * @returns {Promise<Object>} Audit trail data or error
 */
export async function fetchAuditTrail(certificationId) {
  try {
    // First try to use the view (includes user information)
    let { data, error } = await supabase
      .from('v_certification_audit_logs')
      .select('*')
      .eq('certification_id', certificationId)
      .order('created_at', { ascending: false });

    // If view doesn't exist, fall back to base table
    if (error && error.code === '42P01') {
      console.log('View not found, falling back to base table');
      
      const { data: baseData, error: baseError } = await supabase
        .from('certification_audit_logs')
        .select(`
          id,
          user_id,
          certification_id,
          action_type,
          field,
          old_value,
          new_value,
          note,
          created_at
        `)
        .eq('certification_id', certificationId)
        .order('created_at', { ascending: false });

      if (baseError) {
        console.error('Failed to fetch audit trail from base table:', baseError);
        return { error: baseError };
      }

      // Add performed_by field manually (will show as 'Unknown User' for now)
      data = baseData?.map(entry => ({
        ...entry,
        performed_by: 'Unknown User'
      })) || [];
    } else if (error) {
      console.error('Failed to fetch audit trail:', error);
      return { error };
    }

    return { data: data || [] };
  } catch (err) {
    console.error('Unexpected error fetching audit trail:', err);
    return { error: err };
  }
}

/**
 * Helper function to compare objects and return field changes
 * @param {Object} oldData - Original data
 * @param {Object} newData - Updated data
 * @param {Array} fieldsToTrack - Array of field names to track changes for
 * @returns {Array} Array of changes: [{field, oldValue, newValue}]
 */
export function getFieldChanges(oldData, newData, fieldsToTrack) {
  const changes = [];
  
  fieldsToTrack.forEach(field => {
    const oldValue = oldData[field];
    const newValue = newData[field];
    
    // Convert values to strings for comparison (handles null/undefined)
    const oldStr = oldValue != null ? String(oldValue) : '';
    const newStr = newValue != null ? String(newValue) : '';
    
    if (oldStr !== newStr) {
      changes.push({
        field,
        oldValue: oldValue != null ? String(oldValue) : null,
        newValue: newValue != null ? String(newValue) : null
      });
    }
  });
  
  return changes;
} 