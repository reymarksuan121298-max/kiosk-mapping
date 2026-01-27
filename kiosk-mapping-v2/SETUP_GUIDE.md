# 🛠️ Kiosk Mapping V2 - Connection Guide

To make the system functional, you need to connect your local code to your Supabase project. Follow these steps:

## 1. Supabase Project Setup
1. Create a new project at [database.new](https://database.new).
2. Go to the **SQL Editor** in the side navigation.
3. Paste the contents of `backend/schema.sql` into the editor and click **Run**.
4. Go to **Project Settings > API**.
5. Copy your `Project URL`, `anon public` key, and `service_role secret` key.

## 2. Backend Configuration
1. Open `backend/.env.example`.
2. Save a copy as `backend/.env`.
3. Fill in your Supabase credentials:
   ```env
   SUPABASE_URL=your_project_url
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_secret
   JWT_SECRET=generate_a_long_random_string_here
   ```

## 3. Running the Application

### Start the Backend
```bash
cd backend
npm install
npm run dev
```
*The server will start on http://localhost:5000*

### Start the Frontend
```bash
# In a new terminal
npm install
npm run dev
```
*The app will start on http://localhost:5173*

## 4. Default Login
- **Email:** `admin@kioskmap.com`
- **Password:** `admin123`

---

## 🚀 Key Improvements in V2
- **Persistent Storage:** No more LocalStorage data loss; everything is in PostgreSQL.
- **Enterprise Security:** JWT-based sessions and bcrypt password hashing.
- **Audit Logs:** Every change (Create, Update, Delete) is tracked with user attribution.
- **Interactive Mapping:** Real-time visualization of employee coordinates with Leaflet.
- **QR Generation:** High-fidelity QR codes generated instantly for every record.
