const asyncHandler = require('../../utils/asyncHandler');
const { sendResponse } = require('../../utils/response');
const service = require('./service');

const create = asyncHandler(async (req, res) => sendResponse(res, { statusCode: 201, data: await service.create(req.body), message: 'Asset assigned' }));
const getById = asyncHandler(async (req, res) => sendResponse(res, { data: await service.getById(req.params.id, req.user.companyId), message: 'Asset fetched' }));
const list = asyncHandler(async (req, res) => sendResponse(res, { data: await service.list(req.query, req.user.companyId), message: 'Assets fetched' }));
const update = asyncHandler(async (req, res) => sendResponse(res, { data: await service.update(req.params.id, req.body, req.user.companyId), message: 'Asset updated' }));
const remove = asyncHandler(async (req, res) => sendResponse(res, { data: await service.remove(req.params.id, req.user.companyId), message: 'Asset deleted' }));

module.exports = { create, getById, list, update, remove };
