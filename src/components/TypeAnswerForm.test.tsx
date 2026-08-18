import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TypeAnswerForm } from './TypeAnswerForm'

describe('TypeAnswerForm', () => {
  it('submits the trimmed typed text', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<TypeAnswerForm onSubmit={onSubmit} submittedText={null} />)

    await user.type(screen.getByPlaceholderText(/type your answer/i), '  Paris  ')
    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(onSubmit).toHaveBeenCalledWith('Paris')
  })

  it('keeps submit disabled for an empty answer', () => {
    render(<TypeAnswerForm onSubmit={vi.fn()} submittedText={null} />)
    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled()
  })

  it('shows the submitted answer instead of the input once answered', () => {
    render(<TypeAnswerForm onSubmit={vi.fn()} submittedText="Paris" />)
    expect(screen.getByText('Paris')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/type your answer/i)).not.toBeInTheDocument()
  })
})
