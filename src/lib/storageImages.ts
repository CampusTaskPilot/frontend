import { supabase } from './supabase'

const DEFAULT_IMAGE_EXTENSION = 'png'

export const DEFAULT_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024
export const DEFAULT_ALLOWED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp'])
export const DEFAULT_ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export interface StorageImageValidationOptions {
  allowedExtensions?: Set<string>
  allowedMimeTypes?: Set<string>
  maxSizeBytes?: number
  invalidTypeMessage?: string
  tooLargeMessage?: string
}

export interface CreateStorageImagePathOptions {
  root: string
  ownerId: string
  prefix: string
  fileName: string
  allowedExtensions?: Set<string>
  mimeType?: string
}

export interface UploadPublicStorageImageOptions {
  bucket: string
  path: string
  file: File
}

function extensionFromMimeType(mimeType: string) {
  switch (mimeType.toLowerCase()) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/gif':
      return 'gif'
    case 'image/avif':
      return 'avif'
    default:
      return ''
  }
}

export function getStorageImageExtension(
  fileName: string,
  mimeType = '',
  allowedExtensions = DEFAULT_ALLOWED_IMAGE_EXTENSIONS,
) {
  const normalized = fileName.trim().toLowerCase()
  const dotIndex = normalized.lastIndexOf('.')
  const extension = dotIndex >= 0 ? normalized.slice(dotIndex + 1) : ''
  const mimeExtension = extensionFromMimeType(mimeType)
  const resolvedExtension = extension || mimeExtension || DEFAULT_IMAGE_EXTENSION

  return allowedExtensions.has(resolvedExtension) ? resolvedExtension : DEFAULT_IMAGE_EXTENSION
}

export function sanitizeStorageImageName(fileName: string) {
  return fileName
    .trim()
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function createStorageImageFileName({
  fileName,
  prefix,
  allowedExtensions = DEFAULT_ALLOWED_IMAGE_EXTENSIONS,
  mimeType = '',
}: {
  fileName: string
  prefix: string
  allowedExtensions?: Set<string>
  mimeType?: string
}) {
  const extension = getStorageImageExtension(fileName, mimeType, allowedExtensions)
  const safeName = sanitizeStorageImageName(fileName) || prefix
  const uniqueId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

  return `${Date.now()}-${uniqueId}-${safeName}.${extension}`
}

export function createStorageImagePath({
  root,
  ownerId,
  prefix,
  fileName,
  allowedExtensions,
  mimeType,
}: CreateStorageImagePathOptions) {
  return `${root}/${ownerId}/${createStorageImageFileName({ fileName, prefix, allowedExtensions, mimeType })}`
}

export function extractPublicStoragePath(
  imageUrl: string | null | undefined,
  bucket: string,
  allowedRoots: string[],
) {
  if (!imageUrl) return null

  const marker = `/object/public/${bucket}/`
  const trimmed = imageUrl.trim()
  const markerIndex = trimmed.indexOf(marker)

  if (markerIndex < 0) {
    const normalized = trimmed.replace(/^\/+/, '')
    return allowedRoots.some((root) => normalized.startsWith(`${root}/`)) ? normalized : null
  }

  const pathWithQuery = trimmed.slice(markerIndex + marker.length)
  const queryIndex = pathWithQuery.indexOf('?')
  const path = queryIndex >= 0 ? pathWithQuery.slice(0, queryIndex) : pathWithQuery

  return allowedRoots.some((root) => path.startsWith(`${root}/`)) ? path : null
}

export function validateStorageImageFile(file: File, options: StorageImageValidationOptions = {}) {
  const {
    allowedExtensions = DEFAULT_ALLOWED_IMAGE_EXTENSIONS,
    allowedMimeTypes = DEFAULT_ALLOWED_IMAGE_MIME_TYPES,
    maxSizeBytes = DEFAULT_IMAGE_MAX_SIZE_BYTES,
    invalidTypeMessage = 'Only JPG, PNG, and WEBP image files can be uploaded.',
    tooLargeMessage = 'Images must be 5 MB or smaller.',
  } = options
  const extension = getStorageImageExtension(file.name, file.type, allowedExtensions)
  const normalizedName = file.name.trim().toLowerCase()
  const dotIndex = normalizedName.lastIndexOf('.')
  const rawExtension = dotIndex >= 0 ? normalizedName.slice(dotIndex + 1) : ''
  const hasSupportedExtension = rawExtension ? allowedExtensions.has(rawExtension) : allowedExtensions.has(extension)
  const hasSupportedMimeType = file.type ? allowedMimeTypes.has(file.type.toLowerCase()) : true

  if ((file.type && !file.type.startsWith('image/')) || !hasSupportedExtension || !hasSupportedMimeType) {
    return invalidTypeMessage
  }

  if (file.size > maxSizeBytes) {
    return tooLargeMessage
  }

  return ''
}

export function getPublicStorageImageUrl(bucket: string, path: string) {
  const publicUrlResult = supabase.storage.from(bucket).getPublicUrl(path)
  return `${publicUrlResult.data.publicUrl}?v=${Date.now()}`
}

export async function uploadPublicStorageImage({ bucket, path, file }: UploadPublicStorageImageOptions) {
  const uploadResult = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (uploadResult.error) {
    throw uploadResult.error
  }

  return {
    path,
    publicUrl: getPublicStorageImageUrl(bucket, path),
  }
}

export async function removeStorageImageByPath(bucket: string, path: string | null | undefined) {
  if (!path) return

  const result = await supabase.storage.from(bucket).remove([path])

  if (result.error) {
    throw result.error
  }
}
