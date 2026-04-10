/**
 * OAuth Provider Registry
 * 
 * Centralized configuration for all supported OAuth providers.
 * Loads provider configurations from environment variables and provides
 * methods to retrieve provider details.
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

/**
 * OAuth provider configurations
 * @type {Object.<string, import('../types/oauth').OAuthProvider>}
 */
const providers = {
  github: {
    name: 'github',
    displayName: 'GitHub',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scope: ['read:user', 'user:email'],
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    callbackPath: '/api/auth/oauth/github/callback',
    icon: 'github'
  },
  google: {
    name: 'google',
    displayName: 'Google',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scope: ['openid', 'email', 'profile'],
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackPath: '/api/auth/oauth/google/callback',
    icon: 'google'
  },
  microsoft: {
    name: 'microsoft',
    displayName: 'Microsoft',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    scope: ['openid', 'email', 'profile'],
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    callbackPath: '/api/auth/oauth/microsoft/callback',
    icon: 'microsoft'
  },
  strava: {
    name: 'strava',
    displayName: 'Strava',
    authUrl: 'https://www.strava.com/oauth/authorize',
    tokenUrl: 'https://www.strava.com/oauth/token',
    userInfoUrl: 'https://www.strava.com/api/v3/athlete',
    scope: ['read', 'activity:read'],
    clientId: process.env.STRAVA_CLIENT_ID || '',
    clientSecret: process.env.STRAVA_CLIENT_SECRET || '',
    callbackPath: '/api/auth/oauth/strava/callback',
    icon: 'strava'
  }
};

/**
 * Check if a provider is enabled (has required credentials)
 * @param {string} providerName - Provider identifier
 * @returns {boolean} True if provider has client ID and secret
 */
function isProviderEnabled(providerName) {
  const provider = providers[providerName];
  if (!provider) return false;
  return !!(provider.clientId && provider.clientSecret);
}

/**
 * Get provider configuration by name
 * @param {string} providerName - Provider identifier
 * @returns {import('../types/oauth').OAuthProvider | null} Provider config or null if not found/disabled
 */
function getProvider(providerName) {
  const provider = providers[providerName];
  if (!provider) return null;
  if (!isProviderEnabled(providerName)) return null;
  return provider;
}

/**
 * Get all enabled providers
 * @returns {import('../types/oauth').OAuthProvider[]} Array of enabled provider configurations
 */
function getAllProviders() {
  return Object.values(providers).filter(provider => 
    isProviderEnabled(provider.name)
  );
}

/**
 * Get callback URL for a provider
 * @param {string} providerName - Provider identifier
 * @returns {string | null} Full callback URL or null if provider not found
 */
function getCallbackUrl(providerName) {
  const provider = getProvider(providerName);
  if (!provider) return null;
  return `${BACKEND_URL}${provider.callbackPath}`;
}

module.exports = {
  getProvider,
  getAllProviders,
  isProviderEnabled,
  getCallbackUrl
};
