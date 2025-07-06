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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
      },
    })
  }

  // Only process POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    })
  }

  try {
    console.log('🔍 Webhook request received - method:', req.method)
    console.log('🔍 Request headers:', Object.fromEntries(req.headers.entries()))
    
    const signature = req.headers.get('Stripe-Signature')
    
    if (!signature) {
      console.error('❌ Missing Stripe signature')
      return new Response(JSON.stringify({ error: 'Missing Stripe signature' }), { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      })
    }
    
    console.log('✅ Stripe signature present:', signature.substring(0, 50) + '...')
    
    const body = await req.text()
    console.log('✅ Request body length:', body.length)
    console.log('✅ Body preview:', body.substring(0, 200) + '...')
    
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    
    if (!webhookSecret) {
      console.error('❌ Missing webhook secret')
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      })
    }

    console.log('✅ Webhook secret present:', webhookSecret.substring(0, 10) + '...')
    console.log('🔐 Attempting signature verification...')

    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
    console.log('✅ Signature verification successful!')

    console.log(`Processing webhook event: ${event.type}`)

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
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
    })
  } catch (err) {
    console.error('❌ Webhook error:', err)
    console.error('❌ Error message:', err.message)
    console.error('❌ Error stack:', err.stack)
    
    // Check if this is a signature verification error
    if (err.message.includes('signature') || err.message.includes('timestamp')) {
      console.error('🔐 Signature verification failed!')
      return new Response(JSON.stringify({ error: 'Signature verification failed' }), {
        status: 401,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
      })
    }
    
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
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

  if (!profile) {
    console.error(`No profile found for customer ${customerId}`)
    return
  }

  // Extract plan info from subscription
  const priceId = subscription.items.data[0]?.price.id
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('id, name')
    .or(`stripe_monthly_price_id.eq.${priceId},stripe_yearly_price_id.eq.${priceId}`)
    .single()

  const planId = plan?.id || 'starter'
  const billingCycle = subscription.items.data[0]?.price.recurring?.interval === 'year' ? 'yearly' : 'monthly'

  // Update or insert subscription
  const { error: subError } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: profile.id,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      status: subscription.status,
      plan_id: planId,
      billing_cycle: billingCycle,
      current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
      current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    }, {
      onConflict: 'stripe_subscription_id'
    })

  if (subError) {
    console.error('Error updating subscription:', subError)
  }

  // Update profile subscription info
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      subscription_status: subscription.status,
      subscription_plan: planId,
      billing_cycle: billingCycle,
    })
    .eq('id', profile.id)

  if (profileError) {
    console.error('Error updating profile:', profileError)
  }

  console.log(`Updated subscription for user ${profile.id}: ${subscription.status}`)
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  
  // Get user from customer ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!profile) {
    console.error(`No profile found for customer ${customerId}`)
    return
  }

  // Get subscription ID if available
  let subscriptionId = null
  if (invoice.subscription) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', invoice.subscription as string)
      .single()
    subscriptionId = sub?.id || null
  }

  // Save invoice to database
  const { error } = await supabase
    .from('invoices')
    .upsert({
      user_id: profile.id,
      stripe_invoice_id: invoice.id,
      stripe_customer_id: customerId,
      subscription_id: subscriptionId,
      amount_paid: invoice.amount_paid,
      amount_due: invoice.amount_due,
      currency: invoice.currency,
      status: invoice.status || 'unknown',
      invoice_pdf: invoice.invoice_pdf,
      hosted_invoice_url: invoice.hosted_invoice_url,
      invoice_number: invoice.number,
      period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
      period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
      due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
      paid_at: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000).toISOString() : new Date().toISOString(),
    }, {
      onConflict: 'stripe_invoice_id'
    })

  if (error) {
    console.error('Error saving invoice:', error)
  } else {
    console.log(`Saved invoice ${invoice.id} for user ${profile.id}`)
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log(`Payment failed for invoice: ${invoice.id}`)
  
  const customerId = invoice.customer as string
  
  // Get user from customer ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!profile) return

  // Update subscription status to past_due if needed
  if (invoice.subscription) {
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'past_due' })
      .eq('stripe_subscription_id', invoice.subscription as string)

    if (error) {
      console.error('Error updating subscription to past_due:', error)
    }
  }

  // You could add email notification logic here
  console.log(`Payment failed for user ${profile.id}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Update subscription status to canceled
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Error marking subscription as canceled:', error)
  } else {
    console.log(`Marked subscription ${subscription.id} as canceled`)
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log(`Checkout completed for session: ${session.id}`)
  
  // The subscription webhook will handle the actual subscription creation
  // This is just for logging/analytics purposes
  
  if (session.metadata?.user_id) {
    console.log(`User ${session.metadata.user_id} completed checkout for plan ${session.metadata.plan_id}`)
  }
} 