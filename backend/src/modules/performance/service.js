const Performance = require('./model');
const createCrudService = require('../../services/crudFactory');

module.exports = { ...createCrudService(Performance, ['employeeId', 'reviewerId', 'quarter']) };
