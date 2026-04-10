
# Implementation Plan: OAuth/SSO Integration

## Overview

This implementation plan adds OAuth 2.0 and Single Sign-On (SSO) capabilities to the existing authentication system. The system will allow users to authenticate using third-party providers (starting with GitHub, with extensibility for Google, Microsoft, Strava, etc.) and verify their skills through connected external accounts. The implementation uses TypeScript for type safety and follows a phased approach starting with GitHub OAuth as the core flow, then adding security layers, user integration, and additional providers.

## Tasks

- [x] 1. Set up TypeScript infrastructure
  - Install TypeScript and type definitions for existing dependencies
  - Create tsconfig.json with appropriate compiler options
  - Set up build scripts and development workflow
  - Create types directory for shared type definitions
  - _Requirements: Foundation for type-safe OAuth implementation_

- [x] 2. Create OAuth provider registry and configuration
  - [x] 2.1 Define TypeScript interfaces for OAuth providers
    - Create OAuthProvider, OAuthProviderRegistry, OAuthTokenResponse, OAuthUserProfile interfaces
    - Define provider configuration structure
    - _Requirements: 1.1, 1.4, 14.1, 14.2_
  
  - [x] 2.2 Implement provider registry service
    - Create src/services/oauthProviderRegistry.ts
    - Implement getProvider(), getAllProviders(), isProviderEnabled() methods
    - Load provider configurations from environment variables
    - Support GitHub, Google, Microsoft, Strava providers
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 14.2_
  
  - [x] 2.3 Add environment variables for OAuth providers
    - Update .env.example with OAuth provider credentials
    - Add GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_REDIRECT_URI
    - Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (for future use)
    - Add BACKEND_URL and FRONTEND_URL
    - _Requirements: 1.1, 9.4_

- [x] 3. Implement OAuth state management with Redis
  - [x] 3.1 Define OAuthState interface and types
    - Create TypeScript interface for OAuth state structure
    - Include token, codeVerifier, provider, userId, timestamps
    - _Requirements: 2.4, 3.1_
  
  - [x] 3.2 Create state manager service
    - Create src/services/oauthStateManager.ts
    - Implement createState() to generate UUID v4 state tokens
    - Implement verifyState() to retrieve and validate state from Redis
    - Implement deleteState() for one-time use enforcement
    - Set 600-second TTL on all state keys
    - _Requirements: 2.4, 3.1, 3.2, 3.3, 3.6, 9.6_
  
  - [ ]* 3.3 Write property test for state uniqueness
    - **Property 2: State Token Generation and Storage**
    - **Validates: Requirements 2.1, 2.4, 3.1, 3.2, 3.3**
    - Generate 1000 state tokens and verify all are unique
    - Verify state tokens are valid UUID v4 format

- [x] 4. Implement PKCE (Proof Key for Code Exchange)
  - [x] 4.1 Create PKCE utility functions
    - Create src/utils/pkce.ts
    - Implement generateCodeVerifier() to create 128-character random string
    - Implement generateCodeChallenge() to compute SHA256 hash and base64url encode
    - _Requirements: 2.2, 2.3, 15.1, 15.2_
  
  - [ ]* 4.2 Write property test for PKCE verification
    - **Property 3: PKCE Code Challenge Computation**
    - **Validates: Requirements 2.2, 2.3, 15.1, 15.2**
    - For random code verifiers, verify code challenge can be validated
    - Test reversibility of PKCE computation

- [x] 5. Implement GitHub OAuth flow (Phase 1 - Core Flow)
  - [x] 5.1 Create OAuth controller
    - Create src/controllers/oauthController.ts
    - Implement initiateOAuth() endpoint handler
    - Generate state token and PKCE parameters
    - Build authorization URL with all required parameters
    - Redirect user to GitHub OAuth page
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6_
  
  - [x] 5.2 Implement OAuth callback handler
    - Implement handleCallback() in OAuth controller
    - Verify state parameter against Redis
    - Exchange authorization code for access token
    - Fetch user profile from GitHub API
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 5.3 Create OAuth service for business logic
    - Create src/services/oauthService.ts
    - Implement generateAuthUrl() to build provider authorization URLs
    - Implement exchangeCodeForToken() for token exchange
    - Implement fetchUserProfile() to get user data from provider
    - _Requirements: 2.5, 4.3, 4.4, 4.5_
  
  - [ ]* 5.4 Write unit tests for OAuth flow
    - Test authorization URL generation
    - Test token exchange with mocked provider responses
    - Test profile normalization
    - _Requirements: 2.1-2.7, 4.1-4.7_

- [x] 6. Checkpoint - Verify GitHub OAuth core flow
  - Test OAuth initiation redirects to GitHub
  - Test callback processes authorization code
  - Ensure all tests pass, ask the user if questions arise

- [x] 7. Implement CSRF protection (Phase 2 - Security Layer)
  - [x] 7.1 Add state validation in callback handler
    - Verify state parameter exists and matches Redis entry
    - Return 401 error for invalid or expired state
    - Delete state after successful verification (one-time use)
    - Prevent replay attacks
    - _Requirements: 3.4, 3.5, 3.6, 3.7_
  
  - [x] 7.2 Add error handling for security violations
    - Handle missing state parameter
    - Handle expired state tokens
    - Handle state reuse attempts
    - Log security violations for monitoring
    - _Requirements: 10.2, 10.7_
  
  - [ ]* 7.3 Write property test for state verification
    - **Property 6: State Verification and One-Time Use**
    - **Validates: Requirements 3.4, 3.6, 3.7**
    - Verify state is deleted after use
    - Verify reused state is rejected

- [x] 8. Extend User model for OAuth providers (Phase 3 - User System Integration)
  - [x] 8.1 Update User schema with OAuth provider fields
    - Add googleId, githubId, microsoftId, facebookId, appleId fields
    - Ensure provider IDs are unique per provider
    - Add indexes on OAuth provider ID fields
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [x] 8.2 Add validation for authentication methods
    - Ensure at least one authentication method exists
    - Validate provider ID uniqueness
    - _Requirements: 8.5, 5.10_

- [x] 9. Implement user account linking and creation
  - [x] 9.1 Implement findOrCreateUser() in OAuth service
    - Search for user by provider ID first
    - Fall back to email lookup if provider ID not found
    - Link OAuth account to existing user if email matches
    - Create new user if no match found
    - Set isEmailVerified to true for OAuth users
    - Update avatarUrl if user has none and profile includes one
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_
  
  - [ ]* 9.2 Write property test for user linking idempotency
    - **Property 10: User Lookup by Provider ID**
    - **Validates: Requirements 5.1, 5.2**
    - Multiple OAuth logins with same provider ID return same user
    - Verify no duplicate users are created
  
  - [ ]* 9.3 Write unit tests for user linking scenarios
    - Test new user creation
    - Test linking to existing email
    - Test existing provider ID returns same user
    - Test avatar update logic
    - _Requirements: 5.1-5.10_

- [x] 10. Implement JWT token generation and frontend redirect
  - [x] 10.1 Generate JWT token after successful OAuth
    - Create JWT containing user ID
    - Sign with application secret key
    - Set 30-day expiration
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [x] 10.2 Redirect to frontend with token
    - Build frontend callback URL with token parameter
    - Format: FRONTEND_URL + "/auth/callback?token=" + JWT_Token
    - _Requirements: 6.4, 6.5_
  
  - [ ]* 10.3 Write property test for JWT generation
    - **Property 15: JWT Token Generation**
    - **Validates: Requirements 6.1, 6.2, 6.3**
    - Verify JWT contains user ID
    - Verify JWT is properly signed
    - Verify expiration is 30 days

- [ ] 11. Checkpoint - Verify complete GitHub OAuth flow
  - Test end-to-end OAuth flow from initiation to JWT generation
  - Test user creation and linking scenarios
  - Ensure all tests pass, ask the user if questions arise

- [x] 12. Implement GitHub skill verification (Phase 4 - Skill Verification)
  - [x] 12.1 Fetch GitHub user data for skill verification
    - Fetch public repository count from GitHub API
    - Fetch follower count from GitHub API
    - Store GitHub username in User record
    - _Requirements: 7.1, 7.2, 7.6_
  
  - [x] 12.2 Implement skill verification logic
    - Check if user has more than 5 public repositories
    - Create or update SkillVerification record
    - Set verificationType to "github"
    - Set status to "verified" and record verifiedAt timestamp
    - Mark "Coding" skill as verified
    - _Requirements: 7.3, 7.4, 7.5_
  
  - [ ]* 12.3 Write unit tests for skill verification
    - Test verification with > 5 repos
    - Test no verification with <= 5 repos
    - Test SkillVerification record creation
    - _Requirements: 7.1-7.6_

- [x] 13. Add OAuth routes to Express app
  - [x] 13.1 Create OAuth routes file
    - Create src/routes/oauthRoutes.ts
    - Add GET /auth/oauth/:provider for initiation
    - Add GET /auth/oauth/:provider/callback for callback
    - Add rate limiting to OAuth endpoints
    - _Requirements: 13.1, 13.2_
  
  - [x] 13.2 Register OAuth routes in main server
    - Import and mount OAuth routes in src/server.ts
    - Ensure routes are properly configured
    - _Requirements: 13.1, 13.2_

- [ ] 14. Implement error handling (Phase 6 - Error Handling)
  - [ ] 14.1 Add comprehensive error responses
    - Handle invalid provider (400 error)
    - Handle invalid/expired state (401 error)
    - Handle token exchange failure (502 error)
    - Handle profile fetch failure (502 error)
    - Handle user denial (401 error)
    - Handle provider timeout (504 error)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  
  - [ ] 14.2 Add detailed error logging
    - Log all OAuth errors with context
    - Include provider name, error type, and stack trace
    - Use existing Winston logger
    - _Requirements: 10.7_
  
  - [ ]* 14.3 Write integration tests for error scenarios
    - Test invalid provider rejection
    - Test state mismatch handling
    - Test token exchange failure
    - Test network timeout handling
    - _Requirements: 10.1-10.7_

- [ ] 15. Implement account linking for authenticated users (Phase 7 - Account Linking)
  - [ ] 15.1 Add user ID to OAuth state for authenticated users
    - Check if user is authenticated when initiating OAuth
    - Store user ID in OAuth state if authenticated
    - _Requirements: 11.1, 11.2_
  
  - [ ] 15.2 Handle account linking in callback
    - Detect authenticated user flow from state
    - Link provider ID to existing user account
    - Verify user is authenticated before linking
    - Return success response with updated user data
    - _Requirements: 11.2, 11.3, 11.4, 11.5_
  
  - [ ]* 15.3 Write unit tests for account linking
    - Test linking new provider to existing account
    - Test multiple providers on same account
    - Test authentication verification
    - _Requirements: 11.1-11.5_

- [ ] 16. Implement account unlinking (Phase 7 - Account Linking)
  - [ ] 16.1 Create unlinking endpoint
    - Add DELETE /auth/oauth/:provider route
    - Verify user has at least one other authentication method
    - Return 400 error if unlinking would leave user with no auth methods
    - _Requirements: 12.1, 12.2_
  
  - [ ] 16.2 Implement unlinking logic in OAuth service
    - Set provider ID field to null in User record
    - Return success response with updated user data
    - _Requirements: 12.3, 12.4, 13.3_
  
  - [ ]* 16.3 Write unit tests for account unlinking
    - Test successful unlinking
    - Test rejection when last auth method
    - Test validation logic
    - _Requirements: 12.1-12.4_

- [ ] 17. Checkpoint - Verify account linking and unlinking
  - Test linking additional providers to existing accounts
  - Test unlinking providers with validation
  - Ensure all tests pass, ask the user if questions arise

- [ ] 18. Create provider abstraction layer (Phase 8 - Provider Abstraction)
  - [ ] 18.1 Define base OAuth service interface
    - Create abstract base class or interface for OAuth providers
    - Define getAuthUrl(), exchangeCode(), getUserProfile() methods
    - Standardize response formats
    - _Requirements: 14.1, 14.2_
  
  - [ ] 18.2 Implement GitHub-specific service
    - Create GitHubOAuthService extending base interface
    - Implement GitHub-specific profile normalization
    - Handle GitHub API quirks
    - _Requirements: 14.3, 14.4_
  
  - [ ] 18.3 Update OAuth service to use provider abstraction
    - Refactor OAuth service to use provider-specific implementations
    - Remove hardcoded provider logic
    - _Requirements: 14.2, 14.4_

- [ ] 19. Add Google OAuth provider (Phase 9 - Additional Providers)
  - [ ] 19.1 Configure Google OAuth in provider registry
    - Add Google OAuth URLs and scopes
    - Load Google credentials from environment variables
    - _Requirements: 1.1, 1.2, 14.5_
  
  - [ ] 19.2 Implement Google-specific OAuth service
    - Create GoogleOAuthService extending base interface
    - Implement Google profile normalization
    - Handle Google ID token validation
    - _Requirements: 14.3, 14.4_
  
  - [ ]* 19.3 Write integration tests for Google OAuth
    - Test Google OAuth flow with mocked provider
    - Test profile normalization
    - _Requirements: 1.1-1.5, 14.1-14.5_

- [ ] 20. Add Microsoft OAuth provider (Phase 9 - Additional Providers)
  - [ ] 20.1 Configure Microsoft OAuth in provider registry
    - Add Microsoft OAuth URLs and scopes
    - Load Microsoft credentials from environment variables
    - _Requirements: 1.1, 1.2, 14.5_
  
  - [ ] 20.2 Implement Microsoft-specific OAuth service
    - Create MicrosoftOAuthService extending base interface
    - Implement Microsoft profile normalization
    - Handle Microsoft-specific token format
    - _Requirements: 14.3, 14.4_
  
  - [ ]* 20.3 Write integration tests for Microsoft OAuth
    - Test Microsoft OAuth flow with mocked provider
    - Test profile normalization
    - _Requirements: 1.1-1.5, 14.1-14.5_

- [ ] 21. Add Strava OAuth provider with skill verification (Phase 9 - Additional Providers)
  - [ ] 21.1 Configure Strava OAuth in provider registry
    - Add Strava OAuth URLs and scopes
    - Load Strava credentials from environment variables
    - _Requirements: 1.1, 1.2, 14.5_
  
  - [ ] 21.2 Implement Strava-specific OAuth service
    - Create StravaOAuthService extending base interface
    - Implement Strava profile normalization
    - Fetch athlete statistics for skill verification
    - _Requirements: 14.3, 14.4_
  
  - [ ] 21.3 Implement Strava skill verification
    - Define verification rules for running/cycling skills
    - Create or update SkillVerification records
    - Map Strava data to skill verification
    - _Requirements: Similar to 7.1-7.6 for Strava_
  
  - [ ]* 21.4 Write integration tests for Strava OAuth
    - Test Strava OAuth flow
    - Test skill verification logic
    - _Requirements: 1.1-1.5, 14.1-14.5_

- [ ] 22. Checkpoint - Verify all OAuth providers
  - Test OAuth flow for GitHub, Google, Microsoft, Strava
  - Test provider-specific profile normalization
  - Ensure all tests pass, ask the user if questions arise

- [ ] 23. Implement security hardening (Phase 13 - Security Hardening)
  - [ ] 23.1 Add HTTPS enforcement for production
    - Verify redirect URIs use HTTPS in production
    - Add middleware to enforce HTTPS
    - _Requirements: 9.5_
  
  - [ ] 23.2 Implement token security measures
    - Ensure OAuth tokens are never stored in database
    - Ensure OAuth tokens are never logged
    - Add token sanitization in logs
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [ ] 23.3 Add input validation and sanitization
    - Validate all OAuth callback parameters
    - Sanitize provider names and state tokens
    - Prevent injection attacks
    - _Requirements: Security best practices_
  
  - [ ] 23.4 Configure CORS for OAuth endpoints
    - Allow OAuth callbacks from frontend domain
    - Restrict CORS to specific origins
    - _Requirements: Security best practices_
  
  - [ ]* 23.5 Write security tests
    - Test HTTPS enforcement
    - Test token non-persistence
    - Test input validation
    - _Requirements: 9.1-9.7_

- [ ] 24. Implement caching and performance optimization (Phase 12 - Performance)
  - [ ] 24.1 Cache provider configurations
    - Load provider configs at startup
    - Store in memory for fast access
    - _Requirements: Performance optimization_
  
  - [ ] 24.2 Optimize database queries
    - Ensure indexes exist on OAuth provider ID fields
    - Use lean() for read-only queries
    - _Requirements: Performance optimization_
  
  - [ ] 24.3 Add connection pooling for HTTP requests
    - Configure axios with connection pooling
    - Reuse connections to OAuth providers
    - _Requirements: Performance optimization_
  
  - [ ]* 24.4 Write performance tests
    - Test OAuth flow latency
    - Test concurrent OAuth requests
    - _Requirements: Performance targets_

- [x] 25. Create frontend integration components (Phase 10 - Frontend Integration)
  - [x] 25.1 Create OAuth button components
    - Add "Connect GitHub" button
    - Add "Connect Google" button
    - Add "Connect Microsoft" button
    - Add "Connect Strava" button
    - Handle loading states
    - _Requirements: 13.4, 13.6_
  
  - [x] 25.2 Create OAuth callback page
    - Create /auth/callback route in frontend
    - Extract token from query parameter
    - Store token in localStorage
    - Redirect to appropriate page after login
    - _Requirements: 13.4, 13.5_
  
  - [x] 25.3 Add verified skill badges
    - Display "Verified" badge for OAuth-verified skills
    - Show provider icon (GitHub, Strava, etc.)
    - _Requirements: 13.6_
  
  - [x] 25.4 Add error handling in frontend
    - Display error messages from OAuth failures
    - Handle user cancellation gracefully
    - Show retry options
    - _Requirements: 10.1-10.6_

- [ ] 26. Add logging and monitoring (Phase 11 - Logging & Monitoring)
  - [ ] 26.1 Add OAuth event logging
    - Log OAuth initiation attempts
    - Log successful authentications
    - Log failures with error details
    - Log provider used for each login
    - _Requirements: 10.7_
  
  - [ ] 26.2 Create audit log for account linking
    - Log when providers are linked to accounts
    - Log when providers are unlinked
    - Store timestamps and user IDs
    - _Requirements: Audit trail_
  
  - [ ] 26.3 Add monitoring for suspicious activity
    - Track failed OAuth attempts per IP
    - Monitor state validation failures
    - Alert on unusual patterns
    - _Requirements: Security monitoring_

- [ ] 27. Final checkpoint - End-to-end testing
  - Test complete OAuth flows for all providers
  - Test account linking and unlinking
  - Test skill verification for GitHub and Strava
  - Test error handling and edge cases
  - Verify security measures are in place
  - Ensure all tests pass, ask the user if questions arise

- [ ] 28. Documentation and deployment preparation (Phase 15 - Deployment)
  - [ ] 28.1 Update API documentation
    - Document OAuth endpoints
    - Document request/response formats
    - Document error codes
    - _Requirements: Developer documentation_
  
  - [ ] 28.2 Create deployment checklist
    - List required environment variables
    - Document OAuth app setup for each provider
    - Document redirect URI configuration
    - _Requirements: Deployment guide_
  
  - [ ] 28.3 Update .env.example
    - Include all OAuth provider variables
    - Add comments explaining each variable
    - _Requirements: Configuration documentation_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Implementation uses TypeScript for type safety
- OAuth flow follows industry best practices (PKCE, CSRF protection)
- Provider abstraction layer enables easy addition of new OAuth providers
- Security measures include HTTPS enforcement, token non-persistence, and comprehensive validation
