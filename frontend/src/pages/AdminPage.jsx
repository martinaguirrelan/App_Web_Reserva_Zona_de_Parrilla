import { useState, useEffect, useCallback } from 'react'
import StatusBadge from '../components/StatusBadge/StatusBadge'
import {
  adminGetReservations, adminUpdateEstado,
  adminGetZones, adminCreateZone, adminUpdateZone, adminDeactivateZone, adminSeed,
} from '../api/admin'
import './AdminPage.css'

const ESTADOS = ['', 'pendiente_pago', 'en_revision', 'confirmada', 'rechazada', 'cancelada']
const ESTADO_LABELS = {
  '': 'Todos',
  pendiente_pago: 'Pendiente de Pago',
  en_revision: 'En Revisión',
  confirmada: 'Confirmada',
  rechazada: 'Rechazada',
  cancelada: 'Cancelada',
}

export default function AdminPage() {
  const [tab, setTab] = useState('reservas')

  // ── Reservas ──────────────────────────────────────────────────────────────
  const [reservas, setReservas] = useState([])
  const [filterEstado, setFilterEstado] = useState('')
  const [loadingRes, setLoadingRes] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)
  const [resError, setResError] = useState(null)

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

  // ── Zonas ──────────────────────────────────────────────────────────────────
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
    } catch (err) {
      setZoneError(err.message)
    }
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
    } catch (err) {
      setZoneError(err.message)
    }
  }

  const handleDeactivate = async (id) => {
    if (!confirm('¿Desactivar esta zona?')) return
    try {
      await adminDeactivateZone(id)
      setZoneMsg('Zona desactivada.')
      fetchZones()
    } catch (err) {
      setZoneError(err.message)
    }
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
    } catch (err) {
      setZoneError(err.message)
    }
  }

  const formatFecha = (ds) => {
    if (!ds) return ''
    const [y, m, d] = ds.split('-')
    return new Date(y, m - 1, d).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="admin">
      <div className="admin-header">
        <h1>Panel de administración</h1>
        <p>Gestioná reservas y zonas del sistema.</p>
      </div>

      <div className="admin-tabs">
        <button className={tab === 'reservas' ? 'active' : ''} onClick={() => setTab('reservas')}>Reservas</button>
        <button className={tab === 'zonas' ? 'active' : ''} onClick={() => setTab('zonas')}>Zonas y precios</button>
      </div>

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
            <button className="btn-ghost" onClick={fetchReservas}>↻ Actualizar</button>
          </div>

          {resError && <div className="alert-error">{resError}</div>}

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
                      <td>{formatFecha(r.fecha)}</td>
                      <td className="col-time">{r.hora_inicio.slice(0,5)} – {r.hora_fin.slice(0,5)}</td>
                      <td>${Number(r.monto_total).toLocaleString('es-AR')}</td>
                      <td><StatusBadge estado={r.estado} /></td>
                      <td>
                        <select
                          className="estado-select"
                          value={r.estado}
                          disabled={updatingId === r.id}
                          onChange={(e) => handleEstado(r.id, e.target.value)}
                        >
                          {['pendiente_pago','en_revision','confirmada','rechazada','cancelada'].map((s) => (
                            <option key={s} value={s}>{ESTADO_LABELS[s]}</option>
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
                  <label>Precio base (ARS) *</label>
                  <input type="number" min="0" value={newZoneForm.precio_base} onChange={e => setNewZoneForm(f => ({...f, precio_base: e.target.value}))} required />
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
                          <label>Precio base (ARS)</label>
                          <input type="number" min="0" value={zoneForm.precio_base} onChange={e => setZoneForm(f => ({...f, precio_base: e.target.value}))} />
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
                        <div className="zone-card-price">${Number(z.precio_base).toLocaleString('es-AR')}</div>
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
