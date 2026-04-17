export const STORAGE_BUCKETS = {
  teamImages: 'team-images',
  profileImages: 'profile-images',
} as const

export const LEGACY_STORAGE_ROOTS = {
  teamImages: 'teams',
  profileImages: 'profiles',
} as const

export type StorageBucketName = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS]

export interface StorageObjectReference {
  bucket: StorageBucketName
  path: string
}
