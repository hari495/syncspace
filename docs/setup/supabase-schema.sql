-- SyncSpace Database Schema
-- Run this entire script in Supabase SQL Editor

-- ============================================
-- TABLES
-- ============================================

-- User profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspaces table
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT workspace_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100)
);

-- Workspace members table (many-to-many relationship)
CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'editor', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Invite tokens table
CREATE TABLE public.invite_tokens (
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
-- INDEXES
-- ============================================

CREATE INDEX idx_workspaces_owner ON public.workspaces(owner_id);
CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE INDEX idx_invite_tokens_workspace ON public.invite_tokens(workspace_id);
CREATE INDEX idx_invite_tokens_token ON public.invite_tokens(token);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Workspaces policies
CREATE POLICY "Users can view workspaces they are members of"
  ON public.workspaces FOR SELECT
  USING (
    id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create workspaces"
  ON public.workspaces FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Workspace owners can update their workspaces"
  ON public.workspaces FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Workspace owners can delete their workspaces"
  ON public.workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- Workspace members policies
CREATE POLICY "Users can view members of their workspaces"
  ON public.workspace_members FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

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

-- Invite tokens policies
CREATE POLICY "Users can view invite tokens for their workspaces"
  ON public.invite_tokens FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners/editors can create invite tokens"
  ON public.invite_tokens FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to automatically create workspace owner membership
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

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to validate and use invite token
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

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ SyncSpace database schema created successfully!';
  RAISE NOTICE 'Tables created: profiles, workspaces, workspace_members, invite_tokens';
  RAISE NOTICE 'RLS policies enabled and configured';
  RAISE NOTICE 'Triggers and functions ready';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Enable Google OAuth in Authentication > Providers';
  RAISE NOTICE '2. Test your app with: npm run dev';
END $$;
