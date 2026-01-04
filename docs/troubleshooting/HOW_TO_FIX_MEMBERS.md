# Fix Workspace Members Issues

## Issues Found

1. ❌ **Foreign key missing**: `workspace_members.user_id` doesn't have a foreign key to `profiles.id`
2. ❌ **Owner not visible**: Can't see yourself in the members list
3. ❌ **Can't modify roles**: No UPDATE policy on workspace_members
4. ❌ **Can't see other profiles**: Missing policy to view workspace members' profiles

## Solution

### Step 1: Run the SQL Fix

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Go to **SQL Editor**
3. Open the file `FIX_MEMBER_ISSUES.sql` from your project
4. **Copy the ENTIRE file contents**
5. Paste into SQL Editor
6. Click **RUN**

You should see output like:
```
✅ Added foreign key from workspace_members to profiles
✅ Added UPDATE policy for workspace members
✅ Updated role constraint to include member
✅ Added policy to view workspace member profiles
✅ Foreign key verified
✅ UPDATE policy verified
```

### Step 2: Test the Functionality

1. **Refresh your browser** (to clear any cached queries)
2. Open a workspace you own
3. Click the **Share** button

**You should now see:**
- ✅ **Your own name** in the "People with access" section
- ✅ A purple **"Owner"** badge next to your name
- ✅ A blue **"you"** badge next to your name
- ✅ All other members who have access
- ✅ A **dropdown** to change roles for non-owner members (Editor/Viewer/Member)
- ✅ A **remove button** (trash icon) next to non-owner members

### Step 3: Test Removing a Member

1. Find a non-owner member in the list
2. Click the **trash icon** next to their name
3. Confirm the removal
4. Member should disappear from the list

### Step 4: Test Changing Roles

1. Find a non-owner member in the list
2. Click the **role dropdown** (Editor/Viewer/Member)
3. Select a different role
4. The role should update immediately

## Common Issues

### "Still can't see myself in the list"

**Check:**
```sql
-- Run this in SQL Editor to see your memberships
SELECT
  w.name as workspace_name,
  wm.role,
  wm.user_id,
  p.email
FROM workspace_members wm
JOIN workspaces w ON w.id = wm.workspace_id
JOIN profiles p ON p.id = wm.user_id
WHERE wm.user_id = auth.uid();
```

If you see no rows, the trigger didn't fire. Manually add yourself:
```sql
-- Replace YOUR_WORKSPACE_ID with the actual workspace ID
INSERT INTO workspace_members (workspace_id, user_id, role)
VALUES ('YOUR_WORKSPACE_ID', auth.uid(), 'owner')
ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'owner';
```

### "Remove button not showing"

Check the console (F12) for debug logs. You should see:
```
Current user member: { name: "...", role: "owner", isOwner: true, ... }
```

If `role` is not "owner", you're not the workspace owner.

### "Can't remove members - Permission denied"

Run this to check the DELETE policy:
```sql
SELECT * FROM pg_policies
WHERE tablename = 'workspace_members'
AND cmd = 'DELETE';
```

Should show a policy named "Workspace owners can remove members".

## Verification Queries

Run these in SQL Editor to verify everything:

```sql
-- 1. Check foreign key exists
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'workspace_members'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'user_id';

-- Expected: Should show workspace_members.user_id → profiles.id

-- 2. Check UPDATE policy exists
SELECT * FROM pg_policies
WHERE tablename = 'workspace_members'
AND cmd = 'UPDATE';

-- Expected: Should show "Workspace owners can update member roles"

-- 3. Check role constraint
SELECT con.conname, pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'workspace_members'
AND con.contype = 'c'
AND con.conname LIKE '%role%';

-- Expected: Should include 'member' in the check constraint
```

## Success!

After following these steps, you should be able to:
- ✅ See all workspace members (including yourself as owner)
- ✅ Remove non-owner members
- ✅ Change member roles
- ✅ See clear labels for Owner and "you"

If you're still having issues, check the browser console for error messages and share them.
