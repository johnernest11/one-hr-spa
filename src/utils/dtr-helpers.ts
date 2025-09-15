import { TimeLogResponse } from '@/typings/models.types.ts'

/**
 * Converts a date string into a formatted 12-hour time string.
 * Example: "2025-09-09T08:30:00" → "8:30 AM"
 */
export const formatDTRTime = (dateString: string | undefined): string => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Formats a date string into a short day-month format (e.g., "1-Feb").
 */
export const getFormattedDTRDate = (dateString: string): string => {
  if (!dateString) return ''

  const date = new Date(dateString)
  const formatted = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(date)
  return formatted.replace(' ', '-')
}

/**
 * Returns the short weekday name (e.g., "Mon", "Tue") for a given date string.
 */
export const getDTRDayOfWeek = (dateString: string): string => {
  if (!dateString) return ''

  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

/**
 * Combines date and time strings into an ISO 8601 timestamp string.
 */
export const toTimestamp = (date: string, time: string) => `${date}T${time}`

/**
 * Processes raw DTR (Daily Time Record) entries and resolves them into structured
 * time slots: in1, out1, in2, and out2.
 *
 * The slots are determined based on the following rules:
 * - `in1`: First clock-in between 6:00 AM – 12:00 PM
 * - `out1`: First clock-out between 12:00 PM – 1:00 PM
 * - `in2`: First clock-in between 12:00 PM – 2:00 PM, at least 15 minutes after `out1`
 * - `out2`: First clock-out after 2:00 PM
 *
 * @param entries - Array of TimeLogResponse objects
 * @returns An object containing the resolved time slots
 */
export const resolveDTRSlots = (entries: TimeLogResponse[] = []) => {
  const inLogs = entries
    .filter((e) => e.is_in)
    .sort(
      (a, b) => new Date(toTimestamp(a.date, a.scanned_time)).getTime() - new Date(toTimestamp(b.date, b.scanned_time)).getTime()
    )

  const outLogs = entries
    .filter((e) => !e.is_in)
    .sort(
      (a, b) => new Date(toTimestamp(a.date, a.scanned_time)).getTime() - new Date(toTimestamp(b.date, b.scanned_time)).getTime()
    )

  const slots = { in1: '', out1: '', in2: '', out2: '' }

  const isBetween = (timestamp: string, startHour: number, endHour: number) => {
    const hours = new Date(timestamp).getHours()
    return hours >= startHour && hours < endHour
  }

  const in1Candidate = inLogs.find((e) => isBetween(toTimestamp(e.date, e.scanned_time), 6, 12))
  if (in1Candidate) slots.in1 = toTimestamp(in1Candidate.date, in1Candidate.scanned_time)

  const out1Candidate = outLogs.find((e) => isBetween(toTimestamp(e.date, e.scanned_time), 12, 13))
  if (out1Candidate) slots.out1 = toTimestamp(out1Candidate.date, out1Candidate.scanned_time)

  if (slots.out1) {
    const out1Time = new Date(slots.out1).getTime()
    const in2Candidates = inLogs.filter((e) => {
      const timestamp = toTimestamp(e.date, e.scanned_time)
      const time = new Date(timestamp).getTime()
      return isBetween(timestamp, 12, 14) && time >= out1Time + 15 * 60 * 1000
    })
    if (in2Candidates.length) slots.in2 = toTimestamp(in2Candidates[0].date, in2Candidates[0].scanned_time)
  } else {
    const in2Candidate = inLogs.find((e) => isBetween(toTimestamp(e.date, e.scanned_time), 12, 14))
    if (in2Candidate) slots.in2 = toTimestamp(in2Candidate.date, in2Candidate.scanned_time)
  }

  const out2Candidate = outLogs.find((e) => new Date(toTimestamp(e.date, e.scanned_time)).getHours() >= 14)
  if (out2Candidate) slots.out2 = toTimestamp(out2Candidate.date, out2Candidate.scanned_time)

  return slots
}

/**
 * Calculates total worked hours based on resolved DTR slots.
 * The calculation considers:
 * - Morning and afternoon sessions separately
 * - Lunch break from 12:00–13:00
 * - Minimum start times: 7:00 AM weekdays, 8:00 AM weekends
 * - Maximum end time for weekends: 5:00 PM
 */
export const computeWorkedHours = (timeLog: TimeLogResponse[]): number => {
  const { in1, out1, in2, out2 } = resolveDTRSlots(timeLog ?? [])
  if (!in1 || !out1) return 0

  const toDate = (t: string) => new Date(t)

  let amStart = toDate(in1)
  let amEnd = toDate(out1)

  const isWeekend = [0, 6].includes(amStart.getDay())
  const minStartHour = isWeekend ? 8 : 7
  const minStart = new Date(amStart)
  minStart.setHours(minStartHour, 0, 0, 0)
  if (amStart < minStart) amStart = new Date(minStart.getTime())

  if (isWeekend) {
    const maxEnd = new Date(amEnd)
    maxEnd.setHours(17, 0, 0, 0)
    if (amEnd > maxEnd) amEnd = maxEnd
  }

  const lunchStart = new Date(amEnd)
  lunchStart.setHours(12, 0, 0, 0)
  const lunchEnd = new Date(amEnd)
  lunchEnd.setHours(13, 0, 0, 0)

  let adjustedAmEnd = amEnd
  if (amEnd > lunchStart) {
    const overlap = Math.min(amEnd.getTime(), lunchEnd.getTime()) - lunchStart.getTime()
    adjustedAmEnd = new Date(amEnd.getTime() - Math.max(overlap, 0))
  }

  const morningHours = (adjustedAmEnd.getTime() - amStart.getTime()) / 36e5

  let afternoonHours = 0
  if (in2 && out2) {
    let pmStart = toDate(in2)
    let pmEnd = toDate(out2)
    if (pmStart < lunchEnd) pmStart = new Date(lunchEnd.getTime())
    if (pmEnd < pmStart) pmEnd = new Date(pmStart.getTime())

    if (isWeekend && pmStart < minStart) pmStart = new Date(minStart.getTime())
    if (isWeekend) {
      const maxEnd = new Date(pmEnd)
      maxEnd.setHours(17, 0, 0, 0)
      if (pmEnd > maxEnd) pmEnd = maxEnd
    }

    afternoonHours = (pmEnd.getTime() - pmStart.getTime()) / 36e5
  }

  const totalHours = morningHours + afternoonHours

  return +(totalHours > 0 ? totalHours : 0).toFixed(2)
}

/**
 * Determines if a given date string falls on a weekend (Saturday or Sunday).
 */
export const isWeekend = (dateStr: string): boolean => {
  const day = new Date(dateStr).getDay()
  return day === 0 || day === 6
}

/**
 * Computes undertime (UT) based on worked hours.
 * - Weekends always return 0
 * - Weekdays: if worked < 8 hours, returns the difference
 */
export const computeUT = (worked: number, weekend = false): number => {
  if (weekend) return 0
  return worked < 8 ? parseFloat((8 - worked).toFixed(2)) : 0
}

/**
 * Computes overtime (OT) based on worked hours.
 * - Weekends: all hours count as OT
 * - Weekdays: only hours beyond 8 hrs count as OT
 */
export const computeOT = (worked: number, weekend = false): number => {
  if (weekend) return parseFloat(worked.toFixed(2))
  return worked > 8 ? parseFloat((worked - 8).toFixed(2)) : 0
}

// dtr-helpers.ts
export const collapseDtrByMonth = (dtrs: { date: string }[]) => {
  if (!dtrs.length) return []

  const grouped: Record<string, { month: string; records: typeof dtrs }> = {}

  dtrs.forEach((dtr) => {
    const d = new Date(dtr.date)
    const year = d.getFullYear()
    const month = d.getMonth()
    const key = `${year}-${month}`

    if (!grouped[key]) {
      grouped[key] = {
        month: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        records: [],
      }
    }
    grouped[key].records.push(dtr)
  })

  return Object.values(grouped)
}
