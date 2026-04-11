# Requirements Document

## Introduction

This feature adds connection search functionality to the Connections tab and implements shareable profile URLs. Users will be able to search for other users by shortId, name, or shareable URL, and send connection requests. Each user will have a shareable profile URL that can be used to view their profile and initiate connections.

## Glossary

- **Connection_Search_Modal**: A modal dialog that allows users to search for other users
- **Search_System**: The backend system that handles user search queries
- **Profile_URL_System**: The system that generates and resolves shareable profile URLs
- **Connections_Tab**: The tab in the Profile page that displays user connections
- **Add_Connection_Button**: The "+" button in the Connections tab that opens the search modal
- **User_Search_Query**: A search string entered by the user (shortId, name, or URL)
- **Search_Results**: A list of users matching the search query
- **Connection_Request**: A request sent from one user to another to establish a connection
- **Shareable_Profile_URL**: A URL that can be shared to view a user's profile (format: /profile/{shortId} or /u/{shortId})

## Requirements

### Requirement 1: Add Connection Button

**User Story:** As a user, I want to see an "Add Connection" button in the Connections tab, so that I can easily discover how to add new connections.

#### Acceptance Criteria

1. WHEN the Connections tab is active AND the user has no connections, THE Connections_Tab SHALL display an "Add My First Connection" button with a "+" icon
2. WHEN the Connections tab is active AND the user has existing connections, THE Connections_Tab SHALL display a "+" icon button in the tab header
3. THE Add_Connection_Button SHALL use the same visual style as the "Add My First Skill" button in the Skills tab
4. WHEN the Add_Connection_Button is clicked, THE Connection_Search_Modal SHALL open

### Requirement 2: Connection Search Modal

**User Story:** As a user, I want to search for other users in a modal dialog, so that I can find and connect with people I know.

#### Acceptance Criteria

1. WHEN the Connection_Search_Modal opens, THE Connection_Search_Modal SHALL display a search input field
2. THE Connection_Search_Modal SHALL display placeholder text "Search by name, user ID, or profile URL"
3. WHEN a User_Search_Query is entered, THE Search_System SHALL search for users matching the query
4. THE Search_System SHALL support searching by exact shortId match
5. THE Search_System SHALL support searching by partial name match (case-insensitive)
6. THE Search_System SHALL support searching by shareable profile URL
7. WHEN the User_Search_Query length is less than 2 characters, THE Connection_Search_Modal SHALL display no results
8. WHEN search results are loading, THE Connection_Search_Modal SHALL display a loading indicator

### Requirement 3: Search Results Display

**User Story:** As a user, I want to see search results with user information, so that I can identify the correct person to connect with.

#### Acceptance Criteria

1. WHEN Search_Results are available, THE Connection_Search_Modal SHALL display a list of matching users
2. FOR EACH user in Search_Results, THE Connection_Search_Modal SHALL display the user's avatar
3. FOR EACH user in Search_Results, THE Connection_Search_Modal SHALL display the user's name
4. FOR EACH user in Search_Results, THE Connection_Search_Modal SHALL display the user's shortId
5. FOR EACH user in Search_Results, THE Connection_Search_Modal SHALL display the user's location (if available)
6. WHEN no users match the User_Search_Query, THE Connection_Search_Modal SHALL display "No users found"
7. THE Search_Results SHALL be limited to a maximum of 10 users
8. THE Search_Results SHALL exclude the current user from results

### Requirement 4: Send Connection Request from Search

**User Story:** As a user, I want to send connection requests directly from search results, so that I can quickly connect with people I find.

#### Acceptance Criteria

1. FOR EACH user in Search_Results, THE Connection_Search_Modal SHALL display a "Connect" button
2. WHEN the "Connect" button is clicked, THE Search_System SHALL send a Connection_Request to the selected user
3. WHEN a Connection_Request is successfully sent, THE "Connect" button SHALL change to "Request Sent" state
4. WHEN a Connection_Request is successfully sent, THE "Connect" button SHALL be disabled
5. IF a connection already exists with a user, THE Connection_Search_Modal SHALL display "Connected" instead of "Connect" button
6. IF a pending connection request exists with a user, THE Connection_Search_Modal SHALL display "Request Sent" instead of "Connect" button
7. WHEN a Connection_Request fails, THE Connection_Search_Modal SHALL display an error message

### Requirement 5: Shareable Profile URLs

**User Story:** As a user, I want to have a shareable profile URL, so that I can easily share my profile with others outside the platform.

#### Acceptance Criteria

1. THE Profile_URL_System SHALL generate shareable URLs in the format /profile/{shortId}
2. THE Profile_URL_System SHALL generate alternative shareable URLs in the format /u/{shortId}
3. WHEN a shareable profile URL is accessed, THE Profile_URL_System SHALL resolve the shortId to the user's profile
4. WHEN a shareable profile URL with an invalid shortId is accessed, THE Profile_URL_System SHALL display "User not found"
5. THE Profile_URL_System SHALL support both /profile/{shortId} and /u/{shortId} formats interchangeably

### Requirement 6: Profile URL Display

**User Story:** As a user, I want to see my shareable profile URL on my profile page, so that I can easily copy and share it.

#### Acceptance Criteria

1. WHEN viewing own profile, THE Profile page SHALL display the shareable profile URL
2. THE shareable profile URL SHALL be displayed in a copyable format
3. WHEN the shareable profile URL is clicked, THE Profile_URL_System SHALL copy the URL to clipboard
4. WHEN the URL is copied to clipboard, THE Profile page SHALL display a "Copied!" confirmation message

### Requirement 7: Search by Profile URL

**User Story:** As a user, I want to paste a profile URL into the search box, so that I can quickly find and connect with someone who shared their profile link.

#### Acceptance Criteria

1. WHEN a User_Search_Query contains "/profile/" or "/u/", THE Search_System SHALL extract the shortId from the URL
2. WHEN a valid shortId is extracted from a URL, THE Search_System SHALL search for the user by shortId
3. WHEN an invalid URL format is provided, THE Search_System SHALL treat it as a regular name search
4. THE Search_System SHALL support full URLs (e.g., "https://domain.com/profile/abc123")
5. THE Search_System SHALL support partial URLs (e.g., "/profile/abc123" or "profile/abc123")

### Requirement 8: Search Debouncing

**User Story:** As a user, I want search to wait until I finish typing, so that the system doesn't make unnecessary requests while I'm still entering my query.

#### Acceptance Criteria

1. WHEN a User_Search_Query is being typed, THE Search_System SHALL wait 400 milliseconds before executing the search
2. WHEN a new character is typed before the 400ms delay completes, THE Search_System SHALL reset the timer
3. THE Search_System SHALL only execute one search request per completed typing session

### Requirement 9: Connection Request Notifications

**User Story:** As a user, I want to receive notifications when someone sends me a connection request, so that I can respond promptly.

#### Acceptance Criteria

1. WHEN a Connection_Request is sent, THE Search_System SHALL create a notification for the recipient
2. THE notification SHALL include the sender's name and avatar
3. THE notification SHALL include action buttons to accept or decline the request
4. WHEN a Connection_Request is accepted, THE Search_System SHALL create a notification for the requester
5. WHEN a Connection_Request is declined, THE Search_System SHALL create a notification for the requester

### Requirement 10: Mobile Responsiveness

**User Story:** As a mobile user, I want the connection search modal to work well on my device, so that I can search and connect on the go.

#### Acceptance Criteria

1. WHEN the Connection_Search_Modal is opened on a mobile device, THE Connection_Search_Modal SHALL be full-screen
2. THE Connection_Search_Modal SHALL have a close button visible on mobile devices
3. THE Search_Results SHALL be scrollable on mobile devices
4. THE "Connect" buttons SHALL be easily tappable on mobile devices (minimum 44x44px touch target)
