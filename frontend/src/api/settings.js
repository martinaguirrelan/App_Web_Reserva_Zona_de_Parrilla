import client from './client'

export const getPaymentSettings = () =>
  client.get('/settings/payment').then((r) => r.data)
