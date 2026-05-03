import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { createReservation } from '../api/reservations'
import { formatCurrency, formatDateLong } from '../utils/format'
import './ReservationPage.css'

export default function ReservationPage() {
  const navigate = useNavigate()
  const { state } = useLocation()

  const zone  = state?.zone
  const fecha = state?.fecha
  const turno = state?.turno

  const [form, setForm] = useState({ nombre: '', departamento: '', email: '', notas: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (!zone || !fecha || !turno) {
    return (
      <div className="rp-empty">
        <p>No hay datos de reserva. Volvé al calendario y seleccioná una fecha.</p>
        <Link to="/" className="btn-primary">Volver al calendario</Link>
      </div>
    )
  }

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!form.nombre.trim() || !form.departamento.trim()) {
      setError('Nombre y departamento son obligatorios.')
      return
    }
    setLoading(true)
    try {
      const data = await createReservation({
        nombre: form.nombre.trim(),
        departamento: form.departamento.trim(),
        email: form.email.trim() || null,
        zone_id: zone.id,
        fecha,
        turno,
        notas: form.notas.trim() || null,
      })
      navigate('/confirmacion', { state: { reserva: data } })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rp">
      <Link to="/" className="rp-back">← Volver al calendario</Link>

      <div className="rp-grid">
        {/* Resumen */}
        <aside className="rp-summary">
          <h2 className="rp-summary-title">Resumen de reserva</h2>
          <div className="rp-summary-card">
            <div className="rp-summary-zone">{zone.nombre}</div>
            <div className="rp-summary-row">
              <span>📅 Fecha</span>
              <strong>{formatDateLong(fecha)}</strong>
            </div>
            <div className="rp-summary-row">
              <span>🏠 Horario</span>
              <strong>Turno Completo (09:00 – 22:00)</strong>
            </div>
            <div className="rp-summary-row rp-summary-total">
              <span>Total</span>
              <strong>{formatCurrency(zone.precio_base)}</strong>
            </div>
            {zone.descripcion && (
              <p className="rp-summary-desc">{zone.descripcion}</p>
            )}
          </div>
          <div className="rp-info-box">
            <strong>¿Cómo continúa el proceso?</strong>
            <ol>
              <li>Completás el formulario y confirmás la reserva.</li>
              <li>Realizás la transferencia por el monto indicado.</li>
              <li>Subís el comprobante desde el detalle de tu reserva.</li>
              <li>Administración valida y confirma.</li>
            </ol>
          </div>
        </aside>

        {/* Formulario */}
        <div className="rp-form-col">
          <h1 className="rp-title">Tus datos</h1>
          <p className="rp-subtitle">Completá los datos para confirmar la reserva.</p>

          {error && <div className="alert-error">{error}</div>}

          <form className="rp-form" onSubmit={handleSubmit}>
            <div className="field">
              <label>Nombre y apellido <span className="req">*</span></label>
              <input
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                placeholder="Juan García"
                required
                disabled={loading}
              />
            </div>

            <div className="field">
              <label>Departamento <span className="req">*</span></label>
              <input
                name="departamento"
                value={form.departamento}
                onChange={handleChange}
                placeholder="Ej: 3B"
                required
                disabled={loading}
              />
            </div>

            <div className="field">
              <label>Email <span className="opt">(opcional)</span></label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="juan@ejemplo.com"
                disabled={loading}
              />
            </div>

            <div className="field">
              <label>Notas adicionales <span className="opt">(opcional)</span></label>
              <textarea
                name="notas"
                value={form.notas}
                onChange={handleChange}
                placeholder="Cantidad de personas, necesidades especiales, etc."
                rows={3}
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn-primary btn-full" disabled={loading}>
              {loading ? <><span className="spinner" /> Procesando…</> : 'Confirmar reserva →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
