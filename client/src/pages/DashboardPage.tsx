import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useWorkspaces } from '@/hooks/useWorkspaces'
import { WorkspaceCard } from '@/components/workspace/WorkspaceCard'
import { CreateWorkspaceDialog } from '@/components/workspace/CreateWorkspaceDialog'
import { DeleteWorkspaceDialog } from '@/components/workspace/DeleteWorkspaceDialog'
import type { Workspace } from '@/types/workspace'
import { p } from '@/styles/palette'

export function DashboardPage() {
  const { user, signOut } = useAuth()
  const { data: workspaces, isLoading, error } = useWorkspaces()
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(null)

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'you'

  return (
    <div style={{ minHeight: '100vh', background: p.bg, color: p.text }}>
      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${p.border}`, position: 'sticky', top: 0, background: p.bg, zIndex: 10 }}>
        <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 26, height: 26, background: p.accent, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={p.bg} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <span style={{ fontFamily: p.mono, fontSize: 13, color: p.text }}>syncspace</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontFamily: p.mono, fontSize: 12, color: p.dim }}>{user?.email}</span>
            <button
              onClick={signOut}
              style={{ background: 'transparent', border: `1px solid ${p.border}`, color: p.muted, padding: '6px 12px', fontSize: 12, fontFamily: p.mono, cursor: 'pointer', transition: 'color .15s, border-color .15s' }}
              onMouseOver={e => { e.currentTarget.style.color = p.text; e.currentTarget.style.borderColor = p.border2 }}
              onMouseOut={e =>  { e.currentTarget.style.color = p.muted; e.currentTarget.style.borderColor = p.border }}
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 1152, margin: '0 auto', padding: '52px 32px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 40 }}>
          <div>
            <div style={{ fontFamily: p.mono, fontSize: 11, letterSpacing: '0.1em', color: p.dim, textTransform: 'uppercase', marginBottom: 10 }}>
              Dashboard
            </div>
            <h1 style={{ fontFamily: p.serif, fontSize: 'clamp(26px, 3vw, 40px)', fontWeight: 400, lineHeight: 1.1, letterSpacing: '-0.02em', color: p.text, margin: 0 }}>
              Welcome back, <em style={{ color: p.accent }}>{firstName}.</em>
            </h1>
          </div>
          <CreateWorkspaceDialog />
        </div>

        {/* Loading */}
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <span style={{ fontFamily: p.mono, fontSize: 12, color: p.dim, letterSpacing: '0.1em' }}>loading...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ border: `1px solid ${p.destroy}`, background: `${p.destroy}18`, padding: '16px 20px', fontFamily: p.mono, fontSize: 12, color: p.destroy }}>
            Failed to load workspaces. Please try again.
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && workspaces?.length === 0 && (
          <div style={{ border: `1px dashed ${p.border2}`, padding: '80px 40px', textAlign: 'center' }}>
            <div style={{ fontFamily: p.serif, fontSize: 26, fontWeight: 400, color: p.text, marginBottom: 10 }}>
              No workspaces yet
            </div>
            <p style={{ fontSize: 14, color: p.muted, marginBottom: 28, fontWeight: 300 }}>
              Create one to start collaborating with your team
            </p>
            <CreateWorkspaceDialog />
          </div>
        )}

        {/* Workspace grid */}
        {!isLoading && !error && workspaces && workspaces.length > 0 && (
          <>
            <div style={{ fontFamily: p.mono, fontSize: 11, color: p.dim, letterSpacing: '0.08em', marginBottom: 16 }}>
              {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 0,
            }}>
              {workspaces.map(workspace => (
                <WorkspaceCard
                  key={workspace.id}
                  workspace={workspace}
                  onDelete={id => {
                    const ws = workspaces.find(w => w.id === id)
                    if (ws) setWorkspaceToDelete(ws)
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <DeleteWorkspaceDialog
        workspace={workspaceToDelete}
        open={!!workspaceToDelete}
        onOpenChange={open => { if (!open) setWorkspaceToDelete(null) }}
      />
    </div>
  )
}
