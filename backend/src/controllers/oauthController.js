/**
 * OAuth Controller
 * 
 * Handles OAuth initiation and callback endpoints for all providers.
 * Manages the OAuth flow including state generation, PKCE, token exchange,
 * and user account linking/creation.
 */

const { getProvider } = require('../services/oauthProviderRegistry');
const { createState, verifyState, deleteState } = require('../services/oauthStateManager');
const { generateCodeVerifier, generateCodeChallenge } = require('../utils/pkce');
const oauthService = require('../services/oauthService');

/**
 * Initiate OAuth flow
 * GET /auth/oauth/:provider?skillId=xxx&skillName=xxx
 */
async function initiateOAuth(req, res) {
  const { provider: providerName } = req.params;
  const { skillId, skillName } = req.query;
  
  try {
    // Step 1: Validate provider
    const provider = getProvider(providerName);
    if (!provider) {
      return res.status(400).json({ 
        error: 'Invalid or unsupported provider',
        message: `Provider '${providerName}' is not available or not configured`
      });
    }

    // Step 2: Generate security parameters
    const codeVerifier = generateCodeVerifier(128);
    const codeChallenge = generateCodeChallenge(codeVerifier);
    
    // Step 3: Store state in Redis with skill context
    const userId = req.user?.userId; // For account linking if user is authenticated
    const state = await createState(providerName, codeVerifier, userId, skillId, skillName);
    
    // Step 4: Build authorization URL
    const authUrl = oauthService.generateAuthUrl(
      provider,
      state.token,
      codeChallenge
    );
    
    // Step 5: Redirect user to provider
    return res.redirect(authUrl);
    
  } catch (err) {
    console.error('[OAuth] Initiation error:', err);
    return res.status(500).json({ 
      error: 'Failed to initiate OAuth',
      message: err.message 
    });
  }
}

/**
 * Handle OAuth callback
 * GET /auth/oauth/:provider/callback
 */
async function handleCallback(req, res) {
  const { provider: providerName } = req.params;
  const { code, state: stateToken, error: oauthError } = req.query;
  
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  try {
    // Handle user denial or provider error
    if (oauthError) {
      console.log('[OAuth] User denied or error:', oauthError);
      return res.redirect(`${FRONTEND_URL}/profile?verification=cancelled`);
    }

    // Validate required parameters
    if (!code || !stateToken) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        message: 'Authorization code and state are required'
      });
    }

    // Step 1: Verify state (CSRF protection)
    const state = await verifyState(stateToken);
    if (!state) {
      return res.status(401).json({ 
        error: 'Invalid or expired state',
        message: 'OAuth state validation failed. Please try again.'
      });
    }

    // Delete state immediately (one-time use)
    await deleteState(stateToken);

    // Verify provider matches
    if (state.provider !== providerName) {
      return res.status(400).json({ 
        error: 'Provider mismatch',
        message: 'OAuth provider does not match the initiated flow'
      });
    }

    // Step 2: Get provider configuration
    const provider = getProvider(providerName);
    if (!provider) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    // Step 3: Exchange authorization code for access token
    const tokenResponse = await oauthService.exchangeCodeForToken(
      provider,
      code,
      state.codeVerifier
    );

    // Step 4: Fetch user profile from provider
    const profile = await oauthService.fetchUserProfile(
      provider,
      tokenResponse.access_token
    );

    // Step 5: Handle skill-specific verification if skillId is present
    if (state.skillId && state.userId) {
      // Skill-specific verification flow
      const verificationResult = await oauthService.verifySkill(
        state.userId,
        state.skillId,
        state.skillName,
        providerName,
        tokenResponse.access_token
      );

      if (verificationResult.verified) {
        return res.redirect(`${FRONTEND_URL}/profile?verification=success&skill=${encodeURIComponent(state.skillName)}`);
      } else {
        return res.redirect(`${FRONTEND_URL}/profile?verification=failed&skill=${encodeURIComponent(state.skillName)}&message=${encodeURIComponent(verificationResult.message || 'Verification criteria not met')}`);
      }
    }

    // Step 6: Account-level OAuth (fallback to original behavior)
    const user = await oauthService.findOrCreateUser(
      profile,
      providerName,
      state.userId
    );

    // Step 7: Perform skill verification (if applicable)
    if (providerName === 'github') {
      await oauthService.verifyGitHubSkills(user._id, tokenResponse.access_token);
    } else if (providerName === 'strava') {
      await oauthService.verifyStravaSkills(user._id, tokenResponse.access_token);
    }

    // Step 8: Generate JWT token
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET;
    const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';
    
    const jwtToken = jwt.sign({ userId: user._id }, JWT_SECRET, { 
      expiresIn: JWT_EXPIRES_IN 
    });

    // Step 9: Redirect to frontend with token
    const redirectUrl = `${FRONTEND_URL}/auth/callback?token=${jwtToken}`;
    return res.redirect(redirectUrl);

  } catch (err) {
    console.error('[OAuth] Callback error:', err);
    
    // Determine error type for better user messaging
    let redirectMessage = err.message;
    if (err.message.includes('token exchange')) {
      redirectMessage = 'Failed to exchange authorization code';
    } else if (err.message.includes('profile')) {
      redirectMessage = 'Failed to fetch profile from provider';
    } else if (err.message.includes('timeout')) {
      redirectMessage = 'Provider request timed out';
    }
    
    // Redirect to frontend error page
    return res.redirect(`${FRONTEND_URL}/profile?verification=error&message=${encodeURIComponent(redirectMessage)}`);
  }
}

/**
 * Unlink OAuth provider from user account
 * DELETE /auth/oauth/:provider
 */
async function unlinkProvider(req, res) {
  const { provider: providerName } = req.params;
  const userId = req.user?.userId;
  
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const result = await oauthService.unlinkOAuthAccount(userId, providerName);
    return res.status(200).json(result);
  } catch (err) {
    console.error('[OAuth] Unlink error:', err);
    return res.status(err.status || 500).json({ 
      error: err.message 
    });
  }
}

/**
 * Get list of available OAuth providers
 * GET /auth/oauth/providers
 */
async function getAvailableProviders(req, res) {
  try {
    const { getAllProviders } = require('../services/oauthProviderRegistry');
    const providers = getAllProviders();
    
    // Return only public information
    const publicProviders = providers.map(p => ({
      name: p.name,
      displayName: p.displayName,
      icon: p.icon
    }));
    
    return res.status(200).json({ providers: publicProviders });
  } catch (err) {
    console.error('[OAuth] Get providers error:', err);
    return res.status(500).json({ error: 'Failed to fetch providers' });
  }
}

module.exports = {
  initiateOAuth,
  handleCallback,
  unlinkProvider,
  getAvailableProviders
};
