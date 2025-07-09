import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';
import { Spinner, showToast } from '../components/ui';
import { Clock, Filter, Search, Calendar, User, FileText, Upload, Trash2, Edit, MessageCircle, RefreshCw } from 'lucide-react';

export default function ActivitiesPage({ user }) {
    const [activities, setActivities] = useState([]);
    const [filteredActivities, setFilteredActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [staffMembers, setStaffMembers] = useState([]);
    
    // Filter states
    const [selectedStaff, setSelectedStaff] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Fetch all activities and staff members
    const fetchActivities = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch activities with joined staff and certification data
            const { data: auditData, error: auditError } = await supabase
                .from('v_certification_audit_logs')
                .select(`
                    *,
                    staff_certifications!inner(
                        id,
                        staff!inner(
                            id,
                            full_name
                        ),
                        certification_templates!inner(
                            id,
                            name
                        )
                    )
                `)
                .order('created_at', { ascending: false });

            if (auditError) {
                console.error('Error fetching audit data:', auditError);
                showToast('Failed to load activities', 'error');
                return;
            }

            // Transform the data for display
            const transformedActivities = auditData?.map(activity => ({
                id: activity.id,
                certification_id: activity.certification_id,
                action_type: activity.action_type,
                field: activity.field,
                old_value: activity.old_value,
                new_value: activity.new_value,
                note: activity.note,
                created_at: activity.created_at,
                performed_by: activity.performed_by,
                staff_name: activity.staff_certifications?.staff?.full_name || 'Unknown Staff',
                staff_id: activity.staff_certifications?.staff?.id,
                certification_name: activity.staff_certifications?.certification_templates?.name || 'Unknown Certificate'
            })) || [];

            setActivities(transformedActivities);
            setFilteredActivities(transformedActivities);

        } catch (error) {
            console.error('Error fetching activities:', error);
            showToast('Failed to load activities', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch staff members for filter dropdown
    const fetchStaffMembers = useCallback(async () => {
        const { data, error } = await supabase
            .from('staff')
            .select('id, full_name')
            .eq('user_id', user.id)
            .order('full_name');

        if (!error) {
            setStaffMembers(data || []);
        }
    }, [user.id]);

    useEffect(() => {
        fetchActivities();
        fetchStaffMembers();
    }, [fetchActivities, fetchStaffMembers]);

    // Apply filters
    useEffect(() => {
        let filtered = [...activities];

        // Filter by staff member
        if (selectedStaff) {
            filtered = filtered.filter(activity => activity.staff_id === selectedStaff);
        }

        // Filter by date range
        if (dateFrom) {
            filtered = filtered.filter(activity => 
                new Date(activity.created_at) >= new Date(dateFrom)
            );
        }
        if (dateTo) {
            filtered = filtered.filter(activity => 
                new Date(activity.created_at) <= new Date(dateTo + 'T23:59:59')
            );
        }

        // Filter by search term
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(activity =>
                activity.staff_name.toLowerCase().includes(term) ||
                activity.certification_name.toLowerCase().includes(term) ||
                activity.action_type.toLowerCase().includes(term) ||
                activity.note?.toLowerCase().includes(term) ||
                activity.performed_by.toLowerCase().includes(term)
            );
        }

        setFilteredActivities(filtered);
    }, [activities, selectedStaff, dateFrom, dateTo, searchTerm]);

    // Clear all filters
    const clearFilters = () => {
        setSelectedStaff('');
        setDateFrom('');
        setDateTo('');
        setSearchTerm('');
    };

    // Get action icon
    const getActionIcon = (actionType) => {
        switch (actionType) {
            case 'CREATE': return <FileText className="w-4 h-4 text-emerald-600" />;
            case 'UPLOAD': return <Upload className="w-4 h-4 text-blue-600" />;
            case 'EDIT': return <Edit className="w-4 h-4 text-amber-600" />;
            case 'DELETE': return <Trash2 className="w-4 h-4 text-red-600" />;
            case 'COMMENT': return <MessageCircle className="w-4 h-4 text-purple-600" />;
            case 'RENEW': return <RefreshCw className="w-4 h-4 text-emerald-600" />;
            default: return <Clock className="w-4 h-4 text-slate-600" />;
        }
    };

    // Get action color class
    const getActionColorClass = (actionType) => {
        switch (actionType) {
            case 'CREATE': return 'text-emerald-600 bg-emerald-50';
            case 'UPLOAD': return 'text-blue-600 bg-blue-50';
            case 'EDIT': return 'text-amber-600 bg-amber-50';
            case 'DELETE': return 'text-red-600 bg-red-50';
            case 'COMMENT': return 'text-purple-600 bg-purple-50';
            case 'RENEW': return 'text-emerald-600 bg-emerald-50';
            default: return 'text-slate-600 bg-slate-50';
        }
    };

    // Format date for display
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Check if any filters are active
    const hasActiveFilters = selectedStaff || dateFrom || dateTo || searchTerm.trim();

    return (
        <>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Activity Log</h1>
                    <p className="text-slate-600">Track all certification activities across your organization.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search activities..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors w-full sm:w-64"
                        />
                    </div>
                    
                    {/* Filter Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors font-semibold ${
                            hasActiveFilters || showFilters
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                        }`}
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                        {hasActiveFilters && (
                            <span className="bg-white text-emerald-600 text-xs px-1.5 py-0.5 rounded-full font-semibold">
                                {[selectedStaff, dateFrom, dateTo, searchTerm.trim()].filter(Boolean).length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <div className="bg-white rounded-xl p-6 mb-6 border border-slate-200 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {/* Staff Filter */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Staff Member</label>
                            <select
                                value={selectedStaff}
                                onChange={(e) => setSelectedStaff(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                            >
                                <option value="">All Staff</option>
                                {staffMembers.map(staff => (
                                    <option key={staff.id} value={staff.id}>
                                        {staff.full_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Date From */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">From Date</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                            />
                        </div>

                        {/* Date To */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">To Date</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                            />
                        </div>
                    </div>

                    {hasActiveFilters && (
                        <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                            <span className="text-sm text-slate-600">
                                Showing {filteredActivities.length} of {activities.length} activities
                            </span>
                            <button
                                onClick={clearFilters}
                                className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
                            >
                                Clear all filters
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Activities List */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-12">
                        <Spinner />
                    </div>
                ) : filteredActivities.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2 text-slate-700">
                            {hasActiveFilters ? 'No activities match your filters' : 'No activities found'}
                        </p>
                        <p className="text-sm">
                            {hasActiveFilters 
                                ? 'Try adjusting your filter criteria to see more results.'
                                : 'Activities will appear here as staff certifications are created and modified.'
                            }
                        </p>
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="mt-4 text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredActivities.map((activity, index) => (
                            <div key={activity.id} className="p-6 hover:bg-slate-50 transition-colors">
                                <div className="flex items-start gap-4">
                                    {/* Action Icon */}
                                    <div className="flex-shrink-0 mt-1">
                                        {getActionIcon(activity.action_type)}
                                    </div>

                                    {/* Main Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColorClass(activity.action_type)}`}>
                                                    {activity.action_type}
                                                </span>
                                                {activity.field && (
                                                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                                                        {activity.field}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-slate-500">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(activity.created_at)}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <User className="w-3 h-3" />
                                                    {activity.performed_by}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Activity Description */}
                                        <div className="mb-2">
                                            <p className="text-slate-900 font-medium">
                                                {activity.staff_name} • {activity.certification_name}
                                            </p>
                                        </div>

                                        {/* Field Changes */}
                                        {activity.old_value && activity.new_value && (
                                            <div className="text-sm text-slate-600 mb-2">
                                                <span className="text-red-600">{activity.old_value}</span>
                                                <span className="text-slate-400 mx-2">→</span>
                                                <span className="text-emerald-600">{activity.new_value}</span>
                                            </div>
                                        )}

                                        {/* Note */}
                                        {activity.note && (
                                            <p className="text-sm text-slate-500 italic">
                                                {activity.note}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
} 