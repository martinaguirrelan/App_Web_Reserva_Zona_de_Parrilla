import './Skeleton.css'

export function SkeletonBlock({ width = '100%', height = '1rem', radius = '6px', className = '' }) {
  return (
    <div
      className={`skeleton-block ${className}`}
      style={{ width, height, borderRadius: radius }}
    />
  )
}

export function SkeletonCalendar() {
  return (
    <div className="skeleton-calendar">
      <div className="sk-cal-header">
        <SkeletonBlock width="32px" height="32px" radius="6px" />
        <SkeletonBlock width="140px" height="24px" />
        <SkeletonBlock width="32px" height="32px" radius="6px" />
      </div>
      <div className="sk-cal-days">
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonBlock key={i} width="32px" height="16px" />
        ))}
      </div>
      <div className="sk-cal-grid">
        {Array.from({ length: 35 }).map((_, i) => (
          <SkeletonBlock key={i} width="100%" height="44px" radius="8px" />
        ))}
      </div>
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <SkeletonBlock height="1rem" width="60%" />
      <SkeletonBlock height="0.85rem" width="40%" />
      <SkeletonBlock height="0.85rem" width="80%" />
    </div>
  )
}
