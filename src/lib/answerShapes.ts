// Position 0..3 maps to shape/colour (SPEC.md §4's answer_options.position
// comment, and §1: "four large coloured shapes — red triangle, blue
// diamond, yellow circle, green square"). Shape AND colour together, never
// colour alone, for colour-blind players.
export const ANSWER_SHAPES = [
  { shape: 'triangle', colorClass: 'bg-answer-red', label: 'Red triangle' },
  { shape: 'diamond', colorClass: 'bg-answer-blue', label: 'Blue diamond' },
  { shape: 'circle', colorClass: 'bg-answer-yellow', label: 'Yellow circle' },
  { shape: 'square', colorClass: 'bg-answer-green', label: 'Green square' },
] as const

export type AnswerShape = (typeof ANSWER_SHAPES)[number]
