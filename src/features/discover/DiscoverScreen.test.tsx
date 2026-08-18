import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DiscoverScreen } from './DiscoverScreen'

vi.mock('../../lib/discover', () => ({
  fetchPublicQuizzes: vi.fn(),
}))

import { fetchPublicQuizzes } from '../../lib/discover'

const mockedFetch = vi.mocked(fetchPublicQuizzes)

describe('DiscoverScreen', () => {
  it('renders quiz cards linking to /host?quizId=... with no login required', async () => {
    mockedFetch.mockResolvedValueOnce([
      { id: 'q1', title: 'General Trivia', description: 'Fun facts', questionCount: 5, categoryName: 'General Knowledge' },
    ])
    render(<DiscoverScreen />)

    const link = await screen.findByRole('link', { name: /general trivia/i })
    expect(link).toHaveAttribute('href', '/host?quizId=q1')
  })

  it('shows an empty state instead of a blank screen when there are no public quizzes', async () => {
    mockedFetch.mockResolvedValueOnce([])
    render(<DiscoverScreen />)
    expect(await screen.findByText(/no public quizzes yet/i)).toBeInTheDocument()
  })

  it('shows an error state, not a blank screen, if the fetch fails', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('network error'))
    render(<DiscoverScreen />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load quizzes/i)
  })
})
