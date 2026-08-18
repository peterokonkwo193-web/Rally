import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LandingPage } from './LandingPage'

vi.mock('../../lib/discover', () => ({
  fetchPublicQuizzes: vi.fn().mockResolvedValue([]),
  fetchLandingStats: vi.fn().mockResolvedValue({ categoryCount: 0, publicQuizCount: 0 }),
}))

describe('LandingPage', () => {
  it('renders with no login/session required — Host and Join CTAs always present', () => {
    render(<LandingPage />)

    const hostLinks = screen.getAllByRole('link', { name: /host a game/i })
    const joinLinks = screen.getAllByRole('link', { name: /join a game/i })
    expect(hostLinks.length).toBeGreaterThan(0)
    expect(joinLinks.length).toBeGreaterThan(0)
    hostLinks.forEach((link) => expect(link).toHaveAttribute('href', '/host'))
    joinLinks.forEach((link) => expect(link).toHaveAttribute('href', '/play'))
  })

  it('shows benefits without requiring any data fetch', () => {
    render(<LandingPage />)
    expect(screen.getByText(/speed rewards you/i)).toBeInTheDocument()
  })

  it('shows the how-it-works steps', () => {
    render(<LandingPage />)
    expect(screen.getByText('How it works')).toBeInTheDocument()
    expect(screen.getByText('Generate a quiz')).toBeInTheDocument()
    expect(screen.getByText('Share the PIN')).toBeInTheDocument()
  })

  it('shows real stats once loaded, not fabricated placeholder numbers', async () => {
    const { fetchLandingStats } = await import('../../lib/discover')
    vi.mocked(fetchLandingStats).mockResolvedValueOnce({ categoryCount: 8, publicQuizCount: 3 })
    render(<LandingPage />)
    expect(await screen.findByText((_, node) => node?.textContent === '8 categories')).toBeInTheDocument()
    expect(
      await screen.findByText((_, node) => node?.textContent === '3 public quizzes and counting'),
    ).toBeInTheDocument()
  })
})
