export function getAuthErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback
  }

  const normalized = error.message.toLowerCase()

  if (
    normalized.includes('already registered') ||
    normalized.includes('already been registered') ||
    normalized.includes('user already registered') ||
    normalized.includes('duplicate key value')
  ) {
    return '이미 가입된 이메일입니다. 로그인해 주세요.'
  }

  if (normalized.includes('invalid login credentials')) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.'
  }

  if (normalized.includes('email not confirmed') || normalized.includes('email not verified')) {
    return '이메일 인증을 완료한 뒤 로그인해 주세요.'
  }

  if (
    normalized.includes('password should be at least') ||
    normalized.includes('password is too short') ||
    normalized.includes('weak password')
  ) {
    return '비밀번호는 8자 이상 입력해 주세요.'
  }

  if (normalized.includes('invalid email') || normalized.includes('email address is invalid')) {
    return '올바른 이메일 주소를 입력해 주세요.'
  }

  if (
    normalized.includes('rate limit') ||
    normalized.includes('too many requests') ||
    normalized.includes('email rate limit')
  ) {
    return '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'
  }

  if (normalized.includes('failed to fetch') || normalized.includes('network')) {
    return '네트워크 연결이 불안정합니다. 잠시 후 다시 시도해 주세요.'
  }

  return fallback
}
