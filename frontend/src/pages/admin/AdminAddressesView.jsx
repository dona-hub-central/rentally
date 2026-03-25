import React, { useState, useEffect } from 'react'
import api from '../../utils/api'

export default function AdminAddressesView() {
  const [addresses, setAddresses] = useState([])
  const [filter, setFilter] = useState('false')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [users, setUsers] = useState([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    user_id: '',
    nombre: '',
    direccion_completa: '',
    portal: '',
    planta: '',
    puerta: '',
    ciudad: 'Madrid',
    cp: ''
  })

  const load = () => {
    setLoading(true)
    const params = filter !== 'all' ? `?validada=${filter}` : ''
    api.get(`/admin/addresses${params}`).then(res => setAddresses(res.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  useEffect(() => {
    api.get('/admin/users?limit=500').then(res => setUsers(res.data || [])).catch(() => {})
  }, [])

  const handleValidate = async (id) => {
    try {
      await api.put(`/admin/addresses/${id}/validate`)
      setMessage('Dirección validada')
      load()
    } catch (e) { setMessage(e.response?.data?.detail || 'Error') }
  }

  const handleReject = async (id) => {
    if (!confirm('¿Rechazar y eliminar esta dirección?')) return
    try {
      await api.put(`/admin/addresses/${id}/reject`)
      setMessage('Dirección rechazada')
      load()
    } catch (e) { setMessage(e.response?.data?.detail || 'Error') }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.user_id || !form.direccion_completa) return
    setSaving(true)
    try {
      await api.post('/admin/addresses', { ...form, user_id: parseInt(form.user_id) })
      setMessage('Dirección creada correctamente')
      setShowForm(false)
      setForm({ user_id: '', nombre: '', direccion_completa: '', portal: '', planta: '', puerta: '', ciudad: 'Madrid', cp: '' })
      load()
    } catch (e) {
      setMessage(e.response?.data?.detail || 'Error al crear dirección')
    } finally { setSaving(false) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Direcciones</h1>
          <p className="text-gray-500 text-sm mt-1">Gestiona las direcciones de los clientes</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          + Nueva dirección
        </button>
      </div>

      {message && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4 flex justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-green-500 hover:text-green-700">✕</button>
        </div>
      )}

      {showForm && (
        <div className="card mb-6 border-2 border-primary/20">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Nueva dirección</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
              <select
                required
                value={form.user_id}
                onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
                className="input-field"
              >
                <option value="">— Seleccionar cliente —</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} {u.empresa ? `(${u.empresa})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre / referencia</label>
              <input
                type="text"
                placeholder="Ej: Oficina central, Almacén..."
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección (calle y número) *</label>
              <input
                type="text"
                required
                placeholder="Calle Gran Vía, 1"
                value={form.direccion_completa}
                onChange={e => setForm(f => ({ ...f, direccion_completa: e.target.value }))}
                className="input-field"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Portal</label>
                <input
                  type="text"
                  placeholder="A, B, 1..."
                  value={form.portal}
                  onChange={e => setForm(f => ({ ...f, portal: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Planta</label>
                <input
                  type="text"
                  placeholder="1, 2, bajo..."
                  value={form.planta}
                  onChange={e => setForm(f => ({ ...f, planta: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Puerta</label>
                <input
                  type="text"
                  placeholder="A, izq, 1..."
                  value={form.puerta}
                  onChange={e => setForm(f => ({ ...f, puerta: e.target.value }))}
                  className="input-field"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                <input
                  type="text"
                  value={form.ciudad}
                  onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código postal</label>
                <input
                  type="text"
                  placeholder="28001"
                  value={form.cp}
                  onChange={e => setForm(f => ({ ...f, cp: e.target.value }))}
                  className="input-field"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Guardando...' : 'Crear dirección'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

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
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : addresses.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No hay direcciones en este estado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map(a => (
            <div key={a.id} className="card flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold">{a.nombre || a.direccion_completa}</p>
                  {a.validada
                    ? <span className="badge-green">✓ Validada</span>
                    : <span className="badge-yellow">⏳ Pendiente</span>}
                </div>
                <p className="text-sm text-gray-700">{a.direccion_completa}</p>
                {(a.portal || a.planta || a.puerta) && (
                  <p className="text-sm text-gray-600">
                    {a.portal && <span>Portal {a.portal} </span>}
                    {a.planta && <span>· Planta {a.planta} </span>}
                    {a.puerta && <span>· Puerta {a.puerta}</span>}
                  </p>
                )}
                <p className="text-sm text-gray-500">{a.ciudad} {a.cp}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Cliente: {a.user_nombre} {a.user_empresa ? `· ${a.user_empresa}` : ''}
                </p>
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
