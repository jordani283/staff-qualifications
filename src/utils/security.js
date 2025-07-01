// Security utilities for TeamCertify application
// Provides input validation, XSS prevention, and security helpers

// XSS Prevention: HTML escape function
export const escapeHtml = (text) => {
  if (typeof text !== 'string') return text;
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// XSS Prevention: Strip HTML tags
export const stripHtml = (text) => {
  if (typeof text !== 'string') return text;
  
  const div = document.createElement('div');
  div.innerHTML = text;
  return div.textContent || div.innerText || '';
};

// Input Validation: Email validation
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

// Input Validation: Password strength
export const validatePassword = (password) => {
  const errors = [];
  
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Input Validation: Certification name
export const validateCertificationName = (name) => {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Certification name is required' };
  }
  
  const trimmed = name.trim();
  
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Certification name must be at least 2 characters' };
  }
  
  if (trimmed.length > 200) {
    return { isValid: false, error: 'Certification name must be less than 200 characters' };
  }
  
  // Check for potentially malicious content
  if (/<[^>]*script|javascript:|data:/i.test(trimmed)) {
    return { isValid: false, error: 'Invalid characters in certification name' };
  }
  
  return { isValid: true, sanitized: stripHtml(trimmed) };
};

// Input Validation: Date validation
export const validateDate = (dateString, fieldName = 'Date') => {
  if (!dateString) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return { isValid: false, error: `Invalid ${fieldName.toLowerCase()} format` };
  }
  
  // Check reasonable date range (not too far in past or future)
  const now = new Date();
  const hundredYearsAgo = new Date(now.getFullYear() - 100, 0, 1);
  const tenYearsFromNow = new Date(now.getFullYear() + 10, 11, 31);
  
  if (date < hundredYearsAgo || date > tenYearsFromNow) {
    return { isValid: false, error: `${fieldName} must be within reasonable range` };
  }
  
  return { isValid: true, date };
};

// Security: File upload validation
export const validateFileUpload = (file, allowedTypes = ['pdf', 'jpg', 'jpeg', 'png'], maxSizeMB = 10) => {
  if (!file) {
    return { isValid: false, error: 'No file selected' };
  }
  
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return { isValid: false, error: `File size must be less than ${maxSizeMB}MB` };
  }
  
  // Check file type
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  if (!allowedTypes.includes(fileExtension)) {
    return { isValid: false, error: `File type must be one of: ${allowedTypes.join(', ')}` };
  }
  
  // Check MIME type matches extension
  const mimeTypeMap = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png'
  };
  
  const expectedMimeType = mimeTypeMap[fileExtension];
  if (expectedMimeType && !file.type.startsWith(expectedMimeType)) {
    return { isValid: false, error: 'File type does not match file extension' };
  }
  
  return { isValid: true };
};

// Security: Rate limiting helper (client-side)
export const createRateLimiter = (maxRequests = 10, windowMs = 60000) => {
  const requests = [];
  
  return () => {
    const now = Date.now();
    
    // Remove old requests outside the window
    while (requests.length > 0 && requests[0] < now - windowMs) {
      requests.shift();
    }
    
    // Check if we've exceeded the limit
    if (requests.length >= maxRequests) {
      return { allowed: false, retryAfter: Math.ceil((requests[0] + windowMs - now) / 1000) };
    }
    
    // Add current request
    requests.push(now);
    return { allowed: true };
  };
};

// Security: Secure localStorage wrapper
export const secureStorage = {
  set: (key, value) => {
    try {
      const prefixedKey = `teamcertify_${key}`;
      const serializedValue = JSON.stringify({
        value,
        timestamp: Date.now(),
        checksum: btoa(JSON.stringify(value)) // Simple integrity check
      });
      localStorage.setItem(prefixedKey, serializedValue);
      return true;
    } catch (error) {
      console.warn('Failed to store data:', error);
      return false;
    }
  },
  
  get: (key, maxAge = 24 * 60 * 60 * 1000) => { // 24 hours default
    try {
      const prefixedKey = `teamcertify_${key}`;
      const stored = localStorage.getItem(prefixedKey);
      
      if (!stored) return null;
      
      const parsed = JSON.parse(stored);
      const { value, timestamp, checksum } = parsed;
      
      // Check age
      if (Date.now() - timestamp > maxAge) {
        localStorage.removeItem(prefixedKey);
        return null;
      }
      
      // Verify integrity
      const expectedChecksum = btoa(JSON.stringify(value));
      if (checksum !== expectedChecksum) {
        console.warn('Data integrity check failed');
        localStorage.removeItem(prefixedKey);
        return null;
      }
      
      return value;
    } catch (error) {
      console.warn('Failed to retrieve data:', error);
      return null;
    }
  },
  
  remove: (key) => {
    try {
      const prefixedKey = `teamcertify_${key}`;
      localStorage.removeItem(prefixedKey);
      return true;
    } catch (error) {
      console.warn('Failed to remove data:', error);
      return false;
    }
  },
  
  clear: () => {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('teamcertify_')) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.warn('Failed to clear data:', error);
      return false;
    }
  }
};

// Security: Content Security Policy helper
export const cspReport = (violationEvent) => {
  console.error('CSP Violation:', {
    blockedURI: violationEvent.blockedURI,
    documentURI: violationEvent.documentURI,
    effectiveDirective: violationEvent.effectiveDirective,
    originalPolicy: violationEvent.originalPolicy,
    referrer: violationEvent.referrer,
    violatedDirective: violationEvent.violatedDirective
  });
  
  // In production, you might want to send this to your logging service
  // sendToLoggingService(violationEvent);
};

// Security: URL validation
export const isValidUrl = (string) => {
  try {
    const url = new URL(string);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
};

// Security: Safe redirect helper
export const safeRedirect = (url, allowedDomains = ['teamcertify.com']) => {
  if (!isValidUrl(url)) {
    return false;
  }
  
  try {
    const urlObj = new URL(url);
    
    // Allow same origin
    if (urlObj.origin === window.location.origin) {
      return true;
    }
    
    // Check allowed domains
    return allowedDomains.some(domain => 
      urlObj.hostname === domain || 
      urlObj.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}; 