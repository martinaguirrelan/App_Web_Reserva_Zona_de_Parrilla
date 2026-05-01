import client from './client'

export const getCalendar = (zoneId, year, month) =>
  client.get('/reservations/calendar', { params: { zone_id: zoneId, year, month } }).then((r) => r.data)

export const getSlots = (zoneId, fecha) =>
  client.get('/reservations/availability', { params: { zone_id: zoneId, fecha } }).then((r) => r.data)

export const createReservation = (data) =>
  client.post('/reservations', data).then((r) => r.data)

export const getReservationByCodigo = (codigo) =>
  client.get(`/reservations/${codigo}`).then((r) => r.data)

export const uploadPayment = (reservationId, file) => {
  const form = new FormData()
  form.append('archivo', file)
  return client
    .post(`/reservations/${reservationId}/payment`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data)
}
