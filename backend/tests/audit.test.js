const request = require('supertest');
const app = require('../src/app');
const AuditLog = require('../src/modules/audit/audit.model');
const LeaveType = require('../src/modules/leave/leaveType.model');
const SalaryStructure = require('../src/modules/payroll/salaryStructure.model');
const { Payroll } = require('../src/modules/payroll/payroll.model');
const { setupDatabase, teardownDatabase, clearDatabase, seedUser, seedEmployee } = require('./helpers');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function login(companyId, email, password, userAgent = 'AuditTestAgent') {
  const res = await request(app)
    .post('/api/auth/login')
    .set('User-Agent', userAgent)
    .send({ companyId, email, password });
  return res.body.data.accessToken;
}

describe('Audit module', () => {
  beforeAll(setupDatabase);
  afterAll(teardownDatabase);
  beforeEach(clearDatabase);

  test('login is audited with IP and user-agent', async () => {
    const { rawPassword } = await seedUser({ role: 'HR_ADMIN' });
    await login('company-test', 'admin@example.com', rawPassword, 'JestUA/1.0');
    await wait(120);

    const entry = await AuditLog.findOne({ companyId: 'company-test', action: 'LOGIN', module: 'AUTH' })
      .sort({ createdAt: -1 })
      .lean();

    expect(entry).toBeTruthy();
    expect(entry.userAgent).toContain('JestUA/1.0');
    expect(entry.ipAddress).toBeTruthy();
  });

  test('employee create/update/delete are audited with before/after', async () => {
    const { rawPassword } = await seedUser({ role: 'HR_ADMIN' });
    const token = await login('company-test', 'admin@example.com', rawPassword);

    const created = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Audit',
        lastName: 'Employee',
        joiningDate: '2025-01-01',
        employmentType: 'FULL_TIME',
        user: { email: 'audit.emp@test.com', password: 'Password123!', role: 'EMPLOYEE' },
      })
      .expect(201);

    const employeeId = created.body.data.employee._id;

    await request(app)
      .put(`/api/employees/${employeeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ designation: 'Senior Engineer' })
      .expect(200);

    await request(app)
      .delete(`/api/employees/${employeeId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await wait(120);

    const createAudit = await AuditLog.findOne({ companyId: 'company-test', action: 'CREATE', module: 'EMPLOYEE', entityId: String(employeeId) }).lean();
    const updateAudit = await AuditLog.findOne({ companyId: 'company-test', action: 'UPDATE', module: 'EMPLOYEE', entityId: String(employeeId) }).lean();
    const deleteAudit = await AuditLog.findOne({ companyId: 'company-test', action: 'DELETE', module: 'EMPLOYEE', entityId: String(employeeId) }).lean();

    expect(createAudit).toBeTruthy();
    expect(createAudit.before).toBeNull();
    expect(createAudit.after).toBeTruthy();
    expect(updateAudit).toBeTruthy();
    expect(updateAudit.before).toBeTruthy();
    expect(updateAudit.after).toBeTruthy();
    expect(deleteAudit).toBeTruthy();
    expect(deleteAudit.after).toBeNull();
  });

  test('leave approval and payroll lock are audited', async () => {
    const { user, rawPassword } = await seedUser({ role: 'HR_ADMIN' });
    const adminEmployee = await seedEmployee({ userId: user._id });
    const token = await login('company-test', 'admin@example.com', rawPassword);

    const managerCreate = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Mgr',
        lastName: 'Audit',
        joiningDate: '2025-01-01',
        employmentType: 'FULL_TIME',
        user: { email: 'mgr.audit@test.com', password: 'Password123!', role: 'MANAGER' },
      })
      .expect(201);

    await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Emp',
        lastName: 'Audit',
        joiningDate: '2025-01-01',
        employmentType: 'FULL_TIME',
        reportingManagerId: managerCreate.body.data.employee._id,
        user: { email: 'emp.audit@test.com', password: 'Password123!', role: 'EMPLOYEE' },
      })
      .expect(201);

    const managerToken = await login('company-test', 'mgr.audit@test.com', 'Password123!');
    const employeeToken = await login('company-test', 'emp.audit@test.com', 'Password123!');

    const leaveType = await LeaveType.create({
      companyId: 'company-test',
      name: 'CASUAL',
      yearlyQuota: 12,
      carryForwardAllowed: false,
      requiresApproval: true,
    });

    const applied = await request(app)
      .post('/api/leaves/apply')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        leaveTypeId: String(leaveType._id),
        startDate: new Date(Date.now() + 6 * 86400000).toISOString(),
        endDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      })
      .expect(201);

    await request(app)
      .put(`/api/leaves/${applied.body.data._id}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({})
      .expect(200);

    await request(app)
      .put(`/api/leaves/${applied.body.data._id}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(200);

    await SalaryStructure.create({
      companyId: 'company-test',
      employeeId: adminEmployee._id,
      basic: 10000,
      hra: 0,
      allowances: 0,
      bonus: 0,
      deductions: 0,
      taxPercentage: 0,
      effectiveFrom: new Date('2025-01-01'),
    });

    const month = 1;
    const year = 2025;
    await request(app)
      .post('/api/payroll/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ month, year })
      .expect(201);

    const payroll = await Payroll.findOne({ companyId: 'company-test', employeeId: adminEmployee._id, month, year }).lean();

    await request(app)
      .put(`/api/payroll/${payroll._id}/lock`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(200);

    await wait(120);

    const leaveApproveLog = await AuditLog.findOne({ companyId: 'company-test', action: 'APPROVE', module: 'LEAVE' }).lean();
    const payrollLockLog = await AuditLog.findOne({ companyId: 'company-test', action: 'LOCK', module: 'PAYROLL', entityId: String(payroll._id) }).lean();

    expect(leaveApproveLog).toBeTruthy();
    expect(payrollLockLog).toBeTruthy();
  });

  test('audit endpoints enforce access control, pagination, and company isolation', async () => {
    const hr = await seedUser({ companyId: 'company-test', email: 'hr@test.com', role: 'HR_ADMIN' });
    const emp = await seedUser({ companyId: 'company-test', email: 'emp@test.com', role: 'EMPLOYEE' });
    const hr2 = await seedUser({ companyId: 'company-2', email: 'hr2@test.com', role: 'HR_ADMIN' });

    await AuditLog.insertMany([
      {
        companyId: 'company-test',
        userId: hr.user._id,
        action: 'CREATE',
        module: 'EMPLOYEE',
        entityType: 'EMPLOYEE',
        entityId: 'e1',
      },
      {
        companyId: 'company-test',
        userId: emp.user._id,
        action: 'LOGIN',
        module: 'AUTH',
        entityType: 'AUTH',
        entityId: String(emp.user._id),
      },
      {
        companyId: 'company-2',
        userId: hr2.user._id,
        action: 'CREATE',
        module: 'EMPLOYEE',
        entityType: 'EMPLOYEE',
        entityId: 'x1',
      },
    ]);

    const hrToken = await login('company-test', 'hr@test.com', hr.rawPassword);
    const empToken = await login('company-test', 'emp@test.com', emp.rawPassword);
    const hr2Token = await login('company-2', 'hr2@test.com', hr2.rawPassword);

    await request(app)
      .get('/api/audit?page=1&limit=1')
      .set('Authorization', `Bearer ${empToken}`)
      .expect(403);

    const hrLogs = await request(app)
      .get('/api/audit?page=1&limit=2')
      .set('Authorization', `Bearer ${hrToken}`)
      .expect(200);

    expect(hrLogs.body.data.items.length).toBeLessThanOrEqual(2);
    expect(hrLogs.body.data.items.every((x) => x.companyId === 'company-test')).toBe(true);

    const myActivity = await request(app)
      .get('/api/audit/my-activity')
      .set('Authorization', `Bearer ${empToken}`)
      .expect(200);

    expect(myActivity.body.data.items.every((x) => String(x.userId) === String(emp.user._id))).toBe(true);

    const otherTenant = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${hr2Token}`)
      .expect(200);

    expect(otherTenant.body.data.items.every((x) => x.companyId === 'company-2')).toBe(true);
  });
});
