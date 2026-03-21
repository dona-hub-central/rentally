import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

export default function ProfileView() {
  const { user, refreshUser } = useAuth()
  const [showAddSub, setShowAddSub] = useState(false)
  const [subForm, setSubForm] = useState({ email: '', nombre: '' })
  const [subUsers, setSubUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleAddSubUser = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/sub-users', subForm)
      setMessage('Sub-usuario añadido')
      setSubForm({ email: '', nombre: '' })
      setShowAddSub(false)
    } catch (e) {
      setMessage(e.response?.data?.detail || 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>

      {message && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm">{message}</div>
      )}

      {/* Account info */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Información de cuenta</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { label: 'Nombre', value: user?.nombre },
            { label: 'Email', value: user?.email },
            { label: 'Empresa', value: user?.empresa || '-' },
            { label: 'CIF', value: user?.cif || '-' },
            { label: 'Teléfono', value: user?.telefono || '-' },
            { label: 'Dirección fiscal', value: user?.direccion || '-' },
          ].map(item => (
            <div key={item.label}>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{item.label}</p>
              <p className="text-sm text-gray-900 mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Account status */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Estado de la cuenta</h2>
        <div className="space-y-3">
          {[
            { label: 'Email verificado', ok: user?.email_verified, desc: '' },
            { label: 'Cuenta aprobada', ok: user?.estado === 'aprobado', desc: '' },
            { label: 'Contrato firmado', ok: user?.has_signed_contract, desc: '' },
            { label: 'Fianza confirmada', ok: user?.has_fianza, desc: '' },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{item.label}</span>
              <span className={item.ok ? 'badge-green' : 'badge-yellow'}>
                {item.ok ? '✓ Completado' : '⏳ Pendiente'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Sub-users */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Sub-usuarios</h2>
          <button onClick={() => setShowAddSub(!showAddSub)} className="btn-primary text-sm py-1.5">
            + Añadir
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-3">
          Los sub-usuarios son empleados que pueden hacer pedidos en tu nombre.
        </p>

        {showAddSub && (
          <form onSubmit={handleAddSubUser} className="space-y-3 mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Nombre</label>
                <input value={subForm.nombre} onChange={e => setSubForm(p => ({...p, nombre: e.target.value}))} required className="input" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
                <input type="email" value={subForm.email} onChange={e => setSubForm(p => ({...p, email: e.target.value}))} required className="input" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="btn-primary text-sm">Añadir</button>
              <button type="button" onClick={() => setShowAddSub(false)} className="btn-secondary text-sm">Cancelar</button>
            </div>
          </form>
        )}

        {subUsers.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No tienes sub-usuarios añadidos</p>
        )}
      </div>
    </div>
  )
}
