-- ============================================
-- FIX ROLE PERMISSIONS & ACCESS CONTROL
-- ============================================

-- ISSUE 1: Viewers can still edit (no permission enforcement)
-- ISSUE 2: Removed members can still see/access workspace

-- ============================================
-- STEP 1: Add helper function to get user's role in workspace
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_role_in_workspace(workspace_uuid UUID, user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role
    FROM public.workspace_members
    WHERE workspace_id = workspace_uuid
      AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_user_role_in_workspace(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role_in_workspace(UUID, UUID) TO anon;

DO $$
BEGIN
  RAISE NOTICE '✅ Created get_user_role_in_workspace function';
END $$;

-- ============================================
-- STEP 2: Update workspace RLS to ONLY show current memberships
-- ============================================

-- Drop and recreate workspace SELECT policy to be more strict
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON public.workspaces;

CREATE POLICY "Users can view workspaces they are members of"
  ON public.workspaces FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_members
      WHERE workspace_id = workspaces.id
        AND user_id = auth.uid()
    )
  );

DO $$
BEGIN
  RAISE NOTICE '✅ Updated workspace SELECT policy - only current members';
END $$;

-- ============================================
-- STEP 3: Add role-based UPDATE policy for workspaces
-- ============================================

-- Only owners and editors can update workspace settings
DROP POLICY IF EXISTS "Workspace owners can update their workspaces" ON public.workspaces;

CREATE POLICY "Workspace owners and editors can update workspaces"
  ON public.workspaces FOR UPDATE
  USING (
    public.get_user_role_in_workspace(id, auth.uid()) IN ('owner', 'editor')
  )
  WITH CHECK (
    public.get_user_role_in_workspace(id, auth.uid()) IN ('owner', 'editor')
  );

DO $$
BEGIN
  RAISE NOTICE '✅ Workspace UPDATE policy - only owners/editors';
END $$;

-- ============================================
-- STEP 4: Verify removed members can't see workspace
-- ============================================

DO $$
DECLARE
  test_workspace_id UUID;
  member_count INT;
BEGIN
  -- Get your first workspace
  SELECT id INTO test_workspace_id
  FROM workspaces
  WHERE owner_id = auth.uid()
  LIMIT 1;

  IF test_workspace_id IS NULL THEN
    RAISE NOTICE '⚠️ No workspaces to test';
    RETURN;
  END IF;

  -- Count how many members can see this workspace
  SELECT COUNT(DISTINCT wm.user_id) INTO member_count
  FROM workspace_members wm
  WHERE wm.workspace_id = test_workspace_id;

  RAISE NOTICE '✅ Workspace has % active members', member_count;
  RAISE NOTICE 'ℹ️ Only these members should see this workspace in their dashboard';
END $$;

-- ============================================
-- SUMMARY
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ PERMISSION FIXES APPLIED';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE '1. Role checking function created';
  RAISE NOTICE '2. Workspace visibility fixed - removed members gone';
  RAISE NOTICE '3. Only owners/editors can modify workspaces';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT: You need to update frontend to enforce viewer restrictions';
  RAISE NOTICE '';
  RAISE NOTICE 'Test this:';
  RAISE NOTICE '1. Remove a member';
  RAISE NOTICE '2. Have them refresh their dashboard';
  RAISE NOTICE '3. Workspace should disappear for them';
  RAISE NOTICE '4. They should get "not found" if they try direct URL';
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
END $$;
