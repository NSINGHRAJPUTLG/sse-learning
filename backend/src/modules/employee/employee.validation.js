const { z } = require('zod');
const { EMPLOYMENT_TYPES, EMPLOYEE_STATUSES } = require('./employee.model');

const phoneRegex = /^\+?[0-9]{8,15}$/;

const createEmployeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().regex(phoneRegex).optional(),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  departmentId: z.string().optional(),
  designation: z.string().optional(),
  reportingManagerId: z.string().optional(),
  joiningDate: z.coerce.date(),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  status: z.enum(EMPLOYEE_STATUSES).optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(), 
  salaryStructureId: z.string().optional(),
  user: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(['EMPLOYEE', 'MANAGER']).default('EMPLOYEE'),
    isActive: z.boolean().optional(),
  }),
});

const updateEmployeeSchema = createEmployeeSchema
  .omit({ user: true })
  .partial()
  .extend({
    userRole: z.enum(['EMPLOYEE', 'MANAGER']).optional(),
  });

module.exports = { createEmployeeSchema, updateEmployeeSchema };
