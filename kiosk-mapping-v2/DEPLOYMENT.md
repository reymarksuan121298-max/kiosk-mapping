# Deployment Guide - Kiosk Mapping V2

## Overview
This application consists of two parts:
1. **Frontend** (React + Vite) - Deploy to Vercel
2. **Backend** (Express + Supabase) - Deploy separately

## Current Status
✅ Build configuration fixed
✅ vercel.json created for SPA routing
✅ .vercelignore created to exclude backend
✅ Build tested successfully (dist folder generated)

## Deployment Steps

### 1. Frontend Deployment to Vercel

#### Option A: Using Vercel CLI (Current Method)
```bash
# Login to Vercel (one-time setup)
vercel login

# Deploy to production
vercel --prod --yes
```

#### Option B: Using Vercel Dashboard (Recommended for first-time)
1. Go to https://vercel.com/new
2. Import your Git repository
3. Configure project:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Add Environment Variable**:
   - Key: `VITE_API_URL`
   - Value: `https://your-backend-url.com/api` (update after backend deployment)

5. Click "Deploy"

### 2. Backend Deployment

The backend needs to be deployed separately. Here are your options:

#### Option A: Deploy to Vercel (Separate Project)
```bash
cd backend
vercel --prod --yes
```

#### Option B: Deploy to Render.com (Recommended for Node.js backends)
1. Go to https://render.com
2. Create new Web Service
3. Connect your repository
4. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node

5. Add Environment Variables from `backend/.env`:
   ```
   PORT=5000
   NODE_ENV=production
   SUPABASE_URL=https://jlrxjtmbwlgrhujewfhd.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   JWT_SECRET=DBgSxfJsGU7NxouJZefzW3SOm3Yo6uzGGkMD14qTYMOeaG3oHwdqGt+nc2HMGxVlWDfIaaFvkhUORFL3qM0QGg==
   CORS_ORIGIN=https://your-frontend-url.vercel.app
   MAX_FILE_SIZE=5242880
   UPLOAD_DIR=./uploads
   SKIP_TIME_VALIDATION=false
   ```

6. Deploy

#### Option C: Deploy to Railway.app
1. Go to https://railway.app
2. Create new project from GitHub repo
3. Select the `backend` directory
4. Add environment variables
5. Deploy

### 3. Connect Frontend to Backend

After deploying the backend, update the frontend environment variable:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Update `VITE_API_URL` to your backend URL:
   ```
   VITE_API_URL=https://your-backend-url.onrender.com/api
   ```
4. Redeploy the frontend (Vercel will auto-redeploy)

## Troubleshooting

### 404 Errors
- **Frontend routes**: Fixed with `vercel.json` rewrites
- **API endpoints**: Ensure `VITE_API_URL` points to correct backend
- **Missing pages**: Check that all routes in `App.tsx` are properly configured

### CORS Errors
- Update `CORS_ORIGIN` in backend `.env` to match your Vercel frontend URL
- Ensure backend is deployed and accessible

### Build Errors
- Run `npm install` to ensure all dependencies are installed
- Run `npm run build` locally to test before deploying
- Check that TypeScript has no errors

## Post-Deployment Checklist

- [ ] Frontend deployed to Vercel
- [ ] Backend deployed (Render/Railway/Vercel)
- [ ] `VITE_API_URL` environment variable set in Vercel
- [ ] `CORS_ORIGIN` environment variable set in backend
- [ ] Test login functionality
- [ ] Test employee management
- [ ] Test map features
- [ ] Test attendance tracking
- [ ] Verify PWA functionality

## URLs to Save

- **Frontend URL**: https://[your-project].vercel.app
- **Backend URL**: https://[your-backend].[platform].com
- **Supabase Dashboard**: https://supabase.com/dashboard

## Notes

- The backend uses Supabase for database, so no separate database deployment needed
- File uploads are stored locally on the backend server
- For production, consider using cloud storage (AWS S3, Cloudinary) for uploads
- PWA features are enabled and will work once deployed
