import { supabase } from '../../../lib/supabase'
import type { DashboardHomeData } from '../types'

const emptyDashboardHome: DashboardHomeData = {
  visibleAssignedTasks: [],
  activeTaskCount: 0,
  upcomingSchedule: [],
  sidebarTeams: {
    managedTeams: [],
    joinedTeams: [],
  },
  workSummary: {
    inProgressCount: 0,
    dueTodayCount: 0,
    highPriorityCount: 0,
    incompleteTodoCount: 0,
  },
  meta: {
    generatedAt: '',
    today: '',
    limits: {
      visibleAssignedTasks: 6,
      upcomingSchedule: 5,
      sidebarTeamsPerRole: 8,
    },
  },
}

function normalizeDashboardHome(value: unknown): DashboardHomeData {
  if (!value || typeof value !== 'object') {
    return emptyDashboardHome
  }

  const payload = value as Partial<DashboardHomeData>

  return {
    visibleAssignedTasks: Array.isArray(payload.visibleAssignedTasks) ? payload.visibleAssignedTasks : [],
    activeTaskCount: typeof payload.activeTaskCount === 'number' ? payload.activeTaskCount : 0,
    upcomingSchedule: Array.isArray(payload.upcomingSchedule) ? payload.upcomingSchedule : [],
    sidebarTeams: {
      managedTeams: Array.isArray(payload.sidebarTeams?.managedTeams)
        ? payload.sidebarTeams.managedTeams
        : [],
      joinedTeams: Array.isArray(payload.sidebarTeams?.joinedTeams) ? payload.sidebarTeams.joinedTeams : [],
    },
    workSummary: {
      inProgressCount:
        typeof payload.workSummary?.inProgressCount === 'number' ? payload.workSummary.inProgressCount : 0,
      dueTodayCount: typeof payload.workSummary?.dueTodayCount === 'number' ? payload.workSummary.dueTodayCount : 0,
      highPriorityCount:
        typeof payload.workSummary?.highPriorityCount === 'number' ? payload.workSummary.highPriorityCount : 0,
      incompleteTodoCount:
        typeof payload.workSummary?.incompleteTodoCount === 'number'
          ? payload.workSummary.incompleteTodoCount
          : 0,
    },
    meta: {
      generatedAt: typeof payload.meta?.generatedAt === 'string' ? payload.meta.generatedAt : '',
      today: typeof payload.meta?.today === 'string' ? payload.meta.today : '',
      limits: {
        visibleAssignedTasks:
          typeof payload.meta?.limits?.visibleAssignedTasks === 'number'
            ? payload.meta.limits.visibleAssignedTasks
            : 6,
        upcomingSchedule:
          typeof payload.meta?.limits?.upcomingSchedule === 'number' ? payload.meta.limits.upcomingSchedule : 5,
        sidebarTeamsPerRole:
          typeof payload.meta?.limits?.sidebarTeamsPerRole === 'number'
            ? payload.meta.limits.sidebarTeamsPerRole
            : 8,
      },
    },
  }
}

export async function fetchDashboardHome(): Promise<DashboardHomeData> {
  const { data, error } = await supabase.rpc('get_dashboard_home')

  if (error) {
    throw error
  }

  return normalizeDashboardHome(data)
}
