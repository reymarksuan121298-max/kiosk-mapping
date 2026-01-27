# Kiosk Mapping V2 - Backend API

Express.js backend with Supabase PostgreSQL for the Kiosk Mapping system.

## 🚀 Quick Start

```bash
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

## 📋 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication

All endpoints except `/auth/login` and `/auth/register` require JWT token in header:
```
Authorization: Bearer <token>
```

#### POST /auth/register
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "John Doe"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "admin"
  }
}
```

#### POST /auth/login
Login with credentials.

**Request:**
```json
{
  "email": "admin@kioskmap.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "email": "admin@kioskmap.com",
    "fullName": "System Administrator",
    "role": "admin"
  }
}
```

#### GET /auth/verify
Verify JWT token validity.

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@kioskmap.com",
    "fullName": "System Administrator",
    "role": "admin"
  }
}
```

### Employees

#### GET /employees
Get all employees with optional filters.

**Query Parameters:**
- `status` (optional): Filter by status (Active/Deactive)
- `search` (optional): Search by name or employee ID
- `sortBy` (optional): Sort field (default: created_at)
- `sortOrder` (optional): asc or desc (default: desc)

**Response:**
```json
{
  "employees": [
    {
      "id": "uuid",
      "employee_id": "ID-000001",
      "full_name": "John Doe",
      "spvr": "SPVR-001",
      "role": "Agent",
      "address": "123 Main St",
      "latitude": 14.5995,
      "longitude": 120.9842,
      "status": "Active",
      "photo_url": null,
      "qr_code": null,
      "created_at": "2026-01-23T10:00:00Z",
      "updated_at": "2026-01-23T10:00:00Z"
    }
  ]
}
```

#### GET /employees/:id
Get single employee by ID.

**Response:**
```json
{
  "employee": {
    "id": "uuid",
    "employee_id": "ID-000001",
    "full_name": "John Doe",
    ...
  }
}
```

#### POST /employees
Create new employee.

**Request:**
```json
{
  "employeeId": "ID-000001",
  "fullName": "John Doe",
  "spvr": "SPVR-001",
  "role": "Agent",
  "address": "123 Main St",
  "latitude": 14.5995,
  "longitude": 120.9842,
  "status": "Active"
}
```

**Response:**
```json
{
  "message": "Employee created successfully",
  "employee": { ... }
}
```

#### PUT /employees/:id
Update employee.

**Request:** Same as POST

**Response:**
```json
{
  "message": "Employee updated successfully",
  "employee": { ... }
}
```

#### DELETE /employees/:id
Delete employee.

**Response:**
```json
{
  "message": "Employee deleted successfully"
}
```

#### GET /employees/stats/summary
Get employee statistics.

**Response:**
```json
{
  "total": 100,
  "active": 85,
  "inactive": 15,
  "withGPS": 70
}
```

### Audit Logs

#### GET /audit
Get audit logs with pagination.

**Query Parameters:**
- `limit` (optional): Number of logs to return (default: 50)
- `offset` (optional): Offset for pagination (default: 0)
- `action` (optional): Filter by action (CREATE/UPDATE/DELETE)
- `userId` (optional): Filter by user ID

**Response:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "action": "CREATE",
      "table_name": "employees",
      "record_id": "uuid",
      "changes": { ... },
      "created_at": "2026-01-23T10:00:00Z",
      "users": {
        "id": "uuid",
        "email": "admin@kioskmap.com",
        "full_name": "System Administrator"
      }
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

#### GET /audit/:id
Get single audit log by ID.

**Response:**
```json
{
  "log": {
    "id": "uuid",
    "user_id": "uuid",
    "action": "UPDATE",
    "table_name": "employees",
    "record_id": "uuid",
    "changes": {
      "before": { ... },
      "after": { ... }
    },
    "created_at": "2026-01-23T10:00:00Z",
    "users": { ... }
  }
}
```

## 🔒 Security

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens expire in 7 days
- CORS enabled for specified origin only
- Input validation on all endpoints
- SQL injection protection via Supabase client
- Row Level Security (RLS) on database

## 🛠️ Development

```bash
npm run dev    # Start with nodemon (auto-reload)
npm start      # Start production server
```

## 📦 Dependencies

- **express**: Web framework
- **cors**: CORS middleware
- **dotenv**: Environment variables
- **@supabase/supabase-js**: Database client
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT authentication
- **multer**: File uploads (future use)

## 🗄️ Database

Using Supabase PostgreSQL with the following tables:
- `users`: User accounts
- `employees`: Employee records
- `audit_logs`: Activity tracking

See `schema.sql` for complete schema.

## 🚨 Error Handling

All errors return JSON:
```json
{
  "error": "Error message here"
}
```

HTTP Status Codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `409`: Conflict (duplicate)
- `500`: Server Error

## 📝 Environment Variables

Required in `.env`:
```env
PORT=5000
NODE_ENV=development
SUPABASE_URL=your_url
SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_key
JWT_SECRET=your_secret
CORS_ORIGIN=http://localhost:5173
```

## 🧪 Testing

```bash
# Health check
curl http://localhost:5000/api/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kioskmap.com","password":"admin123"}'
```

## 📄 License

MIT
