import { useParams, useNavigate } from 'react-router-dom'
import { useWorkspace } from '@/hooks/useWorkspaces'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Users, Settings } from 'lucide-react'
import { Whiteboard } from '../Whiteboard'

export function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const { data: workspace, isLoading, error } = useWorkspace(workspaceId!)

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    )
  }

  if (error || !workspace) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Workspace not found</h2>
          <p className="text-muted-foreground mb-4">
            This workspace doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  const memberCount = workspace.workspace_members?.length || 0

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{workspace.name}</h1>
              {workspace.description && (
                <p className="text-sm text-muted-foreground">
                  {workspace.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted text-sm">
              <Users className="h-4 w-4" />
              <span>{memberCount}</span>
            </div>
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Whiteboard */}
      <div className="flex-1 overflow-hidden">
        <Whiteboard
          roomName={`workspace-${workspaceId}`}
          workspaceId={workspaceId}
          workspaceName={workspace.name}
        />
      </div>
    </div>
  )
}
