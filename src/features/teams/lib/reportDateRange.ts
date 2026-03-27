import type { ReportPeriodPreset } from '../types/team'

const KOREAN_WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'] as const

export interface DateRangeValue {
  startDate: string
  endDate: string
}

function toDateInputValue(value: Date) {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function fromDateInputValue(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

function startOfWeekMonday(today: Date) {
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diff = base.getDay() === 0 ? -6 : 1 - base.getDay()
  base.setDate(base.getDate() + diff)
  return base
}

export function getPresetDateRange(preset: Exclude<ReportPeriodPreset, 'custom'>, today = new Date()): DateRangeValue {
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const thisWeekStart = startOfWeekMonday(current)

  if (preset === 'this_week') {
    return {
      startDate: toDateInputValue(thisWeekStart),
      endDate: toDateInputValue(current),
    }
  }

  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)
  const lastWeekEnd = new Date(thisWeekStart)
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1)

  return {
    startDate: toDateInputValue(lastWeekStart),
    endDate: toDateInputValue(lastWeekEnd),
  }
}

export function formatDateRangeWithWeekday(startDate: string, endDate: string) {
  if (!startDate || !endDate) return ''
  return `${formatDateWithWeekday(startDate)} ~ ${formatDateWithWeekday(endDate)}`
}

export function formatDateWithWeekday(value: string) {
  const date = fromDateInputValue(value)
  const weekday = KOREAN_WEEKDAYS[date.getDay() === 0 ? 6 : date.getDay() - 1]
  return `${value}(${weekday})`
}

export function validateCustomDateRange(startDate: string, endDate: string) {
  if (!startDate || !endDate) {
    return '시작일과 종료일을 모두 선택해야 합니다.'
  }

  if (startDate > endDate) {
    return '시작일은 종료일보다 늦을 수 없습니다.'
  }

  return ''
}
