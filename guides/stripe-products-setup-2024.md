# 🛍️ Updated Stripe Products & Prices Setup (2024)

## New Pricing Structure Overview

| Plan | Monthly | Yearly | Staff Limit | Features |
|------|---------|--------|-------------|----------|
| **Starter** | £29 | £290 (2 months free) | 10 staff | All 8 features |
| **Growth** | £79 | £790 (2 months free) | 50 staff | All 8 features |
| **Professional** | £199 | £1,990 (2 months free) | 200 staff | All 8 features |

## ✨ The 8 Valuable Features (All Plans)

1. **Automated expiry reminders via email**
2. **Color-coded certification status (green/amber/red)**
3. **Certificate document storage & secure uploads**
4. **Pre-defined certification templates with automatic expiry calculations**
5. **Real-time dashboard with compliance metrics**
6. **Gap analysis to find missing certifications**
7. **Renewal system with complete audit trails**
8. **CSV export of staff certification data**

## Step-by-Step Stripe Setup

### 1. Go to Stripe Products
Visit: https://dashboard.stripe.com/products

### 2. Create Starter Plan

**Click "Add product"**

**Product Information:**
- **Name**: `Starter`
- **Description**: `Perfect for small teams getting started with certification tracking.`

**Pricing:**
- **Pricing model**: `Recurring`
- **Currency**: `GBP (£)`
- **Amount**: `29.00`
- **Billing period**: `Monthly`

**Click "Save product"**

**Add Yearly Price:**
1. In your new Starter product, click "Add another price"
2. **Amount**: `290.00`
3. **Billing period**: `Yearly`
4. **Click "Save price"**

### 3. Create Growth Plan

**Click "Add product"**

**Product Information:**
- **Name**: `Growth`
- **Description**: `Ideal for growing teams needing powerful certification management.`

**Pricing:**
- **Pricing model**: `Recurring`
- **Currency**: `GBP (£)`
- **Amount**: `79.00`
- **Billing period**: `Monthly`

**Click "Save product"**

**Add Yearly Price:**
1. In your new Growth product, click "Add another price"
2. **Amount**: `790.00`
3. **Billing period**: `Yearly`
4. **Click "Save price"**

### 4. Create Professional Plan

**Click "Add product"**

**Product Information:**
- **Name**: `Professional`
- **Description**: `For larger organisations requiring comprehensive certification management.`

**Pricing:**
- **Pricing model**: `Recurring`
- **Currency**: `GBP (£)`
- **Amount**: `199.00`
- **Billing period**: `Monthly`

**Click "Save product"**

**Add Yearly Price:**
1. In your new Professional product, click "Add another price"
2. **Amount**: `1990.00`
3. **Billing period**: `Yearly`
4. **Click "Save price"**

## 📝 Get Your Price IDs

After creating all products, you'll need to collect the **Price IDs**:

### 5. Copy Price IDs

Go to each product and copy the price IDs (they look like `price_1ABC123def456...`):

**Starter:**
- Monthly Price ID: `price_xxxxx`
- Yearly Price ID: `price_xxxxx`

**Growth:**
- Monthly Price ID: `price_xxxxx`
- Yearly Price ID: `price_xxxxx`

**Professional:**
- Monthly Price ID: `price_xxxxx`
- Yearly Price ID: `price_xxxxx`

## 🗄️ Update Your Database

### Step 1: Run the Pricing Migration
First, run the pricing migration in your Supabase SQL editor:

```sql
-- Copy and paste the entire content from sql/update-pricing-tiers-2024.sql
```

### Step 2: Add Staff Limit Enforcement
Run the staff limit enforcement setup:

```sql
-- Copy and paste the entire content from sql/staff-limit-enforcement.sql
```

### Step 3: Update Stripe Price IDs
Run this SQL with your actual Stripe price IDs:

```sql
-- Update Starter plan
UPDATE public.subscription_plans 
SET 
  stripe_monthly_price_id = "price_1Ri9vrHHJZTdOwHFIaSk2y6v",
  stripe_yearly_price_id = "price_1Ri9vrHHJZTdOwHFD14p4eco"
WHERE id = 'starter';

-- Update Growth plan
UPDATE public.subscription_plans 
SET 
  stripe_monthly_price_id = 'price_1Ri9weHHJZTdOwHFi1JvCAt0',
  stripe_yearly_price_id = 'price_1Ri9weHHJZTdOwHFi1JvCAt0'
WHERE id = 'growth';

-- Update Professional plan
UPDATE public.subscription_plans 
SET 
  stripe_monthly_price_id = 'price_1Ri9xHHHJZTdOwHFX8mqqXDE',
  stripe_yearly_price_id = 'price_1Ri9xHHHJZTdOwHFONmyu581'
WHERE id = 'professional';
```

## ✅ Updated Pricing Summary

You should end up with:

| Plan | Monthly | Yearly | Staff Limit | Yearly Savings |
|------|---------|--------|-------------|----------------|
| **Starter** | £29 | £290 | 10 staff | £58 (2 months free) |
| **Growth** | £79 | £790 | 50 staff | £158 (2 months free) |
| **Professional** | £199 | £1,990 | 200 staff | £398 (2 months free) |

## 🎯 Key Changes from Previous Setup

### ✅ What Changed:
- **Simplified to 3 tiers** (was Starter/Professional/Enterprise)
- **All plans include the same 8 powerful features**
- **Only difference is staff limits**: 10 → 50 → 200
- **Consistent 2-month savings** on annual billing
- **Lower entry price** (£29 vs £49 for Starter)
- **New Growth tier** for mid-sized teams (50 staff)
- **Professional tier** now supports 200 staff (vs unlimited Enterprise)

### 🔧 Technical Updates:
- **Staff limit enforcement** at database level
- **Real-time staff limit checking** in the UI
- **Automatic upgrade prompts** when limits are reached
- **Enhanced feature access controls** with staff limits
- **Updated pricing page** with all 8 features clearly listed

## 🧪 Testing Your Setup

### 1. Test Staff Limits
```sql
-- Check staff limits for current user
SELECT * FROM v_user_staff_limits;

-- Test staff limit function
SELECT public.can_add_staff(auth.uid());
```

### 2. Test Subscription Plans
```sql
-- Verify all plans are correctly configured
SELECT id, name, monthly_price, yearly_price, staff_limit, sort_order 
FROM public.subscription_plans 
ORDER BY sort_order;
```

### 3. Test Frontend
- Try adding staff members up to your plan's limit
- Verify upgrade prompts appear when limit is reached
- Check that the pricing page shows the correct tiers
- Test subscription management page with new plans

## 🚀 Going Live Checklist

- [ ] Created 3 products in Stripe dashboard
- [ ] Added monthly + yearly prices for each product
- [ ] Copied all 6 price IDs
- [ ] Ran pricing migration SQL script
- [ ] Ran staff limit enforcement SQL script
- [ ] Updated database with actual Stripe price IDs
- [ ] Tested staff limit enforcement
- [ ] Verified pricing page displays correctly
- [ ] Tested subscription flow end-to-end
- [ ] Updated webhook configuration (if needed)

## 📞 Need Help?

If you need assistance with:
- Creating Stripe products
- Setting up webhooks
- Testing the subscription flow
- Migrating existing customers

Contact support or check the main Stripe integration guide.

---

## 🎉 You're All Set!

Your new simplified pricing structure focuses on what matters most to customers: **staff limits**. All plans include the powerful features they need, making the upgrade decision clear and simple.

**Next Step**: Update any marketing materials to highlight the 8 valuable features and the clear value progression: 10 → 50 → 200 staff members! 