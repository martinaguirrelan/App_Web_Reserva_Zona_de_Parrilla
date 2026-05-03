import { useMemo } from 'react'
import './Calendar.css'

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

export default function Calendar({ year, month, availability, selectedDate, onSelectDate, onPrev, onNext }) {
  const today = useMemo(() => new Date().toISOString().split('T')[0], [])

  // Memoizamos el cálculo de celdas para evitar re-renderizados costosos
  const cells = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate()
    const firstDow = new Date(year, month - 1, 1).getDay()
    const arr = []
    for (let i = 0; i < firstDow; i++) arr.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      arr.push({ day: d, dateStr, ...(availability[dateStr] || {}) })
    }
    return arr
  }, [year, month, availability])

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button className="cal-nav" onClick={onPrev} aria-label="Mes anterior">‹</button>
        <h2 className="cal-title">{MESES[month - 1]} {year}</h2>
        <button className="cal-nav" onClick={onNext} aria-label="Mes siguiente">›</button>
      </div>

      <div className="calendar-legend">
        <span className="leg-item"><span className="leg-dot libre" />Disponible</span>
        <span className="leg-item"><span className="leg-dot lleno" />Ocupado</span>
      </div>

      <div className="calendar-grid">
        {DIAS.map((d) => (
          <div key={d} className="cal-day-name">{d}</div>
        ))}

        {cells.map((cell, i) => {
          if (!cell) return <div key={`empty-${i}`} className="cal-cell empty" />

          const isPast = cell.dateStr < today
          const isSelected = cell.dateStr === selectedDate
          const estado = cell.estado || 'libre'
          const clickable = !isPast && estado !== 'lleno' && estado !== 'pasado'

          return (
            <div
              key={cell.dateStr}
              className={[
                'cal-cell',
                estado,
                isSelected ? 'selected' : '',
                isPast ? 'past' : '',
                clickable ? 'clickable' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => clickable && onSelectDate(cell.dateStr)}
              title={isPast ? 'Fecha pasada' : estado === 'lleno' ? 'Fecha ocupada' : 'Disponible'}
            >
              <span className="cal-day-num">{cell.day}</span>
              {!isPast && estado === 'libre' && (
                <span className="cal-dot-mini" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
