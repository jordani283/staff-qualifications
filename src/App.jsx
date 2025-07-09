import { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Link, useParams } from 'react-router-dom';
import { supabase } from './supabase';
import {
    ShieldCheck, LayoutDashboard, Users, FileSpreadsheet, Clock, CreditCard, LogOut, BarChart3, MessageSquare
} from 'lucide-react';
import { Spinner } from './components/ui';
import { useTrialStatus } from './hooks/useTrialStatus.js';
import { useSupportUnread } from './hooks/useSupportUnread.js';
import TrialExpiryBanner from './components/TrialExpiryBanner.jsx';
import TrialExpiredModal from './components/TrialExpiredModal.jsx';
import GAPageViewTracker from './utils/GAPageViewTracker';

// Page Components
import LandingPage from './pages/LandingPage';
import PricingPage from './pages/PricingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import StaffPage from './pages/StaffPage';
import StaffDetailPage from './pages/StaffDetailPage';
import CertificatesPage from './pages/CertificatesPage';
import ActivitiesPage from './pages/ActivitiesPage';
import GapAnalysisPage from './pages/GapAnalysisPage';
import SupportPage from './pages/SupportPage';
import AdminSupportPage from './pages/AdminSupportPage';
import SubscriptionPage from './pages/SubscriptionPage';

// --- Main App Component ---
export default function App() {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [stripeSessionId, setStripeSessionId] = useState(null);
    const [showExpiredModal, setShowExpiredModal] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    
    // Use refs to track current user ID and profile across renders and auth events
    const currentUserIdRef = useRef(null);
    const currentProfileRef = useRef(null);
    const isInitializedRef = useRef(false);
    const hasShownInitialModalRef = useRef(false);

    // Create session object for trial status hook
    const session = user ? { user, profile } : null;
    
    // Get trial status using the session
    const trialStatus = useTrialStatus(session);
    
    // Get unread support messages count
    const supportUnread = useSupportUnread(session);

    // Show modal automatically when trial expires and user is logged in
    useEffect(() => {
        if (trialStatus.isExpired && user && !trialStatus.loading && !hasShownInitialModalRef.current) {
            setShowExpiredModal(true);
            hasShownInitialModalRef.current = true;
        }
        
        // Reset the flag if trial becomes active again
        if (!trialStatus.isExpired) {
            hasShownInitialModalRef.current = false;
        }
    }, [trialStatus.isExpired, user, trialStatus.loading]);

    useEffect(() => {
        const getInitialData = async () => {
            console.log('🔄 Getting initial session data...');
            setLoading(true);
            
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) {
                    console.error('Error getting initial session:', error);
                    setLoading(false);
                    return;
                }

                if (session?.user) {
                    console.log('✅ Found existing session for user:', session.user.id);
                    
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .maybeSingle();
                    
                    if (profileError) {
                        console.error('Error fetching profile in initial load:', profileError);
                    } else {
                        console.log('✅ Profile data fetched successfully (initial load):', profile);
                    }
                    
                    // Update both state and refs
                    setUser(session.user);
                    setProfile(profile);
                    currentUserIdRef.current = session.user.id;
                    currentProfileRef.current = profile;
                    
                    // Redirect to dashboard if user has complete profile and is on landing page
                    if (profile && profile.company_name && location.pathname === '/') {
                        navigate('/dashboard');
                    }
                } else {
                    console.log('ℹ️ No existing session found');
                    currentUserIdRef.current = null;
                    currentProfileRef.current = null;
                }
            } catch (error) {
                console.error('Error in initial data fetch:', error);
            } finally {
                setLoading(false);
                isInitializedRef.current = true;
                console.log('✅ Initial data loading complete');
            }
        };

        getInitialData();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`🔔 Auth state change: ${event}`, session?.user?.id || 'no-user');

            // Handle sign out
            if (event === 'SIGNED_OUT' || !session?.user) {
                console.log('👋 User signed out');
                setUser(null);
                setProfile(null);
                currentUserIdRef.current = null;
                currentProfileRef.current = null;
                setLoading(false);
                navigate('/');
                setShowExpiredModal(false);
                hasShownInitialModalRef.current = false;
                return;
            }

            // Skip processing if we're still initializing
            if (!isInitializedRef.current) {
                console.log('⏳ Still initializing, skipping auth state change');
                return;
            }

            // Use refs for reliable current user tracking
            const currentUserId = currentUserIdRef.current;
            const newUserId = session.user.id;
            
            // Determine if this is actually a new user or just session maintenance
            const isActuallyNewUser = !currentUserId || currentUserId !== newUserId;
            const hasProfileData = currentProfileRef.current !== null;

            console.log('🔍 Auth change analysis:', {
                event,
                isActuallyNewUser,
                hasProfileData,
                currentUserId,
                newUserId
            });

            // Handle different event types
            switch (event) {
                case 'INITIAL_SESSION':
                    // This shouldn't happen since we handle initial session above
                    console.log('⚠️ INITIAL_SESSION event received after initialization');
                    break;

                case 'TOKEN_REFRESHED':
                    // Just a token refresh - do nothing, session is still valid
                    console.log('🔄 Token refreshed silently');
                    return;

                case 'SIGNED_IN':
                    // Only treat as new sign-in if user actually changed
                    if (isActuallyNewUser) {
                        console.log('🆕 New user signed in, fetching profile...');
                        setLoading(true);
                        
                        try {
                            const { data: profileData, error } = await supabase
                                .from('profiles')
                                .select('*')
                                .eq('id', session.user.id)
                                .maybeSingle();

                            if (error) {
                                console.error('Error fetching profile for new user:', error);
                                setProfile(null);
                                currentProfileRef.current = null;
                            } else {
                                console.log('✅ Profile fetched for new user:', profileData);
                                setProfile(profileData);
                                currentProfileRef.current = profileData;
                                
                                // Redirect to dashboard if user has complete profile
                                if (profileData && profileData.company_name) {
                                    navigate('/dashboard');
                                }
                            }

                            // Update user state and ref after successful profile fetch
                            setUser(session.user);
                            currentUserIdRef.current = session.user.id;
                            
                            // Reset modal flag for new user
                            hasShownInitialModalRef.current = false;
                            
                        } catch (error) {
                            console.error('Profile fetch error:', error);
                            setProfile(null);
                            currentProfileRef.current = null;
                        } finally {
                            setLoading(false);
                        }
                    } else {
                        // Same user, just session continuation - update user object but don't reload profile
                        console.log('🔄 Same user session continued, no profile refetch needed');
                        setUser(session.user);
                        // Don't set loading to true, don't refetch profile
                        console.log('✅ Session refresh handled silently');
                    }
                    break;

                default:
                    console.log(`📝 Unhandled auth event: ${event}`);
                    break;
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [navigate, location.pathname]); // Added navigate and location.pathname to deps

    // HOOK 1: Captures the Stripe session ID from the URL on initial load
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        const success = urlParams.get('success');

        if (success === 'true' && sessionId) {
            console.log('✅ Stripe success detected. Capturing session ID:', sessionId);
            setStripeSessionId(sessionId);
            // Clean the URL immediately so this doesn't run again on a refresh
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []); // Empty dependency array means this runs only once on mount

    // HOOK 2: Waits for auth data and a captured session ID, then redirects
    useEffect(() => {
        // Create clear boolean flags inside the effect
        const isDataReady = !!(user && profile && !loading);
        const isRedirectPending = !!stripeSessionId;

        // Log the status every time this hook runs
        console.log('Redirect watcher status:', {
            isDataReady,
            isRedirectPending,
            isLoading: loading,
            hasUser: !!user,
            hasProfile: !!profile
        });

        // The condition to finally redirect
        if (isDataReady && isRedirectPending) {
            console.log('🚀 All conditions met. REDIRECTING to subscription!');
            navigate('/subscription');
            
            // Clear the session ID from state to prevent loops
            setStripeSessionId(null);
        }
        
    }, [user, profile, loading, stripeSessionId, navigate]); // Added navigate to deps

    const handleProfileUpdate = async () => {
        if (user) {
            setLoading(true);
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();
            setProfile(profile);
            currentProfileRef.current = profile; // Keep ref in sync
            setLoading(false);
            navigate('/dashboard');
        }
    };

    // Trial expiry handlers
    const handleUpgradeClick = () => {
        setShowExpiredModal(false);
        navigate('/subscription');
    };

    const handleViewOnlyClick = () => {
        setShowExpiredModal(false);
    };

    const handleOpenExpiredModal = () => {
        setShowExpiredModal(true);
    };

    if (loading) {
        return <div id="app" className="flex h-screen w-screen overflow-hidden"><Spinner /></div>;
    }

    return (
        <div id="app" className={location.pathname === '/' || location.pathname === '/pricing' ? '' : 'flex h-screen w-screen overflow-hidden flex-col'}>
            {/* Google Analytics 4 Page View Tracker */}
            <GAPageViewTracker user={user} />
            
            <Routes>
                {/* Public routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                
                {/* Protected routes */}
                <Route path="/dashboard" element={
                    <ProtectedRoute user={user} profile={profile} handleProfileUpdate={handleProfileUpdate}>
                        <DashboardPage 
                            profile={profile} 
                            session={session} 
                            onOpenExpiredModal={handleOpenExpiredModal} 
                        />
                    </ProtectedRoute>
                } />
                <Route path="/staff" element={
                    <ProtectedRoute user={user} profile={profile} handleProfileUpdate={handleProfileUpdate}>
                        <StaffPage 
                            user={user} 
                            session={session} 
                            onOpenExpiredModal={handleOpenExpiredModal} 
                        />
                    </ProtectedRoute>
                } />
                <Route path="/staff/:id" element={
                    <ProtectedRoute user={user} profile={profile} handleProfileUpdate={handleProfileUpdate}>
                        <StaffDetailPage 
                            user={user} 
                            session={session} 
                            onOpenExpiredModal={handleOpenExpiredModal} 
                        />
                    </ProtectedRoute>
                } />
                <Route path="/certificates" element={
                    <ProtectedRoute user={user} profile={profile} handleProfileUpdate={handleProfileUpdate}>
                        <CertificatesPage 
                            user={user} 
                            session={session} 
                            onOpenExpiredModal={handleOpenExpiredModal} 
                        />
                    </ProtectedRoute>
                } />
                <Route path="/activities" element={
                    <ProtectedRoute user={user} profile={profile} handleProfileUpdate={handleProfileUpdate}>
                        <ActivitiesPage 
                            user={user} 
                            session={session} 
                        />
                    </ProtectedRoute>
                } />
                <Route path="/gap-analysis" element={
                    <ProtectedRoute user={user} profile={profile} handleProfileUpdate={handleProfileUpdate}>
                        <GapAnalysisPage 
                            user={user} 
                            session={session} 
                            onOpenExpiredModal={handleOpenExpiredModal} 
                        />
                    </ProtectedRoute>
                } />
                <Route path="/support" element={
                    <ProtectedRoute user={user} profile={profile} handleProfileUpdate={handleProfileUpdate}>
                        <SupportPage 
                            session={session} 
                            supportUnread={supportUnread} 
                        />
                    </ProtectedRoute>
                } />
                <Route path="/admin/support" element={
                    <ProtectedRoute user={user} profile={profile} handleProfileUpdate={handleProfileUpdate}>
                        <AdminSupportPage 
                            session={session} 
                        />
                    </ProtectedRoute>
                } />
                <Route path="/subscription" element={
                    <ProtectedRoute user={user} profile={profile} handleProfileUpdate={handleProfileUpdate}>
                        <SubscriptionPage 
                            user={user} 
                            session={session} 
                        />
                    </ProtectedRoute>
                } />
            </Routes>
            
            {/* Trial Expired Modal */}
            <TrialExpiredModal
                isOpen={showExpiredModal}
                onUpgradeClick={handleUpgradeClick}
                onViewOnlyClick={handleViewOnlyClick}
                onClose={() => setShowExpiredModal(false)}
            />
        </div>
    );
}

// --- Protected Route Component ---
function ProtectedRoute({ user, profile, handleProfileUpdate, children }) {
    const navigate = useNavigate();
    const location = useLocation();

    // If not authenticated, redirect to login
    if (!user) {
        navigate('/login', { state: { from: location } });
        return null;
    }

    // If user exists but profile is incomplete, show onboarding
    if (user && (!profile || !profile.company_name)) {
        return <OnboardingPage user={user} onProfileUpdate={handleProfileUpdate} />;
    }

    // If authenticated and profile complete, render with layout
    return (
        <MainLayoutWithTrialBanner profile={profile} user={user}>
            {children}
        </MainLayoutWithTrialBanner>
    );
}

// --- Layout Component with Trial Banner ---
function MainLayoutWithTrialBanner({ profile, user, children }) {
    const session = user ? { user, profile } : null;
    const trialStatus = useTrialStatus(session);
    const supportUnread = useSupportUnread(session);
    const [showExpiredModal, setShowExpiredModal] = useState(false);
    const navigate = useNavigate();

    const handleUpgradeClick = () => {
        setShowExpiredModal(false);
        navigate('/subscription');
    };

    const handleViewOnlyClick = () => {
        setShowExpiredModal(false);
    };

    const handleOpenExpiredModal = () => {
        setShowExpiredModal(true);
    };

    return (
        <>
            {/* Trial Expiry Banner */}
            <TrialExpiryBanner 
                trialStatus={trialStatus} 
                onUpgradeClick={handleUpgradeClick} 
            />
            
            <MainLayout profile={profile} user={user} supportUnread={supportUnread}>
                {children}
            </MainLayout>
            
            {/* Trial Expired Modal */}
            <TrialExpiredModal
                isOpen={showExpiredModal}
                onUpgradeClick={handleUpgradeClick}
                onViewOnlyClick={handleViewOnlyClick}
                onClose={() => setShowExpiredModal(false)}
            />
        </>
    );
}

// --- Layout Components ---
function MainLayout({ profile, user, supportUnread, children }) {
    const location = useLocation();
    const navigate = useNavigate();
    
    const navItemClass = (path) => {
        const isActive = location.pathname === path || 
                        (path === '/gap-analysis' && location.pathname === '/gapanalysis') ||
                        (path === '/admin/support' && location.pathname === '/admin-support');
        return `flex items-center px-4 py-2.5 rounded-lg transition-colors ${
            isActive ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`;
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    // Check if user is admin (database flag only)
    const isAdmin = profile?.is_admin === true;

    // Handle support page navigation - admin goes to admin-support, regular users go to support
    const handleSupportClick = () => {
        if (isAdmin) {
            navigate('/admin/support');
        } else {
            navigate('/support');
        }
    };

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-emerald-50 via-blue-50 to-slate-100">
            <nav className="bg-white/80 backdrop-blur-sm border-r border-slate-200 w-64 p-4 flex-col flex-shrink-0 hidden md:flex shadow-lg">
                <div className="flex items-center gap-3 px-2 mb-8">
                    <ShieldCheck className="text-emerald-600 h-8 w-8" />
                    <span className="font-bold text-lg text-slate-900">TeamCertify</span>
                </div>
                <div className="flex-grow space-y-2">
                    <Link to="/dashboard" className={navItemClass('/dashboard')}>
                        <LayoutDashboard className="mr-3 h-5 w-5" />Dashboard
                    </Link>
                    <Link to="/staff" className={navItemClass('/staff')}>
                        <Users className="mr-3 h-5 w-5" />Staff
                    </Link>
                    <Link to="/certificates" className={navItemClass('/certificates')}>
                        <FileSpreadsheet className="mr-3 h-5 w-5" />Certificates
                    </Link>
                    <Link to="/activities" className={navItemClass('/activities')}>
                        <Clock className="mr-3 h-5 w-5" />Activities
                    </Link>
                    <Link to="/gap-analysis" className={navItemClass('/gap-analysis')}>
                        <BarChart3 className="mr-3 h-5 w-5" />Gap Analysis
                    </Link>
                    <button 
                        onClick={handleSupportClick}
                        className={`${navItemClass(isAdmin ? '/admin/support' : '/support')} relative w-full text-left`}
                    >
                        <MessageSquare className="mr-3 h-5 w-5" />
                        {isAdmin ? 'Admin Support' : 'Support'}
                        {supportUnread?.unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                                {supportUnread.unreadCount > 9 ? '9+' : supportUnread.unreadCount}
                            </span>
                        )}
                    </button>
                    <Link to="/subscription" className={navItemClass('/subscription')}>
                        <CreditCard className="mr-3 h-5 w-5" />Subscription
                    </Link>
                </div>
                <div className="text-sm border-t border-slate-200 pt-4 mt-4">
                    <div className="p-2 text-slate-700 font-medium">{profile?.company_name || '...'}</div>
                    <div className="p-2 text-slate-500 truncate">{user?.email || '...'}</div>
                    <button onClick={handleLogout} className="flex w-full items-center px-2 py-2.5 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors">
                        <LogOut className="mr-3 h-5 w-5" />Logout
                    </button>
                </div>
            </nav>
            <main id="main-content" className="flex-1 bg-transparent p-4 sm:p-6 md:p-8 overflow-y-auto">
                <div className="page-enter">{children}</div>
            </main>
        </div>
    );
}
