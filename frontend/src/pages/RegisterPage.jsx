import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../utils/api'

export default function RegisterPage() {
  const [form, setForm] = useState({
    email: '', password: '', nombre: '', empresa: '', cif: '', telefono: '', direccion: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/register', form)
      navigate('/login?registered=1')
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">R</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Crear cuenta</h1>
          <p className="text-gray-500 text-sm mt-1">Únete a Rentally</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Nombre *</label>
                <input name="nombre" value={form.nombre} onChange={handleChange} required className="input" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Empresa</label>
                <input name="empresa" value={form.empresa} onChange={handleChange} className="input" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Email *</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required className="input" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Contraseña *</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} required className="input" minLength={6} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">CIF</label>
                <input name="cif" value={form.cif} onChange={handleChange} className="input" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Teléfono</label>
                <input name="telefono" value={form.telefono} onChange={handleChange} className="input" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Dirección fiscal</label>
              <input name="direccion" value={form.direccion} onChange={handleChange} className="input" />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Registrando...' : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">Iniciar sesión</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
