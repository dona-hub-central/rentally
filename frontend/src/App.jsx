import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CartProvider } from './context/CartContext'

// Auth pages
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import LandingPage from './pages/LandingPage'

// Client pages
import Layout from './components/Layout'
import OnboardingView from './pages/OnboardingView'
import DashboardView from './pages/DashboardView'
import CatalogView from './pages/CatalogView'
import OrdersView from './pages/OrdersView'
import OrderDetailView from './pages/OrderDetailView'
import AddressesView from './pages/AddressesView'
import ProfileView from './pages/ProfileView'

// Admin pages
import AdminLayout from './components/AdminLayout'
import AdminDashboardView from './pages/admin/AdminDashboardView'
import AdminUsersView from './pages/admin/AdminUsersView'
import AdminOrdersView from './pages/admin/AdminOrdersView'
import AdminCatalogView from './pages/admin/AdminCatalogView'
import AdminAddressesView from './pages/admin/AdminAddressesView'
import AdminContractView from './pages/admin/AdminContractView'
import AdminImportView from './pages/admin/AdminImportView'

function PrivateRoute({ children, requiredRole }) {
  const { user, loading } = useAuth()
  
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
  
  if (!user) return <Navigate to="/login" replace />
  
  if (requiredRole && user.rol !== requiredRole) {
    return <Navigate to={user.rol === 'admin' ? '/admin' : '/app'} replace />
  }
  
  return children
}

function ClientRoute({ children }) {
  const { user } = useAuth()
  
  if (!user) return <Navigate to="/login" replace />
  if (user.rol === 'admin') return <Navigate to="/admin" replace />
  
  // Check if user needs onboarding
  const needsOnboarding = !user.email_verified || 
    user.estado === 'pendiente' || 
    user.estado === 'verificado' ||
    !user.has_signed_contract ||
    !user.has_fianza

  if (needsOnboarding && window.location.pathname !== '/app/onboarding') {
    return <Navigate to="/app/onboarding" replace />
  }
  
  return children
}

function HomeRoute() {
  const { user, loading } = useAuth()
  
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
  
  if (user) {
    return <Navigate to={user.rol === 'admin' ? '/admin' : '/app'} replace />
  }
  
  return <LandingPage />
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomeRoute />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Client routes */}
            <Route path="/app" element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }>
              <Route index element={<Navigate to="/app/dashboard" replace />} />
              <Route path="onboarding" element={<OnboardingView />} />
              <Route path="dashboard" element={
                <ClientRoute><DashboardView /></ClientRoute>
              } />
              <Route path="catalog" element={
                <ClientRoute><CatalogView /></ClientRoute>
              } />
              <Route path="orders" element={
                <ClientRoute><OrdersView /></ClientRoute>
              } />
              <Route path="orders/:id" element={
                <ClientRoute><OrderDetailView /></ClientRoute>
              } />
              <Route path="addresses" element={
                <ClientRoute><AddressesView /></ClientRoute>
              } />
              <Route path="profile" element={
                <ClientRoute><ProfileView /></ClientRoute>
              } />
            </Route>

            {/* Admin routes */}
            <Route path="/admin" element={
              <PrivateRoute requiredRole="admin">
                <AdminLayout />
              </PrivateRoute>
            }>
              <Route index element={<AdminDashboardView />} />
              <Route path="users" element={<AdminUsersView />} />
              <Route path="orders" element={<AdminOrdersView />} />
              <Route path="catalog" element={<AdminCatalogView />} />
              <Route path="addresses" element={<AdminAddressesView />} />
              <Route path="contracts" element={<AdminContractView />} />
              <Route path="import" element={<AdminImportView />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  )
}
