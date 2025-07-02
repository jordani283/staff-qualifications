# 🔗 Setting Up Stripe Webhooks

## Step 1: Create Your Webhook Endpoint

### Option A: Using Supabase Edge Functions (Recommended)

1. **Deploy your webhook function first**:
   ```bash
   # In your project root, create the webhook function
   npx supabase functions new stripe-webhook
   ```

2. **Copy the webhook code** from `stripe-integration-guide.md` into:
   ```
   supabase/functions/stripe-webhook/index.ts
   ```

3. **Deploy the function**:
   ```bash
   npx supabase functions deploy stripe-webhook
   ```

4. **Your webhook URL will be**:
   ```
   https://your-project-ref.supabase.co/functions/v1/stripe-webhook
   ```

### Option B: Using Other Hosting (Vercel, Netlify, etc.)

Deploy your webhook handler and note the URL.

## Step 2: Create Webhook in Stripe Dashboard

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/webhooks

2. **Click "Add endpoint"**

3. **Enter your endpoint URL**:
   ```
   https://your-project-ref.supabase.co/functions/v1/stripe-webhook
   ```

4. **Select events to send**. Add these events:
   - `customer.subscription.created`
   - `customer.subscription.updated` 
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `checkout.session.completed`

5. **Click "Add endpoint"**

## Step 3: Get Your Webhook Secret

1. **Click on your newly created webhook**

2. **In the "Signing secret" section**, click "Reveal"

3. **Copy the webhook secret** - it looks like:
   ```
   whsec_1234567890abcdef...
   ```

## Step 4: Add Environment Variables

Add all three keys to your Supabase project:

```bash
# In Supabase Dashboard > Settings > Edge Functions > Environment Variables
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## Step 5: Test Your Webhook

1. **Go back to your webhook in Stripe Dashboard**
2. **Click "Send test webhook"**
3. **Select an event** (like `customer.subscription.created`)
4. **Click "Send test webhook"**
5. **Check the response** - you should see a 200 status

## 🎯 Quick Setup Commands

If you're using Supabase Edge Functions:

```bash
# 1. Create function
npx supabase functions new stripe-webhook

# 2. Add the webhook code to supabase/functions/stripe-webhook/index.ts

# 3. Deploy
npx supabase functions deploy stripe-webhook

# 4. Set environment variables in Supabase Dashboard

# 5. Create webhook in Stripe Dashboard pointing to:
# https://your-project-ref.supabase.co/functions/v1/stripe-webhook
```

## ⚠️ Important Notes

- **Test Mode**: Use your test keys and test webhook for development
- **Production**: Create separate webhook endpoint and keys for production
- **Security**: Never expose your secret key or webhook secret in frontend code
- **Events**: Only listen for events you actually need to reduce noise

## 🧪 Testing

You can test webhooks locally using Stripe CLI:

```bash
# Install Stripe CLI
npm install -g stripe

# Login to Stripe
stripe login

# Forward events to local development
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
```

This will give you a temporary webhook secret starting with `whsec_` that you can use for local testing. 