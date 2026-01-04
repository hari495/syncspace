# Test Role Permissions & Access Control

## What I Fixed

### 1. **Database-Level Permission Enforcement** (`FIX_PERMISSIONS.sql`)
   - Created `get_user_role_in_workspace()` function
   - Updated workspace RLS policies to strictly check membership
   - Only owners/editors can modify workspaces
   - Removed members CANNOT see workspace in dashboard
   - Removed members CANNOT access workspace (404/permission denied)

### 2. **Frontend Viewer Restrictions**
   - Viewers see "View Only" badge in header
   - All drawing tools disabled for viewers (grayed out)
   - Color picker hidden for viewers
   - Shapes cannot be dragged/transformed by viewers
   - Viewers can only pan and view

## Testing Steps

### PART 1: Run the SQL Fix

1. Open Supabase SQL Editor
2. Copy entire content of `FIX_PERMISSIONS.sql`
3. Paste and **RUN**
4. Should see:
   ```
   ✅ Created get_user_role_in_workspace function
   ✅ Updated workspace SELECT policy - only current members
   ✅ Workspace UPDATE policy - only owners/editors
   ✅ Workspace has X active members
   ```

### PART 2: Test Removed Member Access

**Scenario:** Remove a member and verify they lose access

1. **As Owner:**
   - Open a workspace
   - Click "Share"
   - Add a test member (or use existing)
   - Note: Test member should see workspace in their dashboard

2. **Remove the member:**
   - In Share dialog, click trash icon next to member
   - Confirm removal
   - Member disappears from list

3. **As Removed Member:**
   - Refresh browser (**IMPORTANT**: Hard refresh with Ctrl+Shift+R)
   - Go to dashboard
   - **Workspace should be GONE** from the list
   - Try accessing workspace by direct URL (copy from owner)
   - Should get "Workspace not found" error

**✅ PASS**: Removed member cannot see or access workspace
**❌ FAIL**: If workspace still visible, check:
   - Did you run FIX_PERMISSIONS.sql?
   - Did you hard refresh browser?
   - Check browser console for errors

### PART 3: Test Viewer Role Restrictions

**Scenario:** Set someone to Viewer and verify they can't edit

1. **As Owner:**
   - Open a workspace
   - Click "Share"
   - Find a member or add one
   - Change their role to **"Viewer"** using dropdown
   - Wait for confirmation

2. **As Viewer:**
   - Refresh browser
   - Open the workspace
   - **Should see:**
     - Yellow/Amber "View Only" badge next to workspace name
     - All tools grayed out (Select, Rectangle, Pencil, Text)
     - No color picker visible
     - Tooltip says "View only - editing disabled"
   - Try clicking any tool → Nothing happens
   - Try dragging shapes → Can't drag
   - Try drawing → Can't draw
   - Can still pan/zoom the canvas

**✅ PASS**: Viewer cannot edit anything
**❌ FAIL**: If viewer can edit:
   - Check browser console for `userRole` value
   - Should show: `userRole: "viewer"`
   - If not "viewer", the role change didn't save

### PART 4: Test Editor Role

**Scenario:** Set someone to Editor and verify they CAN edit

1. **As Owner:**
   - Change member's role to **"Editor"**

2. **As Editor:**
   - Refresh browser
   - Open workspace
   - **Should see:**
     - No "View Only" badge
     - All tools enabled (not grayed out)
     - Color picker visible
     - Can draw, select, edit shapes
     - Can create rectangles, lines, text
     - Can drag and transform shapes

**✅ PASS**: Editor can edit everything
**❌ FAIL**: If editor can't edit, check role value in console

### PART 5: Test Owner Permissions

**Scenario:** Verify owner can't be downgraded/removed

1. **As Owner:**
   - Open Share dialog
   - Find yourself in the list
   - Should have purple "Owner" badge
   - Should NOT have role dropdown (owners can't change their own role)
   - Should NOT have remove button

**✅ PASS**: Owner role is protected
**❌ FAIL**: If you can change your own role, there's a bug

## Common Issues

### Issue: Removed member still sees workspace

**Fix:**
```sql
-- Check RLS policy
SELECT * FROM pg_policies
WHERE tablename = 'workspaces' AND cmd = 'SELECT';

-- Should have policy checking workspace_members
-- If not, re-run FIX_PERMISSIONS.sql
```

**Also try:**
- Hard refresh browser (Ctrl+Shift+R)
- Clear browser cache
- Sign out and sign back in

### Issue: Viewer can still edit

**Check browser console:**
```javascript
// Should log when workspace loads
console.log('User role:', userRole)  // Should be "viewer"
console.log('Can edit:', canEdit)    // Should be false
console.log('Is viewer:', isViewer)  // Should be true
```

If not showing these logs, the role isn't being passed correctly.

**Fix:** Check WorkspacePage.tsx line 48:
```typescript
const userRole = currentMember?.role || 'viewer'
```

### Issue: Editor can't edit

If editor sees grayed out tools, check:
```javascript
console.log('User role:', userRole)  // Should be "editor"
```

If it says "viewer", the role update didn't save to database.

**Fix:**
```sql
-- Check what role they actually have
SELECT wm.role, p.email
FROM workspace_members wm
JOIN profiles p ON p.id = wm.user_id
WHERE wm.workspace_id = 'YOUR_WORKSPACE_ID';
```

## Success Criteria

All of these must be TRUE:

- [ ] Removed member cannot see workspace in dashboard
- [ ] Removed member gets "not found" error on direct access
- [ ] Viewer sees "View Only" badge
- [ ] Viewer has grayed out tools
- [ ] Viewer cannot draw or edit
- [ ] Viewer cannot drag shapes
- [ ] Editor can use all tools
- [ ] Editor can draw and edit
- [ ] Owner has purple "Owner" badge
- [ ] Owner cannot be removed or downgraded

## If Still Broken

Send me:
1. **Which test failed** (e.g., "Part 3 - Viewer can still edit")
2. **Browser console output** when opening workspace as viewer
3. **SQL query result:**
   ```sql
   SELECT
     w.name,
     wm.role,
     p.email
   FROM workspace_members wm
   JOIN workspaces w ON w.id = wm.workspace_id
   JOIN profiles p ON p.id = wm.user_id
   WHERE w.id = 'YOUR_WORKSPACE_ID';
   ```
4. **Screenshot** of Share dialog showing roles

I'll tell you exactly what's broken.
