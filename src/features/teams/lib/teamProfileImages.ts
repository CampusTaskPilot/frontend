import { supabase } from '../../../lib/supabase'

export const TEAM_IMAGE_BUCKET = 'team-images'
export const TEAM_IMAGE_STORAGE_ENABLED = true
const TEAM_IMAGE_PREFIX = 'cover'

function fileExtension(fileName: string) {
  const normalized = fileName.trim().toLowerCase()
  const dotIndex = normalized.lastIndexOf('.')
  return dotIndex >= 0 ? normalized.slice(dotIndex + 1) : 'png'
}

function sanitizeFileName(fileName: string) {
  return fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function createTeamImagePath(teamId: string, fileName: string) {
  const extension = fileExtension(fileName)
  const safeName = sanitizeFileName(fileName.replace(/\.[^.]+$/, '')) || TEAM_IMAGE_PREFIX
  return `${teamId}/${Date.now()}-${safeName}.${extension}`
}

export function extractTeamImagePath(imageUrl: string | null | undefined) {
  if (!imageUrl) return null

  const marker = `/object/public/${TEAM_IMAGE_BUCKET}/`
  const markerIndex = imageUrl.indexOf(marker)

  if (markerIndex < 0) {
    return null
  }

  const pathWithQuery = imageUrl.slice(markerIndex + marker.length)
  const queryIndex = pathWithQuery.indexOf('?')

  return queryIndex >= 0 ? pathWithQuery.slice(0, queryIndex) : pathWithQuery
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

  const publicUrlResult = supabase.storage.from(TEAM_IMAGE_BUCKET).getPublicUrl(path)

  return {
    path,
    publicUrl: `${publicUrlResult.data.publicUrl}?v=${Date.now()}`,
  }
}

export async function removeTeamImageByPath(path: string | null | undefined) {
  if (!path) return

  const result = await supabase.storage.from(TEAM_IMAGE_BUCKET).remove([path])

  if (result.error) {
    throw result.error
  }
}
