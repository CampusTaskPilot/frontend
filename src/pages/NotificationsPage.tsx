import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useAuth } from '../features/auth/context/useAuth'
import {
  getCachedNotificationFeed,
  getNotificationFeed,
  markAllNotificationsReadAndSync,
  markNotificationReadAndSync,
  subscribeNotificationRealtime,
  subscribeNotificationStore,
} from '../features/notifications/lib/notificationStore'
import type { NotificationItem } from '../features/notifications/types'

type NotificationFilter = 'all' | 'unread'

const PAGE_SIZE = 25

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [filter, setFilter] = useState<NotificationFilter>('all')
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    setPage(0)
  }, [filter])

  useEffect(() => {
    if (!user) {
      return
    }

    let isMounted = true
    const offset = page * PAGE_SIZE

    const syncFromCache = () => {
      const cached = getCachedNotificationFeed({
        userId: user.id,
        unreadOnly: filter === 'unread',
        limit: PAGE_SIZE,
        offset,
      })
      if (!cached || !isMounted) {
        return
      }

      if (page === 0) {
        setItems(cached.items)
      } else {
        setItems((current) => {
          const merged = [...current]
          for (const item of cached.items) {
            if (!merged.some((entry) => entry.id === item.id)) {
              merged.push(item)
            }
          }
          return merged
        })
      }

      setUnreadCount(cached.unread_count)
      setHasMore(cached.has_more)
    }

    const load = async () => {
      if (page === 0) {
        setIsLoading(true)
      } else {
        setIsLoadingMore(true)
      }
      setErrorMessage('')
      syncFromCache()
      try {
        const response = await getNotificationFeed(
          {
            userId: user.id,
            unreadOnly: filter === 'unread',
            limit: PAGE_SIZE,
            offset,
          },
          {
            staleMs: 20_000,
          },
        )
        if (!isMounted) {
          return
        }

        setUnreadCount(response.unread_count)
        setHasMore(response.has_more)
        setItems((current) => {
          if (page === 0) {
            return response.items
          }

          const existingIds = new Set(current.map((item) => item.id))
          return [...current, ...response.items.filter((item) => !existingIds.has(item.id))]
        })
      } catch (error) {
        if (!isMounted) {
          return
        }
        console.error('Failed to load notifications', error)
        setErrorMessage(error instanceof Error ? error.message : '알림을 불러오지 못했습니다.')
      } finally {
        if (isMounted) {
          setIsLoading(false)
          setIsLoadingMore(false)
        }
      }
    }

    const unsubscribe = subscribeNotificationStore(syncFromCache)
    const unsubscribeRealtime = subscribeNotificationRealtime({
      userId: user.id,
      onChange: () => {
        void load()
      },
    })
    void load()

    return () => {
      isMounted = false
      unsubscribe()
      unsubscribeRealtime()
    }
  }, [filter, page, user])

  if (!user) {
    return null
  }

  const currentUserId = user.id

  async function handleMarkRead(item: NotificationItem) {
    if (item.is_read) {
      navigate(item.href || '/notifications')
      return
    }

    try {
      await markNotificationReadAndSync({
        notificationId: item.id,
        userId: currentUserId,
      })
      navigate(item.href || '/notifications')
    } catch (error) {
      console.error('Failed to mark notification as read', error)
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsReadAndSync({ userId: currentUserId })
    } catch (error) {
      console.error('Failed to mark all notifications as read', error)
    }
  }

  return (
    <section className="page-shell space-y-4">
      <Card className="space-y-4 bg-[radial-gradient(circle_at_top_left,rgba(77,125,255,0.12),transparent_42%),linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">알림</p>
            <h1 className="font-display text-3xl text-campus-900">알림 센터</h1>
            <p className="max-w-2xl text-sm leading-6 text-campus-600">
              팀 신청과 상태 변경 같은 최근 인앱 알림을 모아 보고 읽음 상태를 관리할 수 있습니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="neutral">읽지 않음 {unreadCount}건</Badge>
            <Button type="button" variant="ghost" onClick={() => void handleMarkAllRead()}>
              모두 읽음 처리
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="button" variant={filter === 'all' ? 'primary' : 'ghost'} size="sm" onClick={() => setFilter('all')}>
            전체
          </Button>
          <Button
            type="button"
            variant={filter === 'unread' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('unread')}
          >
            읽지 않음
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <Card>
          <p className="text-sm text-campus-600">알림을 불러오는 중…</p>
        </Card>
      ) : errorMessage ? (
        <Card className="border-rose-200 bg-rose-50">
          <p className="text-sm text-rose-700">{errorMessage}</p>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <p className="text-sm font-medium text-campus-900">표시할 알림이 없습니다.</p>
          <p className="mt-2 text-sm leading-6 text-campus-600">
            팀 신청이나 상태 변경이 생기면 이 페이지에서 가장 먼저 확인할 수 있습니다.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card
              key={item.id}
              className={[
                'space-y-3 transition',
                item.is_read ? 'border-campus-200 bg-white' : 'border-brand-100 bg-brand-50/60',
              ].join(' ')}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-campus-900">{item.title}</h2>
                    {!item.is_read ? <Badge variant="success">읽지 않음</Badge> : <Badge variant="neutral">읽음</Badge>}
                  </div>
                  {item.body ? <p className="text-sm leading-6 text-campus-700">{item.body}</p> : null}
                  <p className="text-xs text-campus-500">{formatDateTime(item.created_at)}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {!item.is_read ? (
                    <Button type="button" variant="ghost" size="sm" onClick={() => void handleMarkRead(item)}>
                      읽고 이동
                    </Button>
                  ) : null}
                  <Button type="button" size="sm" onClick={() => navigate(item.href || '/notifications')}>
                    보기
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {hasMore ? (
            <div className="flex justify-center pt-2">
              <Button type="button" variant="ghost" onClick={() => setPage((current) => current + 1)} disabled={isLoadingMore}>
                {isLoadingMore ? '알림 더 불러오는 중…' : '알림 더 보기'}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}
