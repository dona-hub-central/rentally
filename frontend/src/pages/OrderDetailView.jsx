import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'

const statusColors = {
  borrador: 'badge-gray', pendiente: 'badge-yellow', confirmado: 'badge-blue',
  en_preparacion: 'badge-blue', enviado: 'badge-blue', entregado: 'badge-green', cancelado: 'badge-red',
}
const statusLabels = {
  borrador: 'Borrador', pendiente: 'Pendiente', confirmado: 'Confirmado',
  en_preparacion: 'En preparación', enviado: 'Enviado', entregado: 'Entregado', cancelado: 'Cancelado',
}

export default function OrderDetailView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    api.get(`/orders/${id}`).then(res => setOrder(res.data)).catch(() => navigate('/app/orders')).finally(() => setLoading(false))
  }, [id])

  const handleCancel = async () => {
    if (!confirm('¿Seguro que quieres cancelar este pedido?')) return
    setCancelling(true)
    try {
      await api.put(`/orders/${id}/cancel`)
      const res = await api.get(`/orders/${id}`)
      setOrder(res.data)
    } catch (e) {
      alert(e.response?.data?.detail || 'Error al cancelar')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
  if (!order) return null

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/app/orders')} className="text-gray-500 hover:text-gray-700">← Volver</button>
        <h1 className="text-xl font-bold text-gray-900">Pedido #{order.id}</h1>
        <span className={statusColors[order.estado] || 'badge-gray'}>{statusLabels[order.estado] || order.estado}</span>
      </div>

      {order.flags?.some(f => !f.resuelto) && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-sm text-yellow-800">
          ⚠️ Este pedido requiere validación del administrador (supera umbrales de cantidad)
        </div>
      )}

      <div className="card">
        <h3 className="font-semibold mb-3">Productos</h3>
        <div className="space-y-2">
          {order.items?.map(item => (
            <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="text-sm font-medium">{item.product_nombre}</p>
                <p className="text-xs text-gray-500">{item.precio_unitario.toFixed(2)}€ × {item.cantidad}</p>
              </div>
              <p className="font-medium">{item.subtotal.toFixed(2)}€</p>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-1 pt-3 border-t">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span><span>{order.subtotal?.toFixed(2)}€</span>
          </div>
          {order.precio_transporte > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>Transporte ({order.tipo_transporte})</span><span>+{order.precio_transporte?.toFixed(2)}€</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-gray-900 pt-1">
            <span>Total</span><span className="text-primary">{order.total?.toFixed(2)}€</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-sm mb-2">📍 Dirección</h3>
          {order.address ? (
            <div className="text-sm text-gray-600">
              <p className="font-medium">{order.address.nombre}</p>
              <p>{order.address.direccion_completa}</p>
              <p>{order.address.ciudad} {order.address.cp}</p>
            </div>
          ) : <p className="text-sm text-gray-500">No disponible</p>}
        </div>

        <div className="card">
          <h3 className="font-semibold text-sm mb-2">💳 Pago</h3>
          {order.payment ? (
            <div className="text-sm">
              <p className="capitalize">{order.payment.metodo}</p>
              <span className={order.payment.estado === 'confirmado' ? 'badge-green' : 'badge-yellow'}>
                {order.payment.estado}
              </span>
              <p className="font-bold mt-1">{order.payment.importe?.toFixed(2)}€</p>
            </div>
          ) : <p className="text-sm text-gray-500">Sin información de pago</p>}
        </div>
      </div>

      {order.notas && (
        <div className="card">
          <h3 className="font-semibold text-sm mb-1">📝 Notas</h3>
          <p className="text-sm text-gray-600">{order.notas}</p>
        </div>
      )}

      {['borrador', 'pendiente'].includes(order.estado) && (
        <button onClick={handleCancel} disabled={cancelling} className="btn-danger w-full">
          {cancelling ? 'Cancelando...' : 'Cancelar pedido'}
        </button>
      )}
    </div>
  )
}
