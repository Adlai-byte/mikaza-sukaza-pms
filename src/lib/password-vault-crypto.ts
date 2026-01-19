/**
 * Password Vault Cryptographic Utilities
 *
 * Provides client-side encryption/decryption for the password vault using Web Crypto API.
 * - AES-256-GCM for symmetric encryption
 * - PBKDF2 for key derivation from master password
 * - bcrypt-style hashing for master password verification
 *
 * SECURITY NOTES:
 * - Master password is NEVER sent to the server
 * - Derived encryption key exists only in browser memory
 * - Server only stores encrypted blobs and hash for verification
 */

// ============================================
// CONSTANTS
// ============================================

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 256; // bits
const SALT_LENGTH = 16; // bytes
const IV_LENGTH = 12; // bytes for AES-GCM

// Session storage key for vault unlock state
const VAULT_UNLOCK_KEY = 'password_vault_unlock_state';
const VAULT_UNLOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// ============================================
// TYPES
// ============================================

export interface EncryptedData {
  ciphertext: string; // Base64 encoded
  iv: string; // Base64 encoded
}

export interface VaultUnlockState {
  salt: string;
  unlockedAt: number;
  // Key is stored in memory only, not in session storage
}

// In-memory key storage (cleared on page unload)
let derivedKey: CryptoKey | null = null;
let unlockTimeout: ReturnType<typeof setTimeout> | null = null;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generate cryptographically secure random bytes
 */
function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Generate a random salt for PBKDF2 key derivation
 */
export function generateSalt(): string {
  const salt = generateRandomBytes(SALT_LENGTH);
  return arrayBufferToBase64(salt.buffer);
}

// ============================================
// KEY DERIVATION
// ============================================

/**
 * Derive an AES-256-GCM key from a master password using PBKDF2
 *
 * @param masterPassword - The user's master password
 * @param salt - Base64 encoded salt (must be consistent for the same vault)
 * @returns CryptoKey for encryption/decryption
 */
export async function deriveKey(masterPassword: string, salt: string): Promise<CryptoKey> {
  // Import master password as key material
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(masterPassword);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive the actual encryption key
  const saltBuffer = base64ToArrayBuffer(salt);

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false, // Not extractable - security best practice
    ['encrypt', 'decrypt']
  );

  return key;
}

// ============================================
// ENCRYPTION / DECRYPTION
// ============================================

/**
 * Encrypt plaintext using AES-256-GCM
 *
 * @param plaintext - The text to encrypt
 * @param key - The CryptoKey to use for encryption
 * @returns Object with Base64 encoded ciphertext and IV
 */
export async function encryptData(plaintext: string, key: CryptoKey): Promise<EncryptedData> {
  const encoder = new TextEncoder();
  const plaintextBuffer = encoder.encode(plaintext);

  // Generate a fresh random IV for each encryption (required for AES-GCM security)
  const iv = generateRandomBytes(IV_LENGTH);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    plaintextBuffer
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

/**
 * Decrypt ciphertext using AES-256-GCM
 *
 * @param ciphertext - Base64 encoded ciphertext
 * @param iv - Base64 encoded initialization vector
 * @param key - The CryptoKey to use for decryption
 * @returns Decrypted plaintext
 */
export async function decryptData(ciphertext: string, iv: string, key: CryptoKey): Promise<string> {
  const ciphertextBuffer = base64ToArrayBuffer(ciphertext);
  const ivBuffer = base64ToArrayBuffer(iv);

  const plaintextBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBuffer,
    },
    key,
    ciphertextBuffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(plaintextBuffer);
}

// ============================================
// MASTER PASSWORD HASHING (for verification)
// ============================================

/**
 * Hash a master password for storage (verification purposes only)
 * Uses PBKDF2 with SHA-256 to create a verifiable hash
 *
 * @param password - The master password to hash
 * @param salt - Optional salt (generates new one if not provided)
 * @returns Object with hash and salt (both Base64 encoded)
 */
export async function hashMasterPassword(
  password: string,
  existingSalt?: string
): Promise<{ hash: string; salt: string }> {
  const salt = existingSalt || generateSalt();
  const saltBuffer = base64ToArrayBuffer(salt);

  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  // Derive bits for hashing (different from encryption key)
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256 // 256 bits = 32 bytes
  );

  return {
    hash: arrayBufferToBase64(hashBuffer),
    salt: salt,
  };
}

/**
 * Verify a master password against a stored hash
 *
 * @param password - The password to verify
 * @param storedHash - The stored hash (Base64)
 * @param salt - The salt used when hashing (Base64)
 * @returns True if password matches
 */
export async function verifyMasterPassword(
  password: string,
  storedHash: string,
  salt: string
): Promise<boolean> {
  const { hash } = await hashMasterPassword(password, salt);
  return hash === storedHash;
}

// ============================================
// VAULT SESSION MANAGEMENT
// ============================================

/**
 * Unlock the vault by deriving and storing the encryption key
 *
 * @param masterPassword - The master password
 * @param salt - The salt for key derivation
 */
export async function unlockVault(masterPassword: string, salt: string): Promise<void> {
  // Derive and store the key in memory
  derivedKey = await deriveKey(masterPassword, salt);

  // Store unlock state in session storage (without the key)
  const state: VaultUnlockState = {
    salt,
    unlockedAt: Date.now(),
  };
  sessionStorage.setItem(VAULT_UNLOCK_KEY, JSON.stringify(state));

  // Set auto-lock timeout
  if (unlockTimeout) {
    clearTimeout(unlockTimeout);
  }
  unlockTimeout = setTimeout(() => {
    lockVault();
  }, VAULT_UNLOCK_TIMEOUT);
}

/**
 * Lock the vault by clearing the encryption key
 */
export function lockVault(): void {
  derivedKey = null;
  sessionStorage.removeItem(VAULT_UNLOCK_KEY);
  if (unlockTimeout) {
    clearTimeout(unlockTimeout);
    unlockTimeout = null;
  }
}

/**
 * Check if the vault is currently unlocked
 */
export function isVaultUnlocked(): boolean {
  if (!derivedKey) {
    return false;
  }

  // Check if the session has expired
  const stateJson = sessionStorage.getItem(VAULT_UNLOCK_KEY);
  if (!stateJson) {
    lockVault();
    return false;
  }

  const state: VaultUnlockState = JSON.parse(stateJson);
  const elapsed = Date.now() - state.unlockedAt;

  if (elapsed > VAULT_UNLOCK_TIMEOUT) {
    lockVault();
    return false;
  }

  return true;
}

/**
 * Get the derived key (only if vault is unlocked)
 */
export function getDerivedKey(): CryptoKey | null {
  if (!isVaultUnlocked()) {
    return null;
  }
  return derivedKey;
}

/**
 * Reset the auto-lock timer (call on user activity)
 */
export function resetAutoLockTimer(): void {
  if (!isVaultUnlocked()) {
    return;
  }

  // Update the unlock timestamp
  const stateJson = sessionStorage.getItem(VAULT_UNLOCK_KEY);
  if (stateJson) {
    const state: VaultUnlockState = JSON.parse(stateJson);
    state.unlockedAt = Date.now();
    sessionStorage.setItem(VAULT_UNLOCK_KEY, JSON.stringify(state));
  }

  // Reset the timeout
  if (unlockTimeout) {
    clearTimeout(unlockTimeout);
  }
  unlockTimeout = setTimeout(() => {
    lockVault();
  }, VAULT_UNLOCK_TIMEOUT);
}

/**
 * Get the current vault salt (if set)
 */
export function getVaultSalt(): string | null {
  const stateJson = sessionStorage.getItem(VAULT_UNLOCK_KEY);
  if (!stateJson) {
    return null;
  }
  const state: VaultUnlockState = JSON.parse(stateJson);
  return state.salt;
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Encrypt data using the current vault session
 * @param plaintext - The text to encrypt
 * @throws Error if vault is locked
 */
export async function encryptWithVault(plaintext: string): Promise<EncryptedData> {
  const key = getDerivedKey();
  if (!key) {
    throw new Error('Vault is locked. Please unlock with master password.');
  }
  resetAutoLockTimer();
  return encryptData(plaintext, key);
}

/**
 * Decrypt data using the current vault session
 * @throws Error if vault is locked
 */
export async function decryptWithVault(ciphertext: string, iv: string): Promise<string> {
  const key = getDerivedKey();
  if (!key) {
    throw new Error('Vault is locked. Please unlock with master password.');
  }
  resetAutoLockTimer();
  return decryptData(ciphertext, iv, key);
}

// ============================================
// CLEANUP ON PAGE UNLOAD
// ============================================

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    lockVault();
  });
}
