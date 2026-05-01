import client from './client'

export const getZones = () => client.get('/zones').then((r) => r.data)
export const getZone = (id) => client.get(`/zones/${id}`).then((r) => r.data)
