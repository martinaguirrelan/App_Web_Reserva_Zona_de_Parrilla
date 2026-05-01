import { Link, useLocation } from 'react-router-dom'
import './Navbar.css'

export default function Navbar() {
  const { pathname } = useLocation()

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="navbar-icon">🔥</span>
        <span>Zona de Parrilla</span>
      </Link>
      <div className="navbar-links">
        <Link to="/" className={pathname === '/' ? 'active' : ''}>Calendario</Link>
        <Link to="/mi-reserva" className={pathname === '/mi-reserva' ? 'active' : ''}>Mi Reserva</Link>
        <Link to="/admin" className={`navbar-admin ${pathname.startsWith('/admin') ? 'active' : ''}`}>Admin</Link>
      </div>
    </nav>
  )
}
