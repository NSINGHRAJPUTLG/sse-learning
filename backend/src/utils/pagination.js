function getPagination(query = {}) {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 10), 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function getSort(sortBy, order = 'desc') {
  if (!sortBy) return { createdAt: -1 };
  return { [sortBy]: order === 'asc' ? 1 : -1 };
}

module.exports = { getPagination, getSort };
