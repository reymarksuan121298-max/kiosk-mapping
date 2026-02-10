# Backend Environment Variables Setup

## IMPORTANT: Add these to your Vercel Backend Project

Go to: https://vercel.com/reymarksuan121298-maxs-projects/backend/settings/environment-variables

Add the following environment variables:

### Required Variables:

1. **SUPABASE_URL**
   ```
   https://jlrxjtmbwlgrhujewfhd.supabase.co
   ```

2. **SUPABASE_ANON_KEY**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpscnhqdG1id2xncmh1amV3ZmhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMjUxOTQsImV4cCI6MjA4NDkwMTE5NH0.7qvca3cCnZEf4ORIl-mbsqwuoEtVmERWbNJnNiuixUw
   ```

3. **SUPABASE_SERVICE_ROLE_KEY**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpscnhqdG1id2xncmh1amV3ZmhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTMyNTE5NCwiZXhwIjoyMDg0OTAxMTk0fQ.DjLkXolhDVt6sCLY1OYMPcAGcOqBM2nvEaAa1mcedek
   ```

4. **JWT_SECRET**
   ```
   DBgSxfJsGU7NxouJZefzW3SOm3Yo6uzGGkMD14qTYMOeaG3oHwdqGt+nc2HMGxVlWDfIaaFvkhUORFL3qM0QGg==
   ```

5. **CORS_ORIGIN**
   ```
   https://kiosk-mapping-v2.vercel.app
   ```

6. **NODE_ENV**
   ```
   production
   ```

7. **PORT**
   ```
   5000
   ```

8. **MAX_FILE_SIZE**
   ```
   5242880
   ```

9. **UPLOAD_DIR**
   ```
   /tmp/uploads
   ```

10. **SKIP_TIME_VALIDATION**
    ```
    false
    ```

## Quick Setup via CLI (Alternative)

You can also set these via CLI:

```bash
cd backend

# Set each variable
vercel env add SUPABASE_URL production
vercel env add SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add JWT_SECRET production
vercel env add CORS_ORIGIN production
vercel env add NODE_ENV production
vercel env add PORT production
vercel env add MAX_FILE_SIZE production
vercel env add UPLOAD_DIR production
vercel env add SKIP_TIME_VALIDATION production
```

After adding all variables, redeploy:
```bash
vercel --prod
```

---

# Frontend Environment Variable Setup

Go to: https://vercel.com/reymarksuan121298-maxs-projects/kiosk-mapping-v2/settings/environment-variables

Add:

**VITE_API_URL**
```
https://backend-rho-ashen-76.vercel.app/api
```

After adding, redeploy the frontend:
```bash
cd ..
vercel --prod
```
