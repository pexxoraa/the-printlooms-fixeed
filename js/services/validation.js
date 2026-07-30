/**
 * validation.js
 * ----------------------------------------------------------------------------
 * Shared form validation schemas and helper functions.
 * ----------------------------------------------------------------------------
 */

export const validators = {
  name: (val) => {
    if (!val || val.trim().length < 2) return 'Please enter your full name.';
    return null;
  },
  
  phone: (val) => {
    if (!val) return 'Phone number is required.';
    
    // Clean the input: remove spaces, dashes, and parentheses
    const cleaned = val.replace(/[\s\-\(\)]/g, '');
    
    // Regex for Indian mobile numbers:
    // Optional +91, 91, or 0 at the start, followed by a 10-digit number starting with 6-9.
    const phoneRegex = /^(?:(?:\+|0{0,2})91|[0]?)?[6789]\d{9}$/;
    
    if (!phoneRegex.test(cleaned)) {
      return 'Enter a valid mobile number (e.g., 9876543210 or +91...).';
    }
    return null;
  },
  
  email: (val) => {
    if (!val) return 'Email is required.';
    // Standard email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val.trim())) return 'Enter a valid email address.';
    return null;
  },
  
  address: (val) => {
    if (!val || val.trim().length < 5) return 'Please enter your full delivery address.';
    return null;
  },
  
  city: (val) => {
    if (!val || val.trim().length < 2) return 'Please enter your city.';
    return null;
  },
  
  state: (val) => {
    if (!val || val.trim().length < 2) return 'Please enter your state.';
    return null;
  },
  
  pincode: (val) => {
    if (!val) return 'Pincode is required.';
    // 6-digit Indian PIN code regex
    const pinRegex = /^[1-9][0-9]{5}$/;
    if (!pinRegex.test(val.trim())) return 'Enter a valid 6-digit pincode.';
    return null;
  },
  
  upiReference: (val) => {
    if (!val || val.trim().length < 8) return 'Please enter a valid UPI reference/UTR number.';
    return null;
  },
  
  minLength: (val, length, fieldName) => {
    if (!val || val.trim().length < length) return `${fieldName} must be at least ${length} characters.`;
    return null;
  }
};

/**
 * Validates a data object against a given schema.
 * @param {Object} data - The form data object to validate.
 * @param {Object} schema - The schema object mapping fields to validator functions.
 * @returns {Object} { valid: boolean, errors: Object }
 */
export function validateForm(data, schema) {
  let valid = true;
  const errors = {};
  
  Object.entries(schema).forEach(([field, validator]) => {
    const err = typeof validator === 'function' ? validator(data[field]) : null;
    if (err) {
      valid = false;
      errors[field] = err;
    }
  });
  
  return { valid, errors };
}
