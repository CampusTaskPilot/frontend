import type { TeamCalendarItem, TeamTaskItem } from '../types/team'

export function getMockTasks(teamId: string): TeamTaskItem[] {
  return [
    { id: `${teamId}-task-1`, title: '기획서 최신화', assignee: '팀장', status: 'doing' },
    { id: `${teamId}-task-2`, title: '화면 초안 리뷰', assignee: '디자이너', status: 'todo' },
    { id: `${teamId}-task-3`, title: 'API 명세 정리', assignee: '백엔드', status: 'done' },
  ]
}

export function getMockCalendar(teamId: string): TeamCalendarItem[] {
  return [
    { id: `${teamId}-calendar-1`, date: '2026-03-21', title: '주간 스탠드업' },
    { id: `${teamId}-calendar-2`, date: '2026-03-24', title: '중간 점검 미팅' },
    { id: `${teamId}-calendar-3`, date: '2026-03-28', title: '데모 발표 리허설' },
  ]
}
