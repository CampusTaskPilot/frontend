import {
  createStorageImagePath,
  getPublicStorageImageUrl,
  parseStoragePathFromImageUrl,
  removeStorageImageByPath,
  uploadPublicStorageImage,
  validateStorageImageFile,
} from '../../../lib/storageImages'
import {
  LEGACY_STORAGE_ROOTS,
  STORAGE_BUCKETS,
  type StorageObjectReference,
} from '../../../lib/storageBuckets'

export const TEAM_IMAGE_BUCKET = STORAGE_BUCKETS.teamImages
export const TEAM_IMAGE_STORAGE_ENABLED = true
export const TEAM_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024
const TEAM_IMAGE_PREFIX = 'cover'
const ALLOWED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'])
const ALLOWED_TEAM_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
])

function isLegacyTeamImagePath(path: string) {
  const segments = path.split('/').filter(Boolean)

  return segments.length >= 3 && segments[0] === LEGACY_STORAGE_ROOTS.teamImages
}

function isTeamImagePath(path: string) {
  const segments = path.split('/').filter(Boolean)

  if (segments.length < 2) {
    return false
  }

  if (isLegacyTeamImagePath(path)) {
    return true
  }

  return (
    segments[0] !== LEGACY_STORAGE_ROOTS.teamImages &&
    segments[0] !== LEGACY_STORAGE_ROOTS.profileImages
  )
}

export function createTeamImagePath(teamId: string, fileName: string) {
  return createStorageImagePath({
    ownerId: teamId,
    prefix: TEAM_IMAGE_PREFIX,
    fileName,
    allowedExtensions: ALLOWED_IMAGE_EXTENSIONS,
  })
}

export function extractTeamImageReference(imageUrl: string | null | undefined): StorageObjectReference | null {
  const path = parseStoragePathFromImageUrl(imageUrl, TEAM_IMAGE_BUCKET)

  if (!path || !isTeamImagePath(path)) {
    return null
  }

  return {
    bucket: TEAM_IMAGE_BUCKET,
    path,
  }
}

export function extractTeamImagePath(imageUrl: string | null | undefined) {
  return extractTeamImageReference(imageUrl)?.path ?? null
}

export function validateTeamImageFile(file: File) {
  return validateStorageImageFile(file, {
    allowedExtensions: ALLOWED_IMAGE_EXTENSIONS,
    allowedMimeTypes: ALLOWED_TEAM_IMAGE_MIME_TYPES,
    maxSizeBytes: TEAM_IMAGE_MAX_SIZE_BYTES,
    invalidTypeMessage: 'Only image files can be uploaded.',
    tooLargeMessage: 'Team images must be 5 MB or smaller.',
  })
}

export function getTeamImagePublicUrl(path: string) {
  return getPublicStorageImageUrl(TEAM_IMAGE_BUCKET, path)
}

export async function uploadTeamImage(teamId: string, file: File) {
  const path = createTeamImagePath(teamId, file.name)
  return uploadPublicStorageImage({ bucket: TEAM_IMAGE_BUCKET, path, file })
}

export async function removeTeamImageByPath(path: string | null | undefined) {
  await removeStorageImageByPath(TEAM_IMAGE_BUCKET, path)
}

export async function removeTeamImageByReference(reference: StorageObjectReference | null | undefined) {
  if (!reference) return
  await removeStorageImageByPath(reference.bucket, reference.path)
}
