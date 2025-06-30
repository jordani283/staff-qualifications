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
        <div className="w-full h-full flex items-center justify-center p-4">
            <div className="w-full max-w-md text-center">
                <h1 className="text-3xl font-bold text-white">One Last Step</h1>
                <p className="text-slate-400 mt-2 mb-6">Let's set up your profile and company information.</p>
                <form onSubmit={handleOnboarding} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="first_name" className="block text-sm font-medium text-slate-300 mb-1 text-left">First Name</label>
                            <input id="first_name" name="first_name" type="text" required className="w-full bg-slate-800 border-slate-700 rounded-md p-2.5 text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500" />
                        </div>
                        <div>
                            <label htmlFor="last_name" className="block text-sm font-medium text-slate-300 mb-1 text-left">Last Name</label>
                            <input id="last_name" name="last_name" type="text" required className="w-full bg-slate-800 border-slate-700 rounded-md p-2.5 text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="company_name" className="block text-sm font-medium text-slate-300 mb-1 text-left">Company Name</label>
                        <input id="company_name" name="company_name" type="text" required className="w-full bg-slate-800 border-slate-700 rounded-md p-2.5 text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500" />
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 px-4 rounded-md transition-colors disabled:opacity-50">
                        {isSubmitting ? 'Saving...' : 'Save and Continue'}
                    </button>
                </form>
            </div>
        </div>
    );
}
