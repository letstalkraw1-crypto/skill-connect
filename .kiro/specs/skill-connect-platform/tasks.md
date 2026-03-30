# Implementation Plan: Skill Connect Platform

## Overview

Incremental implementation of the Skill Connect platform on top of the existing Express + PostgreSQL stack. Each task builds on the previous, wiring everything together at the end. All code is JavaScript (Node.js/Express).

## Tasks

- [x] 1. Install dependencies and set up database schema
  - Run `npm install bcrypt jsonwebtoken socket.io uuid` in the backend directory
  - Run `npm install --save-dev fast-check` for property-based testing
  - Create `backend/db/schema.sql` with all table definitions: `users`, `skills`, `user_skills`, `connections`, `conversations`, `conversation_participants`, `messages`
  - Add composite index on `user_skills(skill_id)` and index on `users(lat, lng)`
  - Create `backend/db/seeds.sql` to seed the `skills` table with initial values (running, cycling, swimming, gym, yoga, hiking)
  - Create `backend/db/index.js` to export the `pg` pool instance (or re-export from existing pool)
  - _Requirements: 11.1, 11.2, 11.4_

- [x] 2. Implement Auth Service
  - [x] 2.1 Create `backend/services/auth.js` with `signup`, `login`, and `verifyToken` functions
    - `signup`: validate required fields, hash password with bcrypt, insert user, return `{ userId, token }`
    - `login`: look up user by email, compare bcrypt hash, return `{ userId, token }` or 401
    - `verifyToken`: JWT middleware that attaches `req.user` or returns 401
    - Use parameterized queries for all DB interactions
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 10.1, 10.2, 10.4_

  - [ ]* 2.2 Write property test for registration round-trip (Property 1)
    - **Property 1: Registration round-trip**
    - **Validates: Requirements 1.1**
    - For any valid `{ name, email, password, location }` payload, response must contain non-null `userId` and non-empty `token`

  - [ ]* 2.3 Write property test for password storage (Property 2)
    - **Property 2: Password never stored as plaintext**
    - **Validates: Requirements 1.3, 10.1**
    - For any password, the value stored in DB must not equal the original plaintext

  - [ ]* 2.4 Write property test for login round-trip and invalid credentials (Properties 3 & 4)
    - **Property 3: Login round-trip** — registered credentials return valid JWT and correct userId
    - **Property 4: Invalid credentials are rejected** — wrong password returns 401
    - **Validates: Requirements 2.1, 2.2**

  - [ ]* 2.5 Write property test for protected route enforcement (Property 5)
    - **Property 5: Protected routes require valid JWT**
    - **Validates: Requirements 2.3, 10.2**
    - Any protected endpoint called without a valid JWT must return 401

  - [x] 2.6 Create `backend/routes/auth.js` with `POST /signup` and `POST /login` routes
    - Wire routes to auth service functions
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2_

- [x] 3. Checkpoint — Ensure auth tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Profile Service
  - [x] 4.1 Create `backend/services/profile.js` with `getProfile`, `updateProfile`, `addSkills`, `deleteSkill` functions
    - `getProfile`: return bio, avatar_url, location, skill list, connection count
    - `updateProfile`: validate at least one valid field present, persist changes
    - `addSkills`: insert into `user_skills`, enforce uniqueness (409 on duplicate), validate skill names exist
    - `deleteSkill`: remove user-skill association
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5, 10.5_

  - [ ]* 4.2 Write property test for profile update round-trip (Property 8)
    - **Property 8: Profile update round-trip**
    - **Validates: Requirements 3.2**
    - For any valid update payload, fetching the profile after update must reflect the new values

  - [ ]* 4.3 Write property test for skill addition and deletion round-trips (Properties 9, 10, 11)
    - **Property 9: Skill addition round-trip** — added skill appears in profile
    - **Property 10: Duplicate skill addition is rejected** — second add returns 409, list unchanged
    - **Property 11: Skill deletion round-trip** — deleted skill no longer in profile
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.5**

  - [x] 4.4 Create `backend/routes/profile.js` with profile and skill routes
    - `GET /profile/:userId`, `PUT /profile/:userId`, `POST /profile/skills`, `DELETE /profile/skills/:skillId`
    - Apply `verifyToken` middleware; enforce ownership check for write operations
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 10.5_

  - [ ]* 4.5 Write property test for cross-user data access (Property 6)
    - **Property 6: Cross-user data access is forbidden**
    - **Validates: Requirements 2.4, 10.5**
    - User A attempting to modify User B's profile must receive 403

  - [ ]* 4.6 Write property test for profile response fields (Property 7)
    - **Property 7: Profile response contains all required fields**
    - **Validates: Requirements 3.1**

- [x] 5. Checkpoint — Ensure profile and skill tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Discovery Service
  - [x] 6.1 Create `backend/services/discovery.js` with `haversine` and `discoverUsers` functions
    - `haversine(lat1, lng1, lat2, lng2)`: implement formula with Earth radius 6371 km
    - `discoverUsers`: validate coordinates and radius, query candidates by skill, filter by distance, sort ascending, exclude requesting user
    - Return 400 for unknown skill or invalid coordinates
    - Only include users with non-null lat/lng
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [ ]* 6.2 Write property test for Haversine symmetry and identity (Property 13)
    - **Property 13: Haversine symmetry and identity**
    - **Validates: Requirements 5.2**
    - `haversine(A, B) === haversine(B, A)` and `haversine(A, A) === 0` for any valid coordinates

  - [ ]* 6.3 Write property test for discovery correctness (Property 12)
    - **Property 12: Discovery correctness — skill, radius, and sort**
    - **Validates: Requirements 5.1, 5.4**
    - Every result has the requested skill, distance ≤ radiusKm, and results are sorted ascending

  - [ ]* 6.4 Write property test for requesting user excluded from results (Property 14)
    - **Property 14: Requesting user excluded from discovery**
    - **Validates: Requirements 5.3**

  - [x] 6.5 Create `backend/routes/discovery.js` with `GET /discover` route
    - Parse `skill`, `lat`, `lng`, `radius` query params; call `discoverUsers`; return results
    - Apply `verifyToken` middleware
    - _Requirements: 5.1, 5.5, 5.6, 5.7_

- [x] 7. Checkpoint — Ensure discovery tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement Connection Service
  - [x] 8.1 Create `backend/services/connections.js` with `sendRequest`, `acceptConnection`, `declineConnection`, `deleteConnection`, `listConnections` functions
    - `sendRequest`: reject self-connection (400), check for existing pending/accepted (409), insert with status `pending`
    - `acceptConnection` / `declineConnection`: verify addressee ownership (403), update status
    - `deleteConnection`: remove record
    - `listConnections`: return all connections for a user
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 8.2 Write property test for connection request creates pending record (Property 15)
    - **Property 15: Connection request creates pending record**
    - **Validates: Requirements 6.1**

  - [ ]* 8.3 Write property test for duplicate connection requests rejected (Property 16)
    - **Property 16: Duplicate connection requests are rejected**
    - **Validates: Requirements 6.3, 6.4, 6.5**

  - [ ]* 8.4 Write property tests for accept and decline state transitions (Properties 17 & 18)
    - **Property 17: Connection accept state transition** — status becomes `accepted`
    - **Property 18: Connection decline state transition** — status becomes `declined`
    - **Validates: Requirements 7.1, 7.2**

  - [ ]* 8.5 Write property tests for connection list and deletion round-trips (Properties 19 & 20)
    - **Property 19: Connection list round-trip**
    - **Property 20: Connection deletion round-trip**
    - **Validates: Requirements 7.3, 7.5**

  - [x] 8.6 Create `backend/routes/connections.js` with connection routes
    - `POST /connections/request`, `PUT /connections/:id/accept`, `PUT /connections/:id/decline`, `DELETE /connections/:id`, `GET /connections/:userId`
    - Apply `verifyToken` middleware
    - _Requirements: 6.1, 6.2, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 9. Checkpoint — Ensure connection tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement Messaging Service (REST)
  - [x] 10.1 Create `backend/services/messaging.js` with `createConversation`, `listConversations`, `getMessages`, `persistMessage` functions
    - `createConversation`: verify all participants are accepted connections (403 otherwise), insert conversation + participants
    - `listConversations`: return all conversations for a user
    - `getMessages`: verify user is participant (403 otherwise), return message history
    - `persistMessage`: validate non-empty text (400), verify participant (403), insert message with `sent_at`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.2, 9.4, 9.6, 9.7, 9.8, 11.3_

  - [ ]* 10.2 Write property test for conversation creation (Property 21)
    - **Property 21: Conversation creation associates all participants**
    - **Validates: Requirements 8.1**

  - [ ]* 10.3 Write property test for conversation list round-trip (Property 22)
    - **Property 22: Conversation list round-trip**
    - **Validates: Requirements 8.2**

  - [ ]* 10.4 Write property test for message history round-trip (Property 23)
    - **Property 23: Message history round-trip**
    - **Validates: Requirements 8.3, 9.2, 11.3**
    - For any sequence of messages sent, fetching history returns all with correct text, senderId, and non-null sentAt

  - [x] 10.5 Create `backend/routes/messaging.js` with REST conversation and message routes
    - `GET /conversations/:userId`, `POST /conversations`, `GET /conversations/:conversationId/messages`
    - Apply `verifyToken` middleware
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 11. Implement WebSocket Server (Socket.io)
  - [x] 11.1 Create `backend/socket/index.js` to set up Socket.io server
    - On `connection`: authenticate JWT from handshake auth token, reject unauthenticated connections
    - On `send_message`: call `persistMessage`, emit `receive_message` to all online participants except sender
    - On `typing`: broadcast typing indicator to other participants in the conversation
    - Maintain an in-memory map of `userId → socketId` for online presence
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ]* 11.2 Write property test for WebSocket authentication (Property 24)
    - **Property 24: WebSocket authentication establishes session**
    - **Validates: Requirements 9.1**
    - Any valid JWT connecting to the WS server results in an authenticated session

  - [ ]* 11.3 Write property test for real-time message delivery (Property 25)
    - **Property 25: Real-time message delivery to online recipients**
    - **Validates: Requirements 9.3**

  - [ ]* 11.4 Write property test for typing indicator broadcast (Property 26)
    - **Property 26: Typing indicator broadcast**
    - **Validates: Requirements 9.5**

- [x] 12. Checkpoint — Ensure messaging and WebSocket tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Wire everything into `backend/server.js`
  - [x] 13.1 Import and mount all route modules in `backend/server.js`
    - Mount `/auth` routes (signup, login)
    - Mount `/profile`, `/discover`, `/connections`, `/conversations` routes with `verifyToken` middleware
    - Attach Socket.io server to the existing HTTP server instance
    - _Requirements: 1.1, 2.1, 3.1, 5.1, 6.1, 8.1, 9.1_

  - [ ]* 13.2 Write property test for cascade delete (Property 27)
    - **Property 27: Cascade delete removes all associated records**
    - **Validates: Requirements 11.1**

  - [ ]* 13.3 Write property test for UUID uniqueness (Property 28)
    - **Property 28: UUID uniqueness across records**
    - **Validates: Requirements 11.4**

- [x] 14. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` and map 1-to-1 with the properties defined in the design document
- All DB queries must use parameterized statements (no string interpolation)
- Socket.io server shares the same HTTP server instance as Express
