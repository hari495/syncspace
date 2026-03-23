import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WorkspaceCard } from '@/components/workspace/WorkspaceCard'
import type { Workspace } from '@/types/workspace'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual as object, useNavigate: () => mockNavigate }
})

const base: Workspace = {
  id: 'ws-abc-123',
  name: 'Design System',
  description: 'Our shared design tokens',
  owner_id: 'user-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  workspace_members: [
    { id: 'm1', workspace_id: 'ws-abc-123', user_id: 'user-1', role: 'owner', joined_at: new Date().toISOString() },
    { id: 'm2', workspace_id: 'ws-abc-123', user_id: 'user-2', role: 'editor', joined_at: new Date().toISOString() },
  ],
}

const wrap = (ws: Workspace, onDelete = vi.fn()) =>
  render(<MemoryRouter><WorkspaceCard workspace={ws} onDelete={onDelete} /></MemoryRouter>)

describe('WorkspaceCard', () => {
  it('renders workspace name', () => {
    wrap(base)
    expect(screen.getByText('Design System')).toBeInTheDocument()
  })

  it('renders description when present', () => {
    wrap(base)
    expect(screen.getByText('Our shared design tokens')).toBeInTheDocument()
  })

  it('shows "No description" when description is absent', () => {
    wrap({ ...base, description: null })
    expect(screen.getByText('No description')).toBeInTheDocument()
  })

  it('renders member count', () => {
    wrap(base)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows delete button for owner', () => {
    wrap(base)
    // Delete button is a real <button> element
    const btns = document.querySelectorAll('button')
    expect(btns.length).toBe(1)
  })

  it('does not show delete button for non-owner', () => {
    const noOwner: Workspace = {
      ...base,
      workspace_members: [
        { id: 'm1', workspace_id: 'ws-abc-123', user_id: 'user-2', role: 'editor', joined_at: new Date().toISOString() },
      ],
    }
    const { container } = wrap(noOwner)
    // Only the card itself is clickable — no delete button
    const btns = container.querySelectorAll('button')
    expect(btns.length).toBe(0)
  })

  it('navigates to workspace on click', () => {
    wrap(base)
    fireEvent.click(screen.getByText('Design System'))
    expect(mockNavigate).toHaveBeenCalledWith('/workspace/ws-abc-123')
  })

  it('calls onDelete when delete button clicked', () => {
    const onDelete = vi.fn()
    wrap(base, onDelete)
    const deleteBtn = document.querySelector('button') as HTMLButtonElement
    fireEvent.click(deleteBtn)
    expect(onDelete).toHaveBeenCalledWith('ws-abc-123')
  })

  it('delete click does not trigger navigation', () => {
    mockNavigate.mockClear()
    wrap(base)
    const deleteBtn = document.querySelector('button') as HTMLButtonElement
    fireEvent.click(deleteBtn)
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('shows "Open" call to action', () => {
    wrap(base)
    expect(screen.getByText('Open')).toBeInTheDocument()
  })
})
