import { ShieldCheck } from 'lucide-react';
import { supabase } from '../supabase.js';
import { showToast } from '../components/ui';

export default function LoginPage({ setPage }) {
    const handleLogin = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const { email, password } = Object.fromEntries(formData.entries());
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) showToast(error.message, 'error');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <ShieldCheck className="text-emerald-600 h-8 w-8" />
                            <span className="text-2xl font-bold text-slate-900">TeamCertify</span>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900">Welcome Back</h1>
                        <p className="text-slate-600 mt-2">Sign in to manage your team's compliance.</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                            <input 
                                id="email" 
                                name="email" 
                                type="email" 
                                required 
                                placeholder="Enter your email"
                                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" 
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                            <input 
                                id="password" 
                                name="password" 
                                type="password" 
                                required 
                                placeholder="Enter your password"
                                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" 
                            />
                        </div>
                        <button 
                            type="submit" 
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors shadow-sm"
                        >
                            Sign In
                        </button>
                    </form>
                    <div className="mt-8 space-y-4 text-center">
                        <p className="text-slate-600">
                            Don't have an account?{' '}
                            <a 
                                href="#" 
                                onClick={() => setPage('signup')} 
                                className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                            >
                                Sign up
                            </a>
                        </p>
                        <p className="text-slate-500">
                            <a 
                                href="#" 
                                onClick={() => setPage('landing')} 
                                className="font-medium hover:text-slate-700 transition-colors"
                            >
                                ← Back to Home
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
} 