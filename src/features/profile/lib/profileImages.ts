import {
  DEFAULT_ALLOWED_IMAGE_EXTENSIONS,
  DEFAULT_ALLOWED_IMAGE_MIME_TYPES,
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

const LEGACY_PROFILE_IMAGE_BUCKET = STORAGE_BUCKETS.teamImages
export const PROFILE_IMAGE_BUCKET = STORAGE_BUCKETS.profileImages
export const PROFILE_IMAGE_STORAGE_ENABLED = true
export const PROFILE_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024

const PROFILE_IMAGE_PREFIX = 'avatar'

function isLegacyProfileImagePath(path: string) {
  const segments = path.split('/').filter(Boolean)

  return segments.length >= 3 && segments[0] === LEGACY_STORAGE_ROOTS.profileImages
}

function isProfileImagePath(path: string) {
  const segments = path.split('/').filter(Boolean)

  if (segments.length < 2) {
    return false
  }

  if (isLegacyProfileImagePath(path)) {
    return true
  }

  return (
    segments[0] !== LEGACY_STORAGE_ROOTS.profileImages &&
    segments[0] !== LEGACY_STORAGE_ROOTS.teamImages
  )
}

export function createProfileImagePath(userId: string, file: File) {
  return createStorageImagePath({
    ownerId: userId,
    prefix: PROFILE_IMAGE_PREFIX,
    fileName: file.name,
    mimeType: file.type,
    allowedExtensions: DEFAULT_ALLOWED_IMAGE_EXTENSIONS,
  })
}

export function extractProfileImageReference(imageUrl: string | null | undefined): StorageObjectReference | null {
  const profileBucketPath = parseStoragePathFromImageUrl(imageUrl, PROFILE_IMAGE_BUCKET)

  if (profileBucketPath && isProfileImagePath(profileBucketPath)) {
    return {
      bucket: PROFILE_IMAGE_BUCKET,
      path: profileBucketPath,
    }
  }

  const legacyPath = parseStoragePathFromImageUrl(imageUrl, LEGACY_PROFILE_IMAGE_BUCKET)

  if (!legacyPath || !isLegacyProfileImagePath(legacyPath)) {
    return null
  }

  return {
    bucket: LEGACY_PROFILE_IMAGE_BUCKET,
    path: legacyPath,
  }
}

export function extractProfileImagePath(imageUrl: string | null | undefined) {
  return extractProfileImageReference(imageUrl)?.path ?? null
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

export async function removeProfileImageByReference(reference: StorageObjectReference | null | undefined) {
  if (!reference) return
  await removeStorageImageByPath(reference.bucket, reference.path)
}
