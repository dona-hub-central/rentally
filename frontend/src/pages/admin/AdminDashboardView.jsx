import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../utils/api'

export default function AdminDashboardView() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/stats').then(res => setStats(res.data)).finally(() => setLoading(false))
  }, [])

  const cards = stats ? [
    { icon: '👥', label: 'Clientes pendientes', value: stats.usuarios_pendientes, color: 'text-yellow-600', bg: 'bg-yellow-50', link: '/admin/users?estado=pendiente' },
    { icon: '📦', label: 'Pedidos hoy', value: stats.pedidos_hoy, color: 'text-blue-600', bg: 'bg-blue-50', link: '/admin/orders' },
    { icon: '💶', label: 'Ingresos este mes', value: `${stats.ingresos_mes.toFixed(2)}€`, color: 'text-green-600', bg: 'bg-green-50', link: '/admin/orders' },
    { icon: '📋', label: 'Pedidos pendientes', value: stats.pedidos_pendientes, color: 'text-orange-600', bg: 'bg-orange-50', link: '/admin/orders?estado=pendiente' },
    { icon: '👤', label: 'Total clientes', value: stats.total_clientes, color: 'text-purple-600', bg: 'bg-purple-50', link: '/admin/users' },
    { icon: '📍', label: 'Direcciones por validar', value: stats.direcciones_pendientes, color: 'text-red-600', bg: 'bg-red-50', link: '/admin/addresses' },
  ] : []

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {cards.map(card => (
            <Link key={card.label} to={card.link} className={`card hover:shadow-md transition-shadow ${card.bg}`}>
              <div className={`text-3xl mb-2 ${card.color}`}>{card.icon}</div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{card.label}</p>
              <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Quick links */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: '/admin/users', icon: '👥', label: 'Gestionar clientes' },
          { to: '/admin/orders', icon: '📋', label: 'Ver pedidos' },
          { to: '/admin/catalog', icon: '📦', label: 'Editar catálogo' },
          { to: '/admin/contracts', icon: '📄', label: 'Contratos' },
        ].map(item => (
          <Link key={item.to} to={item.to} className="card flex items-center gap-3 hover:shadow-md transition-shadow">
            <span className="text-2xl">{item.icon}</span>
            <span className="text-sm font-medium text-gray-700">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
