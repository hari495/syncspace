# Complete Testing Guide - Fix Workspace Members

## Step 1: Run Diagnostic (FIRST!)

1. Open Supabase SQL Editor
2. Copy entire content of `DIAGNOSE_MEMBER_ISSUES.sql`
3. Paste and **RUN**
4. **Screenshot the output** and keep it

This tells us exactly what's broken before we fix it.

---

## Step 2: Run the Complete Fix

1. Open Supabase SQL Editor (new query)
2. Copy entire content of `COMPLETE_FIX.sql`
3. Paste and **RUN**
4. Watch the output - should see:
   ```
   ✅ Created/updated X profiles
   ✅ Added X workspace owners to workspace_members
   ✅ Foreign key set to profiles.id
   ✅ Role constraint updated
   ✅ Profiles policies created
   ✅ Workspace members policies created
   📊 Found X profiles
   📊 Found X workspace members (all have profiles)
   ✅ Foreign key exists
   ✅ All policies created
   🧪 TESTING: Querying workspace_members with profiles...
      owner - your@email.com ← YOU
      editor - other@email.com
   ✅ Query returned X member(s)
   ```

5. **If you see "← YOU" in the test output**, the fix worked!
6. **If you see "Query returned 0 members"**, something is still wrong - send me the output

---

## Step 3: Test in Browser

### A. Clear Browser Cache
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"
4. Or: Close all tabs and reopen

### B. Test Share Dialog

1. Navigate to a workspace you own
2. Open browser console (F12) - keep it open!
3. Click **Share** button
4. Look at console output - should see:
   ```
   🔍 Fetching members for workspace: abc-123...
   ✅ Join query succeeded, found members: 2
   Current user member: { name: "Your Name", role: "owner", isOwner: true, ... }
   ```

5. In the Share dialog, you should see:
   - **Section "People with access"**
   - **Your name** with:
     - Purple "Owner" badge
     - Blue "you" badge
   - **Other members** with:
     - Role dropdown (Editor/Viewer/Member)
     - Red trash icon to remove

### C. Test Role Change

1. Find a non-owner member
2. Click the role dropdown
3. Select a different role (e.g., change Editor → Viewer)
4. Console should show:
   ```
   Attempting to change role: { userId: "...", newRole: "viewer", workspaceId: "..." }
   Role updated successfully
   🔍 Fetching members for workspace: ...
   ```
5. Role should update immediately in the UI

### D. Test Remove Member

1. Find a non-owner member
2. Click the trash icon
3. Confirm the removal
4. Console should show:
   ```
   Attempting to remove member: { memberId: "...", userId: "...", workspaceId: "..." }
   Calling removeMember API...
   Member removed successfully
   ```
5. Member should disappear from the list

---

## Troubleshooting

### Issue: Can't see yourself in members list

**Check console for:**
```
❌ Join query failed: { code: "...", message: "..." }
⚠️ Falling back to separate queries...
```

If you see this, the foreign key join is still failing.

**Fix:**
```sql
-- Check if FK exists
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE constraint_name = 'workspace_members_user_id_fkey';

-- If not found, manually add it:
ALTER TABLE workspace_members
DROP CONSTRAINT IF EXISTS workspace_members_user_id_fkey;

ALTER TABLE workspace_members
ADD CONSTRAINT workspace_members_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
```

### Issue: See yourself but can't modify roles

**Check console for error when changing role.**

If error says "permission denied" or "RLS policy":
```sql
-- Check UPDATE policy exists
SELECT * FROM pg_policies
WHERE tablename = 'workspace_members'
AND cmd = 'UPDATE';

-- If not found, recreate it:
DROP POLICY IF EXISTS "workspace_members_update_policy" ON public.workspace_members;

CREATE POLICY "workspace_members_update_policy"
  ON public.workspace_members FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );
```

### Issue: Can't see other members' names/emails

**Check console for:**
```
❌ Profiles query failed: { code: "...", message: "..." }
```

This means RLS is blocking profile access.

**Fix:**
```sql
-- Check profiles SELECT policy
SELECT * FROM pg_policies
WHERE tablename = 'profiles'
AND cmd = 'SELECT';

-- Recreate it to allow viewing workspace members' profiles:
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR
    EXISTS (
      SELECT 1
      FROM workspace_members wm1
      JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
      WHERE wm1.user_id = auth.uid()
        AND wm2.user_id = profiles.id
    )
  );
```

---

## Success Criteria

All of these must be TRUE:

- [ ] Diagnostic shows you have a profile
- [ ] Diagnostic shows you in workspace_members with role='owner'
- [ ] Diagnostic test query returns "← YOU"
- [ ] Browser console shows "✅ Join query succeeded"
- [ ] Share dialog shows your name
- [ ] You have purple "Owner" badge
- [ ] You have blue "you" badge
- [ ] Other members show role dropdowns
- [ ] Other members show remove buttons
- [ ] Can change a member's role
- [ ] Can remove a member

---

## Send Me This If Still Broken

1. **Output from DIAGNOSE_MEMBER_ISSUES.sql** (screenshot or text)
2. **Output from COMPLETE_FIX.sql** (the verification section)
3. **Browser console output** when opening Share dialog
4. **Screenshot** of the Share dialog

I'll tell you exactly what's wrong.
