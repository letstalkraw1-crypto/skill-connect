# Requirements Document: OAuth/SSO Integration

## Introduction

This document specifies the requirements for adding OAuth 2.0 and Single Sign-On (SSO) capabilities to the existing authentication system. The system will allow users to authenticate using third-party providers (starting with GitHub, with extensibility for Google, Microsoft, Strava, etc.) and verify their skills through connected external accounts. The implementation extends the current email/password + OTP authentication system while maintaining backward compatibility.

## Glossary

- **OAuth_System**: The OAuth 2.0 authentication subsystem that handles third-party provider integration
- **Auth_Controller**: The controller component that handles OAuth initiation and callback endpoints
- **OAuth_Service**: The service layer that implements OAuth business logic
- **State_Manager**: The Redis-based component that manages OAuth state tokens for CSRF protection
- **Provider_Registry**: The centralized configuration store for all supported OAuth providers
- **User_Record**: A user account in the MongoDB database
- **Provider_ID**: A unique identifier from an OAuth provider (e.g., GitHub user ID)
- **State_Token**: A cryptographically random UUID used for CSRF protection
- **Code_Verifier**: A random string used in PKCE (Proof Key for Code Exchange)
- **Code_Challenge**: A SHA256 hash of the code verifier, base64url encoded
- **Access_Token**: A token received from OAuth provider after successful authentication
- **JWT_Token**: JSON Web Token used for authenticated sessions in the application
- **Skill_Verification**: The process of verifying user skills through connected external accounts
- **OAuth_Provider**: A third-party authentication service (GitHub, Google, Strava, etc.)

## Requirements

### Requirement 1: OAuth Provider Configuration

**User Story:** As a system administrator, I want to configure multiple OAuth providers through environment variables, so that I can enable or disable authentication methods without code changes.

#### Acceptance Criteria

1. THE Provider_Registry SHALL load OAuth provider configurations from environment variables at startup
2. WHEN a provider's client ID and client secret are present in environment variables, THE Provider_Registry SHALL mark that provider as enabled
3. WHEN a provider's credentials are missing, THE Provider_Registry SHALL mark that provider as disabled
4. THE Provider_Registry SHALL store provider-specific configuration including authorization URL, token URL, user info URL, required scopes, and callback path
5. WHEN the system requests a provider configuration, THE Provider_Registry SHALL return the complete configuration for enabled providers

### Requirement 2: OAuth Flow Initiation

**User Story:** As a user, I want to initiate authentication with an OAuth provider, so that I can sign in without creating a new password.

#### Acceptance Criteria

1. WHEN a user requests OAuth authentication for a valid enabled provider, THE Auth_Controller SHALL generate a unique state token
2. WHEN generating OAuth parameters, THE OAuth_System SHALL create a PKCE code verifier of 128 characters
3. WHEN generating OAuth parameters, THE OAuth_System SHALL compute the code challenge as the base64url-encoded SHA256 hash of the code verifier
4. WHEN storing OAuth state, THE State_Manager SHALL save the state token, code verifier, provider name, and optional user ID to Redis with 600-second expiration
5. WHEN building the authorization URL, THE OAuth_System SHALL include client_id, redirect_uri, response_type, scope, state, code_challenge, and code_challenge_method parameters
6. WHEN OAuth initiation is complete, THE Auth_Controller SHALL redirect the user to the provider's authorization URL
7. IF the requested provider is invalid or disabled, THEN THE Auth_Controller SHALL return a 400 error with message "Invalid or unsupported provider"

### Requirement 3: CSRF Protection

**User Story:** As a security engineer, I want OAuth flows to be protected against CSRF attacks, so that malicious sites cannot hijack user authentication.

#### Acceptance Criteria

1. THE State_Manager SHALL generate state tokens using cryptographically secure random UUID v4
2. THE State_Manager SHALL store each state token in Redis with a unique key
3. THE State_Manager SHALL set expiration time to 600 seconds for all state tokens
4. WHEN an OAuth callback is received, THE Auth_Controller SHALL verify the state parameter matches a stored state token
5. IF the state parameter does not match any stored token, THEN THE Auth_Controller SHALL return a 401 error with message "Invalid or expired state"
6. WHEN a state token is successfully verified, THE State_Manager SHALL delete that token from Redis
7. IF a state token is used more than once, THEN THE Auth_Controller SHALL reject the request

### Requirement 4: OAuth Callback Processing

**User Story:** As a user, I want the system to complete my authentication after I approve access on the provider's site, so that I can access my account.

#### Acceptance Criteria

1. WHEN an OAuth callback is received with a code parameter, THE Auth_Controller SHALL retrieve the stored state from Redis
2. WHEN the state is verified, THE OAuth_Service SHALL exchange the authorization code for an access token using the provider's token endpoint
3. WHEN exchanging the code, THE OAuth_Service SHALL include the grant_type, code, redirect_uri, client_id, client_secret, and code_verifier parameters
4. WHEN the access token is received, THE OAuth_Service SHALL fetch the user profile from the provider's user info endpoint
5. WHEN fetching the user profile, THE OAuth_Service SHALL include the access token in the Authorization header
6. IF the token exchange fails, THEN THE Auth_Controller SHALL return a 502 error with message "Failed to authenticate with provider"
7. IF the user profile fetch fails, THEN THE Auth_Controller SHALL return a 502 error with message "Failed to fetch user profile"

### Requirement 5: User Account Linking and Creation

**User Story:** As a user, I want my OAuth account to be linked to my existing account if I have one, so that I don't create duplicate accounts.

#### Acceptance Criteria

1. WHEN a user profile is received from an OAuth provider, THE OAuth_Service SHALL search for an existing User_Record with matching Provider_ID
2. IF a User_Record with matching Provider_ID exists, THEN THE OAuth_Service SHALL return that user
3. IF no User_Record with matching Provider_ID exists, THEN THE OAuth_Service SHALL search for a User_Record with matching email address
4. WHEN a User_Record with matching email is found, THE OAuth_Service SHALL add the Provider_ID to that user's record
5. WHEN linking an OAuth account to an existing user, THE OAuth_Service SHALL set isEmailVerified to true
6. IF the existing user has no avatar and the OAuth profile includes an avatar, THEN THE OAuth_Service SHALL update the user's avatarUrl
7. IF no matching User_Record exists by Provider_ID or email, THEN THE OAuth_Service SHALL create a new User_Record
8. WHEN creating a new user via OAuth, THE OAuth_Service SHALL set isEmailVerified to true
9. WHEN creating a new user via OAuth, THE OAuth_Service SHALL set onboardingComplete to false
10. THE OAuth_Service SHALL ensure no two users have the same Provider_ID for the same provider

### Requirement 6: JWT Token Generation

**User Story:** As a user, I want to receive an authentication token after successful OAuth login, so that I can make authenticated requests to the API.

#### Acceptance Criteria

1. WHEN a user is successfully authenticated via OAuth, THE Auth_Controller SHALL generate a JWT_Token containing the user ID
2. THE Auth_Controller SHALL sign the JWT_Token with the application's secret key
3. THE Auth_Controller SHALL set the JWT_Token expiration to 30 days
4. WHEN the JWT_Token is generated, THE Auth_Controller SHALL redirect the user to the frontend callback URL with the token as a query parameter
5. THE frontend callback URL SHALL be constructed as FRONTEND_URL + "/auth/callback?token=" + JWT_Token

### Requirement 7: GitHub Skill Verification

**User Story:** As a user, I want to verify my coding skills by connecting my GitHub account, so that other users can see my verified skills.

#### Acceptance Criteria

1. WHEN a user successfully authenticates with GitHub, THE OAuth_Service SHALL fetch the user's public repository count
2. WHEN a user successfully authenticates with GitHub, THE OAuth_Service SHALL fetch the user's follower count
3. IF the user has more than 5 public repositories, THEN THE OAuth_System SHALL mark the "Coding" skill as verified
4. WHEN marking a skill as verified, THE OAuth_System SHALL create or update a Skill_Verification record with verificationType set to "github"
5. WHEN marking a skill as verified, THE OAuth_System SHALL set the status to "verified" and record the verifiedAt timestamp
6. THE OAuth_System SHALL store the GitHub username in the User_Record

### Requirement 8: User Data Model Extension

**User Story:** As a developer, I want the user data model to support multiple OAuth providers, so that users can link multiple authentication methods.

#### Acceptance Criteria

1. THE User_Record SHALL include optional fields for OAuth provider IDs: googleId, githubId, microsoftId, facebookId, appleId
2. THE User_Record SHALL maintain existing fields for stravaId, garminId, and instagramId
3. WHEN a User_Record is created or updated with an OAuth provider ID, THE OAuth_System SHALL ensure the provider ID is unique across all users for that provider
4. THE User_Record SHALL allow multiple OAuth provider IDs to be set on the same user
5. THE User_Record SHALL require at least one authentication method (email+password, phone, or OAuth provider ID)

### Requirement 9: Security and Token Handling

**User Story:** As a security engineer, I want OAuth tokens to be handled securely, so that user credentials are protected.

#### Acceptance Criteria

1. THE OAuth_System SHALL NOT store OAuth access tokens in the database
2. THE OAuth_System SHALL NOT store OAuth refresh tokens in the database
3. THE OAuth_System SHALL NOT log OAuth access tokens or refresh tokens
4. THE OAuth_System SHALL store OAuth client secrets in environment variables
5. THE OAuth_System SHALL use HTTPS for all OAuth redirect URIs in production
6. WHEN storing sensitive data in Redis, THE State_Manager SHALL set appropriate expiration times
7. THE OAuth_System SHALL NOT collect or store user passwords from external providers

### Requirement 10: Error Handling

**User Story:** As a user, I want clear error messages when OAuth authentication fails, so that I understand what went wrong and can retry.

#### Acceptance Criteria

1. IF a user requests OAuth for an invalid provider, THEN THE Auth_Controller SHALL return a 400 error with message "Invalid or unsupported provider"
2. IF the OAuth state is invalid or expired, THEN THE Auth_Controller SHALL return a 401 error with message "Invalid or expired state"
3. IF the token exchange with the provider fails, THEN THE Auth_Controller SHALL return a 502 error with message "Failed to authenticate with provider"
4. IF the user profile fetch fails, THEN THE Auth_Controller SHALL return a 502 error with message "Failed to fetch user profile"
5. IF the user denies permission on the OAuth consent screen, THEN THE Auth_Controller SHALL return a 401 error with message "Authentication cancelled"
6. IF the OAuth provider does not respond within the timeout period, THEN THE Auth_Controller SHALL return a 504 error with message "Provider temporarily unavailable"
7. WHEN an OAuth error occurs, THE OAuth_System SHALL log detailed error information for debugging

### Requirement 11: Account Linking for Authenticated Users

**User Story:** As an authenticated user, I want to link additional OAuth providers to my existing account, so that I can sign in using multiple methods.

#### Acceptance Criteria

1. WHEN an authenticated user initiates OAuth flow, THE State_Manager SHALL store the user's ID in the OAuth state
2. WHEN the OAuth callback is processed for an authenticated user, THE OAuth_Service SHALL link the Provider_ID to the existing user account
3. WHEN linking a new provider to an existing account, THE OAuth_Service SHALL verify the user is authenticated
4. THE OAuth_System SHALL allow multiple OAuth providers to be linked to the same user account
5. WHEN a provider is successfully linked, THE Auth_Controller SHALL return a success response with the updated user data

### Requirement 12: Account Unlinking

**User Story:** As a user, I want to unlink OAuth providers from my account, so that I can manage my connected authentication methods.

#### Acceptance Criteria

1. WHEN an authenticated user requests to unlink an OAuth provider, THE Auth_Controller SHALL verify the user has at least one other authentication method
2. IF unlinking would leave the user with no authentication methods, THEN THE Auth_Controller SHALL return a 400 error with message "Cannot unlink last authentication method"
3. WHEN unlinking is allowed, THE OAuth_Service SHALL set the Provider_ID field to null in the User_Record
4. WHEN a provider is unlinked, THE Auth_Controller SHALL return a success response with the updated user data

### Requirement 13: Frontend Integration

**User Story:** As a frontend developer, I want clear API endpoints for OAuth integration, so that I can implement the user interface.

#### Acceptance Criteria

1. THE OAuth_System SHALL expose a GET endpoint at /auth/oauth/:provider for initiating OAuth flow
2. THE OAuth_System SHALL expose a GET endpoint at /auth/oauth/:provider/callback for handling OAuth callbacks
3. THE OAuth_System SHALL expose a DELETE endpoint at /auth/oauth/:provider for unlinking providers
4. WHEN the frontend receives a successful OAuth callback, THE frontend SHALL extract the JWT_Token from the query parameter
5. WHEN the frontend receives the JWT_Token, THE frontend SHALL store it in localStorage
6. WHEN the frontend displays connected accounts, THE frontend SHALL show a "Verified" badge for skills verified through OAuth

### Requirement 14: Provider Extensibility

**User Story:** As a developer, I want the OAuth system to be easily extensible, so that I can add new providers without major refactoring.

#### Acceptance Criteria

1. THE Provider_Registry SHALL use a consistent interface for all OAuth providers
2. WHEN adding a new provider, THE Provider_Registry SHALL require only configuration data (URLs, scopes, credentials)
3. THE OAuth_Service SHALL normalize user profiles from different providers into a consistent format
4. THE OAuth_Service SHALL use a provider-based abstraction layer for provider-specific logic
5. WHEN a new provider is added, THE User_Record SHALL support storing that provider's ID through a consistent naming convention

### Requirement 15: PKCE Implementation

**User Story:** As a security engineer, I want OAuth flows to use PKCE, so that authorization code interception attacks are prevented.

#### Acceptance Criteria

1. WHEN initiating OAuth flow, THE OAuth_System SHALL generate a random code verifier between 43 and 128 characters
2. THE OAuth_System SHALL compute the code challenge as base64url(SHA256(code_verifier))
3. WHEN building the authorization URL, THE OAuth_System SHALL include code_challenge and code_challenge_method=S256 parameters
4. WHEN exchanging the authorization code for tokens, THE OAuth_System SHALL include the original code_verifier
5. THE OAuth provider SHALL verify that the code_verifier matches the code_challenge before issuing tokens
