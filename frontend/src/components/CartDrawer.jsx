import React, { useState, useEffect } from 'react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

const TRANSPORT_OPTIONS = [
  { value: 'ninguno', label: 'Sin transporte', price: 0 },
  { value: 'ida', label: 'Solo ida', price: 15 },
  { value: 'ida_vuelta', label: 'Ida y vuelta', price: 25 },
]

export default function CartDrawer() {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, clearCart, subtotal } = useCart()
  const { user } = useAuth()
  
  const [addresses, setAddresses] = useState([])
  const [selectedAddress, setSelectedAddress] = useState('')
  const [transport, setTransport] = useState('ninguno')
  const [paymentMethod, setPaymentMethod] = useState('transferencia')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isOpen && user) {
      api.get('/addresses').then(res => {
        const validated = res.data.filter(a => a.validada)
        setAddresses(validated)
        if (validated.length > 0 && !selectedAddress) {
          setSelectedAddress(String(validated[0].id))
        }
      }).catch(() => {})
    }
  }, [isOpen])

  const transportPrice = TRANSPORT_OPTIONS.find(t => t.value === transport)?.price || 0
  const total = subtotal + transportPrice

  const handleOrder = async () => {
    if (!selectedAddress) {
      setError('Selecciona una dirección de entrega')
      return
    }
    if (items.length === 0) {
      setError('El carrito está vacío')
      return
    }

    setLoading(true)
    setError('')

    try {
      await api.post('/orders', {
        address_id: parseInt(selectedAddress),
        items: items.map(i => ({ product_id: i.product.id, cantidad: i.cantidad })),
        tipo_transporte: transport,
        metodo_pago: paymentMethod,
        notas: notas || null
      })
      
      setSuccess(true)
      clearCart()
      setTimeout(() => {
        setSuccess(false)
        setIsOpen(false)
      }, 2000)
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al crear el pedido')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsOpen(false)} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">🛒 Carrito</h2>
          <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
        </div>

        {success ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-lg font-semibold text-green-600">¡Pedido creado!</h3>
              <p className="text-gray-500 mt-1">Tu pedido ha sido registrado correctamente</p>
            </div>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-2">🛒</div>
                  <p>El carrito está vacío</p>
                </div>
              ) : (
                items.map(item => (
                  <div key={item.product.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.product.nombre}</p>
                      <p className="text-sm text-primary">{item.product.precio.toFixed(2)}€/ud</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.cantidad - 1)}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                      >-</button>
                      <span className="w-8 text-center text-sm font-medium">{item.cantidad}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.cantidad + 1)}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                      >+</button>
                    </div>
                    <p className="text-sm font-medium w-16 text-right">{(item.product.precio * item.cantidad).toFixed(2)}€</p>
                    <button onClick={() => removeItem(item.product.id)} className="text-gray-400 hover:text-red-500">✕</button>
                  </div>
                ))
              )}

              {items.length > 0 && (
                <div className="space-y-4 mt-4 border-t pt-4">
                  {/* Address selector */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">📍 Dirección de entrega</label>
                    {addresses.length === 0 ? (
                      <p className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                        No tienes direcciones validadas. Ve a "Direcciones" para añadir una.
                      </p>
                    ) : (
                      <select
                        value={selectedAddress}
                        onChange={e => setSelectedAddress(e.target.value)}
                        className="input"
                      >
                        {addresses.map(a => (
                          <option key={a.id} value={a.id}>{a.nombre} - {a.direccion_completa}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Transport */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">🚚 Transporte</label>
                    <div className="space-y-2">
                      {TRANSPORT_OPTIONS.map(opt => (
                        <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="transport"
                            value={opt.value}
                            checked={transport === opt.value}
                            onChange={e => setTransport(e.target.value)}
                            className="text-primary"
                          />
                          <span className="text-sm text-gray-700">{opt.label}</span>
                          <span className="text-sm font-medium text-gray-900 ml-auto">
                            {opt.price === 0 ? 'Gratis' : `+${opt.price}€`}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Payment method */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">💳 Método de pago</label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="payment"
                          value="transferencia"
                          checked={paymentMethod === 'transferencia'}
                          onChange={e => setPaymentMethod(e.target.value)}
                        />
                        <span className="text-sm">Transferencia</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="payment"
                          value="stripe"
                          checked={paymentMethod === 'stripe'}
                          onChange={e => setPaymentMethod(e.target.value)}
                        />
                        <span className="text-sm">Tarjeta</span>
                      </label>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">📝 Notas (opcional)</label>
                    <textarea
                      value={notas}
                      onChange={e => setNotas(e.target.value)}
                      rows={2}
                      className="input resize-none"
                      placeholder="Instrucciones especiales..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-4 border-t bg-gray-50">
                <div className="space-y-1 mb-4">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span>{subtotal.toFixed(2)}€</span>
                  </div>
                  {transportPrice > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Transporte</span>
                      <span>+{transportPrice.toFixed(2)}€</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t">
                    <span>Total</span>
                    <span className="text-primary">{total.toFixed(2)}€</span>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-3">{error}</div>
                )}

                <button
                  onClick={handleOrder}
                  disabled={loading || addresses.length === 0}
                  className="btn-primary w-full"
                >
                  {loading ? 'Procesando...' : 'Confirmar Pedido'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
