import React, { useState, useEffect } from 'react'
import api from '../../utils/api'

const FILTERS = ['todos', 'pendiente', 'verificado', 'aprobado', 'bloqueado']

export default function AdminUsersView() {
  const [users, setUsers] = useState([])
  const [filter, setFilter] = useState('todos')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [message, setMessage] = useState('')

  const load = (f = filter) => {
    setLoading(true)
    const params = f !== 'todos' ? `?estado=${f}` : ''
    api.get(`/admin/users${params}`).then(res => setUsers(res.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  const handleAction = async (action, userId, extra = {}) => {
    setActionLoading(userId + action)
    setMessage('')
    try {
      if (action === 'approve') await api.put(`/admin/users/${userId}/approve`)
      if (action === 'block') await api.put(`/admin/users/${userId}/block`)
      if (action === 'fianza') await api.put(`/admin/users/${userId}/confirm-fianza`, extra)
      setMessage('Acción completada')
      load()
    } catch (e) {
      setMessage(e.response?.data?.detail || 'Error')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Clientes</h1>

      {message && <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4">{message}</div>}

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
              filter === f ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
      ) : users.length === 0 ? (
        <div className="card text-center py-12"><p className="text-gray-500">No hay clientes en este estado</p></div>
      ) : (
        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{u.nombre}</h3>
                    <span className={`badge ${
                      u.estado === 'aprobado' ? 'badge-green' :
                      u.estado === 'bloqueado' ? 'badge-red' :
                      'badge-yellow'
                    }`}>{u.estado}</span>
                  </div>
                  <p className="text-sm text-gray-600">{u.email}</p>
                  {u.empresa && <p className="text-sm text-gray-500">{u.empresa} {u.cif && `· CIF: ${u.cif}`}</p>}
                  {u.telefono && <p className="text-sm text-gray-500">📞 {u.telefono}</p>}

                  <div className="flex gap-3 mt-2 flex-wrap text-xs">
                    <span className={u.email_verified ? 'text-green-600' : 'text-gray-400'}>
                      {u.email_verified ? '✓ Email verificado' : '✗ Email no verificado'}
                    </span>
                    <span className={u.has_signed_contract ? 'text-green-600' : 'text-gray-400'}>
                      {u.has_signed_contract ? '✓ Contrato firmado' : '✗ Sin contrato'}
                    </span>
                    <span className={u.has_fianza ? 'text-green-600' : 'text-gray-400'}>
                      {u.has_fianza ? '✓ Fianza confirmada' : '✗ Sin fianza'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  {u.estado !== 'aprobado' && u.email_verified && (
                    <button
                      onClick={() => handleAction('approve', u.id)}
                      disabled={!!actionLoading}
                      className="btn-primary text-xs py-1.5 px-3"
                    >
                      ✓ Aprobar
                    </button>
                  )}
                  {!u.has_fianza && u.estado === 'aprobado' && (
                    <button
                      onClick={() => handleAction('fianza', u.id, { notas: 'Confirmado por teléfono' })}
                      disabled={!!actionLoading}
                      className="bg-green-600 text-white text-xs py-1.5 px-3 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      💰 Confirmar fianza
                    </button>
                  )}
                  {u.estado !== 'bloqueado' ? (
                    <button
                      onClick={() => { if(confirm(`¿Bloquear a ${u.nombre}?`)) handleAction('block', u.id) }}
                      disabled={!!actionLoading}
                      className="btn-danger text-xs py-1.5 px-3"
                    >
                      Bloquear
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction('approve', u.id)}
                      disabled={!!actionLoading}
                      className="btn-secondary text-xs py-1.5 px-3"
                    >
                      Desbloquear
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
