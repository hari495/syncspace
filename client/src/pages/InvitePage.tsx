import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import { p } from '@/styles/palette'

export function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/login', { state: { from: `/invite/${token}` } }); return }
    if (!token) { setStatus('error'); setError('Invalid invite link'); return }
    acceptInvite()
  }, [user, authLoading, token])

  const acceptInvite = async () => {
    try {
      const { useInviteToken } = await import('@/lib/workspaces')
      const wsId = await useInviteToken(token!)
      setWorkspaceId(wsId)
      setStatus('success')
    } catch (err: any) {
      setStatus('error')
      if (err.message?.includes('expired'))        setError('This invite link has expired.')
      else if (err.message?.includes('maximum'))   setError('This invite link has reached its maximum uses.')
      else if (err.message?.includes('Invalid'))   setError('This invite link is invalid.')
      else                                          setError('Failed to join workspace. Please try again.')
    }
  }

  const btnPrimary: React.CSSProperties = {
    background: p.accent, border: 'none', color: p.bg, padding: '12px 20px',
    fontSize: 13, fontFamily: p.mono, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'background .15s',
  }
  const btnSecondary: React.CSSProperties = {
    background: 'transparent', border: `1px solid ${p.border}`, color: p.muted,
    padding: '11px 20px', fontSize: 13, fontFamily: p.mono, cursor: 'pointer',
    transition: 'color .15s, border-color .15s',
  }

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div style={{ minHeight: '100vh', background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 52 }}>
          <div style={{ width: 28, height: 28, background: p.accent, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={p.bg} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <span style={{ fontFamily: p.mono, fontSize: 14, color: p.text }}>syncspace</span>
        </div>
        {children}
      </div>
    </div>
  )

  if (authLoading || status === 'loading') return (
    <Shell><span style={{ fontFamily: p.mono, fontSize: 12, color: p.dim, letterSpacing: '0.1em' }}>processing invite...</span></Shell>
  )

  if (status === 'error') return (
    <Shell>
      <XCircle size={28} style={{ color: p.destroy, marginBottom: 20 }} />
      <h1 style={{ fontFamily: p.serif, fontSize: 28, fontWeight: 400, color: p.text, marginBottom: 8, marginTop: 0 }}>Couldn't join</h1>
      <p style={{ fontSize: 14, color: p.muted, marginBottom: 32, fontWeight: 300 }}>{error}</p>
      <button style={btnPrimary} onClick={() => navigate('/dashboard')}
        onMouseOver={e => (e.currentTarget.style.background = p.accentH)}
        onMouseOut={e =>  (e.currentTarget.style.background = p.accent)}>
        Go to dashboard <ArrowRight size={13} />
      </button>
    </Shell>
  )

  if (status === 'success' && workspaceId) return (
    <Shell>
      <CheckCircle size={28} style={{ color: p.accent, marginBottom: 20 }} />
      <h1 style={{ fontFamily: p.serif, fontSize: 28, fontWeight: 400, color: p.text, marginBottom: 8, marginTop: 0 }}>You're in.</h1>
      <p style={{ fontSize: 14, color: p.muted, marginBottom: 32, fontWeight: 300 }}>You've been added to the workspace.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button style={btnPrimary} onClick={() => navigate(`/workspace/${workspaceId}`)}
          onMouseOver={e => (e.currentTarget.style.background = p.accentH)}
          onMouseOut={e =>  (e.currentTarget.style.background = p.accent)}>
          Open workspace <ArrowRight size={13} />
        </button>
        <button style={btnSecondary} onClick={() => navigate('/dashboard')}
          onMouseOver={e => { e.currentTarget.style.color = p.text; e.currentTarget.style.borderColor = p.border2 }}
          onMouseOut={e =>  { e.currentTarget.style.color = p.muted; e.currentTarget.style.borderColor = p.border }}>
          Dashboard
        </button>
      </div>
    </Shell>
  )

  return null
}
