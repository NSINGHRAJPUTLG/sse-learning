# HRM API Documentation

Base URL: `/api`

All responses follow:

```json
{
  "success": true,
  "data": {},
  "message": ""
}
```

## Auth
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

## Users
- `GET /users`
- `GET /users/:id`
- `POST /users`
- `PUT /users/:id`
- `DELETE /users/:id`

## Employees
- `GET /employees`
- `GET /employees/:id`
- `POST /employees`
- `PUT /employees/:id`
- `DELETE /employees/:id`

## Departments
- `GET /departments`
- `GET /departments/:id`
- `POST /departments`
- `PUT /departments/:id`
- `DELETE /departments/:id`

## Attendance
- `GET /attendance`
- `POST /attendance/check-in`
- `PUT /attendance/:id/check-out`

## Leave
- `GET /leaves`
- `GET /leaves/balance/:employeeId`
- `POST /leaves`
- `PUT /leaves/:id/review`

## Payroll
- `GET /payroll`
- `POST /payroll/salary-structures`
- `POST /payroll/generate`

## Performance
- `GET /performance`
- `GET /performance/:id`
- `POST /performance`
- `PUT /performance/:id`
- `DELETE /performance/:id`

## Recruitment
- `GET /recruitment`
- `GET /recruitment/:id`
- `POST /recruitment`
- `PUT /recruitment/:id`
- `DELETE /recruitment/:id`

## Assets
- `GET /assets`
- `GET /assets/:id`
- `POST /assets`
- `PUT /assets/:id`
- `DELETE /assets/:id`

## Notifications
- `GET /notifications`
- `GET /notifications/me`
- `GET /notifications/stream` (SSE)
- `GET /notifications/:id`
- `POST /notifications`
- `PUT /notifications/:id`
- `DELETE /notifications/:id`

## Dashboard
- `GET /dashboard/summary`
