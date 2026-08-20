import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AnswerShapeButton } from './AnswerShapeButton'

describe('AnswerShapeButton', () => {
  it('fires onClick when tapped', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(<AnswerShapeButton position={0} onClick={onClick} />)

    await user.click(screen.getByRole('button', { name: /red triangle/i }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not fire onClick when disabled', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(<AnswerShapeButton position={1} onClick={onClick} disabled />)

    await user.click(screen.getByRole('button', { name: /blue diamond/i }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('labels each position with a distinct colour + shape (never colour alone)', () => {
    const { rerender } = render(<AnswerShapeButton position={0} onClick={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAccessibleName('Red triangle')
    rerender(<AnswerShapeButton position={1} onClick={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAccessibleName('Blue diamond')
    rerender(<AnswerShapeButton position={2} onClick={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAccessibleName('Yellow circle')
    rerender(<AnswerShapeButton position={3} onClick={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAccessibleName('Green square')
  })

  it('reflects the selected (locked-in) state via aria-pressed', () => {
    render(<AnswerShapeButton position={0} onClick={vi.fn()} selected />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows option text when provided, folded into the accessible name', () => {
    render(<AnswerShapeButton position={1} onClick={vi.fn()} text="Paris" />)
    expect(screen.getByText('Paris')).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveAccessibleName('Blue diamond: Paris')
  })

  it('still works with no text (shape-only, unchanged behavior)', () => {
    render(<AnswerShapeButton position={2} onClick={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAccessibleName('Yellow circle')
  })
})
