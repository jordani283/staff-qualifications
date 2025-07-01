import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import {
    ShieldCheck, LayoutDashboard, Users, FileSpreadsheet, Clock, CreditCard, LogOut
} from 'lucide-react';
import { Spinner } from './components/ui';

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
import SubscriptionPage from './pages/SubscriptionPage';

// --- Main App Component ---
export default function App() {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState('landing');
    const [currentPageData, setCurrentPageData] = useState({});
    const [stripeSessionId, setStripeSessionId] = useState(null);
    
    // Use refs to track current user ID and profile across renders and auth events
    const currentUserIdRef = useRef(null);
    const currentProfileRef = useRef(null);
    const isInitializedRef = useRef(false);

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
        pageContent = (
            <MainLayout page={page} profile={profile} user={user} setPage={handleSetPage}>
                <PageContent page={page} currentPageData={currentPageData} setPage={handleSetPage} user={user} profile={profile} />
            </MainLayout>
        );
    }
    
    return <div id="app" className={page === 'landing' || page === 'pricing' ? '' : 'flex h-screen w-screen overflow-hidden'}>{pageContent}</div>;
}

// --- Layout Components ---
function MainLayout({ page, profile, user, setPage, children }) {
    const navItemClass = (pageName) => `flex items-center px-4 py-2.5 rounded-lg transition-colors ${page === pageName ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`;

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <>
            <nav className="bg-slate-950/70 border-r border-slate-800 w-64 p-4 flex-col flex-shrink-0 hidden md:flex">
                <div className="flex items-center gap-3 px-2 mb-8">
                    <ShieldCheck className="text-sky-400 h-8 w-8" />
                    <span className="font-bold text-lg text-white">TeamCertify</span>
                </div>
                <div className="flex-grow space-y-2">
                    <a href="#" className={navItemClass('dashboard')} onClick={() => setPage('dashboard')}><LayoutDashboard className="mr-3 h-5 w-5" />Dashboard</a>
                    <a href="#" className={navItemClass('staff')} onClick={() => setPage('staff')}><Users className="mr-3 h-5 w-5" />Staff</a>
                    <a href="#" className={navItemClass('certificates')} onClick={() => setPage('certificates')}><FileSpreadsheet className="mr-3 h-5 w-5" />Certificates</a>
                    <a href="#" className={navItemClass('activities')} onClick={() => setPage('activities')}><Clock className="mr-3 h-5 w-5" />Activities</a>
                    <a href="#" className={navItemClass('subscription')} onClick={() => setPage('subscription')}><CreditCard className="mr-3 h-5 w-5" />Subscription</a>
                </div>
                <div className="text-sm">
                    <div className="p-2 text-slate-300 font-medium">{profile?.company_name || '...'}</div>
                    <div className="p-2 text-slate-500 truncate">{user?.email || '...'}</div>
                    <button onClick={handleLogout} className="flex w-full items-center px-2 py-2.5 rounded-lg text-slate-400 hover:bg-red-900/20 hover:text-red-400 transition-colors">
                        <LogOut className="mr-3 h-5 w-5" />Logout
                    </button>
                </div>
            </nav>
            <main id="main-content" className="flex-1 bg-slate-900 p-4 sm:p-6 md:p-8 overflow-y-auto">
                <div className="page-enter">{children}</div>
            </main>
        </>
    );
}

function PageContent({ page, currentPageData, setPage, user, profile }) {
    switch (page) {
        case 'dashboard': return <DashboardPage profile={profile} />;
        case 'staff': return <StaffPage setPage={setPage} user={user} />;
        case 'staffDetail': return <StaffDetailPage staffMember={currentPageData.staffMember} setPage={setPage} user={user} />;
        case 'certificates': return <CertificatesPage user={user} />;
        case 'activities': return <ActivitiesPage user={user} />;
        case 'subscription': return <SubscriptionPage user={user} />;
        default: return <div>Page not found</div>;
    }
}
