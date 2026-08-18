import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LandingPage } from './LandingPage'

vi.mock('../../lib/discover', () => ({
  fetchPublicQuizzes: vi.fn().mockResolvedValue([]),
}))

describe('LandingPage', () => {
  it('renders with no login/session required — Host and Join CTAs always present', () => {
    render(<LandingPage />)

    expect(screen.getByRole('link', { name: /host a game/i })).toHaveAttribute('href', '/host')
    expect(screen.getByRole('link', { name: /join a game/i })).toHaveAttribute('href', '/play')
  })

  it('shows benefits without requiring any data fetch', () => {
    render(<LandingPage />)
    expect(screen.getByText(/speed rewards you/i)).toBeInTheDocument()
  })
})
