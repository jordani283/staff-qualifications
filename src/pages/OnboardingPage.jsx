import { useState } from 'react';
import { supabase } from '../supabase.js';
import { showToast } from '../components/ui';

export default function OnboardingPage({ user, onProfileUpdate }) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleOnboarding = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.target);

        const profileData = {
            id: user.id,
            first_name: formData.get('first_name'),
            last_name: formData.get('last_name'),
            company_name: formData.get('company_name'),
            updated_at: new Date(),
        };

        const { error } = await supabase
            .from('profiles')
            .upsert(profileData, {
                onConflict: 'id',
            });

        setIsSubmitting(false);

        if (error) {
            showToast(error.message, 'error');
        } else {
            showToast('Profile updated successfully!', 'success');
            onProfileUpdate();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <img src="/logo-mark.svg" alt="TeamCertify" className="h-8 w-8" />
                            <span className="text-2xl font-bold text-slate-900">TeamCertify</span>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900">One Last Step</h1>
                        <p className="text-slate-600 mt-2">Let's set up your profile and company information.</p>
                    </div>
                    <form onSubmit={handleOnboarding} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="first_name" className="block text-sm font-medium text-slate-700 mb-2">First Name</label>
                                <input 
                                    id="first_name" 
                                    name="first_name" 
                                    type="text" 
                                    required 
                                    placeholder="Enter first name"
                                    className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" 
                                />
                            </div>
                            <div>
                                <label htmlFor="last_name" className="block text-sm font-medium text-slate-700 mb-2">Last Name</label>
                                <input 
                                    id="last_name" 
                                    name="last_name" 
                                    type="text" 
                                    required 
                                    placeholder="Enter last name"
                                    className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" 
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="company_name" className="block text-sm font-medium text-slate-700 mb-2">Company Name</label>
                            <input 
                                id="company_name" 
                                name="company_name" 
                                type="text" 
                                required 
                                placeholder="Enter your care home name"
                                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" 
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={isSubmitting} 
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : 'Save and Continue'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
