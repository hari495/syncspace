import { useNavigate } from 'react-router-dom'
import { Trash2, Users, ArrowRight } from 'lucide-react'
import type { Workspace } from '@/types/workspace'
import { formatDistanceToNow } from 'date-fns'
import { p } from '@/styles/palette'

interface WorkspaceCardProps {
  workspace: Workspace
  onDelete: (id: string) => void
}

// Deterministic warm hue from workspace id for the initial block
function cardAccent(id: string) {
  const hues = [24, 36, 18, 42, 30, 48, 20, 38]
  let hash = 0
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  const h = hues[Math.abs(hash) % hues.length]
  return `hsl(${h}, 55%, 28%)`
}

export function WorkspaceCard({ workspace, onDelete }: WorkspaceCardProps) {
  const navigate = useNavigate()
  const isOwner = workspace.workspace_members?.some(m => m.role === 'owner')
  const memberCount = workspace.workspace_members?.length || 0
  const accentColor = cardAccent(workspace.id)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/workspace/${workspace.id}`)}
      onKeyDown={e => e.key === 'Enter' && navigate(`/workspace/${workspace.id}`)}
      style={{ background: p.bg2, padding: '28px 28px 22px', cursor: 'pointer', position: 'relative', transition: 'background .15s', display: 'flex', flexDirection: 'column', gap: 0 }}
      onMouseOver={e => (e.currentTarget.style.background = p.bg3)}
      onMouseOut={e =>  (e.currentTarget.style.background = p.bg2)}
    >
      {/* Top row: initial + name + delete */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
        {/* Colored initial block */}
        <div style={{ width: 40, height: 40, background: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: p.mono, fontSize: 16, color: p.text, fontWeight: 500 }}>
            {workspace.name[0].toUpperCase()}
          </span>
        </div>

        {/* Name + description */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: p.sans, fontSize: 15, fontWeight: 500, color: p.text, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {workspace.name}
          </div>
          {workspace.description ? (
            <div style={{ fontSize: 12, color: p.muted, fontWeight: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {workspace.description}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: p.dim }}>No description</div>
          )}
        </div>

        {/* Delete */}
        {isOwner && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(workspace.id) }}
            style={{ background: 'transparent', border: 'none', color: p.dim, cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'color .15s' }}
            onMouseOver={e => (e.currentTarget.style.color = p.destroy)}
            onMouseOut={e =>  (e.currentTarget.style.color = p.dim)}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Divider */}
      <div style={{ borderTop: `1px solid ${p.border}`, margin: '0 0 14px' }} />

      {/* Footer: meta + open arrow */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: p.mono, fontSize: 11, color: p.muted }}>
            <Users size={11} />
            <span>{memberCount}</span>
          </div>
          <span style={{ fontFamily: p.mono, fontSize: 11, color: p.dim }}>
            {formatDistanceToNow(new Date(workspace.updated_at), { addSuffix: true })}
          </span>
        </div>

        {/* Open CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: p.mono, fontSize: 11, color: p.accent }}>
          <span>Open</span>
          <ArrowRight size={11} />
        </div>
      </div>
    </div>
  )
}
