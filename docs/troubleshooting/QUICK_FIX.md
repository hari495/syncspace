# Quick Fix - 3 Steps

## Problem
- ❌ 500 error when fetching workspaces
- ❌ 403 Forbidden error
- ❌ "infinite recursion detected in policy for relation workspace_members"
- ❌ "new row violates row-level security policy"

## Solution (3 Steps)

### Step 1: Apply Database Fix (2 minutes)

1. Open Supabase Dashboard: https://ndrbcqctyljrvmvvhhbj.supabase.co
2. Go to **SQL Editor** (left sidebar)
3. Copy entire contents of `supabase-complete-setup.sql`
4. Paste and click **Run**
5. Wait for "✅ SyncSpace database setup complete!" message

### Step 2: Verify Google OAuth (2 minutes)

1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Ensure **Google** is enabled
3. Verify redirect URL is added to Google Cloud Console:
   ```
   https://ndrbcqctyljrvmvvhhbj.supabase.co/auth/v1/callback
   ```

### Step 3: Test (2 minutes)

**Option A: Use Verification Tool**
1. Open `client/verify-setup.html` in a browser
2. Sign in to your app first at http://localhost:5173
3. Come back and click "Run Verification Tests"
4. All tests should pass ✅

**Option B: Test Manually**
1. Start servers:
   ```bash
   # Terminal 1
   cd server && npm run dev

   # Terminal 2
   cd client && npm run dev
   ```
2. Open http://localhost:5173
3. Sign in with Google
4. Create a workspace
5. Should work without errors ✅

## What This Fixes

The fix creates a special helper function (`is_workspace_member`) that breaks the infinite recursion loop in the Row Level Security policies. This allows:

✅ Users to view workspaces they belong to
✅ Users to create new workspaces
✅ Users to see workspace members
✅ Auto-creation of workspace membership when creating a workspace

## Files Created

1. **supabase-complete-setup.sql** - Complete database setup (run this in Supabase)
2. **COMPLETE_FIX_GUIDE.md** - Detailed guide with troubleshooting
3. **verify-setup.html** - Automated verification tool
4. **QUICK_FIX.md** - This file (3-step quick start)

## Still Having Issues?

See **COMPLETE_FIX_GUIDE.md** for:
- Detailed troubleshooting steps
- How to verify each component
- Common error codes and solutions
- Database schema overview

## Technical Details (Optional)

The core issue was RLS policies creating infinite recursion:

**Before:**
```sql
-- workspace_members policy queries workspace_members → infinite loop!
CREATE POLICY "..." ON workspace_members
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));
```

**After:**
```sql
-- Helper function with SECURITY DEFINER bypasses RLS
CREATE FUNCTION is_workspace_member(...) RETURNS BOOLEAN
  SECURITY DEFINER;  -- Bypasses RLS!

-- Policy uses helper → no recursion!
CREATE POLICY "..." ON workspace_members
  USING (is_workspace_member(workspace_id, auth.uid()));
```

---

**Ready?** Start with Step 1 above! ⬆️
