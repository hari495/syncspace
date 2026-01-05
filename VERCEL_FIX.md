# 🔧 Fix Your Vercel Deployment

## The Problem
Your Vercel deployment is broken because:
1. ❌ Vercel doesn't know it's a React SPA (Single Page App)
2. ❌ Routes like `/login` return 404
3. ❌ Build directory is misconfigured

## The Fix

I've created `vercel.json` with the correct configuration. Now you need to:

### Option 1: Redeploy (Easiest)

1. **Commit and push the vercel.json:**
```bash
git add vercel.json VERCEL_FIX.md
git commit -m "fix: add Vercel configuration for SPA routing"
git push origin main
```

2. **Vercel will auto-redeploy** (if you have auto-deploy enabled)
   - Wait 2-3 minutes
   - Check https://syncspace-ashen.vercel.app

### Option 2: Manual Vercel Configuration (If auto-deploy isn't set up)

1. Go to https://vercel.com/dashboard
2. Find your `syncspace` project
3. Click **Settings** → **General**
4. Configure:
   - **Root Directory**: Leave blank (or set to `.`)
   - **Build Command**: `cd client && npm install && npm run build`
   - **Output Directory**: `client/dist`
   - **Install Command**: `npm install` (or leave as auto)

5. Go to **Settings** → **Environment Variables**
6. Add these variables:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_WS_URL=wss://your-websocket-server.onrender.com
   VITE_APP_URL=https://syncspace-ashen.vercel.app
   ```

7. Go to **Deployments** → Click **...** on latest → **Redeploy**

## ⚠️ Critical: Google OAuth Setup

After Vercel is working, you MUST update Google OAuth:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. **APIs & Services** → **Credentials**
3. Click your OAuth 2.0 Client ID
4. Add to **Authorized redirect URIs**:
   ```
   https://syncspace-ashen.vercel.app/auth/callback
   https://your-project.supabase.co/auth/v1/callback
   ```
5. **Save**

## Also Update Supabase

1. Go to your Supabase project
2. **Authentication** → **URL Configuration**
3. Add to **Redirect URLs**:
   ```
   https://syncspace-ashen.vercel.app
   https://syncspace-ashen.vercel.app/login
   https://syncspace-ashen.vercel.app/dashboard
   ```
4. Set **Site URL**: `https://syncspace-ashen.vercel.app`

## ✅ Testing After Fix

1. Visit: https://syncspace-ashen.vercel.app
2. Should show your landing page ✅
3. Click "Sign In" → Should go to /login ✅
4. Click "Sign in with Google" → Should redirect to Google ✅
5. After auth → Should redirect back to /dashboard ✅

## 🔍 Verify Environment Variables

Make sure these are set in Vercel:
```bash
VITE_SUPABASE_URL       # Your Supabase project URL
VITE_SUPABASE_ANON_KEY  # Your Supabase anon key
VITE_WS_URL             # Your WebSocket server URL
VITE_APP_URL            # https://syncspace-ashen.vercel.app
```

Missing ANY of these will cause login to fail!

## 🚨 Common Errors After Fix

### "Sign in with Google" shows blank page
- **Fix**: Check Google OAuth redirect URIs include your Vercel URL

### "Error: Invalid redirect URL"
- **Fix**: Add your Vercel URL to Supabase redirect URLs

### "Cannot read properties of undefined"
- **Fix**: Check all VITE_* environment variables are set in Vercel

---

**After pushing vercel.json, your deployment should work perfectly!** 🚀
