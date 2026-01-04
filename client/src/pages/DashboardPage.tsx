import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useWorkspaces } from '@/hooks/useWorkspaces'
import { Button } from '@/components/ui/button'
import { WorkspaceCard } from '@/components/workspace/WorkspaceCard'
import { CreateWorkspaceDialog } from '@/components/workspace/CreateWorkspaceDialog'
import { DeleteWorkspaceDialog } from '@/components/workspace/DeleteWorkspaceDialog'
import type { Workspace } from '@/types/workspace'
import { Loader2 } from 'lucide-react'

export function DashboardPage() {
  const { user, signOut } = useAuth()
  const { data: workspaces, isLoading, error } = useWorkspaces()
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(null)

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Workspaces</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {user?.user_metadata?.full_name || user?.email}
            </p>
          </div>
          <div className="flex gap-3">
            <CreateWorkspaceDialog />
            <Button onClick={signOut} variant="outline">
              Sign Out
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
            <p className="text-destructive">Failed to load workspaces. Please try again.</p>
          </div>
        )}

        {!isLoading && !error && workspaces && workspaces.length === 0 && (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <h2 className="text-xl font-semibold mb-2">No workspaces yet</h2>
            <p className="text-muted-foreground mb-4">
              Create your first workspace to get started with collaborative whiteboarding
            </p>
            <CreateWorkspaceDialog />
          </div>
        )}

        {!isLoading && !error && workspaces && workspaces.length > 0 && (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((workspace) => (
              <WorkspaceCard
                key={workspace.id}
                workspace={workspace}
                onDelete={(id) => {
                  const ws = workspaces.find((w) => w.id === id)
                  if (ws) setWorkspaceToDelete(ws)
                }}
                onSettings={() => {/* TODO: Implement settings */}}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <DeleteWorkspaceDialog
        workspace={workspaceToDelete}
        open={!!workspaceToDelete}
        onOpenChange={(open) => {
          if (!open) setWorkspaceToDelete(null)
        }}
      />
    </div>
  )
}
