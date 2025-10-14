/**
 * Password Validation Utility
 * Provides comprehensive password strength validation
 */

export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0-5 (0 = very weak, 5 = very strong)
  errors: string[];
  warnings: string[];
}

// Common weak passwords to check against
const COMMON_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', '1234567',
  'letmein', 'trustno1', 'dragon', 'baseball', '111111', 'iloveyou', 'master',
  'sunshine', 'ashley', 'bailey', 'passw0rd', 'shadow', '123123', '654321',
  'superman', 'qazwsx', 'michael', 'football', 'password1', '000000'
];

/**
 * Validates password strength and security
 * @param password - The password to validate
 * @param options - Validation options
 * @returns Validation result with errors and score
 */
export function validatePassword(
  password: string,
  options: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
    checkCommonPasswords?: boolean;
  } = {}
): PasswordValidationResult {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = true,
    checkCommonPasswords = true,
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  // Check if password exists
  if (!password || password.trim() === '') {
    return {
      isValid: false,
      score: 0,
      errors: ['Password is required'],
      warnings: [],
    };
  }

  // Length check
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  } else if (password.length >= minLength) {
    score += 1;
  }

  if (password.length >= 12) {
    score += 1;
  }

  if (password.length >= 16) {
    score += 1;
  }

  // Uppercase check
  const hasUppercase = /[A-Z]/.test(password);
  if (requireUppercase && !hasUppercase) {
    errors.push('Password must contain at least one uppercase letter');
  } else if (hasUppercase) {
    score += 1;
  }

  // Lowercase check
  const hasLowercase = /[a-z]/.test(password);
  if (requireLowercase && !hasLowercase) {
    errors.push('Password must contain at least one lowercase letter');
  } else if (hasLowercase) {
    score += 1;
  }

  // Numbers check
  const hasNumbers = /\d/.test(password);
  if (requireNumbers && !hasNumbers) {
    errors.push('Password must contain at least one number');
  } else if (hasNumbers) {
    score += 1;
  }

  // Special characters check
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  if (requireSpecialChars && !hasSpecialChars) {
    errors.push('Password must contain at least one special character (!@#$%^&* etc.)');
  } else if (hasSpecialChars) {
    score += 1;
  }

  // Common password check
  if (checkCommonPasswords) {
    const lowerPassword = password.toLowerCase();
    if (COMMON_PASSWORDS.includes(lowerPassword)) {
      errors.push('This password is too common and easily guessable');
      score = Math.max(0, score - 2);
    }
  }

  // Sequential characters check
  const hasSequential = /(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password);
  if (hasSequential) {
    warnings.push('Password contains sequential characters (abc, 123) which are less secure');
    score = Math.max(0, score - 1);
  }

  // Repeated characters check
  const hasRepeated = /(.)\1{2,}/.test(password);
  if (hasRepeated) {
    warnings.push('Password contains repeated characters (aaa, 111) which are less secure');
    score = Math.max(0, score - 1);
  }

  // Cap score at 5
  score = Math.min(5, score);

  return {
    isValid: errors.length === 0,
    score,
    errors,
    warnings,
  };
}

/**
 * Get password strength label based on score
 * @param score - Password strength score (0-5)
 * @returns Strength label and color
 */
export function getPasswordStrength(score: number): {
  label: string;
  color: string;
  description: string;
} {
  if (score === 0) {
    return {
      label: 'Very Weak',
      color: 'text-red-600',
      description: 'This password is very weak and easily cracked',
    };
  } else if (score === 1) {
    return {
      label: 'Weak',
      color: 'text-orange-600',
      description: 'This password needs improvement',
    };
  } else if (score === 2) {
    return {
      label: 'Fair',
      color: 'text-yellow-600',
      description: 'This password is acceptable but could be stronger',
    };
  } else if (score === 3) {
    return {
      label: 'Good',
      color: 'text-blue-600',
      description: 'This is a good password',
    };
  } else if (score === 4) {
    return {
      label: 'Strong',
      color: 'text-green-600',
      description: 'This is a strong password',
    };
  } else {
    return {
      label: 'Very Strong',
      color: 'text-green-700',
      description: 'This is a very strong password',
    };
  }
}
