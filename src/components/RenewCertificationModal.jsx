import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { X, RefreshCw, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '../supabase.js';
import { showToast } from './ui.jsx';
import { updateCertificationWithAudit } from '../utils/certificationEditing.js';

const RenewCertificationModal = ({ 
  isOpen, 
  onClose, 
  certificationId,
  currentIssueDate,
  currentExpiryDate,
  templateName,
  staffName,
  templateValidityPeriodMonths,
  onRenewalSuccess 
}) => {
  const [newIssueDate, setNewIssueDate] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [renewalReason, setRenewalReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Initialize form with today's date as default issue date
  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      setNewIssueDate(today);
      setRenewalReason('');
      setValidationErrors({});
    }
  }, [isOpen]);

  // Calculate new expiry date based on issue date and validity period
  useEffect(() => {
    if (newIssueDate) {
      try {
        const issueDate = new Date(newIssueDate + 'T00:00:00'); // Ensure local timezone
        const expiryDate = new Date(issueDate);
        const validityMonths = parseInt(templateValidityPeriodMonths) || 12; // Default to 12 months
        
        expiryDate.setMonth(expiryDate.getMonth() + validityMonths);
        const formattedExpiryDate = expiryDate.toISOString().split('T')[0];
        
        setNewExpiryDate(formattedExpiryDate);
      } catch (error) {
        // Fallback calculation if date parsing fails
        const issueDate = new Date(newIssueDate + 'T00:00:00');
        const expiryDate = new Date(issueDate);
        expiryDate.setMonth(expiryDate.getMonth() + 12);
        setNewExpiryDate(expiryDate.toISOString().split('T')[0]);
      }
    }
  }, [newIssueDate, templateValidityPeriodMonths]);

  // Validation function
  const validateForm = () => {
    const errors = {};
    
    if (!newIssueDate) {
      errors.newIssueDate = 'New issue date is required';
    } else {
      const issueDate = new Date(newIssueDate + 'T00:00:00'); // Ensure local timezone
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (issueDate > today) {
        errors.newIssueDate = 'Issue date cannot be in the future';
      }
    }
    
    if (!newExpiryDate) {
      errors.newExpiryDate = 'New expiry date is required';
    } else {
      const currentExpiry = new Date(currentExpiryDate + 'T00:00:00');
      const newExpiry = new Date(newExpiryDate + 'T00:00:00');
      
      if (newExpiry <= currentExpiry) {
        errors.newExpiryDate = 'New expiry date must be after current expiry date';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Ensure dates are properly formatted
      const formattedNewIssueDate = newIssueDate.includes('T') ? newIssueDate.split('T')[0] : newIssueDate;
      const formattedNewExpiryDate = newExpiryDate.includes('T') ? newExpiryDate.split('T')[0] : newExpiryDate;
      
      // Debug: Remove this console.log in production
      // console.log('Renewal request:', {
      //   certification_id: certificationId,
      //   new_issue_date: formattedNewIssueDate,
      //   new_expiry_date: formattedNewExpiryDate,
      //   current_expiry_date: currentExpiryDate,
      //   renewal_reason: renewalReason || null
      // });
      
      // Update certification using the same approach as the staff section
      const updates = {
        issue_date: formattedNewIssueDate,
        expiry_date: formattedNewExpiryDate
      };

      const result = await updateCertificationWithAudit(certificationId, updates);
      
      if (result.error) {
        console.error('Error renewing certification:', result.error);
        showToast(`Failed to renew certification: ${result.error.message}`, 'error');
        return;
      }
      
      // Add renewal reason to audit trail if provided
      if (renewalReason && renewalReason.trim()) {
        try {
          await supabase
            .from('certification_audit_logs')
            .insert({
              user_id: (await supabase.auth.getUser()).data.user?.id,
              certification_id: certificationId,
              action_type: 'RENEWAL_NOTE',
              note: renewalReason.trim()
            });
        } catch (error) {
          console.warn('Failed to log renewal reason:', error);
          // Don't fail the renewal for this
        }
      }
      
      // Success
      showToast('Certification renewed successfully!', 'success');
      onRenewalSuccess();
      onClose();
      
    } catch (err) {
      console.error('Unexpected error renewing certification:', err);
      showToast('An unexpected error occurred while renewing the certification', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="renew-modal-title"
      style={{ 
        display: 'flex',
        alignItems: 'start',
        justifyContent: 'center',
        padding: '1rem',
        paddingTop: '80px'
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 id="renew-modal-title" className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-emerald-600" />
            Renew Certification
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Certification Info */}
          <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="text-sm font-medium text-slate-700 mb-2">Certification Details</h3>
            <div className="space-y-1 text-sm">
              <div className="text-slate-900"><strong>Staff:</strong> {staffName}</div>
              <div className="text-slate-900"><strong>Certificate:</strong> {templateName || 'Unknown Template'}</div>
              <div className="text-slate-600"><strong>Current Issue Date:</strong> {formatDate(currentIssueDate)}</div>
              <div className="text-slate-600"><strong>Current Expiry Date:</strong> {formatDate(currentExpiryDate)}</div>
            </div>
          </div>

          {/* Renewal Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Issue Date */}
            <div>
              <label htmlFor="new-issue-date" className="block text-sm font-medium text-slate-700 mb-2">
                New Issue Date
              </label>
              <input
                id="new-issue-date"
                type="date"
                value={newIssueDate}
                onChange={(e) => setNewIssueDate(e.target.value)}
                className={`w-full bg-white border rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                  validationErrors.newIssueDate ? 'border-red-500' : 'border-slate-300'
                }`}
                required
              />
              {validationErrors.newIssueDate && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {validationErrors.newIssueDate}
                </p>
              )}
            </div>

            {/* New Expiry Date (calculated, read-only) */}
            <div>
              <label htmlFor="new-expiry-date" className="block text-sm font-medium text-slate-700 mb-2">
                New Expiry Date
                <span className="text-xs text-slate-500 ml-1">
                  (Auto-calculated: {templateValidityPeriodMonths || 12} months from issue date)
                </span>
              </label>
              <input
                id="new-expiry-date"
                type="date"
                value={newExpiryDate}
                readOnly
                className={`w-full bg-slate-100 border rounded-lg p-3 text-slate-600 cursor-not-allowed ${
                  validationErrors.newExpiryDate ? 'border-red-500' : 'border-slate-300'
                }`}
              />
              {validationErrors.newExpiryDate && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {validationErrors.newExpiryDate}
                </p>
              )}
            </div>

            {/* Renewal Reason */}
            <div>
              <label htmlFor="renewal-reason" className="block text-sm font-medium text-slate-700 mb-2">
                Renewal Reason <span className="text-slate-500">(Optional)</span>
              </label>
              <textarea
                id="renewal-reason"
                value={renewalReason}
                onChange={(e) => setRenewalReason(e.target.value)}
                placeholder="e.g., Completed refresher training, Annual renewal, etc."
                rows="3"
                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none"
              />
            </div>

            {/* Summary */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Renewal Summary
              </h4>
              <div className="text-sm space-y-1">
                <div className="text-slate-600">
                  <span className="text-red-600">Current expires:</span> {formatDate(currentExpiryDate)}
                </div>
                <div className="text-slate-600">
                  <span className="text-emerald-600">New expires:</span> {formatDate(newExpiryDate)}
                </div>
                {newExpiryDate && currentExpiryDate && (
                  <div className="text-slate-600">
                    <span className="text-emerald-600">Extension:</span> {
                      Math.ceil((new Date(newExpiryDate) - new Date(currentExpiryDate)) / (1000 * 60 * 60 * 24))
                    } days
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Renewing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Renew Certification
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

RenewCertificationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  certificationId: PropTypes.string.isRequired,
  currentIssueDate: PropTypes.string.isRequired,
  currentExpiryDate: PropTypes.string.isRequired,
  templateName: PropTypes.string,
  staffName: PropTypes.string.isRequired,
  templateValidityPeriodMonths: PropTypes.number,
  onRenewalSuccess: PropTypes.func.isRequired
};

export default RenewCertificationModal; 