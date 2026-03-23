import { useState, useEffect, memo } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createInviteToken, getWorkspaceMembers, removeMember, updateMemberRole } from '@/lib/workspaces'
import { Copy, Check, UserMinus, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { WorkspaceMember } from '@/types/workspace'

const mono = "'DM Mono', monospace"

interface ShareDialogProps {
  workspaceId: string
  workspaceName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const ShareDialog = memo(function ShareDialog({ workspaceId, workspaceName, open, onOpenChange }: ShareDialogProps) {
  const { user } = useAuth()
  const [inviteLink, setInviteLink] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)

  useEffect(() => {
    if (open) loadMembers()
  }, [open, workspaceId])

  const loadMembers = async () => {
    setIsLoadingMembers(true)
    try {
      const fetched = await getWorkspaceMembers(workspaceId)
      setMembers(fetched)
    } catch (error) {
      console.error('Failed to load members:', error)
    } finally {
      setIsLoadingMembers(false)
    }
  }

  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (!confirm('Remove this member?')) return
    setRemovingMemberId(memberId)
    try {
      await removeMember(workspaceId, userId)
      await loadMembers()
      toast.success('Member removed')
    } catch (error) {
      toast.error(`Failed to remove member: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setRemovingMemberId(null)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateMemberRole(workspaceId, userId, newRole as any)
      await loadMembers()
      toast.success('Role updated')
    } catch (error) {
      toast.error(`Failed to update role: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const generateInviteLink = async () => {
    setIsGenerating(true)
    try {
      const token = await createInviteToken(workspaceId)
      setInviteLink(`${window.location.origin}/invite/${token}`)
      toast.success('Invite link generated')
    } catch (error) {
      toast.error('Failed to generate invite link')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Copied')
    } catch {
      toast.error('Failed to copy')
    }
  }

  const currentUserMember = members.find(m => m.user_id === user?.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ background: '#0d0d0d', border: '1px solid #1c1c1c', borderRadius: 0, maxWidth: 480 }}>
        <DialogHeader style={{ marginBottom: 24 }}>
          <DialogTitle style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, fontWeight: 400, color: '#ede9e1' }}>
            Share "{workspaceName}"
          </DialogTitle>
        </DialogHeader>

        {/* Members */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: mono, fontSize: 11, color: '#333', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
            Members
          </div>

          {isLoadingMembers ? (
            <div style={{ fontFamily: mono, fontSize: 12, color: '#333', padding: '16px 0' }}>
              loading...
            </div>
          ) : (
            <div>
              {members.map(member => {
                const isCurrentUser = member.user_id === user?.id
                const isOwner = member.role === 'owner'
                const canRemove = !isOwner && currentUserMember?.role === 'owner'

                return (
                  <div
                    key={member.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                      borderBottom: '1px solid #141414',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      {/* Avatar */}
                      <div style={{
                        width: 32, height: 32,
                        background: '#1a1a1a',
                        border: '1px solid #222',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        overflow: 'hidden',
                      }}>
                        {member.user?.avatar_url ? (
                          <img src={member.user.avatar_url} alt="" style={{ width: 32, height: 32 }} />
                        ) : (
                          <User size={14} style={{ color: '#444' }} />
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: mono, fontSize: 12, color: '#ede9e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {member.user?.full_name || member.user?.email || 'Unknown'}
                          </span>
                          {isCurrentUser && (
                            <span style={{ fontFamily: mono, fontSize: 10, color: '#333', border: '1px solid #1c1c1c', padding: '1px 5px' }}>
                              you
                            </span>
                          )}
                        </div>
                        {member.user?.email && member.user?.full_name && (
                          <div style={{ fontFamily: mono, fontSize: 11, color: '#2a2a2a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {member.user.email}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Role + actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {isOwner ? (
                        <span style={{ fontFamily: mono, fontSize: 11, color: '#444', border: '1px solid #1c1c1c', padding: '3px 8px' }}>
                          owner
                        </span>
                      ) : currentUserMember?.role === 'owner' ? (
                        <select
                          value={member.role}
                          onChange={e => handleRoleChange(member.user_id, e.target.value)}
                          style={{
                            background: 'transparent',
                            border: '1px solid #1c1c1c',
                            color: '#555',
                            fontFamily: mono,
                            fontSize: 11,
                            padding: '3px 6px',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="editor">editor</option>
                          <option value="viewer">viewer</option>
                          <option value="member">member</option>
                        </select>
                      ) : (
                        <span style={{ fontFamily: mono, fontSize: 11, color: '#333' }}>
                          {member.role}
                        </span>
                      )}

                      {canRemove && (
                        <button
                          onClick={() => handleRemoveMember(member.id, member.user_id)}
                          disabled={removingMemberId === member.id}
                          style={{
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
                          <UserMinus size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #141414', marginBottom: 20 }} />

        {/* Invite link */}
        <div>
          <div style={{ fontFamily: mono, fontSize: 11, color: '#333', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
            Invite link
          </div>

          {!inviteLink ? (
            <button
              onClick={generateInviteLink}
              disabled={isGenerating}
              style={{
                width: '100%',
                background: 'transparent',
                border: '1px solid #1c1c1c',
                color: '#555',
                padding: '11px',
                fontSize: 12,
                fontFamily: mono,
                cursor: 'pointer',
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseOver={e => { e.currentTarget.style.color = '#ede9e1'; e.currentTarget.style.borderColor = '#444' }}
              onMouseOut={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.borderColor = '#1c1c1c' }}
            >
              {isGenerating ? 'generating...' : 'Generate invite link'}
            </button>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input
                  value={inviteLink}
                  readOnly
                  style={{
                    flex: 1,
                    background: '#0a0a0a',
                    border: '1px solid #1c1c1c',
                    color: '#444',
                    padding: '10px 12px',
                    fontSize: 11,
                    fontFamily: mono,
                    outline: 'none',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                />
                <button
                  onClick={copyToClipboard}
                  style={{
                    background: copied ? '#1a2a1a' : 'transparent',
                    border: '1px solid #1c1c1c',
                    color: copied ? '#4a8c5c' : '#555',
                    padding: '0 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <div style={{ fontFamily: mono, fontSize: 11, color: '#2a2a2a', marginBottom: 12 }}>
                expires in 7 days
              </div>
              <button
                onClick={generateInviteLink}
                style={{
                  background: 'transparent',
                  border: '1px solid #1c1c1c',
                  color: '#444',
                  padding: '8px',
                  fontSize: 11,
                  fontFamily: mono,
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'color 0.15s, border-color 0.15s',
                }}
                onMouseOver={e => { e.currentTarget.style.color = '#ede9e1'; e.currentTarget.style.borderColor = '#444' }}
                onMouseOut={e => { e.currentTarget.style.color = '#444'; e.currentTarget.style.borderColor = '#1c1c1c' }}
              >
                Generate new link
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
})
