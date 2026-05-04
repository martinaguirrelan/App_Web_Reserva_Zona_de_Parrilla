import { useState, useEffect, useCallback } from 'react'
import StatusBadge from '../components/StatusBadge/StatusBadge'
import { SkeletonBlock } from '../components/Skeleton/Skeleton'
import {
  adminGetReservations, adminUpdateEstado, adminExportExcel,
  adminGetZones, adminCreateZone, adminUpdateZone, adminDeactivateZone, adminSeed,
} from '../api/admin'
import { adminGetStats } from '../api/auth'
import { formatCurrency, formatDateShort } from '../utils/format'
import client from '../api/client'
import './AdminPage.css'

const ESTADOS = ['', 'pendiente_pago', 'en_revision', 'confirmada', 'rechazada', 'cancelada', 'pendiente_devolucion']
const ESTADO_LABELS = {
  '': 'Todos',
  pendiente_pago:       'Pendiente de Pago',
  en_revision:          'En Revisión',
  confirmada:           'Confirmada',
  rechazada:            'Rechazada',
  cancelada:            'Cancelada',
  pendiente_devolucion: 'Pendiente Devolución',
}

export default function AdminPage() {
  const [tab, setTab] = useState('stats')

  // ── Stats ─────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(false)

  const fetchStats = useCallback(() => {
    setLoadingStats(true)
    adminGetStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoadingStats(false))
  }, [])

  useEffect(() => { if (tab === 'stats') fetchStats() }, [fetchStats, tab])

  // ── Reservas ──────────────────────────────────────────────────────────────
  const [reservas, setReservas] = useState([])
  const [filterEstado, setFilterEstado] = useState('')
  const [loadingRes, setLoadingRes] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)
  const [resError, setResError] = useState(null)
  const [viewingPayment, setViewingPayment] = useState(null)
  const [loadingPayment, setLoadingPayment] = useState(null)
  const [viewingBanking, setViewingBanking] = useState(null)

  // Modal devolución
  const [devolucionModal, setDevolucionModal] = useState(null) // { reservaId, codigo }
  const [devolucionForm, setDevolucionForm] = useState({ monto_garantia_dev: '', monto_limpieza: '' })
  const [devolucionLoading, setDevolucionLoading] = useState(false)

  const fetchReservas = useCallback(() => {
    setLoadingRes(true)
    setResError(null)
    adminGetReservations(filterEstado || undefined)
      .then(setReservas)
      .catch(() => setResError('Error al cargar las reservas.'))
      .finally(() => setLoadingRes(false))
  }, [filterEstado])

  useEffect(() => { if (tab === 'reservas') fetchReservas() }, [fetchReservas, tab])

  const handleEstado = async (id, newEstado) => {
    setUpdatingId(id)
    try {
      await adminUpdateEstado(id, newEstado)
      fetchReservas()
    } catch {
      setResError('No se pudo actualizar el estado.')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleSelectEstado = (reserva, newEstado) => {
    if (newEstado === 'pendiente_devolucion') {
      setDevolucionForm({ monto_garantia_dev: '', monto_limpieza: '' })
      setDevolucionModal({ reservaId: reserva.id, codigo: reserva.codigo })
      return
    }
    handleEstado(reserva.id, newEstado)
  }

  const confirmDevolucion = async () => {
    const garantia = parseFloat(devolucionForm.monto_garantia_dev)
    const limpieza = parseFloat(devolucionForm.monto_limpieza)
    if (isNaN(garantia) || garantia < 0) {
      setResError('Ingresá un monto de garantía válido.')
      return
    }
    if (isNaN(limpieza) || limpieza < 0) {
      setResError('Ingresá un monto de limpieza válido.')
      return
    }
    setDevolucionLoading(true)
    try {
      await adminUpdateEstado(devolucionModal.reservaId, 'pendiente_devolucion', {
        monto_garantia_dev: garantia,
        monto_limpieza: limpieza,
      })
      setDevolucionModal(null)
      fetchReservas()
    } catch {
      setResError('No se pudo actualizar el estado.')
    } finally {
      setDevolucionLoading(false)
    }
  }

  const handleVerComprobante = async (reservaId) => {
    if (viewingPayment?.reservaId === reservaId) {
      setViewingPayment(null)
      return
    }
    setViewingBanking(null)
    setLoadingPayment(reservaId)
    try {
      const data = await client.get(`/admin/reservations/${reservaId}/payment`).then(r => r.data)
      setViewingPayment({ reservaId, ...data })
    } catch {
      setResError('Sin comprobante cargado para esta reserva.')
    } finally {
      setLoadingPayment(null)
    }
  }

  const handleVerBanking = (reserva) => {
    if (viewingBanking?.id === reserva.id) {
      setViewingBanking(null)
      return
    }
    setViewingPayment(null)
    setViewingBanking(reserva)
  }

  const handleExportExcel = () => {
    adminExportExcel(filterEstado || undefined).catch(() => setResError('No se pudo exportar.'))
  }

  // ── Zonas ─────────────────────────────────────────────────────────────────
  const [zones, setZones] = useState([])
  const [loadingZones, setLoadingZones] = useState(false)
  const [zoneError, setZoneError] = useState(null)
  const [zoneMsg, setZoneMsg] = useState(null)
  const [editingZone, setEditingZone] = useState(null)
  const [zoneForm, setZoneForm] = useState({ nombre: '', descripcion: '', precio_base: '' })
  const [showNewForm, setShowNewForm] = useState(false)
  const [newZoneForm, setNewZoneForm] = useState({ nombre: '', descripcion: '', precio_base: '' })

  const fetchZones = useCallback(() => {
    setLoadingZones(true)
    adminGetZones()
      .then(setZones)
      .catch(() => setZoneError('Error al cargar zonas.'))
      .finally(() => setLoadingZones(false))
  }, [])

  useEffect(() => { if (tab === 'zonas') fetchZones() }, [fetchZones, tab])

  const handleSeed = async () => {
    try {
      const r = await adminSeed()
      setZoneMsg(r.mensaje)
      fetchZones()
    } catch (err) { setZoneError(err.message) }
  }

  const startEdit = (z) => {
    setEditingZone(z.id)
    setZoneForm({ nombre: z.nombre, descripcion: z.descripcion || '', precio_base: z.precio_base })
  }

  const saveEdit = async (id) => {
    try {
      await adminUpdateZone(id, {
        nombre: zoneForm.nombre,
        descripcion: zoneForm.descripcion || null,
        precio_base: parseFloat(zoneForm.precio_base),
      })
      setEditingZone(null)
      setZoneMsg('Zona actualizada.')
      fetchZones()
    } catch (err) { setZoneError(err.message) }
  }

  const handleDeactivate = async (id) => {
    if (!confirm('¿Desactivar esta zona?')) return
    try {
      await adminDeactivateZone(id)
      setZoneMsg('Zona desactivada.')
      fetchZones()
    } catch (err) { setZoneError(err.message) }
  }

  const handleCreateZone = async (e) => {
    e.preventDefault()
    try {
      await adminCreateZone({
        nombre: newZoneForm.nombre,
        descripcion: newZoneForm.descripcion || null,
        precio_base: parseFloat(newZoneForm.precio_base),
      })
      setNewZoneForm({ nombre: '', descripcion: '', precio_base: '' })
      setShowNewForm(false)
      setZoneMsg('Zona creada.')
      fetchZones()
    } catch (err) { setZoneError(err.message) }
  }

  // ── Cálculo neto devolución ────────────────────────────────────────────────
  const garantia = parseFloat(devolucionForm.monto_garantia_dev) || 0
  const limpieza = parseFloat(devolucionForm.monto_limpieza) || 0
  const neto = garantia - limpieza

  return (
    <div className="admin">
      {/* Modal devolución */}
      {devolucionModal && (
        <div className="modal-overlay" onClick={() => setDevolucionModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Gestión de Devolución</h3>
              <button className="btn-ghost" onClick={() => setDevolucionModal(null)}>✕</button>
            </div>
            <p className="modal-subtitle">Reserva <strong>{devolucionModal.codigo}</strong></p>

            <div className="modal-field">
              <label>Devolución de garantía (S/.)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={devolucionForm.monto_garantia_dev}
                onChange={(e) => setDevolucionForm(f => ({ ...f, monto_garantia_dev: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div className="modal-field">
              <label>Cargo por limpieza (S/.)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={devolucionForm.monto_limpieza}
                onChange={(e) => setDevolucionForm(f => ({ ...f, monto_limpieza: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div className="modal-neto">
              <span>Monto neto a devolver</span>
              <strong className={neto < 0 ? 'neto-negativo' : 'neto-positivo'}>
                {formatCurrency(neto)}
              </strong>
            </div>

            <div className="modal-actions">
              <button
                className="btn-primary"
                onClick={confirmDevolucion}
                disabled={devolucionLoading}
              >
                {devolucionLoading ? <><span className="spinner" /> Guardando…</> : 'Confirmar devolución'}
              </button>
              <button className="btn-ghost" onClick={() => setDevolucionModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-header">
        <h1>Panel de administración</h1>
        <p>Gestioná reservas y zonas del sistema.</p>
      </div>

      <div className="admin-tabs">
        <button className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}>Dashboard</button>
        <button className={tab === 'reservas' ? 'active' : ''} onClick={() => setTab('reservas')}>Reservas</button>
        <button className={tab === 'zonas' ? 'active' : ''} onClick={() => setTab('zonas')}>Zonas y precios</button>
      </div>

      {/* ── TAB DASHBOARD ──────────────────────────────────────────────────── */}
      {tab === 'stats' && (
        <div className="admin-section">
          <div className="admin-toolbar">
            <button className="btn-ghost" onClick={fetchStats}>↻ Actualizar</button>
          </div>

          {loadingStats ? (
            <div className="stats-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="stat-card">
                  <SkeletonBlock height="1.5rem" width="50%" />
                  <SkeletonBlock height="2.5rem" width="40%" />
                </div>
              ))}
            </div>
          ) : stats ? (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-label">Total reservas</span>
                  <span className="stat-value">{stats.total_reservas}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Últimos 30 días</span>
                  <span className="stat-value">{stats.reservas_recientes_30d}</span>
                </div>
                <div className="stat-card accent">
                  <span className="stat-label">Ingresos confirmados</span>
                  <span className="stat-value">{formatCurrency(stats.ingresos_confirmados)}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Ingresos proyectados</span>
                  <span className="stat-value">{formatCurrency(stats.ingresos_proyectados)}</span>
                </div>
              </div>

              <div className="stats-row">
                <div className="stats-panel">
                  <h3>Por estado</h3>
                  {Object.entries(stats.por_estado).map(([estado, count]) => (
                    <div key={estado} className="stats-bar-row">
                      <StatusBadge estado={estado} />
                      <div className="stats-bar-wrap">
                        <div
                          className="stats-bar"
                          style={{ width: `${stats.total_reservas ? (count / stats.total_reservas) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="stats-bar-count">{count}</span>
                    </div>
                  ))}
                </div>

                <div className="stats-panel">
                  <h3>Por zona</h3>
                  {Object.entries(stats.por_zona).length === 0 ? (
                    <p className="empty-state">Sin datos</p>
                  ) : (
                    Object.entries(stats.por_zona).map(([zona, count]) => (
                      <div key={zona} className="stats-zona-row">
                        <span className="stats-zona-name">{zona}</span>
                        <span className="stats-zona-count">{count} reservas</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">No hay datos disponibles.</div>
          )}
        </div>
      )}

      {/* ── TAB RESERVAS ──────────────────────────────────────────────────── */}
      {tab === 'reservas' && (
        <div className="admin-section">
          <div className="admin-toolbar">
            <div className="filter-pills">
              {ESTADOS.map((e) => (
                <button
                  key={e}
                  className={`pill ${filterEstado === e ? 'active' : ''}`}
                  onClick={() => setFilterEstado(e)}
                >
                  {ESTADO_LABELS[e]}
                </button>
              ))}
            </div>
            <div className="toolbar-actions">
              <button className="btn-ghost" onClick={fetchReservas}>↻ Actualizar</button>
              <button className="btn-ghost" onClick={handleExportExcel} title="Descargar Excel">
                ↓ Excel
              </button>
            </div>
          </div>

          {resError && <div className="alert-error">{resError}</div>}

          {/* Visor de comprobante */}
          {viewingPayment && (
            <div className="payment-viewer">
              <div className="pv-header">
                <strong>Comprobante: {viewingPayment.archivo_nombre}</strong>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <a href={viewingPayment.archivo_url} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                    ↗ Abrir
                  </a>
                  <button className="btn-ghost" onClick={() => setViewingPayment(null)}>✕ Cerrar</button>
                </div>
              </div>
              {viewingPayment.archivo_url.match(/\.(jpg|jpeg|png)$/i) ? (
                <img src={viewingPayment.archivo_url} alt="Comprobante" className="pv-image" />
              ) : viewingPayment.archivo_url.match(/\.pdf$/i) || viewingPayment.archivo_url.startsWith('http') ? (
                <iframe
                  src={viewingPayment.archivo_url}
                  className="pv-iframe"
                  title="Comprobante PDF"
                />
              ) : (
                <a href={viewingPayment.archivo_url} target="_blank" rel="noopener noreferrer" className="btn-primary">
                  Abrir archivo →
                </a>
              )}
              {viewingPayment.notas_admin && (
                <p className="pv-notes">Notas: {viewingPayment.notas_admin}</p>
              )}
            </div>
          )}

          {/* Visor de datos bancarios */}
          {viewingBanking && (
            <div className="payment-viewer banking-viewer">
              <div className="pv-header">
                <strong>Datos bancarios — {viewingBanking.codigo}</strong>
                <button className="btn-ghost" onClick={() => setViewingBanking(null)}>✕ Cerrar</button>
              </div>
              <div className="banking-grid">
                <div className="banking-row">
                  <span>Banco</span>
                  <strong>{viewingBanking.banco_nombre || '—'}</strong>
                </div>
                <div className="banking-row">
                  <span>N° de cuenta</span>
                  <strong>{viewingBanking.cuenta_numero || '—'}</strong>
                </div>
                <div className="banking-row">
                  <span>Garantía a devolver</span>
                  <strong>{viewingBanking.monto_garantia_dev != null ? formatCurrency(viewingBanking.monto_garantia_dev) : '—'}</strong>
                </div>
                <div className="banking-row">
                  <span>Cargo limpieza</span>
                  <strong>{viewingBanking.monto_limpieza != null ? formatCurrency(viewingBanking.monto_limpieza) : '—'}</strong>
                </div>
                {viewingBanking.monto_garantia_dev != null && viewingBanking.monto_limpieza != null && (
                  <div className="banking-row banking-neto">
                    <span>Monto neto a transferir</span>
                    <strong>{formatCurrency(parseFloat(viewingBanking.monto_garantia_dev) - parseFloat(viewingBanking.monto_limpieza))}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {loadingRes ? (
            <div className="loading-row"><span className="spinner" /> Cargando…</div>
          ) : reservas.length === 0 ? (
            <div className="empty-state">No hay reservas con este filtro.</div>
          ) : (
            <div className="reservas-table-wrap">
              <table className="reservas-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Residente</th>
                    <th>Zona</th>
                    <th>Fecha</th>
                    <th>Horario</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Comprobante</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {reservas.map((r) => (
                    <tr key={r.id}>
                      <td className="col-code">{r.codigo}</td>
                      <td>
                        <div className="res-user">{r.usuario.nombre}</div>
                        <div className="res-depto">Depto {r.usuario.departamento}</div>
                      </td>
                      <td>{r.zona.nombre}</td>
                      <td>{formatDateShort(r.fecha)}</td>
                      <td className="col-time">{r.hora_inicio.slice(0,5)} – {r.hora_fin.slice(0,5)}</td>
                      <td>{formatCurrency(r.monto_total)}</td>
                      <td><StatusBadge estado={r.estado} /></td>
                      <td>
                        <div className="pv-btns">
                          {r.estado !== 'pendiente_pago' && (
                            <button
                              className="btn-ghost"
                              disabled={loadingPayment === r.id}
                              onClick={() => handleVerComprobante(r.id)}
                            >
                              {loadingPayment === r.id ? <span className="spinner" /> : '👁 Ver'}
                            </button>
                          )}
                          {r.estado === 'pendiente_devolucion' && r.banco_nombre && (
                            <button
                              className="btn-ghost btn-purple"
                              onClick={() => handleVerBanking(r)}
                            >
                              🏦 Datos
                            </button>
                          )}
                          {r.estado === 'pendiente_pago' && (
                            <span className="col-na">—</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <select
                          className="estado-select"
                          value={r.estado}
                          disabled={updatingId === r.id}
                          onChange={(e) => handleSelectEstado(r, e.target.value)}
                        >
                          {Object.entries(ESTADO_LABELS).filter(([k]) => k !== '').map(([s, label]) => (
                            <option key={s} value={s}>{label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB ZONAS ─────────────────────────────────────────────────────── */}
      {tab === 'zonas' && (
        <div className="admin-section">
          {zoneError && <div className="alert-error" onClick={() => setZoneError(null)}>{zoneError} ✕</div>}
          {zoneMsg  && <div className="alert-success" onClick={() => setZoneMsg(null)}>{zoneMsg} ✕</div>}

          <div className="admin-toolbar">
            <button className="btn-primary" onClick={() => setShowNewForm(!showNewForm)}>
              {showNewForm ? 'Cancelar' : '+ Nueva zona'}
            </button>
            {zones.length === 0 && (
              <button className="btn-ghost" onClick={handleSeed}>Cargar zonas por defecto</button>
            )}
          </div>

          {showNewForm && (
            <form className="zone-form" onSubmit={handleCreateZone}>
              <h3>Nueva zona</h3>
              <div className="zone-form-grid">
                <div className="field">
                  <label>Nombre *</label>
                  <input value={newZoneForm.nombre} onChange={e => setNewZoneForm(f => ({...f, nombre: e.target.value}))} required />
                </div>
                <div className="field">
                  <label>Precio base (S/.) *</label>
                  <input type="number" min="0" step="0.01" value={newZoneForm.precio_base} onChange={e => setNewZoneForm(f => ({...f, precio_base: e.target.value}))} required />
                </div>
                <div className="field zone-form-full">
                  <label>Descripción</label>
                  <input value={newZoneForm.descripcion} onChange={e => setNewZoneForm(f => ({...f, descripcion: e.target.value}))} />
                </div>
              </div>
              <button type="submit" className="btn-primary">Crear zona</button>
            </form>
          )}

          {loadingZones ? (
            <div className="loading-row"><span className="spinner" /> Cargando zonas…</div>
          ) : zones.length === 0 ? (
            <div className="empty-state">No hay zonas configuradas. Creá una o usá "Cargar zonas por defecto".</div>
          ) : (
            <div className="zones-list">
              {zones.map((z) => (
                <div key={z.id} className={`zone-card ${!z.activa ? 'inactive' : ''}`}>
                  {editingZone === z.id ? (
                    <div className="zone-edit-form">
                      <div className="zone-form-grid">
                        <div className="field">
                          <label>Nombre</label>
                          <input value={zoneForm.nombre} onChange={e => setZoneForm(f => ({...f, nombre: e.target.value}))} />
                        </div>
                        <div className="field">
                          <label>Precio base (S/.)</label>
                          <input type="number" min="0" step="0.01" value={zoneForm.precio_base} onChange={e => setZoneForm(f => ({...f, precio_base: e.target.value}))} />
                        </div>
                        <div className="field zone-form-full">
                          <label>Descripción</label>
                          <input value={zoneForm.descripcion} onChange={e => setZoneForm(f => ({...f, descripcion: e.target.value}))} />
                        </div>
                      </div>
                      <div className="zone-edit-actions">
                        <button className="btn-primary" onClick={() => saveEdit(z.id)}>Guardar</button>
                        <button className="btn-ghost" onClick={() => setEditingZone(null)}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="zone-card-info">
                        <div className="zone-card-name">
                          {z.nombre}
                          {!z.activa && <span className="badge-inactive">Inactiva</span>}
                        </div>
                        {z.descripcion && <div className="zone-card-desc">{z.descripcion}</div>}
                        <div className="zone-card-price">{formatCurrency(z.precio_base)}</div>
                      </div>
                      <div className="zone-card-actions">
                        <button className="btn-ghost" onClick={() => startEdit(z)}>Editar</button>
                        {z.activa && (
                          <button className="btn-danger" onClick={() => handleDeactivate(z.id)}>Desactivar</button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
