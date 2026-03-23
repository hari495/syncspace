import { useNavigate } from 'react-router-dom'
import { Trash2, Users } from 'lucide-react'
import type { Workspace } from '@/types/workspace'
import { formatDistanceToNow } from 'date-fns'

const mono = "'DM Mono', monospace"

interface WorkspaceCardProps {
  workspace: Workspace
  onDelete: (id: string) => void
}

export function WorkspaceCard({ workspace, onDelete }: WorkspaceCardProps) {
  const navigate = useNavigate()

  const isOwner = workspace.workspace_members?.some(m => m.role === 'owner')
  const memberCount = workspace.workspace_members?.length || 0

  return (
    <div
      onClick={() => navigate(`/workspace/${workspace.id}`)}
      style={{
        background: '#0d0d0d',
        padding: '28px 28px 20px',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.15s',
      }}
      onMouseOver={e => (e.currentTarget.style.background = '#111')}
      onMouseOut={e => (e.currentTarget.style.background = '#0d0d0d')}
    >
      {/* Delete button */}
      {isOwner && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(workspace.id) }}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'transparent',
            border: 'none',
            color: '#2a2a2a',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.15s',
          }}
          onMouseOver={e => (e.currentTarget.style.color = '#c0392b')}
          onMouseOut={e => (e.currentTarget.style.color = '#2a2a2a')}
        >
          <Trash2 size={14} />
        </button>
      )}

      {/* Name */}
      <div style={{
        fontFamily: mono,
        fontSize: 14,
        color: '#ede9e1',
        marginBottom: 6,
        paddingRight: 24,
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {workspace.name}
      </div>

      {/* Description */}
      {workspace.description && (
        <div style={{
          fontSize: 13,
          color: '#3a3a3a',
          marginBottom: 20,
          fontWeight: 300,
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {workspace.description}
        </div>
      )}

      {/* Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: workspace.description ? 0 : 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: mono, fontSize: 11, color: '#2a2a2a' }}>
          <Users size={11} />
          <span>{memberCount}</span>
        </div>
        <span style={{ fontFamily: mono, fontSize: 11, color: '#252525' }}>
          {formatDistanceToNow(new Date(workspace.updated_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  )
}
