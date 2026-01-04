import { useState, useEffect, memo } from 'react'
import { toast } from 'sonner'
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
import { createInviteToken, getWorkspaceMembers, removeMember, updateMemberRole } from '@/lib/workspaces'
import { Share2, Copy, Check, UserMinus, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { WorkspaceMember } from '@/types/workspace'

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
      await loadMembers()
      toast.success('Member removed successfully')
    } catch (error) {
      console.error('Failed to remove member:', error)
      toast.error(`Failed to remove member: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setRemovingMemberId(null)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateMemberRole(workspaceId, userId, newRole as any)
      await loadMembers()
      toast.success('Role updated successfully')
    } catch (error) {
      console.error('Failed to update role:', error)
      toast.error(`Failed to update role: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const generateInviteLink = async () => {
    setIsGenerating(true)
    try {
      const token = await createInviteToken(workspaceId)
      const baseUrl = window.location.origin
      const link = `${baseUrl}/invite/${token}`
      setInviteLink(link)
      toast.success('Invite link generated successfully')
    } catch (error) {
      console.error('Failed to generate invite link:', error)
      toast.error('Failed to generate invite link. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Link copied to clipboard')
    } catch (error) {
      console.error('Failed to copy:', error)
      toast.error('Failed to copy link')
    }
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
                  const currentUserMember = members.find(m => m.user_id === user?.id)
                  const canRemove = !isOwner && currentUserMember?.role === 'owner'

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Avatar */}
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                          {member.profiles?.avatar_url ? (
                            <img
                              src={member.profiles.avatar_url}
                              alt={member.profiles.full_name || member.profiles.email}
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
                              {member.profiles?.full_name || member.profiles?.email}
                            </p>
                            {isCurrentUser && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                you
                              </span>
                            )}
                          </div>
                          {member.profiles?.email && member.profiles?.full_name && (
                            <p className="text-xs text-muted-foreground truncate">
                              {member.profiles.email}
                            </p>
                          )}
                        </div>

                        {/* Role */}
                        <div className="flex items-center gap-2">
                          {isOwner ? (
                            <span className="text-sm font-medium px-3 py-1 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                              Owner
                            </span>
                          ) : currentUserMember?.role === 'owner' ? (
                            // Show dropdown for owner to change roles
                            <select
                              value={member.role}
                              onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                              className="text-sm border rounded-md px-2 py-1 bg-background"
                            >
                              <option value="editor">Editor</option>
                              <option value="viewer">Viewer</option>
                              <option value="member">Member</option>
                            </select>
                          ) : (
                            <span className="text-sm text-muted-foreground capitalize">
                              {member.role}
                            </span>
                          )}

                          {/* Remove button - only show for non-owners and if current user is owner */}
                          {canRemove && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-destructive/10"
                              onClick={() => handleRemoveMember(member.id, member.user_id)}
                              disabled={removingMemberId === member.id}
                              title="Remove member"
                            >
                              {removingMemberId === member.id ? (
                                <span className="text-xs">...</span>
                              ) : (
                                <UserMinus className="h-4 w-4 text-destructive" />
                              )}
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
})
