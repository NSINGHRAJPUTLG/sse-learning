const Recruitment = require('./model');
const createCrudService = require('../../services/crudFactory');

module.exports = { ...createCrudService(Recruitment, ['status', 'position', 'email']) };
