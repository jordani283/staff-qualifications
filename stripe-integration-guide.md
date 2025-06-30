# 🔥 Stripe Subscription Integration Guide

## Overview

Your StaffCertify app now has a complete subscription management system! This guide walks you through setting up Stripe integration to make it fully functional.

## ✅ What's Already Implemented

### Database Schema
- ✅ Complete subscription tables with proper RLS policies
- ✅ Subscription plans with pricing and features
- ✅ Payment methods and invoices tracking
- ✅ User subscription status management

### Frontend Components
- ✅ Full subscription management page (`/src/pages/SubscriptionPage.jsx`)
- ✅ Stripe service utilities (`/src/utils/stripeService.js`)
- ✅ Navigation integration in main app
- ✅ Complete UI for viewing/managing subscriptions

### Features Included
- ✅ View current plan and renewal date
- ✅ Upgrade subscription plans
- ✅ Cancel/reactivate subscriptions
- ✅ Switch between monthly/yearly billing
- ✅ Payment method management (via Stripe portal)
- ✅ Invoice history with PDF downloads
- ✅ Contact options for downgrades

## 🚀 Quick Setup Steps

### 1. Run Database Migration

First, run the database setup in your Supabase SQL editor:

```sql
-- Copy and paste the content from database-subscription-setup.sql
-- This creates all tables, policies, and sample data
```

### 2. Set Up Stripe Account

1. Create a [Stripe account](https://dashboard.stripe.com/register)
2. Get your API keys from the Stripe dashboard
3. Create products and prices in Stripe dashboard (or via API)

### 3. Environment Variables

Add these to your environment (Supabase Edge Functions or your backend):

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Create Stripe Products

Create these products in your Stripe dashboard with the following price IDs:

```javascript
// Update database-subscription-setup.sql with your actual Stripe price IDs
const STRIPE_PRICES = {
  starter_monthly: 'price_starter_monthly_id',
  starter_yearly: 'price_starter_yearly_id',
  professional_monthly: 'price_professional_monthly_id',
  professional_yearly: 'price_professional_yearly_id',
  enterprise_monthly: 'price_enterprise_monthly_id',
  enterprise_yearly: 'price_enterprise_yearly_id'
};
```

## 🔧 Backend Implementation

You'll need to implement these API endpoints. Here are example implementations:

### Supabase Edge Function Example

Create these functions in your Supabase project:

#### 1. Create Checkout Session (`/functions/stripe-checkout/index.ts`)

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.8.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-08-16',
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  try {
    const { plan_id, billing_cycle } = await req.json()
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error('Invalid user')

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, first_name, last_name, company_name')
      .eq('id', user.id)
      .single()

    let customerId = profile.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${profile.first_name} ${profile.last_name}`,
        metadata: {
          user_id: user.id,
          company_name: profile.company_name || ''
        }
      })
      customerId = customer.id
      
      // Update profile with customer ID
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Get plan pricing
    const { data: plans } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .single()

    if (!plans) throw new Error('Plan not found')

    const priceId = billing_cycle === 'yearly' 
      ? plans.stripe_yearly_price_id 
      : plans.stripe_monthly_price_id

    if (!priceId) throw new Error('Price ID not configured for this plan')

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      billing_address_collection: 'required',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/app?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/app?cancelled=true`,
      metadata: {
        user_id: user.id,
        plan_id: plan_id,
        billing_cycle: billing_cycle
      }
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }
})
```

#### 2. Create Portal Session (`/functions/stripe-portal/index.ts`)

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.8.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-08-16',
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error('Invalid user')

    // Get customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      throw new Error('No Stripe customer found')
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${req.headers.get('origin')}/app?page=subscription`,
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }
})
```

#### 3. Webhook Handler (`/functions/stripe-webhook/index.ts`)

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.8.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-08-16',
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')
  
  try {
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case 'invoice.payment_succeeded':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  
  // Get user from customer ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!profile) return

  // Extract plan info from subscription
  const priceId = subscription.items.data[0]?.price.id
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('id, name')
    .or(`stripe_monthly_price_id.eq.${priceId},stripe_yearly_price_id.eq.${priceId}`)
    .single()

  // Update or insert subscription
  await supabase
    .from('subscriptions')
    .upsert({
      user_id: profile.id,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      status: subscription.status,
      plan_id: plan?.id || 'starter',
      billing_cycle: subscription.items.data[0]?.price.recurring?.interval === 'year' ? 'yearly' : 'monthly',
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    }, {
      onConflict: 'stripe_subscription_id'
    })

  // Update profile subscription info
  await supabase
    .from('profiles')
    .update({
      subscription_status: subscription.status,
      subscription_plan: plan?.id || 'starter',
      billing_cycle: subscription.items.data[0]?.price.recurring?.interval === 'year' ? 'yearly' : 'monthly',
    })
    .eq('id', profile.id)
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  
  // Get user from customer ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!profile) return

  // Save invoice to database
  await supabase
    .from('invoices')
    .upsert({
      user_id: profile.id,
      stripe_invoice_id: invoice.id,
      stripe_customer_id: customerId,
      amount_paid: invoice.amount_paid,
      amount_due: invoice.amount_due,
      currency: invoice.currency,
      status: invoice.status,
      invoice_pdf: invoice.invoice_pdf,
      hosted_invoice_url: invoice.hosted_invoice_url,
      invoice_number: invoice.number,
      period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
      period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
      due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
      paid_at: new Date(invoice.status_transitions.paid_at! * 1000).toISOString(),
    }, {
      onConflict: 'stripe_invoice_id'
    })
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // Handle payment failures - update subscription status, send notifications, etc.
  console.log('Payment failed for invoice:', invoice.id)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Update subscription status to canceled
  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id)
}
```

## 🔗 Update API Endpoints in Frontend

Update the URLs in `src/utils/stripeService.js` to match your deployment:

```javascript
// Replace these URLs with your actual endpoints
const API_BASE_URL = 'https://your-project-ref.supabase.co/functions/v1'

// Update all fetch calls to use your actual endpoints:
const response = await fetch(`${API_BASE_URL}/stripe-checkout`, {
  // ... rest of the code
})
```

## 🌐 Deployment Checklist

### Supabase Setup
- [ ] Run database migration (`database-subscription-setup.sql`)
- [ ] Deploy edge functions for Stripe integration
- [ ] Set environment variables
- [ ] Configure webhooks in Stripe dashboard

### Stripe Setup
- [ ] Create products and prices in Stripe
- [ ] Update `stripe_*_price_id` fields in subscription_plans table
- [ ] Set up webhook endpoint pointing to your webhook function
- [ ] Configure customer portal settings

### Frontend Update
- [ ] Update API endpoints in `stripeService.js`
- [ ] Test subscription flow end-to-end

## 🧪 Testing

### Test Cards (Stripe Test Mode)
- **Successful payment**: 4242 4242 4242 4242
- **Declined payment**: 4000 0000 0000 0002
- **3D Secure required**: 4000 0000 0000 3220

### Test Flow
1. Navigate to Subscription page
2. Try upgrading to different plans
3. Test monthly/yearly switching
4. Verify webhook events are processed
5. Check invoice generation
6. Test customer portal functionality

## 🔒 Security Notes

- Always validate webhook signatures
- Use service role key only in backend functions
- Implement proper authentication checks
- Store sensitive data securely
- Follow Stripe's security best practices

## 📞 Support

If you need help with implementation:
- Check Stripe documentation: https://stripe.com/docs
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- StaffCertify support: support@staffcertify.com

---

## 🎉 You're All Set!

Once you complete these steps, your users will have full subscription management capabilities with Stripe integration. The system handles:

- ✅ Subscription upgrades/downgrades
- ✅ Payment processing
- ✅ Invoice generation
- ✅ Trial management
- ✅ Automatic status updates
- ✅ Customer portal access

Your StaffCertify app is now ready for production billing! 🚀 