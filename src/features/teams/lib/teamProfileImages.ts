import {
  createStorageImagePath,
  extractPublicStoragePath,
  getPublicStorageImageUrl,
  removeStorageImageByPath,
  uploadPublicStorageImage,
  validateStorageImageFile,
} from '../../../lib/storageImages'

export const TEAM_IMAGE_BUCKET = 'team-images'
export const TEAM_IMAGE_STORAGE_ENABLED = true
export const TEAM_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024
const TEAM_IMAGE_ROOT = 'teams'
const TEAM_IMAGE_PREFIX = 'cover'
const ALLOWED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'])
const ALLOWED_TEAM_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
])

export function createTeamImagePath(teamId: string, fileName: string) {
  return createStorageImagePath({
    root: TEAM_IMAGE_ROOT,
    ownerId: teamId,
    prefix: TEAM_IMAGE_PREFIX,
    fileName,
    allowedExtensions: ALLOWED_IMAGE_EXTENSIONS,
  })
}

export function extractTeamImagePath(imageUrl: string | null | undefined) {
  return extractPublicStoragePath(imageUrl, TEAM_IMAGE_BUCKET, [TEAM_IMAGE_ROOT])
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
