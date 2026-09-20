import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { useUserStore } from '@/stores/user'
import { api } from '@/services/api'
import { MainLayout } from '@/components/layouts/MainLayout'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { HomePage } from '@/pages/Home'
import { FavoritesPage } from '@/pages/Favorites'
import { LoginPage } from '@/pages/Login'
import { RegisterPage } from '@/pages/Register'
import { AdminDashboard } from '@/pages/admin/Dashboard'
import { AdminSources } from '@/pages/admin/Sources'
import { AdminUsers } from '@/pages/admin/Users'
import { AdminContent } from '@/pages/admin/Content'
import { AdminConfig } from '@/pages/admin/Config'
import { AdminLogs } from '@/pages/admin/Logs'
import { Toaster } from 'sonner'

// Initialize token
const { token } = useUserStore.getState()
if (token) {
  api.setToken(token)
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useUserStore()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin } = useUserStore()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="favorites" element={<FavoritesPage />} />
          </Route>

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="sources" element={<AdminSources />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="content" element={<AdminContent />} />
            <Route path="config" element={<AdminConfig />} />
            <Route path="logs" element={<AdminLogs />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
