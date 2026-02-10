@echo off
echo Setting up Backend Environment Variables on Vercel...
echo.

cd backend

echo Adding SUPABASE_URL...
echo https://jlrxjtmbwlgrhujewfhd.supabase.co | vercel env add SUPABASE_URL production --yes

echo Adding SUPABASE_ANON_KEY...
echo eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpscnhqdG1id2xncmh1amV3ZmhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMjUxOTQsImV4cCI6MjA4NDkwMTE5NH0.7qvca3cCnZEf4ORIl-mbsqwuoEtVmERWbNJnNiuixUw | vercel env add SUPABASE_ANON_KEY production --yes

echo Adding SUPABASE_SERVICE_ROLE_KEY...
echo eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpscnhqdG1id2xncmh1amV3ZmhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTMyNTE5NCwiZXhwIjoyMDg0OTAxMTk0fQ.DjLkXolhDVt6sCLY1OYMPcAGcOqBM2nvEaAa1mcedek | vercel env add SUPABASE_SERVICE_ROLE_KEY production --yes

echo Adding JWT_SECRET...
echo DBgSxfJsGU7NxouJZefzW3SOm3Yo6uzGGkMD14qTYMOeaG3oHwdqGt+nc2HMGxVlWDfIaaFvkhUORFL3qM0QGg== | vercel env add JWT_SECRET production --yes

echo.
echo Done! Now redeploying backend...
vercel --prod --yes

cd ..
echo.
echo Redeploying frontend...
vercel --prod --yes

echo.
echo All done! Your app should be fully connected now.
pause
