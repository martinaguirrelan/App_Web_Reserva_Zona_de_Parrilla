import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.detail || 'Error inesperado. Intentá de nuevo.'
    return Promise.reject(new Error(msg))
  }
)

export default client
