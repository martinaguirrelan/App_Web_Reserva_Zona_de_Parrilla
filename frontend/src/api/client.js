import axios from 'axios'

const TOKEN_KEY = 'admin_token'

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Adjunta el token JWT si existe en localStorage
client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem('admin_user')
      if (window.location.pathname.startsWith('/admin')) {
        window.location.href = '/login'
      }
    }
    const msg = err.response?.data?.detail || 'Error inesperado. Intentá de nuevo.'
    return Promise.reject(new Error(msg))
  }
)

export default client
