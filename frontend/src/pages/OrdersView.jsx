import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'

const statusColors = {
  borrador: 'badge-gray', pendiente: 'badge-yellow', confirmado: 'badge-blue',
  en_preparacion: 'badge-blue', enviado: 'badge-blue', entregado: 'badge-green', cancelado: 'badge-red',
}
const statusLabels = {
  borrador: 'Borrador', pendiente: 'Pendiente', confirmado: 'Confirmado',
  en_preparacion: 'En preparación', enviado: 'Enviado', entregado: 'Entregado', cancelado: 'Cancelado',
}

export default function OrdersView() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/orders').then(res => setOrders(res.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mis Pedidos</h1>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-500 mb-4">No tienes pedidos aún</p>
          <Link to="/app/catalog" className="btn-primary">Ir al catálogo</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <Link
              key={order.id}
              to={`/app/orders/${order.id}`}
              className="card hover:shadow-md transition-shadow block"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">Pedido #{order.id}</p>
                  <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString('es-ES')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={statusColors[order.estado] || 'badge-gray'}>
                    {statusLabels[order.estado] || order.estado}
                  </span>
                  <span className="text-lg font-bold text-primary">{order.total?.toFixed(2)}€</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>📦 {order.items?.length || 0} productos</span>
                {order.address && <span>· 📍 {order.address.nombre}</span>}
                {order.payment && <span>· 💳 {order.payment.metodo}</span>}
                {order.flags?.length > 0 && (
                  <span className="text-yellow-600">· ⚠️ Requiere validación</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
