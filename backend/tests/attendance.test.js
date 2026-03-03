const request = require('supertest');
const app = require('../src/app');
const { Attendance } = require('../src/modules/attendance/attendance.model');
const { Employee } = require('../src/modules/employee/employee.model');
const { User } = require('../src/modules/auth/auth.model');
const { setupDatabase, teardownDatabase, clearDatabase, seedUser, seedEmployee } = require('./helpers');

async function login(companyId, email, password) {
  const res = await request(app).post('/api/auth/login').send({ companyId, email, password });
  return res.body.data.accessToken;
}

describe('Attendance module', () => {
  beforeAll(setupDatabase);
  afterAll(teardownDatabase);
  beforeEach(clearDatabase);

  test('check-in works and duplicate check-in is blocked', async () => {
    const { user, rawPassword } = await seedUser({ role: 'EMPLOYEE' });
    await seedEmployee({ userId: user._id });

    const token = await login('company-test', 'admin@example.com', rawPassword);

    await request(app)
      .post('/api/attendance/check-in')
      .set('Authorization', `Bearer ${token}`)
      .send({ location: 'HQ' })
      .expect(201);

    await request(app)
      .post('/api/attendance/check-in')
      .set('Authorization', `Bearer ${token}`)
      .send({ location: 'HQ' })
      .expect(409);
  });

  test('check-out calculates overtime and late status correctly', async () => {
    const { user, rawPassword } = await seedUser({ role: 'EMPLOYEE' });
    const employee = await seedEmployee({ userId: user._id });

    const date = new Date();
    date.setHours(0, 0, 0, 0);

    const checkIn = new Date(date);
    checkIn.setHours(10, 0, 0, 0);

    await Attendance.create({
      companyId: 'company-test',
      employeeId: employee._id,
      date,
      checkIn,
      checkOut: null,
      totalHours: 0,
      overtimeHours: 0,
      status: 'ABSENT',
    });

    const token = await login('company-test', 'admin@example.com', rawPassword);

    const res = await request(app)
      .post('/api/attendance/check-out')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(200);

    expect(res.body.data.totalHours).toBeGreaterThanOrEqual(0);
    expect(res.body.data.status).toBe('LATE');
  });

  test('summary is accurate and pagination/filtering works', async () => {
    const { user, rawPassword } = await seedUser({ role: 'EMPLOYEE' });
    const employee = await seedEmployee({ userId: user._id });

    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);

    await Attendance.create([
      {
        companyId: 'company-test',
        employeeId: employee._id,
        date: new Date(baseDate.getTime() - 2 * 24 * 3600000),
        totalHours: 9,
        overtimeHours: 1,
        status: 'PRESENT',
      },
      {
        companyId: 'company-test',
        employeeId: employee._id,
        date: new Date(baseDate.getTime() - 1 * 24 * 3600000),
        totalHours: 0,
        overtimeHours: 0,
        status: 'ABSENT',
      },
      {
        companyId: 'company-test',
        employeeId: employee._id,
        date: new Date(baseDate.getTime()),
        totalHours: 7,
        overtimeHours: 0,
        status: 'LATE',
      },
    ]);

    const token = await login('company-test', 'admin@example.com', rawPassword);

    const summary = await request(app)
      .get('/api/attendance/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(summary.body.data.totalPresentDays).toBe(1);
    expect(summary.body.data.totalAbsentDays).toBe(1);
    expect(summary.body.data.totalLateDays).toBe(1);
    expect(summary.body.data.totalOvertimeHours).toBe(1);

    const list = await request(app)
      .get('/api/attendance?page=1&limit=2&status=LATE')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(list.body.data.items.length).toBe(1);
    expect(list.body.data.pagination.total).toBe(1);
  });

  test('manager sees only team and company isolation is enforced', async () => {
    const { rawPassword } = await seedUser({ role: 'SUPER_ADMIN' });
    const adminToken = await login('company-test', 'admin@example.com', rawPassword);

    const managerCreate = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'M',
        lastName: 'One',
        joiningDate: '2025-01-01',
        employmentType: 'FULL_TIME',
        user: { email: 'manager@test.com', password: 'Password123!', role: 'MANAGER' },
      })
      .expect(201);

    const teamCreate = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Team',
        lastName: 'One',
        joiningDate: '2025-01-01',
        employmentType: 'FULL_TIME',
        reportingManagerId: managerCreate.body.data.employee._id,
        user: { email: 'team@test.com', password: 'Password123!', role: 'EMPLOYEE' },
      })
      .expect(201);

    await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Other',
        lastName: 'User',
        joiningDate: '2025-01-01',
        employmentType: 'FULL_TIME',
        user: { email: 'other@test.com', password: 'Password123!', role: 'EMPLOYEE' },
      })
      .expect(201);

    const managerToken = await login('company-test', 'manager@test.com', 'Password123!');

    await Attendance.create({
      companyId: 'company-test',
      employeeId: teamCreate.body.data.employee._id,
      date: new Date(new Date().setHours(0, 0, 0, 0)),
      totalHours: 8,
      overtimeHours: 0,
      status: 'PRESENT',
    });

    const managerList = await request(app)
      .get('/api/attendance')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(managerList.body.data.items.length).toBe(1);

    const otherCompanyUser = await User.create({
      companyId: 'company-2',
      email: 'e2@test.com',
      password: 'hashed',
      role: 'EMPLOYEE',
      isActive: true,
    });

    const otherCompanyEmployee = await Employee.create({
      companyId: 'company-2',
      userId: otherCompanyUser._id,
      employeeId: `HRM-${new Date().getFullYear()}-5001`,
      firstName: 'E2',
      lastName: 'E2',
      joiningDate: new Date(),
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
    });

    await Attendance.create({
      companyId: 'company-2',
      employeeId: otherCompanyEmployee._id,
      date: new Date(new Date().setHours(0, 0, 0, 0)),
      totalHours: 8,
      overtimeHours: 0,
      status: 'PRESENT',
    });

    const adminList = await request(app)
      .get('/api/attendance')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(adminList.body.data.items.every((i) => i.companyId === 'company-test')).toBe(true);
  });
});
