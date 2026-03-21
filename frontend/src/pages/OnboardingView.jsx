import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

const steps = [
  { id: 1, title: 'Verificar Email', icon: '📧' },
  { id: 2, title: 'Esperando aprobación', icon: '⏳' },
  { id: 3, title: 'Firmar contrato', icon: '📝' },
  { id: 4, title: 'Confirmar fianza', icon: '💰' },
  { id: 5, title: '¡Listo!', icon: '🎉' },
]

function getStep(user) {
  if (!user.email_verified) return 1
  if (user.estado === 'verificado' || user.estado === 'pendiente') return 2
  if (!user.has_signed_contract) return 3
  if (!user.has_fianza) return 4
  return 5
}

export default function OnboardingView() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [otp, setOtp] = useState('')
  const [contractOtp, setContractOtp] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [contract, setContract] = useState(null)
  const [otpSent, setOtpSent] = useState(false)

  const currentStep = user ? getStep(user) : 1

  useEffect(() => {
    if (currentStep === 5) {
      setTimeout(() => navigate('/app/dashboard'), 2000)
    }
    if (currentStep === 3) {
      api.get('/contracts/current').then(res => {
        if (res.data.id) setContract(res.data)
      }).catch(() => {})
    }
  }, [currentStep])

  const handleVerifyEmail = async () => {
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/verify-email', { email: user.email, otp })
      setMessage('✅ Email verificado correctamente')
      await refreshUser()
    } catch (e) {
      setError(e.response?.data?.detail || 'Código incorrecto')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    try {
      await api.post('/auth/resend-otp', { email: user.email })
      setMessage('Código reenviado a tu email (revisa la consola del servidor por ahora)')
    } catch (e) {
      setError('Error al reenviar el código')
    }
  }

  const handleRequestContractOtp = async () => {
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/request-contract-otp', { contract_id: contract.id })
      setOtpSent(true)
      setMessage('Código enviado a tu email para firmar el contrato')
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al solicitar OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleSignContract = async () => {
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/sign-contract', { contract_id: contract.id, otp: contractOtp })
      setMessage('✅ Contrato firmado correctamente')
      await refreshUser()
    } catch (e) {
      setError(e.response?.data?.detail || 'Código incorrecto')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    await refreshUser()
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bienvenido a Rentally</h1>
        <p className="text-gray-500 mt-1">Completa los siguientes pasos para activar tu cuenta</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, idx) => (
          <React.Fragment key={step.id}>
            <div className={`flex flex-col items-center ${step.id <= currentStep ? 'opacity-100' : 'opacity-30'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
                ${step.id < currentStep ? 'bg-green-100 text-green-600' :
                  step.id === currentStep ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                {step.id < currentStep ? '✓' : step.icon}
              </div>
              <span className="text-xs text-gray-500 mt-1 text-center hidden sm:block">{step.title}</span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 ${step.id < currentStep ? 'bg-green-300' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step content */}
      <div className="card">
        {message && (
          <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4">{message}</div>
        )}
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>
        )}

        {currentStep === 1 && (
          <div>
            <h2 className="text-lg font-semibold mb-2">📧 Verifica tu email</h2>
            <p className="text-gray-500 text-sm mb-4">
              Hemos enviado un código de 6 dígitos a <strong>{user?.email}</strong>
            </p>
            <div className="space-y-3">
              <input
                value={otp}
                onChange={e => setOtp(e.target.value)}
                className="input text-center text-2xl tracking-widest font-mono"
                placeholder="000000"
                maxLength={6}
              />
              <button onClick={handleVerifyEmail} disabled={loading || otp.length !== 6} className="btn-primary w-full">
                Verificar email
              </button>
              <button onClick={handleResendOtp} className="btn-secondary w-full text-sm">
                Reenviar código
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              💡 Mientras no hay email real configurado, el código aparece en la consola del servidor
            </p>
          </div>
        )}

        {currentStep === 2 && (
          <div className="text-center py-6">
            <div className="text-5xl mb-4">⏳</div>
            <h2 className="text-lg font-semibold mb-2">Esperando aprobación</h2>
            <p className="text-gray-500 text-sm">
              Tu solicitud ha sido recibida. El equipo de Rentally revisará tu cuenta y te notificará por email cuando esté aprobada.
            </p>
            <button onClick={handleRefresh} className="btn-secondary mt-4">
              Actualizar estado
            </button>
          </div>
        )}

        {currentStep === 3 && (
          <div>
            <h2 className="text-lg font-semibold mb-2">📝 Firma el contrato</h2>
            {!contract ? (
              <p className="text-gray-500 text-sm">No hay contrato activo disponible por el momento. El administrador lo subirá pronto.</p>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium">{contract.nombre}</p>
                  {contract.version && <p className="text-xs text-gray-500">Versión: {contract.version}</p>}
                  <a
                    href={contract.archivo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary text-sm hover:underline mt-2 inline-block"
                  >
                    📄 Ver contrato PDF
                  </a>
                </div>

                {!otpSent ? (
                  <button onClick={handleRequestContractOtp} disabled={loading} className="btn-primary w-full">
                    Solicitar código para firmar
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-500">Introduce el código enviado a tu email:</p>
                    <input
                      value={contractOtp}
                      onChange={e => setContractOtp(e.target.value)}
                      className="input text-center text-2xl tracking-widest font-mono"
                      placeholder="000000"
                      maxLength={6}
                    />
                    <button onClick={handleSignContract} disabled={loading || contractOtp.length !== 6} className="btn-primary w-full">
                      Firmar contrato
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {currentStep === 4 && (
          <div className="text-center py-6">
            <div className="text-5xl mb-4">💰</div>
            <h2 className="text-lg font-semibold mb-2">Confirmación de fianza</h2>
            <p className="text-gray-500 text-sm">
              El equipo de Rentally se pondrá en contacto contigo por teléfono para confirmar la fianza. Una vez confirmada, podrás empezar a hacer pedidos.
            </p>
            <button onClick={handleRefresh} className="btn-secondary mt-4">
              Actualizar estado
            </button>
          </div>
        )}

        {currentStep === 5 && (
          <div className="text-center py-6">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-lg font-semibold mb-2 text-green-600">¡Todo listo!</h2>
            <p className="text-gray-500 text-sm">Tu cuenta está completamente activa. Redirigiendo al panel...</p>
          </div>
        )}
      </div>
    </div>
  )
}
