import type { NavigateFunction } from 'react-router-dom'
import type { NotificationItem } from '../types'
import { markNotificationReadAndSync } from './notificationStore'

interface OpenNotificationParams {
  item: NotificationItem
  userId: string
  navigate?: NavigateFunction
}

export async function openNotification({ item, userId, navigate }: OpenNotificationParams) {
  if (!item.is_read) {
    try {
      await markNotificationReadAndSync({
        notificationId: item.id,
        userId,
      })
    } catch (error) {
      console.error('Failed to mark notification as read', error)
    }
  }

  if (navigate && item.href) {
    navigate(item.href)
  }
}
