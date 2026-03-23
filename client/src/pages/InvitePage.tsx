import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react'

const mono = "'DM Mono', monospace"
const serif = "'DM Serif Display', serif"

export function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login', { state: { from: `/invite/${token}` } })
      return
    }
    if (!token) {
      setStatus('error')
      setError('Invalid invite link')
      return
    }
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
      if (err.message?.includes('expired')) setError('This invite link has expired.')
      else if (err.message?.includes('maximum uses')) setError('This invite link has reached its maximum number of uses.')
      else if (err.message?.includes('Invalid')) setError('This invite link is invalid.')
      else setError('Failed to join workspace. Please try again.')
    }
  }

  const shell = (children: React.ReactNode) => (
    <div style={{
      minHeight: '100vh',
      background: '#0d0d0d',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
          <div style={{ width: 28, height: 28, background: '#ede9e1', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0d0d0d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <span style={{ fontFamily: mono, fontSize: 14, color: '#ede9e1' }}>syncspace</span>
        </div>
        {children}
      </div>
    </div>
  )

  if (authLoading || status === 'loading') {
    return shell(
      <div>
        <div style={{ fontFamily: mono, fontSize: 12, color: '#333', letterSpacing: '0.1em' }}>
          processing invite...
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return shell(
      <div>
        <XCircle size={28} style={{ color: '#c0392b', marginBottom: 20 }} />
        <h1 style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, color: '#ede9e1', marginBottom: 8, marginTop: 0 }}>
          Couldn't join
        </h1>
        <p style={{ fontSize: 14, color: '#555', marginBottom: 32, fontWeight: 300 }}>{error}</p>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'transparent',
            border: '1px solid #2a2a2a',
            color: '#ede9e1',
            padding: '11px 20px',
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
          Go to dashboard <ArrowRight size={13} />
        </button>
      </div>
    )
  }

  if (status === 'success' && workspaceId) {
    return shell(
      <div>
        <CheckCircle size={28} style={{ color: '#4a8c5c', marginBottom: 20 }} />
        <h1 style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, color: '#ede9e1', marginBottom: 8, marginTop: 0 }}>
          You're in.
        </h1>
        <p style={{ fontSize: 14, color: '#555', marginBottom: 32, fontWeight: 300 }}>
          You've been added to the workspace.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => navigate(`/workspace/${workspaceId}`)}
            style={{
              background: '#ede9e1',
              border: 'none',
              color: '#0d0d0d',
              padding: '12px 20px',
              fontSize: 13,
              fontFamily: mono,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'background 0.15s',
            }}
            onMouseOver={e => (e.currentTarget.style.background = '#d8d3cb')}
            onMouseOut={e => (e.currentTarget.style.background = '#ede9e1')}
          >
            Open workspace <ArrowRight size={13} />
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'transparent',
              border: '1px solid #222',
              color: '#555',
              padding: '11px 20px',
              fontSize: 13,
              fontFamily: mono,
              cursor: 'pointer',
              transition: 'color 0.15s, border-color 0.15s',
            }}
            onMouseOver={e => { e.currentTarget.style.color = '#ede9e1'; e.currentTarget.style.borderColor = '#444' }}
            onMouseOut={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.borderColor = '#222' }}
          >
            Dashboard
          </button>
        </div>
      </div>
    )
  }

  return null
}
