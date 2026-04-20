import { supabase } from './supabase'

export async function buildAuthorizedHeaders(
  headers: Record<string, string> = {},
): Promise<Record<string, string>> {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw error
  }

  const accessToken = data.session?.access_token?.trim()
  if (!accessToken) {
    throw new Error('로그인이 필요합니다.')
  }

  return {
    ...headers,
    Authorization: `Bearer ${accessToken}`,
  }
}
