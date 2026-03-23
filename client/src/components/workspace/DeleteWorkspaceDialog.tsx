import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useDeleteWorkspace } from '@/hooks/useWorkspaces'
import type { Workspace } from '@/types/workspace'
import { p } from '@/styles/palette'

interface Props { workspace: Workspace | null; open: boolean; onOpenChange: (open: boolean) => void }

export function DeleteWorkspaceDialog({ workspace, open, onOpenChange }: Props) {
  const deleteWorkspace = useDeleteWorkspace()

  const handleDelete = async () => {
    if (!workspace) return
    try { await deleteWorkspace.mutateAsync(workspace.id); onOpenChange(false) }
    catch (error) { console.error('Failed to delete workspace:', error) }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent style={{ background: p.bg, border: `1px solid ${p.border2}`, borderRadius: 0 }}>
        <AlertDialogHeader>
          <AlertDialogTitle style={{ fontFamily: p.serif, fontSize: 22, fontWeight: 400, color: p.text }}>Delete workspace?</AlertDialogTitle>
          <AlertDialogDescription style={{ fontFamily: p.mono, fontSize: 12, color: p.muted, lineHeight: 1.6 }}>
            This will permanently delete "{workspace?.name}" and all its content. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter style={{ gap: 10 }}>
          <AlertDialogCancel style={{ background: 'transparent', border: `1px solid ${p.border}`, color: p.muted, fontFamily: p.mono, fontSize: 12, borderRadius: 0, cursor: 'pointer' }}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={deleteWorkspace.isPending}
            style={{ background: p.destroy, border: 'none', color: p.text, fontFamily: p.mono, fontSize: 12, borderRadius: 0, cursor: 'pointer' }}>
            {deleteWorkspace.isPending ? 'deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
