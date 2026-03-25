import React, { useState, useEffect } from 'react'
import api from '../../utils/api'

const FILTERS = ['todos', 'pendiente', 'verificado', 'aprobado', 'bloqueado']

function ClientDetailDrawer({ userId, onClose, onUpdate }) {
  const [client, setClient] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [sending, setSending] = useState(false)
  const [contractResult, setContractResult] = useState(null)
  const [saving, setSaving] = useState(false)

  const loadClient = () => {
    if (userId) {
      api.get(`/admin/users/${userId}`).then(r => {
        setClient(r.data)
        setForm(r.data)
      })
    }
  }

  useEffect(() => {
    setClient(null)
    setEditing(false)
    setContractResult(null)
    loadClient()
  }, [userId])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put(`/admin/users/${userId}/edit`, {
        nombre: form.nombre,
        empresa: form.empresa,
        cif: form.cif,
        telefono: form.telefono,
        direccion: form.direccion,
      })
      setEditing(false)
      setClient({ ...client, ...form })
      onUpdate()
    } catch (e) {
      alert(e.response?.data?.detail || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleSendContract = async () => {
    setSending(true)
    try {
      const res = await api.post(`/admin/users/${userId}/send-contract`)
      setContractResult(res.data)
    } catch (e) {
      alert(e.response?.data?.detail || 'Error al enviar contrato')
    } finally {
      setSending(false)
    }
  }

  const StatusBadge = ({ ok, label }) => (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${ok ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
      {ok ? '✓' : '✗'} {label}
    </span>
  )

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Detalle del cliente</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>

        {!client ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* Status badges */}
            <div className="flex flex-wrap gap-2">
              <StatusBadge ok={client.email_verified} label="Email verificado" />
              <StatusBadge ok={client.estado === 'aprobado'} label="Aprobado" />
              <StatusBadge ok={client.has_signed_contract} label="Contrato firmado" />
              <StatusBadge ok={client.has_fianza} label={client.fianza_exenta ? 'Exento de fianza' : 'Fianza confirmada'} />
            </div>

            {/* Client data */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Datos del cliente</h3>
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    ✏️ Editar
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="text-xs bg-primary text-white px-3 py-1 rounded-lg hover:bg-primary/90 disabled:opacity-60"
                    >
                      {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button
                      onClick={() => { setEditing(false); setForm(client) }}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>

              {editing ? (
                <div className="space-y-2">
                  {[
                    { key: 'nombre', label: 'Nombre' },
                    { key: 'empresa', label: 'Empresa' },
                    { key: 'cif', label: 'CIF' },
                    { key: 'telefono', label: 'Teléfono' },
                    { key: 'direccion', label: 'Dirección' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="text-xs text-gray-500 mb-0.5 block">{label}</label>
                      <input
                        type="text"
                        value={form[key] || ''}
                        onChange={e => setForm({ ...form, [key]: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5 text-sm text-gray-700">
                  <div><span className="text-gray-400">Nombre:</span> {client.nombre}</div>
                  <div><span className="text-gray-400">Email:</span> {client.email}</div>
                  {client.empresa && <div><span className="text-gray-400">Empresa:</span> {client.empresa}</div>}
                  {client.cif && <div><span className="text-gray-400">CIF:</span> {client.cif}</div>}
                  {client.telefono && <div><span className="text-gray-400">Teléfono:</span> {client.telefono}</div>}
                  {client.direccion && <div><span className="text-gray-400">Dirección:</span> {client.direccion}</div>}
                  <div><span className="text-gray-400">Registro:</span> {client.created_at ? new Date(client.created_at).toLocaleDateString('es-ES') : '—'}</div>
                </div>
              )}
            </div>

            {/* Contract section */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-gray-800">Contrato</h3>
              {client.contract_sent && !contractResult && (
                <p className="text-xs text-gray-500">
                  Contrato ya enviado.
                  {client.contract_otp_expires && ` Expira: ${new Date(client.contract_otp_expires).toLocaleString('es-ES')}`}
                </p>
              )}
              {contractResult ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
                  <p className="text-sm font-medium text-blue-800">✅ {contractResult.mensaje}</p>
                  <p className="text-xs text-blue-700">OTP: <span className="font-mono font-bold">{contractResult.otp_preview}</span></p>
                  <p className="text-xs text-blue-600">El cliente puede firmarlo desde su panel.</p>
                  {contractResult.contract_url && (
                    <a href={contractResult.contract_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 underline">Ver PDF del contrato</a>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleSendContract}
                  disabled={sending}
                  className="w-full bg-blue-600 text-white text-sm py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {sending ? 'Enviando...' : '📄 Enviar contrato al cliente'}
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{client.total_orders}</div>
                <div className="text-xs text-gray-500 mt-1">Pedidos totales</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{client.addresses?.length || 0}</div>
                <div className="text-xs text-gray-500 mt-1">Direcciones</div>
              </div>
            </div>

            {/* Addresses */}
            {client.addresses && client.addresses.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <h3 className="font-semibold text-gray-800">Direcciones de entrega</h3>
                {client.addresses.map(a => (
                  <div key={a.id} className="flex items-start justify-between gap-2 text-sm">
                    <div>
                      <div className="font-medium text-gray-700">{a.nombre}</div>
                      <div className="text-gray-500 text-xs">{a.direccion}</div>
                    </div>
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${a.validada ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {a.validada ? '✓ Validada' : 'Pendiente'}
                    </span>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}
      </div>
    </>
  )
}

export default function AdminUsersView() {
  const [users, setUsers] = useState([])
  const [filter, setFilter] = useState('todos')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [message, setMessage] = useState('')
  const [selectedUserId, setSelectedUserId] = useState(null)

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
      if (action === 'exent-fianza') await api.put(`/admin/users/${userId}/exent-fianza`)
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
                  <button
                    onClick={() => setSelectedUserId(u.id)}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    👤 Ver
                  </button>
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
                    <div className="flex gap-1 flex-wrap">
                      <button
                        onClick={() => handleAction('fianza', u.id, { notas: 'Confirmado por teléfono' })}
                        disabled={!!actionLoading}
                        className="bg-green-600 text-white text-xs py-1.5 px-3 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        💰 Confirmar fianza
                      </button>
                      <button
                        onClick={() => handleAction('exent-fianza', u.id)}
                        disabled={!!actionLoading}
                        className="bg-gray-200 text-gray-700 text-xs py-1.5 px-3 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        🚫 Sin fianza
                      </button>
                    </div>
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

      {selectedUserId && (
        <ClientDetailDrawer
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onUpdate={() => load()}
        />
      )}
    </div>
  )
}
