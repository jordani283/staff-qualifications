-- Subscription Management Database Schema
-- Run this in your Supabase SQL editor

-- 1. Add subscription-related fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE,
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'starter',
ADD COLUMN IF NOT EXISTS billing_cycle text DEFAULT 'monthly', -- 'monthly' or 'yearly'
ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS subscription_updated_at timestamp with time zone DEFAULT now();

-- 2. Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id text UNIQUE NOT NULL,
  stripe_customer_id text NOT NULL,
  status text NOT NULL, -- active, canceled, past_due, unpaid, incomplete, trialing
  plan_id text NOT NULL, -- starter, professional, enterprise
  billing_cycle text NOT NULL, -- monthly, yearly
  current_period_start timestamp with time zone NOT NULL,
  current_period_end timestamp with time zone NOT NULL,
  cancel_at_period_end boolean DEFAULT false,
  canceled_at timestamp with time zone,
  trial_start timestamp with time zone,
  trial_end timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id)
);

-- 3. Create payment_methods table
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_method_id text UNIQUE NOT NULL,
  stripe_customer_id text NOT NULL,
  type text NOT NULL, -- card, bank_account, etc.
  brand text, -- visa, mastercard, etc.
  last4 text,
  exp_month integer,
  exp_year integer,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT payment_methods_pkey PRIMARY KEY (id)
);

-- 4. Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_invoice_id text UNIQUE NOT NULL,
  stripe_customer_id text NOT NULL,
  subscription_id uuid REFERENCES public.subscriptions(id),
  amount_paid integer NOT NULL, -- in cents
  amount_due integer NOT NULL, -- in cents
  currency text NOT NULL DEFAULT 'gbp',
  status text NOT NULL, -- draft, open, paid, void, uncollectible
  invoice_pdf text, -- URL to Stripe invoice PDF
  hosted_invoice_url text, -- URL to Stripe hosted invoice page
  invoice_number text,
  period_start timestamp with time zone,
  period_end timestamp with time zone,
  due_date timestamp with time zone,
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT invoices_pkey PRIMARY KEY (id)
);

-- 5. Create subscription plans configuration table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id text NOT NULL PRIMARY KEY,
  name text NOT NULL,
  description text,
  features jsonb,
  monthly_price integer NOT NULL, -- in pence
  yearly_price integer NOT NULL, -- in pence
  staff_limit integer,
  stripe_monthly_price_id text,
  stripe_yearly_price_id text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 6. Insert default subscription plans
INSERT INTO public.subscription_plans (id, name, description, features, monthly_price, yearly_price, staff_limit, sort_order) 
VALUES 
  (
    'starter',
    'Starter',
    'Perfect for small teams getting started with staff qualifications tracking.',
    '["Digital certificate & qualification tracking", "Basic gap analysis", "Automated expiry reminders", "Email support", "Secure data storage", "Mobile-friendly interface"]'::jsonb,
    4900, -- £49/month
    52920, -- £529.20/year (10% discount)
    10,
    1
  ),
  (
    'professional',
    'Professional',
    'Ideal for growing organisations needing powerful tools and insights.',
    '["Everything in Starter", "Advanced gap analysis with visual dashboards", "Training & resource planning tools", "Role-based permissions", "Priority email support", "Custom reporting", "API access", "Bulk import/export"]'::jsonb,
    14900, -- £149/month
    160920, -- £1609.20/year (10% discount)
    50,
    2
  ),
  (
    'enterprise',
    'Enterprise',
    'For large organisations requiring maximum control and customisation.',
    '["Everything in Professional", "Unlimited staff profiles", "Advanced role-based permissions", "Custom integrations", "Dedicated account manager", "Phone support", "Custom training", "SLA guarantee"]'::jsonb,
    39900, -- £399/month
    431160, -- £4311.60/year (10% discount)
    -1, -- unlimited
    3
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  monthly_price = EXCLUDED.monthly_price,
  yearly_price = EXCLUDED.yearly_price,
  staff_limit = EXCLUDED.staff_limit,
  sort_order = EXCLUDED.sort_order;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON public.payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_customer_id ON public.payment_methods(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_id ON public.invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON public.profiles(stripe_customer_id);

-- 8. Enable RLS on new tables
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies
-- Subscriptions policies
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Payment methods policies
CREATE POLICY "Users can view their own payment methods" ON public.payment_methods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own payment methods" ON public.payment_methods
  FOR ALL USING (auth.uid() = user_id);

-- Invoices policies
CREATE POLICY "Users can view their own invoices" ON public.invoices
  FOR SELECT USING (auth.uid() = user_id);

-- Subscription plans policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view subscription plans" ON public.subscription_plans
  FOR SELECT TO authenticated USING (true);

-- 10. Create a view for subscription details
CREATE OR REPLACE VIEW public.v_user_subscription_details AS
SELECT 
  p.id as user_id,
  p.first_name,
  p.last_name,
  p.company_name,
  p.stripe_customer_id,
  p.subscription_status,
  p.subscription_plan,
  p.billing_cycle,
  p.trial_ends_at,
  s.id as subscription_id,
  s.stripe_subscription_id,
  s.status as stripe_status,
  s.current_period_start,
  s.current_period_end,
  s.cancel_at_period_end,
  s.canceled_at,
  s.trial_start,
  s.trial_end,
  sp.name as plan_name,
  sp.description as plan_description,
  sp.features as plan_features,
  sp.monthly_price,
  sp.yearly_price,
  sp.staff_limit,
  CASE 
    WHEN s.billing_cycle = 'yearly' THEN sp.yearly_price
    ELSE sp.monthly_price
  END as current_price
FROM public.profiles p
LEFT JOIN public.subscriptions s ON p.id = s.user_id AND s.status IN ('active', 'trialing', 'past_due')
LEFT JOIN public.subscription_plans sp ON p.subscription_plan = sp.id
WHERE p.id = auth.uid();

-- 11. Grant permissions
GRANT SELECT ON public.v_user_subscription_details TO authenticated;
GRANT SELECT ON public.subscription_plans TO authenticated;
GRANT ALL ON public.subscriptions TO authenticated;
GRANT ALL ON public.payment_methods TO authenticated;
GRANT SELECT ON public.invoices TO authenticated;

-- 12. Create function to update subscription status
CREATE OR REPLACE FUNCTION update_profile_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the profiles table when subscription changes
  UPDATE public.profiles 
  SET 
    subscription_status = NEW.status,
    subscription_updated_at = now()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 13. Create trigger for subscription updates
DROP TRIGGER IF EXISTS subscription_status_update ON public.subscriptions;
CREATE TRIGGER subscription_status_update
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_profile_subscription_status(); 