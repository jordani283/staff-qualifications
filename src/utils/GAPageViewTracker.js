// src/utils/GAPageViewTracker.js
import { useEffect } from 'react';

// Declare gtag as a global function (it's loaded by the script in index.html)
// Add a fallback in case it's not immediately available or for local development without GA
const gtag = window.gtag || function(){};

const GAPageViewTracker = ({ currentPage, user }) => {
    useEffect(() => {
        // Ensure gtag function is available before calling it
        if (typeof gtag === 'function') {
            // Map internal page names to more descriptive page paths for GA4
            const getPagePath = (page) => {
                const pageMap = {
                    'landing': '/',
                    'pricing': '/pricing',
                    'login': '/login',
                    'signup': '/signup',
                    'onboarding': '/onboarding',
                    'dashboard': '/dashboard',
                    'staff': '/staff',
                    'staff-detail': '/staff/detail',
                    'certificates': '/certificates',
                    'activities': '/activities',
                    'gap-analysis': '/gap-analysis',
                    'support': '/support',
                    'admin-support': '/admin/support',
                    'subscription': '/subscription'
                };
                return pageMap[page] || `/${page}`;
            };

            const pagePath = getPagePath(currentPage);
            const pageTitle = document.title;
            
            gtag('event', 'page_view', {
                page_path: pagePath,
                page_location: window.location.origin + pagePath,
                page_title: pageTitle,
                user_id: user?.id || undefined, // Track user ID if available (helps with user analytics)
            });
            
            console.log('GA4 page_view event sent:', {
                page: currentPage,
                path: pagePath,
                user_id: user?.id || 'anonymous'
            }); // For debugging in console
        } else {
            console.warn('Google Analytics gtag function not found. Page view tracking might not be initialized.');
        }
    }, [currentPage, user?.id]); // Dependency array: re-run this effect whenever page or user changes

    return null; // This component does not render any UI
};

export default GAPageViewTracker; 