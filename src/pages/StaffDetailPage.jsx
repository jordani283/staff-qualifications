import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';
import { Spinner, StatusBadge, showToast } from '../components/ui';
import Dialog from '../components/Dialog';
import CertificationModal from '../components/CertificationModal';
import { Plus, ArrowLeft, Trash2 } from 'lucide-react';

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

            const { error } = await supabase.from('staff_certifications').insert(newCert);
            if (error) throw error;

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
                    <label htmlFor="template_select" className="block text-sm font-medium text-slate-300 mb-1">Certification Type</label>
                    <select id="template_select" name="template_id" required onChange={handleTemplateChange} className="w-full bg-slate-700 border-slate-600 rounded-md p-2 text-white focus:ring-2 focus:ring-sky-500">
                        <option value="">Loading templates...</option>
                        {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="issue_date" className="block text-sm font-medium text-slate-300 mb-1">Issue Date</label>
                    <input id="issue_date" name="issue_date" type="date" required onChange={handleIssueDateChange} value={issueDate} className="w-full bg-slate-700 border-slate-600 rounded-md p-2 text-white focus:ring-2 focus:ring-sky-500" />
                </div>
                 <div>
                    <label htmlFor="expiry_date" className="block text-sm font-medium text-slate-300 mb-1">Expiry Date</label>
                    <input id="expiry_date" name="expiry_date" type="date" required className="w-full bg-slate-700 border-slate-600 rounded-md p-2 text-white focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                    <label htmlFor="document_upload" className="block text-sm font-medium text-slate-300 mb-1">Upload Document (Optional)</label>
                    <input id="document_upload" name="document" type="file" className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-slate-600 file:text-sky-300 hover:file:bg-slate-500 transition-colors" />
                </div>
                <div className="flex justify-end pt-4 gap-3">
                    <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
                    <button type="submit" disabled={isSubmitting} form="assign-cert-form" className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50">
                        {isSubmitting ? 'Assigning...' : 'Assign Certification'}
                    </button>
                </div>
            </form>
        </Dialog>
    );
}

export default function StaffDetailPage({ staffMember, setPage, user }) {
    const [certs, setCerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [selectedCertification, setSelectedCertification] = useState(null);
    const [showCertModal, setShowCertModal] = useState(false);
    const [auditTrail, setAuditTrail] = useState([]);

    const fetchStaffCertifications = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('v_certifications_with_status').select('*').eq('staff_id', staffMember.id);
        if (error) {
            showToast("Error fetching certifications.", "error");
        } else {
            setCerts(data);
        }
        setLoading(false);
    }, [staffMember.id]);

    useEffect(() => {
        fetchStaffCertifications();
    }, [fetchStaffCertifications]);
    
    const handleDeleteCert = async (id) => {
        if(confirm('Are you sure you want to delete this certification?')) {
            const { error } = await supabase.from('staff_certifications').delete().eq('id', id);
            if(error) {
                showToast(error.message, 'error');
            } else {
                showToast('Certification deleted.', 'success');
                fetchStaffCertifications();
            }
        }
    };

    const fetchAuditTrail = async (certificationId) => {
        // For demo purposes, create some sample audit trail data
        // In a real app, this would fetch from an audit_trail table
        const sampleAuditTrail = [
            {
                id: 1,
                action: 'Certificate uploaded',
                created_at: '2024-01-15T10:30:00Z',
                performed_by: 'John Admin'
            },
            {
                id: 2,
                action: 'Expiry date updated',
                created_at: '2024-01-20T14:15:00Z',
                performed_by: 'Sarah Manager'
            },
            {
                id: 3,
                action: 'Reminder sent',
                created_at: '2024-02-01T09:00:00Z',
                performed_by: 'System'
            }
        ];
        
        setAuditTrail(sampleAuditTrail);
        
        // TODO: Replace with actual database query
        // const { data, error } = await supabase
        //     .from('audit_trail')
        //     .select('*')
        //     .eq('certification_id', certificationId)
        //     .order('created_at', { ascending: false });
        // if (!error) setAuditTrail(data || []);
    };

    const handleCertificationClick = async (cert) => {
        setSelectedCertification({
            id: cert.id,
            certification_name: cert.template_name,
            issue_date: cert.issue_date,
            expiry_date: cert.expiry_date,
            status: cert.status,
            document_filename: cert.document_url ? cert.document_url.split('/').pop() : null
        });
        await fetchAuditTrail(cert.id);
        setShowCertModal(true);
    };

    const handleCloseModal = () => {
        setShowCertModal(false);
        setSelectedCertification(null);
        setAuditTrail([]);
    };
    
    return (
        <>
            <div className="mb-8">
                <a href="#" className="flex items-center text-sky-400 hover:text-sky-300 mb-4" onClick={() => setPage('staff')}>
                   <ArrowLeft className="mr-2 h-4 w-4" /> Back to Staff List
                </a>
                <h1 className="text-3xl font-bold text-white">{staffMember.full_name}</h1>
                <p className="text-slate-400">{staffMember.job_title || 'No title'} - {staffMember.email || 'No email'}</p>
            </div>
            <div className="flex justify-between items-center mb-4">
                 <h2 className="text-2xl font-bold text-white">Certifications</h2>
                 <button onClick={() => setShowDialog(true)} className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-md transition-colors flex items-center">
                   <Plus className="mr-2 h-4 w-4" /> Assign Certification
                </button>
            </div>
            <div id="staff-certs-table-container" className="bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700">
                {loading ? <Spinner /> : (
                    certs.length === 0 ? (
                        <p className="p-6 text-center text-slate-400">No certifications assigned yet.</p>
                    ) : (
                        <table className="w-full text-left">
                             <thead className="bg-slate-800 text-xs text-slate-400 uppercase">
                                <tr>
                                    <th className="p-4">Certification</th><th className="p-4">Issue Date</th><th className="p-4">Expiry Date</th><th className="p-4">Status</th><th className="p-4">Document</th><th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {certs.map(cert => (
                                     <tr key={cert.id} className="border-t border-slate-700 hover:bg-slate-700/30 cursor-pointer transition-colors">
                                        <td className="p-4 font-medium text-white" onClick={() => handleCertificationClick(cert)}>{cert.template_name}</td>
                                        <td className="p-4 text-slate-300" onClick={() => handleCertificationClick(cert)}>{cert.issue_date}</td>
                                        <td className="p-4 text-slate-300" onClick={() => handleCertificationClick(cert)}>{cert.expiry_date}</td>
                                        <td className="p-4" onClick={() => handleCertificationClick(cert)}><StatusBadge status={cert.status} /></td>
                                        <td className="p-4" onClick={() => handleCertificationClick(cert)}>{cert.document_url ? <span className="text-sky-400">View Document</span> : '-'}</td>
                                        <td className="p-4 text-right">
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteCert(cert.id); }} className="text-red-400 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )
                )}
            </div>
            {showDialog && (
                <AssignCertDialog 
                    staffId={staffMember.id}
                    userId={user.id}
                    onClose={() => setShowDialog(false)} 
                    onSuccess={() => {
                        setShowDialog(false);
                        fetchStaffCertifications();
                    }}
                />
            )}
            
            <CertificationModal
                isOpen={showCertModal}
                onClose={handleCloseModal}
                certification={selectedCertification}
                auditTrail={auditTrail}
            />
        </>
    );
}
