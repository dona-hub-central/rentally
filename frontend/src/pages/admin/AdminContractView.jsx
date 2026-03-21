import React, { useState, useEffect } from 'react'
import api from '../../utils/api'

export default function AdminContractView() {
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nombre: '', version: '' })
  const [file, setFile] = useState(null)
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState(false)

  const load = () => {
    api.get('/admin/contracts').then(res => setContracts(res.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) { setMessage('Selecciona un archivo PDF'); return }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('nombre', form.nombre)
      if (form.version) formData.append('version', form.version)
      formData.append('archivo', file)
      await api.post('/admin/contracts', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setMessage('Contrato subido. Es ahora el contrato activo.')
      setForm({ nombre: '', version: '' })
      setFile(null)
      setShowForm(false)
      load()
    } catch (e) {
      setMessage(e.response?.data?.detail || 'Error al subir')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contratos</h1>
          <p className="text-gray-500 text-sm">Gestiona los contratos que los clientes deben firmar</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">+ Subir contrato</button>
      </div>

      {message && <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4">{message}</div>}

      {showForm && (
        <form onSubmit={handleUpload} className="card mb-6 space-y-4">
          <h2 className="font-semibold">Nuevo contrato</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Nombre del contrato *</label>
              <input value={form.nombre} onChange={e => setForm(p => ({...p, nombre: e.target.value}))} required className="input" placeholder="Contrato de servicios 2026" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Versión</label>
              <input value={form.version} onChange={e => setForm(p => ({...p, version: e.target.value}))} className="input" placeholder="v1.0" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Archivo PDF *</label>
            <input type="file" accept=".pdf" onChange={e => setFile(e.target.files[0])} required className="text-sm text-gray-600" />
          </div>
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-sm text-yellow-800">
            ⚠️ Al subir un nuevo contrato, se desactivará el anterior. Los clientes que ya lo firmaron mantienen su firma.
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={uploading} className="btn-primary">{uploading ? 'Subiendo...' : 'Subir contrato'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
      ) : contracts.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📄</div>
          <p className="text-gray-500">No hay contratos. Sube el primero para que los clientes puedan firmarlo.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map(c => (
            <div key={c.id} className={`card border-2 ${c.activo ? 'border-green-200' : 'border-transparent'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{c.nombre}</h3>
                    {c.activo && <span className="badge-green">Activo</span>}
                    {c.version && <span className="badge-gray">{c.version}</span>}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Subido: {new Date(c.created_at).toLocaleDateString('es-ES')} · {c.firmas} firma{c.firmas !== 1 ? 's' : ''}
                  </p>
                </div>
                <a href={c.archivo_url} target="_blank" rel="noreferrer" className="btn-secondary text-sm">
                  📄 Ver PDF
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
