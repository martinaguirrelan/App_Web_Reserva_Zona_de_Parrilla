import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout/Layout'
import HomePage from './pages/HomePage'
import ReservationPage from './pages/ReservationPage'
import ConfirmationPage from './pages/ConfirmationPage'
import ReservationDetailPage from './pages/ReservationDetailPage'
import AdminPage from './pages/AdminPage'
import LoginPage from './pages/LoginPage'

function PrivateRoute({ children }) {
  const { isAdmin } = useAuth()
  const location = useLocation()
  if (!isAdmin) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Layout />}>
        <Route path="/"              element={<HomePage />} />
        <Route path="/reservar"      element={<ReservationPage />} />
        <Route path="/confirmacion"  element={<ConfirmationPage />} />
        <Route path="/mi-reserva"    element={<ReservationDetailPage />} />
        <Route path="/reserva/:codigo" element={<ReservationDetailPage />} />
        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <AdminPage />
            </PrivateRoute>
          }
        />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
