-- FINAL FIX: Breaking RLS recursion with SECURITY DEFINER function
-- Run this in your Supabase SQL Editor

-- First, drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners can update their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners can delete their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view members of workspaces they belong to" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can add members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can remove members" ON public.workspace_members;

-- Create a SECURITY DEFINER function to check workspace membership without triggering RLS
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

-- Workspaces policies (using the SECURITY DEFINER function)
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

-- Workspace members policies (using SECURITY DEFINER function to avoid recursion)
-- Users can see members of workspaces they belong to
CREATE POLICY "Users can view workspace members"
  ON public.workspace_members FOR SELECT
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
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

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID, UUID) TO anon;
