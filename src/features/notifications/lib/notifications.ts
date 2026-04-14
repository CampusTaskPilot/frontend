import { apiFetch } from '../../../lib/api'
import type { NotificationFeed, NotificationItem } from '../types'

interface NotificationListResponse extends NotificationFeed {}

interface UnreadCountResponse {
  unread_count: number
}

interface MarkAllReadResponse {
  updated_count: number
}

export function fetchNotifications(params: {
  accessToken: string
  unreadOnly?: boolean
  limit?: number
  offset?: number
}) {
  const search = new URLSearchParams()
  if (params.unreadOnly) {
    search.set('unread_only', 'true')
  }
  if (params.limit) {
    search.set('limit', String(params.limit))
  }
  if (params.offset) {
    search.set('offset', String(params.offset))
  }

  return apiFetch<NotificationListResponse>(`/notifications?${search.toString()}`, {
    method: 'GET',
    accessToken: params.accessToken,
  })
}

export function fetchUnreadNotificationCount(params: { accessToken: string }) {
  return apiFetch<UnreadCountResponse>('/notifications/unread-count', {
    method: 'GET',
    accessToken: params.accessToken,
  })
}

export function markNotificationRead(params: { notificationId: string; accessToken: string }) {
  return apiFetch<NotificationItem>(`/notifications/${params.notificationId}/read`, {
    method: 'POST',
    accessToken: params.accessToken,
  })
}

export function markAllNotificationsRead(params: { accessToken: string }) {
  return apiFetch<MarkAllReadResponse>('/notifications/read-all', {
    method: 'POST',
    accessToken: params.accessToken,
  })
}
