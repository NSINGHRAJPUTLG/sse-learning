const request = require('supertest');
const app = require('../src/app');
const Department = require('../src/modules/department/department.model');
const { Attendance } = require('../src/modules/attendance/attendance.model');
const LeaveType = require('../src/modules/leave/leaveType.model');
const { Leave } = require('../src/modules/leave/leave.model');
const { Payroll } = require('../src/modules/payroll/payroll.model');
const { setupDatabase, teardownDatabase, clearDatabase, seedUser, seedEmployee } = require('./helpers');

async function login(companyId, email, password) {
  const res = await request(app).post('/api/auth/login').send({ companyId, email, password });
  return res.body.data.accessToken;
}

describe('Reports module', () => {
  beforeAll(setupDatabase);
  afterAll(teardownDatabase);
  beforeEach(clearDatabase);

  test('employee stats are correct and company isolated', async () => {
    const { rawPassword } = await seedUser({ role: 'HR_ADMIN' });
    const token = await login('company-test', 'admin@example.com', rawPassword);

    const dept = await Department.create({ companyId: 'company-test', name: 'Engineering', isActive: true });

    const user1 = await seedUser({ companyId: 'company-test', email: 'e1@test.com', role: 'EMPLOYEE' });
    const user2 = await seedUser({ companyId: 'company-test', email: 'e2@test.com', role: 'EMPLOYEE' });
    const user3 = await seedUser({ companyId: 'company-2', email: 'e3@test.com', role: 'EMPLOYEE' });

    const emp1 = await seedEmployee({ companyId: 'company-test', userId: user1.user._id });
    const emp2 = await seedEmployee({ companyId: 'company-test', userId: user2.user._id });
    await seedEmployee({ companyId: 'company-2', userId: user3.user._id });

    await Promise.all([
      emp1.updateOne({ departmentId: dept._id, status: 'ACTIVE' }),
      emp2.updateOne({ departmentId: dept._id, status: 'TERMINATED' }),
    ]);

    const res = await request(app)
      .get('/api/reports/employee-stats')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.totalEmployees).toBe(2);
    expect(res.body.data.activeEmployees).toBe(1);
    expect(res.body.data.inactiveEmployees).toBe(1);
    expect(res.body.data.employeesByDepartment[0].department).toBe('Engineering');
  });

  test('attendance/leave/payroll summaries are accurate and payroll summary is role-restricted', async () => {
    const { rawPassword } = await seedUser({ role: 'HR_ADMIN' });
    const hrToken = await login('company-test', 'admin@example.com', rawPassword);

    const empUser = await seedUser({ companyId: 'company-test', email: 'emp@test.com', role: 'EMPLOYEE' });
    const employee = await seedEmployee({ companyId: 'company-test', userId: empUser.user._id });

    const month = 1;
    const year = 2025;

    await Attendance.insertMany([
      {
        companyId: 'company-test',
        employeeId: employee._id,
        date: new Date(year, month - 1, 1),
        totalHours: 8,
        overtimeHours: 1,
        status: 'PRESENT',
      },
      {
        companyId: 'company-test',
        employeeId: employee._id,
        date: new Date(year, month - 1, 2),
        totalHours: 0,
        overtimeHours: 0,
        status: 'ABSENT',
      },
      {
        companyId: 'company-test',
        employeeId: employee._id,
        date: new Date(year, month - 1, 3),
        totalHours: 6,
        overtimeHours: 0,
        status: 'LATE',
      },
    ]);

    const leaveType = await LeaveType.create({
      companyId: 'company-test',
      name: 'CASUAL',
      yearlyQuota: 12,
      requiresApproval: true,
    });

    await Leave.insertMany([
      {
        companyId: 'company-test',
        employeeId: employee._id,
        leaveTypeId: leaveType._id,
        startDate: new Date(year, 0, 10),
        endDate: new Date(year, 0, 10),
        totalDays: 1,
        status: 'APPROVED',
      },
      {
        companyId: 'company-test',
        employeeId: employee._id,
        leaveTypeId: leaveType._id,
        startDate: new Date(year, 1, 10),
        endDate: new Date(year, 1, 11),
        totalDays: 2,
        status: 'REJECTED',
      },
    ]);

    await Payroll.insertMany([
      {
        companyId: 'company-test',
        employeeId: employee._id,
        month: 1,
        year,
        totalWorkingDays: 31,
        presentDays: 20,
        absentDays: 2,
        overtimeHours: 4,
        grossSalary: 2000,
        totalDeductions: 200,
        netSalary: 1800,
        status: 'PAID',
      },
      {
        companyId: 'company-test',
        employeeId: employee._id,
        month: 2,
        year,
        totalWorkingDays: 28,
        presentDays: 18,
        absentDays: 1,
        overtimeHours: 2,
        grossSalary: 2200,
        totalDeductions: 200,
        netSalary: 2000,
        status: 'PAID',
      },
    ]);

    const attendanceRes = await request(app)
      .get(`/api/reports/attendance-summary?month=${month}&year=${year}`)
      .set('Authorization', `Bearer ${hrToken}`)
      .expect(200);

    expect(attendanceRes.body.data.totalPresent).toBe(1);
    expect(attendanceRes.body.data.totalAbsent).toBe(1);
    expect(attendanceRes.body.data.totalLate).toBe(1);

    const leaveRes = await request(app)
      .get(`/api/reports/leave-summary?year=${year}`)
      .set('Authorization', `Bearer ${hrToken}`)
      .expect(200);

    expect(leaveRes.body.data.totalLeavesApplied).toBe(2);
    expect(leaveRes.body.data.totalApproved).toBe(1);
    expect(leaveRes.body.data.totalRejected).toBe(1);

    const payrollRes = await request(app)
      .get(`/api/reports/payroll-summary?year=${year}`)
      .set('Authorization', `Bearer ${hrToken}`)
      .expect(200);

    expect(payrollRes.body.data.totalNetPaid).toBe(3800);

    const empToken = await login('company-test', 'emp@test.com', 'Password123!');
    await request(app)
      .get(`/api/reports/payroll-summary?year=${year}`)
      .set('Authorization', `Bearer ${empToken}`)
      .expect(403);
  });

  test('manager scope and dashboard metrics work for team only', async () => {
    const { rawPassword } = await seedUser({ role: 'SUPER_ADMIN' });
    const adminToken = await login('company-test', 'admin@example.com', rawPassword);

    const managerCreate = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Mgr',
        lastName: 'Rpt',
        joiningDate: '2025-01-01',
        employmentType: 'FULL_TIME',
        user: { email: 'mgr-r@test.com', password: 'Password123!', role: 'MANAGER' },
      })
      .expect(201);

    const teamCreate = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Team',
        lastName: 'Rpt',
        joiningDate: '2025-01-01',
        employmentType: 'FULL_TIME',
        reportingManagerId: managerCreate.body.data.employee._id,
        user: { email: 'team-r@test.com', password: 'Password123!', role: 'EMPLOYEE' },
      })
      .expect(201);

    const otherCreate = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Other',
        lastName: 'Rpt',
        joiningDate: '2025-01-01',
        employmentType: 'FULL_TIME',
        user: { email: 'other-r@test.com', password: 'Password123!', role: 'EMPLOYEE' },
      })
      .expect(201);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await Attendance.insertMany([
      {
        companyId: 'company-test',
        employeeId: teamCreate.body.data.employee._id,
        date: today,
        totalHours: 8,
        overtimeHours: 0,
        status: 'PRESENT',
      },
      {
        companyId: 'company-test',
        employeeId: otherCreate.body.data.employee._id,
        date: today,
        totalHours: 8,
        overtimeHours: 0,
        status: 'PRESENT',
      },
    ]);

    const managerToken = await login('company-test', 'mgr-r@test.com', 'Password123!');

    const attendanceRes = await request(app)
      .get('/api/reports/attendance-summary')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(attendanceRes.body.data.totalPresent).toBe(1);

    const dashboardRes = await request(app)
      .get('/api/reports/dashboard')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(dashboardRes.body.data.employeeStats).toBeTruthy();
    expect(Array.isArray(dashboardRes.body.data.recentJoinees)).toBe(true);
  });
});
