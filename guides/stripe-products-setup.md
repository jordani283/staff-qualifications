# 🛍️ Creating Stripe Products & Prices

## Step-by-Step Guide

### 1. Go to Stripe Products
Visit: https://dashboard.stripe.com/products

### 2. Create Starter Plan

**Click "Add product"**

**Product Information:**
- **Name**: `Starter`
- **Description**: `Perfect for small teams getting started with staff qualifications tracking.`

**Pricing:**
- **Pricing model**: `Recurring`
- **Currency**: `GBP (£)`
- **Amount**: `49.00`
- **Billing period**: `Monthly`

**Click "Save product"**

**Add Yearly Price:**
1. In your new Starter product, click "Add another price"
2. **Amount**: `529.20`
3. **Billing period**: `Yearly`
4. **Click "Save price"**

### 3. Create Professional Plan

**Click "Add product"**

**Product Information:**
- **Name**: `Professional`
- **Description**: `Ideal for growing organisations needing powerful tools and insights.`

**Pricing:**
- **Pricing model**: `Recurring`
- **Currency**: `GBP (£)`
- **Amount**: `149.00`
- **Billing period**: `Monthly`

**Click "Save product"**

**Add Yearly Price:**
1. In your new Professional product, click "Add another price"
2. **Amount**: `1609.20`
3. **Billing period**: `Yearly`
4. **Click "Save price"**

### 4. Create Enterprise Plan

**Click "Add product"**

**Product Information:**
- **Name**: `Enterprise`
- **Description**: `For large organisations requiring maximum control and customisation.`

**Pricing:**
- **Pricing model**: `Recurring`
- **Currency**: `GBP (£)`
- **Amount**: `399.00`
- **Billing period**: `Monthly`

**Click "Save product"**

**Add Yearly Price:**
1. In your new Enterprise product, click "Add another price"
2. **Amount**: `4311.60`
3. **Billing period**: `Yearly`
4. **Click "Save price"**

## 📝 Get Your Price IDs

After creating all products, you'll need to collect the **Price IDs**:

### 5. Copy Price IDs

Go to each product and copy the price IDs (they look like `price_1ABC123def456...`):

**Starter:**
- Monthly Price ID: `price_xxxxx`
- Yearly Price ID: `price_xxxxx`

**Professional:**
- Monthly Price ID: `price_xxxxx`
- Yearly Price ID: `price_xxxxx`

**Enterprise:**
- Monthly Price ID: `price_xxxxx`
- Yearly Price ID: `price_xxxxx`

## 🗄️ Update Your Database

Run this SQL in your Supabase SQL editor to add the price IDs:

```sql
-- Update Starter plan
UPDATE public.subscription_plans 
SET 
  stripe_monthly_price_id = 'price_your_starter_monthly_id',
  stripe_yearly_price_id = 'price_your_starter_yearly_id'
WHERE id = 'starter';

-- Update Professional plan
UPDATE public.subscription_plans 
SET 
  stripe_monthly_price_id = 'price_your_professional_monthly_id',
  stripe_yearly_price_id = 'price_your_professional_yearly_id'
WHERE id = 'professional';

-- Update Enterprise plan
UPDATE public.subscription_plans 
SET 
  stripe_monthly_price_id = 'price_your_enterprise_monthly_id',
  stripe_yearly_price_id = 'price_your_enterprise_yearly_id'
WHERE id = 'enterprise';
```

## ✅ Pricing Summary

You should end up with:

| Plan | Monthly | Yearly | Yearly Savings |
|------|---------|--------|----------------|
| **Starter** | £49 | £529.20 | £58.80 (10%) |
| **Professional** | £149 | £1,609.20 | £178.80 (10%) |
| **Enterprise** | £399 | £4,311.60 | £476.40 (10%) |

## 🎯 Quick Checklist

- [ ] Created 3 products in Stripe
- [ ] Added monthly + yearly prices for each
- [ ] Copied all 6 price IDs
- [ ] Updated database with price IDs
- [ ] Verified pricing matches database amounts

Once complete, your subscription system will be fully connected to Stripe! 🚀 