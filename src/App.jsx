import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Builder from './pages/Builder'
import Review from './pages/Review'
import Translate from './pages/Translate'
import Hotels from './pages/Hotels'
import Team from './pages/Team'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <p className="p-8 text-ink-600 text-sm">Loading…</p>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/builder/:id" element={<Builder />} />
        <Route path="/review/:id" element={<Review />} />
        <Route path="/translate/:id" element={<Translate />} />
        <Route path="/hotels" element={<Hotels />} />
        <Route path="/team" element={<Team />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
