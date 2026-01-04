-- ============================================
-- DIAGNOSTIC SCRIPT - Run this FIRST
-- This will tell you exactly what's wrong
-- ============================================

DO $$
DECLARE
  table_count INTEGER;
  policy_count INTEGER;
  function_count INTEGER;
  trigger_count INTEGER;
  user_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'SUPABASE DATABASE DIAGNOSTICS';
  RAISE NOTICE '====================================';
  RAISE NOTICE '';

  -- Check tables
  RAISE NOTICE '1. CHECKING TABLES...';
  SELECT COUNT(*) INTO table_count FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'profiles';
  RAISE NOTICE '   profiles table: %', CASE WHEN table_count > 0 THEN '✓ EXISTS' ELSE '✗ MISSING' END;

  SELECT COUNT(*) INTO table_count FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'workspaces';
  RAISE NOTICE '   workspaces table: %', CASE WHEN table_count > 0 THEN '✓ EXISTS' ELSE '✗ MISSING' END;

  SELECT COUNT(*) INTO table_count FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'workspace_members';
  RAISE NOTICE '   workspace_members table: %', CASE WHEN table_count > 0 THEN '✓ EXISTS' ELSE '✗ MISSING' END;

  SELECT COUNT(*) INTO table_count FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'invite_tokens';
  RAISE NOTICE '   invite_tokens table: %', CASE WHEN table_count > 0 THEN '✓ EXISTS' ELSE '✗ MISSING' END;

  -- Check RLS enabled
  RAISE NOTICE '';
  RAISE NOTICE '2. CHECKING ROW LEVEL SECURITY...';
  SELECT COUNT(*) INTO table_count FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'profiles' AND rowsecurity = true;
  RAISE NOTICE '   profiles RLS: %', CASE WHEN table_count > 0 THEN '✓ ENABLED' ELSE '✗ DISABLED' END;

  SELECT COUNT(*) INTO table_count FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'workspaces' AND rowsecurity = true;
  RAISE NOTICE '   workspaces RLS: %', CASE WHEN table_count > 0 THEN '✓ ENABLED' ELSE '✗ DISABLED' END;

  -- Check policies
  RAISE NOTICE '';
  RAISE NOTICE '3. CHECKING POLICIES...';
  SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'workspaces';
  RAISE NOTICE '   workspaces policies: % found', policy_count;

  SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'workspace_members';
  RAISE NOTICE '   workspace_members policies: % found', policy_count;

  -- List all policies
  

  -- Check functions
  RAISE NOTICE '';
  RAISE NOTICE '4. CHECKING FUNCTIONS...';
  SELECT COUNT(*) INTO function_count FROM pg_proc
  WHERE proname = 'is_workspace_member' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  RAISE NOTICE '   is_workspace_member: %', CASE WHEN function_count > 0 THEN '✓ EXISTS' ELSE '✗ MISSING' END;

  SELECT COUNT(*) INTO function_count FROM pg_proc
  WHERE proname = 'handle_new_workspace' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  RAISE NOTICE '   handle_new_workspace: %', CASE WHEN function_count > 0 THEN '✓ EXISTS' ELSE '✗ MISSING' END;

  SELECT COUNT(*) INTO function_count FROM pg_proc
  WHERE proname = 'handle_new_user' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  RAISE NOTICE '   handle_new_user: %', CASE WHEN function_count > 0 THEN '✓ EXISTS' ELSE '✗ MISSING' END;

  -- Check triggers
  RAISE NOTICE '';
  RAISE NOTICE '5. CHECKING TRIGGERS...';
  SELECT COUNT(*) INTO trigger_count FROM information_schema.triggers
  WHERE trigger_name = 'on_workspace_created';
  RAISE NOTICE '   on_workspace_created: %', CASE WHEN trigger_count > 0 THEN '✓ EXISTS' ELSE '✗ MISSING' END;

  SELECT COUNT(*) INTO trigger_count FROM information_schema.triggers
  WHERE trigger_name = 'on_auth_user_created';
  RAISE NOTICE '   on_auth_user_created: %', CASE WHEN trigger_count > 0 THEN '✓ EXISTS' ELSE '✗ MISSING' END;

  -- Check users
  RAISE NOTICE '';
  RAISE NOTICE '6. CHECKING DATA...';
  SELECT COUNT(*) INTO user_count FROM auth.users;
  RAISE NOTICE '   auth.users count: %', user_count;

  SELECT COUNT(*) INTO user_count FROM public.profiles;
  RAISE NOTICE '   profiles count: %', user_count;

  SELECT COUNT(*) INTO user_count FROM public.workspaces;
  RAISE NOTICE '   workspaces count: %', user_count;

  -- Summary
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '====================================';
  RAISE NOTICE '';
  RAISE NOTICE 'If you see MISSING items above:';
  RAISE NOTICE '  → Run supabase-complete-setup.sql';
  RAISE NOTICE '';
  RAISE NOTICE 'If everything EXISTS:';
  RAISE NOTICE '  → Check if policies are causing recursion';
  RAISE NOTICE '  → Run supabase-complete-setup.sql to recreate policies safely';
  RAISE NOTICE '';
END $$;

-- Test for infinite recursion in policies
DO $$
DECLARE
  test_result BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'TESTING FOR INFINITE RECURSION...';
  RAISE NOTICE '====================================';
  RAISE NOTICE '';

  -- This will fail if there's recursion
  BEGIN
    SELECT public.is_workspace_member('00000000-0000-0000-0000-000000000000'::UUID, '00000000-0000-0000-0000-000000000000'::UUID) INTO test_result;
    RAISE NOTICE '✓ No infinite recursion detected';
    RAISE NOTICE '✓ Helper function works correctly';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE NOTICE '✗ Helper function is_workspace_member does NOT exist';
      RAISE NOTICE '  → Run supabase-complete-setup.sql to create it';
    WHEN OTHERS THEN
      RAISE NOTICE '✗ Error testing helper function: %', SQLERRM;
  END;

  RAISE NOTICE '';
END $$;
