import { useCallback, useEffect, useState } from 'react'
import { authService } from '../../../services/authService.js'
import { getEntitlement } from '../../../services/entitlementService.js'

export function useAuth() {
  const [session, setSession] = useState(null)
  const [entitlement, setEntitlement] = useState(null)
  const [status, setStatus] = useState(authService.isConfigured() ? 'loading' : 'unconfigured')
  const [message, setMessage] = useState('')

  const refreshEntitlement = useCallback(async (nextSession) => {
    if (!nextSession) {
      setEntitlement(null)
      return
    }
    try {
      setEntitlement(await getEntitlement())
    } catch (error) {
      setMessage(error.message)
    }
  }, [])

  useEffect(() => {
    if (!authService.isConfigured()) return undefined
    let mounted = true
    authService.getSession().then((currentSession) => {
      if (!mounted) return
      setSession(currentSession)
      setStatus('ready')
      refreshEntitlement(currentSession)
    }).catch((error) => {
      if (!mounted) return
      setMessage(error.message)
      setStatus('ready')
    })

    const unsubscribe = authService.onAuthStateChange((nextSession) => {
      if (!mounted) return
      setSession(nextSession)
      setStatus('ready')
      refreshEntitlement(nextSession)
    })
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [refreshEntitlement])

  const execute = useCallback(async (operation, successMessage) => {
    setStatus('submitting')
    setMessage('')
    try {
      const data = await operation()
      setMessage(successMessage)
      return data
    } catch (error) {
      setMessage(error.message)
      return null
    } finally {
      setStatus('ready')
    }
  }, [])

  return {
    session,
    entitlement,
    status,
    message,
    signIn: (credentials) => execute(() => authService.signIn(credentials), 'Sessão iniciada.'),
    signUp: (credentials) => execute(
      () => authService.signUp(credentials),
      'Cadastro criado. Confira seu e-mail para confirmar a conta.',
    ),
    requestPasswordReset: (email) => execute(
      () => authService.requestPasswordReset(email),
      'Enviamos as instruções de recuperação para seu e-mail.',
    ),
    updatePassword: (password) => execute(
      () => authService.updatePassword(password),
      'Senha atualizada com sucesso.',
    ),
    signOut: () => execute(() => authService.signOut(), 'Sessão encerrada.'),
  }
}
