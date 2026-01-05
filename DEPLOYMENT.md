# 🚀 SyncSpace Deployment Guide

Complete guide to deploying your collaborative whiteboard application to production.

---

## 📋 **Prerequisites**

Before deploying, you'll need:
- ✅ GitHub account (for code hosting)
- ✅ Supabase account (for database & auth)
- ✅ Vercel/Netlify account (for frontend hosting)
- ✅ Railway/Render account (for WebSocket server)
- ✅ Domain name (optional, but recommended)

---

## 🗄️ **Part 1: Database Setup (Supabase)**

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **"New Project"**
3. Choose your organization
4. Set project name: `syncspace`
5. Set database password: **Save this securely!**
6. Choose region closest to your users
7. Click **"Create new project"** (takes ~2 minutes)

### Step 2: Run Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the contents from `docs/setup/supabase-complete-setup.sql`
4. Paste into the SQL editor
5. Click **"Run"** (or press Cmd/Ctrl + Enter)
6. Verify success: Check **Database** → **Tables** for:
   - `profiles`
   - `workspaces`
   - `workspace_members`
   - `invite_tokens`

### Step 3: Configure Google OAuth

1. Go to **Authentication** → **Providers**
2. Enable **Google** provider
3. Go to [Google Cloud Console](https://console.cloud.google.com)
4. Create new project or select existing one
5. Enable **Google+ API**
6. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
7. Application type: **Web application**
8. Authorized redirect URIs:
   ```
   https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
   ```
9. Copy **Client ID** and **Client Secret**
10. Paste into Supabase Google provider settings
11. Click **Save**

### Step 4: Get Your Supabase Credentials

1. Go to **Project Settings** → **API**
2. Copy these values (you'll need them later):
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

## 🖥️ **Part 2: WebSocket Server Deployment**

### ⚡ Quick Comparison

| Platform | Difficulty | Free Tier | Cold Starts | Best For |
|----------|-----------|-----------|-------------|----------|
| **Railway** | ⭐ Easiest | $5 credit/month | No | **Recommended** - Most reliable |
| **Render** | ⭐⭐ Easy | 750 hours/month | Yes (~30s) | Good alternative |
| **Fly.io** | ⭐⭐⭐ Moderate | 3 VMs free | Minimal | Advanced users |

### Option A: Railway (⭐ Recommended - Most Reliable)

1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Select your `syncspace` repository
5. Configure:
   - **Root Directory**: `server`
   - **Start Command**: `node index.js`
6. Add environment variables:
   ```
   PORT=1234
   ```
7. Click **"Deploy"**
8. Wait for deployment (~2 minutes)
9. Copy your Railway URL: `https://your-app.railway.app`
10. Note the WebSocket URL: `wss://your-app.railway.app`

### Option B: Render (Good Alternative with Free Tier)

**Note**: Your repo includes a `render.yaml` file for automated deployment!

#### Method 1: Blueprint Deployment (Easiest)
1. Go to [render.com](https://render.com)
2. Click **"New"** → **"Blueprint"**
3. Connect your GitHub repository
4. Select the repository containing `render.yaml`
5. Click **"Apply"** - Render will automatically configure everything!
6. Wait for deployment (~3-5 minutes)
7. Copy your Render URL: `https://syncspace-server.onrender.com`

#### Method 2: Manual Deployment
1. Go to [render.com](https://render.com)
2. Click **"New"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `syncspace-server`
   - **Root Directory**: `server`
   - **Build Command**: `npm install --production`
   - **Start Command**: `npm start`
   - **Environment**: `Node`
5. Add environment variables:
   ```
   PORT=10000
   NODE_ENV=production
   ```
6. Click **"Create Web Service"** and wait (~3-5 minutes)
7. Check logs for "SyncSpace WebSocket server running"
8. Copy your URL

**✅ Verification:**
```bash
# Test your Render deployment
curl https://your-server.onrender.com
# Should return: "SyncSpace Y.js WebSocket Server with Persistence"
```

**⚠️ Troubleshooting Render:**
- **`Cannot find package 'level'` error**:
  - **Fix**: Add `NODE_ENV=production` environment variable
  - Redeploy: Click "Manual Deploy" → "Clear build cache & deploy"
- **Build succeeds but server crashes**:
  - Check logs for port binding errors
  - Ensure `PORT=10000` is set in environment variables
- **First connection takes 30-60 seconds**:
  - Normal on free tier (cold starts)
  - Upgrade to paid tier ($7/month) to eliminate cold starts
- **WebSocket connection fails**:
  - Use `wss://` (not `ws://`) in your client
  - Check CORS settings in server/index.js

### Option C: Fly.io

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. Navigate to server directory: `cd server`
4. Initialize: `fly launch`
5. Follow prompts (choose region, set app name)
6. Deploy: `fly deploy`
7. Get URL: `fly info`

---

## 🌐 **Part 3: Frontend Deployment (Vercel)**

### Option A: Vercel (Recommended - Zero Config)

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click **"Add New"** → **"Project"**
4. Import your `syncspace` repository
5. Configure build settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Add environment variables:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   VITE_WS_URL=wss://your-app.railway.app
   VITE_APP_URL=https://your-app.vercel.app
   ```
7. Click **"Deploy"**
8. Wait ~2 minutes
9. Your app is live! 🎉

### Option B: Netlify

1. Go to [netlify.com](https://netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect to GitHub and select repository
4. Configure:
   - **Base directory**: `client`
   - **Build command**: `npm run build`
   - **Publish directory**: `client/dist`
5. Add environment variables (same as Vercel above)
6. Click **"Deploy site"**

---

## 🔧 **Part 4: Update OAuth Redirect URLs**

After deployment, update your OAuth settings:

### Supabase
1. Go to Supabase **Authentication** → **URL Configuration**
2. Add to **Redirect URLs**:
   ```
   https://your-app.vercel.app
   https://your-app.vercel.app/login
   ```

### Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. **APIs & Services** → **Credentials**
3. Click your OAuth 2.0 Client ID
4. Add to **Authorized redirect URIs**:
   ```
   https://your-app.vercel.app/auth/callback
   https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
   ```
5. Click **Save**

---

## 🌍 **Part 5: Custom Domain (Optional)**

### For Vercel:
1. In Vercel project settings, go to **Domains**
2. Click **"Add Domain"**
3. Enter your domain: `syncspace.yourdomain.com`
4. Follow DNS configuration instructions
5. Add DNS records in your domain registrar:
   ```
   Type: CNAME
   Name: syncspace
   Value: cname.vercel-dns.com
   ```
6. Wait for SSL certificate (~5 minutes)

### For Railway:
1. In Railway project, go to **Settings** → **Domains**
2. Click **"Generate Domain"** or **"Custom Domain"**
3. If custom, add DNS record:
   ```
   Type: CNAME
   Name: ws
   Value: your-app.railway.app
   ```

### Update Environment Variables:
Don't forget to update `VITE_APP_URL` and `VITE_WS_URL` with your custom domains!

---

## 📊 **Part 6: Monitoring & Maintenance**

### Enable Monitoring

**Railway:**
- Built-in metrics available in dashboard
- Set up alerts for crashes

**Vercel:**
- Analytics available in **Analytics** tab
- Enable **Speed Insights** for performance monitoring

**Supabase:**
- Monitor database usage in **Database** → **Usage**
- Set up **Postgres Logs** for debugging
- Configure **Database Webhooks** for real-time alerts

### Backup Strategy

1. **Database Backups** (Supabase):
   - Automatic daily backups (Pro plan)
   - Manual backup: **Database** → **Backups** → **Create backup**

2. **Code Backups**:
   - Already backed up in GitHub
   - Tag releases: `git tag v1.0.0 && git push --tags`

### Scaling

**When to scale:**
- Database: >70% of free tier limits
- Server: Response times >500ms
- Frontend: Vercel automatically scales

**How to scale:**
1. **Supabase**: Upgrade to Pro plan ($25/month)
2. **Railway**: Upgrade plan or add more resources
3. **Vercel**: Automatically handled, pay for usage

---

## 🔐 **Security Checklist**

- ✅ Enable RLS (Row Level Security) on all Supabase tables
- ✅ Use environment variables for all secrets
- ✅ Enable HTTPS only (handled automatically by hosts)
- ✅ Configure CORS properly on WebSocket server
- ✅ Set up rate limiting (Supabase has built-in protection)
- ✅ Regular dependency updates: `npm audit fix`
- ✅ Enable 2FA on all hosting accounts

---

## 📝 **Environment Variables Summary**

### Frontend (.env)
```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_WS_URL=wss://your-server.railway.app
VITE_APP_URL=https://your-app.vercel.app
```

### Backend (.env)
```bash
PORT=1234
```

---

## 🚨 **Troubleshooting**

### Issue: "Failed to connect to WebSocket"
**Solution**: Check VITE_WS_URL is correct and server is running

### Issue: "Google OAuth not working"
**Solution**: Verify redirect URIs match exactly in Google Console and Supabase

### Issue: "Database permission denied"
**Solution**: Re-run the RLS policies from supabase-complete-setup.sql

### Issue: "Build fails on Vercel"
**Solution**:
1. Check Node version matches (20.19+ or 22.12+)
2. Verify all environment variables are set
3. Check build logs for specific error

---

## 🎯 **Quick Start Deployment (All-in-One)**

```bash
# 1. Push to GitHub
git add .
git commit -m "Ready for deployment"
git push origin main

# 2. Deploy Frontend (Vercel CLI)
cd client
npm i -g vercel
vercel --prod

# 3. Deploy Backend (Railway CLI)
cd ../server
npm i -g @railway/cli
railway login
railway init
railway up

# 4. Setup Database
# → Go to Supabase dashboard
# → Run SQL from docs/setup/supabase-complete-setup.sql

# Done! 🎉
```

---

## 💰 **Cost Estimate**

**Free Tier (Great for starting):**
- Supabase: Free (500MB database, 50MB file storage)
- Vercel: Free (100GB bandwidth)
- Railway: $5/month credit (enough for light usage)
- **Total: ~$0-5/month**

**Production (Recommended):**
- Supabase Pro: $25/month
- Vercel Pro: $20/month
- Railway: $10-20/month
- **Total: ~$55-65/month**

---

## 📞 **Support**

If you encounter issues:
1. Check logs in your hosting dashboard
2. Review this guide's troubleshooting section
3. Check GitHub Issues
4. Supabase Discord: [discord.supabase.com](https://discord.supabase.com)

---

## ✅ **Post-Deployment Checklist**

- [ ] Database schema applied
- [ ] Google OAuth configured
- [ ] Frontend deployed and accessible
- [ ] WebSocket server running
- [ ] Environment variables set correctly
- [ ] OAuth redirect URLs updated
- [ ] Test creating a workspace
- [ ] Test real-time collaboration
- [ ] Test invite links
- [ ] Custom domain configured (optional)
- [ ] Monitoring enabled
- [ ] Backups configured

---

**🎉 Congratulations! Your SyncSpace is now live and production-ready!**

Visit your URL and start collaborating! 🚀
