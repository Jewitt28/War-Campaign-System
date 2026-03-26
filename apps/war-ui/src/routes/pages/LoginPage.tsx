import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { authQueryOptions, useAuth } from '../../features/auth'
import { ApiError } from '../../lib/api'
import { setDevSessionEmail } from '../../lib/session'
import { Notice } from '../components'

const suggestedUsers = [
  'gm@war.local',
  'player1@war.local',
  'player2@war.local',
]

function sanitizeRedirect(redirect: string | null) {
  if (!redirect || !redirect.startsWith('/')) {
    return '/app/campaigns'
  }

  if (redirect.startsWith('//')) {
    return '/app/campaigns'
  }

  return redirect
}

export function LoginPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const auth = useAuth()
  const redirectTo = useMemo(() => sanitizeRedirect(searchParams.get('redirect')), [searchParams])
  const [email, setEmail] = useState(suggestedUsers[0])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (auth.data) {
    return <Navigate replace to={redirectTo} />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      setDevSessionEmail(email)
      await queryClient.fetchQuery(authQueryOptions())
      navigate(redirectTo, { replace: true, state: location.state })
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to establish a dev session. Check that the API is running and dev auth is enabled.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="hero-grid">
      <section className="surface-card page-card section-stack">
        <p className="eyebrow">Public / Auth</p>
        <h1 className="page-title">Enter the campaign shell</h1>
        <p className="muted">
          PR A uses the current backend dev-auth flow. Pick or enter an email address, the client stores it locally,
          and each API call forwards it as the `X-Dev-User` header.
        </p>
        <div className="pill-row">
          <span className="meta-pill">Route guard ready</span>
          <span className="meta-pill">Return path preserved</span>
          <span className="meta-pill">Backend-authoritative auth check</span>
        </div>
      </section>

      <section className="surface-card surface-card-strong page-card section-stack">
        <div className="detail-stack">
          <p className="eyebrow">Sign In</p>
          <h2 className="detail-title">Development access</h2>
          <p className="muted">Use a seeded test user or let the backend provision a new one from the email address.</p>
        </div>

        {errorMessage ? <Notice tone="error">{errorMessage}</Notice> : null}

        <form className="field-grid" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="email">
            Dev user email
            <input
              autoComplete="email"
              className="field-input"
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="operator@war.local"
              required
              type="email"
              value={email}
            />
          </label>

          <div className="button-row">
            <button className="button-link" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>

        <div className="detail-stack">
          <p className="eyebrow">Suggested users</p>
          <div className="button-row">
            {suggestedUsers.map((suggestedUser) => (
              <button
                key={suggestedUser}
                className="button-secondary"
                onClick={() => setEmail(suggestedUser)}
                type="button"
              >
                {suggestedUser}
              </button>
            ))}
          </div>
          <p className="muted">Post-login destination: {redirectTo}</p>
        </div>
      </section>
    </div>
  )
}
