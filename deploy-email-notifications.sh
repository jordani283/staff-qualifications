#!/bin/bash

# Email Notifications Deployment Script for StaffCertify
# This script automates the deployment of certification expiry email notifications

set -e  # Exit on any error

echo "🚀 Deploying StaffCertify Email Notifications System..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not installed. Please install it first:${NC}"
    echo "npm install -g supabase"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo -e "${RED}❌ Not in a Supabase project directory. Run 'supabase init' first.${NC}"
    exit 1
fi

echo -e "${BLUE}🔍 Checking Supabase project status...${NC}"
supabase status

echo ""
echo -e "${YELLOW}📋 Pre-deployment Checklist:${NC}"
echo "1. ✅ Have you created a SendGrid account?"
echo "2. ✅ Do you have a SendGrid API key?"
echo "3. ✅ Have you verified your sender email in SendGrid?"
echo "4. ✅ Have you set SENDGRID_API_KEY in Supabase environment variables?"
echo ""

read -p "Have you completed all the above steps? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Please complete the checklist first. See EMAIL-NOTIFICATIONS-SETUP-GUIDE.md${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🗄️  Step 1: Deploying database functions...${NC}"

# Check if SQL files exist
if [ ! -f "certification-expiry-notifications.sql" ]; then
    echo -e "${RED}❌ certification-expiry-notifications.sql not found!${NC}"
    exit 1
fi

echo "✅ Database function SQL files found"

echo ""
echo -e "${BLUE}☁️  Step 2: Deploying Edge Function...${NC}"

# Check if Edge Function exists
if [ ! -f "supabase/functions/send-expiry-reminders/index.ts" ]; then
    echo -e "${RED}❌ Edge function not found at supabase/functions/send-expiry-reminders/index.ts${NC}"
    exit 1
fi

echo "📤 Deploying send-expiry-reminders function..."
supabase functions deploy send-expiry-reminders

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Edge function deployed successfully!${NC}"
else
    echo -e "${RED}❌ Edge function deployment failed!${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}⏰ Step 3: Setting up scheduling...${NC}"

if [ ! -f "email-notifications-setup.sql" ]; then
    echo -e "${RED}❌ email-notifications-setup.sql not found!${NC}"
    exit 1
fi

echo "✅ Scheduling SQL file found"

echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "=================================================="
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo ""
echo "1. 🗄️  Run database setup:"
echo "   - Go to Supabase Dashboard → SQL Editor"
echo "   - Execute: certification-expiry-notifications.sql"
echo "   - Execute: email-notifications-setup.sql"
echo ""
echo "2. ⚙️  Configure settings:"
echo "   UPDATE app_settings SET value = 'your-admin@company.com' WHERE key = 'admin_email';"
echo "   UPDATE app_settings SET value = 'https://yourdomain.com' WHERE key = 'app_base_url';"
echo ""
echo "3. 🧪 Test the system:"
echo "   SELECT trigger_expiry_reminders();"
echo ""
echo "4. 📊 Monitor execution:"
echo "   SELECT * FROM cron.job;"
echo "   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;"
echo ""
echo -e "${BLUE}📖 For detailed instructions, see: EMAIL-NOTIFICATIONS-SETUP-GUIDE.md${NC}"
echo ""
echo -e "${GREEN}✨ Your certification expiry email system is ready!${NC}" 