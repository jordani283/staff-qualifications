import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';
import { Spinner, showToast } from '../components/ui';
import { useFeatureAccess } from '../hooks/useFeatureAccess.js';
import GapAnalysisTable from '../components/GapAnalysisTable.jsx';
import { ChevronDown, Users, FileSpreadsheet, Check } from 'lucide-react';
import Dialog from '../components/Dialog';
import { logCertificationCreated, logDocumentUploaded, logCertificationComment } from '../utils/auditLogger.js';

export default function GapAnalysisPage({ user, session, onOpenExpiredModal, setPage }) {
    const [rawData, setRawData] = useState([]);
    const [staffData, setStaffData] = useState([]);
    const [templateData, setTemplateData] = useState([]);
    const [certificationMatrix, setCertificationMatrix] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedStaffIds, setSelectedStaffIds] = useState([]);
    const [selectedTemplateIds, setSelectedTemplateIds] = useState([]);
    const [showStaffDropdown, setShowStaffDropdown] = useState(false);
    const [showCertDropdown, setShowCertDropdown] = useState(false);
    const [showAssignDialog, setShowAssignDialog] = useState(false);
    const [assignTarget, setAssignTarget] = useState({ staff: null, template: null });
    const [assignIssueDate, setAssignIssueDate] = useState('');
    const [assignExpiryDate, setAssignExpiryDate] = useState('');
    const [assignNotes, setAssignNotes] = useState('');
    const [assignFile, setAssignFile] = useState(null);
    const [assignSubmitting, setAssignSubmitting] = useState(false);

    // Get feature access permissions (Gap Analysis is available to all users)
    const { canCreate, getButtonText, getButtonClass, handleRestrictedAction } = useFeatureAccess(session);

    const fetchGapAnalysisData = useCallback(async () => {
        if (!session) {
            setLoading(false);
            return;
        }
        
        setLoading(true);
        
        try {
            const { data, error } = await supabase
                .from('v_certifications_with_status')
                .select('staff_id, staff_name, template_id, template_name, status, expiry_date');

            if (error) {
                console.error("Error fetching gap analysis data:", error);
                showToast("Error loading gap analysis data.", "error");
                setLoading(false);
                return;
            }

            console.log('Raw gap analysis data:', data);
            setRawData(data || []);
            processGapAnalysisData(data || []);
            
        } catch (error) {
            console.error("Unexpected error fetching gap analysis data:", error);
            showToast("Unexpected error loading data.", "error");
        } finally {
            setLoading(false);
        }
    }, [session]);

    const processGapAnalysisData = useCallback((data) => {
        // Extract unique staff members
        const uniqueStaff = [];
        const staffMap = new Map();
        
        data.forEach(item => {
            if (!staffMap.has(item.staff_id)) {
                staffMap.set(item.staff_id, {
                    id: item.staff_id,
                    full_name: item.staff_name
                });
                uniqueStaff.push({
                    id: item.staff_id,
                    full_name: item.staff_name
                });
            }
        });

        // Extract unique certificate templates
        const uniqueTemplates = [];
        const templateMap = new Map();
        
        data.forEach(item => {
            if (!templateMap.has(item.template_id)) {
                templateMap.set(item.template_id, {
                    id: item.template_id,
                    name: item.template_name
                });
                uniqueTemplates.push({
                    id: item.template_id,
                    name: item.template_name
                });
            }
        });

        // Build certification matrix
        const matrix = {};
        
        // Initialize matrix with all staff having all templates as 'missing'
        uniqueStaff.forEach(staff => {
            matrix[staff.id] = {};
            uniqueTemplates.forEach(template => {
                matrix[staff.id][template.id] = 'missing';
            });
        });

        // Fill in actual certification statuses
        data.forEach(item => {
            const status = mapCertificationStatus(item.status);
            matrix[item.staff_id][item.template_id] = status;
        });

        console.log('Processed data:', {
            staff: uniqueStaff,
            templates: uniqueTemplates,
            matrix: matrix
        });

        setStaffData(uniqueStaff);
        setTemplateData(uniqueTemplates);
        setCertificationMatrix(matrix);
        
        // Select all staff and templates by default
        setSelectedStaffIds(uniqueStaff.map(staff => staff.id));
        setSelectedTemplateIds(uniqueTemplates.map(template => template.id));
    }, []);

    const mapCertificationStatus = (status) => {
        switch (status) {
            case 'Up-to-Date':
            case 'Expiring Soon':
                return 'active';
            case 'Expired':
                return 'expired';
            default:
                return 'missing';
        }
    };

    // Assign dialog helpers
    const openAssignFromCell = (staff, template) => {
        handleRestrictedAction(() => {
            setAssignTarget({ staff, template });
            const today = new Date().toISOString().split('T')[0];
            setAssignIssueDate(today);
            setAssignExpiryDate('');
            setAssignNotes('');
            setAssignFile(null);
            setShowAssignDialog(true);
        }, () => {
            // If restricted, do nothing here. Gap page doesn't have its own upgrade modal.
        });
    };

    const calculateExpiryForTemplate = async (templateId, issueDate) => {
        if (!templateId || !issueDate) return '';
        try {
            const { data: template, error } = await supabase
                .from('certification_templates')
                .select('validity_period_months')
                .eq('id', templateId)
                .single();
            if (error || !template) return '';
            const d = new Date(issueDate + 'T00:00:00');
            d.setMonth(d.getMonth() + parseInt(template.validity_period_months || 0));
            return d.toISOString().split('T')[0];
        } catch (e) {
            return '';
        }
    };

    const handleAssignIssueDateChange = async (newDate) => {
        setAssignIssueDate(newDate);
        if (assignTarget.template?.id) {
            const exp = await calculateExpiryForTemplate(assignTarget.template.id, newDate);
            setAssignExpiryDate(exp);
        }
    };

    const handleSubmitAssign = async (e) => {
        e.preventDefault();
        if (!session || !assignTarget.staff?.id || !assignTarget.template?.id) return;
        setAssignSubmitting(true);
        try {
            let documentUrl = null;
            if (assignFile) {
                const fileExt = assignFile.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const filePath = `${session.user.id}/${assignTarget.staff.id}/${fileName}`;
                const { error: uploadError } = await supabase.storage
                    .from('certificates')
                    .upload(filePath, assignFile);
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage
                    .from('certificates')
                    .getPublicUrl(filePath);
                documentUrl = publicUrl;
            }

            const { data: insertedCert, error } = await supabase
                .from('staff_certifications')
                .insert({
                    user_id: session.user.id,
                    staff_id: assignTarget.staff.id,
                    template_id: assignTarget.template.id,
                    issue_date: assignIssueDate,
                    expiry_date: assignExpiryDate,
                    document_url: documentUrl,
                    notes: assignNotes || null,
                })
                .select()
                .single();
            if (error) throw error;
            // Audit logs similar to StaffDetailPage
            await logCertificationCreated(insertedCert.id, {
                template_name: assignTarget.template.name
            });
            if (documentUrl && assignFile) {
                await logDocumentUploaded(insertedCert.id, assignFile.name);
            }
            if (assignNotes && assignNotes.trim()) {
                await logCertificationComment(insertedCert.id, `Initial note: ${assignNotes.trim()}`);
            }
            showToast('Certification assigned!', 'success');
            setShowAssignDialog(false);
            // refresh data
            fetchGapAnalysisData();
        } catch (err) {
            console.error(err);
            showToast('Failed to assign certification', 'error');
        } finally {
            setAssignSubmitting(false);
        }
    };

    // Pre-populate expiry when dialog opens
    useEffect(() => {
        if (showAssignDialog && assignTarget.template?.id && assignIssueDate) {
            (async () => {
                const exp = await calculateExpiryForTemplate(assignTarget.template.id, assignIssueDate);
                if (exp) setAssignExpiryDate(exp);
            })();
        }
    }, [showAssignDialog, assignTarget.template, assignIssueDate]);

    // Apply filters to data - use selected arrays instead of search strings
    const filteredStaffData = staffData.filter(staff => 
        selectedStaffIds.includes(staff.id)
    );

    const filteredTemplateData = templateData.filter(template => 
        selectedTemplateIds.includes(template.id)
    );

    // Create filtered matrix based on current selections
    const filteredMatrix = {};
    filteredStaffData.forEach(staff => {
        filteredMatrix[staff.id] = {};
        filteredTemplateData.forEach(template => {
            filteredMatrix[staff.id][template.id] = certificationMatrix[staff.id]?.[template.id] || 'missing';
        });
    });

    // Handler functions for the dropdown filters
    const toggleStaffSelection = (staffId) => {
        setSelectedStaffIds(prev => 
            prev.includes(staffId) 
                ? prev.filter(id => id !== staffId)
                : [...prev, staffId]
        );
    };

    const toggleTemplateSelection = (templateId) => {
        setSelectedTemplateIds(prev => 
            prev.includes(templateId) 
                ? prev.filter(id => id !== templateId)
                : [...prev, templateId]
        );
    };

    const selectAllStaff = () => {
        setSelectedStaffIds(staffData.map(staff => staff.id));
    };

    const deselectAllStaff = () => {
        setSelectedStaffIds([]);
    };

    const selectAllTemplates = () => {
        setSelectedTemplateIds(templateData.map(template => template.id));
    };

    const deselectAllTemplates = () => {
        setSelectedTemplateIds([]);
    };

    useEffect(() => {
        fetchGapAnalysisData();
    }, [fetchGapAnalysisData]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Check if click is outside both dropdown containers
            const staffDropdown = event.target.closest('[data-dropdown="staff"]');
            const certDropdown = event.target.closest('[data-dropdown="cert"]');
            
            if (!staffDropdown) {
                setShowStaffDropdown(false);
            }
            if (!certDropdown) {
                setShowCertDropdown(false);
            }
        };

        if (showStaffDropdown || showCertDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [showStaffDropdown, showCertDropdown]);

    if (loading) {
        return <Spinner />;
    }

    // Check for empty states
    if (rawData.length === 0) {
        // Check if it's because there's no staff or no templates
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Gap Analysis</h1>
                    <p className="text-slate-600">Track certification compliance across your team at a glance.</p>
                </div>
                
                <div className="bg-white rounded-xl border border-slate-200 p-12 shadow-sm">
                    <div className="text-center space-y-4">
                        <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                            <FileSpreadsheet className="w-8 h-8 text-slate-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Data Available</h3>
                            <p className="text-slate-600 max-w-md mx-auto">
                                To view gap analysis, you need both staff members and certificate templates. 
                                Add staff and create certificate templates to get started.
                            </p>
                        </div>
                        <div className="flex justify-center space-x-4 pt-4">
                            <button
                                onClick={() => setPage('staff')}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                            >
                                Manage Staff
                            </button>
                            <button
                                onClick={() => setPage('certificates')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                            >
                                Manage Certificates
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (staffData.length === 0) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Gap Analysis</h1>
                    <p className="text-slate-600">Track certification compliance across your team at a glance.</p>
                </div>
                
                <div className="bg-white rounded-xl border border-slate-200 p-12 shadow-sm">
                    <div className="text-center space-y-4">
                        <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                            <Users className="w-8 h-8 text-slate-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Staff Members Found</h3>
                            <p className="text-slate-600">
                                Add staff members to see their certification status in the gap analysis.
                            </p>
                        </div>
                        <button
                            onClick={() => setPage('staff')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                        >
                            Add Staff Members
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (templateData.length === 0) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Gap Analysis</h1>
                    <p className="text-slate-600">Track certification compliance across your team at a glance.</p>
                </div>
                
                <div className="bg-white rounded-xl border border-slate-200 p-12 shadow-sm">
                    <div className="text-center space-y-4">
                        <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                            <FileSpreadsheet className="w-8 h-8 text-slate-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Certificate Templates Created</h3>
                            <p className="text-slate-600">
                                Create certificate templates to track compliance in the gap analysis.
                            </p>
                        </div>
                        <button
                            onClick={() => setPage('certificates')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                        >
                            Create Certificate Templates
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Gap Analysis</h1>
                <p className="text-slate-600">Track certification compliance across your team at a glance.</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Staff Selection Dropdown */}
                    <div className="relative" data-dropdown="staff">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Staff Members ({selectedStaffIds.length} of {staffData.length} selected)
                        </label>
                        <button
                            onClick={() => {
                                setShowStaffDropdown(!showStaffDropdown);
                                setShowCertDropdown(false); // Close the other dropdown
                            }}
                            className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm transition-colors"
                        >
                            <span>
                                {selectedStaffIds.length === staffData.length 
                                    ? 'All Staff Selected' 
                                    : selectedStaffIds.length === 0 
                                    ? 'No Staff Selected'
                                    : `${selectedStaffIds.length} Staff Selected`
                                }
                            </span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${showStaffDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {showStaffDropdown && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                                {/* Select All / Deselect All */}
                                <div className="p-2 border-b border-slate-200">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={selectAllStaff}
                                            className="text-xs px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
                                        >
                                            Select All
                                        </button>
                                        <button
                                            onClick={deselectAllStaff}
                                            className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded transition-colors"
                                        >
                                            Deselect All
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Staff List */}
                                {staffData.map(staff => (
                                    <div
                                        key={staff.id}
                                        onClick={() => toggleStaffSelection(staff.id)}
                                        className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm"
                                    >
                                        <div className="flex items-center justify-center w-4 h-4 mr-3 border border-slate-400 rounded">
                                            {selectedStaffIds.includes(staff.id) && (
                                                <Check className="w-3 h-3 text-emerald-600" />
                                            )}
                                        </div>
                                        <span className="text-slate-900">{staff.full_name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {/* Certificate Selection Dropdown */}
                    <div className="relative" data-dropdown="cert">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Certificates ({selectedTemplateIds.length} of {templateData.length} selected)
                        </label>
                        <button
                            onClick={() => {
                                setShowCertDropdown(!showCertDropdown);
                                setShowStaffDropdown(false); // Close the other dropdown
                            }}
                            className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm transition-colors"
                        >
                            <span>
                                {selectedTemplateIds.length === templateData.length 
                                    ? 'All Certificates Selected' 
                                    : selectedTemplateIds.length === 0 
                                    ? 'No Certificates Selected'
                                    : `${selectedTemplateIds.length} Certificates Selected`
                                }
                            </span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${showCertDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {showCertDropdown && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                                {/* Select All / Deselect All */}
                                <div className="p-2 border-b border-slate-200">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={selectAllTemplates}
                                            className="text-xs px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
                                        >
                                            Select All
                                        </button>
                                        <button
                                            onClick={deselectAllTemplates}
                                            className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded transition-colors"
                                        >
                                            Deselect All
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Certificate List */}
                                {templateData.map(template => (
                                    <div
                                        key={template.id}
                                        onClick={() => toggleTemplateSelection(template.id)}
                                        className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm"
                                    >
                                        <div className="flex items-center justify-center w-4 h-4 mr-3 border border-slate-400 rounded">
                                            {selectedTemplateIds.includes(template.id) && (
                                                <Check className="w-3 h-3 text-emerald-600" />
                                            )}
                                        </div>
                                        <span className="text-slate-900">{template.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Summary and Clear Actions */}
                <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                        Showing {filteredStaffData.length} staff × {filteredTemplateData.length} certificates
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                selectAllStaff();
                                selectAllTemplates();
                            }}
                            className="text-sm text-emerald-600 hover:text-emerald-700 transition-colors font-semibold"
                        >
                            Select All
                        </button>
                        <button
                            onClick={() => {
                                deselectAllStaff();
                                deselectAllTemplates();
                            }}
                            className="text-sm text-red-600 hover:text-red-700 transition-colors font-semibold"
                        >
                            Clear All
                        </button>
                    </div>
                </div>
            </div>

            {/* Gap Analysis Table */}
            {filteredStaffData.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
                    <div className="text-center text-slate-500">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No staff members selected. Use the dropdown above to select staff members.</p>
                    </div>
                </div>
            ) : filteredTemplateData.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
                    <div className="text-center text-slate-500">
                        <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No certificates selected. Use the dropdown above to select certificates.</p>
                    </div>
                </div>
            ) : (
                <GapAnalysisTable
                    staffData={filteredStaffData}
                    templateData={filteredTemplateData}
                    certificationMatrix={filteredMatrix}
                    canAssign={canCreate}
                    onAssignMissing={(staff, template) => openAssignFromCell(staff, template)}
                />
            )}

            {/* Legend */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <h3 className="text-sm font-medium text-slate-700 mb-3">Legend</h3>
                <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded bg-emerald-100 border border-emerald-300"></div>
                        <span className="text-emerald-600">Active / Valid</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded bg-red-100 border border-red-300"></div>
                        <span className="text-red-600">Expired</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded bg-slate-100 border border-slate-300"></div>
                        <span className="text-slate-600">Not Assigned</span>
                    </div>
                </div>
            </div>
        </div>
        {showAssignDialog && assignTarget.staff && assignTarget.template && (
            <Dialog id="gap-assign-cert" title={`Assign ${assignTarget.template.name} to ${assignTarget.staff.full_name}`} onClose={() => setShowAssignDialog(false)}>
                <form onSubmit={handleSubmitAssign} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Issue Date</label>
                        <input
                            type="date"
                            value={assignIssueDate}
                            onChange={(e) => handleAssignIssueDateChange(e.target.value)}
                            required
                            className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Expiry Date</label>
                        <input
                            type="date"
                            value={assignExpiryDate}
                            onChange={(e) => setAssignExpiryDate(e.target.value)}
                            required
                            className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Upload Document (Optional)</label>
                        <input
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={(e) => setAssignFile(e.target.files?.[0] || null)}
                            className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Notes (Optional)</label>
                        <textarea
                            rows="3"
                            value={assignNotes}
                            onChange={(e) => setAssignNotes(e.target.value)}
                            placeholder="Add any notes about this certification..."
                            className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none"
                        />
                    </div>
                    <div className="flex justify-end pt-4 gap-3">
                        <button type="button" onClick={() => setShowAssignDialog(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-semibold py-2.5 px-4 rounded-lg transition-colors">Cancel</button>
                        <button type="submit" disabled={assignSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm disabled:opacity-50">{assignSubmitting ? 'Assigning...' : 'Assign Certification'}</button>
                    </div>
                </form>
            </Dialog>
        )}
        </>
    );
} 