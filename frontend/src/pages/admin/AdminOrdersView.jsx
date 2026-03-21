import React, { useState, useEffect } from 'react'
import api from '../../utils/api'

const ESTADOS = ['todos', 'pendiente', 'confirmado', 'en_preparacion', 'enviado', 'entregado', 'cancelado']
const statusColors = {
  borrador: 'badge-gray', pendiente: 'badge-yellow', confirmado: 'badge-blue',
  en_preparacion: 'badge-blue', enviado: 'badge-blue', entregado: 'badge-green', cancelado: 'badge-red',
}
const NEXT_STATES = ['confirmado', 'en_preparacion', 'enviado', 'entregado']

export default function AdminOrdersView() {
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('todos')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [expanded, setExpanded] = useState(null)

  const load = (f = filter) => {
    setLoading(true)
    const params = f !== 'todos' ? `?estado=${f}` : ''
    api.get(`/admin/orders${params}`).then(res => setOrders(res.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  const handleConfirm = async (orderId) => {
    try {
      await api.put(`/admin/orders/${orderId}/confirm`)
      setMessage(`Pedido #${orderId} confirmado`)
      load()
    } catch (e) {
      setMessage(e.response?.data?.detail || 'Error')
    }
  }

  const handleStatus = async (orderId, estado) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, { estado })
      setMessage(`Pedido #${orderId} → ${estado}`)
      load()
    } catch (e) {
      setMessage(e.response?.data?.detail || 'Error')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Pedidos</h1>

      {message && <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4">{message}</div>}

      <div className="flex gap-2 mb-4 flex-wrap">
        {ESTADOS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
              filter === f ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >{f}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
      ) : orders.length === 0 ? (
        <div className="card text-center py-12"><p className="text-gray-500">No hay pedidos</p></div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <div key={o.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold">#{o.id}</span>
                    <span className={statusColors[o.estado] || 'badge-gray'}>{o.estado}</span>
                    {o.flags?.length > 0 && <span className="badge-yellow">⚠️ Requiere validación</span>}
                    {o.payment?.metodo === 'transferencia' && o.payment?.estado === 'pendiente' && (
                      <span className="badge-yellow">💸 Transferencia pendiente</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 font-medium">{o.user_nombre} · {o.user_empresa}</p>
                  <p className="text-xs text-gray-500">{new Date(o.created_at).toLocaleString('es-ES')}</p>
                  <p className="text-sm font-bold text-primary mt-1">{o.total?.toFixed(2)}€</p>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  {o.payment?.estado === 'pendiente' && (
                    <button onClick={() => handleConfirm(o.id)} className="btn-primary text-xs py-1.5 px-3">
                      ✓ Confirmar pago
                    </button>
                  )}
                  <select
                    value={o.estado}
                    onChange={e => handleStatus(o.id, e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {ESTADOS.filter(s => s !== 'todos').map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                    className="btn-secondary text-xs py-1.5"
                  >
                    {expanded === o.id ? 'Ocultar' : 'Ver detalle'}
                  </button>
                </div>
              </div>

              {expanded === o.id && (
                <div className="mt-4 pt-4 border-t">
                  <div className="space-y-1">
                    {o.items?.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-700">{item.product_nombre} × {item.cantidad}</span>
                        <span className="text-gray-900">{item.subtotal?.toFixed(2)}€</span>
                      </div>
                    ))}
                  </div>
                  {o.notas && <p className="text-sm text-gray-500 mt-2">📝 {o.notas}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
