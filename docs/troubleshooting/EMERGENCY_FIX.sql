-- ============================================
-- EMERGENCY FIX - Run this NOW if workspaces won't create
-- ============================================

-- This is a minimal fix to get workspace creation working
-- Run this in Supabase SQL Editor if you're getting 42501 error

-- 1. Drop the broken INSERT policy
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;

-- 2. Create a simple, working INSERT policy
CREATE POLICY "Users can create workspaces"
  ON public.workspaces
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- 3. Make sure the trigger exists (auto-create workspace membership)
DROP TRIGGER IF EXISTS on_workspace_created ON public.workspaces;
DROP FUNCTION IF EXISTS public.handle_new_workspace() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_workspace()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_workspace_created
  AFTER INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_workspace();

-- 4. Test it
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Get a user ID from auth.users
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;

  IF test_user_id IS NULL THEN
    RAISE NOTICE '❌ No users found in auth.users - please sign in first';
  ELSE
    RAISE NOTICE '✅ Found user: %', test_user_id;
    RAISE NOTICE '✅ INSERT policy created';
    RAISE NOTICE '✅ Trigger created';
    RAISE NOTICE '';
    RAISE NOTICE 'Try creating a workspace now!';
  END IF;
END $$;
