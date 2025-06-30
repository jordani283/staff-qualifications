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
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

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

    if (!profile) throw new Error('Profile not found')

    let customerId = profile.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user.email,
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
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .single()

    if (!plan) throw new Error('Plan not found')

    const priceId = billing_cycle === 'yearly' 
      ? plan.stripe_yearly_price_id 
      : plan.stripe_monthly_price_id

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
      success_url: `${req.headers.get('origin')}/?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${req.headers.get('origin')}/?cancelled=true`,
      metadata: {
        user_id: user.id,
        plan_id: plan_id,
        billing_cycle: billing_cycle
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_id: plan_id,
          billing_cycle: billing_cycle
        }
      }
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { 
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        } 
      }
    )
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        } 
      }
    )
  }
}) 