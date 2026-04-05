/**
 * Reusable pagination helper for Mongoose queries.
 * @param {import('mongoose').Model} model - The Mongoose model to query.
 * @param {Object} query - The query object.
 * @param {Object} options - Pagination options { page, limit, populate, sort, lean }.
 * @returns {Promise<Object>} - Paginated results with metadata.
 */
async function paginate(model, query, options = {}) {
  const page = parseInt(options.page, 10) || 1;
  const limit = parseInt(options.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const [totalDocs, docs] = await Promise.all([
    model.countDocuments(query),
    model.find(query)
      .sort(options.sort || { createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate(options.populate || '')
      .lean(options.lean !== false) // default lean to true
  ]);

  const totalPages = Math.ceil(totalDocs / limit);

  return {
    docs,
    totalDocs,
    limit,
    totalPages,
    page,
    pagingCounter: skip + 1,
    hasPrevPage: page > 1,
    hasNextPage: page < totalPages,
    prevPage: page > 1 ? page - 1 : null,
    nextPage: page < totalPages ? page + 1 : null
  };
}

module.exports = { paginate };
