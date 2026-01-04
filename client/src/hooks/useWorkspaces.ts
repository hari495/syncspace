import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getWorkspaces,
  getWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceMembers,
  removeMember,
  type UpdateWorkspaceInput,
} from '@/lib/workspaces'
import type { CreateWorkspaceInput } from '@/types/workspace'

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: getWorkspaces,
  })
}

export function useWorkspace(id: string) {
  return useQuery({
    queryKey: ['workspaces', id],
    queryFn: () => getWorkspace(id),
    enabled: !!id,
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateWorkspaceInput) => createWorkspace(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateWorkspaceInput }) =>
      updateWorkspace(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      queryClient.invalidateQueries({ queryKey: ['workspaces', variables.id] })
    },
  })
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteWorkspace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}

export function useWorkspaceMembers(workspaceId: string) {
  return useQuery({
    queryKey: ['workspaces', workspaceId, 'members'],
    queryFn: () => getWorkspaceMembers(workspaceId),
    enabled: !!workspaceId,
  })
}

export function useRemoveMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ workspaceId, userId }: { workspaceId: string; userId: string }) =>
      removeMember(workspaceId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['workspaces', variables.workspaceId, 'members'],
      })
    },
  })
}
