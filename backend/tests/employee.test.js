const request = require('supertest');
const app = require('../src/app');
const { setupDatabase, teardownDatabase, clearDatabase, seedUser } = require('./helpers');
const { Employee } = require('../src/modules/employee/employee.model');

async function loginAs(email, password, companyId = 'company-test') {
  const res = await request(app).post('/api/auth/login').send({ companyId, email, password });
  return res.body.data.accessToken;
}

describe('Employee module', () => {
  beforeAll(setupDatabase);
  afterAll(teardownDatabase);
  beforeEach(clearDatabase);

  test('creates employee and auto-increments employeeId', async () => {
    const { rawPassword } = await seedUser({ role: 'SUPER_ADMIN' });
    const token = await loginAs('admin@example.com', rawPassword);

    const first = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Alice',
        lastName: 'Doe',
        joiningDate: '2025-01-02',
        employmentType: 'FULL_TIME',
        user: { email: 'alice@example.com', password: 'Password123!', role: 'EMPLOYEE' },
      })
      .expect(201);

    const second = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Bob',
        lastName: 'Doe',
        joiningDate: '2025-01-03',
        employmentType: 'FULL_TIME',
        user: { email: 'bob@example.com', password: 'Password123!', role: 'EMPLOYEE' },
      })
      .expect(201);

    expect(first.body.data.employee.employeeId).toMatch(/^HRM-\d{4}-\d{4}$/);
    expect(second.body.data.employee.employeeId).not.toEqual(first.body.data.employee.employeeId);
  });

  test('manager sees only direct team and employee sees self', async () => {
    const { rawPassword } = await seedUser({ role: 'SUPER_ADMIN' });
    const adminToken = await loginAs('admin@example.com', rawPassword);

    const managerCreate = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Manager',
        lastName: 'One',
        joiningDate: '2025-01-01',
        employmentType: 'FULL_TIME',
        user: { email: 'manager@example.com', password: 'Password123!', role: 'MANAGER' },
      })
      .expect(201);

    const managerId = managerCreate.body.data.employee._id;

    await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Team',
        lastName: 'Member',
        joiningDate: '2025-01-01',
        employmentType: 'FULL_TIME',
        reportingManagerId: managerId,
        user: { email: 'team@example.com', password: 'Password123!', role: 'EMPLOYEE' },
      })
      .expect(201);

    await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Other',
        lastName: 'Member',
        joiningDate: '2025-01-01',
        employmentType: 'FULL_TIME',
        user: { email: 'other@example.com', password: 'Password123!', role: 'EMPLOYEE' },
      })
      .expect(201);

    const managerToken = await loginAs('manager@example.com', 'Password123!');
    const managerList = await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(managerList.body.data.items.length).toBe(1);
    expect(managerList.body.data.items[0].firstName).toBe('Team');

    const employeeToken = await loginAs('team@example.com', 'Password123!');
    const selfList = await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);

    expect(selfList.body.data.items.length).toBe(1);
    expect(selfList.body.data.items[0].firstName).toBe('Team');
  });

  test('pagination/filtering and soft delete', async () => {
    const { rawPassword } = await seedUser({ role: 'SUPER_ADMIN' });
    const token = await loginAs('admin@example.com', rawPassword);

    for (let i = 0; i < 6; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: `Emp${i}`,
          lastName: 'Load',
          joiningDate: '2025-01-01',
          employmentType: i % 2 === 0 ? 'FULL_TIME' : 'INTERN',
          status: i % 2 === 0 ? 'ACTIVE' : 'ON_LEAVE',
          user: { email: `emp${i}@example.com`, password: 'Password123!', role: 'EMPLOYEE' },
        })
        .expect(201);
    }

    const paged = await request(app)
      .get('/api/employees?page=1&limit=2&employmentType=FULL_TIME')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(paged.body.data.items.length).toBe(2);
    expect(paged.body.data.pagination.total).toBeGreaterThan(0);

    const target = paged.body.data.items[0];
    await request(app)
      .delete(`/api/employees/${target._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const stored = await Employee.findById(target._id).lean();
    expect(stored.status).toBe('TERMINATED');
  });
});
