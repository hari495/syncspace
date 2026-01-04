-- ============================================
-- FIX: workspace_members role column default
-- This might be causing viewer role by default
-- ============================================

-- Check current default
DO $$
DECLARE
  current_default TEXT;
BEGIN
  SELECT column_default INTO current_default
  FROM information_schema.columns
  WHERE table_name = 'workspace_members'
    AND column_name = 'role';

  RAISE NOTICE '';
  RAISE NOTICE '🔍 Current default for role column: %', current_default;

  IF current_default = '''viewer''::text' OR current_default LIKE '%viewer%' THEN
    RAISE NOTICE '❌ DEFAULT IS VIEWER - This is the problem!';
  ELSIF current_default = '''member''::text' OR current_default LIKE '%member%' THEN
    RAISE NOTICE '✅ Default is member (acceptable)';
  ELSIF current_default IS NULL OR current_default = 'NULL' THEN
    RAISE NOTICE '⚠️ No default set';
  ELSE
    RAISE NOTICE 'ℹ️ Default: %', current_default;
  END IF;
  RAISE NOTICE '';
END $$;

-- Remove any existing default
ALTER TABLE workspace_members
ALTER COLUMN role DROP DEFAULT;

-- Set proper default (member, not viewer)
ALTER TABLE workspace_members
ALTER COLUMN role SET DEFAULT 'member';

DO $$
BEGIN
  RAISE NOTICE '✅ Set role default to ''member''';
  RAISE NOTICE '';
  RAISE NOTICE 'Note: The trigger will still set role=''owner'' for workspace creators';
  RAISE NOTICE 'The default only matters for manual INSERTs';
  RAISE NOTICE '';
END $$;
