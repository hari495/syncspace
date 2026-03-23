import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { useCreateWorkspace } from '@/hooks/useWorkspaces'
import { useNavigate } from 'react-router-dom'

const mono = "'DM Mono', monospace"
const serif = "'DM Serif Display', serif"

export function CreateWorkspaceDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const createWorkspace = useCreateWorkspace()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      const workspace = await createWorkspace.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
      })
      setOpen(false)
      setName('')
      setDescription('')
      navigate(`/workspace/${workspace.id}`)
    } catch (error) {
      console.error('Failed to create workspace:', error)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    border: '1px solid #1c1c1c',
    color: '#ede9e1',
    padding: '10px 12px',
    fontSize: 13,
    fontFamily: mono,
    outline: 'none',
    transition: 'border-color 0.15s',
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          style={{
            background: '#ede9e1',
            border: 'none',
            color: '#0d0d0d',
            padding: '10px 18px',
            fontSize: 13,
            fontFamily: mono,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            letterSpacing: '-0.01em',
            transition: 'background 0.15s',
          }}
          onMouseOver={e => (e.currentTarget.style.background = '#d8d3cb')}
          onMouseOut={e => (e.currentTarget.style.background = '#ede9e1')}
        >
          <Plus size={14} /> New workspace
        </button>
      </DialogTrigger>
      <DialogContent style={{ background: '#0d0d0d', border: '1px solid #1c1c1c', borderRadius: 0, maxWidth: 420 }}>
        <form onSubmit={handleSubmit}>
          <DialogHeader style={{ marginBottom: 24 }}>
            <DialogTitle style={{ fontFamily: serif, fontSize: 24, fontWeight: 400, color: '#ede9e1' }}>
              New workspace
            </DialogTitle>
          </DialogHeader>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
            <div>
              <label style={{ fontFamily: mono, fontSize: 11, color: '#444', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                Name
              </label>
              <input
                style={inputStyle}
                placeholder="My project"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={100}
                required
                onFocus={e => (e.currentTarget.style.borderColor = '#444')}
                onBlur={e => (e.currentTarget.style.borderColor = '#1c1c1c')}
              />
            </div>
            <div>
              <label style={{ fontFamily: mono, fontSize: 11, color: '#444', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                Description <span style={{ color: '#2a2a2a' }}>(optional)</span>
              </label>
              <textarea
                style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
                placeholder="What's this for?"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                onFocus={e => (e.currentTarget.style.borderColor = '#444')}
                onBlur={e => (e.currentTarget.style.borderColor = '#1c1c1c')}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                background: 'transparent',
                border: '1px solid #1c1c1c',
                color: '#555',
                padding: '10px 18px',
                fontSize: 13,
                fontFamily: mono,
                cursor: 'pointer',
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseOver={e => { e.currentTarget.style.color = '#ede9e1'; e.currentTarget.style.borderColor = '#444' }}
              onMouseOut={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.borderColor = '#1c1c1c' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || createWorkspace.isPending}
              style={{
                background: name.trim() ? '#ede9e1' : '#1a1a1a',
                border: 'none',
                color: name.trim() ? '#0d0d0d' : '#333',
                padding: '10px 18px',
                fontSize: 13,
                fontFamily: mono,
                cursor: name.trim() ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s',
              }}
            >
              {createWorkspace.isPending ? 'creating...' : 'Create'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
