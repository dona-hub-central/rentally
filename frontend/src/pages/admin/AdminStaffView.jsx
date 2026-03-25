import React, { useState, useEffect } from 'react'
import api from '../../utils/api'

export default function AdminStaffView() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nombre: '', email: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const load = () => {
    setLoading(true)
    api.get('/admin/staff').then(res => setStaff(res.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/admin/staff', form)
      setMessage('Usuario creado correctamente')
      setForm({ nombre: '', email: '', password: '' })
      setShowForm(false)
      load()
    } catch (e) {
      setMessage(e.response?.data?.detail || 'Error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Eliminar acceso de ${nombre}?`)) return
    try {
      await api.delete(`/admin/staff/${id}`)
      setMessage('Usuario eliminado')
      load()
    } catch (e) { setMessage(e.response?.data?.detail || 'Error') }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipo / Staff</h1>
          <p className="text-gray-500 text-sm mt-1">Usuarios con acceso completo al panel admin</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">+ Añadir</button>
      </div>

      {message && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4 flex justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')}>✕</button>
        </div>
      )}

      {showForm && (
        <div className="card mb-6 border-2 border-primary/20">
          <h2 className="font-semibold mb-4">Nuevo usuario staff</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input required type="text" value={form.nombre} onChange={e => setForm(f => ({...f, nombre: e.target.value}))} className="input-field" placeholder="Nombre completo" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input required type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="input-field" placeholder="correo@ejemplo.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
              <input required type="text" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} className="input-field" placeholder="Contraseña inicial" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creando...' : 'Crear usuario'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
      ) : staff.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-gray-500">No hay usuarios staff todavía</p>
        </div>
      ) : (
        <div className="space-y-3">
          {staff.map(u => (
            <div key={u.id} className="card flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-indigo-700 font-bold text-sm">{u.nombre.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{u.nombre}</p>
                  <p className="text-sm text-gray-500">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">Staff</span>
                <button onClick={() => handleDelete(u.id, u.nombre)} className="btn-danger text-xs py-1.5 px-3">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
