-- Update TeamCertify Pricing Tiers - 2024
-- New pricing structure with 3 tiers and updated staff limits

BEGIN;

-- Update existing plans with new pricing and structure
UPDATE public.subscription_plans 
SET 
  name = 'Starter',
  description = 'Perfect for small teams getting started with certification tracking.',
  features = '[
    "Automated expiry reminders via email",
    "Color-coded certification status (green/amber/red)",
    "Certificate document storage & secure uploads",
    "Pre-defined certification templates with automatic expiry calculations",
    "Real-time dashboard with compliance metrics",
    "Gap analysis to find missing certifications",
    "Renewal system with complete audit trails",
    "CSV export of staff certification data"
  ]'::jsonb,
  monthly_price = 2900, -- £29/month
  yearly_price = 29000, -- £290/year (2 months free)
  staff_limit = 10,
  sort_order = 1
WHERE id = 'starter';

-- Update Professional to become Growth
UPDATE public.subscription_plans 
SET 
  id = 'growth',
  name = 'Growth',
  description = 'Ideal for growing teams needing powerful certification management.',
  features = '[
    "All Starter plan features",
    "Everything you need for growing teams"
  ]'::jsonb,
  monthly_price = 7900, -- £79/month
  yearly_price = 79000, -- £790/year (2 months free)
  staff_limit = 50,
  sort_order = 2
WHERE id = 'professional';

-- Update Enterprise to become Professional
UPDATE public.subscription_plans 
SET 
  id = 'professional',
  name = 'Professional',
  description = 'For larger organisations requiring comprehensive certification management.',
  features = '[
    "All Starter plan features",
    "Perfect for large organizations"
  ]'::jsonb,
  monthly_price = 19900, -- £199/month
  yearly_price = 199000, -- £1,990/year (2 months free)
  staff_limit = 200,
  sort_order = 3
WHERE id = 'enterprise';

-- Insert Growth plan if the Professional -> Growth update failed due to ID constraints
INSERT INTO public.subscription_plans (id, name, description, features, monthly_price, yearly_price, staff_limit, sort_order, is_active)
VALUES (
  'growth',
  'Growth',
  'Ideal for growing teams needing powerful certification management.',
  '[
    "All Starter plan features",
    "Everything you need for growing teams"
  ]'::jsonb,
  7900, -- £79/month
  79000, -- £790/year
  50,
  2,
  true
) ON CONFLICT (id) DO NOTHING;

-- Insert new Professional plan if the Enterprise -> Professional update failed
INSERT INTO public.subscription_plans (id, name, description, features, monthly_price, yearly_price, staff_limit, sort_order, is_active)
VALUES (
  'professional',
  'Professional', 
  'For larger organisations requiring comprehensive certification management.',
  '[
    "All Starter plan features",
    "Perfect for large organizations"
  ]'::jsonb,
  19900, -- £199/month
  199000, -- £1,990/year
  200,
  3,
  true
) ON CONFLICT (id) DO NOTHING;

-- Remove the old Enterprise plan if it still exists
DELETE FROM public.subscription_plans WHERE id = 'enterprise' AND staff_limit = -1;

-- Update any existing user subscriptions to use the new plan IDs
-- Note: This will need to be handled carefully in production
UPDATE public.subscriptions 
SET plan_id = 'growth' 
WHERE plan_id = 'professional';

UPDATE public.subscriptions 
SET plan_id = 'professional' 
WHERE plan_id = 'enterprise';

UPDATE public.profiles 
SET subscription_plan = 'growth' 
WHERE subscription_plan = 'professional';

UPDATE public.profiles 
SET subscription_plan = 'professional' 
WHERE subscription_plan = 'enterprise';

-- Clear Stripe price IDs so they can be updated with new products
UPDATE public.subscription_plans 
SET 
  stripe_monthly_price_id = NULL,
  stripe_yearly_price_id = NULL;

-- Verify the updates
SELECT id, name, monthly_price, yearly_price, staff_limit, sort_order 
FROM public.subscription_plans 
ORDER BY sort_order;

COMMIT; 