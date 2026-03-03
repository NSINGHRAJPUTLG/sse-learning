const bcrypt = require('bcrypt');
const User = require('./model');
const createCrudService = require('../../services/crudFactory');

const baseCrud = createCrudService(User, ['role', 'isActive', 'email']);

async function create(payload) {
  const hashedPassword = await bcrypt.hash(payload.password, 12);
  const user = await User.create({ ...payload, password: hashedPassword });
  const data = user.toObject();
  delete data.password;
  return data;
}

module.exports = { ...baseCrud, create };
