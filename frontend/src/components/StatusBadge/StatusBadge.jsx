const CONFIG = {
  pendiente_pago: { label: 'Pendiente de Pago', color: '#94a3b8' },
  en_revision:   { label: 'En Revisión',        color: '#f59e0b' },
  confirmada:    { label: 'Confirmada',          color: '#22c55e' },
  rechazada:     { label: 'Rechazada',           color: '#ef4444' },
  cancelada:     { label: 'Cancelada',           color: '#64748b' },
}

export default function StatusBadge({ estado }) {
  const cfg = CONFIG[estado] || { label: estado, color: '#94a3b8' }
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 12px',
      borderRadius: '999px',
      fontSize: '0.78rem',
      fontWeight: 600,
      letterSpacing: '0.03em',
      color: cfg.color,
      background: `${cfg.color}18`,
      border: `1px solid ${cfg.color}40`,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
      {cfg.label}
    </span>
  )
}
