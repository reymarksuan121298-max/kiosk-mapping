# Kiosk Mapping V2 - Complete Setup Guide

A modern, full-stack employee management system with GPS mapping, QR code generation, and comprehensive audit logging.

## 🏗️ Architecture

- **Frontend**: Vite + React + TypeScript + shadcn/ui + TailwindCSS
- **Backend**: Express.js + Node.js
- **Database**: Supabase PostgreSQL
- **Authentication**: JWT
- **Mapping**: Leaflet.js
- **QR Codes**: qrcode.react

---

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- Git

---

## 🚀 Quick Start

### 1. Clone and Setup

```bash
cd kiosk-mapping-v2
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:
```env
PORT=5000
NODE_ENV=development

# Get these from your Supabase project settings
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Generate a random secret (e.g., use: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your-super-secret-jwt-key-min-32-characters

CORS_ORIGIN=http://localhost:5173
```

### 3. Database Setup

1. Go to your Supabase project
2. Navigate to SQL Editor
3. Copy and paste the contents of `backend/schema.sql`
4. Run the SQL script
5. **Important**: Update the default admin password hash:

```bash
# Generate password hash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('admin123', 10))"
```

Copy the hash and update the INSERT statement in `schema.sql` with your generated hash.

### 4. Start Backend

```bash
npm run dev
```

Backend should be running on http://localhost:5000

### 5. Frontend Setup

Open a new terminal:

```bash
cd ..  # Back to root
npm install
```

The `.env` file should already exist with:
```env
VITE_API_URL=http://localhost:5000/api
```

### 6. Start Frontend

```bash
npm run dev
```

Frontend should be running on http://localhost:5173

---

## 🔐 Default Login Credentials

After running the database schema:

- **Email**: `admin@kioskmap.com`
- **Password**: `admin123`

**⚠️ Change these in production!**

---

## 📁 Project Structure

```
kiosk-mapping-v2/
├── backend/
│   ├── config/
│   │   └── supabase.js          # Supabase client
│   ├── middleware/
│   │   └── auth.js              # JWT authentication
│   ├── routes/
│   │   ├── auth.js              # Login/register
│   │   ├── employees.js         # CRUD operations
│   │   └── audit.js             # Audit logs
│   ├── .env.example
│   ├── schema.sql               # Database schema
│   ├── server.js                # Express server
│   └── package.json
├── src/
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components
│   │   └── EmployeeDialog.tsx   # Add/Edit employee
│   ├── layouts/
│   │   └── DashboardLayout.tsx  # Main layout
│   ├── lib/
│   │   ├── api.ts               # API client
│   │   └── utils.ts             # Utilities
│   ├── pages/
│   │   ├── Login.tsx            # Login page
│   │   ├── Dashboard.tsx        # Dashboard overview
│   │   ├── Employees.tsx        # Employee management
│   │   ├── Map.tsx              # GPS map view
│   │   └── Audit.tsx            # Audit logs
│   ├── App.tsx                  # Main app + routing
│   ├── main.tsx                 # Entry point
│   └── index.css                # Global styles
├── .env
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 🎯 Features

### ✅ Authentication
- JWT-based authentication
- Secure password hashing with bcrypt
- Protected routes
- Token expiration handling

### ✅ Employee Management
- **Create**: Add new employees with auto-generated IDs
- **Read**: View all employees in a table
- **Update**: Edit employee details
- **Delete**: Remove employees with confirmation
- **Search**: Filter by name or ID
- **Status Filter**: Active/Inactive employees
- **CSV Export**: Download employee data

### ✅ QR Code System
- Auto-generate QR codes for each employee
- View QR codes in modal
- Download QR codes as PNG
- High-quality QR codes (Level H error correction)

### ✅ GPS Mapping
- Interactive Leaflet map
- Show employee locations
- Custom markers with popups
- Employee details on click
- Filters for active employees only

### ✅ Audit Logging
- Track all CRUD operations
- User attribution
- Timestamp tracking
- View change history
- JSON diff for updates

### ✅ Modern UI/UX
- Dark theme with gradient accents
- Glassmorphism effects
- Smooth animations
- Responsive design
- Accessible components (shadcn/ui)

---

## 🔧 API Endpoints

### Authentication
```
POST   /api/auth/register    - Register new user
POST   /api/auth/login       - Login
GET    /api/auth/verify      - Verify token
```

### Employees
```
GET    /api/employees              - Get all employees
GET    /api/employees/:id          - Get single employee
POST   /api/employees              - Create employee
PUT    /api/employees/:id          - Update employee
DELETE /api/employees/:id          - Delete employee
GET    /api/employees/stats/summary - Get statistics
```

### Audit Logs
```
GET    /api/audit        - Get audit logs
GET    /api/audit/:id    - Get single audit log
```

---

## 🛠️ Development

### Frontend Development
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Backend Development
```bash
npm run dev          # Start with nodemon
npm start            # Start production server
```

---

## 🚢 Deployment

### Frontend (Vercel)
1. Push code to GitHub
2. Import project in Vercel
3. Set environment variable: `VITE_API_URL=https://your-backend-url/api`
4. Deploy

### Backend (Railway/Render/Heroku)
1. Push code to GitHub
2. Create new service
3. Set all environment variables from `.env`
4. Deploy

### Database (Supabase)
- Already hosted on Supabase
- No additional deployment needed
- Just ensure RLS policies are configured

---

## 🔒 Security Considerations

### For Production:
1. **Change default credentials**
2. **Use strong JWT_SECRET** (min 32 characters)
3. **Enable HTTPS** on both frontend and backend
4. **Configure CORS** properly
5. **Set up rate limiting**
6. **Enable Supabase RLS** (Row Level Security)
7. **Add input validation** on backend
8. **Implement file upload limits**
9. **Add CSRF protection**
10. **Regular security audits**

---

## 📊 Database Schema

### Tables:
- **users**: Authentication and user management
- **employees**: Employee records
- **audit_logs**: Activity tracking

See `backend/schema.sql` for complete schema.

---

## 🐛 Troubleshooting

### Backend won't start
- Check if `.env` file exists with all required variables
- Verify Supabase credentials
- Ensure port 5000 is not in use

### Frontend can't connect to backend
- Check `VITE_API_URL` in `.env`
- Verify backend is running
- Check browser console for CORS errors

### Database errors
- Verify Supabase credentials
- Check if schema.sql was run successfully
- Ensure RLS policies are configured

### Map not loading
- Check internet connection (tiles load from OpenStreetMap)
- Verify employees have valid lat/lng coordinates

---

## 📝 Environment Variables Reference

### Backend (.env)
```env
PORT=5000
NODE_ENV=development
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
JWT_SECRET=xxx
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 🎨 Customization

### Theme Colors
Edit `tailwind.config.js` and `src/index.css` to customize colors.

### Add New Fields
1. Update database schema
2. Update TypeScript types in `src/lib/api.ts`
3. Update forms in `EmployeeDialog.tsx`
4. Update table in `Employees.tsx`

---

## 📄 License

MIT License - feel free to use for personal or commercial projects.

---

## 👨‍💻 Support

For issues or questions:
1. Check the troubleshooting section
2. Review the code comments
3. Check browser/server console for errors

---

## 🎉 What's New in V2

Compared to the original vanilla JS version:

✅ **Backend API** - Proper REST API with Express.js
✅ **Database** - PostgreSQL instead of LocalStorage  
✅ **Authentication** - JWT-based auth system
✅ **TypeScript** - Type safety throughout
✅ **Modern UI** - shadcn/ui components
✅ **Audit Logs** - Complete activity tracking
✅ **Better Security** - Password hashing, protected routes
✅ **Scalable** - Can handle thousands of employees
✅ **Production Ready** - Deployable to any platform

---

**Built with ❤️ using modern web technologies**
