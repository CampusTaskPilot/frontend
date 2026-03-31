import { supabase } from '../../../lib/supabase'

export const TEAM_IMAGE_BUCKET = 'team-images'
export const TEAM_IMAGE_STORAGE_ENABLED = true
export const TEAM_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024
const TEAM_IMAGE_ROOT = 'teams'
const TEAM_IMAGE_PREFIX = 'cover'
const DEFAULT_IMAGE_EXTENSION = 'png'
const ALLOWED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'])

function fileExtension(fileName: string) {
  const normalized = fileName.trim().toLowerCase()
  const dotIndex = normalized.lastIndexOf('.')
  const extension = dotIndex >= 0 ? normalized.slice(dotIndex + 1) : DEFAULT_IMAGE_EXTENSION
  return ALLOWED_IMAGE_EXTENSIONS.has(extension) ? extension : DEFAULT_IMAGE_EXTENSION
}

function sanitizeFileName(fileName: string) {
  return fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function createTeamImageFileName(fileName: string) {
  const extension = fileExtension(fileName)
  const safeName = sanitizeFileName(fileName.replace(/\.[^.]+$/, '')) || TEAM_IMAGE_PREFIX
  const uniqueId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

  return `${Date.now()}-${uniqueId}-${safeName}.${extension}`
}

export function createTeamImagePath(teamId: string, fileName: string) {
  return `${TEAM_IMAGE_ROOT}/${teamId}/${createTeamImageFileName(fileName)}`
}

export function extractTeamImagePath(imageUrl: string | null | undefined) {
  if (!imageUrl) return null

  const marker = `/object/public/${TEAM_IMAGE_BUCKET}/`
  const markerIndex = imageUrl.indexOf(marker)

  if (markerIndex < 0) {
    const normalized = imageUrl.trim().replace(/^\/+/, '')
    return normalized.startsWith(`${TEAM_IMAGE_ROOT}/`) ? normalized : null
  }

  const pathWithQuery = imageUrl.slice(markerIndex + marker.length)
  const queryIndex = pathWithQuery.indexOf('?')

  return queryIndex >= 0 ? pathWithQuery.slice(0, queryIndex) : pathWithQuery
}

export function validateTeamImageFile(file: File) {
  if (!file.type.startsWith('image/')) {
    return 'Only image files can be uploaded.'
  }

  if (file.size > TEAM_IMAGE_MAX_SIZE_BYTES) {
    return 'Team images must be 5 MB or smaller.'
  }

  return ''
}

export function getTeamImagePublicUrl(path: string) {
  const publicUrlResult = supabase.storage.from(TEAM_IMAGE_BUCKET).getPublicUrl(path)
  return `${publicUrlResult.data.publicUrl}?v=${Date.now()}`
}

export async function uploadTeamImage(teamId: string, file: File) {
  const path = createTeamImagePath(teamId, file.name)
  const uploadResult = await supabase.storage.from(TEAM_IMAGE_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (uploadResult.error) {
    throw uploadResult.error
  }

  return {
    path,
    publicUrl: getTeamImagePublicUrl(path),
  }
}

export async function removeTeamImageByPath(path: string | null | undefined) {
  if (!path) return

  const result = await supabase.storage.from(TEAM_IMAGE_BUCKET).remove([path])

  if (result.error) {
    throw result.error
  }
}
