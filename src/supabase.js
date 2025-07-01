import { createClient } from '@supabase/supabase-js';

// Security: Use environment variables instead of hardcoded values
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables are provided
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing Supabase environment variables. Please check your .env file.');
    throw new Error("Supabase credentials not provided. Check environment configuration.");
}

// Validate URL format
if (!SUPABASE_URL.startsWith('https://')) {
    throw new Error("Invalid Supabase URL format. Must start with https://");
}

// Validate anon key format (basic JWT structure check)
if (!SUPABASE_ANON_KEY.match(/^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)) {
    throw new Error("Invalid Supabase anon key format");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
        // Reduce frequency of token refresh to minimize auth events
        debug: false,
        // Security: Set session persistence storage key with app prefix
        storageKey: 'teamcertify-auth-token',
        // Security: Use secure storage options with enhanced error handling
        storage: {
            getItem: (key) => {
                try {
                    const value = localStorage.getItem(key);
                    // Validate the stored session data
                    if (value && key.includes('auth-token')) {
                        try {
                            JSON.parse(value);
                        } catch {
                            console.warn('Invalid session data found, clearing...');
                            localStorage.removeItem(key);
                            return null;
                        }
                    }
                    return value;
                } catch (error) {
                    console.warn('Unable to get localStorage item:', error);
                    return null;
                }
            },
            setItem: (key, value) => {
                try {
                    localStorage.setItem(key, value);
                } catch (error) {
                    console.warn('Unable to set localStorage item:', error);
                }
            },
            removeItem: (key) => {
                try {
                    localStorage.removeItem(key);
                } catch (error) {
                    console.warn('Unable to remove localStorage item:', error);
                }
            }
        }
    },
    // Security: Configure additional options
    global: {
        headers: {
            'X-Client-Info': 'teamcertify-web'
        }
    },
    db: {
        schema: 'public'
    }
});

// Security: Export helper for secure operations
export const getUser = async () => {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    } catch (error) {
        console.error('Authentication error:', error.message);
        return null;
    }
};

// Security: Helper for secure sign out
export const signOut = async () => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        // Clear any additional app state if needed
        localStorage.removeItem('teamcertify-user-preferences');
        return { success: true };
    } catch (error) {
        console.error('Sign out error:', error.message);
        return { success: false, error: error.message };
    }
}; 