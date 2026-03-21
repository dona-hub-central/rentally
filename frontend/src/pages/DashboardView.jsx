import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

const statusColors = {
  borrador: 'badge-gray',
  pendiente: 'badge-yellow',
  confirmado: 'badge-blue',
  en_preparacion: 'badge-blue',
  enviado: 'badge-blue',
  entregado: 'badge-green',
  cancelado: 'badge-red',
}

const statusLabels = {
  borrador: 'Borrador',
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_preparacion: 'En preparación',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

export default function DashboardView() {
  const { user } = useAuth()
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/orders').then(res => {
      setRecentOrders(res.data.slice(0, 5))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hola, {user?.nombre?.split(' ')[0]} 👋</h1>
        <p className="text-gray-500 mt-1">Bienvenido a tu panel de gestión de pedidos</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-3xl mb-1">📦</div>
          <p className="text-sm text-gray-500">Total pedidos</p>
          <p className="text-2xl font-bold text-primary">{recentOrders.length}</p>
        </div>
        <div className="card text-center">
          <div className="text-3xl mb-1">✅</div>
          <p className="text-sm text-gray-500">Estado cuenta</p>
          <p className="text-sm font-semibold text-green-600 mt-1">Activa</p>
        </div>
        <div className="card text-center">
          <div className="text-3xl mb-1">🏢</div>
          <p className="text-sm text-gray-500">Empresa</p>
          <p className="text-sm font-semibold text-gray-900 mt-1">{user?.empresa || '-'}</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/app/catalog', icon: '🛍️', label: 'Hacer pedido', color: 'bg-primary-light text-primary' },
          { to: '/app/orders', icon: '📋', label: 'Mis pedidos', color: 'bg-yellow-50 text-yellow-700' },
          { to: '/app/addresses', icon: '📍', label: 'Direcciones', color: 'bg-green-50 text-green-700' },
          { to: '/app/profile', icon: '👤', label: 'Mi perfil', color: 'bg-purple-50 text-purple-700' },
        ].map(item => (
          <Link
            key={item.to}
            to={item.to}
            className={`card flex flex-col items-center gap-2 py-5 hover:shadow-md transition-shadow ${item.color}`}
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Últimos pedidos</h2>
          <Link to="/app/orders" className="text-sm text-primary hover:underline">Ver todos</Link>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Cargando...</div>
        ) : recentOrders.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📦</div>
            <p className="text-gray-500 text-sm">No tienes pedidos aún</p>
            <Link to="/app/catalog" className="btn-primary mt-3 inline-block text-sm">
              Hacer primer pedido
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map(order => (
              <Link
                key={order.id}
                to={`/app/orders/${order.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">Pedido #{order.id}</p>
                  <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString('es-ES')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={statusColors[order.estado] || 'badge-gray'}>
                    {statusLabels[order.estado] || order.estado}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{order.total?.toFixed(2)}€</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
