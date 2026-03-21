import React, { useState, useEffect } from 'react'
import api from '../utils/api'

export default function AddressesView() {
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nombre: '', direccion_completa: '', ciudad: 'Madrid', cp: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    api.get('/addresses').then(res => setAddresses(res.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.post('/addresses', form)
      setForm({ nombre: '', direccion_completa: '', ciudad: 'Madrid', cp: '' })
      setShowForm(false)
      load()
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al añadir dirección')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta dirección?')) return
    try {
      await api.delete(`/addresses/${id}`)
      setAddresses(prev => prev.filter(a => a.id !== id))
    } catch (e) {
      alert(e.response?.data?.detail || 'Error al eliminar')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mis Direcciones</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          + Añadir dirección
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-4">Nueva dirección</h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Nombre del apartamento *</label>
              <input value={form.nombre} onChange={e => setForm(p => ({...p, nombre: e.target.value}))} required className="input" placeholder="Ej: Apartamento Gran Vía 1A" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Dirección completa *</label>
              <input value={form.direccion_completa} onChange={e => setForm(p => ({...p, direccion_completa: e.target.value}))} required className="input" placeholder="Calle, número, piso..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Ciudad</label>
                <input value={form.ciudad} onChange={e => setForm(p => ({...p, ciudad: e.target.value}))} className="input" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Código postal</label>
                <input value={form.cp} onChange={e => setForm(p => ({...p, cp: e.target.value}))} className="input" placeholder="28001" />
              </div>
            </div>
            {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded">{error}</div>}
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : 'Añadir'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
      ) : addresses.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📍</div>
          <p className="text-gray-500">No tienes direcciones. Añade una para poder hacer pedidos.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {addresses.map(a => (
            <div key={a.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{a.nombre}</h3>
                  <p className="text-sm text-gray-600 mt-1">{a.direccion_completa}</p>
                  <p className="text-sm text-gray-500">{a.ciudad} {a.cp}</p>
                  <div className="mt-2">
                    {a.validada ? (
                      <span className="badge-green">✓ Validada</span>
                    ) : (
                      <span className="badge-yellow">⏳ Pendiente validación</span>
                    )}
                  </div>
                </div>
                <button onClick={() => handleDelete(a.id)} className="text-gray-400 hover:text-red-500 text-xl ml-2">×</button>
              </div>
              {!a.validada && (
                <p className="text-xs text-gray-400 mt-2">El equipo de Rentally validará si la dirección está dentro de M30</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
