# Security Recommendations for Property Management System

## 🔒 Critical Security Issues

### 1. Sensitive Data Exposure

**Current Issues:**
- Access codes, passwords, and security information stored in plain text
- Sensitive fields visible in API responses
- No encryption for:
  - `gate_code`
  - `door_lock_password`
  - `alarm_passcode`
  - `wifi_password`
  - `storage_code`
  - `pool_access_code`

**Recommendations:**

#### A. Database-Level Encryption
```sql
-- Create encryption extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted columns (migration)
ALTER TABLE property_access
  ADD COLUMN gate_code_encrypted BYTEA,
  ADD COLUMN door_lock_password_encrypted BYTEA,
  ADD COLUMN alarm_passcode_encrypted BYTEA;

ALTER TABLE property_communication
  ADD COLUMN wifi_password_encrypted BYTEA;

ALTER TABLE property_extras
  ADD COLUMN storage_code_encrypted BYTEA,
  ADD COLUMN pool_access_code_encrypted BYTEA;

-- Migration script to encrypt existing data
UPDATE property_access
SET gate_code_encrypted = pgp_sym_encrypt(gate_code, current_setting('app.encryption_key'))
WHERE gate_code IS NOT NULL;

-- Drop plain text columns after migration
ALTER TABLE property_access
  DROP COLUMN gate_code,
  DROP COLUMN door_lock_password,
  DROP COLUMN alarm_passcode;
```

#### B. Application-Level Access Control
```typescript
// Create a secure access utility
// src/lib/secure-access.ts

import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY;

export const encryptSensitiveData = (data: string): string => {
  return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
};

export const decryptSensitiveData = (encryptedData: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// Only decrypt when user explicitly requests to view
export const useSensitiveField = (encryptedValue: string) => {
  const [revealed, setRevealed] = useState(false);
  const [value, setValue] = useState('••••••••');

  const reveal = () => {
    setValue(decryptSensitiveData(encryptedValue));
    setRevealed(true);
  };

  const hide = () => {
    setValue('••••••••');
    setRevealed(false);
  };

  return { value, revealed, reveal, hide };
};
```

---

### 2. Row-Level Security (RLS)

**Current Issue:** No row-level security policies in Supabase

**Implementation:**

```sql
-- Enable RLS on all tables
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_communication ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_location ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_extras ENABLE ROW LEVEL SECURITY;

-- Admin users can see all properties
CREATE POLICY "Admins can view all properties"
ON properties FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'user_type' = 'admin'
);

-- Ops users can only see properties they own or manage
CREATE POLICY "Ops users can view assigned properties"
ON properties FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'user_type' = 'ops'
  AND (
    owner_id = auth.uid()
    OR property_id IN (
      SELECT property_id FROM property_managers WHERE user_id = auth.uid()
    )
  )
);

-- Only admins can modify properties
CREATE POLICY "Only admins can modify properties"
ON properties FOR ALL
TO authenticated
USING (auth.jwt() ->> 'user_type' = 'admin')
WITH CHECK (auth.jwt() ->> 'user_type' = 'admin');

-- Restrict access to sensitive data
CREATE POLICY "Only admins can view access codes"
ON property_access FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'user_type' = 'admin');
```

---

### 3. XSS Protection

**Current Issue:** User input not sanitized, potential XSS vulnerabilities

**Recommendations:**

```typescript
// Install DOMPurify
// npm install dompurify @types/dompurify

// src/lib/sanitize.ts
import DOMPurify from 'dompurify';

export const sanitizeInput = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
  });
};

export const sanitizeHTML = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target'],
  });
};

// Use in forms
const handleSubmit = (data: PropertyInsert) => {
  const sanitizedData = {
    ...data,
    property_name: sanitizeInput(data.property_name),
    // ... other fields
  };
  createProperty(sanitizedData);
};
```

---

### 4. API Key Security

**Current Issue:** Supabase keys may be exposed in client-side code

**Recommendations:**

1. **Use Environment Variables:**
```env
# .env (never commit this file)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ENCRYPTION_KEY=your-encryption-key-min-32-chars
```

2. **Enable Supabase Auth Policies:**
```sql
-- Ensure anon key has minimal permissions
-- Use authenticated users for sensitive operations
```

3. **Implement API Rate Limiting:**
```typescript
// src/lib/rate-limiter.ts
export const rateLimiter = {
  attempts: new Map<string, number>(),

  checkLimit(key: string, maxAttempts = 5, windowMs = 60000): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || 0;

    if (attempts >= maxAttempts) {
      return false; // Rate limit exceeded
    }

    this.attempts.set(key, attempts + 1);

    setTimeout(() => {
      this.attempts.delete(key);
    }, windowMs);

    return true;
  }
};
```

---

### 5. Authentication & Authorization

**Current Issue:** Basic auth without MFA or session management

**Recommendations:**

1. **Implement Multi-Factor Authentication (MFA)**
2. **Add Session Timeout**
3. **Implement Password Policies**

```typescript
// src/lib/auth-security.ts
export const AUTH_CONFIG = {
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  PASSWORD_MIN_LENGTH: 12,
  REQUIRE_SPECIAL_CHARS: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_UPPERCASE: true,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
};

export const validatePassword = (password: string): boolean => {
  if (password.length < AUTH_CONFIG.PASSWORD_MIN_LENGTH) return false;
  if (AUTH_CONFIG.REQUIRE_SPECIAL_CHARS && !/[!@#$%^&*]/.test(password)) return false;
  if (AUTH_CONFIG.REQUIRE_NUMBERS && !/\d/.test(password)) return false;
  if (AUTH_CONFIG.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) return false;
  return true;
};
```

---

### 6. Audit Logging

**Current Issue:** Limited audit trails for sensitive operations

**Recommendations:**

```typescript
// Enhance activity logging
export const logSensitiveAccess = async (
  action: 'VIEW' | 'EDIT' | 'DELETE',
  resourceType: string,
  resourceId: string,
  sensitiveFields?: string[]
) => {
  await supabase.from('security_audit_logs').insert({
    user_id: currentUser.id,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    sensitive_fields: sensitiveFields,
    ip_address: await getUserIP(),
    user_agent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  });
};

// Use in components
const handleViewAccessCode = async (propertyId: string) => {
  await logSensitiveAccess('VIEW', 'property_access', propertyId, ['gate_code']);
  // ... show access code
};
```

---

### 7. CORS & Content Security Policy

**Add to vite.config.ts:**
```typescript
export default defineConfig({
  server: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    }
  }
});
```

---

## 🛡️ Implementation Priority

### Phase 1 (Immediate - Week 1)
1. ✅ Enable RLS on Supabase tables
2. ✅ Implement field-level encryption for access codes
3. ✅ Add XSS sanitization to all user inputs
4. ✅ Configure environment variables properly

### Phase 2 (Short-term - Week 2-3)
1. ⏳ Add comprehensive audit logging
2. ⏳ Implement session timeout
3. ⏳ Add rate limiting
4. ⏳ Enable MFA for admin accounts

### Phase 3 (Mid-term - Month 2)
1. ⏳ Security audit of all API endpoints
2. ⏳ Penetration testing
3. ⏳ Add security headers (CSP, etc.)
4. ⏳ Implement IP whitelisting for admin access

---

## 📋 Security Checklist

- [ ] All sensitive data encrypted at rest
- [ ] Row-level security enabled on all tables
- [ ] User inputs sanitized against XSS
- [ ] CSRF tokens implemented for state-changing operations
- [ ] API rate limiting in place
- [ ] MFA enabled for admin accounts
- [ ] Session timeout configured
- [ ] Audit logging for sensitive operations
- [ ] Security headers configured
- [ ] Regular security audits scheduled
- [ ] Dependency vulnerability scanning enabled
- [ ] Secrets management (not in source code)
- [ ] Backup encryption enabled
- [ ] Disaster recovery plan documented

---

## 🔍 Monitoring & Alerts

Set up alerts for:
- Multiple failed login attempts
- Access to sensitive fields (access codes, passwords)
- Unusual data export patterns
- API rate limit violations
- Unauthorized access attempts

---

## 📞 Security Incident Response

1. **Detection:** Monitor logs and alerts
2. **Containment:** Disable affected accounts/endpoints
3. **Investigation:** Review audit logs
4. **Remediation:** Fix vulnerabilities
5. **Communication:** Notify affected users
6. **Documentation:** Update security procedures

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [React Security Best Practices](https://react.dev/learn/security)
