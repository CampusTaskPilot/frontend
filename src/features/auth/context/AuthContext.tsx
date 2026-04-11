import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'
import { AuthContext, type AuthContextValue } from './authContextShared'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    let hasResolvedInitialSession = false

    const resolveSession = (nextSession: Session | null) => {
      if (!isMounted) {
        return
      }

      hasResolvedInitialSession = true
      setSession(nextSession)
      setIsLoading(false)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) {
        return
      }

      setSession(nextSession)

      if (event === 'INITIAL_SESSION') {
        hasResolvedInitialSession = true
        setIsLoading(false)
      }
    })

    const initializeSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Failed to load session', error)
        }

        if (hasResolvedInitialSession) {
          return
        }

        resolveSession(data.session)
      } catch (error) {
        console.error('Failed to initialize auth session', error)

        if (!hasResolvedInitialSession) {
          resolveSession(null)
        }
      }
    }

    void initializeSession()

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      signOut: async () => {
        const { error } = await supabase.auth.signOut()

        if (error) {
          throw error
        }
      },
    }),
    [isLoading, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
