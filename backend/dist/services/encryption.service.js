"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.maskAadhaar = maskAadhaar;
exports.encryptBuffer = encryptBuffer;
exports.decryptBuffer = decryptBuffer;
const crypto_1 = __importDefault(require("crypto"));
// In production, the AES secret key should be loaded from environment variables
// It must be a 32-byte key (64 characters when in hex)
const AES_SECRET_KEY = process.env.AES_SECRET_KEY || 'd7f023e1f57d627448d614a83e0c0df4e28e18b14e21a8dcf8c07e2c9ef895c2';
const ALGORITHM = 'aes-256-gcm';
/**
 * Encrypts a string using AES-256-GCM.
 * Returns a colon-separated string: iv:authTag:encryptedData
 */
function encrypt(text) {
    const iv = crypto_1.default.randomBytes(12);
    const key = Buffer.from(AES_SECRET_KEY, 'hex');
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}
/**
 * Decrypts a string encrypted with AES-256-GCM.
 */
function decrypt(encryptedText) {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted text format');
    }
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = Buffer.from(parts[2], 'hex');
    const key = Buffer.from(AES_SECRET_KEY, 'hex');
    const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
/**
 * Mask Aadhaar number format: XXXX-XXXX-1234
 */
function maskAadhaar(aadhaar) {
    const clean = aadhaar.replace(/\s|-/g, '');
    if (clean.length < 4)
        return aadhaar;
    return `XXXX-XXXX-${clean.slice(-4)}`;
}
/**
 * Encrypts file buffer (for storing face photos at rest)
 */
function encryptBuffer(buffer) {
    const iv = crypto_1.default.randomBytes(12);
    const key = Buffer.from(AES_SECRET_KEY, 'hex');
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
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
function decryptBuffer(encryptedBuffer, ivHex, authTagHex) {
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = Buffer.from(AES_SECRET_KEY, 'hex');
    const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
}
//# sourceMappingURL=encryption.service.js.map