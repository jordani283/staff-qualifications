-- Update Stripe Price IDs for New 2024 Pricing Tiers
-- Run this after creating the Stripe products and getting the price IDs

-- Update Starter plan with actual price IDs
UPDATE public.subscription_plans 
SET 
  stripe_monthly_price_id = 'price_1Ri9vrHHJZTdOwHFIaSk2y6v',
  stripe_yearly_price_id = 'price_1Ri9vrHHJZTdOwHFD14p4eco'
WHERE id = 'starter';

-- Update Growth plan with actual price IDs
UPDATE public.subscription_plans 
SET 
  stripe_monthly_price_id = 'price_1Ri9weHHJZTdOwHFi1JvCAt0',
  stripe_yearly_price_id = 'price_1Ri9weHHJZTdOwHFi1JvCAt0'
WHERE id = 'growth';

-- Update Professional plan with actual price IDs
UPDATE public.subscription_plans 
SET 
  stripe_monthly_price_id = 'price_1Ri9xHHHJZTdOwHFX8mqqXDE',
  stripe_yearly_price_id = 'price_1Ri9xHHHJZTdOwHFONmyu581'
WHERE id = 'professional';

-- Verify the updates
SELECT 
  id,
  name,
  monthly_price,
  yearly_price,
  staff_limit,
  stripe_monthly_price_id,
  stripe_yearly_price_id
FROM public.subscription_plans 
ORDER BY sort_order;

-- Success message
SELECT '✅ Stripe price IDs updated successfully for all plans!' as result; 