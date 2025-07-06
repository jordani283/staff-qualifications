import { supabase } from '../supabase.js';
import { showToast } from '../components/ui.jsx';

// Note: These functions will need backend API endpoints to actually work with Stripe
// This is the frontend service that calls your backend API

/**
 * Get current user's subscription details
 */
export async function getCurrentSubscription() {
    try {
        const { data, error } = await supabase
            .from('v_user_subscription_details')
            .select('*')
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Error fetching subscription:', error);
            return { error };
        }

        return { data: data || null };
    } catch (err) {
        console.error('Unexpected error fetching subscription:', err);
        return { error: err };
    }
}

/**
 * Get all available subscription plans
 */
export async function getSubscriptionPlans() {
    try {
        const { data, error } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('is_active', true)
            .order('sort_order');

        if (error) {
            console.error('Error fetching plans:', error);
            return { error };
        }

        return { data: data || [] };
    } catch (err) {
        console.error('Unexpected error fetching plans:', err);
        return { error: err };
    }
}

/**
 * Get user's payment methods
 */
export async function getPaymentMethods() {
    try {
        const { data, error } = await supabase
            .from('payment_methods')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching payment methods:', error);
            return { error };
        }

        return { data: data || [] };
    } catch (err) {
        console.error('Unexpected error fetching payment methods:', err);
        return { error: err };
    }
}

/**
 * Get user's invoices
 */
export async function getInvoices() {
    try {
        const { data, error } = await supabase
            .from('invoices')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(12); // Last 12 invoices

        if (error) {
            console.error('Error fetching invoices:', error);
            return { error };
        }

        return { data: data || [] };
    } catch (err) {
        console.error('Unexpected error fetching invoices:', err);
        return { error: err };
    }
}

/**
 * Create Stripe checkout session for subscription upgrade
 * This will need a backend API endpoint
 */
export async function createCheckoutSession(planId, billingCycle = 'monthly') {
    try {
        // Using your actual Supabase project reference
        const response = await fetch('https://uydysrzsvnclyxaqdsag.supabase.co/functions/v1/stripe-checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            },
            body: JSON.stringify({
                plan_id: planId,
                billing_cycle: billingCycle
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return { data };
    } catch (error) {
        console.error('Error creating checkout session:', error);
        showToast('Failed to create checkout session', 'error');
        return { error };
    }
}

/**
 * Create Stripe portal session for managing subscription/billing
 */
export async function createPortalSession() {
    console.log('Creating Stripe portal session...');
    try {
        // Use direct fetch to avoid x-client-info header causing CORS issues
        const session = await supabase.auth.getSession();
        const accessToken = session.data.session?.access_token;

        if (!accessToken) {
            throw new Error('No access token found. User might not be authenticated.');
        }

        const response = await fetch('https://uydysrzsvnclyxaqdsag.supabase.co/functions/v1/stripe-portal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`, // Ensure authorization is sent
            },
            body: JSON.stringify({
                return_url: window.location.href, // Send the current URL as return_url
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || response.statusText}`);
        }

        const data = await response.json();
        console.log('Frontend received data from Edge Function:', data);

        if (!data || !data.portal_url) {
            throw new Error('Portal URL not received from server.');
        }

        console.log('Portal session created:', data);
        return data; // Return the data object directly, which should contain portal_url
    } catch (err) {
        console.error('Error creating portal session:', err);
        throw err; // Re-throw the error to be handled by the calling component
    }
}

/**
 * Cancel subscription at period end
 * Uses Stripe Customer Portal for secure cancellation
 */
export async function cancelSubscription() {
    // This function simply calls createPortalSession, as the portal handles both
    // managing and cancelling subscriptions.
    return await createPortalSession();
}

/**
 * Reactivate a canceled subscription
 * Uses Stripe Customer Portal for secure reactivation
 */
export async function reactivateSubscription() {
    showToast('Redirecting to billing portal to reactivate subscription...', 'success');
    return await createPortalSession();
}

/**
 * Change billing cycle (monthly/yearly)
 * Uses Stripe Customer Portal for secure billing changes
 */
export async function changeBillingCycle(newCycle) {
    showToast('Redirecting to billing portal to change billing cycle...', 'success');
    return await createPortalSession();
}

/**
 * Format price for display
 */
export function formatPrice(priceInPence, currency = 'GBP') {
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0
    }).format(priceInPence / 100);
}

/**
 * Format date for display
 */
export function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Get subscription status color and text
 */
export function getSubscriptionStatusDisplay(status) {
    const statusMap = {
        'active': { 
            color: 'text-green-400 bg-green-400/10', 
            text: 'Active',
            description: 'Your subscription is active and current'
        },
        'trial': { 
            color: 'text-blue-400 bg-blue-400/10', 
            text: 'Trial',
            description: 'You are currently on a free trial'
        },
        'trial_expired': { 
            color: 'text-red-400 bg-red-400/10', 
            text: 'Trial Expired',
            description: 'Your trial has expired. Please upgrade to continue using the service.'
        },
        'trialing': { 
            color: 'text-blue-400 bg-blue-400/10', 
            text: 'Trial',
            description: 'You are currently on a free trial'
        },
        'past_due': { 
            color: 'text-amber-400 bg-amber-400/10', 
            text: 'Past Due',
            description: 'Payment failed - please update your payment method'
        },
        'canceled': { 
            color: 'text-red-400 bg-red-400/10', 
            text: 'Canceled',
            description: 'Your subscription has been canceled'
        },
        'unpaid': { 
            color: 'text-red-400 bg-red-400/10', 
            text: 'Unpaid',
            description: 'Payment required to continue service'
        },
        'incomplete': { 
            color: 'text-amber-400 bg-amber-400/10', 
            text: 'Incomplete',
            description: 'Subscription setup needs to be completed'
        }
    };

    return statusMap[status] || { 
        color: 'text-slate-400 bg-slate-400/10', 
        text: 'Unknown',
        description: 'Subscription status unknown'
    };
}

/**
 * Calculate savings for yearly vs monthly billing
 */
export function calculateYearlySavings(monthlyPrice, yearlyPrice) {
    const monthlyAnnual = monthlyPrice * 12;
    const savings = monthlyAnnual - yearlyPrice;
    const savingsPercentage = Math.round((savings / monthlyAnnual) * 100);
    return {
        savings: savings,
        savingsFormatted: formatPrice(savings),
        percentage: savingsPercentage
    };
} 