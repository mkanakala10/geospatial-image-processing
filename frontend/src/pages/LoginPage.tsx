import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import AuthLayout from '@/components/AuthLayout'
import { useAuthStore } from '@/store/authStore'
import { authApi, usersApi, getErrorMessage } from '@/services/api'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setTokens, setUser } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const tokens = await authApi.login(email, password)
      setTokens(tokens.access_token, tokens.refresh_token)
      const user = await usersApi.me()
      setUser(user)
      navigate('/')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Sign in" subtitle="Process and visualize satellite imagery">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        {error && <div className="error-banner">{error}</div>}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-center text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="link-accent">Register</Link>
        </p>
      </form>
    </AuthLayout>
  )
}
