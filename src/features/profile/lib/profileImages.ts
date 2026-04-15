import {
  DEFAULT_ALLOWED_IMAGE_EXTENSIONS,
  DEFAULT_ALLOWED_IMAGE_MIME_TYPES,
  createStorageImagePath,
  extractPublicStoragePath,
  getPublicStorageImageUrl,
  removeStorageImageByPath,
  uploadPublicStorageImage,
  validateStorageImageFile,
} from '../../../lib/storageImages'
import { TEAM_IMAGE_BUCKET } from '../../teams/lib/teamProfileImages'

export const PROFILE_IMAGE_BUCKET = TEAM_IMAGE_BUCKET
export const PROFILE_IMAGE_STORAGE_ENABLED = true
export const PROFILE_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024

const PROFILE_IMAGE_ROOT = 'profiles'
const PROFILE_IMAGE_PREFIX = 'avatar'

export function createProfileImagePath(userId: string, file: File) {
  return createStorageImagePath({
    root: PROFILE_IMAGE_ROOT,
    ownerId: userId,
    prefix: PROFILE_IMAGE_PREFIX,
    fileName: file.name,
    mimeType: file.type,
    allowedExtensions: DEFAULT_ALLOWED_IMAGE_EXTENSIONS,
  })
}

export function extractProfileImagePath(imageUrl: string | null | undefined) {
  return extractPublicStoragePath(imageUrl, PROFILE_IMAGE_BUCKET, [PROFILE_IMAGE_ROOT])
}

export function validateProfileImageFile(file: File) {
  return validateStorageImageFile(file, {
    allowedExtensions: DEFAULT_ALLOWED_IMAGE_EXTENSIONS,
    allowedMimeTypes: DEFAULT_ALLOWED_IMAGE_MIME_TYPES,
    maxSizeBytes: PROFILE_IMAGE_MAX_SIZE_BYTES,
    invalidTypeMessage: 'JPG, PNG, WEBP 형식의 이미지만 업로드할 수 있습니다.',
    tooLargeMessage: '프로필 이미지는 5MB 이하로 업로드해 주세요.',
  })
}

export function getProfileImagePublicUrl(path: string) {
  return getPublicStorageImageUrl(PROFILE_IMAGE_BUCKET, path)
}

export async function uploadProfileImage(userId: string, file: File) {
  const path = createProfileImagePath(userId, file)
  return uploadPublicStorageImage({ bucket: PROFILE_IMAGE_BUCKET, path, file })
}

export async function removeProfileImageByPath(path: string | null | undefined) {
  await removeStorageImageByPath(PROFILE_IMAGE_BUCKET, path)
}
