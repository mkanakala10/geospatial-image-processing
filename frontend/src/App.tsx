import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import Layout from '@/components/Layout'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import MapPage from '@/pages/MapPage'
import AnalysisPage from '@/pages/AnalysisPage'
import AnalysisDetailPage from '@/pages/AnalysisDetailPage'
import AdminPage from '@/pages/AdminPage'

function ProtectedRoute({ children, requiredRoles }: {
  children: React.ReactNode
  requiredRoles?: Array<'admin' | 'analyst' | 'viewer'>
}) {
  const { isAuthenticated, hasRole } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (requiredRoles && !hasRole(requiredRoles)) return <Navigate to="/" replace />
  return <>{children}</>
}

const base = import.meta.env.BASE_URL

export default function App() {
  return (
    <BrowserRouter basename={base}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="map" element={<MapPage />} />
          <Route
            path="analysis"
            element={
              <ProtectedRoute requiredRoles={['analyst', 'admin']}>
                <AnalysisPage />
              </ProtectedRoute>
            }
          />
          <Route path="analysis/:id" element={<AnalysisDetailPage />} />
          <Route
            path="admin"
            element={
              <ProtectedRoute requiredRoles={['admin']}>
                <AdminPage />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
