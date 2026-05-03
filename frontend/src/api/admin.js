import client from './client'

// Reservas
export const adminGetReservations = (estado) =>
  client.get('/admin/reservations', { params: estado ? { estado } : {} }).then((r) => r.data)

export const adminUpdateEstado = (id, estado, notas_admin) =>
  client.patch(`/admin/reservations/${id}/estado`, { estado, notas_admin }).then((r) => r.data)

export const adminExportExcel = async (estado) => {
  const params = estado ? { estado } : {}
  const res = await client.get('/admin/reservations/export', { params, responseType: 'blob' })
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = estado ? `reservas_${estado}.xlsx` : 'reservas.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}

// Zonas
export const adminGetZones = () => client.get('/admin/zones').then((r) => r.data)

export const adminCreateZone = (data) => client.post('/admin/zones', data).then((r) => r.data)

export const adminUpdateZone = (id, data) =>
  client.put(`/admin/zones/${id}`, data).then((r) => r.data)

export const adminDeactivateZone = (id) =>
  client.delete(`/admin/zones/${id}`).then((r) => r.data)

export const adminSeed = () => client.post('/admin/seed').then((r) => r.data)
