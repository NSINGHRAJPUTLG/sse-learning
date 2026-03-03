function buildFilters(query, allowList = []) {
  const filters = {};
  for (const key of allowList) {
    if (query[key] !== undefined && query[key] !== '') {
      filters[key] = query[key];
    }
  }
  return filters;
}

module.exports = { buildFilters };
