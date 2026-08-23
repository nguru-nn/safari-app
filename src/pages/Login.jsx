import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Could not sign in')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sage-100 px-4">
      <div className="w-full max-w-sm bg-white rounded-[var(--radius-card)] shadow-sm p-8">
        <h1 className="font-display text-2xl font-bold text-ink-900 mb-1">Safari Quotes</h1>
        <p className="text-ink-600 text-sm mb-6">Sign in to build and review itineraries.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-full border border-sage-200 px-4 py-2.5 text-sm outline-none focus:border-forest-600"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-full border border-sage-200 px-4 py-2.5 text-sm outline-none focus:border-forest-600"
          />
          {error && <p className="text-danger-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-full bg-forest-600 text-white text-sm font-medium py-2.5 hover:bg-forest-700 disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
