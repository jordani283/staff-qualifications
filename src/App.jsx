import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import {
    ShieldCheck, LayoutDashboard, Users, FileSpreadsheet, Clock, CreditCard, LogOut, BarChart3, MessageSquare
} from 'lucide-react';
import { Spinner } from './components/ui';
import { useTrialStatus } from './hooks/useTrialStatus.js';
import { useSupportUnread } from './hooks/useSupportUnread.js';
import TrialExpiryBanner from './components/TrialExpiryBanner.jsx';
import TrialExpiredModal from './components/TrialExpiredModal.jsx';

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
    const [page, setPage] = useState('landing');
    const [currentPageData, setCurrentPageData] = useState({});
    const [stripeSessionId, setStripeSessionId] = useState(null);
    const [showExpiredModal, setShowExpiredModal] = useState(false);
    
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
                    
                    // Set default page for authenticated users with complete profiles
                    if (profile && profile.company_name) {
                        setPage('dashboard');
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
                setPage('landing');
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
                                
                                // Set default page for authenticated users with complete profiles
                                if (profileData && profileData.company_name) {
                                    setPage('dashboard');
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
    }, []); // Empty dependency array - refs ensure we have current values

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
            setPage('subscription');
            
            // Clear the session ID from state to prevent loops
            setStripeSessionId(null);
        }
        
    }, [user, profile, loading, stripeSessionId]); // Dependencies remain the same

    const handleSetPage = (newPage, data = {}) => {
        setPage(newPage);
        setCurrentPageData(data);
    };

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
            setPage('dashboard');
        }
    };

    // Trial expiry handlers
    const handleUpgradeClick = () => {
        setShowExpiredModal(false);
        handleSetPage('subscription');
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

    const handleNavigateToAuth = (authType) => {
        setPage(authType);
    };

    const handleNavigateBack = () => {
        setPage('landing');
    };

    let pageContent;
    if (!user) {
        if (page === 'landing') {
            pageContent = <LandingPage onNavigateToAuth={handleNavigateToAuth} onNavigateToPricing={() => setPage('pricing')} />;
        } else if (page === 'pricing') {
            pageContent = <PricingPage onNavigateToAuth={handleNavigateToAuth} onNavigateBack={handleNavigateBack} />;
        } else if (page === 'signup') {
            pageContent = <SignupPage setPage={handleSetPage} />;
        } else {
            pageContent = <LoginPage setPage={handleSetPage} />;
        }
    } else if (user && (!profile || !profile.company_name)) {
        pageContent = <OnboardingPage user={user} onProfileUpdate={handleProfileUpdate} />;
    } else {
        // Create enhanced session object with trial status
        const enhancedSession = session ? { 
            ...session, 
            trialStatus 
        } : null;
        
        pageContent = (
            <>
                {/* Trial Expiry Banner */}
                <TrialExpiryBanner 
                    trialStatus={trialStatus} 
                    onUpgradeClick={handleUpgradeClick} 
                />
                
                <MainLayout page={page} profile={profile} user={user} setPage={handleSetPage} supportUnread={supportUnread}>
                    <PageContent 
                        page={page} 
                        currentPageData={currentPageData} 
                        setPage={handleSetPage} 
                        user={user} 
                        profile={profile} 
                        session={enhancedSession}
                        onOpenExpiredModal={handleOpenExpiredModal}
                        supportUnread={supportUnread}
                    />
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
    
    return <div id="app" className={page === 'landing' || page === 'pricing' ? '' : 'flex h-screen w-screen overflow-hidden flex-col'}>{pageContent}</div>;
}

// --- Layout Components ---
function MainLayout({ page, profile, user, setPage, supportUnread, children }) {
    const navItemClass = (pageName) => `flex items-center px-4 py-2.5 rounded-lg transition-colors ${page === pageName ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`;

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    // Check if user is admin (database flag only)
    const isAdmin = profile?.is_admin === true;

    // Handle support page navigation - admin goes to admin-support, regular users go to support
    const handleSupportClick = () => {
        if (isAdmin) {
            setPage('admin-support');
        } else {
            setPage('support');
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
                    <a href="#" className={navItemClass('dashboard')} onClick={() => setPage('dashboard')}><LayoutDashboard className="mr-3 h-5 w-5" />Dashboard</a>
                    <a href="#" className={navItemClass('staff')} onClick={() => setPage('staff')}><Users className="mr-3 h-5 w-5" />Staff</a>
                    <a href="#" className={navItemClass('certificates')} onClick={() => setPage('certificates')}><FileSpreadsheet className="mr-3 h-5 w-5" />Certificates</a>
                    <a href="#" className={navItemClass('activities')} onClick={() => setPage('activities')}><Clock className="mr-3 h-5 w-5" />Activities</a>
                    <a href="#" className={navItemClass('gapanalysis')} onClick={() => setPage('gapanalysis')}><BarChart3 className="mr-3 h-5 w-5" />Gap Analysis</a>
                    <a href="#" className={`${navItemClass(isAdmin ? 'admin-support' : 'support')} relative`} onClick={handleSupportClick}>
                        <MessageSquare className="mr-3 h-5 w-5" />
                        {isAdmin ? 'Admin Support' : 'Support'}
                        {supportUnread?.unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                                {supportUnread.unreadCount > 9 ? '9+' : supportUnread.unreadCount}
                            </span>
                        )}
                    </a>
                    <a href="#" className={navItemClass('subscription')} onClick={() => setPage('subscription')}><CreditCard className="mr-3 h-5 w-5" />Subscription</a>
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

function PageContent({ page, currentPageData, setPage, user, profile, session, onOpenExpiredModal, supportUnread }) {
    switch (page) {
        case 'dashboard': return <DashboardPage profile={profile} session={session} onOpenExpiredModal={onOpenExpiredModal} setPage={setPage} />;
        case 'staff': return <StaffPage setPage={setPage} user={user} session={session} onOpenExpiredModal={onOpenExpiredModal} currentPageData={currentPageData} />;
        case 'staffDetail': return <StaffDetailPage currentPageData={currentPageData} setPage={setPage} user={user} session={session} onOpenExpiredModal={onOpenExpiredModal} />;
        case 'certificates': return <CertificatesPage user={user} session={session} onOpenExpiredModal={onOpenExpiredModal} currentPageData={currentPageData} />;
        case 'activities': return <ActivitiesPage user={user} session={session} />;
        case 'gapanalysis': return <GapAnalysisPage user={user} session={session} onOpenExpiredModal={onOpenExpiredModal} setPage={setPage} />;
        case 'support': return <SupportPage session={session} supportUnread={supportUnread} />;
        case 'admin-support': return <AdminSupportPage session={session} />;
        case 'subscription': return <SubscriptionPage user={user} session={session} />;
        default: return <div>Page not found</div>;
    }
}
