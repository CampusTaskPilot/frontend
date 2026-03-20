import { supabase } from '../../../lib/supabase'
import type {
  TeamCalendarEventRecord,
  TeamCalendarEventType,
  TeamCalendarEventUpsertInput,
} from '../types/team'

function toCalendarEventType(value: unknown): TeamCalendarEventType {
  if (value === 'meeting' || value === 'deadline' || value === 'presentation') {
    return value
  }

  return 'general'
}

function toCalendarEventRecord(value: unknown): TeamCalendarEventRecord {
  const row = value as Record<string, unknown>

  return {
    id: String(row.id ?? ''),
    team_id: String(row.team_id ?? ''),
    title: String(row.title ?? ''),
    description: typeof row.description === 'string' ? row.description : null,
    type: toCalendarEventType(row.type),
    event_date: typeof row.event_date === 'string' ? row.event_date : '',
    start_time: typeof row.start_time === 'string' ? row.start_time : null,
    end_time: typeof row.end_time === 'string' ? row.end_time : null,
    is_all_day: Boolean(row.is_all_day),
    created_by: String(row.created_by ?? ''),
    created_at: typeof row.created_at === 'string' ? row.created_at : '',
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : '',
  }
}

const calendarEventColumns =
  'id,team_id,title,description,type,event_date,start_time,end_time,is_all_day,created_by,created_at,updated_at'

export async function fetchTeamCalendarEvents(teamId: string): Promise<TeamCalendarEventRecord[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select(calendarEventColumns)
    .eq('team_id', teamId)
    .order('event_date', { ascending: true })
    .order('is_all_day', { ascending: false })
    .order('start_time', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return ((data ?? []) as unknown[]).map(toCalendarEventRecord)
}

export async function createCalendarEvent(params: {
  teamId: string
  createdBy: string
  values: TeamCalendarEventUpsertInput
}): Promise<TeamCalendarEventRecord> {
  const { teamId, createdBy, values } = params

  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      team_id: teamId,
      created_by: createdBy,
      title: values.title.trim(),
      description: values.description,
      type: values.type,
      event_date: values.event_date,
      is_all_day: values.is_all_day,
      start_time: values.start_time,
      end_time: values.end_time,
    })
    .select(calendarEventColumns)
    .single()

  if (error) {
    throw error
  }

  return toCalendarEventRecord(data)
}

export async function updateCalendarEvent(params: {
  eventId: string
  values: TeamCalendarEventUpsertInput
}): Promise<TeamCalendarEventRecord> {
  const { eventId, values } = params

  const { data, error } = await supabase
    .from('calendar_events')
    .update({
      title: values.title.trim(),
      description: values.description,
      type: values.type,
      event_date: values.event_date,
      is_all_day: values.is_all_day,
      start_time: values.start_time,
      end_time: values.end_time,
    })
    .eq('id', eventId)
    .select(calendarEventColumns)
    .single()

  if (error) {
    throw error
  }

  return toCalendarEventRecord(data)
}
