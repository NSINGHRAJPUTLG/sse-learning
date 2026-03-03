const request = require('supertest');
const app = require('../src/app');
const SalaryStructure = require('../src/modules/payroll/salaryStructure.model');
const { Payroll } = require('../src/modules/payroll/payroll.model');
const Payslip = require('../src/modules/payroll/payslip.model');
const { Attendance } = require('../src/modules/attendance/attendance.model');
const LeaveType = require('../src/modules/leave/leaveType.model');
const { Leave } = require('../src/modules/leave/leave.model');
const { setupDatabase, teardownDatabase, clearDatabase, seedUser, seedEmployee } = require('./helpers');

async function login(companyId, email, password) {
  const res = await request(app).post('/api/auth/login').send({ companyId, email, password });
  return res.body.data.accessToken;
}

describe('Payroll module', () => {
  beforeAll(setupDatabase);
  afterAll(teardownDatabase);
  beforeEach(clearDatabase);

  test('salary structure creation and payroll financial calculation', async () => {
    const { user, rawPassword } = await seedUser({ role: 'HR_ADMIN' });
    const employee = await seedEmployee({ userId: user._id });
    const token = await login('company-test', 'admin@example.com', rawPassword);

    await request(app)
      .post('/api/payroll/salary-structures')
      .set('Authorization', `Bearer ${token}`)
      .send({
        employeeId: String(employee._id),
        basic: 8000,
        hra: 1000,
        allowances: 1000,
        bonus: 0,
        deductions: 500,
        taxPercentage: 10,
        effectiveFrom: '2025-01-01',
      })
      .expect(201);

    const month = 1;
    const year = 2025;

    await Attendance.create([
      {
        companyId: 'company-test',
        employeeId: employee._id,
        date: new Date(year, month - 1, 1),
        status: 'PRESENT',
        overtimeHours: 4,
      },
      {
        companyId: 'company-test',
        employeeId: employee._id,
        date: new Date(year, month - 1, 2),
        status: 'ABSENT',
        overtimeHours: 0,
      },
      {
        companyId: 'company-test',
        employeeId: employee._id,
        date: new Date(year, month - 1, 3),
        status: 'ABSENT',
        overtimeHours: 0,
      },
    ]);

    const leaveType = await LeaveType.create({
      companyId: 'company-test',
      name: 'CASUAL',
      yearlyQuota: 12,
      carryForwardAllowed: false,
      requiresApproval: true,
    });

    await Leave.create({
      companyId: 'company-test',
      employeeId: employee._id,
      leaveTypeId: leaveType._id,
      startDate: new Date(year, month - 1, 2),
      endDate: new Date(year, month - 1, 2),
      totalDays: 1,
      status: 'APPROVED',
    });

    const generated = await request(app)
      .post('/api/payroll/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ month, year })
      .expect(201);

    expect(generated.body.data.generatedCount).toBe(1);

    const payroll = await Payroll.findOne({ companyId: 'company-test', employeeId: employee._id, month, year }).lean();
    expect(payroll).toBeTruthy();
    expect(payroll.grossSalary).toBe(10000);
    expect(payroll.absentDays).toBe(1);
    expect(payroll.overtimeHours).toBe(4);
    expect(payroll.netSalary).toBeGreaterThan(0);

    const duplicate = await request(app)
      .post('/api/payroll/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ month, year });

    expect(duplicate.statusCode).toBe(409);
  });

  test('lock/pay flow, payslip creation, and locking attendance edits', async () => {
    const { user, rawPassword } = await seedUser({ role: 'HR_ADMIN' });
    const adminEmployee = await seedEmployee({ userId: user._id });
    const token = await login('company-test', 'admin@example.com', rawPassword);

    const empUser = await seedUser({
      companyId: 'company-test',
      email: 'emp-lock@test.com',
      password: 'Password123!',
      role: 'EMPLOYEE',
    });
    const employee = await seedEmployee({ userId: empUser.user._id });

    await SalaryStructure.create({
      companyId: 'company-test',
      employeeId: adminEmployee._id,
      basic: 5000,
      hra: 1000,
      allowances: 1000,
      bonus: 0,
      deductions: 0,
      taxPercentage: 0,
      effectiveFrom: new Date('2025-01-01'),
    });

    await SalaryStructure.create({
      companyId: 'company-test',
      employeeId: employee._id,
      basic: 5000,
      hra: 1000,
      allowances: 1000,
      bonus: 0,
      deductions: 0,
      taxPercentage: 0,
      effectiveFrom: new Date('2025-01-01'),
    });

    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();

    await request(app)
      .post('/api/payroll/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ month, year })
      .expect(201);

    const payroll = await Payroll.findOne({ companyId: 'company-test', employeeId: employee._id, month, year }).lean();

    await request(app)
      .put(`/api/payroll/${payroll._id}/lock`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(200);

    await request(app)
      .put(`/api/payroll/${payroll._id}/pay`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(200);

    await request(app)
      .post(`/api/payroll/${payroll._id}/payslip`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(200);

    const payslip = await Payslip.findOne({ payrollId: payroll._id }).lean();
    expect(payslip).toBeTruthy();
    expect(payslip.breakdown.netSalary).toBeDefined();

    const empToken = await login('company-test', 'emp-lock@test.com', 'Password123!');
    const attendanceBlocked = await request(app)
      .post('/api/attendance/check-in')
      .set('Authorization', `Bearer ${empToken}`)
      .send({});

    expect(attendanceBlocked.statusCode).toBe(409);
  });

  test('role-based payroll visibility and company isolation', async () => {
    const { rawPassword } = await seedUser({ role: 'SUPER_ADMIN' });
    const adminToken = await login('company-test', 'admin@example.com', rawPassword);

    const managerCreate = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Mgr',
        lastName: 'Pay',
        joiningDate: '2025-01-01',
        employmentType: 'FULL_TIME',
        user: { email: 'paymgr@test.com', password: 'Password123!', role: 'MANAGER' },
      })
      .expect(201);

    const teamCreate = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Emp',
        lastName: 'Pay',
        joiningDate: '2025-01-01',
        employmentType: 'FULL_TIME',
        reportingManagerId: managerCreate.body.data.employee._id,
        user: { email: 'payemp@test.com', password: 'Password123!', role: 'EMPLOYEE' },
      })
      .expect(201);

    await SalaryStructure.insertMany([
      {
        companyId: 'company-test',
        employeeId: managerCreate.body.data.employee._id,
        basic: 5000,
        hra: 0,
        allowances: 0,
        bonus: 0,
        deductions: 0,
        taxPercentage: 0,
        effectiveFrom: new Date('2025-01-01'),
      },
      {
        companyId: 'company-test',
        employeeId: teamCreate.body.data.employee._id,
        basic: 5000,
        hra: 0,
        allowances: 0,
        bonus: 0,
        deductions: 0,
        taxPercentage: 0,
        effectiveFrom: new Date('2025-01-01'),
      },
    ]);

    const month = 1;
    const year = 2025;

    await request(app)
      .post('/api/payroll/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ month, year })
      .expect(201);

    const managerToken = await login('company-test', 'paymgr@test.com', 'Password123!');
    const employeeToken = await login('company-test', 'payemp@test.com', 'Password123!');

    const managerList = await request(app)
      .get('/api/payroll')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(managerList.statusCode).toBe(200);
    expect(managerList.body.data.items.every((p) => String(p.employeeId) === String(teamCreate.body.data.employee._id))).toBe(true);

    const employeeList = await request(app)
      .get('/api/payroll')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);

    expect(employeeList.body.data.items.length).toBe(1);

    await seedUser({
      companyId: 'company-2',
      email: 'hr2@test.com',
      password: 'Password123!',
      role: 'HR_ADMIN',
    });
    const company2Token = await login('company-2', 'hr2@test.com', 'Password123!');

    const isolated = await request(app)
      .get('/api/payroll')
      .set('Authorization', `Bearer ${company2Token}`)
      .expect(200);

    expect(isolated.body.data.items.length).toBe(0);
  });
});
