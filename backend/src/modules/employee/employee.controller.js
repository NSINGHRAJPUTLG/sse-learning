const asyncHandler = require('../../utils/asyncHandler');
const { sendResponse } = require('../../utils/response');
const employeeService = require('./employee.service');
const { Employee } = require('./employee.model');

const createEmployee = asyncHandler(async (req, res) => {
  const data = await employeeService.createEmployee(req.body, req.user);
  req.audit({
    action: 'CREATE',
    module: 'EMPLOYEE',
    entityId: data.employee._id,
    entityType: 'EMPLOYEE',
    before: null,
    after: data.employee,
  });
  return sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Employee created successfully',
    data,
  });
});

const getEmployees = asyncHandler(async (req, res) => {
  const data = await employeeService.getEmployees(req.query, req.user);
  return sendResponse(res, {
    success: true,
    message: 'Employees fetched successfully',
    data,
  });
});

const getEmployeeById = asyncHandler(async (req, res) => {
  const data = await employeeService.getEmployeeById(req.params.id, req.user);
  return sendResponse(res, {
    success: true,
    message: 'Employee fetched successfully',
    data,
  });
});

const updateEmployee = asyncHandler(async (req, res) => {
  const before = await Employee.findOne({ _id: req.params.id, companyId: req.user.companyId }).lean();
  const data = await employeeService.updateEmployee(req.params.id, req.body, req.user);
  req.audit({
    action: req.body.userRole ? 'ROLE_CHANGE' : 'UPDATE',
    module: 'EMPLOYEE',
    entityId: req.params.id,
    entityType: 'EMPLOYEE',
    before,
    after: data,
  });
  return sendResponse(res, {
    success: true,
    message: 'Employee updated successfully',
    data,
  });
});

const deleteEmployee = asyncHandler(async (req, res) => {
  const before = await Employee.findOne({ _id: req.params.id, companyId: req.user.companyId }).lean();
  const data = await employeeService.deleteEmployee(req.params.id, req.user);
  req.audit({
    action: 'DELETE',
    module: 'EMPLOYEE',
    entityId: req.params.id,
    entityType: 'EMPLOYEE',
    before,
    after: null,
  });
  return sendResponse(res, {
    success: true,
    message: 'Employee terminated successfully',
    data,
  });
});

module.exports = {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
};
