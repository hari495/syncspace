import { supabase } from '@/config/supabase'
import type { Workspace, WorkspaceMember } from '@/types/workspace'

export interface CreateWorkspaceInput {
  name: string
  description?: string
}

export interface UpdateWorkspaceInput {
  name?: string
  description?: string
}

export async function getWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from('workspaces')
    .select(`
      *,
      workspace_members!inner(
        role,
        user_id
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getWorkspace(id: string): Promise<Workspace> {
  // First try with explicit join syntax
  const { data, error } = await supabase
    .from('workspaces')
    .select(`
      *,
      workspace_members(
        id,
        role,
        user_id,
        joined_at,
        user:profiles!user_id(
          id,
          email,
          full_name,
          avatar_url
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    // If the join syntax fails, fall back to simple query
    const { data: simpleData, error: simpleError } = await supabase
      .from('workspaces')
      .select(`
        *,
        workspace_members(
          id,
          role,
          user_id,
          joined_at
        )
      `)
      .eq('id', id)
      .single()

    if (simpleError) throw simpleError

    // Fetch profiles separately
    if (simpleData && simpleData.workspace_members && simpleData.workspace_members.length > 0) {
      const userIds = simpleData.workspace_members.map((m: any) => m.user_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .in('id', userIds)

      // Merge profiles into members
      if (profiles) {
        simpleData.workspace_members = simpleData.workspace_members.map((member: any) => ({
          ...member,
          user: profiles.find(p => p.id === member.user_id)
        }))
      }
    }

    return simpleData
  }

  return data
}

export async function createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('workspaces')
    .insert({
      name: input.name,
      description: input.description || null,
      owner_id: user.id,
    } as any)
    .select()
    .single()

  if (error) throw error
  return data as Workspace
}

export async function updateWorkspace(id: string, input: UpdateWorkspaceInput): Promise<Workspace> {
  const updateData: any = {}
  if (input.name !== undefined) updateData.name = input.name
  if (input.description !== undefined) updateData.description = input.description || null
  updateData.updated_at = new Date().toISOString()

  const { data, error } = await (supabase
    .from('workspaces') as any)
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Workspace
}

export async function deleteWorkspace(id: string): Promise<void> {
  const { error } = await supabase
    .from('workspaces')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  // Try with explicit join syntax first
  const { data, error } = await supabase
    .from('workspace_members')
    .select(`
      *,
      user:profiles!workspace_members_user_id_fkey(
        id,
        email,
        full_name,
        avatar_url
      )
    `)
    .eq('workspace_id', workspaceId)
    .order('joined_at', { ascending: true })

  if (error) {
    // Fall back to simple query with separate profile fetch
    const { data: members, error: membersError } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('joined_at', { ascending: true })

    if (membersError) throw membersError

    if (members && members.length > 0) {
      const userIds = members.map(m => m.user_id)

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .in('id', userIds)

      if (profilesError) {
        // Return members without profiles
        return members.map(member => ({
          ...member,
          user: undefined
        })) as WorkspaceMember[]
      }

      return members.map(member => ({
        ...member,
        user: profiles.find(p => p.id === member.user_id)
      })) as WorkspaceMember[]
    }

    return members || []
  }

  return data || []
}

export async function removeMember(workspaceId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)

  if (error) throw error
}

export async function updateMemberRole(
  workspaceId: string,
  userId: string,
  newRole: 'owner' | 'editor' | 'viewer' | 'member'
): Promise<void> {
  const { error } = await supabase
    .from('workspace_members')
    .update({ role: newRole })
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)

  if (error) throw error
}

export async function createInviteToken(workspaceId: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Generate a random token
  const token = `${workspaceId}-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`

  const { error } = await supabase
    .from('invite_tokens')
    .insert({
      workspace_id: workspaceId,
      token: token,
      created_by: user.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      max_uses: null // Unlimited uses
    })

  if (error) throw error

  return token
}

export async function useInviteToken(token: string): Promise<string> {
  const { data: workspaceId, error } = await supabase.rpc('use_invite_token', {
    token_value: token
  })

  if (error) throw error

  return workspaceId
}
