const asyncHandler = require('../../utils/asyncHandler');
const { sendResponse } = require('../../utils/response');
const payrollService = require('./payroll.service');
const { Payroll } = require('./payroll.model');

const upsertSalaryStructure = asyncHandler(async (req, res) => {
  const data = await payrollService.createOrUpdateSalaryStructure(req.user, req.body);
  return sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Salary structure saved',
    data,
  });
});

const generatePayroll = asyncHandler(async (req, res) => {
  const data = await payrollService.generatePayroll(req.user, req.body.month, req.body.year);
  req.audit({
    action: 'GENERATE',
    module: 'PAYROLL',
    entityId: `${req.body.year}-${req.body.month}`,
    entityType: 'PAYROLL',
    before: null,
    after: data,
  });
  return sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Payroll generated successfully',
    data,
  });
});

const lockPayroll = asyncHandler(async (req, res) => {
  const before = await Payroll.findOne({ _id: req.params.id, companyId: req.user.companyId }).lean();
  const data = await payrollService.lockPayroll(req.user, req.params.id);
  req.audit({
    action: 'LOCK',
    module: 'PAYROLL',
    entityId: req.params.id,
    entityType: 'PAYROLL',
    before,
    after: data,
  });
  return sendResponse(res, { success: true, message: 'Payroll locked', data });
});

const markAsPaid = asyncHandler(async (req, res) => {
  const before = await Payroll.findOne({ _id: req.params.id, companyId: req.user.companyId }).lean();
  const data = await payrollService.markAsPaid(req.user, req.params.id);
  req.audit({
    action: 'PAY',
    module: 'PAYROLL',
    entityId: req.params.id,
    entityType: 'PAYROLL',
    before,
    after: data,
  });
  return sendResponse(res, { success: true, message: 'Payroll marked as paid', data });
});

const listPayroll = asyncHandler(async (req, res) => {
  const data = await payrollService.getPayrollList(req.user, req.query);
  return sendResponse(res, { success: true, message: 'Payroll list fetched', data });
});

const getPayrollById = asyncHandler(async (req, res) => {
  const data = await payrollService.getPayrollById(req.user, req.params.id);
  return sendResponse(res, { success: true, message: 'Payroll fetched', data });
});

const generatePayslip = asyncHandler(async (req, res) => {
  const data = await payrollService.generatePayslip(req.user, req.params.id);
  return sendResponse(res, { success: true, message: 'Payslip generated', data });
});

module.exports = {
  upsertSalaryStructure,
  generatePayroll,
  lockPayroll,
  markAsPaid,
  listPayroll,
  getPayrollById,
  generatePayslip,
};
