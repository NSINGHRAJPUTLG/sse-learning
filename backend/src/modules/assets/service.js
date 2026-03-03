const Asset = require('./model');
const createCrudService = require('../../services/crudFactory');

module.exports = { ...createCrudService(Asset, ['employeeId', 'status', 'serialNumber']) };
