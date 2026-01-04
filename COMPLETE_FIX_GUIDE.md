# Complete Fix Guide for SyncSpace

## Problem Summary

You're experiencing two main errors:
1. **Infinite recursion** in RLS policies for `workspace_members`
2. **403 Forbidden** and **RLS policy violation** when creating/fetching workspaces

## Root Cause

The RLS (Row Level Security) policies were referencing each other recursively:
- `workspaces` SELECT policy queries `workspace_members`
- `workspace_members` SELECT policy also queries `workspace_members` → **INFINITE LOOP**

## Complete Solution

### Step 1: Apply the Fixed Database Schema

1. **Open Supabase Dashboard**
   - Go to: https://ndrbcqctyljrvmvvhhbj.supabase.co
   - Navigate to **SQL Editor** (left sidebar)

2. **Run the Complete Setup Script**
   - Open the file: `supabase-complete-setup.sql`
   - Copy ALL contents
   - Paste into SQL Editor
   - Click **Run** (or press Cmd/Ctrl + Enter)

   This script will:
   - ✅ Drop all existing problematic policies
   - ✅ Create a `is_workspace_member()` helper function (SECURITY DEFINER to avoid recursion)
   - ✅ Create proper RLS policies that use the helper function
   - ✅ Set up all necessary triggers
   - ✅ Preserve your existing data

### Step 2: Configure Google OAuth

1. **In Supabase Dashboard**, go to **Authentication** → **Providers**

2. **Enable Google Provider**
   - Toggle Google to ON
   - You'll need to provide:
     - **Client ID** (from Google Cloud Console)
     - **Client Secret** (from Google Cloud Console)

3. **Add Redirect URL**
   - In your Google Cloud Console OAuth settings
   - Add this authorized redirect URI:
     ```
     https://ndrbcqctyljrvmvvhhbj.supabase.co/auth/v1/callback
     ```

4. **Local Development Redirect**
   - The app is configured to redirect to: `http://localhost:5173/dashboard`
   - This is already set in your `.env.local`

### Step 3: Verify the Setup

After running the SQL script, verify it worked:

1. **Check for Success Message**
   - The SQL Editor should show: "✅ SyncSpace database setup complete!"

2. **Verify Policies**
   - Go to **Database** → **Policies** in Supabase
   - You should see policies for all tables without warnings

3. **Check Functions**
   - Go to **Database** → **Functions**
   - Verify `is_workspace_member` exists

### Step 4: Test Your Application

1. **Start your development servers**
   ```bash
   # Terminal 1 - Start WebSocket server
   cd server
   npm run dev

   # Terminal 2 - Start client
   cd client
   npm run dev
   ```

2. **Test Authentication**
   - Open http://localhost:5173
   - Click "Continue with Google"
   - Sign in with your Google account
   - You should be redirected to `/dashboard`

3. **Test Workspace Creation**
   - Click "New Workspace"
   - Enter a name and description
   - Click "Create Workspace"
   - The workspace should be created successfully

4. **Test Workspace Fetching**
   - The dashboard should show your created workspace(s)
   - No 403 or 500 errors in the console

## What Changed in the Fix

### Before (Broken)
```sql
-- This caused infinite recursion
CREATE POLICY "Users can view members..."
  ON workspace_members FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members  -- ❌ Queries itself!
      WHERE user_id = auth.uid()
    )
  );
```

### After (Fixed)
```sql
-- Step 1: Create SECURITY DEFINER helper function
CREATE FUNCTION is_workspace_member(workspace_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = workspace_uuid AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;  -- Bypasses RLS!

-- Step 2: Use helper in policies
CREATE POLICY "Users can view members..."
  ON workspace_members FOR SELECT
  USING (is_workspace_member(workspace_id, auth.uid()));  -- ✅ No recursion!
```

## Troubleshooting

### Still Getting 403 Errors?

**Check Authentication:**
```javascript
// Add this to your browser console while on /dashboard
const { data: { session } } = await window.supabase.auth.getSession()
console.log('User:', session?.user)
console.log('Authenticated:', !!session)
```

If user is `null`:
- Google OAuth isn't configured correctly
- Check redirect URLs match exactly
- Clear browser storage and try again

### Still Getting RLS Policy Violations?

**Verify the SQL script ran successfully:**
- Check for error messages in SQL Editor
- Verify all policies were created
- Try running the script again (it's safe to re-run)

**Check user has a profile:**
```sql
-- Run this in SQL Editor
SELECT * FROM auth.users WHERE email = 'your-email@gmail.com';
SELECT * FROM public.profiles WHERE email = 'your-email@gmail.com';
```

If profile is missing, the trigger didn't run. You can manually create it:
```sql
INSERT INTO public.profiles (id, email, full_name)
SELECT id, email, raw_user_meta_data->>'full_name'
FROM auth.users
WHERE email = 'your-email@gmail.com';
```

### Workspace Creation Fails?

Check the browser console for detailed error:
- `code: '42501'` = RLS policy blocking insert
- `code: 'PGRST116'` = Invalid auth token
- `code: '23503'` = Foreign key violation (user doesn't exist)

## Database Schema Overview

```
auth.users (Supabase managed)
    ↓ (trigger: on_auth_user_created)
profiles
    ├── id → auth.users.id
    └── email, full_name, avatar_url

workspaces
    ├── id (UUID)
    ├── name, description
    ├── owner_id → auth.users.id
    └── created_at, updated_at
    ↓ (trigger: on_workspace_created)
workspace_members
    ├── workspace_id → workspaces.id
    ├── user_id → auth.users.id
    └── role ('owner', 'editor', 'viewer')
```

## Key Points

1. **SECURITY DEFINER functions bypass RLS** - This is how we break the recursion
2. **Triggers run with elevated privileges** - They can insert even when RLS would block
3. **Always test authentication first** - Most errors come from missing/invalid sessions
4. **Google OAuth requires exact redirect URLs** - One character off = authentication fails

## Next Steps After Fix

Once everything works:
1. ✅ Create test workspaces
2. ✅ Test the whiteboard collaboration features
3. ✅ Invite team members (you'll need to implement invite tokens)
4. ✅ Deploy to production (update redirect URLs for your production domain)

---

**Need Help?**
If you're still stuck after following this guide:
1. Check the browser console for errors
2. Check Supabase logs (Dashboard → Logs)
3. Verify each step was completed exactly
