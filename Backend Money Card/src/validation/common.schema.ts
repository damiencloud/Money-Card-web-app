import { z } from 'zod';

/**
 * Safely strips dangerous HTML tags, script blocks, event handlers, and javascript: protocols.
 * Preserves normal punctuation and human-readable text.
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Strip <script>...</script>
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')   // Strip <style>...</style>
    .replace(/<[^>]+>/g, '')                                             // Strip all HTML tags
    .replace(/javascript:/gi, '')                                        // Strip javascript: pseudo-protocol
    .replace(/on\w+\s*=/gi, '')                                         // Strip event handlers (onload=, onerror=)
    .trim();
}

/**
 * Standard safe ID (UUID or alphanumeric ID)
 */
export const safeId = z
  .string({ required_error: 'ID is required' })
  .trim()
  .min(1, 'ID cannot be empty')
  .max(64, 'ID exceeds maximum length')
  .regex(/^[a-zA-Z0-9_-]+$/, 'ID must only contain alphanumeric characters, hyphens, or underscores');

/**
 * Email validation schema:
 * - RFC compliant format check
 * - Domain structure verification (must have TLD >= 2 chars)
 * - Maximum length 254 chars (RFC 5321)
 * - Safe case-normalization (lowercased & trimmed)
 */
export const safeEmail = z
  .string({ required_error: 'Email is required' })
  .trim()
  .min(3, 'Email is too short')
  .max(254, 'Email cannot exceed 254 characters')
  .email('Please provide a valid email address')
  .toLowerCase()
  .refine((val) => {
    const parts = val.split('@');
    if (parts.length !== 2) return false;
    const [local, domain] = parts;
    if (!local || !domain) return false;
    if (domain.indexOf('.') === -1) return false;
    const domainParts = domain.split('.');
    const tld = domainParts[domainParts.length - 1];
    return !!tld && tld.length >= 2 && !domain.startsWith('.') && !domain.endsWith('.');
  }, { message: 'Please provide a valid email domain' });

/**
 * Strong password schema for signup, password change, and password reset:
 * - Enforces minimum 8 characters, maximum 128 characters
 * - Requires at least one uppercase letter [A-Z]
 * - Requires at least one lowercase letter [a-z]
 * - Requires at least one digit [0-9]
 * - Requires at least one special character
 * - NEVER sanitizes, trims, or modifies the password string
 */
export const strongPasswordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password cannot exceed 128 characters')
  .refine((val) => /[A-Z]/.test(val), {
    message: 'Password must contain at least one uppercase letter',
  })
  .refine((val) => /[a-z]/.test(val), {
    message: 'Password must contain at least one lowercase letter',
  })
  .refine((val) => /[0-9]/.test(val), {
    message: 'Password must contain at least one number',
  })
  .refine((val) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(val), {
    message: 'Password must contain at least one special character (!@#$%^&*...)',
  });

/**
 * Login password schema:
 * - Only checks presence and maximum length (128 chars) to protect hashing DoS
 * - Does NOT enforce complexity on login so legacy/existing users can authenticate
 * - NEVER sanitizes or modifies the password string
 */
export const loginPasswordSchema = z
  .string({ required_error: 'Password is required' })
  .min(1, 'Password is required')
  .max(128, 'Password cannot exceed 128 characters');

/**
 * Safe display name:
 * - 2 to 100 characters
 * - Strips dangerous HTML tags and script injections
 */
export const safeDisplayName = z
  .string({ required_error: 'Name is required' })
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name cannot exceed 100 characters')
  .transform((val) => sanitizeText(val))
  .refine((val) => val.length >= 2, {
    message: 'Name must contain at least 2 valid characters',
  });

/**
 * Strict username whitelist:
 * - 3 to 30 characters
 * - Only A-Z, a-z, 0-9, underscore _, and hyphen -
 */
export const safeUsername = z
  .string({ required_error: 'Username is required' })
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username cannot exceed 30 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');

/**
 * Free-text fields (bio, description, notes, address):
 * - Up to 500 characters
 * - Automatically strips scripts, HTML tags, and event handlers
 */
export const safeFreeText = z
  .string()
  .max(500, 'Text cannot exceed 500 characters')
  .transform((val) => sanitizeText(val));

export const safePhoneNumber = z
  .string()
  .trim()
  .max(20, 'Phone number cannot exceed 20 characters')
  .regex(/^[+0-9\s()-]*$/, 'Phone number contains invalid characters')
  .optional();
