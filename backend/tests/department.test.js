const request = require('supertest');
const app = require('../src/app');
const Department = require('../src/modules/department/department.model');
const { User } = require('../src/modules/auth/auth.model');
const { Employee } = require('../src/modules/employee/employee.model');
const { setupDatabase, teardownDatabase, clearDatabase, seedUser, seedEmployee } = require('./helpers');

async function login(companyId, email, password) {
  const res = await request(app).post('/api/auth/login').send({ companyId, email, password });
  return res.body.data.accessToken;
}

describe('Department module', () => {
  beforeAll(setupDatabase);
  afterAll(teardownDatabase);
  beforeEach(clearDatabase);

  test('create department and nested department', async () => {
    const { rawPassword } = await seedUser({ role: 'HR_ADMIN' });
    const token = await login('company-test', 'admin@example.com', rawPassword);

    const root = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Engineering', description: 'Core engineering' })
      .expect(201);

    const child = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Backend', parentDepartmentId: root.body.data._id })
      .expect(201);

    expect(child.body.data.parentDepartmentId).toBe(root.body.data._id);
  });

  test('circular hierarchy is blocked', async () => {
    const { rawPassword } = await seedUser({ role: 'HR_ADMIN' });
    const token = await login('company-test', 'admin@example.com', rawPassword);

    const a = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Dept A' })
      .expect(201);

    const b = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Dept B', parentDepartmentId: a.body.data._id })
      .expect(201);

    await request(app)
      .put(`/api/departments/${a.body.data._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ parentDepartmentId: b.body.data._id })
      .expect(400);
  });

  test('deactivation blocked when employees exist in department', async () => {
    const { rawPassword } = await seedUser({ role: 'SUPER_ADMIN' });
    const token = await login('company-test', 'admin@example.com', rawPassword);

    const department = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'People Ops' })
      .expect(201);

    const { user: empUser } = await seedUser({ email: 'emp1@example.com', role: 'EMPLOYEE' });
    await seedEmployee({ userId: empUser._id });
    await Employee.updateOne({ userId: empUser._id }, { departmentId: department.body.data._id });

    await request(app)
      .delete(`/api/departments/${department.body.data._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);
  });

  test('manager assignment must be same company', async () => {
    const { rawPassword } = await seedUser({ role: 'HR_ADMIN' });
    const token = await login('company-test', 'admin@example.com', rawPassword);

    const { user: otherCompanyUser } = await seedUser({
      companyId: 'company-2',
      email: 'other-company-manager@example.com',
      role: 'MANAGER',
    });

    const foreignManagerEmployee = await Employee.create({
      companyId: 'company-2',
      userId: otherCompanyUser._id,
      employeeId: `HRM-${new Date().getFullYear()}-9999`,
      firstName: 'Foreign',
      lastName: 'Manager',
      joiningDate: new Date(),
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
    });

    await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Security', managerId: String(foreignManagerEmployee._id) })
      .expect(400);
  });

  test('stats endpoint and pagination/filtering are accurate', async () => {
    const { rawPassword } = await seedUser({ role: 'SUPER_ADMIN' });
    const token = await login('company-test', 'admin@example.com', rawPassword);

    const department = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Platform' })
      .expect(201);

    const managerUser = await User.create({
      companyId: 'company-test',
      email: 'mgr@example.com',
      password: 'hashed',
      role: 'MANAGER',
      isActive: true,
    });

    const employeeUser = await User.create({
      companyId: 'company-test',
      email: 'emp@example.com',
      password: 'hashed',
      role: 'EMPLOYEE',
      isActive: true,
    });

    await Employee.create([
      {
        companyId: 'company-test',
        userId: managerUser._id,
        employeeId: `HRM-${new Date().getFullYear()}-1001`,
        firstName: 'Manager',
        lastName: 'One',
        joiningDate: new Date(),
        employmentType: 'FULL_TIME',
        status: 'ACTIVE',
        departmentId: department.body.data._id,
      },
      {
        companyId: 'company-test',
        userId: employeeUser._id,
        employeeId: `HRM-${new Date().getFullYear()}-1002`,
        firstName: 'Employee',
        lastName: 'One',
        joiningDate: new Date(),
        employmentType: 'FULL_TIME',
        status: 'ON_LEAVE',
        departmentId: department.body.data._id,
      },
    ]);

    const stats = await request(app)
      .get(`/api/departments/${department.body.data._id}/stats`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(stats.body.data.totalEmployees).toBe(2);
    expect(stats.body.data.activeEmployees).toBe(1);
    expect(stats.body.data.managersCount).toBe(1);

    await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Platform Infra', parentDepartmentId: department.body.data._id })
      .expect(201);

    const list = await request(app)
      .get('/api/departments?page=1&limit=1&search=Plat&isActive=true')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(list.body.data.items.length).toBe(1);
    expect(list.body.data.pagination.total).toBeGreaterThanOrEqual(2);
  });
});
