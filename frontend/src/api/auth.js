import client from './client'

export const login = (username, password) => {
  const form = new URLSearchParams()
  form.append('username', username)
  form.append('password', password)
  return client
    .post('/auth/token', form, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
    .then((r) => r.data)
}

export const getMe = () => client.get('/auth/me').then((r) => r.data)

export const adminGetStats = () => client.get('/admin/stats').then((r) => r.data)
