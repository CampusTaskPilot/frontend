import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/context/useAuth'
import {
  getCachedNotificationFeed,
  getNotificationFeed,
  markAllNotificationsReadAndSync,
  markNotificationReadAndSync,
  subscribeNotificationRealtime,
  subscribeNotificationStore,
} from '../lib/notificationStore'
import type { NotificationItem } from '../types'

const RECENT_LIMIT = 5

function formatRelativeTime(value: string) {
  const formatter = new Intl.RelativeTimeFormat('ko-KR', { numeric: 'auto' })
  const createdAt = new Date(value).getTime()
  const diffSeconds = Math.round((createdAt - Date.now()) / 1000)

  if (Math.abs(diffSeconds) < 60) {
    return formatter.format(diffSeconds, 'second')
  }

  const diffMinutes = Math.round(diffSeconds / 60)
  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, 'minute')
  }

  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, 'hour')
  }

  return formatter.format(Math.round(diffHours / 24), 'day')
}

export function NotificationBell() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!user) {
      setItems([])
      setUnreadCount(0)
      return
    }

    let isMounted = true

    const syncFromCache = () => {
      const cached = getCachedNotificationFeed({ userId: user.id, limit: RECENT_LIMIT, offset: 0 })
      if (!cached || !isMounted) {
        return
      }
      setItems(cached.items)
      setUnreadCount(cached.unread_count)
    }

    const load = async (options: { force?: boolean; staleMs?: number } = {}) => {
      syncFromCache()
      setIsLoading(true)
      try {
        const response = await getNotificationFeed(
          {
            userId: user.id,
            limit: RECENT_LIMIT,
            offset: 0,
          },
          options,
        )
        if (!isMounted) {
          return
        }
        setItems(response.items)
        setUnreadCount(response.unread_count)
      } catch (error) {
        if (isMounted) {
          console.error('Failed to load notifications', error)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    syncFromCache()
    void load({ staleMs: 20_000 })

    const unsubscribe = subscribeNotificationStore(syncFromCache)
    const unsubscribeRealtime = subscribeNotificationRealtime({
      userId: user.id,
      onChange: () => {
        void load({ force: true, staleMs: 0 })
      },
    })

    const handleFocus = () => {
      void load({ staleMs: 10_000 })
    }

    window.addEventListener('focus', handleFocus)
    return () => {
      isMounted = false
      unsubscribe()
      unsubscribeRealtime()
      window.removeEventListener('focus', handleFocus)
    }
  }, [user])

  useEffect(() => {
    if (!isOpen || !user) {
      return
    }

    void getNotificationFeed(
      {
        userId: user.id,
        limit: RECENT_LIMIT,
        offset: 0,
      },
      { staleMs: 5_000 },
    )
  }, [isOpen, user])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isOpen])

  if (!user) {
    return null
  }

  const currentUserId = user.id

  async function handleOpenNotification(item: NotificationItem) {
    if (!item.is_read) {
      try {
        await markNotificationReadAndSync({
          notificationId: item.id,
          userId: currentUserId,
        })
      } catch (error) {
        console.error('Failed to mark notification as read', error)
      }
    }

    setIsOpen(false)
    navigate(item.href || '/notifications')
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsReadAndSync({ userId: currentUserId })
    } catch (error) {
      console.error('Failed to mark all notifications as read', error)
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label="알림 열기"
        onClick={() => setIsOpen((current) => !current)}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-campus-200 bg-white/94 text-campus-700 transition hover:border-campus-300 hover:bg-campus-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
      >
        <Bell aria-hidden="true" className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-full z-50 mt-3 w-[22rem] rounded-[1.6rem] border border-campus-200 bg-white p-3 shadow-[0_18px_40px_rgba(26,34,51,0.16)]">
          <div className="flex items-center justify-between gap-3 border-b border-campus-100 px-2 pb-3">
            <div>
              <p className="text-sm font-semibold text-campus-900">알림</p>
              <p className="text-xs text-campus-500">읽지 않은 알림 {unreadCount}건</p>
            </div>
            <button
              type="button"
              onClick={() => void handleMarkAllRead()}
              className="text-xs font-medium text-brand-600 transition hover:text-brand-700"
            >
              모두 읽음 처리
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {isLoading ? (
              <div className="rounded-[1rem] border border-campus-200 bg-campus-50 px-3 py-4 text-sm text-campus-600">
                알림을 불러오는 중…
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-[1rem] border border-campus-200 bg-campus-50 px-3 py-4 text-sm text-campus-600">
                아직 도착한 알림이 없습니다.
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void handleOpenNotification(item)}
                  className={[
                    'block w-full rounded-[1rem] border px-3 py-3 text-left transition',
                    item.is_read
                      ? 'border-campus-100 bg-white text-campus-700 hover:bg-campus-50'
                      : 'border-brand-100 bg-brand-50/70 text-campus-900 hover:bg-brand-50',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{item.title}</p>
                      {item.body ? <p className="mt-1 line-clamp-2 text-sm leading-6 text-campus-600">{item.body}</p> : null}
                    </div>
                    <span className="shrink-0 text-xs text-campus-500">{formatRelativeTime(item.created_at)}</span>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="mt-3 border-t border-campus-100 pt-3 text-right">
            <Link to="/notifications" onClick={() => setIsOpen(false)} className="text-sm font-medium text-brand-600 transition hover:text-brand-700">
              전체 알림 보기
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
