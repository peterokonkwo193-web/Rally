import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SignUpForm } from './SignUpForm'

vi.mock('../../lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/auth')>()
  return { ...actual, signUp: vi.fn() }
})

import { signUp } from '../../lib/auth'

const mockedSignUp = vi.mocked(signUp)

describe('SignUpForm', () => {
  it('keeps Next disabled until email, password, and display name are all valid', async () => {
    const user = userEvent.setup()
    render(<SignUpForm onSuccess={vi.fn()} />)

    const next = screen.getByRole('button', { name: /next/i })
    expect(next).toBeDisabled()

    await user.type(screen.getByLabelText(/email/i), 'not-an-email')
    await user.type(screen.getByLabelText(/password/i), '12345') // too short
    await user.type(screen.getByLabelText(/display name/i), 'Sam')
    expect(next).toBeDisabled()

    await user.clear(screen.getByLabelText(/email/i))
    await user.type(screen.getByLabelText(/email/i), 'sam@example.com')
    await user.clear(screen.getByLabelText(/password/i))
    await user.type(screen.getByLabelText(/password/i), 'longenough')
    expect(next).toBeEnabled()
  })

  it('completes signup the moment a gender is tapped — no avatar-picking step', async () => {
    mockedSignUp.mockResolvedValueOnce({
      id: 'user-1',
      displayName: 'Sam',
      gender: 'female',
      avatarStyle: 'avataaars',
      avatarSeed: 'seed0',
    })
    const onSuccess = vi.fn()
    const user = userEvent.setup()
    render(<SignUpForm onSuccess={onSuccess} />)

    await user.type(screen.getByLabelText(/email/i), 'sam@example.com')
    await user.type(screen.getByLabelText(/password/i), 'longenough')
    await user.type(screen.getByLabelText(/display name/i), 'Sam')
    await user.click(screen.getByRole('button', { name: /next/i }))

    // No avatar grid should ever appear.
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /female/i }))

    expect(mockedSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'sam@example.com',
        password: 'longenough',
        displayName: 'Sam',
        gender: 'female',
        avatarSeed: expect.any(String),
      }),
    )
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })
})
