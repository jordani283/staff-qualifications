-- Update subscription plans with actual Stripe price IDs
-- Based on the new products created in main Stripe account (test mode)

UPDATE public.subscription_plans 
SET 
  stripe_monthly_price_id = 'price_1RfoVnHHJZTdOwHFWcCGGGwD',
  stripe_yearly_price_id = 'price_1RfoVnHHJZTdOwHFpnxqSuP0'
WHERE id = 'starter';

UPDATE public.subscription_plans 
SET 
  stripe_monthly_price_id = 'price_1RfoWMHHJZTdOwHFENGkWgJS',
  stripe_yearly_price_id = 'price_1RfoWMHHJZTdOwHFICjZt7Kv'
WHERE id = 'professional';

UPDATE public.subscription_plans 
SET 
  stripe_monthly_price_id = 'price_1RfoX0HHJZTdOwHF6N3p4eMN',
  stripe_yearly_price_id = 'price_1RfoX0HHJZTdOwHFh8RyUWSG'
WHERE id = 'enterprise';

-- Verify the updates
SELECT id, name, stripe_monthly_price_id, stripe_yearly_price_id 
FROM public.subscription_plans 
ORDER BY sort_order; 