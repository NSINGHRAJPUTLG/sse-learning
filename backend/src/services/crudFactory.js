const ApiError = require('../utils/ApiError');
const { getPagination, getSort } = require('../utils/pagination');
const { buildFilters } = require('../utils/queryFeatures');

function createCrudService(Model, filterAllowList = []) {
  return {
    async create(payload) {
      return Model.create(payload);
    },

    async getById(id, companyId) {
      const item = await Model.findOne({ _id: id, companyId }).lean();
      if (!item) throw new ApiError(404, 'Resource not found');
      return item;
    },

    async list(query, companyId) {
      const { page, limit, skip } = getPagination(query);
      const sort = getSort(query.sortBy, query.order);
      const filters = buildFilters(query, filterAllowList);
      const finalFilters = { ...filters, companyId };

      const [items, total] = await Promise.all([
        Model.find(finalFilters).sort(sort).skip(skip).limit(limit).lean(),
        Model.countDocuments(finalFilters),
      ]);

      return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
    },

    async update(id, payload, companyId) {
      const item = await Model.findOneAndUpdate({ _id: id, companyId }, payload, {
        new: true,
        runValidators: true,
      }).lean();
      if (!item) throw new ApiError(404, 'Resource not found');
      return item;
    },

    async remove(id, companyId) {
      const item = await Model.findOneAndDelete({ _id: id, companyId }).lean();
      if (!item) throw new ApiError(404, 'Resource not found');
      return item;
    },
  };
}

module.exports = createCrudService;
