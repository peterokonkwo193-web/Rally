import { useState, type FormEvent } from 'react'
import { signUp, type Profile } from '../../lib/auth'
import { randomAvatarSeedForGender } from '../../lib/avatars'
import { Spinner } from '../../components/Spinner'
import { useDelayedFlag } from '../../lib/useDelayedFlag'

const inputClass =
  'rounded-xl bg-slate-800 px-4 py-4 text-lg text-white placeholder-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400'

const primaryButtonClass =
  'rounded-xl bg-indigo-600 py-4 text-xl font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-50'

type Step = 'details' | 'gender'

export function SignUpForm({ onSuccess }: { onSuccess: (profile: Profile) => void }) {
  const [step, setStep] = useState<Step>('details')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const showSlowMessage = useDelayedFlag(submitting)

  const detailsValid =
    /^\S+@\S+\.\S+$/.test(email) &&
    password.length >= 6 &&
    displayName.trim().length > 0 &&
    displayName.trim().length <= 20

  function handleDetailsSubmit(event: FormEvent) {
    event.preventDefault()
    if (!detailsValid) return
    setStep('gender')
  }

  // No avatar-picking step — a character is assigned automatically from
  // the chosen gender's set the moment they tap it, straight into signup.
  async function handleGenderSelect(gender: 'male' | 'female') {
    setSubmitting(true)
    setErrorMessage(null)
    try {
      const profile = await signUp({
        email,
        password,
        displayName: displayName.trim(),
        gender,
        avatarStyle: 'avataaars',
        avatarSeed: randomAvatarSeedForGender(gender),
      })
      onSuccess(profile)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Sign up failed.')
      setSubmitting(false)
    }
  }

  if (step === 'details') {
    return (
      <form onSubmit={handleDetailsSubmit} className="flex w-full flex-col gap-4">
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">
            Display name
          </span>
          <input
            autoComplete="off"
            maxLength={20}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className={inputClass}
          />
        </label>
        <button type="submit" disabled={!detailsValid} className={primaryButtonClass}>
          Next
        </button>
      </form>
    )
  }

  // step === 'gender'
  return (
    <div className="flex w-full flex-col gap-4">
      <p className="text-center text-lg text-slate-300">Pick your character</p>
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          disabled={submitting}
          onClick={() => handleGenderSelect('male')}
          className="rounded-xl bg-slate-800 py-6 text-xl font-semibold text-white transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Male
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => handleGenderSelect('female')}
          className="rounded-xl bg-slate-800 py-6 text-xl font-semibold text-white transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Female
        </button>
      </div>

      {submitting && (
        <p role="status" className="flex items-center justify-center gap-3 text-center text-slate-400">
          <Spinner /> Creating your account…
        </p>
      )}
      {submitting && showSlowMessage && (
        <p role="status" className="text-center text-sm text-slate-400">
          Still working — almost there…
        </p>
      )}
      {errorMessage && (
        <p role="alert" className="text-center text-red-400">
          {errorMessage}
        </p>
      )}
      {!submitting && (
        <button
          type="button"
          onClick={() => setStep('details')}
          className="text-sm text-slate-400 underline"
        >
          Back
        </button>
      )}
    </div>
  )
}
