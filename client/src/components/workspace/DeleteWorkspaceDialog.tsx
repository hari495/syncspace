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

interface DeleteWorkspaceDialogProps {
  workspace: Workspace | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteWorkspaceDialog({
  workspace,
  open,
  onOpenChange,
}: DeleteWorkspaceDialogProps) {
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
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the workspace "{workspace?.name}" and all its
            content. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteWorkspace.isPending}
          >
            {deleteWorkspace.isPending ? 'Deleting...' : 'Delete Workspace'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
