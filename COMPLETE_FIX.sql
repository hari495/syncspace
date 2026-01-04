-- ============================================
-- COMPLETE FIX - Run this AFTER the diagnostic
-- This fixes EVERYTHING properly
-- ============================================

-- STEP 1: Ensure ALL users have profiles
-- ============================================
DO $$
DECLARE
  user_record RECORD;
  created_count INT := 0;
BEGIN
  FOR user_record IN
    SELECT
      u.id,
      u.email,
      u.raw_user_meta_data
    FROM auth.users u
    LEFT JOIN profiles p ON p.id = u.id
    WHERE p.id IS NULL
  LOOP
    INSERT INTO profiles (id, email, full_name, avatar_url)
    VALUES (
      user_record.id,
      user_record.email,
      COALESCE(
        user_record.raw_user_meta_data->>'full_name',
        user_record.raw_user_meta_data->>'name',
        split_part(user_record.email, '@', 1)
      ),
      user_record.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url);

    created_count := created_count + 1;
  END LOOP;

  IF created_count > 0 THEN
    RAISE NOTICE '✅ Created/updated % profiles', created_count;
  ELSE
    RAISE NOTICE '✅ All users have profiles';
  END IF;
END $$;

-- STEP 2: Ensure ALL workspace OWNERS are in workspace_members
-- ============================================
DO $$
DECLARE
  workspace_record RECORD;
  added_count INT := 0;
BEGIN
  FOR workspace_record IN
    SELECT
      w.id as workspace_id,
      w.owner_id,
      w.name
    FROM workspaces w
    LEFT JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = w.owner_id
    WHERE wm.id IS NULL  -- Owner is NOT in workspace_members
  LOOP
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (workspace_record.workspace_id, workspace_record.owner_id, 'owner')
    ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'owner';

    added_count := added_count + 1;
    RAISE NOTICE 'Added owner to workspace: %', workspace_record.name;
  END LOOP;

  IF added_count > 0 THEN
    RAISE NOTICE '✅ Added % workspace owners to workspace_members', added_count;
  ELSE
    RAISE NOTICE '✅ All workspace owners are already members';
  END IF;
END $$;

-- STEP 3: Fix the foreign key constraint
-- ============================================
-- Drop old constraint
ALTER TABLE workspace_members
DROP CONSTRAINT IF EXISTS workspace_members_user_id_fkey;

-- Add new constraint to profiles (not auth.users)
ALTER TABLE workspace_members
ADD CONSTRAINT workspace_members_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

DO $$
BEGIN
  RAISE NOTICE '✅ Foreign key set to profiles.id';
END $$;

-- STEP 4: Fix role constraint
-- ============================================
ALTER TABLE workspace_members
DROP CONSTRAINT IF EXISTS workspace_members_role_check;

ALTER TABLE workspace_members
ADD CONSTRAINT workspace_members_role_check
CHECK (role IN ('owner', 'editor', 'viewer', 'member'));

DO $$
BEGIN
  RAISE NOTICE '✅ Role constraint updated';
END $$;

-- STEP 5: Fix ALL RLS policies
-- ============================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles of workspace members" ON public.profiles;

DROP POLICY IF EXISTS "Users can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view members of workspaces they belong to" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can add members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can remove members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can update member roles" ON public.workspace_members;

-- PROFILES: Allow viewing own profile + workspace members' profiles
CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  USING (
    -- Can always see own profile
    auth.uid() = id
    OR
    -- Can see profiles of users in same workspaces
    EXISTS (
      SELECT 1
      FROM workspace_members wm1
      JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
      WHERE wm1.user_id = auth.uid()
        AND wm2.user_id = profiles.id
    )
  );

-- PROFILES: Allow updating own profile
CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- PROFILES: Allow inserting own profile
CREATE POLICY "profiles_insert_policy"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DO $$
BEGIN
  RAISE NOTICE '✅ Profiles policies created';
END $$;

-- WORKSPACE_MEMBERS: Allow viewing members of workspaces you belong to
CREATE POLICY "workspace_members_select_policy"
  ON public.workspace_members FOR SELECT
  USING (
    -- Can see members of workspaces you're in
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- WORKSPACE_MEMBERS: Allow workspace owners to insert members
CREATE POLICY "workspace_members_insert_policy"
  ON public.workspace_members FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
    OR
    -- Allow triggers to insert (for new workspace creation)
    auth.uid() IS NOT NULL
  );

-- WORKSPACE_MEMBERS: Allow workspace owners to update member roles
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

-- WORKSPACE_MEMBERS: Allow workspace owners to delete members
CREATE POLICY "workspace_members_delete_policy"
  ON public.workspace_members FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

DO $$
BEGIN
  RAISE NOTICE '✅ Workspace members policies created';
END $$;

-- STEP 6: Verify everything
-- ============================================
DO $$
DECLARE
  profile_count INT;
  member_count INT;
  fk_exists BOOLEAN;
  policies_count INT;
BEGIN
  -- Check profiles exist
  SELECT COUNT(*) INTO profile_count
  FROM auth.users u
  JOIN profiles p ON p.id = u.id;

  RAISE NOTICE '📊 Found % profiles', profile_count;

  -- Check workspace members
  SELECT COUNT(*) INTO member_count
  FROM workspace_members wm
  JOIN profiles p ON p.id = wm.user_id;

  RAISE NOTICE '📊 Found % workspace members (all have profiles)', member_count;

  -- Check FK
  SELECT EXISTS(
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'workspace_members_user_id_fkey'
      AND table_name = 'workspace_members'
  ) INTO fk_exists;

  IF fk_exists THEN
    RAISE NOTICE '✅ Foreign key exists';
  ELSE
    RAISE NOTICE '❌ Foreign key MISSING';
  END IF;

  -- Check policies
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies
  WHERE tablename IN ('workspace_members', 'profiles');

  RAISE NOTICE '📊 Found % RLS policies', policies_count;

  IF policies_count >= 7 THEN
    RAISE NOTICE '✅ All policies created';
  ELSE
    RAISE NOTICE '⚠️ Only % policies found (expected at least 7)', policies_count;
  END IF;
END $$;

-- STEP 7: Test the actual query
-- ============================================
DO $$
DECLARE
  test_result RECORD;
  result_count INT := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TESTING: Querying workspace_members with profiles...';

  FOR test_result IN
    SELECT
      wm.role,
      p.email,
      CASE WHEN wm.user_id = auth.uid() THEN '← YOU' ELSE '' END as marker
    FROM workspace_members wm
    JOIN profiles p ON p.id = wm.user_id
    WHERE wm.workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid() LIMIT 1
    )
    ORDER BY wm.joined_at
  LOOP
    result_count := result_count + 1;
    RAISE NOTICE '  % - % %', test_result.role, test_result.email, test_result.marker;
  END LOOP;

  IF result_count = 0 THEN
    RAISE NOTICE '❌ Query returned NO results - something is still wrong!';
  ELSE
    RAISE NOTICE '✅ Query returned % member(s)', result_count;
  END IF;
END $$;

-- ============================================
-- FINAL MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ COMPLETE FIX APPLIED';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Refresh your browser (clear cache)';
  RAISE NOTICE '2. Open a workspace you own';
  RAISE NOTICE '3. Click Share button';
  RAISE NOTICE '4. You should see yourself + all members';
  RAISE NOTICE '5. Try changing a member''s role';
  RAISE NOTICE '6. Try removing a member';
  RAISE NOTICE '';
  RAISE NOTICE 'If still broken, run DIAGNOSE_MEMBER_ISSUES.sql';
  RAISE NOTICE 'and send me the output.';
  RAISE NOTICE '================================================';
END $$;
