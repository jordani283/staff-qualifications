// src/utils/GAPageViewTracker.js
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Declare gtag as a global function (it's loaded by the script in index.html)
// Add a fallback in case it's not immediately available or for local development without GA
const gtag = window.gtag || function(){};

const GAPageViewTracker = ({ user }) => {
    const location = useLocation();

    useEffect(() => {
        // Ensure gtag function is available before calling it
        if (typeof gtag === 'function') {
            gtag('event', 'page_view', {
                page_path: location.pathname,
                page_location: window.location.href,
                page_title: document.title,
                user_id: user?.id || undefined, // Track user ID if available (helps with user analytics)
            });
            
            console.log('GA4 page_view event sent:', {
                path: location.pathname,
                location: window.location.href,
                user_id: user?.id || 'anonymous'
            }); // For debugging in console
        } else {
            console.warn('Google Analytics gtag function not found. Page view tracking might not be initialized.');
        }
    }, [location, user?.id]); // Dependency array: re-run this effect whenever location or user changes

    return null; // This component does not render any UI
};

export default GAPageViewTracker; 