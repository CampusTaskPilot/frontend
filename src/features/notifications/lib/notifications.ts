import { supabase } from '../../../lib/supabase'
import type { NotificationFeed, NotificationItem } from '../types'

const NOTIFICATION_SELECT_COLUMNS =
  'id,type,title,body,href,entity_type,entity_id,data,is_read,read_at,created_at,updated_at'

function localizeNotificationTitle(title: string) {
  const acceptedMatch = title.match(/^(.*) application accepted$/)
  if (acceptedMatch) {
    return `${acceptedMatch[1]} 지원이 승인되었습니다`
  }

  const rejectedMatch = title.match(/^(.*) application rejected$/)
  if (rejectedMatch) {
    return `${rejectedMatch[1]} 지원이 거절되었습니다`
  }

  return title
}

function localizeNotificationBody(body: string | null) {
  if (!body) {
    return null
  }

  if (body === 'Your team application was accepted.') {
    return '팀 지원이 승인되었습니다.'
  }

  if (body === 'Your team application was rejected.') {
    return '팀 지원이 거절되었습니다.'
  }

  return body
}

function toNotificationItem(value: unknown): NotificationItem {
  const row = value as Record<string, unknown>
  const title = typeof row.title === 'string' ? row.title : ''
  const body = typeof row.body === 'string' ? row.body : null

  return {
    id: String(row.id ?? ''),
    type: String(row.type ?? ''),
    title: localizeNotificationTitle(title),
    body: localizeNotificationBody(body),
    href: typeof row.href === 'string' ? row.href : null,
    entity_type: typeof row.entity_type === 'string' ? row.entity_type : null,
    entity_id: typeof row.entity_id === 'string' ? row.entity_id : null,
    data: row.data && typeof row.data === 'object' ? (row.data as Record<string, unknown>) : null,
    is_read: Boolean(row.is_read),
    read_at: typeof row.read_at === 'string' ? row.read_at : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : new Date(0).toISOString(),
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : new Date(0).toISOString(),
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return fallback
}

export async function fetchNotifications(params: {
  userId: string
  unreadOnly?: boolean
  limit?: number
  offset?: number
}): Promise<NotificationFeed> {
  const safeLimit = Math.max(1, params.limit ?? 20)
  const safeOffset = Math.max(0, params.offset ?? 0)

  let listQuery = supabase
    .from('notifications')
    .select(NOTIFICATION_SELECT_COLUMNS)
    .eq('user_id', params.userId)
    .order('created_at', { ascending: false })
    .range(safeOffset, safeOffset + safeLimit)

  if (params.unreadOnly) {
    listQuery = listQuery.eq('is_read', false)
  }

  const [listResult, unreadCountResult] = await Promise.all([
    listQuery,
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', params.userId)
      .eq('is_read', false),
  ])

  if (listResult.error) {
    throw new Error(getErrorMessage(listResult.error, '알림 목록을 불러오지 못했습니다.'))
  }

  if (unreadCountResult.error) {
    throw new Error(getErrorMessage(unreadCountResult.error, '읽지 않은 알림 개수를 불러오지 못했습니다.'))
  }

  const items = ((listResult.data ?? []) as unknown[]).map(toNotificationItem)
  return {
    items: items.slice(0, safeLimit),
    unread_count: unreadCountResult.count ?? 0,
    has_more: items.length > safeLimit,
  }
}

export async function markNotificationRead(params: { notificationId: string; userId: string }) {
  const { data, error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', params.notificationId)
    .eq('user_id', params.userId)
    .select(NOTIFICATION_SELECT_COLUMNS)
    .maybeSingle()

  if (error) {
    throw new Error(getErrorMessage(error, '알림 읽음 처리에 실패했습니다.'))
  }

  if (!data) {
    throw new Error('알림을 찾을 수 없습니다.')
  }

  return toNotificationItem(data)
}

export async function markAllNotificationsRead(params: { userId: string }) {
  const { data, error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('user_id', params.userId)
    .eq('is_read', false)
    .select('id')

  if (error) {
    throw new Error(getErrorMessage(error, '알림 전체 읽음 처리에 실패했습니다.'))
  }

  return {
    updated_count: (data ?? []).length,
  }
}
