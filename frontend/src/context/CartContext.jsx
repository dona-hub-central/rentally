import React, { createContext, useContext, useState } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [isOpen, setIsOpen] = useState(false)

  const addItem = (product, cantidad = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        return prev.map(i =>
          i.product.id === product.id
            ? { ...i, cantidad: i.cantidad + cantidad }
            : i
        )
      }
      return [...prev, { product, cantidad }]
    })
    setIsOpen(true)
  }

  const removeItem = (productId) => {
    setItems(prev => prev.filter(i => i.product.id !== productId))
  }

  const updateQuantity = (productId, cantidad) => {
    if (cantidad <= 0) {
      removeItem(productId)
      return
    }
    setItems(prev => prev.map(i =>
      i.product.id === productId ? { ...i, cantidad } : i
    ))
  }

  const clearCart = () => {
    setItems([])
  }

  const subtotal = items.reduce((sum, i) => sum + i.product.precio * i.cantidad, 0)
  const totalItems = items.reduce((sum, i) => sum + i.cantidad, 0)

  return (
    <CartContext.Provider value={{
      items, isOpen, setIsOpen,
      addItem, removeItem, updateQuantity, clearCart,
      subtotal, totalItems
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}
