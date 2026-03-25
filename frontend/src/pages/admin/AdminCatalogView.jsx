import React, { useState, useEffect } from 'react'
import api from '../../utils/api'

export default function AdminCatalogView() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [kits, setKits] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('products')
  const [message, setMessage] = useState('')

  // Product form
  const [showProdForm, setShowProdForm] = useState(false)
  const [prodForm, setProdForm] = useState({ category_id: '', nombre: '', descripcion: '', precio: '', imagen_url: '', umbral_cantidad: 100, stock_disponible: 0 })
  const [editProduct, setEditProduct] = useState(null)

  // Category form
  const [showCatForm, setShowCatForm] = useState(false)
  const [catForm, setCatForm] = useState({ nombre: '', icono: '', orden: 0 })

  // Kit form
  const [showKitForm, setShowKitForm] = useState(false)
  const [editKit, setEditKit] = useState(null)
  const [kitForm, setKitForm] = useState({ nombre: '', descripcion: '', precio: '', imagen_url: '' })
  const [kitItems, setKitItems] = useState([]) // [{product_id, cantidad}]
  const [kitProductSearch, setKitProductSearch] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get('/categories'),
      api.get('/products'),
      api.get('/admin/kits')
    ]).then(([catRes, prodRes, kitRes]) => {
      setCategories(catRes.data)
      setProducts(prodRes.data)
      setKits(kitRes.data)
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
    } catch (e) { setMessage(e.response?.data?.detail || 'Error') }
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
    } catch (e) { setMessage(e.response?.data?.detail || 'Error') }
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
    } catch (e) { setMessage(e.response?.data?.detail || 'Error') }
  }

  // Kit handlers
  const openNewKit = () => {
    setEditKit(null)
    setKitForm({ nombre: '', descripcion: '', precio: '', imagen_url: '' })
    setKitItems([])
    setShowKitForm(true)
  }

  const openEditKit = (kit) => {
    setEditKit(kit)
    setKitForm({ nombre: kit.nombre, descripcion: kit.descripcion || '', precio: String(kit.precio), imagen_url: kit.imagen_url || '' })
    setKitItems(kit.items.map(i => ({ product_id: i.product_id, cantidad: i.cantidad })))
    setShowKitForm(true)
  }

  const addKitItem = (product) => {
    if (kitItems.find(i => i.product_id === product.id)) return
    setKitItems(prev => [...prev, { product_id: product.id, cantidad: 1 }])
    setKitProductSearch('')
  }

  const updateKitItemQty = (product_id, cantidad) => {
    setKitItems(prev => prev.map(i => i.product_id === product_id ? { ...i, cantidad: parseInt(cantidad) || 1 } : i))
  }

  const removeKitItem = (product_id) => {
    setKitItems(prev => prev.filter(i => i.product_id !== product_id))
  }

  const handleSaveKit = async (e) => {
    e.preventDefault()
    const data = {
      nombre: kitForm.nombre,
      descripcion: kitForm.descripcion,
      precio: parseFloat(kitForm.precio) || 0,
      imagen_url: kitForm.imagen_url,
      items: kitItems
    }
    try {
      if (editKit) {
        await api.put(`/admin/kits/${editKit.id}`, data)
        setMessage('Kit actualizado')
      } else {
        await api.post('/admin/kits', data)
        setMessage('Kit creado')
      }
      setShowKitForm(false)
      setEditKit(null)
      load()
    } catch (e) { setMessage(e.response?.data?.detail || 'Error') }
  }

  const handleDeleteKit = async (id, nombre) => {
    if (!confirm(`¿Desactivar kit "${nombre}"?`)) return
    try {
      await api.delete(`/admin/kits/${id}`)
      setMessage('Kit desactivado')
      load()
    } catch (e) { setMessage(e.response?.data?.detail || 'Error') }
  }

  const filteredProducts = kitProductSearch
    ? products.filter(p => p.nombre.toLowerCase().includes(kitProductSearch.toLowerCase()))
    : products

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Catálogo</h1>

      {message && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4 flex justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')}>✕</button>
        </div>
      )}

      <div className="flex gap-3 mb-6">
        {[['products', 'Productos'], ['kits', 'Kits'], ['categories', 'Categorías']].map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${activeTab === tab ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── CATEGORÍAS ── */}
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

      {/* ── PRODUCTOS ── */}
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
                  <label className="text-sm font-medium text-gray-700 block mb-1">Umbral cantidad</label>
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
                    {p.imagen_url ? <img src={p.imagen_url} className="w-full h-full object-cover rounded-lg" alt="" /> : <span className="text-xl">{cat?.icono || '📦'}</span>}
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

      {/* ── KITS ── */}
      {activeTab === 'kits' && (
        <div>
          <div className="flex justify-between mb-4">
            <h2 className="font-semibold">{kits.length} kits</h2>
            <button onClick={openNewKit} className="btn-primary text-sm">+ Nuevo kit</button>
          </div>

          {showKitForm && (
            <form onSubmit={handleSaveKit} className="card mb-6 space-y-4">
              <h3 className="font-semibold text-lg">{editKit ? 'Editar kit' : 'Nuevo kit'}</h3>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Nombre del kit *</label>
                  <input required value={kitForm.nombre} onChange={e => setKitForm(f => ({...f, nombre: e.target.value}))} className="input" placeholder="Ej: Kit habitación doble" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Precio (€)</label>
                  <input type="number" step="0.01" value={kitForm.precio} onChange={e => setKitForm(f => ({...f, precio: e.target.value}))} className="input" placeholder="0.00" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">URL Imagen</label>
                  <input value={kitForm.imagen_url} onChange={e => setKitForm(f => ({...f, imagen_url: e.target.value}))} className="input" placeholder="https://..." />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Descripción</label>
                  <input value={kitForm.descripcion} onChange={e => setKitForm(f => ({...f, descripcion: e.target.value}))} className="input" placeholder="Descripción opcional" />
                </div>
              </div>

              {/* Productos del kit */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Productos incluidos</label>

                {/* Buscador */}
                <div className="relative mb-3">
                  <input
                    type="text"
                    value={kitProductSearch}
                    onChange={e => setKitProductSearch(e.target.value)}
                    placeholder="🔍 Buscar producto para añadir..."
                    className="input"
                  />
                  {kitProductSearch && (
                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {filteredProducts.filter(p => !kitItems.find(i => i.product_id === p.id)).map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addKitItem(p)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2"
                        >
                          <span className="text-gray-400 text-xs">{categories.find(c => c.id === p.category_id)?.icono}</span>
                          <span>{p.nombre}</span>
                          <span className="text-gray-400 text-xs ml-auto">{p.precio.toFixed(2)}€</span>
                        </button>
                      ))}
                      {filteredProducts.filter(p => !kitItems.find(i => i.product_id === p.id)).length === 0 && (
                        <p className="text-center text-gray-400 text-sm py-3">Sin resultados</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Lista de items del kit */}
                {kitItems.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4 border border-dashed border-gray-200 rounded-lg">
                    Busca y añade productos al kit
                  </p>
                ) : (
                  <div className="space-y-2">
                    {kitItems.map(item => {
                      const p = products.find(pr => pr.id === item.product_id)
                      const cat = p ? categories.find(c => c.id === p.category_id) : null
                      return (
                        <div key={item.product_id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-lg">{cat?.icono || '📦'}</span>
                          <span className="flex-1 text-sm font-medium text-gray-800">{p?.nombre}</span>
                          <span className="text-xs text-gray-400">{p?.precio.toFixed(2)}€/ud</span>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-500">Cant:</label>
                            <input
                              type="number"
                              min="1"
                              value={item.cantidad}
                              onChange={e => updateKitItemQty(item.product_id, e.target.value)}
                              className="w-16 border border-gray-300 rounded-md px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                          </div>
                          <button type="button" onClick={() => removeKitItem(item.product_id)} className="text-red-400 hover:text-red-600 text-lg leading-none ml-1">×</button>
                        </div>
                      )
                    })}
                    <div className="text-right text-sm font-medium text-gray-600 pt-1">
                      {kitItems.length} producto{kitItems.length !== 1 ? 's' : ''} · Total items: {kitItems.reduce((a, i) => a + i.cantidad, 0)} uds
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary text-sm">{editKit ? 'Actualizar kit' : 'Crear kit'}</button>
                <button type="button" onClick={() => { setShowKitForm(false); setEditKit(null) }} className="btn-secondary text-sm">Cancelar</button>
              </div>
            </form>
          )}

          {kits.length === 0 && !showKitForm ? (
            <div className="card text-center py-12">
              <div className="text-4xl mb-3">📦</div>
              <p className="text-gray-500">No hay kits todavía. Crea el primero.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {kits.map(k => (
                <div key={k.id} className="card">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                      {k.imagen_url ? <img src={k.imagen_url} className="w-full h-full object-cover rounded-lg" alt="" /> : <span className="text-2xl">📦</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900">{k.nombre}</p>
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Kit</span>
                      </div>
                      {k.descripcion && <p className="text-sm text-gray-500 mb-2">{k.descripcion}</p>}
                      <div className="flex flex-wrap gap-1">
                        {k.items.map(item => (
                          <span key={item.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {item.cantidad}x {item.product_nombre}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-primary text-lg">{k.precio.toFixed(2)}€</p>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => openEditKit(k)} className="btn-secondary text-xs py-1.5 px-3">Editar</button>
                        <button onClick={() => handleDeleteKit(k.id, k.nombre)} className="btn-danger text-xs py-1.5 px-3">Quitar</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
