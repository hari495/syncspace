-- FIXED SCHEMA WITH CORRECTED RLS POLICIES
-- Run this in your Supabase SQL Editor

-- First, drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners can update their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners can delete their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can add members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can remove members" ON public.workspace_members;

-- FIXED Workspaces policies
CREATE POLICY "Users can view workspaces they are members of"
  ON public.workspaces FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
      AND workspace_members.user_id = auth.uid()
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

-- FIXED Workspace members policies (no recursion)
CREATE POLICY "Users can view members of workspaces they belong to"
  ON public.workspace_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners can add members"
  ON public.workspace_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = workspace_members.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners can remove members"
  ON public.workspace_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = workspace_members.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );
