import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge/StatusBadge'
import { getReservationByCodigo, uploadPayment } from '../api/reservations'
import { formatCurrency, formatDateLong } from '../utils/format'
import './ReservationDetailPage.css'

export default function ReservationDetailPage() {
  const { codigo } = useParams()
  const navigate = useNavigate()

  const [reserva, setReserva] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchCode, setSearchCode] = useState(codigo || '')
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState(null)
  const [file, setFile] = useState(null)

  const fetchReserva = async (code) => {
    setError(null)
    setReserva(null)
    setLoading(true)
    try {
      const data = await getReservationByCodigo(code.trim().toUpperCase())
      setReserva(data)
      navigate(`/reserva/${data.codigo}`, { replace: true })
    } catch {
      setError('No se encontró ninguna reserva con ese código.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchCode.trim()) fetchReserva(searchCode)
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) { setError('Seleccioná un archivo.'); return }
    setUploading(true)
    setError(null)
    setUploadMsg(null)
    try {
      await uploadPayment(reserva.id, file)
      setUploadMsg('¡Comprobante enviado! Tu reserva pasó a "En Revisión".')
      setFile(null)
      fetchReserva(reserva.codigo)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    if (codigo) fetchReserva(codigo)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rdp">
      <Link to="/" className="rdp-back">← Volver al calendario</Link>
      <h1 className="rdp-title">Consultar reserva</h1>

      {/* Buscador */}
      <form className="rdp-search" onSubmit={handleSearch}>
        <input
          value={searchCode}
          onChange={(e) => setSearchCode(e.target.value)}
          placeholder="Ingresá tu código (ej: RES-202505-0001)"
          disabled={loading}
        />
        <button type="submit" className="btn-primary" disabled={loading || !searchCode.trim()}>
          {loading ? <span className="spinner" /> : 'Buscar'}
        </button>
      </form>

      {error && <div className="alert-error">{error}</div>}
      {uploadMsg && <div className="alert-success">{uploadMsg}</div>}

      {reserva && (
        <div className="rdp-card">
          <div className="rdp-header">
            <div>
              <div className="rdp-codigo">{reserva.codigo}</div>
              <StatusBadge estado={reserva.estado} />
            </div>
            <div className="rdp-monto">{formatCurrency(reserva.monto_total)}</div>
          </div>

          <div className="rdp-details">
            <div className="rdp-detail-row"><span>Zona</span><strong>{reserva.zona.nombre}</strong></div>
            <div className="rdp-detail-row"><span>Fecha</span><strong>{formatDateLong(reserva.fecha)}</strong></div>
            <div className="rdp-detail-row"><span>Horario</span><strong>{reserva.hora_inicio.slice(0,5)} – {reserva.hora_fin.slice(0,5)}</strong></div>
            <div className="rdp-detail-row"><span>Residente</span><strong>{reserva.usuario.nombre}</strong></div>
            <div className="rdp-detail-row"><span>Departamento</span><strong>{reserva.usuario.departamento}</strong></div>
            {reserva.notas && <div className="rdp-detail-row"><span>Notas</span><strong>{reserva.notas}</strong></div>}
          </div>

          {/* Upload de comprobante */}
          {reserva.estado === 'pendiente_pago' && (
            <div className="rdp-upload">
              <h3>Subir comprobante de pago</h3>
              <p>Adjuntá la constancia de tu transferencia (JPG, PNG o PDF, máx. 10 MB).</p>
              <form onSubmit={handleUpload} className="rdp-upload-form">
                <label className="rdp-file-label">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => setFile(e.target.files[0])}
                    disabled={uploading}
                  />
                  {file ? `📎 ${file.name}` : '+ Seleccionar archivo'}
                </label>
                <button type="submit" className="btn-primary" disabled={uploading || !file}>
                  {uploading ? <><span className="spinner" /> Subiendo…</> : 'Enviar comprobante'}
                </button>
              </form>
            </div>
          )}

          {reserva.estado === 'en_revision' && (
            <div className="rdp-status-msg en_revision">
              Tu comprobante está siendo revisado por administración. Te confirmaremos a la brevedad.
            </div>
          )}
          {reserva.estado === 'confirmada' && (
            <div className="rdp-status-msg confirmada">
              ¡Tu reserva está confirmada! Nos vemos el día del evento.
            </div>
          )}
          {reserva.estado === 'rechazada' && (
            <div className="rdp-status-msg rechazada">
              Tu comprobante fue rechazado. Comunicate con administración para más información.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
