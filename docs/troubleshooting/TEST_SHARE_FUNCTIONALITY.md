# Test Share Functionality

## Prerequisites

First, make sure you ran this SQL fix for the role constraint:

```sql
ALTER TABLE public.workspace_members
DROP CONSTRAINT IF EXISTS workspace_members_role_check;

ALTER TABLE public.workspace_members
ADD CONSTRAINT workspace_members_role_check
CHECK (role IN ('owner', 'editor', 'viewer', 'member'));
```

## Test Steps

### Step 1: Generate Invite Link

1. Open a workspace
2. Click the **"Share"** button (top-right corner)
3. Click **"Generate Invite Link"**
4. Copy the link

**Expected:**
- ✅ Link should be generated
- ✅ Format: `http://localhost:5173/invite/[workspace-id]-[random-string]`
- ✅ Copy button should show checkmark when clicked

**Possible errors:**
- If you get an error, check browser console and share it with me

---

### Step 2: Test Invite Link (Same Browser)

1. Copy the invite link
2. Open a new incognito/private window
3. Paste the link
4. You'll be redirected to login
5. Sign in with **a different Google account**
6. After signing in, should automatically process the invite

**Expected:**
- ✅ Shows "Processing invite..." screen
- ✅ Then shows "Successfully Joined!" screen
- ✅ Can click "Open Workspace" to view the workspace

**Possible errors:**
- Check browser console if it fails
- Look for errors in the invite acceptance

---

### Step 3: Verify Membership

1. Go back to the original account (workspace owner)
2. Look at the member count in the workspace header
3. Should now show 2 members instead of 1

**Expected:**
- ✅ Member count increased
- ✅ Both users can see each other's cursors
- ✅ Both users can draw and see changes in real-time

---

## Quick Debug Commands

If something fails, open browser console and run:

### Check if invite token was created
```javascript
// In the workspace owner's browser
const { data: tokens, error } = await window.supabase
  .from('invite_tokens')
  .select('*')

console.log('Tokens:', tokens)
```

### Check if user was added to workspace_members
```javascript
// After accepting invite
const workspaceId = 'YOUR_WORKSPACE_ID'

const { data: members, error } = await window.supabase
  .from('workspace_members')
  .select('*')
  .eq('workspace_id', workspaceId)

console.log('Members:', members)
```

### Manually test the use_invite_token function
```javascript
// Copy the invite token from the link
const token = 'PASTE_TOKEN_HERE'

const { data, error } = await window.supabase.rpc('use_invite_token', {
  token_value: token
})

console.log('Result:', { data, error })
```

---

## Common Issues

### Issue 1: "Invalid invite token"
**Cause:** Token doesn't exist in database
**Check:** Did the invite link generate correctly?

### Issue 2: Role constraint violation (23514)
**Cause:** Didn't run the SQL fix
**Fix:** Run the ALTER TABLE command at the top of this file

### Issue 3: "Not authenticated"
**Cause:** Not signed in
**Fix:** Sign in first, then visit the invite link

### Issue 4: Infinite loop / keeps processing
**Cause:** React useEffect running multiple times
**Fix:** Should be fine, but check console for errors

---

## Success Criteria

All of these should be true:

- [ ] Can generate invite link
- [ ] Can copy invite link
- [ ] Invite link redirects to login if not authenticated
- [ ] After login, automatically processes invite
- [ ] Shows success screen
- [ ] New user is added to workspace_members table
- [ ] Member count increases
- [ ] Both users can collaborate in real-time

---

## Report Back

After testing, tell me:

1. Which step did you get to?
2. Did any step fail?
3. What error did you see (if any)?
4. Screenshot of console errors (if any)

Then I can help debug!
