const User = require('../models/User');
const Connection = require('../models/Connection');

/**
 * Extract shortId from a profile URL query
 * Supports formats: /profile/abc123, /u/abc123, https://domain.com/profile/abc123
 * @param {string} query - The search query that might contain a URL
 * @returns {string|null} - The extracted shortId or null if not found
 */
function extractShortIdFromQuery(query) {
  if (!query || typeof query !== 'string') {
    return null;
  }

  // Match patterns: /profile/abc123, /u/abc123, or full URLs
  const patterns = [
    /\/profile\/([a-zA-Z0-9_-]+)/,
    /\/u\/([a-zA-Z0-9_-]+)/
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Search for users by name, shortId, or profile URL
 * @param {string} query - The search query
 * @param {string} requesterId - The ID of the user performing the search
 * @param {number} limit - Maximum number of results (default: 10)
 * @returns {Promise<Array>} - Array of user objects with connection status
 */
async function searchUsers(query, requesterId, limit = 10) {
  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return [];
  }

  // 1. Parse query to detect URL patterns
  const shortId = extractShortIdFromQuery(query);

  // 2. Build search criteria
  let searchCriteria;
  if (shortId) {
    // Search by exact shortId match
    searchCriteria = {
      shortId: shortId,
      _id: { $ne: requesterId }
    };
  } else {
    // Search by partial name match (case-insensitive)
    searchCriteria = {
      name: { $regex: query.trim(), $options: 'i' },
      _id: { $ne: requesterId }
    };
  }

  // 3. Execute search
  const users = await User.find(searchCriteria)
    .select('_id name shortId avatarUrl location')
    .limit(limit)
    .lean();

  if (users.length === 0) {
    return [];
  }

  // 4. Determine connection status for each user
  const userIds = users.map(u => u._id);
  const connections = await Connection.find({
    $or: [
      { requesterId: requesterId, addresseeId: { $in: userIds } },
      { requesterId: { $in: userIds }, addresseeId: requesterId }
    ]
  }).lean();

  // 5. Map connection status to users
  const results = users.map(user => {
    const conn = connections.find(c =>
      (c.requesterId === requesterId && c.addresseeId === user._id) ||
      (c.addresseeId === requesterId && c.requesterId === user._id)
    );

    let connectionStatus = 'none';
    if (conn) {
      connectionStatus = conn.status === 'accepted' ? 'connected' : 'pending';
    }

    return {
      ...user,
      connectionStatus
    };
  });

  return results;
}

module.exports = {
  extractShortIdFromQuery,
  searchUsers
};
