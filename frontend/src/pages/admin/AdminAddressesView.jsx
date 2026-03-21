import React, { useState, useEffect } from 'react'
import api from '../../utils/api'

export default function AdminAddressesView() {
  const [addresses, setAddresses] = useState([])
  const [filter, setFilter] = useState('false')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const load = () => {
    setLoading(true)
    const params = filter !== 'all' ? `?validada=${filter}` : ''
    api.get(`/admin/addresses${params}`).then(res => setAddresses(res.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  const handleValidate = async (id) => {
    try {
      await api.put(`/admin/addresses/${id}/validate`)
      setMessage('Dirección validada')
      load()
    } catch (e) {
      setMessage(e.response?.data?.detail || 'Error')
    }
  }

  const handleReject = async (id) => {
    if (!confirm('¿Rechazar y eliminar esta dirección?')) return
    try {
      await api.put(`/admin/addresses/${id}/reject`)
      setMessage('Dirección rechazada')
      load()
    } catch (e) {
      setMessage(e.response?.data?.detail || 'Error')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Validación de Direcciones M30</h1>
      <p className="text-gray-500 text-sm mb-4">Verifica que las direcciones estén dentro del área de servicio (Madrid M30)</p>

      {message && <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4">{message}</div>}

      <div className="flex gap-2 mb-4">
        {[['false', 'Pendientes'], ['true', 'Validadas'], ['all', 'Todas']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === val ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >{label}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
      ) : addresses.length === 0 ? (
        <div className="card text-center py-12"><p className="text-gray-500">No hay direcciones en este estado</p></div>
      ) : (
        <div className="space-y-3">
          {addresses.map(a => (
            <div key={a.id} className="card flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold">{a.nombre}</p>
                  {a.validada ? <span className="badge-green">✓ Validada</span> : <span className="badge-yellow">⏳ Pendiente</span>}
                </div>
                <p className="text-sm text-gray-700">{a.direccion_completa}</p>
                <p className="text-sm text-gray-500">{a.ciudad} {a.cp}</p>
                <p className="text-xs text-gray-400 mt-1">Cliente: {a.user_nombre} · {a.user_empresa}</p>
              </div>

              {!a.validada && (
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handleValidate(a.id)} className="btn-primary text-xs py-1.5 px-3">✓ Validar</button>
                  <button onClick={() => handleReject(a.id)} className="btn-danger text-xs py-1.5 px-3">✗ Rechazar</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
