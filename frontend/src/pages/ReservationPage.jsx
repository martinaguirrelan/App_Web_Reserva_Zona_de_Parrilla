import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { createReservation } from '../api/reservations'
import { getPaymentSettings } from '../api/settings'
import { formatCurrency, formatDateLong } from '../utils/format'
import './ReservationPage.css'

const BANCOS_PERU = [
  'BCP (Banco de Crédito del Perú)',
  'BBVA Perú',
  'Interbank',
  'Scotiabank Perú',
  'BanBif',
  'Banco Pichincha',
  'Banco GNB Perú',
  'Mibanco',
  'Banco Falabella',
  'Banco Ripley',
  'Banco de la Nación',
]

const REFUND_METHODS = [
  { value: 'banco', label: 'Transferencia bancaria' },
  { value: 'plin',  label: 'Plin' },
  { value: 'yape',  label: 'Yape' },
]

export default function ReservationPage() {
  const navigate = useNavigate()
  const { state } = useLocation()

  const zone  = state?.zone
  const fecha = state?.fecha
  const turno = state?.turno

  const [form, setForm] = useState({
    nombre: '', departamento: '', email: '', notas: '',
    refund_method: '',
    banco_nombre: '', cuenta_numero: '', cuenta_interbancaria: '',
    numero_celular_devolucion: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)

  const [paymentInfo, setPaymentInfo] = useState(null)

  useEffect(() => {
    getPaymentSettings()
      .then(setPaymentInfo)
      .catch(() => {})
  }, [])

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
    if (!form.refund_method) {
      setError('Seleccioná un método de devolución.')
      return
    }

    if (form.refund_method === 'banco') {
      if (!form.banco_nombre) {
        setError('Seleccioná tu banco.')
        return
      }
      if (!form.cuenta_interbancaria.trim()) {
        setError('Ingresá tu número de cuenta interbancaria (CCI).')
        return
      }
      if (!form.cuenta_numero.trim() || form.cuenta_numero.trim().length < 8) {
        setError('El número de cuenta debe tener al menos 8 caracteres.')
        return
      }
      if (!/^[a-zA-Z0-9]+$/.test(form.cuenta_numero.trim())) {
        setError('El número de cuenta solo debe contener letras y números.')
        return
      }
    } else {
      if (!/^\d{9}$/.test(form.numero_celular_devolucion.trim())) {
        setError('El número de celular debe tener exactamente 9 dígitos.')
        return
      }
    }

    setLoading(true)
    try {
      const payload = {
        nombre:       form.nombre.trim(),
        departamento: form.departamento.trim(),
        email:        form.email.trim() || null,
        zone_id:      zone.id,
        fecha,
        turno,
        notas:        form.notas.trim() || null,
        refund_method: form.refund_method,
        ...(form.refund_method === 'banco'
          ? {
              banco_nombre:        form.banco_nombre,
              cuenta_numero:       form.cuenta_numero.trim(),
              cuenta_interbancaria: form.cuenta_interbancaria.trim(),
            }
          : {
              numero_celular_devolucion: form.numero_celular_devolucion.trim(),
            }),
      }
      const data = await createReservation(payload)
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

          {/* Datos de transferencia dinámicos */}
          <div className="rp-info-box">
            <strong>Datos para la transferencia</strong>
            {paymentInfo ? (
              <div className="rp-payment-data">
                {paymentInfo.bank_account && (
                  <div className="rp-payment-row">
                    <span>Cuenta bancaria</span>
                    <strong>{paymentInfo.bank_account}</strong>
                  </div>
                )}
                {paymentInfo.interbank_account && (
                  <div className="rp-payment-row">
                    <span>CCI (interbancaria)</span>
                    <strong>{paymentInfo.interbank_account}</strong>
                  </div>
                )}
                {!paymentInfo.bank_account && !paymentInfo.interbank_account && (
                  <p className="rp-payment-empty">El administrador aún no configuró los datos de pago.</p>
                )}
              </div>
            ) : (
              <div className="rp-payment-loading">Cargando…</div>
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

            {/* ── Datos para devolución de garantía ─────────────────── */}
            <div className="rp-section-title">Datos para devolución de garantía</div>

            <div className="field">
              <label>Método de devolución <span className="req">*</span></label>
              <select
                name="refund_method"
                value={form.refund_method}
                onChange={handleChange}
                required
                disabled={loading}
              >
                <option value="">Seleccioná un método</option>
                {REFUND_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Campos para transferencia bancaria */}
            {form.refund_method === 'banco' && (
              <>
                <div className="field">
                  <label>Banco <span className="req">*</span></label>
                  <select
                    name="banco_nombre"
                    value={form.banco_nombre}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  >
                    <option value="">Seleccioná tu banco</option>
                    {BANCOS_PERU.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Número de cuenta interbancaria (CCI) <span className="req">*</span></label>
                  <input
                    name="cuenta_interbancaria"
                    value={form.cuenta_interbancaria}
                    onChange={handleChange}
                    placeholder="Ej: 00219412345678901234"
                    disabled={loading}
                    maxLength={30}
                  />
                  <span className="field-hint">Código de 20 dígitos para transferencias interbancarias.</span>
                </div>

                <div className="field">
                  <label>Número de cuenta <span className="req">*</span></label>
                  <input
                    name="cuenta_numero"
                    value={form.cuenta_numero}
                    onChange={handleChange}
                    placeholder="Ej: 19412345678901"
                    disabled={loading}
                    maxLength={20}
                  />
                  <span className="field-hint">Solo letras y números, mínimo 8 caracteres.</span>
                </div>
              </>
            )}

            {/* Campos para Plin o Yape */}
            {(form.refund_method === 'plin' || form.refund_method === 'yape') && (
              <div className="field">
                <label>
                  Número de celular {form.refund_method === 'plin' ? 'Plin' : 'Yape'} <span className="req">*</span>
                </label>
                <input
                  name="numero_celular_devolucion"
                  value={form.numero_celular_devolucion}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 9)
                    setForm((f) => ({ ...f, numero_celular_devolucion: val }))
                  }}
                  placeholder="Ej: 987654321"
                  disabled={loading}
                  maxLength={9}
                  inputMode="numeric"
                />
                <span className="field-hint">9 dígitos, sin espacios ni guiones.</span>
              </div>
            )}

            <button type="submit" className="btn-primary btn-full" disabled={loading}>
              {loading ? <><span className="spinner" /> Procesando…</> : 'Confirmar reserva →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
