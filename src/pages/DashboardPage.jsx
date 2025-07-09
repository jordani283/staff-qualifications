import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';
import { CardSpinner, Spinner, StatusBadge, showToast } from '../components/ui';
import { Download, Plus, Users, FileSpreadsheet, RefreshCw } from 'lucide-react';
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

    // Get feature access permissions
    const { canCreate, canExport, getButtonText, getButtonClass, handleRestrictedAction } = useFeatureAccess(session);

    // Navigation functions for quick actions
    const handleAddStaff = () => {
        setPage('staff', { autoOpenDialog: true });
    };

    const handleAddCertificate = () => {
        setPage('certificates', { autoOpenDialog: true });
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
        setCerts([...redCerts, ...amberCerts]);
        setAllCerts(allCertsData);
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
    };

    return (
        <>
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {profile?.company_name ? `${profile.company_name}'s Dashboard` : 'Dashboard'}
                    </h1>
                    <p className="text-slate-400">Here's your team's compliance overview.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => handleRestrictedAction(handleAddStaff, handleShowUpgradePrompt)}
                        disabled={!canCreate}
                        className={`${getButtonClass('bg-sky-600 hover:bg-sky-700', 'bg-gray-500 cursor-not-allowed')} text-white font-bold py-2 px-4 rounded-md transition-colors flex items-center`}
                        title={canCreate ? 'Add a new staff member' : 'Upgrade to add staff members'}
                    >
                        <Users className="mr-2 h-4 w-4" /> 
                        {getButtonText('Add Staff', 'Upgrade to Add')}
                    </button>
                    <button 
                        onClick={() => handleRestrictedAction(handleAddCertificate, handleShowUpgradePrompt)}
                        disabled={!canCreate}
                        className={`${getButtonClass('bg-emerald-600 hover:bg-emerald-700', 'bg-gray-500 cursor-not-allowed')} text-white font-bold py-2 px-4 rounded-md transition-colors flex items-center`}
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
                        <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                           <h3 className="text-sm font-medium text-green-400">Up-to-Date</h3>
                           <p className="text-3xl font-bold text-white mt-1">{metrics.green}</p>
                       </div>
                        <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                           <h3 className="text-sm font-medium text-amber-400">Expiring Soon</h3>
                           <p className="text-3xl font-bold text-white mt-1">{metrics.amber}</p>
                       </div>
                        <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                           <h3 className="text-sm font-medium text-red-400">Expired</h3>
                           <p className="text-3xl font-bold text-white mt-1">{metrics.red}</p>
                       </div>
                    </>
                )}
            </div>

            {/* Certificate Expiry Chart */}
            <div className="mb-8">
                <ExpiryChart data={chartData} loading={loading} onFiltersChange={handleFiltersChange} session={session} />
            </div>

            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Action Needed</h2>
                <button 
                    onClick={() => handleRestrictedAction(handleExportCsv, handleShowUpgradePrompt)}
                    disabled={!canExport}
                    className={`${getButtonClass('bg-slate-700 hover:bg-slate-600', 'bg-gray-500 cursor-not-allowed')} text-white font-bold py-2 px-4 rounded-md transition-colors flex items-center text-sm`}
                    title={canExport ? 'Export all certifications to CSV' : 'Upgrade to export data'}
                >
                    <Download className="mr-2 h-4 w-4" /> 
                    {getButtonText('Export All to CSV', 'Upgrade to Export')}
                </button>
            </div>
            <div id="dashboard-table-container" className="bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700">
                {loading ? <Spinner /> : (
                    certs.length === 0 ? (
                        <div className="p-6 text-center text-slate-400">No actions needed. All certifications are up-to-date!</div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-slate-800 text-xs text-slate-400 uppercase">
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
                                    <tr key={cert.id} className="border-t border-slate-700 hover:bg-slate-700/30 transition-colors">
                                        <td className="p-4 font-medium text-white cursor-pointer" onClick={() => handleCertificationClick(cert)}>{cert.staff_name}</td>
                                        <td className="p-4 text-slate-300 cursor-pointer" onClick={() => handleCertificationClick(cert)}>{cert.template_name}</td>
                                        <td className="p-4 text-slate-300 cursor-pointer" onClick={() => handleCertificationClick(cert)}>{cert.expiry_date}</td>
                                        <td className="p-4 cursor-pointer" onClick={() => handleCertificationClick(cert)}><StatusBadge status={cert.status} /></td>
                                        <td className="p-4">
                                            {(cert.status === 'Expiring Soon' || cert.status === 'Expired') && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRenewCertification(cert);
                                                    }}
                                                    className="p-1 text-green-400 hover:text-green-300 hover:bg-slate-700 rounded transition-colors"
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
            <RenewCertificationModal
                isOpen={showRenewModal}
                onClose={handleCloseRenewalModal}
                certification={certificationToRenew}
                onSuccess={handleRenewalSuccess}
            />
        </>
    );
} 