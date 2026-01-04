-- ============================================
-- DIAGNOSTIC SCRIPT - Run this FIRST
-- This will show us exactly what's wrong
-- ============================================

-- 1. Check if you have a profile
SELECT 'Your profile:' as section;
SELECT id, email, full_name
FROM profiles
WHERE id = auth.uid();

-- If no rows, you don't have a profile!

-- 2. Check all your workspaces
SELECT 'Your workspaces (as owner):' as section;
SELECT id, name, owner_id, created_at
FROM workspaces
WHERE owner_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check workspace_members for YOUR workspaces
SELECT 'Members in your workspaces:' as section;
SELECT
  w.name as workspace_name,
  wm.user_id,
  wm.role,
  wm.joined_at,
  CASE WHEN wm.user_id = auth.uid() THEN '← YOU' ELSE '' END as is_you
FROM workspaces w
LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
WHERE w.owner_id = auth.uid()
ORDER BY w.name, wm.joined_at;

-- If you don't see yourself (YOU), the trigger didn't work!

-- 4. Check if profiles exist for all members
SELECT 'Members without profiles:' as section;
SELECT
  wm.user_id,
  u.email,
  'NO PROFILE!' as issue
FROM workspace_members wm
JOIN auth.users u ON u.id = wm.user_id
LEFT JOIN profiles p ON p.id = wm.user_id
WHERE p.id IS NULL;

-- Should be empty!

-- 5. Check foreign keys
SELECT 'Foreign keys on workspace_members:' as section;
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'workspace_members'
  AND tc.constraint_type = 'FOREIGN KEY';

-- Should show user_id → profiles.id

-- 6. Check RLS policies on workspace_members
SELECT 'RLS Policies on workspace_members:' as section;
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'workspace_members'
ORDER BY cmd, policyname;

-- 7. Check RLS policies on profiles
SELECT 'RLS Policies on profiles:' as section;
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- 8. Test the actual query that the frontend uses
SELECT 'Testing frontend query (workspace_members with profiles):' as section;
SELECT
  wm.id,
  wm.workspace_id,
  wm.user_id,
  wm.role,
  wm.joined_at,
  p.id as profile_id,
  p.email,
  p.full_name,
  p.avatar_url
FROM workspace_members wm
LEFT JOIN profiles p ON p.id = wm.user_id
WHERE wm.workspace_id IN (
  SELECT id FROM workspaces WHERE owner_id = auth.uid()
)
ORDER BY wm.joined_at;

-- This should show ALL members including you!

-- 9. Test if you can UPDATE a member's role (dry run)
DO $$
DECLARE
  test_workspace_id UUID;
  test_member_id UUID;
BEGIN
  -- Get one of your workspaces
  SELECT id INTO test_workspace_id
  FROM workspaces
  WHERE owner_id = auth.uid()
  LIMIT 1;

  IF test_workspace_id IS NULL THEN
    RAISE NOTICE '❌ You have no workspaces!';
    RETURN;
  END IF;

  -- Get a non-owner member
  SELECT user_id INTO test_member_id
  FROM workspace_members
  WHERE workspace_id = test_workspace_id
    AND user_id != auth.uid()
  LIMIT 1;

  IF test_member_id IS NULL THEN
    RAISE NOTICE 'ℹ️ No other members to test UPDATE on';
    RETURN;
  END IF;

  RAISE NOTICE 'Would update member % in workspace %', test_member_id, test_workspace_id;

  -- Test UPDATE permission (we won't actually change anything)
  -- This will fail if RLS blocks it
  PERFORM *
  FROM workspace_members
  WHERE workspace_id = test_workspace_id
    AND user_id = test_member_id
  FOR UPDATE;

  RAISE NOTICE '✅ UPDATE permission OK';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE '❌ UPDATE permission DENIED';
END $$;

-- ============================================
-- COPY ALL OUTPUT AND SEND IT TO ME
-- ============================================
