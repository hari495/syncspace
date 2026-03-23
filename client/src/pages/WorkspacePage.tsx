import { useParams, useNavigate } from 'react-router-dom'
import { useWorkspace } from '@/hooks/useWorkspaces'
import { ArrowLeft, Users, Eye } from 'lucide-react'
import { Whiteboard } from '../components/whiteboard/Whiteboard'
import { useAuth } from '@/hooks/useAuth'
import { p } from '@/styles/palette'

export function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: workspace, isLoading, error } = useWorkspace(workspaceId!)

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: p.bg }}>
        <span style={{ fontFamily: p.mono, fontSize: 12, color: p.dim, letterSpacing: '0.1em' }}>loading...</span>
      </div>
    )
  }

  if (error || !workspace) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: p.bg }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontFamily: p.serif, fontSize: 28, fontWeight: 400, color: p.text, marginBottom: 8 }}>Workspace not found</h2>
          <p style={{ fontSize: 14, color: p.muted, marginBottom: 28, fontWeight: 300 }}>This workspace doesn't exist or you don't have access.</p>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: 'transparent', border: `1px solid ${p.border2}`, color: p.text, padding: '10px 20px', fontSize: 13, fontFamily: p.mono, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'border-color .15s' }}
            onMouseOver={e => (e.currentTarget.style.borderColor = p.accent)}
            onMouseOut={e =>  (e.currentTarget.style.borderColor = p.border2)}
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
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', background: p.bg }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${p.border}`, background: p.bg, padding: '0 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 50 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{ background: 'transparent', border: 'none', color: p.muted, cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', transition: 'color .15s' }}
              onMouseOver={e => (e.currentTarget.style.color = p.text)}
              onMouseOut={e =>  (e.currentTarget.style.color = p.muted)}
            >
              <ArrowLeft size={15} />
            </button>
            <div style={{ width: 1, height: 18, background: p.border }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: p.sans, fontSize: 13, fontWeight: 500, color: p.text }}>{workspace.name}</span>
              {isViewer && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', border: `1px solid ${p.border}`, color: p.muted, fontFamily: p.mono, fontSize: 10, letterSpacing: '0.05em' }}>
                  <Eye size={9} /> view only
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: p.mono, fontSize: 11, color: p.dim }}>
            <Users size={12} />
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
