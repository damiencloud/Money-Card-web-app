import { describe, it, expect } from 'vitest';
import {
  safeEmail,
  strongPasswordSchema,
  loginPasswordSchema,
  safeDisplayName,
  safeUsername,
  safeFreeText,
  sanitizeText,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  createStaffMemberSchema,
  updateStaffMemberSchema,
  updateStaffPermissionsSchema,
} from '../../src/validation/index.js';

describe('Server-Side Validation & Sanitization Layer', () => {
  describe('1. Email Validation', () => {
    it('should accept valid standard email addresses and normalize to lowercase', () => {
      const parsed = safeEmail.parse('  User.Test@Example.COM  ');
      expect(parsed).toBe('user.test@example.com');
    });

    it('should reject email missing @ symbol', () => {
      expect(() => safeEmail.parse('invalidemail.com')).toThrow();
    });

    it('should reject email missing domain or with invalid TLD', () => {
      expect(() => safeEmail.parse('user@localhost')).toThrow();
      expect(() => safeEmail.parse('user@domain.c')).toThrow();
      expect(() => safeEmail.parse('user@.com')).toThrow();
    });

    it('should reject excessively long email addresses exceeding RFC limit', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(() => safeEmail.parse(longEmail)).toThrow(/cannot exceed 254 characters/);
    });
  });

  describe('2. Strong Password Validation (Signup, Reset & Change)', () => {
    it('should accept strong password meeting all complexity requirements', () => {
      const valid = 'SecurePass@2026!';
      expect(strongPasswordSchema.parse(valid)).toBe(valid);
    });

    it('should reject password shorter than 8 characters', () => {
      expect(() => strongPasswordSchema.parse('Pass@1')).toThrow(/at least 8 characters/);
    });

    it('should reject password missing uppercase letter', () => {
      expect(() => strongPasswordSchema.parse('pass@word123')).toThrow(/uppercase letter/);
    });

    it('should reject password missing lowercase letter', () => {
      expect(() => strongPasswordSchema.parse('PASS@WORD123')).toThrow(/lowercase letter/);
    });

    it('should reject password missing numeric digit', () => {
      expect(() => strongPasswordSchema.parse('Password@Special')).toThrow(/number/);
    });

    it('should reject password missing special character', () => {
      expect(() => strongPasswordSchema.parse('Password12345')).toThrow(/special character/);
    });

    it('should reject excessively long passwords to prevent DoS attacks (>128 chars)', () => {
      const longPass = 'A1!a' + 'x'.repeat(130);
      expect(() => strongPasswordSchema.parse(longPass)).toThrow(/cannot exceed 128 characters/);
    });

    it('should NEVER sanitize, trim, or alter valid passwords', () => {
      const exactPassword = '  ExactP@ssw0rd!  ';
      const parsed = strongPasswordSchema.parse(exactPassword);
      expect(parsed).toBe(exactPassword);
      expect(parsed.startsWith('  ')).toBe(true);
    });
  });

  describe('3. Login Password Validation (Legacy/Existing User Friendly)', () => {
    it('should allow simple/legacy passwords for existing user authentication', () => {
      expect(loginPasswordSchema.parse('simplepass')).toBe('simplepass');
      expect(loginPasswordSchema.parse('123456')).toBe('123456');
    });

    it('should reject empty passwords on login', () => {
      expect(() => loginPasswordSchema.parse('')).toThrow(/required/);
    });

    it('should cap login password length to 128 to prevent hashing DoS', () => {
      expect(() => loginPasswordSchema.parse('a'.repeat(200))).toThrow(/cannot exceed 128 characters/);
    });
  });

  describe('4. Display Name & Free-Text Sanitization', () => {
    it('should sanitize dangerous HTML tags and script injections from names', () => {
      const malicious = 'John <script>alert("xss")</script>Doe';
      const sanitized = safeDisplayName.parse(malicious);
      expect(sanitized).toBe('John Doe');
      expect(sanitized).not.toContain('<script>');
    });

    it('should strip event handlers and HTML tags from free-text fields', () => {
      const dangerousBio = '<img src=x onerror="alert(1)"> Software <b onmouseover="alert(2)">Engineer</b>';
      const cleanBio = safeFreeText.parse(dangerousBio);
      expect(cleanBio).toBe('Software Engineer');
      expect(cleanBio).not.toContain('<img');
      expect(cleanBio).not.toContain('onerror');
    });

    it('should reject names that become too short after sanitization', () => {
      expect(() => safeDisplayName.parse('<script></script>')).toThrow(/at least 2 valid characters/);
    });
  });

  describe('5. Username Validation', () => {
    it('should accept valid alphanumeric usernames with hyphens and underscores', () => {
      expect(safeUsername.parse('alex_dev-99')).toBe('alex_dev-99');
    });

    it('should reject usernames with HTML, spaces, or illegal symbols', () => {
      expect(() => safeUsername.parse('user<script>')).toThrow();
      expect(() => safeUsername.parse('user name')).toThrow();
      expect(() => safeUsername.parse('user@domain')).toThrow();
      expect(() => safeUsername.parse('us')).toThrow(/at least 3 characters/);
    });
  });

  describe('6. Anti-Mass-Assignment & Schema Strictness', () => {
    it('should reject unexpected sensitive fields in profile updates (strict allowlist)', () => {
      const payload = {
        name: 'Jane Doe',
        role: 'SUPER_ADMIN', // Mass assignment attempt
        organizationId: 'org_injected',
        permissions: ['ALL'],
      };

      expect(() => updateProfileSchema.parse(payload)).toThrow(/Unrecognized key/);
    });

    it('should reject unexpected fields in staff creation', () => {
      const payload = {
        name: 'New Staff',
        email: 'staff@example.com',
        password: 'SecurePass@2026',
        isSuperAdmin: true, // Malicious injected key
      };

      expect(() => createStaffMemberSchema.parse(payload)).toThrow(/Unrecognized key/);
    });

    it('should reject unexpected fields in staff update', () => {
      const payload = {
        status: 'ACTIVE',
        passwordHash: 'injected_hash',
      };

      expect(() => updateStaffMemberSchema.parse(payload)).toThrow(/Unrecognized key/);
    });

    it('should accept updateStaffPermissionsSchema with permissions or permissionCodes', () => {
      const withPermissions = {
        permissions: ['CARD_VIEW', 'INVENTORY_VIEW', 'INVENTORY_MANAGE'],
      };
      expect(() => updateStaffPermissionsSchema.parse(withPermissions)).not.toThrow();

      const withPermissionCodes = {
        permissionCodes: ['CARD_VIEW', 'RECHARGE'],
      };
      expect(() => updateStaffPermissionsSchema.parse(withPermissionCodes)).not.toThrow();

      const both = {
        permissions: ['CARD_VIEW'],
        permissionCodes: ['CARD_VIEW'],
      };
      expect(() => updateStaffPermissionsSchema.parse(both)).not.toThrow();

      const emptyObj = {};
      expect(() => updateStaffPermissionsSchema.parse(emptyObj)).toThrow();
    });
  });

  describe('7. Auth Flow Schemas & Password Matching', () => {
    it('should enforce matching confirmPassword if provided in resetPasswordSchema', () => {
      const matching = {
        token: 'valid_token_123',
        newPassword: 'NewPassword@2026',
        confirmPassword: 'NewPassword@2026',
      };
      expect(() => resetPasswordSchema.parse(matching)).not.toThrow();

      const mismatched = {
        token: 'valid_token_123',
        newPassword: 'NewPassword@2026',
        confirmPassword: 'DifferentPassword@2026',
      };
      expect(() => resetPasswordSchema.parse(mismatched)).toThrow(/Passwords do not match/);
    });

    it('should enforce matching confirmPassword in changePasswordSchema', () => {
      const matching = {
        currentPassword: 'OldPassword@2026',
        newPassword: 'NewPassword@2026',
        confirmPassword: 'NewPassword@2026',
      };
      expect(() => changePasswordSchema.parse(matching)).not.toThrow();
    });
  });
});
