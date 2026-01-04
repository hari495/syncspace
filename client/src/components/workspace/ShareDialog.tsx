import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createInviteToken, getWorkspaceMembers, removeMember } from '@/lib/workspaces'
import { Share2, Copy, Check, UserMinus, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { WorkspaceMember } from '@/types/workspace'

interface ShareDialogProps {
  workspaceId: string
  workspaceName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShareDialog({ workspaceId, workspaceName, open, onOpenChange }: ShareDialogProps) {
  const { user } = useAuth()
  const [inviteLink, setInviteLink] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)

  // Fetch members when dialog opens
  useEffect(() => {
    if (open) {
      loadMembers()
    }
  }, [open, workspaceId])

  const loadMembers = async () => {
    setIsLoadingMembers(true)
    try {
      const fetchedMembers = await getWorkspaceMembers(workspaceId)
      setMembers(fetchedMembers)
    } catch (error) {
      console.error('Failed to load members:', error)
    } finally {
      setIsLoadingMembers(false)
    }
  }

  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) {
      return
    }

    setRemovingMemberId(memberId)
    try {
      await removeMember(workspaceId, userId)
      // Refresh members list
      await loadMembers()
    } catch (error) {
      console.error('Failed to remove member:', error)
      alert('Failed to remove member. Please try again.')
    } finally {
      setRemovingMemberId(null)
    }
  }

  const generateInviteLink = async () => {
    setIsGenerating(true)
    try {
      const token = await createInviteToken(workspaceId)
      const baseUrl = window.location.origin
      const link = `${baseUrl}/invite/${token}`
      setInviteLink(link)
    } catch (error) {
      console.error('Failed to generate invite link:', error)
      alert('Failed to generate invite link. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    if (email) {
      return email[0].toUpperCase()
    }
    return 'U'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share "{workspaceName}"
          </DialogTitle>
          <DialogDescription>
            Invite people to collaborate on this workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* People with access section */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">People with access</Label>

            {isLoadingMembers ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                Loading members...
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => {
                  const isCurrentUser = member.user_id === user?.id
                  const isOwner = member.role === 'owner'

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Avatar */}
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                          {member.user?.avatar_url ? (
                            <img
                              src={member.user.avatar_url}
                              alt={member.user.full_name || member.user.email}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <User className="h-5 w-5" />
                          )}
                        </div>

                        {/* Name and email */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {member.user?.full_name || member.user?.email}
                              {isCurrentUser && <span className="text-muted-foreground ml-1">(you)</span>}
                            </p>
                          </div>
                          {member.user?.email && member.user?.full_name && (
                            <p className="text-xs text-muted-foreground truncate">
                              {member.user.email}
                            </p>
                          )}
                        </div>

                        {/* Role */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground capitalize">
                            {member.role}
                          </span>

                          {/* Remove button - only show for non-owners and if current user is owner */}
                          {!isOwner && members.find(m => m.user_id === user?.id)?.role === 'owner' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleRemoveMember(member.id, member.user_id)}
                              disabled={removingMemberId === member.id}
                            >
                              <UserMinus className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Invite link section */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Invite with link</Label>

            {!inviteLink ? (
              <Button
                onClick={generateInviteLink}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? 'Generating...' : 'Generate Invite Link'}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    id="invite-link"
                    value={inviteLink}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    onClick={copyToClipboard}
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Anyone with this link can join. Link expires in 7 days.
                </p>
                <Button
                  onClick={generateInviteLink}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Generate New Link
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
