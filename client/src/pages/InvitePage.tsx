import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

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
      // Redirect to login, then back here
      navigate('/login', { state: { from: `/invite/${token}` } })
      return
    }

    if (!token) {
      setStatus('error')
      setError('Invalid invite link')
      return
    }

    // Accept the invite
    acceptInvite()
  }, [user, authLoading, token])

  const acceptInvite = async () => {
    try {
      const { useInviteToken } = await import('@/lib/workspaces')
      const wsId = await useInviteToken(token!)
      setWorkspaceId(wsId)
      setStatus('success')
    } catch (err: any) {
      console.error('Failed to accept invite:', err)
      setStatus('error')

      if (err.message?.includes('expired')) {
        setError('This invite link has expired.')
      } else if (err.message?.includes('maximum uses')) {
        setError('This invite link has reached its maximum number of uses.')
      } else if (err.message?.includes('Invalid')) {
        setError('This invite link is invalid.')
      } else {
        setError('Failed to join workspace. Please try again.')
      }
    }
  }

  if (authLoading || status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Processing invite...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle>Unable to Join Workspace</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => navigate('/dashboard')}
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'success' && workspaceId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle>Successfully Joined!</CardTitle>
            <CardDescription>
              You've been added to the workspace. Start collaborating now!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => navigate(`/workspace/${workspaceId}`)}
              className="w-full"
            >
              Open Workspace
            </Button>
            <Button
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
