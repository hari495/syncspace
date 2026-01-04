-- ============================================
-- DIAGNOSE: Why new workspace owner gets viewer role
-- Run this to see what's happening
-- ============================================

-- Step 1: Check the trigger function
SELECT 'Trigger function code:' as info;
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'handle_new_workspace';

-- Step 2: Check if trigger exists and is active
SELECT 'Trigger status:' as info;
SELECT
  tgname as trigger_name,
  tgenabled as enabled,
  tgtype as type,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgname = 'on_workspace_created';

-- Step 3: Check workspace_members table default
SELECT 'Table definition for workspace_members role column:' as info;
SELECT
  column_name,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'workspace_members'
  AND column_name = 'role';

-- Step 4: Test creating a workspace (dry run)
DO $$
DECLARE
  test_workspace_id UUID;
  test_member_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TESTING NEW WORKSPACE CREATION...';
  RAISE NOTICE '';

  -- Create a test workspace
  INSERT INTO workspaces (name, description, owner_id)
  VALUES ('TEST - DELETE ME', 'Testing workspace creation', auth.uid())
  RETURNING id INTO test_workspace_id;

  RAISE NOTICE '✅ Created test workspace: %', test_workspace_id;

  -- Wait a moment for trigger to fire
  PERFORM pg_sleep(0.1);

  -- Check what got inserted into workspace_members
  SELECT * INTO test_member_record
  FROM workspace_members
  WHERE workspace_id = test_workspace_id
    AND user_id = auth.uid();

  IF test_member_record.id IS NULL THEN
    RAISE NOTICE '❌ CRITICAL: No workspace_member created! Trigger did not fire!';
  ELSE
    RAISE NOTICE '✅ Workspace member created';
    RAISE NOTICE '   Member ID: %', test_member_record.id;
    RAISE NOTICE '   Role: %', test_member_record.role;

    IF test_member_record.role = 'owner' THEN
      RAISE NOTICE '✅ Role is correct (owner)';
    ELSE
      RAISE NOTICE '❌ WRONG ROLE: Expected "owner", got "%"', test_member_record.role;
    END IF;
  END IF;

  -- Clean up test workspace
  DELETE FROM workspaces WHERE id = test_workspace_id;
  RAISE NOTICE '';
  RAISE NOTICE '🧹 Cleaned up test workspace';

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ ERROR during test: %', SQLERRM;
  -- Try to clean up anyway
  IF test_workspace_id IS NOT NULL THEN
    DELETE FROM workspaces WHERE id = test_workspace_id;
  END IF;
END $$;

-- Step 5: Check INSERT policy on workspace_members
SELECT 'INSERT policies on workspace_members:' as info;
SELECT
  policyname,
  permissive,
  roles,
  with_check
FROM pg_policies
WHERE tablename = 'workspace_members'
  AND cmd = 'INSERT';

-- Step 6: Summary
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'DIAGNOSIS COMPLETE';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Check the output above for:';
  RAISE NOTICE '1. Trigger function should set role = ''owner''';
  RAISE NOTICE '2. Trigger should be enabled';
  RAISE NOTICE '3. Test should show role = ''owner''';
  RAISE NOTICE '';
  RAISE NOTICE 'If test shows wrong role or no member:';
  RAISE NOTICE '  → Run FIX_NEW_WORKSPACE.sql';
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
END $$;
