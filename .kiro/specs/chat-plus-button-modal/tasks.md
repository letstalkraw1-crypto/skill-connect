# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Plus Button Opens Modal
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For this deterministic bug, scope the property to the concrete failing case: clicking the "+" button in the message input area (line 276 of Chat.jsx) does nothing
  - Test that clicking the "+" button in the message input area opens a modal with "Chats" and "Groups" tabs
  - The test assertions should match the Expected Behavior: modal appears with two tabs, connections are displayed in Chats tab by default
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found: button click does not trigger modal, no modal component exists
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Chat Functionality
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (all interactions except clicking the "+" button in message input)
  - Write property-based tests capturing observed behavior patterns:
    - Message sending via Enter key and Send button works correctly
    - Conversation switching in sidebar loads messages correctly
    - Real-time message reception via socket displays messages
    - Sidebar "+" button (line 157) continues to function as before
    - Other buttons (Smile, Phone, Video, MoreVertical) continue to work
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix for non-functional "+" button in message input area

  - [x] 3.1 Add communityService to frontend/src/services/api.js
    - Export new communityService object with listCommunities method
    - Method signature: `listCommunities: () => api.get('/communities')`
    - This enables fetching communities/groups the user is a member of
    - _Bug_Condition: isBugCondition(input) where input.target is plusButtonInMessageInput AND input.type === 'click'_
    - _Expected_Behavior: Modal opens with Chats and Groups tabs, displaying connections by default_
    - _Preservation: All existing chat functionality (message sending, receiving, conversation switching, other buttons) remains unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 3.2 Add state variables to Chat component
    - Add three new state variables after existing state declarations (around line 18):
      - `const [showModal, setShowModal] = useState(false);` - controls modal visibility
      - `const [connections, setConnections] = useState([]);` - stores user's connections
      - `const [communities, setCommunities] = useState([]);` - stores user's communities
    - _Bug_Condition: Missing state management for modal and data_
    - _Expected_Behavior: State variables enable modal control and data storage_
    - _Preservation: Existing state variables remain unchanged_
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Add data fetching functions
    - Add fetchConnections function: async function that calls `connectionService.getConnections(currentUser._id || currentUser.id)` and updates connections state
    - Add fetchCommunities function: async function that calls `communityService.listCommunities()` and filters for communities where `isMember` is true
    - _Bug_Condition: No API integration to fetch connections or communities_
    - _Expected_Behavior: Functions fetch and populate connections and communities data_
    - _Preservation: Existing data fetching functions (fetchConversations, fetchMessages) remain unchanged_
    - _Requirements: 2.2, 2.3_

  - [x] 3.4 Add modal control and selection handlers
    - Add handleOpenModal function: sets showModal to true, calls fetchConnections() and fetchCommunities()
    - Add handleSelectConnection function: takes userId, calls chatService.createConversation([userId]), updates conversations state, sets activeChat, closes modal
    - Add handleSelectCommunity function: takes community object, finds/creates conversation using community.conversationId, sets activeChat, closes modal
    - _Bug_Condition: No handlers to open modal or handle selections_
    - _Expected_Behavior: Handlers enable modal opening and conversation creation from selections_
    - _Preservation: Existing handlers (handleSendMessage) remain unchanged_
    - _Requirements: 2.1, 2.5, 2.6_

  - [x] 3.5 Wire up the "+" button in message input area
    - Locate the "+" button at line 276 in Chat.jsx (inside the form, first button in the flex gap-1 div)
    - Add `onClick={handleOpenModal}` to the button element
    - Keep existing `type="button"` and className attributes
    - _Bug_Condition: Button has no onClick handler_
    - _Expected_Behavior: Clicking button triggers handleOpenModal_
    - _Preservation: Button styling and type remain unchanged_
    - _Requirements: 2.1_

  - [x] 3.6 Create NewChatModal component
    - Create inline modal component before the return statement in Chat component
    - Component accepts props: show, onClose, connections, communities, onSelectConnection, onSelectCommunity
    - Component has internal state: activeTab ('chats' | 'groups'), searchQuery (string)
    - Renders modal overlay with backdrop blur when show is true
    - Contains header with close button (X)
    - Contains two tab buttons: "Chats" and "Groups"
    - Contains search input for filtering
    - Displays list of connections with avatars and names in Chats tab
    - Displays list of communities with avatars and names in Groups tab
    - Clicking backdrop or close button calls onClose
    - Clicking a connection calls onSelectConnection(connection.id)
    - Clicking a community calls onSelectCommunity(community)
    - Search input filters displayed items by name
    - _Bug_Condition: No modal component exists_
    - _Expected_Behavior: Modal component displays connections and groups with search functionality_
    - _Preservation: Existing components remain unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.7 Render NewChatModal in Chat component JSX
    - Add modal component to JSX before closing div of main container
    - Place at the end of the main container div, after the chat window
    - Pass props: `show={showModal}`, `onClose={() => setShowModal(false)}`, `connections={connections}`, `communities={communities}`, `onSelectConnection={handleSelectConnection}`, `onSelectCommunity={handleSelectCommunity}`
    - _Bug_Condition: Modal component not rendered in DOM_
    - _Expected_Behavior: Modal component is rendered and controlled by showModal state_
    - _Preservation: Existing JSX structure remains unchanged_
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.8 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Plus Button Opens Modal
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.9 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Chat Functionality
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - Verify message sending, conversation switching, real-time updates, and other buttons work as before
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise
  - Verify modal opens when "+" button is clicked
  - Verify connections and groups are displayed correctly
  - Verify search functionality works
  - Verify selecting a connection or group creates/opens conversation
  - Verify all existing chat functionality remains unchanged
