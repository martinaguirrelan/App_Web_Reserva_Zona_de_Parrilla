import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Calendar from '../components/Calendar/Calendar'
import TimeSlots from '../components/TimeSlots/TimeSlots'
import { SkeletonCalendar, SkeletonCard } from '../components/Skeleton/Skeleton'
import { getZones } from '../api/zones'
import { getCalendar, getSlots } from '../api/reservations'
import { formatCurrency, formatDateLong } from '../utils/format'
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

  useEffect(() => {
    getZones()
      .then((data) => {
        setZones(data)
        if (data.length > 0) setSelectedZone(data[0])
      })
      .catch(() => setError('No se pudieron cargar las zonas. Verificá que el backend esté activo.'))
  }, [])

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

  const handleSelectDate = (dateStr) => {
    setSelectedDate(dateStr)
    setSelectedTurno(null)
    setSlots([])
    setLoadingSlots(true)
    getSlots(selectedZone.id, dateStr)
      .then(setSlots)
      .catch(() => setError('Error al cargar disponibilidad.'))
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

  // Memoizamos el slot seleccionado para no recalcular en cada render
  const slotSeleccionado = useMemo(
    () => slots.find(s => s.turno === selectedTurno),
    [slots, selectedTurno]
  )

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
        <p>Seleccioná la zona y el día que más te convenga. Solo una reserva por día.</p>
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
                <span className="zone-btn-price">{formatCurrency(z.precio_base)}</span>
              </button>
            ))}
          </div>

          {/* Descripción de la zona seleccionada */}
          {selectedZone?.descripcion && (
            <div className="zone-desc-card">
              <span className="zone-desc-label">Zona de Parrilla</span>
              <p className="zone-desc-text">{selectedZone.descripcion}</p>
            </div>
          )}

          <div className="home-grid">
            {/* Columna izquierda: calendario */}
            <div className="home-left">
              {loadingCal ? (
                <SkeletonCalendar />
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

            {/* Columna derecha: turno + acción */}
            <div className="home-right">
              {!selectedDate ? (
                <div className="home-prompt">
                  <span className="prompt-icon">📅</span>
                  <p>Seleccioná un día disponible en el calendario.</p>
                  <p className="prompt-hint">El espacio es de uso exclusivo: solo una reserva por día.</p>
                </div>
              ) : loadingSlots ? (
                <SkeletonCard />
              ) : (
                <>
                  <div className="selected-date-label">
                    <span className="sdl-dot" />
                    {formatDateLong(selectedDate)}
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
                        <span>Horario</span>
                        <strong>{slotSeleccionado?.label}</strong>
                      </div>
                      <div className="rs-row">
                        <span>Total</span>
                        <strong className="rs-price">{formatCurrency(selectedZone.precio_base)}</strong>
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
