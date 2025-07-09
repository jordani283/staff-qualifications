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
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState('');
    const [error, setError] = useState(null);

    // Static plans data matching the landing page
    const plans = [
        {
            id: 'starter',
            name: "Starter",
            description: "Perfect for getting started or for very small teams.",
            price: "£29",
            period: "/month",
            yearlyPrice: "£290",
            yearlyPeriod: "/year",
            yearlySavings: "2 months free",
            staffLimit: "10",
            features: [
                "Automated expiry reminders via email",
                "Color-coded certification status (green/amber/red)",
                "Certificate document storage & secure uploads",
                "Pre-defined certification templates with automatic expiry calculations",
                "Real-time dashboard with compliance metrics",
                "Gap analysis to find missing certifications",
                "Renewal system with complete audit trails",
                "CSV export of staff certification data"
            ],
            popular: false
        },
        {
            id: 'growth',
            name: "Growth",
            description: "Our most popular plan for growing care homes. Includes all automated reminders and reporting.",
            price: "£79",
            period: "/month",
            yearlyPrice: "£790",
            yearlyPeriod: "/year",
            yearlySavings: "2 months free",
            staffLimit: "50",
            features: [
                "All Starter plan features",
                "Everything you need for growing teams"
            ],
            popular: true
        },
        {
            id: 'professional',
            name: "Professional",
            description: "For larger organisations needing full compliance oversight.",
            price: "£199",
            period: "/month",
            yearlyPrice: "£1,990",
            yearlyPeriod: "/year", 
            yearlySavings: "2 months free",
            staffLimit: "200",
            features: [
                "All Starter plan features",
                "Perfect for large organizations"
            ],
            popular: false
        }
    ];

    // Fetch all subscription data
    const fetchSubscriptionData = useCallback(async () => {
        setLoading(true);
        try {
            const [subResult, pmResult, invoicesResult] = await Promise.all([
                getCurrentSubscription(),
                getPaymentMethods(),
                getInvoices()
            ]);

            if (subResult.error) {
                console.error('Error fetching subscription:', subResult.error);
            } else {
                setSubscription(subResult.data);
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
        try {
            const result = await createPortalSession();
            if (result.portal_url) {
                window.location.href = result.portal_url;
            } else {
                throw new Error('Failed to retrieve billing portal URL.');
            }
        } catch (err) {
            console.error('Failed to open billing portal:', err);
            setError(err.message);
        } finally {
            setActionLoading('');
        }
    };

    const handleCancelSubscription = async () => {
        if (window.confirm('Are you sure you want to cancel your subscription? It will remain active until the end of your current billing period.')) {
            setActionLoading('cancel');
            setError(null);
            try {
                const { portal_url } = await cancelSubscription();

                if (portal_url) {
                    window.location.href = portal_url;
                } else {
                    throw new Error('Failed to retrieve Stripe Portal URL.');
                }
            } catch (err) {
                console.error('Failed to handle cancellation:', err);
                setError(err.message);
            } finally {
                setActionLoading('');
            }
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
                <h1 className="text-3xl font-bold text-slate-900">Subscription Management</h1>
                <p className="text-slate-600 mt-2">Manage your subscription, billing, and payment methods.</p>
            </div>

            {/* Current Subscription Status */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                        {getStatusIcon(subscription?.subscription_status)}
                        Current Subscription
                    </h2>
                    <button
                        onClick={handleManageBilling}
                        disabled={actionLoading === 'portal'}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-colors disabled:opacity-50"
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
                            <h3 className="text-sm font-medium text-slate-700 mb-2">Current Plan</h3>
                            <div className="flex items-center gap-3">
                                <span className="text-2xl font-bold text-slate-900">
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
                            <p className="text-slate-600 text-sm mt-1">
                                {subscription?.subscription_status === 'trial' 
                                    ? 'Exploring all features with full access during your free trial period.'
                                    : subscription?.subscription_status === 'trial_expired'
                                    ? 'Your trial has ended. Upgrade to restore full access to all features.'
                                    : (subscription?.plan_description || 'Perfect for small teams getting started with staff qualifications tracking.')
                                }
                            </p>
                        </div>

                        <div>
                            <h4 className="text-sm font-medium text-slate-700 mb-2">Billing</h4>
                            <div className="text-slate-900">
                                {subscription?.subscription_status === 'trial' ? (
                                    <>
                                        <span className="text-emerald-600 font-semibold">Free</span>
                                        <span className="text-slate-600 text-sm ml-1">during trial</span>
                                    </>
                                ) : subscription?.subscription_status === 'trial_expired' ? (
                                    <>
                                        <span className="text-red-600 font-semibold">Trial Ended</span>
                                        <span className="text-slate-600 text-sm ml-1">upgrade required</span>
                                    </>
                                ) : (
                                    <>
                                        {subscription?.current_price ? formatPrice(subscription.current_price) : '£49'} 
                                        <span className="text-slate-600 text-sm ml-1">
                                            / {subscription?.billing_cycle || 'monthly'}
                                        </span>
                                    </>
                                )}
                            </div>
                            {subscription?.subscription_status === 'trial' && (
                                <div className="text-xs text-slate-600 mt-1">
                                    Then {subscription?.current_price ? formatPrice(subscription.current_price) : '£49'} / {subscription?.billing_cycle || 'monthly'}
                                </div>
                            )}
                            {subscription?.subscription_status === 'trial_expired' && (
                                <div className="text-xs text-red-600 mt-1">
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
                                <h4 className="text-sm font-medium text-slate-700 mb-1">Trial Ends</h4>
                                <div className="flex items-center gap-2 text-slate-900">
                                    <Crown className="w-4 h-4 text-blue-600" />
                                    {formatDate(subscription.trial_ends_at || subscription.trial_end)}
                                </div>
                                {/* Show days remaining */}
                                <div className="text-sm text-blue-600 mt-1">
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
                                <h4 className="text-sm font-medium text-slate-700 mb-1">
                                    {subscription?.cancel_at_period_end ? 'Cancels On' : 'Renews On'}
                                </h4>
                                <div className="flex items-center gap-2 text-slate-900">
                                    <Calendar className="w-4 h-4 text-slate-500" />
                                    {formatDate(subscription.current_period_end)}
                                </div>
                            </div>
                        )}

                        {/* Trial expired notice */}
                        {subscription?.subscription_status === 'trial' && 
                         subscription?.trial_ends_at && 
                         new Date(subscription.trial_ends_at) <= new Date() && (
                            <div>
                                <h4 className="text-sm font-medium text-red-600 mb-1">Trial Expired</h4>
                                <div className="flex items-center gap-2 text-red-600">
                                    <AlertTriangle className="w-4 h-4" />
                                    {formatDate(subscription.trial_ends_at)}
                                </div>
                                <div className="text-sm text-red-600 mt-1">
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
                                <div className="text-sm text-slate-600 mb-2">
                                    Trial in progress
                                </div>
                                <div className="text-xs text-slate-500">
                                    Choose a plan below to upgrade
                                </div>
                            </div>
                        ) : subscription?.subscription_status === 'trial_expired' ? (
                            /* Expired trial user actions */
                            <div className="text-center py-2">
                                <div className="text-sm text-red-600 mb-2 font-medium">
                                    Trial Expired
                                </div>
                                <div className="text-xs text-red-600 mb-3">
                                    Please upgrade to continue using the service
                                </div>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                    <div className="text-xs text-red-600">
                                        Choose a plan below to restore access
                                    </div>
                                </div>
                            </div>
                        ) : subscription?.cancel_at_period_end ? (
                            <button
                                onClick={handleReactivateSubscription}
                                disabled={actionLoading === 'reactivate'}
                                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
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
                                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                            >
                                {actionLoading === 'cancel' ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    <XCircle className="w-4 h-4" />
                                )}
                                Cancel Subscription
                            </button>
                        )}
                        
                        {error && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-600 text-sm">Error: {error}</p>
                            </div>
                        )}

                        {/* Billing Cycle Toggle */}
                        {subscription?.subscription_status === 'active' && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-slate-700">Billing Cycle</h4>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleChangeBillingCycle('monthly')}
                                        disabled={subscription?.billing_cycle === 'monthly' || actionLoading.includes('billing')}
                                        className={`flex-1 px-3 py-2 text-xs rounded-lg transition-colors ${
                                            subscription?.billing_cycle === 'monthly'
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900'
                                        } disabled:opacity-50`}
                                    >
                                        Monthly
                                    </button>
                                    <button
                                        onClick={() => handleChangeBillingCycle('yearly')}
                                        disabled={subscription?.billing_cycle === 'yearly' || actionLoading.includes('billing')}
                                        className={`flex-1 px-3 py-2 text-xs rounded-lg transition-colors ${
                                            subscription?.billing_cycle === 'yearly'
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900'
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
                    <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-700">{statusDisplay.description}</p>
                    </div>
                )}
            </div>

            {/* Available Plans */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Choose Your Plan</h2>
                    <p className="text-lg text-slate-600">Select based on the number of staff members you need to manage</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {plans.map((plan, index) => {
                        const isCurrentPlan = subscription?.subscription_plan === plan.id;
                        const isUpgrade = plans.findIndex(p => p.id === subscription?.subscription_plan) < plans.findIndex(p => p.id === plan.id);

                        return (
                            <div key={plan.id} className="relative">
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                        <div className="bg-emerald-600 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                                            <Crown className="w-4 h-4 mr-1" />
                                            Most Popular
                                        </div>
                                    </div>
                                )}
                                {isCurrentPlan && (
                                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                        <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                                            Current Plan
                                        </span>
                                    </div>
                                )}
                                
                                <div className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-8 h-full ${
                                    plan.popular ? 'ring-2 ring-emerald-600 ring-opacity-50' : 
                                    isCurrentPlan ? 'ring-2 ring-blue-600 ring-opacity-50' : ''
                                }`}>
                                    <div className="text-center mb-8">
                                        <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                                        
                                        {/* Staff Limit - Prominent Display */}
                                        <div className={`mb-4 p-3 rounded-lg border-2 ${
                                            plan.popular 
                                                ? 'bg-emerald-50 border-emerald-200' 
                                                : index === 0 
                                                    ? 'bg-blue-50 border-blue-200' 
                                                    : 'bg-purple-50 border-purple-200'
                                        }`}>
                                            <div className={`text-3xl font-bold ${
                                                plan.popular 
                                                    ? 'text-emerald-600' 
                                                    : index === 0 
                                                        ? 'text-blue-600' 
                                                        : 'text-purple-600'
                                            }`}>
                                                {plan.staffLimit}
                                            </div>
                                            <div className="text-sm font-medium text-slate-600">Staff Members</div>
                                        </div>

                                        <p className="text-slate-600 mb-6">{plan.description}</p>
                                        <div className="mb-4">
                                            <div className="mb-2">
                                                <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                                                <span className="text-slate-600">{plan.period}</span>
                                            </div>
                                            {plan.yearlyPrice && (
                                                <div className="text-sm text-slate-600">
                                                    or <span className="font-semibold">{plan.yearlyPrice}{plan.yearlyPeriod}</span>
                                                    <span className="text-emerald-600 ml-1">({plan.yearlySavings})</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <ul className="space-y-4 mb-8">
                                        {plan.features.map((feature, featureIndex) => (
                                            <li key={featureIndex} className="flex items-start">
                                                <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 mt-0.5 flex-shrink-0" />
                                                <span className="text-slate-700">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    
                                    <div className="mt-auto">
                                        {isCurrentPlan ? (
                                            <div className="text-center py-2 text-slate-600 text-sm">
                                                Your current plan
                                            </div>
                                        ) : isUpgrade ? (
                                            <div className="space-y-2">
                                                <button
                                                    onClick={() => handleUpgrade(plan.id, 'monthly')}
                                                    disabled={actionLoading.includes(`upgrade-${plan.id}`)}
                                                    className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
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
                                                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                                                >
                                                    {actionLoading === `upgrade-${plan.id}-yearly` ? (
                                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <ArrowUpCircle className="w-4 h-4" />
                                                    )}
                                                    Upgrade Yearly
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="text-center space-y-2">
                                                <div className="flex items-center justify-center gap-2 text-amber-600 text-sm">
                                                    <ArrowDownCircle className="w-4 h-4" />
                                                    Contact us for downgrades
                                                </div>
                                                <div className="flex gap-2">
                                                    <a href="mailto:support@teamcertify.com" className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-colors text-center text-sm flex items-center justify-center gap-1">
                                                        <Mail className="w-3 h-3" />
                                                        Email
                                                    </a>
                                                    <a href="tel:+441234567890" className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-colors text-center text-sm flex items-center justify-center gap-1">
                                                        <Phone className="w-3 h-3" />
                                                        Call
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-slate-900">Payment Methods</h2>
                    <button
                        onClick={handleManageBilling}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <CreditCard className="w-4 h-4" />
                        Manage Payment Methods
                    </button>
                </div>

                {paymentMethods.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No payment methods found</p>
                        <p className="text-sm">Payment methods will appear here once you add them</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {paymentMethods.map((pm) => (
                            <div key={pm.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <CreditCard className="w-5 h-5 text-slate-500" />
                                    <div>
                                        <div className="text-slate-900 font-medium">
                                            {pm.brand?.toUpperCase()} •••• {pm.last4}
                                        </div>
                                        <div className="text-slate-600 text-sm">
                                            Expires {pm.exp_month}/{pm.exp_year}
                                        </div>
                                    </div>
                                </div>
                                {pm.is_default && (
                                    <span className="px-2 py-1 bg-emerald-600 text-white text-xs rounded-full">
                                        Default
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Recent Invoices */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900 mb-6">Recent Invoices</h2>

                {invoices.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <Download className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No invoices found</p>
                        <p className="text-sm">Your invoices will appear here after your first payment</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="text-left border-b border-slate-200">
                                <tr>
                                    <th className="pb-3 text-slate-700 font-medium">Date</th>
                                    <th className="pb-3 text-slate-700 font-medium">Amount</th>
                                    <th className="pb-3 text-slate-700 font-medium">Status</th>
                                    <th className="pb-3 text-slate-700 font-medium">Invoice</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {invoices.map((invoice) => (
                                    <tr key={invoice.id}>
                                        <td className="py-3 text-slate-700">
                                            {formatDate(invoice.created_at)}
                                        </td>
                                        <td className="py-3 text-slate-900 font-medium">
                                            {formatPrice(invoice.amount_paid, invoice.currency?.toUpperCase())}
                                        </td>
                                        <td className="py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                invoice.status === 'paid' 
                                                    ? 'text-emerald-600 bg-emerald-100'
                                                    : 'text-amber-600 bg-amber-100'
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
                                                        className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-sm transition-colors"
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
                                                        className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-sm transition-colors"
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