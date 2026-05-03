import './TimeSlots.css'

export default function TimeSlots({ slots, selectedTurno, onSelectTurno }) {
  if (!slots || slots.length === 0) return null

  return (
    <div className="timeslots">
      <h3 className="timeslots-title">Disponibilidad del día</h3>
      <div className="timeslots-grid">
        {slots.map((slot) => (
          <button
            key={slot.turno}
            disabled={!slot.disponible}
            className={[
              'slot-card',
              !slot.disponible ? 'slot-ocupado' : '',
              selectedTurno === slot.turno ? 'slot-selected' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => slot.disponible && onSelectTurno(slot.turno)}
          >
            <span className="slot-icon">🏠</span>
            <span className="slot-label">{slot.label}</span>
            <span className="slot-time">{slot.hora_inicio} – {slot.hora_fin}</span>
            <span className={`slot-status ${slot.disponible ? 'disp' : 'ocup'}`}>
              {slot.disponible ? 'Disponible' : 'Fecha ocupada'}
            </span>
            {slot.disponible && (
              <span className="slot-exclusivo">Reserva exclusiva del día</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
