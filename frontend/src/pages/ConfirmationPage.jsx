import { useLocation, Link, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import './ConfirmationPage.css'

export default function ConfirmationPage() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const reserva = state?.reserva

  useEffect(() => {
    if (!reserva) navigate('/', { replace: true })
  }, [reserva, navigate])

  if (!reserva) return null

  const formatFecha = (ds) => {
    const [y, m, d] = ds.split('-')
    return new Date(y, m - 1, d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  const copyCode = () => navigator.clipboard.writeText(reserva.codigo)

  return (
    <div className="cp">
      <div className="cp-card">
        <div className="cp-check">✓</div>
        <h1 className="cp-title">¡Reserva creada!</h1>
        <p className="cp-subtitle">Tu lugar está reservado en estado <strong>Pendiente de Pago</strong>.</p>

        <div className="cp-code-box">
          <span className="cp-code-label">Tu código de reserva</span>
          <div className="cp-code-row">
            <span className="cp-code">{reserva.codigo}</span>
            <button className="cp-copy" onClick={copyCode} title="Copiar código">⧉ Copiar</button>
          </div>
          <span className="cp-code-hint">Guardá este código para consultar tu reserva.</span>
        </div>

        <div className="cp-details">
          <div className="cp-detail-row">
            <span>Zona</span><strong>{reserva.zona.nombre}</strong>
          </div>
          <div className="cp-detail-row">
            <span>Fecha</span><strong>{formatFecha(reserva.fecha)}</strong>
          </div>
          <div className="cp-detail-row">
            <span>Horario</span><strong>{reserva.hora_inicio.slice(0,5)} – {reserva.hora_fin.slice(0,5)}</strong>
          </div>
          <div className="cp-detail-row">
            <span>Residente</span><strong>{reserva.usuario.nombre} · Depto {reserva.usuario.departamento}</strong>
          </div>
          <div className="cp-detail-row cp-total-row">
            <span>Total a pagar</span>
            <strong>${Number(reserva.monto_total).toLocaleString('es-AR')}</strong>
          </div>
        </div>

        <div className="cp-steps">
          <p className="cp-steps-title">Próximos pasos</p>
          <div className="cp-step">
            <span className="cp-step-num">1</span>
            <span>Realizá la transferencia por <strong>${Number(reserva.monto_total).toLocaleString('es-AR')}</strong> a la cuenta del consorcio.</span>
          </div>
          <div className="cp-step">
            <span className="cp-step-num">2</span>
            <span>Subí el comprobante desde el detalle de tu reserva para que sea validado.</span>
          </div>
          <div className="cp-step">
            <span className="cp-step-num">3</span>
            <span>Recibirás la confirmación una vez que administración apruebe el pago.</span>
          </div>
        </div>

        <div className="cp-actions">
          <Link to={`/reserva/${reserva.codigo}`} className="btn-primary">
            Subir comprobante →
          </Link>
          <Link to="/" className="btn-secondary">Volver al calendario</Link>
        </div>
      </div>
    </div>
  )
}
