# START HERE - Complete Fix Guide

## Your Current Error

```
403 Forbidden
Code: 42501
Message: "new row violates row-level security policy for table 'workspaces'"
```

## What This Means

You're trying to create a workspace, but PostgreSQL's Row Level Security (RLS) is blocking it. This happens when the RLS policies are either:
1. Missing
2. Incorrectly configured
3. Causing infinite recursion

## The Fix (15 Minutes Total)

### Phase 1: Diagnose (5 min)

#### Step 1.1: Check Database State

1. Open Supabase: https://ndrbcqctyljrvmvvhhbj.supabase.co
2. Go to **SQL Editor** (left sidebar)
3. Open file: `supabase-diagnostic.sql`
4. Copy entire contents
5. Paste in SQL Editor
6. Click **Run**

**Expected Output:**
- Should show which tables/functions exist
- Should show if infinite recursion exists
- Should indicate what needs fixing

#### Step 1.2: Check Authentication

1. Open your app: http://localhost:5173
2. Sign in with Google
3. Open Browser Console (F12)
4. Run:
   ```javascript
   await diagnoseAuth()
   ```

**Expected Output:**
- ✅ Session found
- ✅ User authenticated
- ✅ Profile exists
- ⚠️ INSERT might fail (this is what we're fixing)

### Phase 2: Fix (5 min)

#### Step 2.1: Apply SQL Fix

1. In Supabase **SQL Editor**
2. Open file: `supabase-complete-setup.sql`
3. Copy **ALL** contents (entire file!)
4. Paste in SQL Editor
5. Click **Run**
6. Wait 10-15 seconds
7. Look for: "✅ SyncSpace database setup complete!"

**What This Does:**
- Drops all broken policies
- Creates `is_workspace_member()` helper function
- Creates fresh, non-recursive policies
- Sets up triggers for auto-membership
- Grants all necessary permissions

### Phase 3: Test (5 min)

#### Step 3.1: Automated Test

1. Open in browser: `test-complete-flow.html`
2. Credentials should be pre-filled
3. Make sure you're signed in to the app first
4. Click "🚀 Run Complete Test"
5. Watch tests run

**Success Criteria:**
- All 12 tests should pass ✅
- "INSERT Workspace" test should pass
- No infinite recursion errors
- Summary shows "All tests passed!"

#### Step 3.2: Manual Test

1. Go to http://localhost:5173/dashboard
2. Click "New Workspace"
3. Enter name: "My First Workspace"
4. Enter description: "Testing the fix"
5. Click "Create Workspace"

**Expected:**
- ✅ No errors in console
- ✅ Redirects to workspace page
- ✅ Workspace appears in dashboard

### Phase 4: Verify (Optional)

Run diagnostic again to confirm:

```javascript
await diagnoseAuth()
```

Should show all ✅ checks passing.

## Files Reference

| File | Purpose | When to Use |
|------|---------|-------------|
| `START_HERE.md` | You are here! | Start here |
| `supabase-diagnostic.sql` | Checks what's wrong | Run first |
| `supabase-complete-setup.sql` | Fixes everything | Run to fix |
| `test-complete-flow.html` | Automated testing | Verify fix works |
| `DEFINITIVE_FIX.md` | Detailed troubleshooting | If issues persist |

## Troubleshooting

### "Still getting 42501 error"

**Most likely cause:** SQL script didn't run successfully

**Fix:**
1. Check SQL Editor for error messages
2. Run `supabase-diagnostic.sql` again
3. Look for "✗ MISSING" items
4. Run `supabase-complete-setup.sql` again
5. Some errors like "policy already exists" are OK - it will still work

### "Not authenticated" error

**Fix:**
1. Sign in at http://localhost:5173
2. Check if Google OAuth is enabled in Supabase
3. Verify redirect URL in Google Console matches

### "Profile doesn't exist"

**Fix:**
Run this in SQL Editor:
```sql
INSERT INTO public.profiles (id, email, full_name)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name')
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);
```

### "Infinite recursion detected"

**Fix:**
The old policies are still active. Make sure you:
1. Ran the ENTIRE `supabase-complete-setup.sql`
2. The script drops old policies first
3. Re-run if needed (safe to run multiple times)

## Success Checklist

Before considering this fixed, verify:

- [ ] `supabase-diagnostic.sql` shows all components exist
- [ ] `diagnoseAuth()` passes all checks
- [ ] `test-complete-flow.html` shows 100% pass rate
- [ ] Can create workspace in UI without errors
- [ ] Created workspace appears in dashboard
- [ ] No 403, 500, or 42501 errors in console

## If Nothing Works

### Nuclear Option (Last Resort)

This will completely reset your database:

1. **Backup any data you care about**

2. Run in SQL Editor:
```sql
DROP TABLE IF EXISTS public.invite_tokens CASCADE;
DROP TABLE IF EXISTS public.workspace_members CASCADE;
DROP TABLE IF EXISTS public.workspaces CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
```

3. Run `supabase-complete-setup.sql`

4. Sign out and sign in again

5. Test creating a workspace

This gives you a completely fresh start.

## Technical Details (Optional)

### Why This Fix Works

The error happens because of circular RLS policy references:

**Before (Broken):**
```sql
-- workspaces policy checks workspace_members
SELECT policy: workspace_id IN (SELECT ... FROM workspace_members WHERE ...)

-- workspace_members policy ALSO checks workspace_members
SELECT policy: workspace_id IN (SELECT ... FROM workspace_members WHERE ...)

-- Result: Infinite recursion! ♾️
```

**After (Fixed):**
```sql
-- Helper function with SECURITY DEFINER (bypasses RLS)
CREATE FUNCTION is_workspace_member(...) SECURITY DEFINER;

-- Policies use helper function (no recursion!)
SELECT policy: is_workspace_member(workspace_id, auth.uid())
```

The `SECURITY DEFINER` attribute makes the function run with elevated privileges, bypassing RLS when checking membership. This breaks the recursion cycle.

## Next Steps After Fix

Once everything works:

1. ✅ Test the whiteboard functionality
2. ✅ Test with multiple users
3. ✅ Test workspace deletion
4. ✅ Set up invite tokens (if needed)
5. ✅ Deploy to production

## Need Help?

If you're still stuck:

1. Run `diagnoseAuth()` in console
2. Run `test-complete-flow.html`
3. Share the console output
4. Share any error messages from SQL Editor

I'll help debug from there!

---

## Quick Commands Reference

**Browser Console:**
```javascript
// Check auth status
await diagnoseAuth()

// Test creating workspace manually
const { data, error } = await window.supabase
  .from('workspaces')
  .insert({
    name: 'Test',
    owner_id: (await window.supabase.auth.getUser()).data.user.id
  })
  .select()
  .single()
console.log({ data, error })
```

**SQL Editor:**
```sql
-- Check policies
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Check functions
SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace;

-- Check your user
SELECT * FROM auth.users WHERE email = 'your-email@gmail.com';
```

---

**Ready?** Start with **Phase 1: Diagnose** above ⬆️
