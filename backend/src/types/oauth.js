/**
 * OAuth Type Definitions (JSDoc for type safety in JavaScript)
 * 
 * These JSDoc comments provide type information for OAuth-related objects
 * and can be used by IDEs for autocomplete and type checking.
 */

/**
 * @typedef {Object} OAuthProvider
 * @property {string} name - Provider identifier (e.g., 'github', 'google')
 * @property {string} displayName - Human-readable provider name
 * @property {string} authUrl - OAuth authorization endpoint URL
 * @property {string} tokenUrl - Token exchange endpoint URL
 * @property {string} userInfoUrl - User profile endpoint URL
 * @property {string[]} scope - Required OAuth scopes
 * @property {string} clientId - OAuth client ID from environment
 * @property {string} clientSecret - OAuth client secret from environment
 * @property {string} callbackPath - Callback path for this provider
 * @property {string} [icon] - Optional icon identifier
 */

/**
 * @typedef {Object} OAuthTokenResponse
 * @property {string} access_token - Access token from provider
 * @property {string} token_type - Token type (usually 'Bearer')
 * @property {number} expires_in - Token expiration in seconds
 * @property {string} [refresh_token] - Optional refresh token
 * @property {string} [id_token] - Optional ID token (OpenID Connect)
 * @property {string} [scope] - Granted scopes
 */

/**
 * @typedef {Object} OAuthUserProfile
 * @property {string} providerId - Unique user ID from provider
 * @property {string} email - User's email address
 * @property {string} name - User's display name
 * @property {string} [username] - Username (provider-specific)
 * @property {string} [avatarUrl] - Profile picture URL
 * @property {boolean} emailVerified - Whether email is verified by provider
 */

/**
 * @typedef {Object} OAuthState
 * @property {string} token - Random UUID state token
 * @property {string} codeVerifier - PKCE code verifier
 * @property {string} provider - Provider name
 * @property {string} [userId] - Optional user ID for account linking
 * @property {number} createdAt - Unix timestamp
 * @property {number} expiresAt - Unix timestamp (10 minutes from creation)
 */

/**
 * @typedef {Object} GitHubUserData
 * @property {number} public_repos - Number of public repositories
 * @property {number} followers - Number of followers
 * @property {string} login - GitHub username
 */

module.exports = {};
