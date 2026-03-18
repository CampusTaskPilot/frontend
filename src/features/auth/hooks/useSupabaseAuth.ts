import { useCallback } from 'react'
import { supabase } from '../../../lib/supabaseClient'

interface Credentials {
  email: string
  password: string
}

interface OtpPayload {
  email: string
}

export function useSupabaseAuth() {
  const ensureClient = () => {
    if (!supabase) {
      throw new Error('Supabase client not configured. Check environment vars.')
    }
    return supabase
  }

  const signInWithPassword = useCallback(async ({ email, password }: Credentials) => {
    const client = ensureClient()
    if (!password) {
      throw new Error('Password required for this flow.')
    }
    await client.auth.signInWithPassword({ email, password })
  }, [])

  const sendOtp = useCallback(async ({ email }: OtpPayload) => {
    const client = ensureClient()
    await client.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
  }, [])

  return { signInWithPassword, sendOtp }
}
