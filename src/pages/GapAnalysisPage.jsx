import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';
import { Spinner, showToast } from '../components/ui';
import { useFeatureAccess } from '../hooks/useFeatureAccess.js';
import GapAnalysisTable from '../components/GapAnalysisTable.jsx';
import { ChevronDown, Users, FileSpreadsheet, Check } from 'lucide-react';

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
                    <h1 className="text-3xl font-bold text-white">Gap Analysis</h1>
                    <p className="text-slate-400">Track certification compliance across your team at a glance.</p>
                </div>
                
                <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-12">
                    <div className="text-center space-y-4">
                        <div className="mx-auto w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center">
                            <FileSpreadsheet className="w-8 h-8 text-slate-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-2">No Data Available</h3>
                            <p className="text-slate-400 max-w-md mx-auto">
                                To view gap analysis, you need both staff members and certificate templates. 
                                Add staff and create certificate templates to get started.
                            </p>
                        </div>
                        <div className="flex justify-center space-x-4 pt-4">
                            <button
                                onClick={() => setPage('staff')}
                                className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                            >
                                Manage Staff
                            </button>
                            <button
                                onClick={() => setPage('certificates')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
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
                    <h1 className="text-3xl font-bold text-white">Gap Analysis</h1>
                    <p className="text-slate-400">Track certification compliance across your team at a glance.</p>
                </div>
                
                <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-12">
                    <div className="text-center space-y-4">
                        <div className="mx-auto w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center">
                            <Users className="w-8 h-8 text-slate-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-2">No Staff Members Found</h3>
                            <p className="text-slate-400">
                                Add staff members to see their certification status in the gap analysis.
                            </p>
                        </div>
                        <button
                            onClick={() => setPage('staff')}
                            className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
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
                    <h1 className="text-3xl font-bold text-white">Gap Analysis</h1>
                    <p className="text-slate-400">Track certification compliance across your team at a glance.</p>
                </div>
                
                <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-12">
                    <div className="text-center space-y-4">
                        <div className="mx-auto w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center">
                            <FileSpreadsheet className="w-8 h-8 text-slate-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-2">No Certificate Templates Created</h3>
                            <p className="text-slate-400">
                                Create certificate templates to track compliance in the gap analysis.
                            </p>
                        </div>
                        <button
                            onClick={() => setPage('certificates')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                            Create Certificate Templates
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white">Gap Analysis</h1>
                <p className="text-slate-400">Track certification compliance across your team at a glance.</p>
            </div>

            {/* Filters */}
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Staff Selection Dropdown */}
                    <div className="relative" data-dropdown="staff">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Staff Members ({selectedStaffIds.length} of {staffData.length} selected)
                        </label>
                        <button
                            onClick={() => {
                                setShowStaffDropdown(!showStaffDropdown);
                                setShowCertDropdown(false); // Close the other dropdown
                            }}
                            className="w-full flex items-center justify-between px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
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
                            <div className="absolute z-50 w-full mt-1 bg-slate-700 border border-slate-600 rounded-md shadow-lg max-h-80 overflow-y-auto">
                                {/* Select All / Deselect All */}
                                <div className="p-2 border-b border-slate-600">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={selectAllStaff}
                                            className="text-xs px-2 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded transition-colors"
                                        >
                                            Select All
                                        </button>
                                        <button
                                            onClick={deselectAllStaff}
                                            className="text-xs px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded transition-colors"
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
                                        className="flex items-center px-3 py-2 hover:bg-slate-600 cursor-pointer text-sm"
                                    >
                                        <div className="flex items-center justify-center w-4 h-4 mr-3 border border-slate-500 rounded">
                                            {selectedStaffIds.includes(staff.id) && (
                                                <Check className="w-3 h-3 text-sky-400" />
                                            )}
                                        </div>
                                        <span className="text-white">{staff.full_name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {/* Certificate Selection Dropdown */}
                    <div className="relative" data-dropdown="cert">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Certificates ({selectedTemplateIds.length} of {templateData.length} selected)
                        </label>
                        <button
                            onClick={() => {
                                setShowCertDropdown(!showCertDropdown);
                                setShowStaffDropdown(false); // Close the other dropdown
                            }}
                            className="w-full flex items-center justify-between px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
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
                            <div className="absolute z-50 w-full mt-1 bg-slate-700 border border-slate-600 rounded-md shadow-lg max-h-80 overflow-y-auto">
                                {/* Select All / Deselect All */}
                                <div className="p-2 border-b border-slate-600">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={selectAllTemplates}
                                            className="text-xs px-2 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded transition-colors"
                                        >
                                            Select All
                                        </button>
                                        <button
                                            onClick={deselectAllTemplates}
                                            className="text-xs px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded transition-colors"
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
                                        className="flex items-center px-3 py-2 hover:bg-slate-600 cursor-pointer text-sm"
                                    >
                                        <div className="flex items-center justify-center w-4 h-4 mr-3 border border-slate-500 rounded">
                                            {selectedTemplateIds.includes(template.id) && (
                                                <Check className="w-3 h-3 text-sky-400" />
                                            )}
                                        </div>
                                        <span className="text-white">{template.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Summary and Clear Actions */}
                <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-slate-400">
                        Showing {filteredStaffData.length} staff × {filteredTemplateData.length} certificates
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                selectAllStaff();
                                selectAllTemplates();
                            }}
                            className="text-sm text-sky-400 hover:text-sky-300 transition-colors"
                        >
                            Select All
                        </button>
                        <button
                            onClick={() => {
                                deselectAllStaff();
                                deselectAllTemplates();
                            }}
                            className="text-sm text-red-400 hover:text-red-300 transition-colors"
                        >
                            Clear All
                        </button>
                    </div>
                </div>
            </div>

            {/* Gap Analysis Table */}
            {filteredStaffData.length === 0 ? (
                <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-8">
                    <div className="text-center text-slate-400">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No staff members selected. Use the dropdown above to select staff members.</p>
                    </div>
                </div>
            ) : filteredTemplateData.length === 0 ? (
                <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-8">
                    <div className="text-center text-slate-400">
                        <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No certificates selected. Use the dropdown above to select certificates.</p>
                    </div>
                </div>
            ) : (
                <GapAnalysisTable
                    staffData={filteredStaffData}
                    templateData={filteredTemplateData}
                    certificationMatrix={filteredMatrix}
                />
            )}

            {/* Legend */}
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
                <h3 className="text-sm font-medium text-slate-300 mb-3">Legend</h3>
                <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500/30"></div>
                        <span className="text-green-400">Active / Valid</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/30"></div>
                        <span className="text-red-400">Expired</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded bg-slate-700/50 border border-slate-600/30"></div>
                        <span className="text-slate-500">Not Assigned</span>
                    </div>
                </div>
            </div>
        </div>
    );
} 