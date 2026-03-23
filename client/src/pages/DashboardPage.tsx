import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useWorkspaces } from '@/hooks/useWorkspaces'
import { WorkspaceCard } from '@/components/workspace/WorkspaceCard'
import { CreateWorkspaceDialog } from '@/components/workspace/CreateWorkspaceDialog'
import { DeleteWorkspaceDialog } from '@/components/workspace/DeleteWorkspaceDialog'
import type { Workspace } from '@/types/workspace'

const mono = "'DM Mono', monospace"
const serif = "'DM Serif Display', serif"

export function DashboardPage() {
  const { user, signOut } = useAuth()
  const { data: workspaces, isLoading, error } = useWorkspaces()
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(null)

  const displayName = user?.user_metadata?.full_name || user?.email || 'there'

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', color: '#ede9e1' }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #1c1c1c' }}>
        <div style={{
          maxWidth: 1152,
          margin: '0 auto',
          padding: '0 32px',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28,
              background: '#ede9e1',
              borderRadius: 3,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0d0d0d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <span style={{ fontFamily: mono, fontSize: 14, color: '#ede9e1', letterSpacing: '-0.01em' }}>
              syncspace
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontFamily: mono, fontSize: 12, color: '#333' }}>
              {displayName}
            </span>
            <button
              onClick={signOut}
              style={{
                background: 'transparent',
                border: '1px solid #222',
                color: '#555',
                padding: '7px 14px',
                fontSize: 13,
                fontFamily: mono,
                cursor: 'pointer',
                letterSpacing: '0.01em',
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseOver={e => { e.currentTarget.style.color = '#ede9e1'; e.currentTarget.style.borderColor = '#444' }}
              onMouseOut={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.borderColor = '#222' }}
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 1152, margin: '0 auto', padding: '56px 32px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 48 }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.12em', color: '#333', textTransform: 'uppercase', marginBottom: 12 }}>
              Workspaces
            </div>
            <h1 style={{
              fontFamily: serif,
              fontSize: 'clamp(28px, 3.5vw, 44px)',
              fontWeight: 400,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: '#ede9e1',
              margin: 0,
            }}>
              Good to see you,{' '}
              <em style={{ color: '#555' }}>
                {user?.user_metadata?.full_name?.split(' ')[0] || 'you'}.
              </em>
            </h1>
          </div>
          <CreateWorkspaceDialog />
        </div>

        {/* Loading */}
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ fontFamily: mono, fontSize: 12, color: '#333', letterSpacing: '0.1em' }}>
              loading...
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            border: '1px solid #2a1a1a',
            background: '#1a0d0d',
            padding: '16px 20px',
            color: '#c0392b',
            fontFamily: mono,
            fontSize: 13,
          }}>
            Failed to load workspaces. Please try again.
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && workspaces && workspaces.length === 0 && (
          <div style={{
            border: '1px dashed #222',
            padding: '80px 40px',
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: serif,
              fontSize: 28,
              fontWeight: 400,
              color: '#ede9e1',
              marginBottom: 12,
            }}>
              No workspaces yet
            </div>
            <p style={{ fontSize: 14, color: '#444', marginBottom: 32, fontWeight: 300 }}>
              Create one to start collaborating
            </p>
            <CreateWorkspaceDialog />
          </div>
        )}

        {/* Grid */}
        {!isLoading && !error && workspaces && workspaces.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1px',
            background: '#1c1c1c',
            border: '1px solid #1c1c1c',
          }}>
            {workspaces.map((workspace) => (
              <WorkspaceCard
                key={workspace.id}
                workspace={workspace}
                onDelete={(id) => {
                  const ws = workspaces.find((w) => w.id === id)
                  if (ws) setWorkspaceToDelete(ws)
                }}
              />
            ))}
          </div>
        )}
      </div>

      <DeleteWorkspaceDialog
        workspace={workspaceToDelete}
        open={!!workspaceToDelete}
        onOpenChange={(open) => { if (!open) setWorkspaceToDelete(null) }}
      />
    </div>
  )
}
