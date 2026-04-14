import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from './notifications'
import type { NotificationFeed } from '../types'

interface NotificationFeedParams {
  accessToken: string
  unreadOnly?: boolean
  limit?: number
  offset?: number
}

type NotificationFeedCacheKeyParams = Omit<NotificationFeedParams, 'accessToken'>

interface CacheEntry {
  data: NotificationFeed
  fetchedAt: number
}

type Listener = () => void

const feedCache = new Map<string, CacheEntry>()
const inFlightRequests = new Map<string, Promise<NotificationFeed>>()
const listeners = new Set<Listener>()

function buildKey(params: NotificationFeedCacheKeyParams) {
  return JSON.stringify({
    unreadOnly: Boolean(params.unreadOnly),
    limit: params.limit ?? 20,
    offset: params.offset ?? 0,
  })
}

function notifyListeners() {
  listeners.forEach((listener) => listener())
}

function updateCachedFeeds(
  updater: (current: NotificationFeed) => NotificationFeed,
) {
  for (const [key, entry] of feedCache.entries()) {
    feedCache.set(key, {
      ...entry,
      data: updater(entry.data),
      fetchedAt: Date.now(),
    })
  }
  notifyListeners()
}

export function subscribeNotificationStore(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getCachedNotificationFeed(params: NotificationFeedCacheKeyParams) {
  return feedCache.get(buildKey(params))?.data ?? null
}

export async function getNotificationFeed(
  params: NotificationFeedParams,
  options: { force?: boolean; staleMs?: number } = {},
) {
  const key = buildKey(params)
  const staleMs = options.staleMs ?? 15_000
  const cached = feedCache.get(key)
  const isFresh = cached && Date.now() - cached.fetchedAt <= staleMs

  if (!options.force && isFresh) {
    return cached.data
  }

  const existingRequest = inFlightRequests.get(key)
  if (existingRequest) {
    return existingRequest
  }

  const request = fetchNotifications(params)
    .then((response) => {
      feedCache.set(key, {
        data: response,
        fetchedAt: Date.now(),
      })
      notifyListeners()
      return response
    })
    .finally(() => {
      inFlightRequests.delete(key)
    })

  inFlightRequests.set(key, request)
  return request
}

export async function markNotificationReadAndSync(params: {
  notificationId: string
  accessToken: string
}) {
  const updated = await markNotificationRead(params)
  updateCachedFeeds((current) => {
    let unreadDelta = 0
    const items = current.items.map((item) => {
      if (item.id !== updated.id || item.is_read) {
        return item
      }

      unreadDelta = 1
      return {
        ...item,
        is_read: updated.is_read,
        read_at: updated.read_at,
        updated_at: updated.updated_at,
      }
    })

    return {
      ...current,
      items,
      unread_count: Math.max(0, current.unread_count - unreadDelta),
    }
  })
  return updated
}

export async function markAllNotificationsReadAndSync(params: {
  accessToken: string
}) {
  const result = await markAllNotificationsRead(params)
  updateCachedFeeds((current) => ({
    ...current,
    items: current.items.map((item) => ({
      ...item,
      is_read: true,
      read_at: item.read_at ?? new Date().toISOString(),
    })),
    unread_count: 0,
  }))
  return result
}
