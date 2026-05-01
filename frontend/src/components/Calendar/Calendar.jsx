import './Calendar.css'

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month - 1, 1).getDay()
}

export default function Calendar({ year, month, availability, selectedDate, onSelectDate, onPrev, onNext }) {
  const daysInMonth = getDaysInMonth(year, month)
  const firstDow = getFirstDayOfWeek(year, month)
  const today = new Date().toISOString().split('T')[0]

  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    cells.push({ day: d, dateStr, ...(availability[dateStr] || {}) })
  }

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button className="cal-nav" onClick={onPrev} aria-label="Mes anterior">‹</button>
        <h2 className="cal-title">{MESES[month - 1]} {year}</h2>
        <button className="cal-nav" onClick={onNext} aria-label="Mes siguiente">›</button>
      </div>

      <div className="calendar-legend">
        <span className="leg-item"><span className="leg-dot libre" />Disponible</span>
        <span className="leg-item"><span className="leg-dot parcial" />Parcial</span>
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

          return (
            <div
              key={cell.dateStr}
              className={[
                'cal-cell',
                estado,
                isSelected ? 'selected' : '',
                isPast ? 'past' : '',
              ].join(' ')}
              onClick={() => !isPast && estado !== 'lleno' && onSelectDate(cell.dateStr)}
              title={isPast ? 'Fecha pasada' : `${cell.disponibles ?? '?'} turno(s) disponible(s)`}
            >
              <span className="cal-day-num">{cell.day}</span>
              {!isPast && estado !== 'pasado' && (
                <span className="cal-dots">
                  {Array.from({ length: cell.disponibles ?? 0 }).map((_, k) => (
                    <span key={k} className="cal-dot-mini" />
                  ))}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
