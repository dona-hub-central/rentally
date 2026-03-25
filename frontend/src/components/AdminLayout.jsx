import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/admin', icon: '📊', label: 'Dashboard', end: true },
  { to: '/admin/users', icon: '👥', label: 'Clientes' },
  { to: '/admin/orders', icon: '📋', label: 'Pedidos' },
  { to: '/admin/catalog', icon: '📦', label: 'Catálogo' },
  { to: '/admin/staff', icon: '👥', label: 'Equipo' },
  { to: '/admin/addresses', icon: '📍', label: 'Direcciones M30' },
  { to: '/admin/contracts', icon: '📄', label: 'Contratos' },
  { to: '/admin/import', icon: '📥', label: 'Importar Clientes' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-60 bg-gray-900 flex flex-col
        transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:flex
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">R</span>
            </div>
            <div>
              <span className="text-xl font-bold text-white">Rentally</span>
              <span className="ml-2 text-xs bg-rentally-coral text-white px-1.5 py-0.5 rounded">Admin</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.nombre?.[0]?.toUpperCase() || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.nombre}</p>
              <p className="text-xs text-gray-400 truncate">Administrador</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-gray-400 hover:text-red-400 transition-colors flex items-center gap-2"
          >
            <span>🚪</span> Cerrar sesión
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100">
            ☰
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Panel de Administración</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
