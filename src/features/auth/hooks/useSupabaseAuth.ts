import { useCallback } from 'react'
import { supabase } from '../../../lib/supabase'

interface Credentials {
  email: string
  password: string
}

export function useSupabaseAuth() {
  const signInWithPassword = useCallback(async ({ email, password }: Credentials) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      throw error
    }
  }, [])

  const signUpWithPassword = useCallback(async ({ email, password }: Credentials) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })

    if (error) {
      throw error
    }

    return data
  }, [])

  return { signInWithPassword, signUpWithPassword }
}
