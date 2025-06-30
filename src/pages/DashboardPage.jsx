import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';
import { CardSpinner, Spinner, StatusBadge, showToast } from '../components/ui';
import { Download } from 'lucide-react';
import ExpiryChart from '../components/ExpiryChart';
import CertificationModal from '../components/CertificationModal';
import { fetchAuditTrail } from '../utils/auditLogger.js';

export default function DashboardPage({ profile }) {
    const [metrics, setMetrics] = useState({ green: 0, amber: 0, red: 0 });
    const [certs, setCerts] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [allCerts, setAllCerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCertification, setSelectedCertification] = useState(null);
    const [showCertModal, setShowCertModal] = useState(false);
    const [auditTrail, setAuditTrail] = useState([]);

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('v_certifications_with_status').select('*');
        if (error) {
            console.error("Error fetching dashboard data:", error);
            showToast("Error loading data.", "error");
        } else {
            setAllCerts(data);
            
            const newMetrics = data.reduce((acc, cert) => {
                if (cert.status === 'Up-to-Date') acc.green++;
                if (cert.status === 'Expiring Soon') acc.amber++;
                if (cert.status === 'Expired') acc.red++;
                return acc;
            }, { green: 0, amber: 0, red: 0 });
            setMetrics(newMetrics);

            const actionNeededCerts = data.filter(c => c.status !== 'Up-to-Date').sort((a,b) => new Date(a.expiry_date) - new Date(b.expiry_date));
            setCerts(actionNeededCerts);

            // Initial chart data - next 30 days, all staff
            updateChartData(data, {
                startDate: new Date().toISOString().split('T')[0],
                endDate: (() => {
                    const thirtyDaysFromNow = new Date();
                    thirtyDaysFromNow.setDate(new Date().getDate() + 30);
                    return thirtyDaysFromNow.toISOString().split('T')[0];
                })(),
                staffId: ''
            });
        }
        setLoading(false);
    }, []);

    const updateChartData = useCallback((data, filters) => {
        const { startDate, endDate, staffId } = filters;
        
        // Filter data based on date range and staff member
        let filteredData = data.filter(cert => {
            const expiryDate = new Date(cert.expiry_date);
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            const withinDateRange = expiryDate >= start && expiryDate <= end;
            const matchesStaff = !staffId || cert.staff_id === staffId;
            
            return withinDateRange && matchesStaff;
        });

        // Group by expiry date with detailed information
        const expiryGroups = filteredData.reduce((acc, cert) => {
            const dateKey = cert.expiry_date;
            if (!acc[dateKey]) {
                acc[dateKey] = {
                    count: 0,
                    certDetails: []
                };
            }
            acc[dateKey].count += 1;
            acc[dateKey].certDetails.push({
                staff_name: cert.staff_name,
                template_name: cert.template_name,
                staff_id: cert.staff_id,
                id: cert.id
            });
            return acc;
        }, {});

        // Calculate date range in days
        const start = new Date(startDate);
        const end = new Date(endDate);
        const daysDifference = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const useWeeklyGrouping = daysDifference > 90; // More than 3 months
        
        let chartDataArray = [];
        
        if (useWeeklyGrouping) {
            // Group by weeks
            const weekGroups = {};
            
            // First, populate all certificates into week groups
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
        const { data, error } = await supabase.from('v_certifications_with_status').select('*');
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
            issue_date: cert.issue_date,
            expiry_date: cert.expiry_date,
            status: cert.status,
            document_filename: cert.document_url ? cert.document_url.split('/').pop() : null
        });
        await fetchAuditTrailData(cert.id);
        setShowCertModal(true);
    };

    const handleCloseModal = () => {
        setShowCertModal(false);
        setSelectedCertification(null);
        setAuditTrail([]);
    };

    return (
        <>
            <h1 className="text-3xl font-bold text-white mb-2">
                {profile?.company_name ? `${profile.company_name}'s Dashboard` : 'Dashboard'}
            </h1>
            <p className="text-slate-400 mb-8">Here's your team's compliance overview.</p>
            
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
                <ExpiryChart data={chartData} loading={loading} onFiltersChange={handleFiltersChange} />
            </div>

            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Action Needed</h2>
                <button onClick={handleExportCsv} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-md transition-colors flex items-center text-sm">
                    <Download className="mr-2 h-4 w-4" /> Export All to CSV
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
                                </tr>
                            </thead>
                            <tbody>
                                {certs.map(cert => (
                                    <tr key={cert.id} className="border-t border-slate-700 hover:bg-slate-700/30 cursor-pointer transition-colors" onClick={() => handleCertificationClick(cert)}>
                                        <td className="p-4 font-medium text-white">{cert.staff_name}</td>
                                        <td className="p-4 text-slate-300">{cert.template_name}</td>
                                        <td className="p-4 text-slate-300">{cert.expiry_date}</td>
                                        <td className="p-4"><StatusBadge status={cert.status} /></td>
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
            />
        </>
    );
} 