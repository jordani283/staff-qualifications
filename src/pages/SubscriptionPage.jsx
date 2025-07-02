import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';
import { Spinner, showToast } from '../components/ui';
import { 
    CreditCard, 
    Download, 
    Calendar, 
    CheckCircle, 
    AlertTriangle, 
    XCircle,
    Crown,
    Settings,
    ArrowUpCircle,
    ArrowDownCircle,
    RefreshCw,
    ExternalLink,
    Mail,
    Phone
} from 'lucide-react';
import {
    getCurrentSubscription,
    getSubscriptionPlans,
    getPaymentMethods,
    getInvoices,
    createCheckoutSession,
    createPortalSession,
    cancelSubscription,
    reactivateSubscription,
    changeBillingCycle,
    formatPrice,
    formatDate,
    getSubscriptionStatusDisplay,
    calculateYearlySavings
} from '../utils/stripeService.js';

export default function SubscriptionPage({ user }) {
    const [subscription, setSubscription] = useState(null);
    const [plans, setPlans] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState('');

    // Fetch all subscription data
    const fetchSubscriptionData = useCallback(async () => {
        setLoading(true);
        try {
            const [subResult, plansResult, pmResult, invoicesResult] = await Promise.all([
                getCurrentSubscription(),
                getSubscriptionPlans(),
                getPaymentMethods(),
                getInvoices()
            ]);

            if (subResult.error) {
                console.error('Error fetching subscription:', subResult.error);
            } else {
                setSubscription(subResult.data);
            }

            if (plansResult.error) {
                console.error('Error fetching plans:', plansResult.error);
                showToast('Failed to load subscription plans', 'error');
            } else {
                setPlans(plansResult.data);
            }

            if (pmResult.error) {
                console.error('Error fetching payment methods:', pmResult.error);
            } else {
                setPaymentMethods(pmResult.data);
            }

            if (invoicesResult.error) {
                console.error('Error fetching invoices:', invoicesResult.error);
            } else {
                setInvoices(invoicesResult.data);
            }

        } catch (error) {
            console.error('Error fetching subscription data:', error);
            showToast('Failed to load subscription information', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSubscriptionData();
    }, [fetchSubscriptionData]);

    const handleUpgrade = async (planId, billingCycle) => {
        setActionLoading(`upgrade-${planId}-${billingCycle}`);
        const result = await createCheckoutSession(planId, billingCycle);
        if (result.data?.url) {
            window.location.href = result.data.url;
        }
        setActionLoading('');
    };

    const handleManageBilling = async () => {
        setActionLoading('portal');
        const result = await createPortalSession();
        if (result.data?.url) {
            window.open(result.data.url, '_blank');
        }
        setActionLoading('');
    };

    const handleCancelSubscription = async () => {
        if (window.confirm('Are you sure you want to cancel your subscription? It will remain active until the end of your current billing period.')) {
            setActionLoading('cancel');
            await cancelSubscription();
            await fetchSubscriptionData(); // Refresh data
            setActionLoading('');
        }
    };

    const handleReactivateSubscription = async () => {
        setActionLoading('reactivate');
        await reactivateSubscription();
        await fetchSubscriptionData(); // Refresh data
        setActionLoading('');
    };

    const handleChangeBillingCycle = async (newCycle) => {
        setActionLoading(`billing-${newCycle}`);
        await changeBillingCycle(newCycle);
        await fetchSubscriptionData(); // Refresh data
        setActionLoading('');
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'active': return <CheckCircle className="w-5 h-5 text-green-400" />;
            case 'trial': return <Crown className="w-5 h-5 text-blue-400" />;
            case 'trial_expired': return <XCircle className="w-5 h-5 text-red-400" />;
            case 'trialing': return <Crown className="w-5 h-5 text-blue-400" />;
            case 'past_due': return <AlertTriangle className="w-5 h-5 text-amber-400" />;
            case 'canceled': return <XCircle className="w-5 h-5 text-red-400" />;
            default: return <AlertTriangle className="w-5 h-5 text-slate-400" />;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center p-12">
                <Spinner />
            </div>
        );
    }

    const statusDisplay = getSubscriptionStatusDisplay(subscription?.subscription_status || 'trial');

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white">Subscription Management</h1>
                <p className="text-slate-400 mt-2">Manage your subscription, billing, and payment methods.</p>
            </div>

            {/* Current Subscription Status */}
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        {getStatusIcon(subscription?.subscription_status)}
                        Current Subscription
                    </h2>
                    <button
                        onClick={handleManageBilling}
                        disabled={actionLoading === 'portal'}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors disabled:opacity-50"
                    >
                        {actionLoading === 'portal' ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <Settings className="w-4 h-4" />
                        )}
                        Manage Billing
                        <ExternalLink className="w-3 h-3" />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Plan Details */}
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-sm font-medium text-slate-300 mb-2">Current Plan</h3>
                            <div className="flex items-center gap-3">
                                <span className="text-2xl font-bold text-white">
                                    {subscription?.subscription_status === 'trial' 
                                        ? `${subscription?.plan_name || 'Starter'} Trial`
                                        : subscription?.subscription_status === 'trial_expired'
                                        ? `${subscription?.plan_name || 'Starter'} Trial (Expired)`
                                        : (subscription?.plan_name || 'Starter')
                                    }
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusDisplay.color}`}>
                                    {statusDisplay.text}
                                </span>
                            </div>
                            <p className="text-slate-400 text-sm mt-1">
                                {subscription?.subscription_status === 'trial' 
                                    ? 'Exploring all features with full access during your free trial period.'
                                    : subscription?.subscription_status === 'trial_expired'
                                    ? 'Your trial has ended. Upgrade to restore full access to all features.'
                                    : (subscription?.plan_description || 'Perfect for small teams getting started with staff qualifications tracking.')
                                }
                            </p>
                        </div>

                        <div>
                            <h4 className="text-sm font-medium text-slate-300 mb-2">Billing</h4>
                            <div className="text-white">
                                {subscription?.subscription_status === 'trial' ? (
                                    <>
                                        <span className="text-green-400 font-semibold">Free</span>
                                        <span className="text-slate-400 text-sm ml-1">during trial</span>
                                    </>
                                ) : subscription?.subscription_status === 'trial_expired' ? (
                                    <>
                                        <span className="text-red-400 font-semibold">Trial Ended</span>
                                        <span className="text-slate-400 text-sm ml-1">upgrade required</span>
                                    </>
                                ) : (
                                    <>
                                        {subscription?.current_price ? formatPrice(subscription.current_price) : '£49'} 
                                        <span className="text-slate-400 text-sm ml-1">
                                            / {subscription?.billing_cycle || 'monthly'}
                                        </span>
                                    </>
                                )}
                            </div>
                            {subscription?.subscription_status === 'trial' && (
                                <div className="text-xs text-slate-400 mt-1">
                                    Then {subscription?.current_price ? formatPrice(subscription.current_price) : '£49'} / {subscription?.billing_cycle || 'monthly'}
                                </div>
                            )}
                            {subscription?.subscription_status === 'trial_expired' && (
                                <div className="text-xs text-red-400 mt-1">
                                    Upgrade to {subscription?.current_price ? formatPrice(subscription.current_price) : '£49'} / {subscription?.billing_cycle || 'monthly'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="space-y-4">
                        {/* Trial End Date - check both trial_ends_at (profiles) and trial_end (Stripe) */}
                        {((subscription?.trial_ends_at && new Date(subscription.trial_ends_at) > new Date()) || 
                          (subscription?.trial_end && new Date(subscription.trial_end) > new Date())) && (
                            <div>
                                <h4 className="text-sm font-medium text-slate-300 mb-1">Trial Ends</h4>
                                <div className="flex items-center gap-2 text-white">
                                    <Crown className="w-4 h-4 text-blue-400" />
                                    {formatDate(subscription.trial_ends_at || subscription.trial_end)}
                                </div>
                                {/* Show days remaining */}
                                <div className="text-sm text-blue-400 mt-1">
                                    {(() => {
                                        const trialEndDate = new Date(subscription.trial_ends_at || subscription.trial_end);
                                        const today = new Date();
                                        const daysRemaining = Math.ceil((trialEndDate - today) / (1000 * 60 * 60 * 24));
                                        return daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Trial expires today';
                                    })()}
                                </div>
                            </div>
                        )}

                        {/* Current period end for active subscriptions */}
                        {subscription?.current_period_end && subscription?.subscription_status !== 'trial' && (
                            <div>
                                <h4 className="text-sm font-medium text-slate-300 mb-1">
                                    {subscription?.cancel_at_period_end ? 'Cancels On' : 'Renews On'}
                                </h4>
                                <div className="flex items-center gap-2 text-white">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    {formatDate(subscription.current_period_end)}
                                </div>
                            </div>
                        )}

                        {/* Trial expired notice */}
                        {subscription?.subscription_status === 'trial' && 
                         subscription?.trial_ends_at && 
                         new Date(subscription.trial_ends_at) <= new Date() && (
                            <div>
                                <h4 className="text-sm font-medium text-red-300 mb-1">Trial Expired</h4>
                                <div className="flex items-center gap-2 text-red-400">
                                    <AlertTriangle className="w-4 h-4" />
                                    {formatDate(subscription.trial_ends_at)}
                                </div>
                                <div className="text-sm text-red-400 mt-1">
                                    Please upgrade to continue using the service
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        {subscription?.subscription_status === 'trial' ? (
                            /* Active trial user actions */
                            <div className="text-center py-2">
                                <div className="text-sm text-slate-400 mb-2">
                                    Trial in progress
                                </div>
                                <div className="text-xs text-slate-500">
                                    Choose a plan below to upgrade
                                </div>
                            </div>
                        ) : subscription?.subscription_status === 'trial_expired' ? (
                            /* Expired trial user actions */
                            <div className="text-center py-2">
                                <div className="text-sm text-red-300 mb-2 font-medium">
                                    Trial Expired
                                </div>
                                <div className="text-xs text-red-400 mb-3">
                                    Please upgrade to continue using the service
                                </div>
                                <div className="bg-red-600/20 border border-red-600 rounded-md p-3">
                                    <div className="text-xs text-red-300">
                                        Choose a plan below to restore access
                                    </div>
                                </div>
                            </div>
                        ) : subscription?.cancel_at_period_end ? (
                            <button
                                onClick={handleReactivateSubscription}
                                disabled={actionLoading === 'reactivate'}
                                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {actionLoading === 'reactivate' ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    <CheckCircle className="w-4 h-4" />
                                )}
                                Reactivate
                            </button>
                        ) : (
                            <button
                                onClick={handleCancelSubscription}
                                disabled={actionLoading === 'cancel'}
                                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {actionLoading === 'cancel' ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    <XCircle className="w-4 h-4" />
                                )}
                                Cancel Subscription
                            </button>
                        )}

                        {/* Billing Cycle Toggle */}
                        {subscription?.subscription_status === 'active' && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-slate-300">Billing Cycle</h4>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleChangeBillingCycle('monthly')}
                                        disabled={subscription?.billing_cycle === 'monthly' || actionLoading.includes('billing')}
                                        className={`flex-1 px-3 py-2 text-xs rounded-md transition-colors ${
                                            subscription?.billing_cycle === 'monthly'
                                                ? 'bg-sky-600 text-white'
                                                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                        } disabled:opacity-50`}
                                    >
                                        Monthly
                                    </button>
                                    <button
                                        onClick={() => handleChangeBillingCycle('yearly')}
                                        disabled={subscription?.billing_cycle === 'yearly' || actionLoading.includes('billing')}
                                        className={`flex-1 px-3 py-2 text-xs rounded-md transition-colors ${
                                            subscription?.billing_cycle === 'yearly'
                                                ? 'bg-sky-600 text-white'
                                                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                        } disabled:opacity-50`}
                                    >
                                        Yearly
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {statusDisplay.description && (
                    <div className="mt-4 p-3 bg-slate-700/50 rounded-md">
                        <p className="text-sm text-slate-300">{statusDisplay.description}</p>
                    </div>
                )}
            </div>

            {/* Available Plans */}
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
                <h2 className="text-xl font-semibold text-white mb-6">Available Plans</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan) => {
                        const isCurrentPlan = subscription?.subscription_plan === plan.id;
                        const isUpgrade = plans.findIndex(p => p.id === subscription?.subscription_plan) < plans.findIndex(p => p.id === plan.id);
                        const yearlySavings = calculateYearlySavings(plan.monthly_price, plan.yearly_price);

                        return (
                            <div key={plan.id} className={`relative p-6 rounded-lg border ${
                                isCurrentPlan 
                                    ? 'border-sky-500 bg-sky-500/5' 
                                    : 'border-slate-700 bg-slate-800/30'
                            }`}>
                                {isCurrentPlan && (
                                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                        <span className="bg-sky-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                                            Current Plan
                                        </span>
                                    </div>
                                )}

                                <div className="text-center mb-6">
                                    <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                                    <p className="text-slate-400 text-sm mb-4">{plan.description}</p>
                                    
                                    <div className="space-y-2">
                                        <div className="text-3xl font-bold text-white">
                                            {formatPrice(plan.monthly_price)}
                                            <span className="text-lg text-slate-400 font-normal">/month</span>
                                        </div>
                                        <div className="text-sm text-slate-300">
                                            or {formatPrice(plan.yearly_price)}/year 
                                            <span className="text-green-400 ml-1">
                                                (save {yearlySavings.savingsFormatted})
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Features */}
                                <ul className="space-y-2 mb-6 text-sm">
                                    {(plan.features || []).map((feature, index) => (
                                        <li key={index} className="flex items-start gap-2 text-slate-300">
                                            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                {/* Action Buttons */}
                                <div className="space-y-2">
                                    {isCurrentPlan ? (
                                        <div className="text-center py-2 text-slate-400 text-sm">
                                            Your current plan
                                        </div>
                                    ) : isUpgrade ? (
                                        <>
                                            <button
                                                onClick={() => handleUpgrade(plan.id, 'monthly')}
                                                disabled={actionLoading.includes(`upgrade-${plan.id}`)}
                                                className="w-full px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {actionLoading === `upgrade-${plan.id}-monthly` ? (
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <ArrowUpCircle className="w-4 h-4" />
                                                )}
                                                Upgrade Monthly
                                            </button>
                                            <button
                                                onClick={() => handleUpgrade(plan.id, 'yearly')}
                                                disabled={actionLoading.includes(`upgrade-${plan.id}`)}
                                                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {actionLoading === `upgrade-${plan.id}-yearly` ? (
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <ArrowUpCircle className="w-4 h-4" />
                                                )}
                                                Upgrade Yearly
                                            </button>
                                        </>
                                    ) : (
                                        <div className="text-center space-y-2">
                                            <div className="flex items-center justify-center gap-2 text-amber-400 text-sm">
                                                <ArrowDownCircle className="w-4 h-4" />
                                                Contact us for downgrades
                                            </div>
                                            <div className="flex gap-2">
                                                <a href="mailto:support@teamcertify.com" className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors text-center text-sm flex items-center justify-center gap-1">
                                                    <Mail className="w-3 h-3" />
                                                    Email
                                                </a>
                                                <a href="tel:+441234567890" className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors text-center text-sm flex items-center justify-center gap-1">
                                                    <Phone className="w-3 h-3" />
                                                    Call
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white">Payment Methods</h2>
                    <button
                        onClick={handleManageBilling}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-md transition-colors flex items-center gap-2"
                    >
                        <CreditCard className="w-4 h-4" />
                        Manage Payment Methods
                    </button>
                </div>

                {paymentMethods.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No payment methods found</p>
                        <p className="text-sm">Payment methods will appear here once you add them</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {paymentMethods.map((pm) => (
                            <div key={pm.id} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-md">
                                <div className="flex items-center gap-3">
                                    <CreditCard className="w-5 h-5 text-slate-400" />
                                    <div>
                                        <div className="text-white font-medium">
                                            {pm.brand?.toUpperCase()} •••• {pm.last4}
                                        </div>
                                        <div className="text-slate-400 text-sm">
                                            Expires {pm.exp_month}/{pm.exp_year}
                                        </div>
                                    </div>
                                </div>
                                {pm.is_default && (
                                    <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full">
                                        Default
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Recent Invoices */}
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
                <h2 className="text-xl font-semibold text-white mb-6">Recent Invoices</h2>

                {invoices.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        <Download className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No invoices found</p>
                        <p className="text-sm">Your invoices will appear here after your first payment</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="text-left border-b border-slate-700">
                                <tr>
                                    <th className="pb-3 text-slate-300 font-medium">Date</th>
                                    <th className="pb-3 text-slate-300 font-medium">Amount</th>
                                    <th className="pb-3 text-slate-300 font-medium">Status</th>
                                    <th className="pb-3 text-slate-300 font-medium">Invoice</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {invoices.map((invoice) => (
                                    <tr key={invoice.id}>
                                        <td className="py-3 text-slate-300">
                                            {formatDate(invoice.created_at)}
                                        </td>
                                        <td className="py-3 text-white font-medium">
                                            {formatPrice(invoice.amount_paid, invoice.currency?.toUpperCase())}
                                        </td>
                                        <td className="py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                invoice.status === 'paid' 
                                                    ? 'text-green-400 bg-green-400/10'
                                                    : 'text-amber-400 bg-amber-400/10'
                                            }`}>
                                                {invoice.status}
                                            </span>
                                        </td>
                                        <td className="py-3">
                                            <div className="flex gap-2">
                                                {invoice.invoice_pdf && (
                                                    <a
                                                        href={invoice.invoice_pdf}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm transition-colors"
                                                    >
                                                        <Download className="w-3 h-3" />
                                                        PDF
                                                    </a>
                                                )}
                                                {invoice.hosted_invoice_url && (
                                                    <a
                                                        href={invoice.hosted_invoice_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm transition-colors"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                        View
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
} 