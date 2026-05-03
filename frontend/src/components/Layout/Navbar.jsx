import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './Navbar.css'

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { isAdmin, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
    setMenuOpen(false)
  }

  const close = () => setMenuOpen(false)

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand" onClick={close}>
        <span className="navbar-icon">🔥</span>
        <span>Zona de Parrilla</span>
      </Link>

      {/* Hamburguesa mobile */}
      <button
        className={`navbar-hamburger ${menuOpen ? 'open' : ''}`}
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="Menú"
      >
        <span /><span /><span />
      </button>

      <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
        <Link to="/" className={pathname === '/' ? 'active' : ''} onClick={close}>Calendario</Link>
        <Link to="/mi-reserva" className={pathname === '/mi-reserva' ? 'active' : ''} onClick={close}>Mi Reserva</Link>
        {isAdmin ? (
          <>
            <Link to="/admin" className={`navbar-admin ${pathname.startsWith('/admin') ? 'active' : ''}`} onClick={close}>
              Panel Admin
            </Link>
            <button className="navbar-logout" onClick={handleLogout}>Salir</button>
          </>
        ) : (
          <Link to="/login" className={`navbar-admin ${pathname === '/login' ? 'active' : ''}`} onClick={close}>
            Admin
          </Link>
        )}
      </div>
    </nav>
  )
}
