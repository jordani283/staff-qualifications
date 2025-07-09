import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase.js';
import { CardSpinner, Spinner, StatusBadge, showToast } from '../components/ui';
import { ArrowLeft, Plus, Trash2, Calendar, Download, FileText, User, Clock, Edit, AlertTriangle, X, CheckCircle, ExternalLink, Save, Shield, AlertCircle, RotateCcw, ChevronDown, ChevronUp, Upload, Eye, EyeOff, FileCheck, Calendar as CalendarIcon, Clock as ClockIcon, FileX, AlertTriangleIcon } from 'lucide-react';
import Dialog from '../components/Dialog';
import CertificationModal from '../components/CertificationModal';
import RenewCertificationModal from '../components/RenewCertificationModal';
import { logCertificationCreated, logCertificationUpdated, logCertificationDeleted, logDocumentUploaded, logCertificationRenewed, logStaffDeleted } from '../utils/auditLogger.js';
import { useFeatureAccess } from '../hooks/useFeatureAccess.js';

function AssignCertDialog({ staffId, userId, onClose, onSuccess }) {
    const [templates, setTemplates] = useState([]);
    const [issueDate, setIssueDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const loadTemplates = async () => {
            const { data } = await supabase.from('certification_templates').select('id, name, validity_period_months').order('name');
            setTemplates(data || []);
        };
        loadTemplates();
    }, []);

    const calculateExpiryDate = (templateId, issueDateValue) => {
        const template = templates.find(t => t.id === templateId);
        if (template && issueDateValue) {
            const date = new Date(issueDateValue + 'T00:00:00');
            date.setMonth(date.getMonth() + parseInt(template.validity_period_months));
            return date.toISOString().split('T')[0];
        }
        return '';
    };
    
    const handleIssueDateChange = (e) => {
        const newIssueDate = e.target.value;
        setIssueDate(newIssueDate);
        const templateId = e.target.form.template_id.value;
        if(templateId) {
            e.target.form.expiry_date.value = calculateExpiryDate(templateId, newIssueDate);
        }
    };
    
    const handleTemplateChange = (e) => {
        const templateId = e.target.value;
        if(issueDate) {
            e.target.form.expiry_date.value = calculateExpiryDate(templateId, issueDate);
        }
    };
    
    const handleAssignCert = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const form = e.target;
        const formData = new FormData(form);
        const file = formData.get('document');
        let documentUrl = null;

        try {
            if (file && file.size > 0) {
                const filePath = `${userId}/${staffId}/${Date.now()}-${file.name}`;
                const { data: uploadData, error: uploadError } = await supabase.storage.from('certificates').upload(filePath, file);
                if (uploadError) throw uploadError;
                
                const { data: urlData } = supabase.storage.from('certificates').getPublicUrl(filePath);
                documentUrl = urlData.publicUrl;
            }

            const newCert = {
                user_id: userId,
                staff_id: formData.get('staff_id'),
                template_id: formData.get('template_id'),
                issue_date: formData.get('issue_date'),
                expiry_date: formData.get('expiry_date'),
                document_url: documentUrl,
            };

            const { data: insertedCert, error } = await supabase
                .from('staff_certifications')
                .insert(newCert)
                .select()
                .single();
            if (error) throw error;

            // Log audit trail for certification creation
            await logCertificationCreated(insertedCert.id, {
                template_name: templates.find(t => t.id === newCert.template_id)?.name
            });

            // Log document upload if a document was uploaded
            if (documentUrl && file) {
                await logDocumentUploaded(insertedCert.id, file.name);
            }

            showToast('Certification assigned!', 'success');
            onSuccess();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog id="assign-cert-dialog" title="Assign Certification" onClose={onClose}>
            <form id="assign-cert-form" onSubmit={handleAssignCert} className="space-y-4">
                <input type="hidden" name="staff_id" value={staffId} />
                <div>
                    <label htmlFor="template_select" className="block text-sm font-medium text-slate-700 mb-2">Certification Type</label>
                    <select id="template_select" name="template_id" required onChange={handleTemplateChange} className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors">
                        <option value="">Loading templates...</option>
                        {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="issue_date" className="block text-sm font-medium text-slate-700 mb-2">Issue Date</label>
                    <input id="issue_date" name="issue_date" type="date" required onChange={handleIssueDateChange} value={issueDate} className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" />
                </div>
                 <div>
                    <label htmlFor="expiry_date" className="block text-sm font-medium text-slate-700 mb-2">Expiry Date</label>
                    <input id="expiry_date" name="expiry_date" type="date" required className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" />
                </div>
                <div>
                    <label htmlFor="document_upload" className="block text-sm font-medium text-slate-700 mb-2">Upload Document (Optional)</label>
                    <input id="document_upload" name="document" type="file" className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition-colors" />
                </div>
                <div className="flex justify-end pt-4 gap-3">
                    <button type="button" onClick={onClose} className="bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-semibold py-2.5 px-4 rounded-lg transition-colors">Cancel</button>
                    <button type="submit" disabled={isSubmitting} form="assign-cert-form" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm disabled:opacity-50">
                        {isSubmitting ? 'Assigning...' : 'Assign Certification'}
                    </button>
                </div>
            </form>
        </Dialog>
    );
}

export default function StaffDetailPage({ user, session, onOpenExpiredModal }) {
    const { id: staffId } = useParams();
    const navigate = useNavigate();
    const [staffMember, setStaffMember] = useState(null);
    const [certifications, setCertifications] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAssignDialog, setShowAssignDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [certificationToDelete, setCertificationToDelete] = useState(null);
    const [showCertModal, setShowCertModal] = useState(false);
    const [selectedCertification, setSelectedCertification] = useState(null);
    const [auditTrail, setAuditTrail] = useState([]);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [showRenewModal, setShowRenewModal] = useState(false);
    const [certificationToRenew, setCertificationToRenew] = useState(null);
    const [issueDate, setIssueDate] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [showDeleteStaffDialog, setShowDeleteStaffDialog] = useState(false);
    const [staffCertCount, setStaffCertCount] = useState(0);

    // Get feature access permissions
    const { canCreate, canDelete, canAssign, getButtonText, getButtonClass, handleRestrictedAction } = useFeatureAccess(session);

    // Fetch staff member data
    const fetchStaffMember = useCallback(async () => {
        if (!session || !staffId) {
            setLoading(false);
            return;
        }

        try {
            const { data: staffData, error: staffError } = await supabase
                .from('staff')
                .select('*')
                .eq('id', staffId)
                .eq('user_id', session.user.id)
                .single();

            if (staffError) {
                console.error('Error fetching staff member:', staffError);
                showToast('Staff member not found.', 'error');
                navigate('/staff');
                return;
            }

            setStaffMember(staffData);
        } catch (error) {
            console.error('Error fetching staff member:', error);
            showToast('Error loading staff member.', 'error');
            navigate('/staff');
        }
    }, [staffId, session, navigate]);

    // Utility function to calculate expiry date based on template validity period
    const calculateExpiryDate = useCallback((templateId, issueDateValue) => {
        const template = templates.find(t => t.id === templateId);
        
        if (template && issueDateValue && template.validity_period_months) {
            const date = new Date(issueDateValue + 'T00:00:00');
            const validityMonths = parseInt(template.validity_period_months);
            date.setMonth(date.getMonth() + validityMonths);
            return date.toISOString().split('T')[0];
        }
        return '';
    }, [templates]);

    // Handle issue date changes
    const handleIssueDateChange = (e) => {
        const newIssueDate = e.target.value;
        setIssueDate(newIssueDate);
        if (selectedTemplateId) {
            setExpiryDate(calculateExpiryDate(selectedTemplateId, newIssueDate));
        }
    };

    // Handle template selection changes
    const handleTemplateChange = (e) => {
        const templateId = e.target.value;
        setSelectedTemplateId(templateId);
        if (issueDate) {
            setExpiryDate(calculateExpiryDate(templateId, issueDate));
        }
    };

    // Initialize dates when dialog opens
    useEffect(() => {
        if (showAssignDialog) {
            // Default issue date to today
            const today = new Date().toISOString().split('T')[0];
            setIssueDate(today);
            setExpiryDate('');
            setSelectedTemplateId('');
        }
    }, [showAssignDialog]);

    // Recalculate expiry date when templates are loaded or when issue date/template changes
    useEffect(() => {
        if (issueDate && selectedTemplateId && templates.length > 0) {
            const calculatedExpiry = calculateExpiryDate(selectedTemplateId, issueDate);
            if (calculatedExpiry && calculatedExpiry !== expiryDate) {
                setExpiryDate(calculatedExpiry);
            }
        }
    }, [issueDate, selectedTemplateId, templates, calculateExpiryDate]);

    const fetchStaffCertifications = useCallback(async () => {
        if (!session || !staffMember) {
            setLoading(false);
            return;
        }
        
        setLoading(true);
        
        // Fetch staff certifications
        const { data: certData, error: certError } = await supabase
            .from('v_certifications_with_status')
            .select('*')
            .eq('staff_id', staffMember.id);
        
        if (certError) {
            showToast("Error fetching certifications.", "error");
        } else {
            setCertifications(certData || []);
            setStaffCertCount(certData ? certData.length : 0);
        }
        
        // Fetch available certificate templates
        const { data: templateData, error: templateError } = await supabase
            .from('certification_templates')
            .select('id, name, validity_period_months');
        
        if (templateError) {
            showToast("Error fetching certificate templates.", "error");
        } else {
            setTemplates(templateData || []);
        }
        
        setLoading(false);
    }, [staffMember, session]);

    useEffect(() => {
        fetchStaffMember();
    }, [fetchStaffMember]);

    useEffect(() => {
        if (staffMember) {
            fetchStaffCertifications();
        }
    }, [fetchStaffCertifications, staffMember]);

    const handleAssignCertification = async (e) => {
        e.preventDefault();
        if (!session) {
            showToast('No active session.', 'error');
            return;
        }
        
        const formData = new FormData(e.target);
        
        // Process file upload if present
        let documentUrl = null;
        const fileInput = formData.get('document');
        if (fileInput && fileInput.size > 0) {
            const filePath = `${user.id}/${staffMember.id}/${Date.now()}-${fileInput.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('certificates')
                .upload(filePath, fileInput);
            
            if (uploadError) {
                showToast("Error uploading document.", "error");
                return;
            }
            
            const { data: urlData } = supabase.storage
                .from('certificates')
                .getPublicUrl(filePath);
            documentUrl = urlData.publicUrl;
        }
        
        const newCertification = {
            user_id: user.id,
            staff_id: staffMember.id,
            template_id: formData.get('template_id'),
            issue_date: formData.get('issue_date'),
            expiry_date: formData.get('expiry_date'),
            document_url: documentUrl,
            notes: formData.get('notes') || null,
        };
        
        const { data: insertedCert, error } = await supabase
            .from('staff_certifications')
            .insert(newCertification)
            .select()
            .single();
            
        if(error) {
            showToast(error.message, 'error');
        } else {
            // Log audit trail for certification creation
            await logCertificationCreated(insertedCert.id, {
                template_name: templates.find(t => t.id === newCertification.template_id)?.name
            });

            // Log document upload if a document was uploaded
            if (documentUrl && fileInput) {
                await logDocumentUploaded(insertedCert.id, fileInput.name);
            }
            
            showToast('Certification assigned!', 'success');
            setShowAssignDialog(false);
            setIssueDate('');
            setExpiryDate('');
            setSelectedTemplateId('');
            fetchStaffCertifications();
        }
    };

    const confirmDeleteCertification = (certification) => {
        if (!canDelete) {
            handleShowUpgradePrompt();
            return;
        }
        setCertificationToDelete(certification);
        setShowDeleteDialog(true);
    };

    const handleDeleteCertification = async () => {
        if (!session || !certificationToDelete) {
            showToast('No active session.', 'error');
            return;
        }
        
        // Log deletion before actually deleting
        await logCertificationDeleted(certificationToDelete.id, {
            template_name: certificationToDelete.template_name,
            staff_name: staffMember.full_name
        });

        const { error } = await supabase
            .from('staff_certifications')
            .delete()
            .eq('id', certificationToDelete.id);
            
        if(error) {
            showToast(error.message, 'error');
        } else {
            showToast('Certification deleted.', 'success');
            setShowDeleteDialog(false);
            setCertificationToDelete(null);
            fetchStaffCertifications();
        }
    };

    const fetchAuditTrailData = async (certificationId) => {
        try {
            const auditData = await fetchAuditTrail(certificationId);
            setAuditTrail(auditData);
        } catch (error) {
            console.error('Error fetching audit trail:', error);
            setAuditTrail([]);
        }
    };

    const handleCertificationClick = async (cert) => {
        if (!canAssign) {
            handleShowUpgradePrompt();
            return;
        }
        setSelectedCertification(cert);
        setShowCertModal(true);
        
        // Fetch audit trail for this certification
        await fetchAuditTrailData(cert.id);
    };

    const handleCloseModal = () => {
        setShowCertModal(false);
        setSelectedCertification(null);
        setAuditTrail([]);
    };

    const handleSaveCertification = async (updates) => {
        if (!selectedCertification) return;
        
        const { error } = await supabase
            .from('staff_certifications')
            .update(updates)
            .eq('id', selectedCertification.id);
            
        if (error) {
            showToast(error.message, 'error');
        } else {
            // Log the update
            await logCertificationUpdated(selectedCertification.id, updates);
            
            showToast('Certification updated successfully!', 'success');
            handleCloseModal();
            fetchStaffCertifications();
        }
    };

    const handleShowUpgradePrompt = () => {
        if (onOpenExpiredModal) {
            onOpenExpiredModal();
        } else {
            navigate('/subscription');
        }
    };

    const handleRenewCertification = (cert) => {
        setCertificationToRenew(cert);
        setShowRenewModal(true);
    };

    const handleRenewalSuccess = () => {
        setShowRenewModal(false);
        setCertificationToRenew(null);
        fetchStaffCertifications();
    };

    const handleCloseRenewalModal = () => {
        setShowRenewModal(false);
        setCertificationToRenew(null);
    };

    const handleDeleteStaff = async () => {
        if (!session || !staffMember) {
            showToast('No active session.', 'error');
            return;
        }
        
        // Log staff deletion before actually deleting
        await logStaffDeleted(staffMember.id, {
            staff_name: staffMember.full_name,
            certifications_count: staffCertCount
        });

        const { error } = await supabase
            .from('staff')
            .delete()
            .eq('id', staffMember.id);
            
        if(error) {
            showToast(error.message, 'error');
        } else {
            showToast('Staff member deleted.', 'success');
            navigate('/staff'); // Navigate back to staff list after successful deletion
        }
    };

    if (loading) {
        return <Spinner />;
    }

    if (!staffMember) {
        return (
            <div className="p-6 text-center">
                <p className="text-slate-600">Staff member not found.</p>
                <button
                    onClick={() => navigate('/staff')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    Back to Staff List
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <button
                        onClick={() => navigate('/staff')}
                        className="flex items-center text-slate-600 hover:text-slate-900 mr-4"
                    >
                        <ArrowLeft className="w-5 h-5 mr-1" />
                        Back to Staff
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{staffMember.full_name}</h1>
                        <p className="text-slate-600">{staffMember.job_title || 'No job title'}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => setShowDeleteStaffDialog(true)}
                        className="flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Staff
                    </button>
                    <button
                        onClick={canAssign ? (() => setShowAssignDialog(true)) : handleShowUpgradePrompt}
                        className={`flex items-center px-4 py-2 rounded-lg transition-colors ${getButtonClass()}`}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        {getButtonText('Assign Certificate')}
                    </button>
                </div>
            </div>

            <div id="staff-certifications-container" className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-900">Certifications</h2>
                </div>
                {loading ? <Spinner /> : (
                    certifications.length === 0 ? (
                        <p className="p-6 text-center text-slate-500">
                            {canAssign 
                                ? "No certifications assigned yet. Click 'Assign Certification' to begin."
                                : "No certifications found. Upgrade your plan to assign and manage certifications."
                            }
                        </p>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-xs text-slate-600 uppercase font-medium">
                                <tr>
                                    <th className="p-4">Certification</th>
                                    <th className="p-4">Issue Date</th>
                                    <th className="p-4">Expiry Date</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Document</th>
                                    <th className="p-4"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {certifications.map(cert => (
                                    <tr key={cert.id} 
                                        className="border-t border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                                        onClick={() => handleCertificationClick(cert)}
                                        title="Click to view/edit details"
                                    >
                                        <td className="p-4 font-medium text-slate-900 hover:text-emerald-600">
                                            {cert.template_name}
                                        </td>
                                        <td className="p-4 text-slate-700">{cert.issue_date}</td>
                                        <td className="p-4 text-slate-700">{cert.expiry_date}</td>
                                        <td className="p-4"><StatusBadge status={cert.status} /></td>
                                        <td className="p-4">
                                            {cert.document_url ? (
                                                <a href={cert.document_url} target="_blank" rel="noopener noreferrer" 
                                                   className="text-emerald-600 hover:text-emerald-700 flex items-center"
                                                   onClick={(e) => e.stopPropagation()}
                                                >
                                                    <FileText className="h-4 w-4 mr-1" />
                                                    View
                                                </a>
                                            ) : (
                                                <span className="text-slate-500">No document</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-2">
                                                {/* Renew button - only show for Expiring Soon or Expired certifications */}
                                                {(cert.status === 'Expiring Soon' || cert.status === 'Expired') && (
                                                    <button 
                                                        onClick={() => handleRestrictedAction(
                                                            () => handleRenewCertification(cert),
                                                            handleShowUpgradePrompt
                                                        )}
                                                        disabled={!canDelete}
                                                        className={`${canDelete ? 'text-emerald-600 hover:text-emerald-700' : 'text-gray-400 cursor-not-allowed'}`}
                                                        title={canDelete ? 'Renew certification' : 'Upgrade to renew certifications'}
                                                    >
                                                        <RotateCcw className="h-4 w-4" />
                                                    </button>
                                                )}
                                                {/* Delete button */}
                                                <button 
                                                    onClick={() => confirmDeleteCertification(cert)} 
                                                    disabled={!canDelete}
                                                    className={`${canDelete ? 'text-red-600 hover:text-red-700' : 'text-gray-400 cursor-not-allowed'}`}
                                                    title={canDelete ? 'Remove certification' : 'Upgrade to remove certifications'}
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )
                )}
            </div>
            
            {showAssignDialog && canAssign && (
                <Dialog 
                    id="assign-certification-dialog" 
                    title="Assign Certification" 
                    onClose={() => {
                        setShowAssignDialog(false);
                        setIssueDate('');
                        setExpiryDate('');
                        setSelectedTemplateId('');
                    }}
                >
                    <form id="assign-certification-form" onSubmit={handleAssignCertification} className="space-y-4">
                        <div>
                            <label htmlFor="template_id" className="block text-sm font-medium text-slate-700 mb-2">Certificate Type</label>
                            <select 
                                id="template_id" 
                                name="template_id" 
                                value={selectedTemplateId}
                                onChange={handleTemplateChange}
                                required 
                                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                            >
                                <option value="">Select a certificate type...</option>
                                {templates.map(template => (
                                    <option key={template.id} value={template.id}>{template.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="issue_date" className="block text-sm font-medium text-slate-700 mb-2">Issue Date</label>
                            <input 
                                id="issue_date" 
                                name="issue_date" 
                                type="date" 
                                value={issueDate}
                                onChange={handleIssueDateChange}
                                required 
                                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" 
                            />
                        </div>
                        <div>
                            <label htmlFor="expiry_date" className="block text-sm font-medium text-slate-700 mb-2">Expiry Date</label>
                            <input 
                                id="expiry_date" 
                                name="expiry_date" 
                                type="date" 
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                                required 
                                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" 
                            />
                        </div>
                        <div>
                            <label htmlFor="document" className="block text-sm font-medium text-slate-700 mb-2">Document (Optional)</label>
                            <input id="document" name="document" type="file" accept=".pdf,.jpg,.jpeg,.png" className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition-colors" />
                        </div>
                        <div>
                            <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-2">Notes (Optional)</label>
                            <textarea id="notes" name="notes" rows="3" placeholder="Add any additional notes..." className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" />
                        </div>
                        <div className="flex justify-end pt-4 gap-3">
                            <button 
                                type="button" 
                                onClick={() => {
                                    setShowAssignDialog(false);
                                    setIssueDate('');
                                    setExpiryDate('');
                                    setSelectedTemplateId('');
                                }} 
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-semibold py-2.5 px-4 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button type="submit" form="assign-certification-form" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm">Assign Certification</button>
                        </div>
                    </form>
                </Dialog>
            )}
            
            {showDeleteDialog && certificationToDelete && canDelete && (
                <Dialog id="delete-certification-dialog" title="Confirm Removal" onClose={() => setShowDeleteDialog(false)}>
                    <div className="space-y-4">
                        <p className="text-slate-600">
                            Are you sure you want to remove the <span className="font-semibold text-slate-900">"{certificationToDelete.template_name}"</span> certification from {staffMember.full_name}?
                        </p>
                        <p className="text-red-600 text-sm">
                            This action cannot be undone.
                        </p>
                        <div className="flex justify-end pt-4 gap-3">
                            <button 
                                onClick={() => setShowDeleteDialog(false)} 
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-semibold py-2.5 px-4 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDeleteCertification} 
                                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm"
                            >
                                Remove Certification
                            </button>
                        </div>
                    </div>
                </Dialog>
            )}

            {showUpgradeModal && (
                <Dialog id="upgrade-prompt-dialog" title="Upgrade Required" onClose={() => setShowUpgradeModal(false)}>
                    <div className="space-y-4">
                        <p className="text-slate-600">
                            Your trial has expired. Upgrade your plan to assign and manage certifications.
                        </p>
                        <div className="flex justify-end pt-4 gap-3">
                            <button 
                                onClick={() => setShowUpgradeModal(false)} 
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-semibold py-2.5 px-4 rounded-lg transition-colors"
                            >
                                Close
                            </button>
                            <button 
                                onClick={() => {
                                    setShowUpgradeModal(false);
                                    navigate('/subscription');
                                }} 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm"
                            >
                                Upgrade Now
                            </button>
                        </div>
                    </div>
                </Dialog>
            )}

            {/* Delete Staff Confirmation Dialog */}
            {showDeleteStaffDialog && (
                <Dialog
                    id="delete-staff-dialog"
                    title="Confirm Staff Deletion"
                    onClose={() => setShowDeleteStaffDialog(false)}
                >
                    <div className="space-y-4">
                        <p className="text-slate-600">
                            Are you sure you want to permanently delete <span className="font-semibold text-slate-900">{staffMember.full_name}</span>?
                        </p>
                        {staffCertCount > 0 && (
                            <p className="text-red-600 font-medium">
                                This will also permanently delete {staffCertCount} associated certifications and their audit records.
                            </p>
                        )}
                        <p className="text-red-600 text-sm font-semibold">
                            This action cannot be undone.
                        </p>
                        <div className="flex justify-end pt-4 gap-3">
                            <button 
                                onClick={() => setShowDeleteStaffDialog(false)} 
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-semibold py-2.5 px-4 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDeleteStaff} 
                                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm"
                            >
                                Delete Staff Member
                            </button>
                        </div>
                    </div>
                </Dialog>
            )}
            
            <CertificationModal
                isOpen={showCertModal}
                onClose={handleCloseModal}
                certification={selectedCertification}
                auditTrail={auditTrail}
                onSave={canDelete ? handleSaveCertification : undefined} // Only allow editing if user can delete
                isReadOnly={!canDelete} // Make read-only for expired trials
                canRenew={canDelete} // Use same permission as delete for renewal
                onRenew={handleRenewCertification}
            />

            {/* Renewal Modal */}
            {showRenewModal && certificationToRenew && (
                <RenewCertificationModal
                    isOpen={showRenewModal}
                    onClose={handleCloseRenewalModal}
                    certificationId={certificationToRenew.id}
                    currentIssueDate={certificationToRenew.issue_date}
                    currentExpiryDate={certificationToRenew.expiry_date}
                    templateName={certificationToRenew.template_name}
                    staffName={staffMember.full_name}
                    templateValidityPeriodMonths={
                        certificationToRenew.validity_period_months || 
                        templates.find(t => t.id === certificationToRenew.template_id)?.validity_period_months || 
                        12
                    }
                    onRenewalSuccess={handleRenewalSuccess}
                />
            )}
        </div>
    );
}
