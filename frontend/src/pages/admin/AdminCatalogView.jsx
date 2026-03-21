import React, { useState, useEffect } from 'react'
import api from '../../utils/api'

export default function AdminCatalogView() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('products')
  const [message, setMessage] = useState('')

  // Forms
  const [showCatForm, setShowCatForm] = useState(false)
  const [catForm, setCatForm] = useState({ nombre: '', icono: '', orden: 0 })
  const [showProdForm, setShowProdForm] = useState(false)
  const [prodForm, setProdForm] = useState({ category_id: '', nombre: '', descripcion: '', precio: '', imagen_url: '', umbral_cantidad: 100, stock_disponible: 0 })
  const [editProduct, setEditProduct] = useState(null)

  const load = () => {
    setLoading(true)
    Promise.all([api.get('/categories'), api.get('/products')]).then(([catRes, prodRes]) => {
      setCategories(catRes.data)
      setProducts(prodRes.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreateCategory = async (e) => {
    e.preventDefault()
    try {
      await api.post('/admin/categories', { ...catForm, orden: parseInt(catForm.orden) })
      setMessage('Categoría creada')
      setCatForm({ nombre: '', icono: '', orden: 0 })
      setShowCatForm(false)
      load()
    } catch (e) {
      setMessage(e.response?.data?.detail || 'Error')
    }
  }

  const handleSaveProduct = async (e) => {
    e.preventDefault()
    const data = { ...prodForm, precio: parseFloat(prodForm.precio), category_id: parseInt(prodForm.category_id), umbral_cantidad: parseInt(prodForm.umbral_cantidad), stock_disponible: parseInt(prodForm.stock_disponible) }
    try {
      if (editProduct) {
        await api.put(`/admin/products/${editProduct.id}`, data)
        setMessage('Producto actualizado')
      } else {
        await api.post('/admin/products', data)
        setMessage('Producto creado')
      }
      setProdForm({ category_id: '', nombre: '', descripcion: '', precio: '', imagen_url: '', umbral_cantidad: 100, stock_disponible: 0 })
      setShowProdForm(false)
      setEditProduct(null)
      load()
    } catch (e) {
      setMessage(e.response?.data?.detail || 'Error')
    }
  }

  const handleEdit = (product) => {
    setEditProduct(product)
    setProdForm({ ...product, precio: String(product.precio) })
    setShowProdForm(true)
  }

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Desactivar "${nombre}"?`)) return
    try {
      await api.delete(`/admin/products/${id}`)
      setMessage('Producto desactivado')
      load()
    } catch (e) {
      setMessage(e.response?.data?.detail || 'Error')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Catálogo</h1>

      {message && <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4">{message}</div>}

      <div className="flex gap-3 mb-6">
        <button onClick={() => setActiveTab('products')} className={`px-4 py-2 rounded-lg font-medium text-sm ${activeTab === 'products' ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Productos</button>
        <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 rounded-lg font-medium text-sm ${activeTab === 'categories' ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Categorías</button>
      </div>

      {activeTab === 'categories' && (
        <div>
          <div className="flex justify-between mb-4">
            <h2 className="font-semibold">Categorías</h2>
            <button onClick={() => setShowCatForm(!showCatForm)} className="btn-primary text-sm">+ Nueva</button>
          </div>

          {showCatForm && (
            <form onSubmit={handleCreateCategory} className="card mb-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Nombre</label>
                  <input value={catForm.nombre} onChange={e => setCatForm(p => ({...p, nombre: e.target.value}))} required className="input" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Icono (emoji)</label>
                  <input value={catForm.icono} onChange={e => setCatForm(p => ({...p, icono: e.target.value}))} className="input" placeholder="🛏️" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Orden</label>
                  <input type="number" value={catForm.orden} onChange={e => setCatForm(p => ({...p, orden: e.target.value}))} className="input" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary text-sm">Crear</button>
                <button type="button" onClick={() => setShowCatForm(false)} className="btn-secondary text-sm">Cancelar</button>
              </div>
            </form>
          )}

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map(c => (
              <div key={c.id} className="card flex items-center gap-3">
                <span className="text-2xl">{c.icono}</span>
                <div>
                  <p className="font-medium">{c.nombre}</p>
                  <p className="text-xs text-gray-500">Orden: {c.orden}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div>
          <div className="flex justify-between mb-4">
            <h2 className="font-semibold">{products.length} productos</h2>
            <button onClick={() => { setEditProduct(null); setProdForm({ category_id: categories[0]?.id || '', nombre: '', descripcion: '', precio: '', imagen_url: '', umbral_cantidad: 100, stock_disponible: 0 }); setShowProdForm(!showProdForm) }} className="btn-primary text-sm">+ Nuevo producto</button>
          </div>

          {showProdForm && (
            <form onSubmit={handleSaveProduct} className="card mb-4 space-y-3">
              <h3 className="font-semibold">{editProduct ? 'Editar producto' : 'Nuevo producto'}</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Categoría</label>
                  <select value={prodForm.category_id} onChange={e => setProdForm(p => ({...p, category_id: e.target.value}))} required className="input">
                    <option value="">Selecciona...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Nombre</label>
                  <input value={prodForm.nombre} onChange={e => setProdForm(p => ({...p, nombre: e.target.value}))} required className="input" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Precio (€)</label>
                  <input type="number" step="0.01" value={prodForm.precio} onChange={e => setProdForm(p => ({...p, precio: e.target.value}))} required className="input" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">URL Imagen</label>
                  <input value={prodForm.imagen_url} onChange={e => setProdForm(p => ({...p, imagen_url: e.target.value}))} className="input" placeholder="https://..." />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Umbral de cantidad</label>
                  <input type="number" value={prodForm.umbral_cantidad} onChange={e => setProdForm(p => ({...p, umbral_cantidad: e.target.value}))} className="input" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Stock disponible</label>
                  <input type="number" value={prodForm.stock_disponible} onChange={e => setProdForm(p => ({...p, stock_disponible: e.target.value}))} className="input" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Descripción</label>
                <textarea value={prodForm.descripcion} onChange={e => setProdForm(p => ({...p, descripcion: e.target.value}))} rows={2} className="input resize-none" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary text-sm">{editProduct ? 'Actualizar' : 'Crear'}</button>
                <button type="button" onClick={() => { setShowProdForm(false); setEditProduct(null) }} className="btn-secondary text-sm">Cancelar</button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {products.map(p => {
              const cat = categories.find(c => c.id === p.category_id)
              return (
                <div key={p.id} className="card flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    {p.imagen_url ? <img src={p.imagen_url} className="w-full h-full object-cover rounded-lg" /> : <span className="text-xl">{cat?.icono || '📦'}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{p.nombre}</p>
                    <p className="text-xs text-gray-500">{cat?.nombre} · Umbral: {p.umbral_cantidad} uds</p>
                  </div>
                  <p className="font-bold text-primary shrink-0">{p.precio.toFixed(2)}€</p>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleEdit(p)} className="btn-secondary text-xs py-1.5 px-3">Editar</button>
                    <button onClick={() => handleDelete(p.id, p.nombre)} className="btn-danger text-xs py-1.5 px-3">Quitar</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
