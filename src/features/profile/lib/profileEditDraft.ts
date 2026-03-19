import type { EditableProfileForm, SelectedSkill } from '../types'

interface ProfileEditDraft {
  form: EditableProfileForm
  selectedSkills: SelectedSkill[]
  updatedAt: string
}

function isValidDraft(value: unknown): value is ProfileEditDraft {
  if (!value || typeof value !== 'object') {
    return false
  }

  const draft = value as Partial<ProfileEditDraft>
  return Boolean(draft.form && Array.isArray(draft.selectedSkills))
}

export function getProfileEditDraftKey(userId: string) {
  return `profile-edit-draft-${userId}`
}

export function loadProfileEditDraft(key: string): ProfileEditDraft | null {
  try {
    const raw = window.sessionStorage.getItem(key)

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as unknown
    return isValidDraft(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveProfileEditDraft(
  key: string,
  payload: Pick<ProfileEditDraft, 'form' | 'selectedSkills'>,
) {
  const draft: ProfileEditDraft = {
    form: payload.form,
    selectedSkills: payload.selectedSkills,
    updatedAt: new Date().toISOString(),
  }

  window.sessionStorage.setItem(key, JSON.stringify(draft))
}

export function clearProfileEditDraft(key: string) {
  window.sessionStorage.removeItem(key)
}
