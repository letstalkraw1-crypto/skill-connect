/**
 * OAuth Routes
 * 
 * Defines routes for OAuth authentication flows.
 * Supports multiple providers (GitHub, Google, Microsoft, Strava).
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const oauthController = require('../controllers/oauthController');
const { optionalVerifyToken } = require('../services/auth');

// Rate limiting for OAuth endpoints
const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: 'Too many OAuth requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * GET /auth/oauth/providers
 * Get list of available OAuth providers
 */
router.get('/providers', oauthController.getAvailableProviders);

/**
 * GET /auth/oauth/:provider
 * Initiate OAuth flow for specified provider
 * Optional: Include Authorization header to link to existing account
 */
router.get('/:provider', oauthLimiter, optionalVerifyToken, oauthController.initiateOAuth);

/**
 * GET /auth/oauth/:provider/callback
 * Handle OAuth callback from provider
 */
router.get('/:provider/callback', oauthLimiter, oauthController.handleCallback);

/**
 * DELETE /auth/oauth/:provider
 * Unlink OAuth provider from user account
 * Requires authentication
 */
const { verifyToken } = require('../services/auth');
router.delete('/:provider', verifyToken, oauthController.unlinkProvider);

module.exports = router;
