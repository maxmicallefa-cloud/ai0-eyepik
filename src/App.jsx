import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CompanyView from './pages/CompanyView'

function AppRoutes() {
  const { user, loading, denied } = useAuth()

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0e0e0e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 20, color: '#bf57ff', letterSpacing: '0.08em' }}>
        EYE<span style={{ color: '#e0e0d8' }}>PIK</span>
      </div>
    </div>
  )

  if (!user) return <Login denied={denied} />

  return (
    <Routes>
      <Route path="/"                  element={<Dashboard />} />
      <Route path="/company/:companyId" element={<CompanyView />} />
      <Route path="*"                  element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
