import type { TeamSummary } from '../types/team'

export const mockTeams: TeamSummary[] = [
  {
    id: 'alpha',
    name: '캠퍼스메이트 3팀',
    mission: '학생 커뮤니티 일정 공유 앱 MVP 완성',
    status: 'Active',
    velocity: 32,
    lastUpdated: '2026-03-15',
    members: [
      { id: '1', name: '김유진', role: 'PM', availability: 'Focus' },
      { id: '2', name: '박준호', role: 'UI/UX', availability: 'Focus' },
      { id: '3', name: '최민서', role: 'Frontend', availability: 'At capacity' },
    ],
  },
  {
    id: 'beta',
    name: '캡스톤 IoT 1팀',
    mission: '강의실 환경 모니터링 대시보드 구축',
    status: 'Active',
    velocity: 27,
    lastUpdated: '2026-03-13',
    members: [
      { id: '4', name: '정하늘', role: 'Backend', availability: 'Focus' },
      { id: '5', name: '오세진', role: 'Hardware', availability: 'Out' },
    ],
  },
  {
    id: 'gamma',
    name: '스터디 매칭 5팀',
    mission: '전공 스터디 자동 매칭 서비스 기획',
    status: 'Paused',
    velocity: 14,
    lastUpdated: '2026-03-04',
    members: [
      { id: '6', name: '이서윤', role: '기획', availability: 'Focus' },
      { id: '7', name: '한도윤', role: '데이터', availability: 'At capacity' },
    ],
  },
]
