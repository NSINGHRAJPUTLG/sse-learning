const request = require('supertest');
const app = require('../src/app');
const LeaveType = require('../src/modules/leave/leaveType.model');
const LeaveBalance = require('../src/modules/leave/leaveBalance.model');
const { Leave } = require('../src/modules/leave/leave.model');
const { setupDatabase, teardownDatabase, clearDatabase, seedUser } = require('./helpers');

async function login(companyId, email, password) {
  const res = await request(app).post('/api/auth/login').send({ companyId, email, password });
  return res.body.data.accessToken;
}

async function createEmployee(adminToken, payload) {
  const res = await request(app)
    .post('/api/employees')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(payload)
    .expect(201);
  return res.body.data.employee;
}

describe('Leave module', () => {
  beforeAll(setupDatabase);
  afterAll(teardownDatabase);
  beforeEach(clearDatabase);

  test('leave type creation works and balances auto-create for new employee', async () => {
    const { rawPassword } = await seedUser({ role: 'HR_ADMIN' });
    const adminToken = await login('company-test', 'admin@example.com', rawPassword);

    const typeRes = await request(app)
      .post('/api/leaves/types')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'CASUAL', yearlyQuota: 12, carryForwardAllowed: false, requiresApproval: true })
      .expect(201);

    const employee = await createEmployee(adminToken, {
      firstName: 'Emp',
      lastName: 'One',
      joiningDate: '2025-01-01',
      employmentType: 'FULL_TIME',
      user: { email: 'emp1@test.com', password: 'Password123!', role: 'EMPLOYEE' },
    });

    const year = new Date().getFullYear();
    const balance = await LeaveBalance.findOne({
      companyId: 'company-test',
      employeeId: employee._id,
      leaveTypeId: typeRes.body.data._id,
      year,
    }).lean();

    expect(balance).toBeTruthy();
    expect(balance.totalAllocated).toBe(12);
    expect(balance.remaining).toBe(12);
  });

  test('apply leave works and overlapping leave is blocked', async () => {
    const { rawPassword } = await seedUser({ role: 'HR_ADMIN' });
    const adminToken = await login('company-test', 'admin@example.com', rawPassword);

    const type = await request(app)
      .post('/api/leaves/types')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'SICK', yearlyQuota: 10 })
      .expect(201);

    await createEmployee(adminToken, {
      firstName: 'Emp',
      lastName: 'Two',
      joiningDate: '2025-01-01',
      employmentType: 'FULL_TIME',
      user: { email: 'emp2@test.com', password: 'Password123!', role: 'EMPLOYEE' },
    });

    const empToken = await login('company-test', 'emp2@test.com', 'Password123!');

    const start = new Date();
    start.setDate(start.getDate() + 5);
    const end = new Date();
    end.setDate(end.getDate() + 7);

    await request(app)
      .post('/api/leaves/apply')
      .set('Authorization', `Bearer ${empToken}`)
      .send({
        leaveTypeId: type.body.data._id,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        reason: 'Medical',
      })
      .expect(201);

    await request(app)
      .post('/api/leaves/apply')
      .set('Authorization', `Bearer ${empToken}`)
      .send({
        leaveTypeId: type.body.data._id,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      })
      .expect(409);
  });

  test('approval deducts balance, rejection does not deduct, cancellation restores', async () => {
    const { rawPassword } = await seedUser({ role: 'HR_ADMIN' });
    const adminToken = await login('company-test', 'admin@example.com', rawPassword);

    const type = await request(app)
      .post('/api/leaves/types')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'EARNED', yearlyQuota: 20 })
      .expect(201);

    const manager = await createEmployee(adminToken, {
      firstName: 'Mgr',
      lastName: 'One',
      joiningDate: '2025-01-01',
      employmentType: 'FULL_TIME',
      user: { email: 'mgr1@test.com', password: 'Password123!', role: 'MANAGER' },
    });

    await createEmployee(adminToken, {
      firstName: 'Emp',
      lastName: 'Three',
      joiningDate: '2025-01-01',
      employmentType: 'FULL_TIME',
      reportingManagerId: manager._id,
      user: { email: 'emp3@test.com', password: 'Password123!', role: 'EMPLOYEE' },
    });

    const empToken = await login('company-test', 'emp3@test.com', 'Password123!');
    const managerToken = await login('company-test', 'mgr1@test.com', 'Password123!');

    const start = new Date();
    start.setDate(start.getDate() + 10);
    const end = new Date();
    end.setDate(end.getDate() + 12);

    const applied = await request(app)
      .post('/api/leaves/apply')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ leaveTypeId: type.body.data._id, startDate: start.toISOString(), endDate: end.toISOString() })
      .expect(201);

    await request(app)
      .put(`/api/leaves/${applied.body.data._id}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({})
      .expect(200);

    await request(app)
      .put(`/api/leaves/${applied.body.data._id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(200);

    const year = new Date(start).getFullYear();
    const balanceAfterApproval = await LeaveBalance.findOne({
      companyId: 'company-test',
      leaveTypeId: type.body.data._id,
      year,
    })
      .sort({ used: -1 })
      .lean();

    expect(balanceAfterApproval.used).toBeGreaterThan(0);

    await request(app)
      .put(`/api/leaves/${applied.body.data._id}/cancel`)
      .set('Authorization', `Bearer ${empToken}`)
      .send({})
      .expect(200);

    const balanceAfterCancel = await LeaveBalance.findById(balanceAfterApproval._id).lean();
    expect(balanceAfterCancel.used).toBe(0);

    const applyReject = await request(app)
      .post('/api/leaves/apply')
      .set('Authorization', `Bearer ${empToken}`)
      .send({
        leaveTypeId: type.body.data._id,
        startDate: new Date(Date.now() + 20 * 86400000).toISOString(),
        endDate: new Date(Date.now() + 21 * 86400000).toISOString(),
      })
      .expect(201);

    await request(app)
      .put(`/api/leaves/${applyReject.body.data._id}/reject`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({})
      .expect(200);

    const balanceAfterReject = await LeaveBalance.findById(balanceAfterApproval._id).lean();
    expect(balanceAfterReject.used).toBe(0);
  });

  test('calendar endpoint, manager restriction, and company isolation', async () => {
    const { rawPassword } = await seedUser({ role: 'HR_ADMIN' });
    const adminToken = await login('company-test', 'admin@example.com', rawPassword);

    const type = await request(app)
      .post('/api/leaves/types')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'CASUAL', yearlyQuota: 10 })
      .expect(201);

    const manager = await createEmployee(adminToken, {
      firstName: 'Mgr',
      lastName: 'Two',
      joiningDate: '2025-01-01',
      employmentType: 'FULL_TIME',
      user: { email: 'mgr2@test.com', password: 'Password123!', role: 'MANAGER' },
    });

    await createEmployee(adminToken, {
      firstName: 'Team',
      lastName: 'One',
      joiningDate: '2025-01-01',
      employmentType: 'FULL_TIME',
      reportingManagerId: manager._id,
      user: { email: 'team1@test.com', password: 'Password123!', role: 'EMPLOYEE' },
    });

    await createEmployee(adminToken, {
      firstName: 'Other',
      lastName: 'One',
      joiningDate: '2025-01-01',
      employmentType: 'FULL_TIME',
      user: { email: 'other1@test.com', password: 'Password123!', role: 'EMPLOYEE' },
    });

    const teamToken = await login('company-test', 'team1@test.com', 'Password123!');
    const managerToken = await login('company-test', 'mgr2@test.com', 'Password123!');

    const start = new Date();
    start.setDate(start.getDate() + 6);
    const end = new Date();
    end.setDate(end.getDate() + 7);

    const teamLeave = await request(app)
      .post('/api/leaves/apply')
      .set('Authorization', `Bearer ${teamToken}`)
      .send({ leaveTypeId: type.body.data._id, startDate: start.toISOString(), endDate: end.toISOString() })
      .expect(201);

    await request(app)
      .put(`/api/leaves/${teamLeave.body.data._id}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({})
      .expect(200);

    await request(app)
      .put(`/api/leaves/${teamLeave.body.data._id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(200);

    const managerList = await request(app)
      .get('/api/leaves')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(managerList.body.data.items.length).toBe(1);

    const month = start.getMonth() + 1;
    const year = start.getFullYear();

    const calendar = await request(app)
      .get(`/api/leaves/calendar?month=${month}&year=${year}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(calendar.body.data.length).toBeGreaterThan(0);
    expect(calendar.body.data.every((l) => l.status === 'APPROVED')).toBe(true);

    await seedUser({
      companyId: 'company-2',
      email: 'c2admin@test.com',
      password: 'Password123!',
      role: 'HR_ADMIN',
    });

    const company2Token = await login('company-2', 'c2admin@test.com', 'Password123!');

    const company2List = await request(app)
      .get('/api/leaves')
      .set('Authorization', `Bearer ${company2Token}`)
      .expect(200);

    expect(company2List.body.data.items.length).toBe(0);

    const stored = await Leave.find({ companyId: 'company-test' }).lean();
    expect(stored.length).toBeGreaterThan(0);
  });
});
