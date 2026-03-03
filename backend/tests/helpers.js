const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../src/modules/user/model');
const Employee = require('../src/modules/employee/model');

let mongoServer;

async function setupDatabase() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}

async function teardownDatabase() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) await mongoServer.stop();
}

async function clearDatabase() {
  const collections = mongoose.connection.collections;
  const keys = Object.keys(collections);
  await Promise.all(keys.map((k) => collections[k].deleteMany({})));
}

async function seedUser({
  companyId = 'company-test',
  email = 'admin@example.com',
  password = 'Password123!',
  role = 'HR_ADMIN',
  notificationPreferences,
} = {}) {
  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({
    companyId,
    email,
    password: hashed,
    role,
    isActive: true,
    notificationPreferences,
  });
  return { user, rawPassword: password };
}

async function seedEmployee({ companyId = 'company-test', userId } = {}) {
  return Employee.create({
    companyId,
    userId,
    employeeId: `EMP-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    firstName: 'Test',
    lastName: 'Employee',
    joiningDate: new Date(),
    employmentType: 'FULL_TIME',
    status: 'ACTIVE',
  });
}

module.exports = { setupDatabase, teardownDatabase, clearDatabase, seedUser, seedEmployee };
