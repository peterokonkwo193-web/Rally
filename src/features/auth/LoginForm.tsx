import { useState, type FormEvent } from 'react'
import { login } from '../../lib/auth'
import { Spinner } from '../../components/Spinner'
import { useDelayedFlag } from '../../lib/useDelayedFlag'

const inputClass =
  'rounded-xl bg-slate-800 px-4 py-4 text-lg text-white placeholder-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400'

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const valid = /^\S+@\S+\.\S+$/.test(email) && password.length > 0
  const showSlowMessage = useDelayedFlag(submitting)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!valid || submitting) return
    setSubmitting(true)
    setErrorMessage(null)
    try {
      await login({ email, password })
      onSuccess()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Login failed.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-300">Email</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-300">Password</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your password"
          className={inputClass}
        />
      </label>

      {errorMessage && (
        <p role="alert" className="text-center text-red-400">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={!valid || submitting}
        className="flex items-center justify-center gap-3 rounded-xl bg-indigo-600 py-4 text-xl font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting && <Spinner />}
        {submitting ? 'Logging in…' : 'Log In'}
      </button>
      {submitting && showSlowMessage && (
        <p role="status" className="text-center text-sm text-slate-400">
          Still working — almost there…
        </p>
      )}
    </form>
  )
}
