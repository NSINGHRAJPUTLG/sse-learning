const request = require('supertest');
const app = require('../src/app');
const Notification = require('../src/modules/notifications/notification.model');
const LeaveType = require('../src/modules/leave/leaveType.model');
const { getQueueStats, resetQueueStats, addEmailJob } = require('../src/modules/notifications/notification.queue');
const { renderTemplate } = require('../src/modules/notifications/notification.templates');
const { emitEvent } = require('../src/modules/notifications/notification.events');
const { setupDatabase, teardownDatabase, clearDatabase, seedUser } = require('./helpers');

async function login(companyId, email, password) {
  const res = await request(app).post('/api/auth/login').send({ companyId, email, password });
  return res.body.data.accessToken;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Notifications module', () => {
  beforeAll(setupDatabase);
  afterAll(teardownDatabase);
  beforeEach(async () => {
    await clearDatabase();
    resetQueueStats();
  });

  test('notification is created and email job queued on leave approval', async () => {
    const { rawPassword } = await seedUser({ role: 'HR_ADMIN' });
    const adminToken = await login('company-test', 'admin@example.com', rawPassword);

    const managerRes = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Manager',
        lastName: 'N1',
        joiningDate: '2025-01-01',
        employmentType: 'FULL_TIME',
        user: { email: 'manager.n1@test.com', password: 'Password123!', role: 'MANAGER' },
      })
      .expect(201);

    await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Employee',
        lastName: 'N1',
        joiningDate: '2025-01-01',
        employmentType: 'FULL_TIME',
        reportingManagerId: managerRes.body.data.employee._id,
        user: { email: 'employee.n1@test.com', password: 'Password123!', role: 'EMPLOYEE' },
      })
      .expect(201);

    const leaveType = await LeaveType.create({
      companyId: 'company-test',
      name: 'CASUAL',
      yearlyQuota: 12,
      carryForwardAllowed: false,
      requiresApproval: true,
    });

    const employeeToken = await login('company-test', 'employee.n1@test.com', 'Password123!');
    const managerToken = await login('company-test', 'manager.n1@test.com', 'Password123!');

    const start = new Date();
    start.setDate(start.getDate() + 5);
    const end = new Date();
    end.setDate(end.getDate() + 6);

    const applied = await request(app)
      .post('/api/leaves/apply')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ leaveTypeId: String(leaveType._id), startDate: start.toISOString(), endDate: end.toISOString() })
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

    await wait(150);

    const notifications = await Notification.find({ companyId: 'company-test', type: 'LEAVE_APPROVED' }).lean();
    expect(notifications.length).toBe(1);

    const queueStats = getQueueStats();
    expect(queueStats.totalQueued).toBeGreaterThan(0);
  });

  test('mark as read, read-all, pagination, and company isolation', async () => {
    const user1 = await seedUser({ companyId: 'company-test', email: 'u1@test.com', role: 'EMPLOYEE' });
    const user2 = await seedUser({ companyId: 'company-2', email: 'u2@test.com', role: 'EMPLOYEE' });

    await Notification.insertMany([
      {
        companyId: 'company-test',
        userId: user1.user._id,
        type: 'INFO',
        title: 'N1',
        message: 'M1',
        isRead: false,
      },
      {
        companyId: 'company-test',
        userId: user1.user._id,
        type: 'INFO',
        title: 'N2',
        message: 'M2',
        isRead: false,
      },
      {
        companyId: 'company-2',
        userId: user2.user._id,
        type: 'INFO',
        title: 'N3',
        message: 'M3',
        isRead: false,
      },
    ]);

    const token1 = await login('company-test', 'u1@test.com', user1.rawPassword);
    const token2 = await login('company-2', 'u2@test.com', user2.rawPassword);

    const list = await request(app)
      .get('/api/notifications?page=1&limit=1')
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    expect(list.body.data.items.length).toBe(1);
    expect(list.body.data.pagination.total).toBe(2);

    const targetId = list.body.data.items[0]._id;

    await request(app)
      .put(`/api/notifications/${targetId}/read`)
      .set('Authorization', `Bearer ${token1}`)
      .send({})
      .expect(200);

    const readOne = await Notification.findById(targetId).lean();
    expect(readOne.isRead).toBe(true);

    await request(app)
      .put('/api/notifications/read-all')
      .set('Authorization', `Bearer ${token1}`)
      .send({})
      .expect(200);

    const remainingUnread = await Notification.countDocuments({ companyId: 'company-test', userId: user1.user._id, isRead: false });
    expect(remainingUnread).toBe(0);

    const list2 = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token2}`)
      .expect(200);

    expect(list2.body.data.items.length).toBe(1);
    expect(list2.body.data.items[0].title).toBe('N3');
  });

  test('email queue retries and template rendering are valid', async () => {
    addEmailJob({
      to: 'test@example.com',
      subject: 'Retry test',
      template: 'LEAVE_APPROVED',
      data: { startDate: '2025-01-01', endDate: '2025-01-02' },
      forceFailTimes: 3,
    });

    await wait(1700);
    const stats = getQueueStats();
    expect(stats.totalFailed).toBe(1);

    const rendered = renderTemplate('WELCOME_EMPLOYEE', { name: '<b>Alice</b>' });
    expect(rendered.subject).toContain('&lt;b&gt;Alice&lt;/b&gt;');
    expect(rendered.html).toContain('Welcome');
  });

  test('notification preferences suppress disabled event channels', async () => {
    const user = await seedUser({
      companyId: 'company-test',
      email: 'prefs@test.com',
      role: 'EMPLOYEE',
      notificationPreferences: {
        inAppEnabled: true,
        emailEnabled: true,
        disabledTypes: ['LEAVE_APPROVED'],
      },
    });

    emitEvent('LEAVE_APPROVED', {
      companyId: 'company-test',
      userId: user.user._id,
      metadata: { test: true },
    });

    await wait(150);

    const inApp = await Notification.countDocuments({
      companyId: 'company-test',
      userId: user.user._id,
      type: 'LEAVE_APPROVED',
    });
    expect(inApp).toBe(0);
    expect(getQueueStats().totalQueued).toBe(0);
  });
});
