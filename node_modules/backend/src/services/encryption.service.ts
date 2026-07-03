import crypto from 'crypto';

// In production, the AES secret key should be loaded from environment variables
// It must be a 32-byte key (64 characters when in hex)
const AES_SECRET_KEY = process.env.AES_SECRET_KEY || 'd7f023e1f57d627448d614a83e0c0df4e28e18b14e21a8dcf8c07e2c9ef895c2';
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts a string using AES-256-GCM.
 * Returns a colon-separated string: iv:authTag:encryptedData
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const key = Buffer.from(AES_SECRET_KEY, 'hex');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a string encrypted with AES-256-GCM.
 */
export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = Buffer.from(parts[2], 'hex');
  const key = Buffer.from(AES_SECRET_KEY, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Mask Aadhaar number format: XXXX-XXXX-1234
 */
export function maskAadhaar(aadhaar: string): string {
  const clean = aadhaar.replace(/\s|-/g, '');
  if (clean.length < 4) return aadhaar;
  return `XXXX-XXXX-${clean.slice(-4)}`;
}

/**
 * Encrypts file buffer (for storing face photos at rest)
 */
export function encryptBuffer(buffer: Buffer): { iv: string; authTag: string; data: Buffer } {
  const iv = crypto.randomBytes(12);
  const key = Buffer.from(AES_SECRET_KEY, 'hex');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag().toString('hex');
  
  return {
    iv: iv.toString('hex'),
    authTag: authTag,
    data: encrypted
  };
}

/**
 * Decrypts file buffer (for serving face photos)
 */
export function decryptBuffer(encryptedBuffer: Buffer, ivHex: string, authTagHex: string): Buffer {
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = Buffer.from(AES_SECRET_KEY, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
}
