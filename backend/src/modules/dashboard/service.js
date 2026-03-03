const Employee = require('../employee/model');
const Attendance = require('../attendance/model');
const Leave = require('../leave/model');
const { Payroll } = require('../payroll/model');

async function getSummary(companyId, query = {}) {
  const month = Number(query.month || new Date().getMonth() + 1);
  const year = Number(query.year || new Date().getFullYear());

  const [headcount, departmentDistribution, attendanceStats, leaveSummary, payrollSummary] = await Promise.all([
    Employee.countDocuments({ companyId, status: 'ACTIVE' }),
    Employee.aggregate([
      { $match: { companyId } },
      { $group: { _id: '$departmentId', count: { $sum: 1 } } },
    ]),
    Attendance.aggregate([
      { $match: { companyId } },
      { $group: { _id: '$status', count: { $sum: 1 }, avgHours: { $avg: '$totalHours' } } },
    ]),
    Leave.aggregate([
      { $match: { companyId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Payroll.aggregate([
      { $match: { companyId, month, year } },
      {
        $group: {
          _id: '$status',
          totalNet: { $sum: '$netSalary' },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  return { headcount, departmentDistribution, attendanceStats, leaveSummary, payrollSummary, month, year };
}

module.exports = { getSummary };
