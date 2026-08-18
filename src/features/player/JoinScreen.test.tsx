import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/AuthContext'
import type { Profile } from '../../lib/auth'
import { JoinScreen } from './JoinScreen'

vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api')>()
  return { ...actual, callEdgeFunction: vi.fn() }
})

vi.mock('./PlayerGameScreen', () => ({
  PlayerGameScreen: () => <div>waiting screen</div>,
}))

import { callEdgeFunction, ApiError } from '../../lib/api'

const mockedCallEdgeFunction = vi.mocked(callEdgeFunction)

const testProfile: Profile = {
  id: 'user-1',
  displayName: 'Alex',
  gender: 'male',
  avatarStyle: 'avataaars',
  avatarSeed: 'seed2',
}

function renderJoinScreen() {
  return render(
    <AuthContext.Provider value={{ profile: testProfile, logout: vi.fn() }}>
      <JoinScreen />
    </AuthContext.Provider>,
  )
}

describe('JoinScreen', () => {
  it('is PIN-only by default — no nickname field, nickname comes from the account', async () => {
    const user = userEvent.setup()
    renderJoinScreen()

    expect(screen.getByText(/playing as alex/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/nickname/i)).not.toBeInTheDocument()

    const submit = screen.getByRole('button', { name: /enter/i })
    expect(submit).toBeDisabled()

    await user.type(screen.getByLabelText(/game pin/i), '123456')
    expect(submit).toBeEnabled()
  })

  it('submits with just the PIN, no nickname in the request', async () => {
    mockedCallEdgeFunction.mockResolvedValueOnce({
      playerId: 'p1',
      clientToken: 'tok',
      sessionId: 's1',
      nickname: 'Alex',
      avatarStyle: 'avataaars',
      avatarSeed: 'seed2',
    })
    const user = userEvent.setup()
    renderJoinScreen()

    await user.type(screen.getByLabelText(/game pin/i), '123456')
    await user.click(screen.getByRole('button', { name: /enter/i }))

    expect(mockedCallEdgeFunction).toHaveBeenCalledWith('join-session', {
      pin: '123456',
      nickname: undefined,
    })
    expect(await screen.findByText('waiting screen')).toBeInTheDocument()
  })

  it('reveals a nickname field on DUPLICATE_NICKNAME instead of a blank/crashed screen', async () => {
    mockedCallEdgeFunction.mockRejectedValueOnce(
      new ApiError('DUPLICATE_NICKNAME', 'That nickname is already taken in this game.'),
    )
    const user = userEvent.setup()
    renderJoinScreen()

    await user.type(screen.getByLabelText(/game pin/i), '123456')
    await user.click(screen.getByRole('button', { name: /enter/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /that nickname is already taken/i,
    )
    const nicknameField = screen.getByPlaceholderText(/your name for this game/i)
    expect(nicknameField).toHaveValue('Alex')

    // Still usable — not a blank/crashed screen.
    expect(screen.getByRole('button', { name: /enter/i })).toBeInTheDocument()
  })
})
