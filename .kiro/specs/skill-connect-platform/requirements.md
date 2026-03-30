# Requirements Document

## Introduction

Skill Connect is a location-aware social platform where users discover and connect with others who share personal life skills and hobbies (running, cycling, swimming, gym, etc.). The platform is built on an existing Express + PostgreSQL stack and adds skill profiles, location-based discovery, a social connection graph, and a real-time messaging layer.

## Glossary

- **Auth_Service**: The component responsible for user registration, login, and JWT token issuance/validation.
- **Profile_Service**: The component responsible for managing user profiles and skill associations.
- **Discovery_Service**: The component responsible for finding nearby users who share a given skill.
- **Connection_Service**: The component responsible for managing the social graph between users.
- **Messaging_Service**: The component responsible for real-time and asynchronous chat between connected users.
- **WebSocket_Server**: The Socket.io server that handles real-time bidirectional communication.
- **JWT**: JSON Web Token used for stateless authentication on protected routes.
- **Skill**: A named activity category (e.g., "running", "cycling", "swimming", "gym") stored in the skills table.
- **User_Skill**: An association between a user and a skill, optionally including proficiency level and years of experience.
- **Connection**: A directed relationship between two users with a status of `pending`, `accepted`, or `declined`.
- **Conversation**: A messaging thread shared between two or more participants who are accepted connections.
- **Message**: A text entry within a Conversation, persisted to the database and optionally delivered in real time.
- **Haversine**: The formula used to compute great-circle distance between two geographic coordinates.
- **Radius**: A positive number in kilometers defining the search boundary for discovery.

---

## Requirements

### Requirement 1: User Registration

**User Story:** As a new user, I want to register an account with my name, email, password, and location, so that I can access the platform and build my skill profile.

#### Acceptance Criteria

1. WHEN a user submits a valid registration request with name, email, password, and location, THE Auth_Service SHALL create a new user record and return a userId and signed JWT token.
2. WHEN a registration request is submitted with an email that already exists, THE Auth_Service SHALL return a 409 Conflict error.
3. WHEN storing a new user's password, THE Auth_Service SHALL hash the password using bcrypt before persisting it to the database.
4. IF a registration request is missing any required field (name, email, or password), THEN THE Auth_Service SHALL return a 400 Bad Request error.

---

### Requirement 2: User Authentication

**User Story:** As a registered user, I want to log in with my email and password, so that I can receive a token to access protected features.

#### Acceptance Criteria

1. WHEN a user submits valid login credentials, THE Auth_Service SHALL verify the bcrypt password hash and return a signed JWT token and userId.
2. WHEN a user submits invalid credentials, THE Auth_Service SHALL return a 401 Unauthorized error.
3. WHEN a request to a protected route is made without a valid JWT in the Authorization header, THE Auth_Service SHALL return a 401 Unauthorized error.
4. WHEN a request attempts to access another user's private data, THE Auth_Service SHALL return a 403 Forbidden error.

---

### Requirement 3: Profile Management

**User Story:** As a registered user, I want to view and update my profile (bio, avatar, location), so that other users can learn about me and find me in discovery.

#### Acceptance Criteria

1. WHEN a user requests their own profile, THE Profile_Service SHALL return the user's bio, avatar URL, location, skill list, and connection count.
2. WHEN a user submits a profile update with bio, location, or avatar fields, THE Profile_Service SHALL persist the changes and return the updated UserProfile.
3. WHEN a user requests another user's profile, THE Profile_Service SHALL return that user's public profile data.
4. IF a profile update request contains no valid fields, THEN THE Profile_Service SHALL return a 400 Bad Request error.

---

### Requirement 4: Skill Management

**User Story:** As a registered user, I want to add and remove skills from my profile, so that I can be discovered by others who share those skills.

#### Acceptance Criteria

1. WHEN a user submits a list of skills with optional level and years of experience, THE Profile_Service SHALL associate each skill with the user's profile and return the updated UserProfile.
2. WHEN a user attempts to add a skill that is already associated with their profile, THE Profile_Service SHALL return a 409 Conflict error.
3. WHEN a user deletes a skill from their profile, THE Profile_Service SHALL remove the user-skill association and return a success response.
4. IF a skill name submitted during skill addition does not exist in the skills table, THEN THE Profile_Service SHALL return a 400 Bad Request error.
5. THE Profile_Service SHALL enforce that each user-skill pair is unique in the database.

---

### Requirement 5: Location-Based Skill Discovery

**User Story:** As a registered user, I want to search for nearby users who share a specific skill, so that I can find potential connections in my area.

#### Acceptance Criteria

1. WHEN a user requests discovery with a valid skill name, latitude, longitude, and radius, THE Discovery_Service SHALL return a list of users who have that skill and are within the specified radius, ordered by distance ascending.
2. WHEN computing distances, THE Discovery_Service SHALL use the Haversine formula with Earth radius 6371 km.
3. THE Discovery_Service SHALL exclude the requesting user from discovery results.
4. WHEN a discovery request specifies a radius, THE Discovery_Service SHALL only return users whose computed distance is less than or equal to that radius in kilometers.
5. IF the skill name in a discovery request does not exist in the skills table, THEN THE Discovery_Service SHALL return a 400 Bad Request error with the message "Unknown skill category".
6. IF the latitude or longitude in a discovery request is outside valid ranges (lat outside [-90, 90] or lng outside [-180, 180]), THEN THE Discovery_Service SHALL return a 400 Bad Request error with the message "Invalid coordinates".
7. WHEN a discovery request returns no matching users, THE Discovery_Service SHALL return an empty array with a 200 OK status.
8. THE Discovery_Service SHALL only return users who have non-null latitude and longitude values stored in their profile.

---

### Requirement 6: Connection Requests

**User Story:** As a registered user, I want to send connection requests to other users I discover, so that I can build my network of skill-sharing contacts.

#### Acceptance Criteria

1. WHEN a user sends a connection request to another user, THE Connection_Service SHALL create a new connection record with status `pending` and return the connection details.
2. WHEN a user attempts to send a connection request to themselves, THE Connection_Service SHALL return a 400 Bad Request error.
3. WHEN a user attempts to send a connection request to a user they already have a pending request with, THE Connection_Service SHALL return a 409 Conflict error.
4. WHEN a user attempts to send a connection request to a user they are already connected with, THE Connection_Service SHALL return a 409 Conflict error.
5. THE Connection_Service SHALL enforce that only one connection record exists per user pair in the database.

---

### Requirement 7: Connection Acceptance and Decline

**User Story:** As a registered user, I want to accept or decline incoming connection requests, so that I can control who is in my network.

#### Acceptance Criteria

1. WHEN the addressee of a pending connection request accepts it, THE Connection_Service SHALL update the connection status to `accepted` and return the updated connection.
2. WHEN the addressee of a pending connection request declines it, THE Connection_Service SHALL update the connection status to `declined` and return the updated connection.
3. WHEN a user requests their connection list, THE Connection_Service SHALL return all connections associated with that user.
4. WHEN a user attempts to accept or decline a connection that does not belong to them, THE Connection_Service SHALL return a 403 Forbidden error.
5. WHEN a user deletes a connection, THE Connection_Service SHALL remove the connection record and return a success response.

---

### Requirement 8: Conversation Management

**User Story:** As a connected user, I want to create and view conversations with my connections, so that I can organize my chats.

#### Acceptance Criteria

1. WHEN a user creates a conversation with a list of participant IDs, THE Messaging_Service SHALL create a new conversation record, associate all participants, and return the Conversation object.
2. WHEN a user requests their conversation list, THE Messaging_Service SHALL return all conversations in which that user is a participant.
3. WHEN a user requests the messages in a conversation they participate in, THE Messaging_Service SHALL return the full message history for that conversation.
4. IF a user attempts to create a conversation with a participant who is not an accepted connection, THEN THE Messaging_Service SHALL return a 403 Forbidden error.
5. IF a user attempts to access messages in a conversation they are not a participant of, THEN THE Messaging_Service SHALL return a 403 Forbidden error.

---

### Requirement 9: Real-Time Messaging

**User Story:** As a connected user, I want to send and receive messages in real time, so that I can have live conversations with my connections.

#### Acceptance Criteria

1. WHEN a user connects to the WebSocket_Server and authenticates with a valid JWT token, THE WebSocket_Server SHALL establish an authenticated session for that user.
2. WHEN an authenticated user sends a `send_message` event with a conversationId and text, THE Messaging_Service SHALL persist the message to the database with a sentAt timestamp and return the saved Message object.
3. WHEN a message is sent, THE WebSocket_Server SHALL emit a `receive_message` event to all online participants of that conversation except the sender.
4. WHEN a recipient is offline at the time a message is sent, THE Messaging_Service SHALL store the message so it is available when the recipient next fetches the conversation's message history.
5. WHEN a user sends a `typing` event for a conversation, THE WebSocket_Server SHALL broadcast the typing indicator to other participants of that conversation.
6. IF a user attempts to send a message to a conversation they are not a participant of, THEN THE Messaging_Service SHALL return a 403 Forbidden error.
7. IF a user attempts to send a message with empty or whitespace-only text, THEN THE Messaging_Service SHALL return a 400 Bad Request error.
8. IF a user attempts to send a message to a conversation that does not exist, THEN THE Messaging_Service SHALL return a 404 Not Found error.

---

### Requirement 10: Security and Input Validation

**User Story:** As a platform operator, I want all inputs sanitized and all endpoints protected, so that the platform is secure against common attacks.

#### Acceptance Criteria

1. THE Auth_Service SHALL store all passwords as bcrypt hashes and SHALL never persist or return plaintext passwords.
2. WHEN a protected route is accessed, THE Auth_Service SHALL validate the JWT token from the `Authorization: Bearer <token>` header before processing the request.
3. THE Auth_Service SHALL apply rate limiting to the `/signup`, `/login`, and `/connections/request` endpoints.
4. THE Auth_Service SHALL use parameterized queries for all database interactions to prevent SQL injection.
5. WHEN a user accesses or modifies profile data, THE Profile_Service SHALL verify that the requesting user is authorized to perform that action.

---

### Requirement 11: Data Persistence and Integrity

**User Story:** As a platform operator, I want all user data, connections, and messages to be reliably persisted, so that no data is lost between sessions.

#### Acceptance Criteria

1. WHEN a user account is deleted, THE system SHALL cascade-delete all associated user_skills, connections, conversation_participants, and messages records.
2. THE system SHALL enforce referential integrity between users, skills, user_skills, connections, conversations, conversation_participants, and messages tables via foreign key constraints.
3. WHEN a message is persisted, THE Messaging_Service SHALL record a non-null sentAt timestamp on the message record.
4. THE system SHALL assign a unique UUID primary key to every user, connection, conversation, and message record at creation time.
