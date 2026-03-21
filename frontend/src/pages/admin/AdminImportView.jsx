import React, { useState } from 'react'
import api from '../../utils/api'

export default function AdminImportView() {
  const [mode, setMode] = useState('manual') // manual | csv
  const [clients, setClients] = useState([{ email: '', nombre: '', empresa: '' }])
  const [csvText, setCsvText] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const addRow = () => setClients(prev => [...prev, { email: '', nombre: '', empresa: '' }])
  const removeRow = (idx) => setClients(prev => prev.filter((_, i) => i !== idx))
  const updateRow = (idx, field, value) => setClients(prev => prev.map((r, i) => i === idx ? {...r, [field]: value} : r))

  const parseCsv = () => {
    const lines = csvText.trim().split('\n')
    const parsed = lines.slice(1).map(line => {
      const parts = line.split(',').map(p => p.trim())
      return { email: parts[0] || '', nombre: parts[1] || '', empresa: parts[2] || '' }
    }).filter(c => c.email)
    setClients(parsed)
    setMode('manual')
    setMessage(`${parsed.length} clientes cargados del CSV. Revisa y confirma.`)
  }

  const handleImport = async () => {
    const valid = clients.filter(c => c.email)
    if (valid.length === 0) {
      setMessage('Añade al menos un cliente con email')
      return
    }
    setLoading(true)
    try {
      const res = await api.post('/admin/import-clients', { clients: valid })
      setMessage(`✅ ${res.data.message}`)
      setClients([{ email: '', nombre: '', empresa: '' }])
    } catch (e) {
      setMessage(e.response?.data?.detail || 'Error al importar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Importar Clientes</h1>
      <p className="text-gray-500 text-sm mb-6">Importa clientes existentes que ya son tus clientes antes de registrarse en la plataforma</p>

      {message && <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4">{message}</div>}

      {/* Mode tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setMode('manual')} className={`px-4 py-2 rounded-lg font-medium text-sm ${mode === 'manual' ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
          Formulario manual
        </button>
        <button onClick={() => setMode('csv')} className={`px-4 py-2 rounded-lg font-medium text-sm ${mode === 'csv' ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
          Importar CSV
        </button>
      </div>

      {mode === 'csv' && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-3">Importar desde CSV</h2>
          <p className="text-sm text-gray-500 mb-3">Formato: email, nombre, empresa (primera fila = cabecera)</p>
          <p className="text-xs text-gray-400 mb-3 font-mono bg-gray-50 p-2 rounded">
            email,nombre,empresa<br />
            juan@empresa.com,Juan García,Hotel ABC<br />
            maria@hostal.es,María López,Hostal Central
          </p>
          <textarea
            value={csvText}
            onChange={e => setCsvText(e.target.value)}
            rows={6}
            className="input resize-none font-mono text-xs mb-3"
            placeholder="Pega el contenido del CSV aquí..."
          />
          <button onClick={parseCsv} disabled={!csvText.trim()} className="btn-primary text-sm">
            Cargar CSV
          </button>
        </div>
      )}

      {mode === 'manual' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Clientes a importar</h2>
            <button onClick={addRow} className="btn-secondary text-sm">+ Añadir fila</button>
          </div>

          <div className="space-y-3">
            {clients.map((client, idx) => (
              <div key={idx} className="flex gap-3 items-center">
                <input
                  value={client.email}
                  onChange={e => updateRow(idx, 'email', e.target.value)}
                  className="input flex-1"
                  placeholder="email@empresa.com *"
                  type="email"
                />
                <input
                  value={client.nombre}
                  onChange={e => updateRow(idx, 'nombre', e.target.value)}
                  className="input flex-1"
                  placeholder="Nombre"
                />
                <input
                  value={client.empresa}
                  onChange={e => updateRow(idx, 'empresa', e.target.value)}
                  className="input flex-1"
                  placeholder="Empresa"
                />
                {clients.length > 1 && (
                  <button onClick={() => removeRow(idx)} className="text-gray-400 hover:text-red-500 text-xl shrink-0">×</button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t flex items-center justify-between">
            <p className="text-sm text-gray-500">{clients.filter(c => c.email).length} cliente(s) listos para importar</p>
            <button onClick={handleImport} disabled={loading} className="btn-primary">
              {loading ? 'Importando...' : 'Importar clientes'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
