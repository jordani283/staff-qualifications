import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { X, Download, Eye, Calendar, FileText, User, Clock, RefreshCw, Edit2, Save, Upload, MessageSquare, CheckCircle, AlertTriangle, XCircle, Paperclip } from 'lucide-react';
import { supabase } from '../supabase.js';
import { showToast } from './ui';
import { logCertificationEdited, logDocumentUploaded, logCertificationComment } from '../utils/auditLogger.js';
import { updateCertificationWithAudit } from '../utils/certificationEditing.js';
import Dialog from './Dialog';

const CertificationModal = ({ 
  isOpen, 
  onClose, 
  certification, 
  auditTrail = [],
  canRenew = false,
  onRenew = null,
  onDataChange = null // Callback to refresh data after changes
}) => {
  const modalRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // State for inline editing
  const [isEditingIssueDate, setIsEditingIssueDate] = useState(false);
  const [editingIssueDate, setEditingIssueDate] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editingNotes, setEditingNotes] = useState('');
  const [documentFile, setDocumentFile] = useState(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [savingData, setSavingData] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);

  // No custom focus/escape trapping here; Dialog handles overlay, escape, and body scroll lock

  // Don't render if not open
  if (!isOpen || !certification) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Up-to-Date':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'Expiring Soon':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'Expired':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Up-to-Date':
        return <CheckCircle className="w-4 h-4" />;
      case 'Expiring Soon':
        return <AlertTriangle className="w-4 h-4" />;
      case 'Expired':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const computeStatusFromExpiry = (expiryDateString) => {
    if (!expiryDateString) return 'Unknown';
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiry = new Date(expiryDateString + 'T00:00:00');
      if (isNaN(expiry.getTime())) return 'Unknown';
      if (expiry < today) return 'Expired';
      const diffMs = expiry - today;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 30) return 'Expiring Soon';
      return 'Up-to-Date';
    } catch {
      return 'Unknown';
    }
  };

  // Progress ring removed per request; keeping computeStatusFromExpiry for badge colors

  const handleDocumentAction = (action, filename) => {
    if (action === 'view' && certification.document_url) {
      // Open document in new tab
      window.open(certification.document_url, '_blank', 'noopener,noreferrer');
    } else if (action === 'download' && certification.document_url) {
      // For download, we can either open in new tab or trigger download
      const link = document.createElement('a');
      link.href = certification.document_url;
      link.download = filename || 'document';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      console.log(`${action} document:`, filename, 'URL not available');
    }
  };

  // Backdrop and click-out handled by Dialog

  // Calculate expiry date based on issue date and validity period
  const calculateExpiryDate = async (issueDate) => {
    try {
      // Get the template's validity period
      const { data: template, error } = await supabase
        .from('certification_templates')
        .select('validity_period_months')
        .eq('id', certification.template_id)
        .single();

      if (error || !template) {
        console.error('Failed to fetch template validity period:', error);
        return null;
      }

      const date = new Date(issueDate + 'T00:00:00');
      date.setMonth(date.getMonth() + parseInt(template.validity_period_months));
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error calculating expiry date:', error);
      return null;
    }
  };

  // Handle issue date editing
  const handleIssueDateEdit = () => {
    setEditingIssueDate(certification.issue_date);
    setIsEditingIssueDate(true);
  };

  const handleIssueDateCancel = () => {
    setIsEditingIssueDate(false);
    setEditingIssueDate('');
  };

  const handleIssueDateSave = async () => {
    if (!editingIssueDate || editingIssueDate === certification.issue_date) {
      setIsEditingIssueDate(false);
      return;
    }

    setSavingData(true);
    try {
      // Calculate new expiry date
      const newExpiryDate = await calculateExpiryDate(editingIssueDate);
      if (!newExpiryDate) {
        throw new Error('Failed to calculate new expiry date');
      }

      // Update the certification
      const { error } = await supabase
        .from('staff_certifications')
        .update({
          issue_date: editingIssueDate,
          expiry_date: newExpiryDate
        })
        .eq('id', certification.id);

      if (error) throw error;

      // Log the changes
      const changes = [
        {
          field: 'issue_date',
          oldValue: certification.issue_date,
          newValue: editingIssueDate
        },
        {
          field: 'expiry_date', 
          oldValue: certification.expiry_date,
          newValue: newExpiryDate
        }
      ];

      await logCertificationEdited(certification.id, changes);

      // Update local state
      certification.issue_date = editingIssueDate;
      certification.expiry_date = newExpiryDate;

      setIsEditingIssueDate(false);
      showToast('Issue date updated successfully', 'success');
      
      // Notify parent component to refresh data
      if (onDataChange) onDataChange();

    } catch (error) {
      console.error('Failed to update issue date:', error);
      showToast('Failed to update issue date', 'error');
    } finally {
      setSavingData(false);
    }
  };

  // Handle notes editing
  const handleNotesEdit = () => {
    setEditingNotes(certification.notes || '');
    setIsEditingNotes(true);
  };

  const handleNotesCancel = () => {
    setIsEditingNotes(false);
    setEditingNotes('');
  };

  const handleNotesSave = async () => {
    if (editingNotes === (certification.notes || '')) {
      setIsEditingNotes(false);
      return;
    }

    setSavingData(true);
    try {
      // Update the certification notes
      const { error } = await supabase
        .from('staff_certifications')
        .update({ notes: editingNotes })
        .eq('id', certification.id);

      if (error) throw error;

      // Log the comment if notes were added/changed
      if (editingNotes && editingNotes !== (certification.notes || '')) {
        await logCertificationComment(certification.id, `Notes updated: ${editingNotes}`);
      }

      // Update local state
      certification.notes = editingNotes;

      setIsEditingNotes(false);
      showToast('Notes updated successfully', 'success');
      
      // Notify parent component to refresh data
      if (onDataChange) onDataChange();

    } catch (error) {
      console.error('Failed to update notes:', error);
      showToast('Failed to update notes', 'error');
    } finally {
      setSavingData(false);
    }
  };

  // Handle document upload/replace
  const handleDocumentUpload = async () => {
    if (!documentFile) return;

    setUploadingDocument(true);
    try {
      const fileExt = documentFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${certification.id}/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(filePath, documentFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('certificates')
        .getPublicUrl(filePath);

      // Update certification with new document URL
      const { error: updateError } = await supabase
        .from('staff_certifications')
        .update({ document_url: publicUrl })
        .eq('id', certification.id);

      if (updateError) throw updateError;

      // Log the document upload
      const isReplacement = !!certification.document_url;
      await logDocumentUploaded(certification.id, documentFile.name, isReplacement);

      // Update local state
      certification.document_url = publicUrl;
      certification.document_filename = documentFile.name;

      setDocumentFile(null);
      showToast(`Document ${isReplacement ? 'replaced' : 'uploaded'} successfully`, 'success');
      
      // Notify parent component to refresh data
      if (onDataChange) onDataChange();

    } catch (error) {
      console.error('Failed to upload document:', error);
      showToast('Failed to upload document', 'error');
    } finally {
      setUploadingDocument(false);
    }
  };

  return (
    <Dialog id="certification-modal" title="Certification Details" onClose={onClose} size="extra-large">
      <div ref={modalRef} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Details, Document, Notes */}
          <div>
            {/* Certification Details */}
            <div className="space-y-6 mb-8">
              {/* Header Block */}
              <div className="bg-gradient-to-r from-emerald-50 to-blue-50/60 rounded-xl border border-emerald-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xl font-bold text-slate-900">{certification.certification_name || 'Not specified'}</div>
                    <div className="flex items-center gap-2 text-slate-800">
                      <User className="w-4 h-4 text-slate-600" />
                      <span className="font-semibold">{certification.staff_name || 'Not specified'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border shadow-sm ${getStatusColor(computeStatusFromExpiry(certification.expiry_date))}`}>
                      {getStatusIcon(computeStatusFromExpiry(certification.expiry_date))}
                      <span>{computeStatusFromExpiry(certification.expiry_date)}</span>
                    </div>
                    {(canRenew && (computeStatusFromExpiry(certification.expiry_date) === 'Expired' || computeStatusFromExpiry(certification.expiry_date) === 'Expiring Soon') && typeof onRenew === 'function') && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!onRenew || isRenewing) return;
                          setIsRenewing(true);
                          try {
                            await onRenew(certification);
                          } finally {
                            setIsRenewing(false);
                          }
                        }}
                        disabled={isRenewing}
                        title={isRenewing ? 'Processing renewal...' : 'Renew this certification'}
                        aria-label="Renew certification"
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold shadow-sm border transition-colors ${isRenewing ? 'bg-emerald-400 text-white cursor-wait' : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700/40'}`}
                      >
                        <RefreshCw className={`w-4 h-4 ${isRenewing ? 'animate-spin' : ''}`} />
                        {isRenewing ? 'Renewing...' : 'Renew'}
                      </button>
                    )}
                  </div>
                  </div>
                </div>
                {/* Date Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div className="rounded-lg border border-blue-200 bg-white p-3 shadow-sm">
                    <div className="text-sm font-semibold text-slate-600 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Issue Date
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      {isEditingIssueDate ? (
                        <>
                          <input
                            type="date"
                            value={editingIssueDate}
                            onChange={(e) => setEditingIssueDate(e.target.value)}
                            className="px-3 py-1 border border-slate-300 rounded text-sm text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            disabled={savingData}
                          />
                          <button
                            onClick={handleIssueDateSave}
                            disabled={savingData}
                            className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors disabled:opacity-50"
                            title="Save changes"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleIssueDateCancel}
                            disabled={savingData}
                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded transition-colors disabled:opacity-50"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 group">
                          <span className="text-base text-slate-900 font-medium">{formatDate(certification.issue_date)}</span>
                          <button
                            onClick={handleIssueDateEdit}
                            className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                            title="Edit issue date"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-white p-3 shadow-sm">
                    <div className="text-sm font-semibold text-slate-600 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Expiry Date
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-base text-slate-900 font-medium">{formatDate(certification.expiry_date)}</span>
                      {isEditingIssueDate && (
                        <span className="ml-2 text-xs text-slate-500 italic">(auto-calculated)</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Document Section */}
              <div className="border-t border-slate-300 pt-6">
                <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-slate-500" />
                  Document
                </h4>
                
                {certification.document_filename ? (
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-300">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <span className="text-slate-900 font-medium text-sm truncate" title={certification.document_filename}>
                        {certification.document_filename}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDocumentAction('view', certification.document_filename)}
                        className="px-2 py-1 text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 rounded transition-colors"
                        title="View document"
                      >
                        View
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2 py-1 text-xs border border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                        title="Replace document"
                      >
                        Replace
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-300 text-center">
                    <p className="text-sm text-slate-600">No document uploaded</p>
                  </div>
                )}
                
                {/* Document Upload */}
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="file"
                    id="document-upload"
                    onChange={(e) => setDocumentFile(e.target.files[0])}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="hidden"
                    ref={fileInputRef}
                  />
                  {!certification.document_filename && (
                    <label
                      htmlFor="document-upload"
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 cursor-pointer transition-colors text-emerald-700 font-semibold"
                    >
                      <Upload className="w-4 h-4 text-emerald-700" />
                      Upload Document
                    </label>
                  )}
                  
                  {documentFile && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">{documentFile.name}</span>
                      <button
                        onClick={handleDocumentUpload}
                        disabled={uploadingDocument}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded border border-emerald-700/40 transition-colors disabled:opacity-50"
                      >
                        {uploadingDocument ? 'Uploading...' : 'Upload'}
                      </button>
                      <button
                        onClick={() => setDocumentFile(null)}
                        disabled={uploadingDocument}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded border border-transparent hover:border-slate-300 transition-colors disabled:opacity-50"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes Section */}
              <div className="border-t border-slate-300 pt-6 mt-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Notes (Optional)
                </h4>
                
                {isEditingNotes ? (
                  <div className="space-y-3">
                    <textarea
                      value={editingNotes}
                      onChange={(e) => setEditingNotes(e.target.value)}
                      placeholder="Add any notes about this certification..."
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                      disabled={savingData}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleNotesSave}
                        disabled={savingData}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded transition-colors disabled:opacity-50"
                      >
                        {savingData ? 'Saving...' : 'Save Notes'}
                      </button>
                      <button
                        onClick={handleNotesCancel}
                        disabled={savingData}
                        className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs rounded transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="group">
                    {certification.notes ? (
                      <button onClick={handleNotesEdit} className="w-full text-left">
                        <div className="flex items-start gap-2">
                        <p className="text-sm text-slate-900 flex-1 bg-slate-50 p-3 rounded-lg border border-slate-300 group-hover:border-emerald-400 transition-colors">
                            {certification.notes}
                          </p>
                          <span
                            className="p-1 text-slate-400 group-hover:text-emerald-600 group-hover:bg-emerald-50 rounded transition-colors"
                            title="Edit notes"
                          >
                            <Edit2 className="w-4 h-4" />
                          </span>
                        </div>
                      </button>
                    ) : (
                      <button
                        onClick={handleNotesEdit}
                        className="w-full p-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-emerald-300 hover:text-emerald-600 transition-colors text-sm"
                      >
                        Click to add notes...
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

          {/* Right: Audit Trail */}
          <div className="lg:border-l lg:pl-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              Audit Trail
            </h3>
            {auditTrail.length > 0 ? (
              <div className="relative">
                <div className="absolute left-3 top-0 bottom-0 w-px bg-emerald-200 hidden sm:block" />
                <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                  {auditTrail.map((entry, index) => (
                    <div key={entry.id || index} className="relative pl-8">
                      <div className="absolute left-0 top-2 w-5 h-5 rounded-full bg-white border border-emerald-300 flex items-center justify-center text-emerald-500">
                        <Clock className="w-3 h-3" />
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-slate-300 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-slate-900 font-medium">
                                {entry.action_type || entry.action || 'Unknown action'}
                              </span>
                              {entry.field && (
                                <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-100">
                                  {entry.field}
                                </span>
                              )}
                            </div>
                            {entry.old_value && entry.new_value && (
                              <div className="text-sm text-slate-600 mb-2">
                                <span className="text-red-600">{entry.old_value}</span>
                                <span className="text-slate-400 mx-2">→</span>
                                <span className={`text-emerald-700 ${ (entry.action_type === 'EDIT' || entry.action === 'EDIT') ? 'font-semibold' : '' }`}>
                                  {entry.new_value}
                                </span>
                              </div>
                            )}
                            {entry.note && (
                              <div className="text-sm text-slate-600 mb-2">
                                {entry.note}
                              </div>
                            )}
                            <div className="flex items-center gap-4 text-xs text-slate-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{formatDate(entry.created_at || entry.date)}</span>
                              </div>
                              {entry.performed_by && (
                                <div className="flex items-center gap-1 text-slate-700">
                                  <User className="w-3 h-3" />
                                  <span className="font-medium">{entry.performed_by}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No audit trail entries found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
};

CertificationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  certification: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    template_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    certification_name: PropTypes.string,
    staff_name: PropTypes.string,
    issue_date: PropTypes.string,
    expiry_date: PropTypes.string,
    status: PropTypes.string,
    document_filename: PropTypes.string,
    document_url: PropTypes.string,
    notes: PropTypes.string,
  }),
  auditTrail: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      action: PropTypes.string,
      action_type: PropTypes.string,
      field: PropTypes.string,
      old_value: PropTypes.string,
      new_value: PropTypes.string,
      note: PropTypes.string,
      created_at: PropTypes.string,
      date: PropTypes.string,
      performed_by: PropTypes.string,
    })
  ),
  canRenew: PropTypes.bool,
  onRenew: PropTypes.func,
  onDataChange: PropTypes.func,
};

export default CertificationModal; 