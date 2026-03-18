export type TeamStatus = 'Active' | 'Paused'

export interface TeamMember {
  id: string
  name: string
  role: string
  availability: 'Focus' | 'At capacity' | 'Out'
}

export interface TeamSummary {
  id: string
  name: string
  mission: string
  members: TeamMember[]
  status: TeamStatus
  velocity: number
  lastUpdated: string
}
