import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import HomePage from './pages/HomePage'
import ReservationPage from './pages/ReservationPage'
import ConfirmationPage from './pages/ConfirmationPage'
import ReservationDetailPage from './pages/ReservationDetailPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/"            element={<HomePage />} />
        <Route path="/reservar"    element={<ReservationPage />} />
        <Route path="/confirmacion" element={<ConfirmationPage />} />
        <Route path="/mi-reserva"  element={<ReservationDetailPage />} />
        <Route path="/reserva/:codigo" element={<ReservationDetailPage />} />
        <Route path="/admin"       element={<AdminPage />} />
      </Routes>
    </Layout>
  )
}
