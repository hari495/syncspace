import { useState, useEffect, memo } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createInviteToken, getWorkspaceMembers, removeMember, updateMemberRole } from '@/lib/workspaces'
import { Copy, Check, UserMinus, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { WorkspaceMember } from '@/types/workspace'
import { p } from '@/styles/palette'

interface Props { workspaceId: string; workspaceName: string; open: boolean; onOpenChange: (open: boolean) => void }

export const ShareDialog = memo(function ShareDialog({ workspaceId, workspaceName, open, onOpenChange }: Props) {
  const { user } = useAuth()
  const [inviteLink, setInviteLink] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)

  useEffect(() => { if (open) loadMembers() }, [open, workspaceId])

  const loadMembers = async () => {
    setIsLoadingMembers(true)
    try { setMembers(await getWorkspaceMembers(workspaceId)) }
    catch (e) { console.error(e) }
    finally { setIsLoadingMembers(false) }
  }

  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (!confirm('Remove this member?')) return
    setRemovingMemberId(memberId)
    try { await removeMember(workspaceId, userId); await loadMembers(); toast.success('Member removed') }
    catch (e) { toast.error(`Failed: ${e instanceof Error ? e.message : 'Unknown error'}`) }
    finally { setRemovingMemberId(null) }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try { await updateMemberRole(workspaceId, userId, newRole as any); await loadMembers(); toast.success('Role updated') }
    catch (e) { toast.error(`Failed: ${e instanceof Error ? e.message : 'Unknown error'}`) }
  }

  const generateInviteLink = async () => {
    setIsGenerating(true)
    try { const token = await createInviteToken(workspaceId); setInviteLink(`${window.location.origin}/invite/${token}`); toast.success('Link generated') }
    catch { toast.error('Failed to generate link') }
    finally { setIsGenerating(false) }
  }

  const copyToClipboard = async () => {
    try { await navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 2000); toast.success('Copied') }
    catch { toast.error('Failed to copy') }
  }

  const currentUserMember = members.find(m => m.user_id === user?.id)

  const label: React.CSSProperties = { fontFamily: p.mono, fontSize: 10, color: p.dim, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ background: p.bg, border: `1px solid ${p.border2}`, borderRadius: 0, maxWidth: 480 }}>
        <DialogHeader style={{ marginBottom: 24 }}>
          <DialogTitle style={{ fontFamily: p.serif, fontSize: 22, fontWeight: 400, color: p.text }}>Share "{workspaceName}"</DialogTitle>
        </DialogHeader>

        {/* Members */}
        <div style={{ marginBottom: 24 }}>
          <div style={label}>Members</div>
          {isLoadingMembers ? (
            <div style={{ fontFamily: p.mono, fontSize: 12, color: p.dim }}>loading...</div>
          ) : members.map(member => {
            const isCurrentUser = member.user_id === user?.id
            const isOwner = member.role === 'owner'
            const canRemove = !isOwner && currentUserMember?.role === 'owner'
            return (
              <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${p.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 30, height: 30, background: p.bg3, border: `1px solid ${p.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                    {member.user?.avatar_url
                      ? <img src={member.user.avatar_url} alt="" style={{ width: 30, height: 30 }} />
                      : <User size={13} style={{ color: p.dim }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: p.mono, fontSize: 12, color: p.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {member.user?.full_name || member.user?.email || 'Unknown'}
                      </span>
                      {isCurrentUser && <span style={{ fontFamily: p.mono, fontSize: 10, color: p.dim, border: `1px solid ${p.border}`, padding: '1px 5px' }}>you</span>}
                    </div>
                    {member.user?.email && member.user?.full_name && (
                      <div style={{ fontFamily: p.mono, fontSize: 11, color: p.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.user.email}</div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {isOwner ? (
                    <span style={{ fontFamily: p.mono, fontSize: 10, color: p.accent, border: `1px solid ${p.border2}`, padding: '3px 7px' }}>owner</span>
                  ) : currentUserMember?.role === 'owner' ? (
                    <select value={member.role} onChange={e => handleRoleChange(member.user_id, e.target.value)}
                      style={{ background: p.bg3, border: `1px solid ${p.border}`, color: p.muted, fontFamily: p.mono, fontSize: 11, padding: '3px 6px', cursor: 'pointer' }}>
                      <option value="editor">editor</option>
                      <option value="viewer">viewer</option>
                      <option value="member">member</option>
                    </select>
                  ) : (
                    <span style={{ fontFamily: p.mono, fontSize: 11, color: p.dim }}>{member.role}</span>
                  )}
                  {canRemove && (
                    <button onClick={() => handleRemoveMember(member.id, member.user_id)} disabled={removingMemberId === member.id}
                      style={{ background: 'transparent', border: 'none', color: p.dim, cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', transition: 'color .15s' }}
                      onMouseOver={e => (e.currentTarget.style.color = p.destroy)}
                      onMouseOut={e =>  (e.currentTarget.style.color = p.dim)}>
                      <UserMinus size={13} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ borderTop: `1px solid ${p.border}`, marginBottom: 20 }} />

        {/* Invite link */}
        <div>
          <div style={label}>Invite link</div>
          {!inviteLink ? (
            <button onClick={generateInviteLink} disabled={isGenerating}
              style={{ width: '100%', background: 'transparent', border: `1px solid ${p.border}`, color: p.muted, padding: 11, fontSize: 12, fontFamily: p.mono, cursor: 'pointer', transition: 'color .15s, border-color .15s' }}
              onMouseOver={e => { e.currentTarget.style.color = p.text; e.currentTarget.style.borderColor = p.accent }}
              onMouseOut={e =>  { e.currentTarget.style.color = p.muted; e.currentTarget.style.borderColor = p.border }}>
              {isGenerating ? 'generating...' : 'Generate invite link'}
            </button>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input value={inviteLink} readOnly style={{ flex: 1, background: p.bg3, border: `1px solid ${p.border}`, color: p.muted, padding: '9px 12px', fontSize: 11, fontFamily: p.mono, outline: 'none', overflow: 'hidden', textOverflow: 'ellipsis' }} />
                <button onClick={copyToClipboard}
                  style={{ background: copied ? p.bg3 : 'transparent', border: `1px solid ${p.border}`, color: copied ? p.accent : p.muted, padding: '0 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all .15s' }}>
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
              <div style={{ fontFamily: p.mono, fontSize: 11, color: p.dim, marginBottom: 10 }}>expires in 7 days</div>
              <button onClick={generateInviteLink}
                style={{ width: '100%', background: 'transparent', border: `1px solid ${p.border}`, color: p.muted, padding: 8, fontSize: 11, fontFamily: p.mono, cursor: 'pointer', transition: 'color .15s, border-color .15s' }}
                onMouseOver={e => { e.currentTarget.style.color = p.text; e.currentTarget.style.borderColor = p.border2 }}
                onMouseOut={e =>  { e.currentTarget.style.color = p.muted; e.currentTarget.style.borderColor = p.border }}>
                Generate new link
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
})
