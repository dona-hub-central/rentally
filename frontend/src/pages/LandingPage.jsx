import React from 'react'
import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-600">Rentally</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/register"
              className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-br from-blue-50 via-white to-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block mb-6 px-4 py-1.5 bg-orange-100 text-orange-700 text-sm font-semibold rounded-full border border-orange-200">
            Solo para gestores de Madrid
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-6">
            La plataforma de suministros para{' '}
            <span className="text-blue-600">apartamentos turísticos</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Lencería, amenities y transporte para gestores de apartamentos en Madrid.
            Pedidos online, entrega rápida.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="px-8 py-4 bg-blue-600 text-white rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              Solicitar acceso
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 border-2 border-blue-600 text-blue-600 rounded-xl text-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 bg-blue-600">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8 text-center text-white">
          <div>
            <div className="text-4xl font-bold mb-1">48h</div>
            <div className="text-blue-200 text-sm font-medium">entrega máxima</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-1">500+</div>
            <div className="text-blue-200 text-sm font-medium">apartamentos abastecidos</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-1">100%</div>
            <div className="text-blue-200 text-sm font-medium">dentro de M30</div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Cómo funciona</h2>
          <div className="grid md:grid-cols-3 gap-10">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-5 text-3xl">
                🏢
              </div>
              <div className="text-blue-600 font-bold text-sm mb-2 uppercase tracking-wide">Paso 1</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Regístrate y verifica tu empresa</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Crea tu cuenta y verifica tu empresa en minutos.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-5 text-3xl">
                📄
              </div>
              <div className="text-blue-600 font-bold text-sm mb-2 uppercase tracking-wide">Paso 2</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Firma el contrato online en segundos</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Todo digital, sin papeleos ni desplazamientos.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-5 text-3xl">
                🚚
              </div>
              <div className="text-blue-600 font-bold text-sm mb-2 uppercase tracking-wide">Paso 3</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Pide cuando quieras, entregamos en 48h</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Catálogo completo disponible 24/7 para tus apartamentos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categorías */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Lo que ofrecemos</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { emoji: '🛏️', title: 'Lencería', desc: 'Sábanas, toallas, fundas de almohada' },
              { emoji: '🧴', title: 'Amenities', desc: 'Champú, gel, jabón, kit de bienvenida' },
              { emoji: '📦', title: 'Kits', desc: 'Packs completos para temporada' },
              { emoji: '🚚', title: 'Transporte', desc: 'Recogida y entrega de ropa sucia/limpia' },
            ].map((cat) => (
              <div key={cat.title} className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-4xl mb-3">{cat.emoji}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{cat.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{cat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Únete a los gestores que ya confían en Rentally
          </h2>
          <p className="text-gray-500 mb-8 text-lg">Acceso exclusivo para gestores de apartamentos turísticos en Madrid.</p>
          <Link
            to="/register"
            className="inline-block px-10 py-4 bg-blue-600 text-white rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            Solicitar acceso gratuito
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-gray-900 text-gray-400 text-center text-sm">
        © 2026 Rentally · Madrid · info@rentally.es
      </footer>
    </div>
  )
}
