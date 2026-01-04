-- ============================================
-- FIX WORKSPACE MEMBER ISSUES
-- Run this in Supabase SQL Editor
-- ============================================

-- Issue 1: Add foreign key from workspace_members to profiles
-- This allows PostgREST to join workspace_members with profiles

-- First, we need to ensure all existing user_ids in workspace_members have profiles
DO $$
DECLARE
  missing_profile RECORD;
BEGIN
  FOR missing_profile IN
    SELECT DISTINCT wm.user_id, u.email, u.raw_user_meta_data
    FROM workspace_members wm
    JOIN auth.users u ON u.id = wm.user_id
    LEFT JOIN profiles p ON p.id = wm.user_id
    WHERE p.id IS NULL
  LOOP
    -- Create missing profile
    INSERT INTO profiles (id, email, full_name, avatar_url)
    VALUES (
      missing_profile.user_id,
      missing_profile.email,
      COALESCE(missing_profile.raw_user_meta_data->>'full_name', missing_profile.raw_user_meta_data->>'name'),
      missing_profile.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Created missing profile for user: %', missing_profile.email;
  END LOOP;
END $$;

-- Now add the foreign key constraint
ALTER TABLE workspace_members
DROP CONSTRAINT IF EXISTS workspace_members_user_id_fkey;

ALTER TABLE workspace_members
ADD CONSTRAINT workspace_members_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

RAISE NOTICE '✅ Added foreign key from workspace_members to profiles';

-- Issue 2: Add UPDATE policy for workspace_members so owners can change roles
DROP POLICY IF EXISTS "Workspace owners can update member roles" ON public.workspace_members;

CREATE POLICY "Workspace owners can update member roles"
  ON public.workspace_members FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces
      WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM public.workspaces
      WHERE owner_id = auth.uid()
    )
  );

RAISE NOTICE '✅ Added UPDATE policy for workspace members';

-- Issue 3: Update the role check constraint to include 'member'
ALTER TABLE workspace_members
DROP CONSTRAINT IF EXISTS workspace_members_role_check;

ALTER TABLE workspace_members
ADD CONSTRAINT workspace_members_role_check
CHECK (role IN ('owner', 'editor', 'viewer', 'member'));

RAISE NOTICE '✅ Updated role constraint to include member';

-- Issue 4: Ensure profiles policy allows viewing other members' profiles
DROP POLICY IF EXISTS "Users can view profiles of workspace members" ON public.profiles;

CREATE POLICY "Users can view profiles of workspace members"
  ON public.profiles FOR SELECT
  USING (
    -- Users can see their own profile
    auth.uid() = id
    OR
    -- Users can see profiles of people in their workspaces
    id IN (
      SELECT wm2.user_id
      FROM workspace_members wm1
      JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
      WHERE wm1.user_id = auth.uid()
    )
  );

RAISE NOTICE '✅ Added policy to view workspace member profiles';

-- Verify the fix
DO $$
DECLARE
  fk_exists BOOLEAN;
  policy_exists BOOLEAN;
BEGIN
  -- Check foreign key
  SELECT EXISTS(
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'workspace_members_user_id_fkey'
    AND table_name = 'workspace_members'
  ) INTO fk_exists;

  IF fk_exists THEN
    RAISE NOTICE '✅ Foreign key verified';
  ELSE
    RAISE NOTICE '❌ Foreign key NOT found';
  END IF;

  -- Check UPDATE policy
  SELECT EXISTS(
    SELECT 1 FROM pg_policies
    WHERE tablename = 'workspace_members'
    AND policyname = 'Workspace owners can update member roles'
  ) INTO policy_exists;

  IF policy_exists THEN
    RAISE NOTICE '✅ UPDATE policy verified';
  ELSE
    RAISE NOTICE '❌ UPDATE policy NOT found';
  END IF;
END $$;

-- ============================================
-- SUMMARY
-- ============================================
-- 1. ✅ Added foreign key: workspace_members.user_id → profiles.id
-- 2. ✅ Added UPDATE policy for changing member roles
-- 3. ✅ Updated role constraint to include 'member'
-- 4. ✅ Added policy to view other members' profiles
--
-- You should now be able to:
-- - See all workspace members (including owner)
-- - Remove members as owner
-- - Change member roles as owner
-- ============================================
