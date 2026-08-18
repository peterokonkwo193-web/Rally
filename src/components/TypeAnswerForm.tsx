import { useState, type FormEvent } from 'react'

export function TypeAnswerForm({
  onSubmit,
  disabled,
  submittedText,
}: {
  onSubmit: (text: string) => void
  disabled?: boolean
  submittedText: string | null
}) {
  const [text, setText] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (disabled || text.trim().length === 0) return
    onSubmit(text.trim())
  }

  if (submittedText !== null) {
    return (
      <div className="w-full max-w-sm rounded-xl bg-slate-800 px-6 py-5 text-center text-xl font-semibold text-white">
        {submittedText}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
      <input
        autoComplete="off"
        autoFocus
        maxLength={200}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
        placeholder="Type your answer…"
        className="rounded-xl bg-slate-800 px-4 py-4 text-xl text-white placeholder-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
      />
      <button
        type="submit"
        disabled={disabled || text.trim().length === 0}
        className="rounded-xl bg-indigo-600 py-4 text-xl font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Submit
      </button>
    </form>
  )
}
