import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import {
    ShieldCheck, LayoutDashboard, Users, FileSpreadsheet, LogOut
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

// --- Main App Component ---
export default function App() {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState('landing');
    const [currentPageData, setCurrentPageData] = useState({});

    useEffect(() => {
        const getInitialData = async () => {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .maybeSingle();
                
                setUser(session.user);
                setProfile(profile);
            }
            setLoading(false);
        };

        getInitialData();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setLoading(true);
            if (session?.user) {
                 const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .maybeSingle();
                
                setUser(session.user);
                setProfile(profile);
            } else {
                setUser(null);
                setProfile(null);
                setPage('landing');
            }
            setLoading(false);
        });

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, []);

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
                <PageContent page={page} currentPageData={currentPageData} setPage={handleSetPage} user={user} />
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
                    <span className="font-bold text-lg text-white">CertiTrack</span>
                </div>
                <div className="flex-grow space-y-2">
                    <a href="#" className={navItemClass('dashboard')} onClick={() => setPage('dashboard')}><LayoutDashboard className="mr-3 h-5 w-5" />Dashboard</a>
                    <a href="#" className={navItemClass('staff')} onClick={() => setPage('staff')}><Users className="mr-3 h-5 w-5" />Staff</a>
                    <a href="#" className={navItemClass('certificates')} onClick={() => setPage('certificates')}><FileSpreadsheet className="mr-3 h-5 w-5" />Certificates</a>
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

function PageContent({ page, currentPageData, setPage, user }) {
    switch (page) {
        case 'dashboard': return <DashboardPage />;
        case 'staff': return <StaffPage setPage={setPage} user={user} />;
        case 'staffDetail': return <StaffDetailPage staffMember={currentPageData.staffMember} setPage={setPage} user={user} />;
        case 'certificates': return <CertificatesPage user={user} />;
        default: return <div>Page not found</div>;
    }
}
