-- ============================================
-- COMPLETE SYNCSPACE DATABASE SETUP
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- First, clean up existing objects
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners can update their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners can delete their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view members of workspaces they belong to" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can add members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can remove members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view invite tokens for their workspaces" ON public.invite_tokens;
DROP POLICY IF EXISTS "Workspace owners/editors can create invite tokens" ON public.invite_tokens;

DROP TRIGGER IF EXISTS on_workspace_created ON public.workspaces;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP FUNCTION IF EXISTS public.handle_new_workspace() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.use_invite_token(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.is_workspace_member(UUID, UUID) CASCADE;

-- Don't drop tables - preserve existing data
-- DROP TABLE IF EXISTS public.invite_tokens CASCADE;
-- DROP TABLE IF EXISTS public.workspace_members CASCADE;
-- DROP TABLE IF EXISTS public.workspaces CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================
-- CREATE TABLES (if they don't exist)
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT workspace_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100)
);

CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'editor', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_max_uses CHECK (max_uses IS NULL OR max_uses > 0)
);

-- ============================================
-- CREATE INDEXES (if they don't exist)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON public.workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_workspace ON public.invite_tokens(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON public.invite_tokens(token);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTION (SECURITY DEFINER to avoid recursion)
-- ============================================

CREATE OR REPLACE FUNCTION public.is_workspace_member(workspace_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = workspace_uuid
    AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID, UUID) TO anon;

-- ============================================
-- PROFILES POLICIES
-- ============================================

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- WORKSPACES POLICIES
-- ============================================

CREATE POLICY "Users can view workspaces they are members of"
  ON public.workspaces FOR SELECT
  USING (public.is_workspace_member(id, auth.uid()));

CREATE POLICY "Users can create workspaces"
  ON public.workspaces FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Workspace owners can update their workspaces"
  ON public.workspaces FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Workspace owners can delete their workspaces"
  ON public.workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================
-- WORKSPACE MEMBERS POLICIES
-- ============================================

CREATE POLICY "Users can view workspace members"
  ON public.workspace_members FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace owners can add members"
  ON public.workspace_members FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM public.workspaces
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners can remove members"
  ON public.workspace_members FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces
      WHERE owner_id = auth.uid()
    )
  );

-- ============================================
-- INVITE TOKENS POLICIES
-- ============================================

CREATE POLICY "Users can view invite tokens for their workspaces"
  ON public.invite_tokens FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace owners/editors can create invite tokens"
  ON public.invite_tokens FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, just return
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Auto-create workspace membership when workspace is created
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

-- Invite token usage function
CREATE OR REPLACE FUNCTION public.use_invite_token(token_value TEXT)
RETURNS UUID AS $$
DECLARE
  invite_record RECORD;
  workspace_id_result UUID;
BEGIN
  -- Get and lock the invite token
  SELECT * INTO invite_record
  FROM public.invite_tokens
  WHERE token = token_value
  FOR UPDATE;

  -- Validate token exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invite token';
  END IF;

  -- Check expiration
  IF invite_record.expires_at IS NOT NULL AND invite_record.expires_at < NOW() THEN
    RAISE EXCEPTION 'Invite token has expired';
  END IF;

  -- Check max uses
  IF invite_record.max_uses IS NOT NULL AND invite_record.current_uses >= invite_record.max_uses THEN
    RAISE EXCEPTION 'Invite token has reached maximum uses';
  END IF;

  -- Add user to workspace (ignore if already a member)
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (invite_record.workspace_id, auth.uid(), 'member')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  -- Increment usage count
  UPDATE public.invite_tokens
  SET current_uses = current_uses + 1
  WHERE id = invite_record.id;

  RETURN invite_record.workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.use_invite_token(TEXT) TO authenticated;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ SyncSpace database setup complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables: profiles, workspaces, workspace_members, invite_tokens';
  RAISE NOTICE 'RLS: Enabled with non-recursive policies';
  RAISE NOTICE 'Triggers: Auto-create profiles and workspace memberships';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Go to Authentication > Providers in Supabase dashboard';
  RAISE NOTICE '2. Enable Google OAuth provider';
  RAISE NOTICE '3. Add your OAuth credentials';
  RAISE NOTICE '4. Add authorized redirect URL: http://localhost:5173/dashboard';
  RAISE NOTICE '5. Test your app: npm run dev';
  RAISE NOTICE '';
END $$;
