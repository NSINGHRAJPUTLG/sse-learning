const asyncHandler = require('../../utils/asyncHandler');
const { sendResponse } = require('../../utils/response');
const service = require('./service');

const create = asyncHandler(async (req, res) => {
  const item = await service.create(req.body);
  return sendResponse(res, { statusCode: 201, data: item, message: 'User created' });
});

const getById = asyncHandler(async (req, res) => {
  const item = await service.getById(req.params.id, req.user.companyId);
  return sendResponse(res, { data: item, message: 'User fetched' });
});

const list = asyncHandler(async (req, res) => {
  const data = await service.list(req.query, req.user.companyId);
  return sendResponse(res, { data, message: 'Users fetched' });
});

const update = asyncHandler(async (req, res) => {
  const item = await service.update(req.params.id, req.body, req.user.companyId);
  return sendResponse(res, { data: item, message: 'User updated' });
});

const remove = asyncHandler(async (req, res) => {
  const item = await service.remove(req.params.id, req.user.companyId);
  return sendResponse(res, { data: item, message: 'User deleted' });
});

module.exports = { create, getById, list, update, remove };
