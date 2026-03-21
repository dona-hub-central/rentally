import React, { useState, useEffect } from 'react'
import { useCart } from '../context/CartContext'
import api from '../utils/api'

export default function CatalogView() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [loading, setLoading] = useState(true)
  const { addItem, setIsOpen } = useCart()

  useEffect(() => {
    Promise.all([
      api.get('/categories'),
      api.get('/products')
    ]).then(([catRes, prodRes]) => {
      setCategories(catRes.data)
      setProducts(prodRes.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : products

  const handleAddToCart = (product) => {
    addItem(product)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Catálogo</h1>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            !selectedCategory ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Todos
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === cat.id ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {cat.icono} {cat.nombre}
          </button>
        ))}
      </div>

      {/* Products grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-2">📦</div>
          <p>No hay productos en esta categoría</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map(product => (
            <div key={product.id} className="card hover:shadow-md transition-shadow flex flex-col">
              {/* Product image */}
              <div className="bg-gray-100 rounded-lg h-40 mb-3 flex items-center justify-center overflow-hidden">
                {product.imagen_url ? (
                  <img src={product.imagen_url} alt={product.nombre} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">
                    {categories.find(c => c.id === product.category_id)?.icono || '📦'}
                  </span>
                )}
              </div>

              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{product.nombre}</h3>
                {product.descripcion && (
                  <p className="text-xs text-gray-500 mb-2 line-clamp-2">{product.descripcion}</p>
                )}
              </div>

              <div className="flex items-center justify-between mt-3">
                <span className="text-lg font-bold text-primary">{product.precio.toFixed(2)}€</span>
                <button
                  onClick={() => handleAddToCart(product)}
                  className="btn-primary text-sm py-1.5 px-3"
                >
                  + Añadir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
