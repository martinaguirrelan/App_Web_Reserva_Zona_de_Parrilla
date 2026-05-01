import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Calendar from '../components/Calendar/Calendar'
import TimeSlots from '../components/TimeSlots/TimeSlots'
import { getZones } from '../api/zones'
import { getCalendar, getSlots } from '../api/reservations'
import './HomePage.css'

export default function HomePage() {
  const navigate = useNavigate()
  const today = new Date()

  const [zones, setZones] = useState([])
  const [selectedZone, setSelectedZone] = useState(null)
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [availability, setAvailability] = useState({})
  const [selectedDate, setSelectedDate] = useState(null)
  const [slots, setSlots] = useState([])
  const [selectedTurno, setSelectedTurno] = useState(null)
  const [loadingCal, setLoadingCal] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error, setError] = useState(null)

  // Cargar zonas al montar
  useEffect(() => {
    getZones()
      .then((data) => {
        setZones(data)
        if (data.length > 0) setSelectedZone(data[0])
      })
      .catch(() => setError('No se pudieron cargar las zonas. Verificá que el backend esté activo.'))
  }, [])

  // Cargar calendario cuando cambia zona o mes
  const fetchCalendar = useCallback(() => {
    if (!selectedZone) return
    setLoadingCal(true)
    setAvailability({})
    setSelectedDate(null)
    setSlots([])
    setSelectedTurno(null)
    getCalendar(selectedZone.id, year, month)
      .then(setAvailability)
      .catch(() => setError('Error al cargar disponibilidad.'))
      .finally(() => setLoadingCal(false))
  }, [selectedZone, year, month])

  useEffect(() => { fetchCalendar() }, [fetchCalendar])

  // Cargar turnos cuando se selecciona un día
  const handleSelectDate = (dateStr) => {
    setSelectedDate(dateStr)
    setSelectedTurno(null)
    setSlots([])
    setLoadingSlots(true)
    getSlots(selectedZone.id, dateStr)
      .then(setSlots)
      .catch(() => setError('Error al cargar turnos.'))
      .finally(() => setLoadingSlots(false))
  }

  const handlePrevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }

  const handleNextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const handleReservar = () => {
    navigate('/reservar', { state: { zone: selectedZone, fecha: selectedDate, turno: selectedTurno } })
  }

  const formatFecha = (dateStr) => {
    const [y, m, d] = dateStr.split('-')
    return new Date(y, m - 1, d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  if (error && zones.length === 0) {
    return (
      <div className="home-error">
        <p>{error}</p>
        <a href="/admin" className="btn-primary">Ir al Panel Admin</a>
      </div>
    )
  }

  return (
    <div className="home">
      <div className="home-hero">
        <h1>Reservá tu espacio</h1>
        <p>Seleccioná la zona, el día y el turno que más te convenga.</p>
      </div>

      {zones.length === 0 ? (
        <div className="home-empty">
          <p>No hay zonas configuradas aún.</p>
          <a href="/admin" className="btn-primary">Configurar zonas</a>
        </div>
      ) : (
        <>
          {/* Selector de zona */}
          <div className="zone-selector">
            {zones.map((z) => (
              <button
                key={z.id}
                className={`zone-btn ${selectedZone?.id === z.id ? 'active' : ''}`}
                onClick={() => { setSelectedZone(z); setSelectedDate(null); setSlots([]); setSelectedTurno(null) }}
              >
                <span className="zone-btn-name">{z.nombre}</span>
                <span className="zone-btn-price">${Number(z.precio_base).toLocaleString('es-AR')}</span>
              </button>
            ))}
          </div>

          <div className="home-grid">
            {/* Columna izquierda: calendario */}
            <div className="home-left">
              {loadingCal ? (
                <div className="loading-box"><span className="spinner" />Cargando disponibilidad…</div>
              ) : (
                <Calendar
                  year={year}
                  month={month}
                  availability={availability}
                  selectedDate={selectedDate}
                  onSelectDate={handleSelectDate}
                  onPrev={handlePrevMonth}
                  onNext={handleNextMonth}
                />
              )}
            </div>

            {/* Columna derecha: turnos + acción */}
            <div className="home-right">
              {!selectedDate ? (
                <div className="home-prompt">
                  <span className="prompt-icon">📅</span>
                  <p>Seleccioná un día en el calendario para ver los turnos disponibles.</p>
                </div>
              ) : loadingSlots ? (
                <div className="loading-box"><span className="spinner" />Cargando turnos…</div>
              ) : (
                <>
                  <div className="selected-date-label">
                    <span className="sdl-dot" />
                    {formatFecha(selectedDate)}
                  </div>

                  <TimeSlots
                    slots={slots}
                    selectedTurno={selectedTurno}
                    onSelectTurno={setSelectedTurno}
                  />

                  {selectedTurno && (
                    <div className="reserve-summary">
                      <div className="rs-row">
                        <span>Zona</span><strong>{selectedZone.nombre}</strong>
                      </div>
                      <div className="rs-row">
                        <span>Turno</span>
                        <strong>{slots.find(s => s.turno === selectedTurno)?.label}</strong>
                      </div>
                      <div className="rs-row">
                        <span>Total</span>
                        <strong className="rs-price">${Number(selectedZone.precio_base).toLocaleString('es-AR')}</strong>
                      </div>
                      <button className="btn-primary btn-full" onClick={handleReservar}>
                        Completar reserva →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
