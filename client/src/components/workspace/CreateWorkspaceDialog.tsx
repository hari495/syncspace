import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { useCreateWorkspace } from '@/hooks/useWorkspaces'
import { useNavigate } from 'react-router-dom'
import { p } from '@/styles/palette'

const inp: React.CSSProperties = {
  width: '100%', background: p.bg3, border: `1px solid ${p.border}`,
  color: p.text, padding: '10px 12px', fontSize: 13, fontFamily: p.mono,
  outline: 'none', transition: 'border-color .15s',
}

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
      const ws = await createWorkspace.mutateAsync({ name: name.trim(), description: description.trim() || undefined })
      setOpen(false); setName(''); setDescription('')
      navigate(`/workspace/${ws.id}`)
    } catch (error) { console.error('Failed to create workspace:', error) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          style={{ background: p.accent, border: 'none', color: p.bg, padding: '9px 16px', fontSize: 13, fontFamily: p.mono, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'background .15s' }}
          onMouseOver={e => (e.currentTarget.style.background = p.accentH)}
          onMouseOut={e =>  (e.currentTarget.style.background = p.accent)}
        >
          <Plus size={13} /> New workspace
        </button>
      </DialogTrigger>
      <DialogContent style={{ background: p.bg, border: `1px solid ${p.border2}`, borderRadius: 0, maxWidth: 420 }}>
        <form onSubmit={handleSubmit}>
          <DialogHeader style={{ marginBottom: 24 }}>
            <DialogTitle style={{ fontFamily: p.serif, fontSize: 22, fontWeight: 400, color: p.text }}>New workspace</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
            <div>
              <label style={{ fontFamily: p.mono, fontSize: 10, color: p.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Name</label>
              <input style={inp} placeholder="My project" value={name} onChange={e => setName(e.target.value)} maxLength={100} required
                onFocus={e => (e.currentTarget.style.borderColor = p.accent)}
                onBlur={e =>  (e.currentTarget.style.borderColor = p.border)} />
            </div>
            <div>
              <label style={{ fontFamily: p.mono, fontSize: 10, color: p.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                Description <span style={{ color: p.dim }}>(optional)</span>
              </label>
              <textarea style={{ ...inp, resize: 'vertical', minHeight: 72 }} placeholder="What's this for?" value={description}
                onChange={e => setDescription(e.target.value)} rows={3}
                onFocus={e => (e.currentTarget.style.borderColor = p.accent)}
                onBlur={e =>  (e.currentTarget.style.borderColor = p.border)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setOpen(false)}
              style={{ background: 'transparent', border: `1px solid ${p.border}`, color: p.muted, padding: '9px 16px', fontSize: 12, fontFamily: p.mono, cursor: 'pointer', transition: 'color .15s, border-color .15s' }}
              onMouseOver={e => { e.currentTarget.style.color = p.text; e.currentTarget.style.borderColor = p.border2 }}
              onMouseOut={e =>  { e.currentTarget.style.color = p.muted; e.currentTarget.style.borderColor = p.border }}>
              Cancel
            </button>
            <button type="submit" disabled={!name.trim() || createWorkspace.isPending}
              style={{ background: name.trim() ? p.accent : p.bg3, border: 'none', color: name.trim() ? p.bg : p.dim, padding: '9px 16px', fontSize: 12, fontFamily: p.mono, cursor: name.trim() ? 'pointer' : 'not-allowed', transition: 'background .15s' }}
              onMouseOver={e => { if (name.trim()) e.currentTarget.style.background = p.accentH }}
              onMouseOut={e =>  { if (name.trim()) e.currentTarget.style.background = p.accent }}>
              {createWorkspace.isPending ? 'creating...' : 'Create'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
