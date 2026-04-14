export interface NotificationItem {
  id: string
  type: string
  title: string
  body: string | null
  href: string | null
  entity_type: string | null
  entity_id: string | null
  data: Record<string, unknown> | null
  is_read: boolean
  read_at: string | null
  created_at: string
  updated_at: string
}

export interface NotificationFeed {
  items: NotificationItem[]
  unread_count: number
  has_more: boolean
}
