const asyncHandler = require('../../utils/asyncHandler');
const { sendResponse } = require('../../utils/response');
const departmentService = require('./department.service');

const createDepartment = asyncHandler(async (req, res) => {
  const data = await departmentService.createDepartment(req.body, req.user);
  return sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Department created successfully',
    data,
  });
});

const getDepartments = asyncHandler(async (req, res) => {
  const data = await departmentService.getDepartments(req.query, req.user);
  return sendResponse(res, {
    success: true,
    message: 'Departments fetched successfully',
    data,
  });
});

const getDepartmentById = asyncHandler(async (req, res) => {
  const data = await departmentService.getDepartmentById(req.params.id, req.user);
  return sendResponse(res, {
    success: true,
    message: 'Department fetched successfully',
    data,
  });
});

const updateDepartment = asyncHandler(async (req, res) => {
  const data = await departmentService.updateDepartment(req.params.id, req.body, req.user);
  return sendResponse(res, {
    success: true,
    message: 'Department updated successfully',
    data,
  });
});

const deleteDepartment = asyncHandler(async (req, res) => {
  const data = await departmentService.deleteDepartment(req.params.id, req.user);
  return sendResponse(res, {
    success: true,
    message: 'Department deactivated successfully',
    data,
  });
});

const getDepartmentStats = asyncHandler(async (req, res) => {
  const data = await departmentService.getDepartmentStats(req.params.id, req.user);
  return sendResponse(res, {
    success: true,
    message: 'Department stats fetched successfully',
    data,
  });
});

module.exports = {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  getDepartmentStats,
};
