import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { X, Download, Eye, Calendar, FileText, User, Clock } from 'lucide-react';

const CertificationModal = ({ 
  isOpen, 
  onClose, 
  certification, 
  auditTrail = [] 
}) => {
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Focus management and keyboard handling
  useEffect(() => {
    if (isOpen) {
      // Focus the close button when modal opens
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);

      // Handle ESC key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      // Trap focus within modal
      const handleTabKey = (e) => {
        if (e.key === 'Tab') {
          const focusableElements = modalRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          const firstElement = focusableElements?.[0];
          const lastElement = focusableElements?.[focusableElements.length - 1];

          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      };

      document.addEventListener('keydown', handleEscape);
      document.addEventListener('keydown', handleTabKey);
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.removeEventListener('keydown', handleTabKey);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, onClose]);

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
    switch (status?.toLowerCase()) {
      case 'valid':
        return 'text-green-400 bg-green-400/10';
      case 'expiring soon':
        return 'text-amber-400 bg-amber-400/10';
      case 'expired':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-slate-400 bg-slate-400/10';
    }
  };

  const handleDocumentAction = (action, filename) => {
    // This would typically handle document download/view
    console.log(`${action} document:`, filename);
    // TODO: Implement actual document handling
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      style={{ 
        position: 'fixed', 
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div 
        ref={modalRef}
        className="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 id="modal-title" className="text-xl font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-400" />
            Certification Details
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Certification Details */}
          <div className="space-y-4 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Labels Column */}
              <div className="space-y-4 text-sm font-medium text-slate-300">
                <div className="h-6 flex items-center">Certification Name</div>
                <div className="h-6 flex items-center">Issue Date</div>
                <div className="h-6 flex items-center">Expiry Date</div>
                <div className="h-6 flex items-center">Status</div>
                {certification.document_filename && (
                  <div className="h-6 flex items-center">Document</div>
                )}
              </div>

              {/* Values Column */}
              <div className="md:col-span-2 space-y-4">
                <div className="h-6 flex items-center text-white font-medium">
                  {certification.certification_name || 'Not specified'}
                </div>
                <div className="h-6 flex items-center text-slate-200">
                  {formatDate(certification.issue_date)}
                </div>
                <div className="h-6 flex items-center text-slate-200">
                  {formatDate(certification.expiry_date)}
                </div>
                <div className="h-6 flex items-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(certification.status)}`}>
                    {certification.status || 'Unknown'}
                  </span>
                </div>
                {certification.document_filename && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-200 text-sm">
                      {certification.document_filename}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDocumentAction('view', certification.document_filename)}
                        className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-700 rounded transition-colors"
                        title="View document"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDocumentAction('download', certification.document_filename)}
                        className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-700 rounded transition-colors"
                        title="Download document"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Audit Trail Section */}
          <div className="border-t border-slate-700 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-400" />
              Audit Trail
            </h3>
            
            {auditTrail.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {auditTrail.map((entry, index) => (
                  <div 
                    key={entry.id || index}
                    className="bg-slate-700/50 rounded-lg p-4 border border-slate-600"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-white font-medium">
                            {entry.action_type || entry.action || 'Unknown action'}
                          </span>
                          {entry.field && (
                            <span className="text-xs bg-slate-600 text-slate-300 px-2 py-1 rounded">
                              {entry.field}
                            </span>
                          )}
                        </div>
                        
                        {/* Show field changes if available */}
                        {entry.old_value && entry.new_value && (
                          <div className="text-sm text-slate-300 mb-2">
                            <span className="text-red-400">{entry.old_value}</span>
                            <span className="text-slate-500 mx-2">→</span>
                            <span className="text-green-400">{entry.new_value}</span>
                          </div>
                        )}
                        
                        {/* Show note if available */}
                        {entry.note && (
                          <div className="text-sm text-slate-400 mb-2 italic">
                            {entry.note}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-slate-300">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(entry.created_at || entry.date)}
                          </div>
                          {entry.performed_by && (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {entry.performed_by}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No audit trail entries found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

CertificationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  certification: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    certification_name: PropTypes.string,
    issue_date: PropTypes.string,
    expiry_date: PropTypes.string,
    status: PropTypes.string,
    document_filename: PropTypes.string,
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
};

export default CertificationModal; 