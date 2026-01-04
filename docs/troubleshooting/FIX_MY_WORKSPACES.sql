-- ============================================
-- QUICK FIX: Make yourself owner of your workspaces
-- Run this to immediately fix workspaces you created
-- ============================================

DO $$
DECLARE
  workspace_record RECORD;
  fixed_count INT := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '🔧 FIXING YOUR WORKSPACES...';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';

  -- Find all workspaces owned by you
  FOR workspace_record IN
    SELECT
      w.id,
      w.name,
      w.created_at,
      wm.role as current_role
    FROM workspaces w
    LEFT JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = w.owner_id
    WHERE w.owner_id = auth.uid()
    ORDER BY w.created_at DESC
  LOOP
    RAISE NOTICE 'Workspace: "%"', workspace_record.name;
    RAISE NOTICE '  ID: %', workspace_record.id;
    RAISE NOTICE '  Created: %', workspace_record.created_at;

    IF workspace_record.current_role IS NULL THEN
      -- You're not in workspace_members at all!
      INSERT INTO workspace_members (workspace_id, user_id, role)
      VALUES (workspace_record.id, auth.uid(), 'owner');

      RAISE NOTICE '  ❌ You were NOT a member - ADDED as owner';
      fixed_count := fixed_count + 1;

    ELSIF workspace_record.current_role != 'owner' THEN
      -- You're a member but with wrong role
      UPDATE workspace_members
      SET role = 'owner'
      WHERE workspace_id = workspace_record.id
        AND user_id = auth.uid();

      RAISE NOTICE '  ❌ Role was "%" - CHANGED to owner', workspace_record.current_role;
      fixed_count := fixed_count + 1;

    ELSE
      RAISE NOTICE '  ✅ Already owner - no fix needed';
    END IF;

    RAISE NOTICE '';
  END LOOP;

  RAISE NOTICE '================================================';
  IF fixed_count > 0 THEN
    RAISE NOTICE '✅ Fixed % workspace(s)', fixed_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Refresh your browser';
    RAISE NOTICE '2. Open any workspace';
    RAISE NOTICE '3. You should now be able to edit';
    RAISE NOTICE '4. Check Share dialog - you should see yourself';
  ELSE
    RAISE NOTICE '✅ All your workspaces already correct';
  END IF;
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
END $$;
