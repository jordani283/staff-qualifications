import { useState } from 'react';
import Dialog from './Dialog.jsx';
import { supabase } from '../supabase.js';
import { showToast } from './ui.jsx';

export default function ResetPasswordModal({ isOpen, onClose, onSuccess }) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        if (!password || password.length < 8) {
            showToast('Password must be at least 8 characters', 'error');
            return;
        }
        if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }
        try {
            setIsSubmitting(true);
            const { error } = await supabase.auth.updateUser({ password });
            if (error) {
                showToast(error.message, 'error');
                return;
            }
            showToast('Password updated. You are now signed in.', 'success');
            onClose?.();
            onSuccess?.();
        } catch (err) {
            showToast('Unable to update password. Try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog id="reset-password-modal" title="Set a new password" onClose={onClose} size="small">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">New password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter a new password"
                        className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                        required
                        minLength={8}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Confirm password</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your new password"
                        className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                        required
                        minLength={8}
                    />
                </div>
                <div className="flex items-center gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
                    >
                        {isSubmitting ? 'Saving...' : 'Update password'}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-600 hover:text-slate-800 font-medium"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </Dialog>
    );
}


