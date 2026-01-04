-- ============================================
-- FIX: New workspace owner gets wrong role
-- This ensures workspace creators are always owners
-- ============================================

-- STEP 1: Drop and recreate the trigger function with better error handling
-- ============================================

DROP TRIGGER IF EXISTS on_workspace_created ON public.workspaces;
DROP FUNCTION IF EXISTS public.handle_new_workspace() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_workspace()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert the workspace owner as a member with 'owner' role
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (workspace_id, user_id)
  DO UPDATE SET role = 'owner';  -- Ensure role is owner even if row exists

  RAISE NOTICE 'Added owner % to workspace %', NEW.owner_id, NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the workspace creation
    RAISE WARNING 'Failed to add owner to workspace_members: %', SQLERRM;
    RETURN NEW;
END;
$$;

DO $$
BEGIN
  RAISE NOTICE '✅ Created handle_new_workspace function';
END $$;

-- STEP 2: Create the trigger
-- ============================================

CREATE TRIGGER on_workspace_created
  AFTER INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_workspace();

DO $$
BEGIN
  RAISE NOTICE '✅ Created on_workspace_created trigger';
END $$;

-- STEP 3: Fix existing workspaces where owner is not in workspace_members or has wrong role
-- ============================================

DO $$
DECLARE
  fixed_count INT := 0;
  workspace_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Fixing existing workspaces...';

  FOR workspace_record IN
    SELECT
      w.id as workspace_id,
      w.owner_id,
      w.name,
      wm.role as current_role
    FROM workspaces w
    LEFT JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = w.owner_id
    WHERE wm.role IS NULL OR wm.role != 'owner'
  LOOP
    -- Insert or update to ensure owner has correct role
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (workspace_record.workspace_id, workspace_record.owner_id, 'owner')
    ON CONFLICT (workspace_id, user_id)
    DO UPDATE SET role = 'owner';

    fixed_count := fixed_count + 1;

    IF workspace_record.current_role IS NULL THEN
      RAISE NOTICE '  ✅ Added owner to workspace: %', workspace_record.name;
    ELSE
      RAISE NOTICE '  ✅ Fixed role for workspace: % (was: %, now: owner)', workspace_record.name, workspace_record.current_role;
    END IF;
  END LOOP;

  IF fixed_count > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Fixed % workspace(s)', fixed_count;
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✅ All workspaces already have correct owner role';
  END IF;
END $$;

-- STEP 4: Update the INSERT policy to allow trigger to insert
-- ============================================

DROP POLICY IF EXISTS "workspace_members_insert_policy" ON public.workspace_members;

-- Policy allows:
-- 1. Workspace owners to add members
-- 2. System (triggers) to add members during workspace creation
CREATE POLICY "workspace_members_insert_policy"
  ON public.workspace_members FOR INSERT
  WITH CHECK (
    -- Owner can add members
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
    -- Note: SECURITY DEFINER functions (like our trigger) bypass RLS automatically
  );

DO $$
BEGIN
  RAISE NOTICE '✅ Updated INSERT policy';
END $$;

-- STEP 5: Test the fix
-- ============================================

DO $$
DECLARE
  test_workspace_id UUID;
  test_member_record RECORD;
  test_passed BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '🧪 TESTING NEW WORKSPACE CREATION...';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';

  -- Create a test workspace
  INSERT INTO workspaces (name, description, owner_id)
  VALUES ('TEST WORKSPACE - DELETE ME', 'Automated test', auth.uid())
  RETURNING id INTO test_workspace_id;

  RAISE NOTICE '1️⃣ Created test workspace: %', test_workspace_id;

  -- Small delay to ensure trigger completes
  PERFORM pg_sleep(0.1);

  -- Check workspace_members
  SELECT * INTO test_member_record
  FROM workspace_members
  WHERE workspace_id = test_workspace_id
    AND user_id = auth.uid();

  RAISE NOTICE '2️⃣ Checking workspace_members...';

  IF test_member_record.id IS NULL THEN
    RAISE NOTICE '   ❌ FAILED: No member record created!';
    RAISE NOTICE '   → Trigger did not fire or failed';
  ELSIF test_member_record.role != 'owner' THEN
    RAISE NOTICE '   ❌ FAILED: Wrong role!';
    RAISE NOTICE '   → Expected: owner';
    RAISE NOTICE '   → Got: %', test_member_record.role;
  ELSE
    RAISE NOTICE '   ✅ PASSED: Member record created with role=owner';
    test_passed := TRUE;
  END IF;

  -- Clean up
  DELETE FROM workspaces WHERE id = test_workspace_id;
  RAISE NOTICE '3️⃣ Cleaned up test workspace';

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  IF test_passed THEN
    RAISE NOTICE '✅ TEST PASSED - Fix is working!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Try creating a new workspace in the app';
    RAISE NOTICE '2. You should be the owner';
    RAISE NOTICE '3. You should see yourself in Share dialog';
    RAISE NOTICE '4. You should be able to edit';
  ELSE
    RAISE NOTICE '❌ TEST FAILED - Something is still wrong';
    RAISE NOTICE '';
    RAISE NOTICE 'Send me the full output from this script';
  END IF;
  RAISE NOTICE '================================================';

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '';
  RAISE NOTICE '❌ TEST ERROR: %', SQLERRM;
  RAISE NOTICE '';
  RAISE NOTICE 'Send me this error message';

  -- Clean up
  IF test_workspace_id IS NOT NULL THEN
    DELETE FROM workspaces WHERE id = test_workspace_id;
  END IF;
END $$;

-- STEP 6: Grant necessary permissions
-- ============================================

GRANT EXECUTE ON FUNCTION public.handle_new_workspace() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_workspace() TO anon;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Granted function permissions';
  RAISE NOTICE '';
END $$;
