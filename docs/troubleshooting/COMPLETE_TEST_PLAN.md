# Complete Test Plan - New Workspace Creation

## Issue

When user creates a new workspace:
- ❌ They are set as "viewer" instead of "owner"
- ❌ They have no permissions to edit
- ❌ They can't see themselves in Share dialog

## Root Cause Analysis

Possible causes:
1. Trigger `on_workspace_created` not firing
2. Trigger firing but inserting wrong role
3. Trigger failing silently
4. Default role in table schema overriding trigger
5. RLS policy blocking trigger insert

## Fix Strategy

1. **Diagnose** - Run diagnostic to see what's happening
2. **Fix Trigger** - Recreate trigger with proper error handling
3. **Fix Existing** - Update any broken workspaces
4. **Test** - Create new workspace and verify
5. **Verify** - Check all permissions work

## Step-by-Step Testing

### PART 1: Run Diagnostic

```bash
# In Supabase SQL Editor
```

1. Copy entire `DIAGNOSE_NEW_WORKSPACE.sql`
2. Paste and RUN
3. Look for test output:

**Expected (Good):**
```
✅ Workspace member created
   Role: owner
✅ Role is correct (owner)
```

**Bad outputs:**
```
❌ CRITICAL: No workspace_member created! Trigger did not fire!
❌ WRONG ROLE: Expected "owner", got "viewer"
```

→ If bad, continue to PART 2
→ If good, skip to PART 3

### PART 2: Fix the Trigger

```bash
# In Supabase SQL Editor
```

1. Copy entire `FIX_NEW_WORKSPACE.sql`
2. Paste and RUN
3. Watch the test output at the end

**Expected:**
```
================================================
✅ TEST PASSED - Fix is working!
================================================
```

**If test passes:**
- ✅ Trigger is now working
- ✅ New workspaces will have correct owner
- Continue to PART 3

**If test fails:**
- ❌ Something else is wrong
- 🛑 STOP and send me the full output

### PART 3: Fix Your Existing Workspaces

```bash
# In Supabase SQL Editor
```

1. Copy entire `FIX_MY_WORKSPACES.sql`
2. Paste and RUN
3. It will list all your workspaces and fix them

**Expected:**
```
Workspace: "My Document"
  ❌ Role was "viewer" - CHANGED to owner

✅ Fixed X workspace(s)
```

### PART 4: Test in Browser

**4A. Refresh Browser**
1. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
2. Or clear cache and refresh

**4B. Test Existing Workspace**
1. Go to Dashboard
2. Open an existing workspace you created
3. Check workspace header:
   - ❌ If you see "View Only" badge → Still broken
   - ✅ If NO badge → Working!
4. Try drawing a rectangle
   - ❌ If tools are grayed out → Still broken
   - ✅ If you can draw → Working!
5. Click Share button
   - ❌ If you don't see yourself → Still broken
   - ✅ If you see yourself with purple "Owner" badge → Working!

**If existing workspace works, continue to 4C**
**If still broken, STOP and send me:**
- Browser console output
- Screenshot of Share dialog
- Output from FIX_MY_WORKSPACES.sql

**4C. Test Creating NEW Workspace**
1. Go to Dashboard
2. Click "New Workspace" (or create button)
3. Enter name: "Test Owner Permissions"
4. Create it
5. Workspace should open
6. Immediately check:

   **Check 1: Can you edit?**
   - Click pencil tool
   - Try to draw
   - ✅ Should work
   - ❌ If grayed out → Trigger still broken

   **Check 2: Are you owner in Share dialog?**
   - Click Share button
   - Look at "People with access"
   - ✅ Should see yourself with:
     - Your name/email
     - Blue "you" badge
     - Purple "Owner" badge
   - ❌ If you don't see yourself → Trigger failed
   - ❌ If role is not "Owner" → Trigger set wrong role

   **Check 3: Can you add members?**
   - Try generating invite link
   - ✅ Should work
   - ❌ If error → RLS policy issue

**If ALL checks pass:**
✅ **COMPLETE FIX SUCCESSFUL!**

**If ANY check fails:**
❌ **Still broken** - send me:
1. Output from DIAGNOSE_NEW_WORKSPACE.sql
2. Output from FIX_NEW_WORKSPACE.sql (especially the test section)
3. Browser console when opening the new workspace
4. Screenshot of Share dialog

### PART 5: Final Verification

Test all permission scenarios:

1. **As Owner:**
   - ✅ Can draw and edit
   - ✅ All tools enabled
   - ✅ Can see Share button
   - ✅ Can generate invite links
   - ✅ Can change member roles
   - ✅ Can remove members

2. **Create and test Viewer:**
   - Add someone as Viewer
   - Have them open workspace
   - ✅ Should see "View Only" badge
   - ✅ Tools grayed out
   - ✅ Cannot draw

3. **Create and test Editor:**
   - Change their role to Editor
   - ✅ Can draw and edit
   - ✅ All tools enabled
   - ❌ Cannot manage members (no trash icons)

## Success Criteria

ALL of these must be TRUE:

- [ ] Diagnostic shows trigger sets role='owner'
- [ ] Fix script test passes
- [ ] Existing workspaces fixed (you're owner)
- [ ] Can edit existing workspaces
- [ ] See yourself in Share dialog for existing
- [ ] NEW workspace: You are owner
- [ ] NEW workspace: You can edit
- [ ] NEW workspace: You see yourself in Share
- [ ] NEW workspace: Have purple "Owner" badge
- [ ] Can add/remove members
- [ ] Can change member roles

## Common Failures

### Failure: "No workspace_member created"

**Cause:** Trigger not firing

**Fix:**
```sql
-- Check trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_workspace_created';

-- If not found, trigger was dropped - re-run FIX_NEW_WORKSPACE.sql
```

### Failure: "Wrong role: viewer"

**Cause:** Trigger inserting wrong role OR default overriding

**Fix:**
```sql
-- Check table default
SELECT column_default
FROM information_schema.columns
WHERE table_name = 'workspace_members' AND column_name = 'role';

-- If shows 'viewer', that's the problem
-- Change default:
ALTER TABLE workspace_members
ALTER COLUMN role SET DEFAULT 'member';

-- Then re-run FIX_NEW_WORKSPACE.sql
```

### Failure: "Test passed but frontend shows viewer"

**Cause:** Frontend not reading role correctly

**Check:**
- Open browser console
- Create new workspace
- Look for log: `User role: ...`
- If says "viewer" but database says "owner", it's a frontend issue
- Check WorkspacePage.tsx line 48

**Debug:**
```javascript
// In browser console after opening workspace
console.log('Current member:', workspace.workspace_members?.find(m => m.user_id === user?.id))
```

## If Everything Fails

Send me:

1. **Full output from DIAGNOSE_NEW_WORKSPACE.sql**
2. **Full output from FIX_NEW_WORKSPACE.sql**
3. **Full output from FIX_MY_WORKSPACES.sql**
4. **Browser console output** when:
   - Creating new workspace
   - Opening the workspace
   - Clicking Share button
5. **Screenshot of Share dialog**
6. **Run this query and send result:**
   ```sql
   SELECT
     w.name,
     w.owner_id,
     wm.user_id,
     wm.role,
     p.email,
     CASE WHEN w.owner_id = auth.uid() THEN '← YOU' ELSE '' END as marker
   FROM workspaces w
   LEFT JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = w.owner_id
   LEFT JOIN profiles p ON p.id = wm.user_id
   WHERE w.owner_id = auth.uid()
   ORDER BY w.created_at DESC
   LIMIT 3;
   ```

I'll know exactly what's broken.
