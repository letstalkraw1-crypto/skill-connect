/**
 * PKCE (Proof Key for Code Exchange) Utilities
 * 
 * Implements PKCE for OAuth 2.0 to prevent authorization code interception attacks.
 * Generates code verifiers and challenges according to RFC 7636.
 */

const crypto = require('crypto');

/**
 * Generate a cryptographically random code verifier
 * @param {number} [length=128] - Length of verifier (43-128 characters per RFC 7636)
 * @returns {string} Base64URL-encoded random string
 */
function generateCodeVerifier(length = 128) {
  if (length < 43 || length > 128) {
    throw new Error('Code verifier length must be between 43 and 128 characters');
  }
  
  // Generate random bytes and encode as base64url
  const randomBytes = crypto.randomBytes(length);
  return base64URLEncode(randomBytes);
}

/**
 * Generate code challenge from code verifier
 * @param {string} codeVerifier - The code verifier string
 * @returns {string} Base64URL-encoded SHA256 hash of the verifier
 */
function generateCodeChallenge(codeVerifier) {
  // Create SHA256 hash of the verifier
  const hash = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest();
  
  // Encode as base64url
  return base64URLEncode(hash);
}

/**
 * Encode buffer as base64url (RFC 4648)
 * @param {Buffer} buffer - Buffer to encode
 * @returns {string} Base64URL-encoded string
 */
function base64URLEncode(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Verify that a code verifier matches a code challenge
 * @param {string} codeVerifier - The code verifier to check
 * @param {string} codeChallenge - The expected code challenge
 * @returns {boolean} True if verifier matches challenge
 */
function verifyCodeChallenge(codeVerifier, codeChallenge) {
  const computedChallenge = generateCodeChallenge(codeVerifier);
  return computedChallenge === codeChallenge;
}

module.exports = {
  generateCodeVerifier,
  generateCodeChallenge,
  verifyCodeChallenge,
  base64URLEncode
};
