# 🔧 Manual Vercel Configuration Required

Your vercel.json is correct, but Vercel needs manual dashboard configuration.

## 🚨 The Issue:
- Homepage shows "client" text
- /login returns 404
- Vercel is building from wrong directory

## ✅ Fix in Vercel Dashboard:

### Step 1: Go to Vercel Project Settings
1. Go to https://vercel.com/dashboard
2. Click on your `syncspace` project
3. Click **Settings** (top menu)

### Step 2: Update Build & Development Settings
Go to **Settings** → **General** → **Build & Development Settings**

**Configure these EXACTLY:**

**Framework Preset:**
```
Other (or Vite)
```

**Root Directory:**
```
client
```
⚠️ **IMPORTANT**: Set this to `client` NOT blank!

**Build Command:**
```
npm run build
```

**Output Directory:**
```
dist
```

**Install Command:**
```
npm install
```

**Node.js Version:**
```
20.x (or 22.x)
```

### Step 3: Environment Variables
Go to **Settings** → **Environment Variables**

**Add ALL of these (if missing):**

```bash
VITE_SUPABASE_URL
# Value: https://YOUR-PROJECT.supabase.co

VITE_SUPABASE_ANON_KEY
# Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

VITE_WS_URL
# Value: wss://your-server.onrender.com

VITE_APP_URL
# Value: https://syncspace-ashen.vercel.app
```

⚠️ **CRITICAL**: All 4 must be set for Google login to work!

### Step 4: Redeploy
1. Go to **Deployments** tab
2. Click **...** on the latest deployment
3. Click **Redeploy**
4. Wait 2-3 minutes

---

## 🧪 After Redeployment:

### Test 1: Homepage
Visit: https://syncspace-ashen.vercel.app
- ✅ Should show: Beautiful landing page with "SyncSpace" header
- ❌ Should NOT show: "client" text

### Test 2: Login Page
Visit: https://syncspace-ashen.vercel.app/login
- ✅ Should show: Login page with "Sign in with Google" button
- ❌ Should NOT show: 404 error

### Test 3: Google Sign-In
1. Click "Sign in with Google"
2. ✅ Should redirect to Google login
3. After signing in → should go to /dashboard

---

## 🔍 Still Getting 404?

If you still get 404 after following above steps:

### Check Vercel Deployment Logs:
1. Go to **Deployments** → Click latest deployment
2. Click **View Function Logs** or **Build Logs**
3. Look for errors like:
   - "Build failed"
   - "Module not found"
   - "Command failed"

### Common Issues:

**Issue: "Cannot find module '@/...'"**
- Fix: Make sure Root Directory is set to `client`

**Issue: "Build command exited with 1"**
- Fix: Check that all dependencies are in client/package.json

**Issue: Still shows "client" text**
- Fix: Clear deployment cache and redeploy
- Go to deployment → Redeploy → Check "Use existing Build Cache" = OFF

---

## 🆘 Alternative: Delete & Recreate

If nothing works:

1. **Delete the existing Vercel project**
2. **Create a new project:**
   - Import from GitHub
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. **Add environment variables** (all 4 VITE_* variables)
4. **Deploy**

---

## 📝 Summary:

The KEY is setting **Root Directory to `client`** in Vercel dashboard!

Without this, Vercel builds from the repo root and doesn't know where to find your React app.

After fixing:
- ✅ Homepage works
- ✅ /login works
- ✅ Google OAuth works
- ✅ All routes work

**Go fix it in the Vercel dashboard now!** 🚀
