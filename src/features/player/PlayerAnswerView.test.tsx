import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../../stores/useGameStore'
import { PlayerAnswerView } from './PlayerAnswerView'

afterEach(() => {
  useGameStore.getState().reset()
})

describe('PlayerAnswerView', () => {
  it("shows the question text on the player's own device, not just shapes", () => {
    useGameStore.setState({
      questionType: 'multiple_choice',
      optionCount: 4,
      questionText: 'What is 2 + 2?',
      optionTexts: [
        { position: 0, text: '3' },
        { position: 1, text: '4' },
        { position: 2, text: '5' },
        { position: 3, text: '6' },
      ],
    })

    render(<PlayerAnswerView sessionId="session-1" />)

    expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /blue diamond: 4/i })).toBeInTheDocument()
  })

  it('shows the question text above true_false and type_answer controls too', () => {
    useGameStore.setState({
      questionType: 'true_false',
      questionText: 'The sky is blue.',
      optionTexts: [],
    })
    render(<PlayerAnswerView sessionId="session-1" />)
    expect(screen.getByText('The sky is blue.')).toBeInTheDocument()
    expect(screen.getByText('True')).toBeInTheDocument()
  })
})
