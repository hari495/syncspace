import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useDeleteWorkspace } from '@/hooks/useWorkspaces'
import type { Workspace } from '@/types/workspace'

const mono = "'DM Mono', monospace"

interface DeleteWorkspaceDialogProps {
  workspace: Workspace | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteWorkspaceDialog({ workspace, open, onOpenChange }: DeleteWorkspaceDialogProps) {
  const deleteWorkspace = useDeleteWorkspace()

  const handleDelete = async () => {
    if (!workspace) return
    try {
      await deleteWorkspace.mutateAsync(workspace.id)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to delete workspace:', error)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent style={{ background: '#0d0d0d', border: '1px solid #1c1c1c', borderRadius: 0 }}>
        <AlertDialogHeader>
          <AlertDialogTitle style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, fontWeight: 400, color: '#ede9e1' }}>
            Delete workspace?
          </AlertDialogTitle>
          <AlertDialogDescription style={{ fontFamily: mono, fontSize: 12, color: '#555', lineHeight: 1.6 }}>
            This will permanently delete "{workspace?.name}" and all its content. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter style={{ gap: 10 }}>
          <AlertDialogCancel
            style={{
              background: 'transparent',
              border: '1px solid #1c1c1c',
              color: '#555',
              fontFamily: mono,
              fontSize: 12,
              borderRadius: 0,
              cursor: 'pointer',
            }}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteWorkspace.isPending}
            style={{
              background: '#c0392b',
              border: 'none',
              color: '#ede9e1',
              fontFamily: mono,
              fontSize: 12,
              borderRadius: 0,
              cursor: 'pointer',
            }}
          >
            {deleteWorkspace.isPending ? 'deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
