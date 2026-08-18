import { useState } from 'react'
import { createProfile, type Profile } from '../../lib/auth'
import { randomAvatarSeedForGender } from '../../lib/avatars'
import { Spinner } from '../../components/Spinner'
import { useDelayedFlag } from '../../lib/useDelayedFlag'

// Recovery path: the account exists (auth.users row + session) but the
// profiles row never got written — e.g. a network blip between the two
// calls inside signUp(). Rare, but leaving someone permanently stuck with
// a login they can't use would be a worse bug than the one this fixes.
export function CompleteProfileForm({
  userId,
  onSuccess,
}: {
  userId: string
  onSuccess: (profile: Profile) => void
}) {
  const [step, setStep] = useState<'name' | 'gender'>('name')
  const [displayName, setDisplayName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const showSlowMessage = useDelayedFlag(submitting)

  const nameValid = displayName.trim().length > 0 && displayName.trim().length <= 20

  // No avatar-picking step here either — assigned automatically the
  // moment a gender is tapped, same as signup.
  async function handleGenderSelect(gender: 'male' | 'female') {
    setSubmitting(true)
    setErrorMessage(null)
    try {
      const profile = await createProfile(userId, {
        displayName: displayName.trim(),
        gender,
        avatarStyle: 'avataaars',
        avatarSeed: randomAvatarSeedForGender(gender),
      })
      onSuccess(profile)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not save your profile.')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <h1 className="text-2xl font-bold">Finish setting up your account</h1>

      {step === 'name' && (
        <div className="flex w-full max-w-sm flex-col gap-4">
          <input
            autoComplete="off"
            maxLength={20}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="rounded-xl bg-slate-800 px-4 py-4 text-lg text-white placeholder-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          />
          <button
            type="button"
            disabled={!nameValid}
            onClick={() => setStep('gender')}
            className="rounded-xl bg-indigo-600 py-4 text-xl font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {step === 'gender' && (
        <div className="flex w-full max-w-sm flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleGenderSelect('male')}
              className="rounded-xl bg-slate-800 py-6 text-xl font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Male
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleGenderSelect('female')}
              className="rounded-xl bg-slate-800 py-6 text-xl font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Female
            </button>
          </div>
          {submitting && (
            <p role="status" className="flex items-center justify-center gap-3 text-slate-400">
              <Spinner /> Saving…
            </p>
          )}
          {submitting && showSlowMessage && (
            <p role="status" className="text-center text-sm text-slate-400">
              Still working — almost there…
            </p>
          )}
          {errorMessage && (
            <p role="alert" className="text-red-400">
              {errorMessage}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
