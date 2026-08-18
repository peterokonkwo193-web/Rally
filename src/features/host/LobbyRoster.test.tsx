import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useLobbyStore } from '../../stores/useLobbyStore'
import { avatarUrl } from '../../lib/avatars'
import { LobbyRoster } from './LobbyRoster'

vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api')>()
  return { ...actual, callEdgeFunction: vi.fn().mockResolvedValue({}) }
})

import { callEdgeFunction } from '../../lib/api'

const mockedCallEdgeFunction = vi.mocked(callEdgeFunction)

afterEach(() => {
  useLobbyStore.getState().reset()
  mockedCallEdgeFunction.mockClear()
})

describe('LobbyRoster', () => {
  it('renders each player\'s avatar image alongside their nickname', () => {
    useLobbyStore.setState({
      connectionStatus: 'connected',
      roster: [
        { playerId: 'p1', nickname: 'Alex', avatarStyle: 'avataaars', avatarSeed: 'seed2' },
        { playerId: 'p2', nickname: 'Sam', avatarStyle: 'avataaars', avatarSeed: 'seed0' },
      ],
    })

    const { container } = render(<LobbyRoster sessionId="session-1" />)

    expect(screen.getByText('Alex')).toBeInTheDocument()
    expect(screen.getByText('Sam')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()

    const images = container.querySelectorAll('img')
    expect(Array.from(images).map((img) => img.getAttribute('src'))).toEqual([
      avatarUrl('avataaars', 'seed2'),
      avatarUrl('avataaars', 'seed0'),
    ])
  })

  it('shows a waiting message with no layout-breaking state when the roster is empty', () => {
    useLobbyStore.setState({ connectionStatus: 'connected', roster: [] })
    render(<LobbyRoster sessionId="session-1" />)
    expect(screen.getByText(/waiting for players to join/i)).toBeInTheDocument()
  })

  it('kicking a player calls kick-player with the right session and player id', async () => {
    useLobbyStore.setState({
      connectionStatus: 'connected',
      roster: [{ playerId: 'p1', nickname: 'Alex', avatarStyle: 'avataaars', avatarSeed: 'seed2' }],
    })
    const user = userEvent.setup()
    render(<LobbyRoster sessionId="session-1" />)

    await user.click(screen.getByRole('button', { name: /remove alex/i }))

    expect(mockedCallEdgeFunction).toHaveBeenCalledWith('kick-player', {
      sessionId: 'session-1',
      playerId: 'p1',
    })
  })
})
