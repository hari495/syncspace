import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, Settings, Users } from 'lucide-react'
import type { Workspace } from '@/types/workspace'
import { formatDistanceToNow } from 'date-fns'

interface WorkspaceCardProps {
  workspace: Workspace
  onDelete: (id: string) => void
  onSettings: (workspace: Workspace) => void
}

export function WorkspaceCard({ workspace, onDelete, onSettings }: WorkspaceCardProps) {
  const navigate = useNavigate()

  const isOwner = workspace.workspace_members?.some(
    (member) => member.role === 'owner'
  )

  const memberCount = workspace.workspace_members?.length || 0

  return (
    <Card
      className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
      onClick={() => navigate(`/workspace/${workspace.id}`)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl">{workspace.name}</CardTitle>
            {workspace.description && (
              <CardDescription className="mt-2 line-clamp-2">
                {workspace.description}
              </CardDescription>
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isOwner && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSettings(workspace)
                  }}
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(workspace.id)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
          </div>
          <span>
            Updated {formatDistanceToNow(new Date(workspace.updated_at), { addSuffix: true })}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
