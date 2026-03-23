import { useParams, useNavigate } from 'react-router-dom'
import { useWorkspace } from '@/hooks/useWorkspaces'
import { ArrowLeft, Users, Eye } from 'lucide-react'
import { Whiteboard } from '../components/whiteboard/Whiteboard'
import { useAuth } from '@/hooks/useAuth'

const mono = "'DM Mono', monospace"
const serif = "'DM Serif Display', serif"

export function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: workspace, isLoading, error } = useWorkspace(workspaceId!)

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0d0d0d' }}>
        <span style={{ fontFamily: mono, fontSize: 12, color: '#333', letterSpacing: '0.1em' }}>
          loading...
        </span>
      </div>
    )
  }

  if (error || !workspace) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0d0d0d' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, color: '#ede9e1', marginBottom: 8 }}>
            Workspace not found
          </h2>
          <p style={{ fontSize: 14, color: '#444', marginBottom: 28, fontWeight: 300 }}>
            This workspace doesn't exist or you don't have access.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'transparent',
              border: '1px solid #2a2a2a',
              color: '#ede9e1',
              padding: '10px 20px',
              fontSize: 13,
              fontFamily: mono,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'border-color 0.15s',
            }}
            onMouseOver={e => (e.currentTarget.style.borderColor = '#555')}
            onMouseOut={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
          >
            <ArrowLeft size={13} /> Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  const memberCount = workspace.workspace_members?.length || 0
  const currentMember = workspace.workspace_members?.find(m => m.user_id === user?.id)
  const userRole = currentMember?.role || 'viewer'
  const isViewer = userRole === 'viewer'

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', background: '#0d0d0d' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #1c1c1c', background: '#0d0d0d', padding: '0 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#444',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                transition: 'color 0.15s',
              }}
              onMouseOver={e => (e.currentTarget.style.color = '#ede9e1')}
              onMouseOut={e => (e.currentTarget.style.color = '#444')}
            >
              <ArrowLeft size={16} />
            </button>
            <div style={{ width: 1, height: 20, background: '#1c1c1c' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: mono, fontSize: 13, color: '#ede9e1', letterSpacing: '-0.01em' }}>
                {workspace.name}
              </span>
              {isViewer && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  border: '1px solid #2a2a2a',
                  color: '#555',
                  fontFamily: mono,
                  fontSize: 11,
                  letterSpacing: '0.05em',
                }}>
                  <Eye size={10} /> view only
                </span>
              )}
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: mono,
            fontSize: 12,
            color: '#333',
          }}>
            <Users size={13} />
            <span>{memberCount}</span>
          </div>
        </div>
      </div>

      {/* Whiteboard */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Whiteboard
          roomName={`workspace-${workspaceId}`}
          workspaceId={workspaceId}
          workspaceName={workspace.name}
          userRole={userRole}
        />
      </div>
    </div>
  )
}
