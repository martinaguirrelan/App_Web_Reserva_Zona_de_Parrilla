import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './LoginPage.css'

export default function LoginPage() {
  const { login, isAdmin } = useAuth()
  const navigate = useNavigate()
  const { state } = useLocation()
  const from = state?.from || '/admin'

  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (isAdmin) {
    navigate(from, { replace: true })
    return null
  }

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!form.username.trim() || !form.password.trim()) {
      setError('Completá usuario y contraseña.')
      return
    }
    setLoading(true)
    try {
      await login(form.username.trim(), form.password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">🔐</div>
        <h1 className="login-title">Panel de administración</h1>
        <p className="login-subtitle">Ingresá con tus credenciales para continuar.</p>

        {error && <div className="alert-error">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field">
            <label>Usuario</label>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="admin"
              autoComplete="username"
              disabled={loading}
            />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>
          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? <><span className="spinner" /> Ingresando…</> : 'Ingresar →'}
          </button>
        </form>
      </div>
    </div>
  )
}
