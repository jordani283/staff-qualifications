import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';
import { Spinner, showToast } from '../components/ui';
import Dialog from '../components/Dialog';
import { Clock, Filter, Search, Calendar, User, FileText, Upload, Trash2, Edit, MessageCircle, RefreshCw, UserPlus, UserX, Settings, X } from 'lucide-react';

export default function ActivitiesPage({ user, setPage, session }) {
    const [activities, setActivities] = useState([]);
    const [filteredActivities, setFilteredActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [staffMembers, setStaffMembers] = useState([]);
    const [currentUserDisplayName, setCurrentUserDisplayName] = useState('');
    
    // Filter states
    const [selectedStaff, setSelectedStaff] = useState('');
    const [selectedActivityType, setSelectedActivityType] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    
    // Activity detail dialog state
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [showActivityDetail, setShowActivityDetail] = useState(false);

    // Fetch all activities and staff members
    const fetchActivities = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch certification activities with joined staff and certification data
            // Use LEFT JOIN to include deleted certifications (where certification_id is NULL)
            const { data: certAuditData, error: certAuditError } = await supabase
                .from('v_certification_audit_logs')
                .select(`
                    *,
                    staff_certifications(
                        id,
                        staff(
                            id,
                            full_name
                        ),
                        certification_templates(
                            id,
                            name
                        )
                    )
                `)
                .order('created_at', { ascending: false });

            if (certAuditError) {
                console.error('Error fetching certification audit data:', certAuditError);
                showToast('Failed to load certification activities', 'error');
                return;
            }

            // Fetch staff activities
            const { data: staffAuditData, error: staffAuditError } = await supabase
                .from('staff_audit_logs')
                .select(`
                    id,
                    user_id,
                    staff_id,
                    event_type,
                    event_description,
                    created_at,
                    old_data,
                    new_data
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (staffAuditError) {
                console.error('Error fetching staff audit data:', staffAuditError);
                // Don't fail completely, just log and continue with cert activities
            }

            // Transform certification activities
            const certActivities = certAuditData?.map(activity => {
                // Handle deleted certifications (where certification_id is NULL)
                const isDeleted = !activity.certification_id;
                let staffName = activity.staff_certifications?.staff?.full_name;
                let certName = activity.staff_certifications?.certification_templates?.name;
                
                // For deleted certifications, parse names from the note field
                if (isDeleted && activity.note && activity.action_type === 'DELETE') {
                    // Parse note like "Certification deleted for Charlie Brown: Health & Safety Induction (2030-08-04)"
                    const noteMatch = activity.note.match(/Certification deleted for (.+?): (.+?) \(/);
                    if (noteMatch) {
                        staffName = noteMatch[1];
                        certName = noteMatch[2];
                    }
                }
                
                // Fallback for unknown values
                staffName = staffName || (isDeleted ? 'Unknown Staff' : 'Unknown Staff');
                certName = certName || (isDeleted ? 'Unknown Certificate' : 'Unknown Certificate');
                
                return {
                    id: activity.id,
                    certification_id: activity.certification_id,
                    action_type: activity.action_type,
                    field: activity.field,
                    old_value: activity.old_value,
                    new_value: activity.new_value,
                    note: activity.note,
                    created_at: activity.created_at,
                    performed_by: activity.performed_by,
                    staff_name: staffName,
                    staff_id: activity.staff_certifications?.staff?.id,
                    certification_name: certName,
                    activity_category: 'certification'
                };
            }) || [];

            // Transform staff activities
            const staffActivities = staffAuditData?.map(activity => {
                let staffName = 'Unknown Staff';
                let certName = null;
                
                // Handle different staff activity types
                if (activity.event_type === 'TEMPLATE_DELETED') {
                    // For template deletions, parse the template name from the note
                    // Note format: "Certificate template deleted: First AID (1 months validity)"
                    const templateMatch = activity.event_description?.match(/Certificate template deleted: (.+?) \(/);
                    if (templateMatch) {
                        certName = templateMatch[1];
                        staffName = null; // No staff involved in template deletion
                    }
                } else {
                    // For staff-related activities, get staff name
                    staffName = activity.old_data?.full_name || activity.new_data?.full_name || 'Unknown Staff';
                }
                
                return {
                    id: activity.id,
                    certification_id: null,
                    action_type: activity.event_type,
                    field: null,
                    old_value: null,
                    new_value: null,
                    note: activity.event_description,
                    created_at: activity.created_at,
                    performed_by: currentUserDisplayName || 'You',
                    staff_name: staffName,
                    staff_id: activity.staff_id,
                    certification_name: certName,
                    activity_category: 'staff'
                };
            }) || [];

            // Combine and sort all activities by date
            const allActivities = [...certActivities, ...staffActivities]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            setActivities(allActivities);
            setFilteredActivities(allActivities);

        } catch (error) {
            console.error('Error fetching activities:', error);
            showToast('Failed to load activities', 'error');
        } finally {
            setLoading(false);
        }
    }, [currentUserDisplayName]);

    // Fetch current user's display name for staff activities
    const fetchCurrentUserDisplayName = useCallback(async () => {
        // Prefer session profile if available to avoid extra queries
        const sessionProfile = session?.profile;
        if (sessionProfile) {
            const nameFromSession = ([sessionProfile.first_name, sessionProfile.last_name]
                .filter(Boolean)
                .join(' ') || sessionProfile.full_name || '').trim();
            if (nameFromSession) {
                setCurrentUserDisplayName(nameFromSession);
                return;
            }
        }

        // Fallback: fetch from profiles table
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('first_name, last_name, full_name')
                .eq('id', user.id)
                .maybeSingle();

            const nameFromDb = (profile && ([profile.first_name, profile.last_name]
                .filter(Boolean)
                .join(' ') || profile.full_name || '')).trim();

            if (nameFromDb) {
                setCurrentUserDisplayName(nameFromDb);
            } else {
                setCurrentUserDisplayName(user?.email || 'Unknown User');
            }
        } catch (e) {
            setCurrentUserDisplayName(user?.email || 'Unknown User');
        }
    }, [session?.profile, user.id, user?.email]);

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
        fetchCurrentUserDisplayName();
        fetchActivities();
        fetchStaffMembers();
    }, [fetchCurrentUserDisplayName, fetchActivities, fetchStaffMembers]);

    // Apply filters
    useEffect(() => {
        let filtered = [...activities];

        // Filter by staff member
        if (selectedStaff) {
            filtered = filtered.filter(activity => activity.staff_id === selectedStaff);
        }

        // Filter by activity type
        if (selectedActivityType) {
            filtered = filtered.filter(activity => activity.action_type === selectedActivityType);
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
                (activity.staff_name && activity.staff_name.toLowerCase().includes(term)) ||
                (activity.certification_name && activity.certification_name.toLowerCase().includes(term)) ||
                activity.action_type.toLowerCase().includes(term) ||
                (activity.note && activity.note.toLowerCase().includes(term)) ||
                activity.performed_by.toLowerCase().includes(term)
            );
        }

        setFilteredActivities(filtered);
    }, [activities, selectedStaff, selectedActivityType, dateFrom, dateTo, searchTerm]);

    // Clear all filters
    const clearFilters = () => {
        setSelectedStaff('');
        setSelectedActivityType('');
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
            case 'STAFF_CREATED': return <UserPlus className="w-4 h-4 text-emerald-600" />;
            case 'STAFF_DELETED': return <UserX className="w-4 h-4 text-red-600" />;
            case 'STAFF_UPDATED': return <User className="w-4 h-4 text-amber-600" />;
            case 'TEMPLATE_DELETED': return <Settings className="w-4 h-4 text-red-600" />;
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
            case 'STAFF_CREATED': return 'text-emerald-600 bg-emerald-50';
            case 'STAFF_DELETED': return 'text-red-600 bg-red-50';
            case 'STAFF_UPDATED': return 'text-amber-600 bg-amber-50';
            case 'TEMPLATE_DELETED': return 'text-red-600 bg-red-50';
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

    // Navigation functions
    const handleStaffClick = async (staffId, staffName) => {
        if (!staffId) return;
        
        // Fetch staff member data
        const { data: staffMember, error } = await supabase
            .from('staff')
            .select('*')
            .eq('id', staffId)
            .single();
            
        if (error || !staffMember) {
            console.error('Error fetching staff member:', error);
            showToast(`Could not find staff member: ${staffName}`, 'error');
            return;
        }
        
        console.log('Setting staff member data:', staffMember);
        setPage('staffDetail', { staffMember });
    };

    const handleCertificationClick = async (certificationId, staffName, certName) => {
        if (!certificationId) return;
        
        // We'll open the certification modal - but we need to navigate to staff detail first
        // and then trigger the certification modal from there
        const { data: certification, error: certError } = await supabase
            .from('v_certifications_with_status')
            .select('*')
            .eq('id', certificationId)
            .single();
            
        if (certError || !certification) {
            showToast(`Could not find certification: ${certName}`, 'error');
            return;
        }
        
        // Get the staff member
        const { data: staffMember, error: staffError } = await supabase
            .from('staff')
            .select('*')
            .eq('id', certification.staff_id)
            .single();
            
        if (staffError || !staffMember) {
            showToast(`Could not find staff member: ${staffName}`, 'error');
            return;
        }
        
        // Navigate to staff detail with the certification to open
        setPage('staffDetail', { 
            staffMember, 
            openCertificationId: certificationId 
        });
    };

    const handleViewActivityDetails = (activity) => {
        setSelectedActivity(activity);
        setShowActivityDetail(true);
    };

    // Render clickable entity names in activity descriptions
    const renderActivityDescription = (activity) => {
        if (activity.action_type === 'TEMPLATE_DELETED') {
            // Template deletion: just show the template name (not clickable)
            return <span className="text-slate-900 font-medium">{activity.certification_name}</span>;
        }
        
        const staffName = activity.staff_name;
        const certName = activity.certification_name;
        
        if (staffName && certName) {
            // Both staff and certification: make both clickable
            return (
                <div className="text-slate-900 font-medium">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleStaffClick(activity.staff_id, staffName);
                        }}
                        className="text-slate-900 hover:text-blue-600 hover:underline transition-colors"
                        title={`Go to ${staffName}'s details`}
                    >
                        {staffName}
                    </button>
                    <span className="mx-2">•</span>
                    {activity.certification_id ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCertificationClick(activity.certification_id, staffName, certName);
                            }}
                            className="text-slate-900 hover:text-blue-600 hover:underline transition-colors"
                            title={`Go to ${certName} certification`}
                        >
                            {certName}
                        </button>
                    ) : (
                        <span className="text-slate-600">{certName}</span>
                    )}
                </div>
            );
        } else if (staffName) {
            // Only staff: make staff clickable
            return (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleStaffClick(activity.staff_id, staffName);
                    }}
                    className="text-slate-900 hover:text-blue-600 hover:underline transition-colors font-medium"
                    title={`Go to ${staffName}'s details`}
                >
                    {staffName}
                </button>
            );
        } else if (certName) {
            // Only certification: show name but not clickable (no staff context)
            return <span className="text-slate-900 font-medium">{certName}</span>;
        } else {
            return <span className="text-slate-900 font-medium">Unknown</span>;
        }
    };

    // Check if any filters are active
    const hasActiveFilters = selectedStaff || selectedActivityType || dateFrom || dateTo || searchTerm.trim();

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
                                {[selectedStaff, selectedActivityType, dateFrom, dateTo, searchTerm.trim()].filter(Boolean).length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <div className="bg-white rounded-xl p-6 mb-6 border border-slate-200 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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

                        {/* Activity Type Filter */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Activity Type</label>
                            <select
                                value={selectedActivityType}
                                onChange={(e) => setSelectedActivityType(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                            >
                                <option value="">All Activities</option>
                                <option value="CREATE">Create</option>
                                <option value="UPLOAD">Upload</option>
                                <option value="EDIT">Edit</option>
                                <option value="DELETE">Delete</option>
                                <option value="COMMENT">Comment</option>
                                <option value="RENEW">Renew</option>
                                <option value="STAFF_CREATED">Staff Created</option>
                                <option value="STAFF_DELETED">Staff Deleted</option>
                                <option value="STAFF_UPDATED">Staff Updated</option>
                                <option value="TEMPLATE_DELETED">Template Deleted</option>
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
                            <div 
                                key={activity.id} 
                                className={`p-6 transition-colors ${
                                    (activity.certification_id || (activity.staff_id && activity.action_type !== 'TEMPLATE_DELETED'))
                                        ? 'hover:bg-slate-50 cursor-pointer'
                                        : 'hover:bg-slate-50'
                                }`}
                                onClick={() => {
                                    if (activity.certification_id || (activity.staff_id && activity.action_type !== 'TEMPLATE_DELETED')) {
                                        handleViewActivityDetails(activity);
                                    }
                                }}
                            >
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
                                                    {activity.action_type.replace(/_/g, ' ')}
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

                                        {/* Activity Description with clickable links */}
                                        <div className="mb-2">
                                            {renderActivityDescription(activity)}
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

            {/* Activity Detail Dialog */}
            {showActivityDetail && selectedActivity && (
                <Dialog
                    id="activity-detail-dialog"
                    title="Activity Details"
                    onClose={() => setShowActivityDetail(false)}
                >
                    <div className="space-y-4">
                        {/* Activity Type */}
                        <div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColorClass(selectedActivity.action_type)}`}>
                                {selectedActivity.action_type.replace(/_/g, ' ')}
                            </span>
                            {selectedActivity.field && (
                                <span className="ml-2 text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                                    {selectedActivity.field}
                                </span>
                            )}
                        </div>

                        {/* Entity Names */}
                        <div className="space-y-2">
                            {selectedActivity.staff_name && (
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-slate-500" />
                                    <span className="text-sm text-slate-600">Staff:</span>
                                    <span className="text-sm font-medium text-slate-900">{selectedActivity.staff_name}</span>
                                </div>
                            )}
                            
                            {selectedActivity.certification_name && (
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-slate-500" />
                                    <span className="text-sm text-slate-600">Certificate:</span>
                                    <span className="text-sm font-medium text-slate-900">{selectedActivity.certification_name}</span>
                                </div>
                            )}
                        </div>

                        {/* Field Changes */}
                        {selectedActivity.old_value && selectedActivity.new_value && (
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <div className="text-sm font-medium text-slate-700 mb-1">Change:</div>
                                <div className="text-sm">
                                    <span className="text-red-600">{selectedActivity.old_value}</span>
                                    <span className="text-slate-400 mx-2">→</span>
                                    <span className="text-emerald-600">{selectedActivity.new_value}</span>
                                </div>
                            </div>
                        )}

                        {/* Note */}
                        {selectedActivity.note && (
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <div className="text-sm font-medium text-slate-700 mb-1">Details:</div>
                                <p className="text-sm text-slate-600 italic">{selectedActivity.note}</p>
                            </div>
                        )}

                        {/* Date and User */}
                        <div className="text-xs text-slate-500 space-y-1">
                            <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(selectedActivity.created_at)}
                            </div>
                            <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {selectedActivity.performed_by}
                            </div>
                        </div>
                    </div>

                    {/* Navigation Actions */}
                    <div className="flex gap-3 pt-6">
                        {selectedActivity.staff_id && (
                            <button
                                onClick={async () => {
                                    setShowActivityDetail(false);
                                    await handleStaffClick(selectedActivity.staff_id, selectedActivity.staff_name);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                <User className="w-4 h-4" />
                                Go to Staff
                            </button>
                        )}
                        
                        {selectedActivity.certification_id && (
                            <button
                                onClick={async () => {
                                    setShowActivityDetail(false);
                                    await handleCertificationClick(selectedActivity.certification_id, selectedActivity.staff_name, selectedActivity.certification_name);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                <FileText className="w-4 h-4" />
                                Go to Certificate
                            </button>
                        )}
                    </div>
                </Dialog>
            )}
        </>
    );
} 