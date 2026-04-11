# Implementation Plan: Connection Search and Shareable URLs

## Overview

This implementation plan breaks down the Connection Search and Shareable URLs feature into discrete coding tasks. The feature adds user search functionality to the Connections tab and implements shareable profile URLs in two formats (`/profile/{shortId}` and `/u/{shortId}`). The implementation follows an incremental approach, building from backend services to frontend components, with testing integrated throughout.

## Tasks

- [x] 1. Set up backend user search service
  - Create `backend/src/services/userSearch.js` with search logic
  - Implement `extractShortIdFromQuery()` function to parse URLs and extract shortIds
  - Implement `searchUsers()` function to query users by name or shortId
  - Add logic to exclude current user from search results
  - Add logic to limit results to 10 users
  - Add logic to determine connection status for each result
  - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7, 3.7, 3.8, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 1.1 Write property test for user search service
  - **Property 2: Exact ShortId Match** - Any valid shortId returns the correct user
  - **Property 3: Partial Name Match** - Any partial name string returns users containing that string
  - **Property 4: URL-Based Search** - Any valid profile URL extracts shortId and returns user
  - **Property 6: Search Result Limit** - Search results never exceed 10 users
  - **Property 7: Current User Exclusion** - Current user never appears in search results
  - **Property 16: Invalid URL Fallback** - Invalid URL patterns fall back to name search
  - **Validates: Requirements 2.4, 2.5, 2.6, 2.7, 3.7, 3.8, 7.3**

- [x] 2. Create backend search API endpoint
  - Add `GET /api/users/search` route to `backend/src/routes/userRoutes.js`
  - Create controller function in `backend/src/controllers/userController.js`
  - Parse query parameter `q` for search query
  - Parse optional `limit` parameter (default 10)
  - Call `searchUsers()` service function
  - Return formatted JSON response with user array
  - Add authentication middleware to protect endpoint
  - _Requirements: 2.3, 2.4, 2.5, 2.6_

- [ ]* 2.1 Write unit tests for search API endpoint
  - Test successful search with name query
  - Test successful search with shortId query
  - Test successful search with URL query
  - Test empty query returns empty results
  - Test authentication requirement
  - Test error handling for invalid requests
  - _Requirements: 2.3, 2.4, 2.5, 2.6_

- [x] 3. Create backend profile resolution endpoint
  - Add `GET /api/users/by-shortid/:shortId` route to `backend/src/routes/userRoutes.js`
  - Create controller function to resolve shortId to user profile
  - Return user profile data or 404 if not found
  - Include connection status with requesting user
  - _Requirements: 5.3, 5.4_

- [ ]* 3.1 Write property test for profile URL resolution
  - **Property 14: Profile URL Resolution** - Any valid shortId URL resolves to correct user profile
  - **Property 15: Invalid ShortId Error Handling** - Any invalid shortId returns appropriate error
  - **Validates: Requirements 5.3, 5.4**

- [ ] 4. Checkpoint - Ensure backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Create frontend profile URL routes
  - Add `/profile/:shortId` route to `frontend/src/App.jsx` (or router config)
  - Add `/u/:shortId` route to `frontend/src/App.jsx` (or router config)
  - Both routes should render the Profile component
  - Add route handler to resolve shortId to userId before rendering
  - Handle invalid shortId with "User not found" message
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 5.1 Write property test for frontend URL routing
  - **Property 13: Profile URL Format Interchangeability** - Both URL formats resolve to same user profile
  - **Validates: Requirements 5.1, 5.2, 5.5**

- [x] 6. Create ConnectionSearchModal component
  - Create `frontend/src/components/ConnectionSearchModal.jsx`
  - Implement modal structure with search input field
  - Add placeholder text "Search by name, user ID, or profile URL"
  - Add close button functionality
  - Add loading state indicator
  - Add empty state for "No users found"
  - Implement mobile-responsive full-screen layout
  - _Requirements: 2.1, 2.2, 2.7, 2.8, 3.6, 10.1, 10.2_

- [x] 7. Implement search functionality in ConnectionSearchModal
  - Add search input onChange handler
  - Implement 400ms debounce for search queries
  - Make API call to `GET /api/users/search?q={query}`
  - Update component state with search results
  - Handle loading state during API call
  - Handle error state for failed searches
  - Prevent search for queries less than 2 characters
  - _Requirements: 2.3, 2.7, 2.8, 8.1, 8.2, 8.3_

- [ ]* 7.1 Write property test for search query execution
  - **Property 1: Search Query Execution** - Any valid search query executes search and returns results
  - **Validates: Requirements 2.3**

- [x] 8. Implement search results display in ConnectionSearchModal
  - Create search result item component
  - Display user avatar, name, shortId, and location for each result
  - Limit display to 10 results maximum
  - Add scrollable container for results
  - Ensure mobile touch targets are minimum 44x44px
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.7, 10.3, 10.4_

- [ ]* 8.1 Write property test for search result display
  - **Property 5: Search Result User Information Completeness** - All search results display complete user information
  - **Validates: Requirements 3.2, 3.3, 3.4, 3.5**

- [x] 9. Implement connection request functionality in search results
  - Add "Connect" button for each search result
  - Implement onClick handler to send connection request
  - Make API call to `POST /api/connections/request` (existing endpoint)
  - Update button state to "Request Sent" after successful request
  - Disable button after request is sent
  - Display "Connected" for users with accepted connections
  - Display "Request Sent" for users with pending requests
  - Handle and display error messages for failed requests
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [ ]* 9.1 Write property tests for connection request functionality
  - **Property 8: Connect Button Presence** - Any user in search results has a connect button or status indicator
  - **Property 9: Connection Request Creation** - Clicking connect button sends connection request
  - **Property 10: Connection Request UI State Update** - Button changes to "Request Sent" after successful request
  - **Property 11: Existing Connection Status Display** - Existing connections show appropriate status
  - **Property 12: Connection Request Error Handling** - Failed requests display error message
  - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7**

- [x] 10. Update Profile page with Add Connection button
  - Modify `frontend/src/pages/Profile.jsx`
  - Add "Add My First Connection" button when user has no connections
  - Add "+" icon button in Connections tab header when connections exist
  - Wire button onClick to open ConnectionSearchModal
  - Match visual style of "Add My First Skill" button
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 11. Add shareable profile URL display to Profile page
  - Modify `frontend/src/pages/Profile.jsx`
  - Display shareable URL in format `/profile/{shortId}` on own profile
  - Add copy-to-clipboard functionality
  - Display "Copied!" confirmation message after copy
  - Make URL clickable and copyable
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 12. Checkpoint - Ensure frontend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Update connection request notification system
  - Modify notification creation in `backend/src/controllers/connectionController.js`
  - Ensure notifications include sender's name and avatar
  - Ensure notifications include accept/decline action buttons
  - Create notification for requester when request is accepted
  - Create notification for requester when request is declined
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]* 13.1 Write property test for connection request notifications
  - **Property 17: Connection Request Notification Creation** - Any connection request creates notification with complete information
  - **Property 18: Connection Response Notification** - Any connection response creates notification for requester
  - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

- [x] 14. Integration and final wiring
  - Verify all components are properly connected
  - Test end-to-end flow: open modal → search → send request → receive notification
  - Test profile URL sharing: copy URL → paste in new tab → view profile
  - Test URL-based search: copy URL → paste in search → find user
  - Verify mobile responsiveness across all components
  - _Requirements: All requirements_

- [ ]* 14.1 Write integration tests for complete user flows
  - Test complete search and connect flow
  - Test profile URL sharing and resolution flow
  - Test URL-based search flow
  - Test mobile responsive behavior
  - _Requirements: All requirements_

- [ ] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation builds incrementally: backend services → API endpoints → frontend components → integration
- Existing connection request functionality is reused where possible
- Mobile responsiveness is integrated throughout rather than as a separate phase
