import { supabase } from '../supabase.js';
import { logCertificationEdited, getFieldChanges } from './auditLogger.js';

/**
 * Update certification with automatic audit logging
 * This is an example implementation showing how to track field changes
 * 
 * @param {string} certificationId - UUID of certification to update
 * @param {Object} updates - Object containing fields to update
 * @returns {Promise<Object>} Result of the update operation
 */
export async function updateCertificationWithAudit(certificationId, updates) {
    try {
        // First, get the current certification data
        const { data: currentCert, error: fetchError } = await supabase
            .from('staff_certifications')
            .select('*')
            .eq('id', certificationId)
            .single();

        if (fetchError) {
            console.error('Failed to fetch current certification:', fetchError);
            return { error: fetchError };
        }

        // Define which fields to track for changes
        const fieldsToTrack = [
            'issue_date',
            'expiry_date', 
            'template_id',
            'notes',
            'document_url'
        ];

        // Calculate what changed
        const changes = getFieldChanges(currentCert, updates, fieldsToTrack);

        // Only proceed with update if there are actual changes
        if (changes.length === 0) {
            return { data: currentCert, message: 'No changes detected' };
        }

        // Perform the database update
        const { data: updatedCert, error: updateError } = await supabase
            .from('staff_certifications')
            .update(updates)
            .eq('id', certificationId)
            .select()
            .single();

        if (updateError) {
            console.error('Failed to update certification:', updateError);
            return { error: updateError };
        }

        // Log all field changes to audit trail
        const auditResult = await logCertificationEdited(certificationId, changes);
        
        // Check if audit logging had any issues (but don't fail the update)
        if (auditResult.some(result => result.error)) {
            console.warn('Some audit log entries failed to save:', auditResult);
        }

        return { 
            data: updatedCert, 
            changes: changes.length,
            message: `Certification updated with ${changes.length} field changes logged`
        };

    } catch (err) {
        console.error('Unexpected error updating certification:', err);
        return { error: err };
    }
}

/**
 * Update multiple certifications in bulk with audit logging
 * 
 * @param {Array} certificationUpdates - Array of {id, updates} objects
 * @returns {Promise<Object>} Results of bulk update operation
 */
export async function bulkUpdateCertificationsWithAudit(certificationUpdates) {
    try {
        const results = [];
        
        // Process each certification update
        for (const { id, updates } of certificationUpdates) {
            const result = await updateCertificationWithAudit(id, updates);
            results.push({ id, result });
        }

        const successful = results.filter(r => !r.result.error).length;
        const failed = results.filter(r => r.result.error).length;

        return {
            data: results,
            summary: {
                total: certificationUpdates.length,
                successful,
                failed
            }
        };

    } catch (err) {
        console.error('Unexpected error in bulk update:', err);
        return { error: err };
    }
}

/**
 * Example usage in React components:
 * 
 * ```javascript
 * import { updateCertificationWithAudit } from '../utils/certificationEditing.js';
 * 
 * const handleUpdateCertification = async (certificationId, formData) => {
 *     const updates = {
 *         issue_date: formData.get('issue_date'),
 *         expiry_date: formData.get('expiry_date'),
 *         notes: formData.get('notes')
 *     };
 * 
 *     const { data, error, changes } = await updateCertificationWithAudit(
 *         certificationId, 
 *         updates
 *     );
 * 
 *     if (error) {
 *         showToast('Failed to update certification', 'error');
 *     } else {
 *         showToast(`Certification updated (${changes} changes logged)`, 'success');
 *         // Refresh data or update UI
 *     }
 * };
 * ```
 */

/**
 * Helper function to format field names for display in UI
 * 
 * @param {string} fieldName - Database field name
 * @returns {string} Human-readable field name
 */
export function formatFieldName(fieldName) {
    const fieldMap = {
        'issue_date': 'Issue Date',
        'expiry_date': 'Expiry Date',
        'template_id': 'Certification Type',
        'document_url': 'Document',
        'notes': 'Notes',
        'staff_id': 'Staff Member'
    };
    
    return fieldMap[fieldName] || fieldName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Helper function to format field values for display in audit trail
 * 
 * @param {string} fieldName - Database field name
 * @param {any} value - Field value
 * @returns {string} Formatted value for display
 */
export function formatFieldValue(fieldName, value) {
    if (value === null || value === undefined) {
        return 'None';
    }
    
    // Format dates
    if (fieldName.includes('date') && value) {
        try {
            return new Date(value).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return String(value);
        }
    }
    
    // Format document URLs
    if (fieldName === 'document_url' && value) {
        return value.split('/').pop() || 'Document';
    }
    
    return String(value);
} 