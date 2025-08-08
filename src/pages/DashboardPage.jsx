import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';
import { CardSpinner, Spinner, StatusBadge, showToast } from '../components/ui';
import { Download, Plus, Users, FileSpreadsheet, RefreshCw, Search, X } from 'lucide-react';
import ExpiryChart from '../components/ExpiryChart';
import CertificationModal from '../components/CertificationModal';
import RenewCertificationModal from '../components/RenewCertificationModal';
import { fetchAuditTrail } from '../utils/auditLogger.js';
import { useFeatureAccess } from '../hooks/useFeatureAccess.js';

export default function DashboardPage({ profile, session, onOpenExpiredModal, setPage }) {
    const [metrics, setMetrics] = useState({ green: 0, amber: 0, red: 0 });
    const [certs, setCerts] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [allCerts, setAllCerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCertification, setSelectedCertification] = useState(null);
    const [showCertModal, setShowCertModal] = useState(false);
    const [auditTrail, setAuditTrail] = useState([]);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [certificationToRenew, setCertificationToRenew] = useState(null);
    const [showRenewModal, setShowRenewModal] = useState(false);
    const [tableFilter, setTableFilter] = useState(null);

    // Global search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchResults, setSearchResults] = useState({ staff: [], templates: [], certs: [] });

    // Get feature access permissions
    const { canCreate, canExport, getButtonText, getButtonClass, handleRestrictedAction } = useFeatureAccess(session);

    // Navigation functions for quick actions
    const handleAddStaff = () => {
        setPage('staff', { autoOpenDialog: true });
    };

    const handleAddCertificate = () => {
        setPage('certificates', { autoOpenDialog: true });
    };

    const handleImportData = () => {
        setPage('import');
    };

    // Debounced global search
    useEffect(() => {
        let isCancelled = false;
        const run = async () => {
            if (!session || !searchQuery || searchQuery.trim().length < 2) {
                if (!isCancelled) setSearchResults({ staff: [], templates: [], certs: [] });
                return;
            }
            setSearchLoading(true);
            try {
                const term = `%${searchQuery.trim()}%`;
                const [staffRes, templateRes, certsRes] = await Promise.all([
                    supabase
                        .from('staff')
                        .select('id, full_name, email, job_title')
                        .eq('user_id', session.user.id)
                        .ilike('full_name', term)
                        .limit(10),
                    supabase
                        .from('certification_templates')
                        .select('id, name, validity_period_months')
                        .ilike('name', term)
                        .limit(10),
                    supabase
                        .from('v_certifications_with_status')
                        .select('id, staff_id, staff_name, template_id, template_name, status, expiry_date, document_url, user_id')
                        .eq('user_id', session.user.id)
                        .or(`staff_name.ilike.${term},template_name.ilike.${term}`)
                        .order('staff_name', { ascending: true })
                        .order('template_name', { ascending: true })
                        .limit(20)
                ]);
                if (!isCancelled) {
                    setSearchResults({
                        staff: staffRes.data || [],
                        templates: templateRes.data || [],
                        certs: certsRes.data || []
                    });
                }
            } catch (e) {
                if (!isCancelled) setSearchResults({ staff: [], templates: [], certs: [] });
            } finally {
                if (!isCancelled) setSearchLoading(false);
            }
        };
        const t = setTimeout(run, 250);
        return () => {
            isCancelled = true;
            clearTimeout(t);
        };
    }, [searchQuery, session]);

    // Close search on outside click
    useEffect(() => {
        if (!searchOpen) return;
        const onDocClick = (e) => {
            if (!e.target.closest?.('#global-search-container')) {
                setSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [searchOpen]);

    const handleOpenStaffFromSearch = (staff) => {
        setSearchOpen(false);
        setSearchQuery('');
        setPage('staffDetail', { staffMember: staff });
    };

    const handleOpenTemplateFromSearch = (template) => {
        setSearchOpen(false);
        setSearchQuery('');
        setPage('certificates', { focusTemplateId: template.id });
    };

    const handleOpenCertificationFromSearch = (cert) => {
        setSearchOpen(false);
        setSearchQuery('');
        // Navigate to staff detail and open the certification modal
        setPage('staffDetail', { 
            staffMember: { id: cert.staff_id, full_name: cert.staff_name },
            openCertificationId: cert.id
        });
    };

    const fetchDashboardData = useCallback(async () => {
        if (!session) {
            // CRITICAL: Clear all state when no session
            setMetrics({ green: 0, amber: 0, red: 0 });
            setCerts([]);
            setChartData([]);
            setAllCerts([]);
            setCurrentUserId(null);
            setLoading(false);
            return;
        }
        
        // CRITICAL: Check if user changed - clear stale data
        const newUserId = session.user.id;
        if (currentUserId && currentUserId !== newUserId) {
            console.log('🔄 User changed from', currentUserId, 'to', newUserId, '- clearing stale data');
            setMetrics({ green: 0, amber: 0, red: 0 });
            setCerts([]);
            setChartData([]);
            setAllCerts([]);
        }
        setCurrentUserId(newUserId);
        
        setLoading(true);
        const { data, error } = await supabase.from('v_certifications_with_status').select('*').eq('user_id', session.user.id);
        
        // DEBUGGING: Log what the database returns for this user
        console.log('RAW DATA FROM VIEW for user ' + session.user.id, data);
        
        if (error) {
            console.error("Error fetching dashboard data:", error);
            showToast("Error loading data.", "error");
            setLoading(false);
            return;
        }

        // Calculate metrics
        const redCerts = [];
        const amberCerts = [];
        const allCertsData = data || [];
        
        let greenCount = 0, amberCount = 0, redCount = 0;
        
        allCertsData.forEach(cert => {
            if (cert.status === 'Up-to-Date') greenCount++;
            else if (cert.status === 'Expiring Soon') {
                amberCount++;
                amberCerts.push(cert);
            }
            else if (cert.status === 'Expired') {
                redCount++;
                redCerts.push(cert);
            }
        });
        
        setMetrics({ green: greenCount, amber: amberCount, red: redCount });
        setAllCerts(allCertsData);
        setCerts([...redCerts, ...amberCerts]);
        updateChartData(allCertsData);
        setLoading(false);
    }, [session]);

    const updateChartData = useCallback((certsData, filters = {}) => {
        if (!certsData || certsData.length === 0) {
            setChartData([]);
            return;
        }

        let filteredCerts = certsData;

        // Apply filters
        if (filters.staffId && filters.staffId !== '') {
            filteredCerts = filteredCerts.filter(cert => cert.staff_id === filters.staffId);
        }

        if (filters.templateId && filters.templateId !== '') {
            filteredCerts = filteredCerts.filter(cert => String(cert.template_id) === String(filters.templateId));
        }

        if (filters.statusFilter && filters.statusFilter !== 'all') {
            filteredCerts = filteredCerts.filter(cert => cert.status === filters.statusFilter);
        }

        // Group by expiry date for chart
        const expiryGroups = {};
        filteredCerts.forEach(cert => {
            if (cert.expiry_date) {
                const dateKey = cert.expiry_date;
                if (!expiryGroups[dateKey]) {
                    expiryGroups[dateKey] = {
                        count: 0,
                        certDetails: []
                    };
                }
                expiryGroups[dateKey].count++;
                expiryGroups[dateKey].certDetails.push({
                    staff_name: cert.staff_name,
                    template_name: cert.template_name,
                    status: cert.status
                });
            }
        });

        // Create chart data array
        let chartDataArray = [];
        
        // Use the date range from filters or default to next 30 days
        const today = new Date();
        let start, end;
        
        if (filters.startDate && filters.endDate) {
            start = new Date(filters.startDate);
            end = new Date(filters.endDate);
        } else {
            // Default to next 30 days
            start = new Date(today);
            end = new Date(today);
            end.setDate(today.getDate() + 30);
        }
        
        // Determine if we should group by weeks (for longer ranges)
        const daysDifference = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const shouldGroupByWeeks = daysDifference > 90;
        
        if (shouldGroupByWeeks) {
            // Weekly grouping for longer ranges
            const weekGroups = {};
            
            Object.keys(expiryGroups).forEach(dateString => {
                const date = new Date(dateString);
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
                const weekKey = weekStart.toISOString().split('T')[0];
                
                if (!weekGroups[weekKey]) {
                    weekGroups[weekKey] = {
                        count: 0,
                        certDetails: []
                    };
                }
                
                const dayData = expiryGroups[dateString];
                weekGroups[weekKey].count += dayData.count;
                weekGroups[weekKey].certDetails.push(...dayData.certDetails);
            });
            
            // Create array for all weeks in range
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 7)) {
                const weekStart = new Date(d);
                weekStart.setDate(d.getDate() - d.getDay()); // Start of week
                const weekKey = weekStart.toISOString().split('T')[0];
                const weekData = weekGroups[weekKey];
                
                chartDataArray.push({
                    date: weekKey,
                    count: weekData?.count || 0,
                    certDetails: weekData?.certDetails || [],
                    isWeekly: true
                });
            }
        } else {
            // Daily grouping (original logic)
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateString = d.toISOString().split('T')[0];
                const dayData = expiryGroups[dateString];
                chartDataArray.push({
                    date: dateString,
                    count: dayData?.count || 0,
                    certDetails: dayData?.certDetails || [],
                    isWeekly: false
                });
            }
        }

        setChartData(chartDataArray);
    }, []);

    const handleFiltersChange = useCallback((filters) => {
        updateChartData(allCerts, filters);
    }, [allCerts, updateChartData]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const computeActionNeededCerts = useCallback((sourceCerts, filter) => {
        const base = (sourceCerts || []).filter(c => c.status === 'Expiring Soon' || c.status === 'Expired');
        if (!filter) {
            setCerts(base);
            return;
        }
        const { startDate, endDate } = filter;
        const filtered = base.filter(c => {
            if (!c.expiry_date) return false;
            return c.expiry_date >= startDate && c.expiry_date <= endDate;
        });
        setCerts(filtered);
    }, []);

    // Keep table rows in sync with active tableFilter without re-fetching
    useEffect(() => {
        computeActionNeededCerts(allCerts, tableFilter);
    }, [allCerts, tableFilter, computeActionNeededCerts]);

    const clearTableFilter = useCallback(() => {
        setTableFilter(null);
        computeActionNeededCerts(allCerts, null);
    }, [allCerts, computeActionNeededCerts]);

    const handleChartBarClick = useCallback(({ date, isWeekly }) => {
        if (!date) return;
        const start = new Date(date);
        const end = new Date(date);
        if (isWeekly) {
            end.setDate(start.getDate() + 6);
        }
        const startIso = start.toISOString().split('T')[0];
        const endIso = end.toISOString().split('T')[0];
        if (tableFilter && tableFilter.startDate === startIso && tableFilter.endDate === endIso) {
            clearTableFilter();
            return;
        }
        const newFilter = { startDate: startIso, endDate: endIso, isWeekly };
        setTableFilter(newFilter);
        computeActionNeededCerts(allCerts, newFilter);
        try {
            document.getElementById('dashboard-table-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch {}
    }, [allCerts, computeActionNeededCerts, tableFilter, clearTableFilter]);

    const formatFilterLabel = (filter) => {
        if (!filter) return '';
        const s = new Date(filter.startDate);
        const e = new Date(filter.endDate);
        const fmt = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        if (filter.startDate === filter.endDate) {
            return `date ${fmt(s)}`;
        }
        return `week of ${fmt(s)} – ${fmt(e)}`;
    };
    
    const handleExportCsv = async () => {
        if (!session) {
            showToast('No active session for export.', 'error');
            return;
        }
        
        const { data, error } = await supabase.from('v_certifications_with_status').select('*').eq('user_id', session.user.id);
        
        // DEBUGGING: Log what the database returns for export
        console.log('EXPORT DATA FROM VIEW for user ' + session.user.id, data);
        
        if (error) {
            showToast('Failed to fetch data for export.', 'error');
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Staff Name,Job Title,Certification,Issue Date,Expiry Date,Status,Document URL\n";
        
        data.forEach(row => {
            const values = [row.staff_name, row.staff_job_title, row.template_name, row.issue_date, row.expiry_date, row.status, row.document_url || 'N/A'];
            csvContent += values.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(',') + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `compliance_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    const handleShowUpgradePrompt = () => {
        if (onOpenExpiredModal) {
            onOpenExpiredModal();
        } else {
            showToast('Upgrade your plan to export data', 'error');
        }
        console.log('Upgrade prompt triggered for CSV export');
    };

    const fetchAuditTrailData = async (certificationId) => {
        const { data, error } = await fetchAuditTrail(certificationId);
        if (error) {
            console.error('Failed to fetch audit trail:', error);
            setAuditTrail([]);
        } else {
            setAuditTrail(data || []);
        }
    };

    const handleCertificationClick = async (cert) => {
        setSelectedCertification({
            id: cert.id,
            certification_name: cert.template_name,
            staff_name: cert.staff_name,
            issue_date: cert.issue_date,
            expiry_date: cert.expiry_date,
            status: cert.status,
            document_filename: cert.document_url ? cert.document_url.split('/').pop() : null,
            document_url: cert.document_url
        });
        await fetchAuditTrailData(cert.id);
        setShowCertModal(true);
    };

    const handleCloseModal = () => {
        setShowCertModal(false);
        setSelectedCertification(null);
        setAuditTrail([]);
    };

    // Handle opening the renewal modal
    const handleRenewCertification = (cert) => {
        // Keep the CertificationModal open behind the renewal modal
        if (!showCertModal) {
            // If opened from table action, also open the details modal in the background for consistency
            setSelectedCertification({
                id: cert.id,
                certification_name: cert.template_name,
                staff_name: cert.staff_name,
                issue_date: cert.issue_date,
                expiry_date: cert.expiry_date,
                status: cert.status,
                document_filename: cert.document_url ? cert.document_url.split('/').pop() : null,
                document_url: cert.document_url
            });
            setShowCertModal(true);
        }
        setCertificationToRenew(cert);
        setShowRenewModal(true);
    };

    // Handle successful renewal
    const handleRenewalSuccess = () => {
        // Refresh dashboard data
        fetchDashboardData();
        setCertificationToRenew(null);
        setShowRenewModal(false);
    };

    // Handle closing the renewal modal
    const handleCloseRenewalModal = () => {
        setCertificationToRenew(null);
        setShowRenewModal(false);
        // Do not close CertificationModal; user returns to it
    };

    return (
        <>
            <div className="flex items-center gap-6 mb-8">
                <div className="min-w-[240px]">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">
                        {profile?.company_name ? `${profile.company_name}'s Dashboard` : 'Dashboard'}
                    </h1>
                    <p className="text-slate-600">Here's your team's compliance overview.</p>
                </div>
                {/* Global Search */}
                <div id="global-search-container" className="flex-1 relative">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                            onFocus={() => setSearchOpen(true)}
                            placeholder="Search for staff, certificates, or certifications..."
                            className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                        {searchQuery && (
                            <button
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                                onClick={() => { setSearchQuery(''); setSearchResults({ staff: [], templates: [], certs: [] }); }}
                                aria-label="Clear search"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    {searchOpen && (
                        <div className="absolute z-50 mt-2 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                            {/* Loading state */}
                            {searchLoading && (
                                <div className="p-4 text-sm text-slate-600">Searching...</div>
                            )}
                            {!searchLoading && (searchResults.staff.length > 0 || searchResults.templates.length > 0 || searchResults.certs.length > 0) && (
                                <div className="max-h-80 overflow-y-auto">
                                    {/* Staff category */}
                                    {searchResults.staff.length > 0 && (
                                        <div>
                                            <div className="px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200">Staff Members</div>
                                            {searchResults.staff.map((s) => (
                                                <div
                                                    key={s.id}
                                                    className="px-4 py-2 hover:bg-slate-50 cursor-pointer"
                                                    onClick={() => handleOpenStaffFromSearch(s)}
                                                    role="button"
                                                    tabIndex={0}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleOpenStaffFromSearch(s); }}
                                                >
                                                    <div className="text-sm font-medium text-slate-900">{s.full_name}</div>
                                                    <div className="text-xs text-slate-500">{s.job_title || 'No job title'}{s.email ? ` • ${s.email}` : ''}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {/* Certificates category */}
                                    {searchResults.templates.length > 0 && (
                                        <div>
                                            <div className="px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200">Certificates</div>
                                            {searchResults.templates.map((t) => (
                                                <div
                                                    key={t.id}
                                                    className="px-4 py-2 hover:bg-slate-50 cursor-pointer"
                                                    onClick={() => handleOpenTemplateFromSearch(t)}
                                                    role="button"
                                                    tabIndex={0}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleOpenTemplateFromSearch(t); }}
                                                >
                                                    <div className="text-sm font-medium text-slate-900">{t.name}</div>
                                                    <div className="text-xs text-slate-500">Validity: {t.validity_period_months || '-'} months</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {/* Staff Certifications category */}
                                    {searchResults.certs.length > 0 && (
                                        <div>
                                            <div className="px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200">Staff Certifications</div>
                                            {searchResults.certs.map((c) => (
                                                <div
                                                    key={c.id}
                                                    className="px-4 py-2 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
                                                    onClick={() => handleOpenCertificationFromSearch(c)}
                                                    role="button"
                                                    tabIndex={0}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleOpenCertificationFromSearch(c); }}
                                                >
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-sm font-medium text-slate-900">{c.staff_name} — {c.template_name}</div>
                                                            <StatusBadge status={c.status} />
                                                        </div>
                                                        <div className="text-xs text-slate-500">{c.expiry_date ? `Expires: ${c.expiry_date}` : 'No expiry date'}</div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {c.document_url && (
                                                            <a
                                                                href={c.document_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-xs text-slate-600 hover:text-slate-800 px-2 py-1"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                Download
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            {!searchLoading && (searchResults.staff.length === 0 && searchResults.templates.length === 0 && searchResults.certs.length === 0) && searchQuery.trim().length >= 2 && (
                                <div className="p-4 text-sm text-slate-600">No results found</div>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex gap-3 items-center">
                    <button 
                        onClick={() => handleRestrictedAction(handleAddStaff, handleShowUpgradePrompt)}
                        disabled={!canCreate}
                        className={`${getButtonClass('bg-blue-600 hover:bg-blue-700 shadow-sm', 'bg-gray-400 cursor-not-allowed')} text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center`}
                        title={canCreate ? 'Add a new staff member' : 'Upgrade to add staff members'}
                    >
                        <Users className="mr-2 h-4 w-4" /> 
                        {getButtonText('Add Staff', 'Upgrade to Add')}
                    </button>
                    <button 
                        onClick={() => handleRestrictedAction(handleAddCertificate, handleShowUpgradePrompt)}
                        disabled={!canCreate}
                        className={`${getButtonClass('bg-emerald-600 hover:bg-emerald-700 shadow-sm', 'bg-gray-400 cursor-not-allowed')} text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center`}
                        title={canCreate ? 'Create a new certificate template' : 'Upgrade to create certificates'}
                    >
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> 
                        {getButtonText('Add Certificate', 'Upgrade to Add')}
                    </button>
                </div>
            </div>
            
            <div id="dashboard-metrics" className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {loading ? (
                    <>
                        <CardSpinner title="Up-to-Date" />
                        <CardSpinner title="Expiring Soon" />
                        <CardSpinner title="Expired" />
                    </>
                ) : (
                    <>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                           <h3 className="text-base font-medium text-emerald-600">Up-to-Date</h3>
                           <p className="text-3xl font-bold text-slate-900 mt-1">{metrics.green}</p>
                       </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                           <h3 className="text-base font-medium text-amber-600">Expiring Soon</h3>
                           <p className="text-3xl font-bold text-slate-900 mt-1">{metrics.amber}</p>
                       </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                           <h3 className="text-base font-medium text-red-600">Expired</h3>
                           <p className="text-3xl font-bold text-slate-900 mt-1">{metrics.red}</p>
                       </div>
                    </>
                )}
            </div>

            {/* Certificate Expiry Chart */}
            <div className="mb-8">
                <ExpiryChart data={chartData} loading={loading} onFiltersChange={handleFiltersChange} session={session} onBarClick={handleChartBarClick} />
            </div>

            <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-bold text-slate-900">Action Needed</h2>
                <div className="flex items-center gap-3">
                    {tableFilter && (
                        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-1 rounded">
                            <span>Filtered to {formatFilterLabel(tableFilter)}</span>
                            <button onClick={clearTableFilter} className="p-1 hover:bg-amber-100 rounded" aria-label="Clear table filter">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                    <button 
                        onClick={() => handleRestrictedAction(handleExportCsv, handleShowUpgradePrompt)}
                        disabled={!canExport}
                        className={`${getButtonClass('bg-slate-600 hover:bg-slate-700 shadow-sm', 'bg-gray-400 cursor-not-allowed')} text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center text-sm`}
                        title={canExport ? 'Export all certifications to CSV' : 'Upgrade to export data'}
                    >
                        <Download className="mr-2 h-4 w-4" /> 
                        {getButtonText('Export All to CSV', 'Upgrade to Export')}
                    </button>
                </div>
            </div>
            <div id="dashboard-table-container" className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? <Spinner /> : (
                    certs.length === 0 ? (
                        <div className="p-6 text-center text-slate-500">No actions needed. All certifications are up-to-date!</div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-xs text-slate-600 uppercase font-medium">
                                <tr>
                                    <th className="p-4">Staff Member</th>
                                    <th className="p-4">Certification</th>
                                    <th className="p-4">Expires On</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {certs.map(cert => (
                                    <tr key={cert.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-medium text-slate-900 cursor-pointer" onClick={() => handleCertificationClick(cert)}>{cert.staff_name}</td>
                                        <td className="p-4 text-slate-700 cursor-pointer" onClick={() => handleCertificationClick(cert)}>{cert.template_name}</td>
                                        <td className="p-4 text-slate-700 cursor-pointer" onClick={() => handleCertificationClick(cert)}>{cert.expiry_date}</td>
                                        <td className="p-4 cursor-pointer" onClick={() => handleCertificationClick(cert)}><StatusBadge status={cert.status} /></td>
                                        <td className="p-4">
                                            {(cert.status === 'Expiring Soon' || cert.status === 'Expired') && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRenewCertification(cert);
                                                    }}
                                                    className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                                                    title="Renew certification"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )
                )}
            </div>
            
            <CertificationModal
                isOpen={showCertModal}
                onClose={handleCloseModal}
                certification={selectedCertification}
                auditTrail={auditTrail}
                canRenew={true}
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
                    templateName={certificationToRenew.template_name || certificationToRenew.certification_name}
                    staffName={certificationToRenew.staff_name}
                    templateValidityPeriodMonths={certificationToRenew.validity_period_months || 12}
                    onRenewalSuccess={handleRenewalSuccess}
                />
            )}

            
        </>
    );
} 