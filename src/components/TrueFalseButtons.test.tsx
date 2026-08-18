import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TrueFalseButtons } from './TrueFalseButtons'

describe('TrueFalseButtons', () => {
  it('selecting True calls onSelect with position 0', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<TrueFalseButtons onSelect={onSelect} selectedPosition={null} />)

    await user.click(screen.getByRole('button', { name: /true/i }))
    expect(onSelect).toHaveBeenCalledWith(0)
  })

  it('selecting False calls onSelect with position 1', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<TrueFalseButtons onSelect={onSelect} selectedPosition={null} />)

    await user.click(screen.getByRole('button', { name: /false/i }))
    expect(onSelect).toHaveBeenCalledWith(1)
  })

  it('does not fire when disabled', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<TrueFalseButtons onSelect={onSelect} selectedPosition={null} disabled />)

    await user.click(screen.getByRole('button', { name: /true/i }))
    expect(onSelect).not.toHaveBeenCalled()
  })
})
