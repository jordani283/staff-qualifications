import { ShieldCheck } from 'lucide-react';
import { supabase } from '../supabase.js';
import { showToast } from '../components/ui';

export default function SignupPage({ setPage }) {
    const handleSignup = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const { email, password } = Object.fromEntries(formData.entries());
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
            showToast(error.message, 'error');
        } else {
            showToast('Success! Please check your email to verify your account.', 'success');
        }
    };

    return (
        <div className="w-full h-full flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <ShieldCheck className="text-sky-400 h-12 w-12 mx-auto" />
                    <h1 className="text-3xl font-bold text-white mt-4">Create Account</h1>
                    <p className="text-slate-400 mt-1">Start tracking compliance in minutes.</p>
                </div>
                <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                        <input id="email" name="email" type="email" required className="w-full bg-slate-800 border-slate-700 rounded-md p-2.5 text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500" />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                        <input id="password" name="password" type="password" required className="w-full bg-slate-800 border-slate-700 rounded-md p-2.5 text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500" />
                    </div>
                    <button type="submit" className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 px-4 rounded-md transition-colors">Sign Up</button>
                </form>
                <p className="text-center mt-6 text-slate-400">
                    Already have an account? <a href="#" onClick={() => setPage('login')} className="font-medium text-sky-400 hover:text-sky-300">Log in</a>
                </p>
            </div>
        </div>
    );
}
