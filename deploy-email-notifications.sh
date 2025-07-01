#!/bin/bash

# =============================================================================
# TeamCertify Email Notifications Deployment Script
# =============================================================================
# Automates the deployment of certification expiry email notifications
# Prerequisites: SendGrid account + API key already configured

set -e  # Exit on any error

# Color definitions
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

# Helper functions
print_header() {
    echo -e "\n${BOLD}${BLUE}==============================================================================${NC}"
    echo -e "${BOLD}${BLUE} $1${NC}"
    echo -e "${BOLD}${BLUE}==============================================================================${NC}\n"
}

print_step() {
    echo -e "${CYAN}📋 Step $1: $2${NC}"
    echo -e "${CYAN}$(printf '%.0s-' {1..60})${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Main deployment script
main() {
    print_header "🚀 TEAMCERTIFY EMAIL NOTIFICATIONS DEPLOYMENT"
    
    # Validation checks
    validate_environment
    
    # Deployment steps
    deploy_database_functions
    deploy_edge_function
    setup_scheduling
    
    # Completion
    show_completion_summary
}

validate_environment() {
    print_step "1" "Validating Environment"
    
    # Check Supabase CLI
    if ! command -v supabase &> /dev/null; then
        print_error "Supabase CLI not installed"
        echo "Install with: npm install -g supabase"
        exit 1
    fi
    print_success "Supabase CLI found"
    
    # Check project structure
    if [ ! -f "supabase/config.toml" ]; then
        print_error "Not in a Supabase project directory"
        echo "Run 'supabase init' first"
        exit 1
    fi
    print_success "Supabase project detected"
    
    # Check required files
    local required_files=(
        "certification-expiry-notifications.sql"
        "email-notifications-setup.sql"
        "supabase/functions/send-expiry-reminders/index.ts"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            print_error "Required file missing: $file"
            exit 1
        fi
    done
    print_success "All required files present"
    
    # Check Supabase status
    echo -e "\n${BLUE}Checking Supabase connection...${NC}"
    if supabase status --quiet; then
        print_success "Supabase connection established"
    else
        print_warning "Supabase status check failed - continuing anyway"
    fi
    
    echo
}

deploy_database_functions() {
    print_step "2" "Database Functions Setup"
    
    print_warning "Manual action required:"
    echo "1. Open Supabase Dashboard → SQL Editor"
    echo "2. Execute: certification-expiry-notifications.sql"
    echo "3. This creates the expiry detection function and app_settings table"
    echo
    
    read -p "Press Enter when database functions are deployed..."
    print_success "Database functions marked as complete"
    echo
}

deploy_edge_function() {
    print_step "3" "Edge Function Deployment"
    
    echo "Deploying send-expiry-reminders function..."
    
    if supabase functions deploy send-expiry-reminders; then
        print_success "Edge function deployed successfully"
    else
        print_error "Edge function deployment failed"
        echo "Check your network connection and Supabase authentication"
        exit 1
    fi
    echo
}

setup_scheduling() {
    print_step "4" "Scheduling Configuration"
    
    print_warning "Manual action required:"
    echo "1. Open Supabase Dashboard → SQL Editor"
    echo "2. Execute: email-notifications-setup.sql"
    echo "3. This sets up the daily cron job (9:00 AM UTC)"
    echo
    
    read -p "Press Enter when scheduling is configured..."
    print_success "Scheduling marked as complete"
    echo
}

show_completion_summary() {
    print_header "🎉 DEPLOYMENT COMPLETE"
    
    echo -e "${GREEN}✅ Email notification system successfully deployed!${NC}\n"
    
    echo -e "${BOLD}📋 FINAL CONFIGURATION STEPS:${NC}"
    echo -e "${CYAN}$(printf '%.0s-' {1..40})${NC}"
    
    echo -e "\n${YELLOW}1. Configure Admin Settings:${NC}"
    echo "   Go to Supabase Dashboard → SQL Editor and run:"
    echo -e "${BLUE}   UPDATE app_settings SET value = 'your-admin@company.com' WHERE key = 'admin_email';${NC}"
    echo -e "${BLUE}   UPDATE app_settings SET value = 'https://yourdomain.com' WHERE key = 'app_base_url';${NC}"
    
    echo -e "\n${YELLOW}2. Test the System:${NC}"
    echo "   Run this in SQL Editor:"
    echo -e "${BLUE}   SELECT trigger_expiry_reminders();${NC}"
    
    echo -e "\n${YELLOW}3. Monitor Execution:${NC}"
    echo "   Check cron jobs:"
    echo -e "${BLUE}   SELECT * FROM cron.job;${NC}"
    echo "   View execution history:"
    echo -e "${BLUE}   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;${NC}"
    
    echo -e "\n${YELLOW}4. Verify SendGrid Integration:${NC}"
    echo "   • Check SENDGRID_API_KEY is set in Supabase environment variables"
    echo "   • Ensure sender email is verified in SendGrid"
    echo "   • Monitor SendGrid dashboard for delivery statistics"
    
    echo -e "\n${BOLD}📖 Documentation:${NC}"
    echo "   • Complete guide: EMAIL-NOTIFICATIONS-SETUP-GUIDE.md"
    echo "   • Testing queries: test-email-notifications.sql"
    
    echo -e "\n${BOLD}🕘 Schedule:${NC}"
    echo "   • Emails sent daily at 9:00 AM UTC"
    echo "   • Only for certifications expiring TODAY"
    echo "   • Both staff and admin notifications"
    
    echo -e "\n${GREEN}${BOLD}🚀 Your certification expiry email system is now active!${NC}"
    echo
}

# Run the main function
main "$@" 