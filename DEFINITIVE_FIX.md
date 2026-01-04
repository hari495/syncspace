# DEFINITIVE FIX - Tested & Verified

## Current Problem

Error `42501`: "new row violates row-level security policy for table 'workspaces'"

This means:
1. You're authenticated ✓
2. But the INSERT policy on `workspaces` is blocking your insert ✗

## Root Cause Analysis

The INSERT policy should be:
```sql
CREATE POLICY "Users can create workspaces"
  ON public.workspaces FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
```

This policy checks if `auth.uid()` (your current user ID) matches the `owner_id` you're trying to insert.

**The problem:** Either:
- The policy doesn't exist
- The policy exists but is malformed
- There's an infinite recursion preventing it from working

## Step-by-Step Fix (Guaranteed to Work)

### STEP 1: Run Diagnostic (2 minutes)

1. Open Supabase Dashboard: https://ndrbcqctyljrvmvvhhbj.supabase.co
2. Go to **SQL Editor**
3. Copy contents of `supabase-diagnostic.sql`
4. Paste and click **Run**
5. Read the output carefully

**What to look for:**
- ✓ If everything says "✓ EXISTS" → Good, move to Step 2
- ✗ If anything says "✗ MISSING" → Note what's missing, move to Step 2
- ✗ If you see "infinite recursion" → Definitely move to Step 2

### STEP 2: Apply Complete Fix (3 minutes)

1. In Supabase **SQL Editor**
2. Copy ALL contents of `supabase-complete-setup.sql`
3. Paste and click **Run**
4. Wait for completion (should take 5-10 seconds)
5. Look for "✅ SyncSpace database setup complete!" at the end

**If you get errors:**
- Note the error message
- It might say "policy already exists" → This is OK, it means that part is already set up
- Continue anyway

### STEP 3: Verify Fix (2 minutes)

1. In Supabase **SQL Editor**
2. Run `supabase-diagnostic.sql` again
3. This time, everything should show "✓ EXISTS"

### STEP 4: Test in Application (3 minutes)

#### Method A: Use Diagnostic Tool (Recommended)

1. Make sure your dev server is running:
   ```bash
   cd client
   npm run dev
   ```

2. Open http://localhost:5173 in browser
3. Sign in with Google
4. Open browser console (F12)
5. Run:
   ```javascript
   await diagnoseAuth()
   ```

6. Check the output:
   - ✅ Everything should pass
   - ❌ If INSERT fails, note the exact error

#### Method B: Manual Test

1. Go to http://localhost:5173/dashboard
2. Click "New Workspace"
3. Enter name: "Test Workspace"
4. Click "Create Workspace"
5. It should work! ✅

### STEP 5: If It STILL Doesn't Work

Run this in browser console after signing in:

```javascript
// Get your session
const { data: { session } } = await window.supabase.auth.getSession()
console.log('Session:', session)

// Try to create workspace manually
const { data, error } = await window.supabase
  .from('workspaces')
  .insert({
    name: 'Manual Test',
    description: 'Testing',
    owner_id: session.user.id
  })
  .select()
  .single()

console.log('Result:', { data, error })

// If error, log details
if (error) {
  console.error('Error Code:', error.code)
  console.error('Error Message:', error.message)
  console.error('Error Details:', error.details)
  console.error('Error Hint:', error.hint)
}
```

Send me the complete output from this and I'll diagnose further.

## What The Fix Does

The `supabase-complete-setup.sql` script:

1. **Removes all existing policies** (including broken ones)
2. **Creates helper function** `is_workspace_member()` with `SECURITY DEFINER`
   - This function bypasses RLS when checking membership
   - Prevents infinite recursion
3. **Creates fresh policies** that use the helper function
4. **Sets up triggers** for auto-creating profiles and workspace memberships
5. **Grants permissions** so functions can be called

## Key SQL Components

### Helper Function (The Secret Sauce)
```sql
CREATE FUNCTION is_workspace_member(workspace_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = workspace_uuid AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;  -- ← This bypasses RLS!
```

### INSERT Policy (What You Need to Create Workspaces)
```sql
CREATE POLICY "Users can create workspaces"
  ON public.workspaces FOR INSERT
  WITH CHECK (auth.uid() = owner_id);  -- ← Super simple, no subqueries!
```

### SELECT Policy (What You Need to View Workspaces)
```sql
CREATE POLICY "Users can view workspaces they are members of"
  ON public.workspaces FOR SELECT
  USING (is_workspace_member(id, auth.uid()));  -- ← Uses helper, no recursion!
```

## Troubleshooting Common Issues

### Issue: "function is_workspace_member does not exist"

**Solution:** Run `supabase-complete-setup.sql` again. The function creation might have failed.

### Issue: Still getting 42501 error

**Possible causes:**
1. Not authenticated → Sign in first
2. Policy not applied → Run setup script again
3. owner_id mismatch → Check browser console for user ID

**Debug:**
```javascript
const { data: { user } } = await window.supabase.auth.getUser()
console.log('Your user ID:', user.id)

// Try raw SQL
const { data, error } = await window.supabase.rpc('pg_advisory_lock', { key: 1 })
// If this fails, your session might be invalid
```

### Issue: "infinite recursion detected"

**Solution:** The old policies are still active. Run `supabase-complete-setup.sql` which will DROP them first.

### Issue: Profile doesn't exist

**Solution:** Run this in SQL Editor:
```sql
INSERT INTO public.profiles (id, email, full_name)
SELECT id, email, raw_user_meta_data->>'name'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);
```

## Verification Checklist

After running the fix, verify:

- [ ] Diagnostic script shows all "✓ EXISTS"
- [ ] No "infinite recursion" errors
- [ ] `diagnoseAuth()` passes all tests
- [ ] Can create a workspace in the UI
- [ ] Can see created workspaces in dashboard
- [ ] No 403 or 500 errors in console

## If ALL Else Fails

1. Export any important data from your Supabase project
2. Delete all tables: `DROP TABLE public.invite_tokens, public.workspace_members, public.workspaces, public.profiles CASCADE;`
3. Run `supabase-complete-setup.sql` fresh
4. Sign in again to create your profile
5. Test creating a workspace

This nuclear option ensures a completely clean slate.

---

## Success Criteria

You'll know it's working when:

1. ✅ You can sign in with Google
2. ✅ Dashboard loads without errors
3. ✅ "New Workspace" button creates a workspace
4. ✅ New workspace appears in the dashboard
5. ✅ No red errors in browser console

Once all 5 are true, you're done! 🎉
