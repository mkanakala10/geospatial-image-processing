import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import AuthLayout from '@/components/AuthLayout'
import { useAuthStore } from '@/store/authStore'
import { authApi, usersApi, getErrorMessage } from '@/services/api'

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', username: '', password: '', full_name: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setTokens, setUser } = useAuthStore()
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.register(form)
      const tokens = await authApi.login(form.email, form.password)
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

  const fields = [
    { name: 'full_name', label: 'Full name', type: 'text', placeholder: 'Jane Doe', required: false },
    { name: 'username', label: 'Username', type: 'text', placeholder: 'jdoe', required: true },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com', required: true },
    { name: 'password', label: 'Password', type: 'password', placeholder: '••••••••', required: true },
  ] as const

  return (
    <AuthLayout title="Create account" subtitle="Start analyzing geospatial data">
      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map((f) => (
          <div key={f.name}>
            <label className="label" htmlFor={f.name}>{f.label}</label>
            <input
              id={f.name}
              type={f.type}
              name={f.name}
              className="input"
              placeholder={f.placeholder}
              value={form[f.name]}
              onChange={handleChange}
              required={f.required}
            />
          </div>
        ))}

        {error && <div className="error-banner">{error}</div>}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {loading ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="link-accent">Sign in</Link>
        </p>
      </form>
    </AuthLayout>
  )
}
