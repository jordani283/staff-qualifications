# 🚀 Deploy Your Stripe Backend

## ✅ Backend Files Created

I've created all the Supabase Edge Functions for you:

1. **`supabase/functions/stripe-checkout/index.ts`** - Creates Stripe checkout sessions
2. **`supabase/functions/stripe-portal/index.ts`** - Creates customer portal sessions  
3. **`supabase/functions/stripe-webhook/index.ts`** - Handles Stripe webhooks

## 🔧 Deployment Steps

### 1. Initialize Supabase (if not done already)

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
npx supabase login

# Link your project
npx supabase link --project-ref uydysrzsvnclyxaqdsag
```

### 2. Deploy the Edge Functions

```bash
# Deploy all functions at once
npx supabase functions deploy stripe-checkout
npx supabase functions deploy stripe-portal  
npx supabase functions deploy stripe-webhook
```

### 3. Set Environment Variables

Go to your **Supabase Dashboard > Settings > Edge Functions** and add these environment variables:

```bash
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Update Frontend URLs

In `src/utils/stripeService.js`, replace `YOUR_PROJECT_REF` with your actual Supabase project reference:

```javascript
// Your URLs are now updated to:
https://uydysrzsvnclyxaqdsag.supabase.co/functions/v1/
```

### 5. Update Stripe Webhook URL

In your **Stripe Dashboard > Webhooks**, update the endpoint URL to:

```
https://uydysrzsvnclyxaqdsag.supabase.co/functions/v1/stripe-webhook
```

## 🧪 Test Your Deployment

### Test the Functions

```bash
# Test checkout function
curl -X POST https://uydysrzsvnclyxaqdsag.supabase.co/functions/v1/stripe-checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"plan_id": "starter", "billing_cycle": "monthly"}'

# Test portal function  
curl -X POST https://uydysrzsvnclyxaqdsag.supabase.co/functions/v1/stripe-portal \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Test Webhook

In **Stripe Dashboard > Webhooks**, click "Send test webhook" and verify you get a 200 response.

## 🎯 Quick Checklist

- [ ] Edge functions deployed successfully
- [ ] Environment variables set in Supabase Dashboard
- [ ] Frontend URLs updated with your project reference  
- [ ] Stripe webhook URL updated
- [ ] Test webhook receives 200 response
- [ ] Can create checkout sessions from frontend

## 🔍 Troubleshooting

### Function Deployment Issues
```bash
# Check function logs
npx supabase functions logs stripe-checkout

# Redeploy a specific function
npx supabase functions deploy stripe-checkout --no-verify-jwt
```

### Environment Variables
- Make sure you're setting them in the **Edge Functions** section, not the general environment variables
- Restart functions after changing environment variables

### CORS Issues
- The functions include CORS headers
- If you still have issues, check your frontend is making requests to the correct URLs

## 🎉 You're Done!

Once deployed, your subscription system is fully functional:

- ✅ Users can upgrade/downgrade plans
- ✅ Stripe handles all payments securely  
- ✅ Webhooks keep your database in sync
- ✅ Customer portal manages payment methods
- ✅ Invoices are automatically tracked

Your StaffCertify app now has production-ready billing! 🚀 