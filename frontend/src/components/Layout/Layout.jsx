import Navbar from './Navbar'
import './Layout.css'

export default function Layout({ children }) {
  return (
    <div className="layout">
      <Navbar />
      <main className="layout-main">{children}</main>
      <footer className="layout-footer">
        <p>Sistema de Reservas · Zona de Parrilla</p>
      </footer>
    </div>
  )
}
