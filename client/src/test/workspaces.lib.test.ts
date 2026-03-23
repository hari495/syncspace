// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted ensures mocks are initialised before module imports
const { mockSingle, mockSelect, mockEq, mockOrder, mockInsert, mockDelete, mockUpdate, mockFrom, mockGetUser, mockRpc } = vi.hoisted(() => {
  const mockSingle  = vi.fn()
  const mockOrder   = vi.fn(() => ({ data: [], error: null, eq: mockEq }))
  const mockIn      = vi.fn(() => ({ data: [], error: null }))
  const mockEq      = vi.fn(() => ({ eq: mockEq, single: mockSingle, order: mockOrder }))
  const mockSelect  = vi.fn(() => ({ single: mockSingle, eq: mockEq, in: mockIn, order: mockOrder }))
  const mockInsert  = vi.fn(() => ({ select: mockSelect, single: mockSingle }))
  const mockDelete  = vi.fn(() => ({ eq: mockEq }))
  const mockUpdate  = vi.fn(() => ({ eq: mockEq }))
  const mockFrom    = vi.fn(() => ({ select: mockSelect, insert: mockInsert, delete: mockDelete, update: mockUpdate }))
  const mockGetUser = vi.fn()
  const mockRpc     = vi.fn()
  return { mockSingle, mockSelect, mockEq, mockOrder, mockInsert, mockDelete, mockUpdate, mockFrom, mockGetUser, mockRpc }
})

vi.mock('@/config/supabase', () => ({
  supabase: { from: mockFrom, auth: { getUser: mockGetUser }, rpc: mockRpc },
}))

import { createWorkspace, deleteWorkspace, updateMemberRole } from '@/lib/workspaces'

const fakeUser = { id: 'user-1', email: 'test@test.com' }
const fakeWorkspace = { id: 'ws-1', name: 'Test', description: null, owner_id: 'user-1', created_at: '', updated_at: '' }

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: fakeUser } })
})

describe('createWorkspace', () => {
  it('throws when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    await expect(createWorkspace({ name: 'X' })).rejects.toThrow('Not authenticated')
  })

  it('throws when supabase insert returns error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: new Error('DB error') })
    mockInsert.mockReturnValue({ select: () => ({ single: mockSingle }) })
    await expect(createWorkspace({ name: 'X' })).rejects.toThrow('DB error')
  })

  it('returns workspace data on success', async () => {
    mockSingle.mockResolvedValue({ data: fakeWorkspace, error: null })
    mockInsert
      .mockReturnValueOnce({ select: () => ({ single: mockSingle }) })
      .mockReturnValueOnce({ error: null })
    const result = await createWorkspace({ name: 'Test' })
    expect(result).toEqual(fakeWorkspace)
  })
})

describe('deleteWorkspace', () => {
  it('calls delete with correct id', async () => {
    mockEq.mockReturnValue({ error: null })
    mockDelete.mockReturnValue({ eq: mockEq })
    await deleteWorkspace('ws-1')
    expect(mockDelete).toHaveBeenCalled()
    expect(mockEq).toHaveBeenCalledWith('id', 'ws-1')
  })

  it('throws when supabase returns error', async () => {
    mockEq.mockReturnValue({ error: new Error('Cannot delete') })
    mockDelete.mockReturnValue({ eq: mockEq })
    await expect(deleteWorkspace('ws-1')).rejects.toThrow('Cannot delete')
  })
})

describe('updateMemberRole', () => {
  it('calls update with correct role', async () => {
    const innerEq = vi.fn().mockReturnValue({ error: null })
    const outerEq = vi.fn().mockReturnValue({ eq: innerEq })
    mockUpdate.mockReturnValue({ eq: outerEq })
    await updateMemberRole('ws-1', 'user-2', 'viewer')
    expect(mockUpdate).toHaveBeenCalledWith({ role: 'viewer' })
    expect(outerEq).toHaveBeenCalledWith('workspace_id', 'ws-1')
    expect(innerEq).toHaveBeenCalledWith('user_id', 'user-2')
  })

  it('throws on supabase error', async () => {
    const innerEq = vi.fn().mockReturnValue({ error: new Error('forbidden') })
    const outerEq = vi.fn().mockReturnValue({ eq: innerEq })
    mockUpdate.mockReturnValue({ eq: outerEq })
    await expect(updateMemberRole('ws-1', 'user-2', 'viewer')).rejects.toThrow('forbidden')
  })
})
