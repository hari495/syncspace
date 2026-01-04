# Debug RLS Error - Step by Step

## Quick Check First

### Step 1: Open Browser Console
Press F12 and run:

```javascript
// Check if you're authenticated
const { data: { session } } = await window.supabase.auth.getSession()
console.log('Session:', session)
console.log('User ID:', session?.user?.id)
console.log('Email:', session?.user?.email)

// If session is null, you're not authenticated!
```

**Result:**
- ✅ If you see user details → Continue to Step 2
- ❌ If session is null → Sign out and sign in again

---

### Step 2: Run Diagnostic

In browser console:
```javascript
await diagnoseAuth()
```

Look at the output:
- Does it show "✅ Session found"?
- Does it show "✅ Profile exists"?
- What happens at "Testing INSERT permission"?

**Copy the entire output and send it to me.**

---

### Step 3: Check Database (Most Important!)

1. Open Supabase: https://ndrbcqctyljrvmvvhhbj.supabase.co
2. Go to **SQL Editor**
3. Run this:

```sql
-- Check if policies exist
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'workspaces'
ORDER BY policyname;
```

**Copy the results and send them to me.**

---

### Step 4: Check if Setup Script Ran

In SQL Editor, run:

```sql
-- Check if helper function exists
SELECT proname, prosecdef
FROM pg_proc
WHERE proname = 'is_workspace_member'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

**Expected result:**
```
proname              | prosecdef
---------------------|----------
is_workspace_member  | t
```

If you get **no rows**, the setup script DIDN'T run!

---

## Most Likely Cause

You didn't run `supabase-complete-setup.sql` or it failed silently.

### Fix: Run Setup Script NOW

1. Go to Supabase SQL Editor
2. Open `supabase-complete-setup.sql` from your project
3. Copy **ENTIRE FILE** (all lines!)
4. Paste in SQL Editor
5. Click **Run**
6. Wait for completion
7. Look for "✅ SyncSpace database setup complete!" at the end

### After Running Script

Test immediately in browser console:
```javascript
const { data: { user } } = await window.supabase.auth.getUser()

const { data, error } = await window.supabase
  .from('workspaces')
  .insert({
    name: 'Test Workspace',
    description: 'Testing',
    owner_id: user.id
  })
  .select()
  .single()

console.log('Result:', { data, error })
```

**Expected:**
- ✅ data should have the new workspace
- ❌ error should be null

---

## If Still Failing After Setup Script

Run this in SQL Editor to manually create the INSERT policy:

```sql
-- Drop existing policy if any
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;

-- Create fresh INSERT policy
CREATE POLICY "Users can create workspaces"
  ON public.workspaces
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Verify it was created
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'workspaces' AND cmd = 'INSERT';
```

---

## Send Me This Info

Please run and send me the output of:

1. **Browser console** - `await diagnoseAuth()`
2. **SQL Editor** - The policy check query (Step 3)
3. **SQL Editor** - The function check query (Step 4)
4. **Did you run the setup script?** Yes/No

I'll tell you exactly what's wrong.
