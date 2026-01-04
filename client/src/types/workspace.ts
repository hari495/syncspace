export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: 'owner' | 'editor' | 'viewer' | 'member'
  joined_at: string
  profiles?: Profile
}

export interface Workspace {
  id: string
  name: string
  description: string | null
  owner_id: string
  created_at: string
  updated_at: string
  workspace_members?: WorkspaceMember[]
}

export interface WorkspaceWithRole extends Workspace {
  role: 'owner' | 'editor' | 'viewer' | 'member'
}

export interface InviteToken {
  id: string
  workspace_id: string
  token: string
  created_by: string
  expires_at: string | null
  max_uses: number | null
  current_uses: number
  created_at: string
}

export interface CreateWorkspaceInput {
  name: string
  description?: string
}

export interface CreateInviteInput {
  workspace_id: string
  expires_at?: Date
  max_uses?: number
}
