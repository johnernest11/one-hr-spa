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
export const getFormattedDTRDate = (dateValue: string | Date | null | undefined): string => {
  if (!dateValue) return ''

  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue
  if (isNaN(date.getTime())) return ''

  const formatted = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(date)

  return formatted.replace(' ', '-')
}

/**
 * Returns the short weekday name (e.g., "Mon", "Tue") for a given date string.
 */
export const getDTRDayOfWeek = (dateValue: string | Date | null | undefined): string => {
  if (!dateValue) return ''

  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue
  if (isNaN(date.getTime())) return ''

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
 *
 */

export type DTRSlots = {
  in1: TimeLogResponse | null
  out1: TimeLogResponse | null
  in2: TimeLogResponse | null
  out2: TimeLogResponse | null
}

export const resolveDTRSlots = (entries: TimeLogResponse[] = []): DTRSlots => {
  const sorted = [...entries].sort(
    (a, b) => new Date(toTimestamp(a.date, a.scanned_time)).getTime() - new Date(toTimestamp(b.date, b.scanned_time)).getTime()
  )

  const slots: DTRSlots = { in1: null, out1: null, in2: null, out2: null }

  const isBetween = (timestamp: string, startHour: number, endHour: number) => {
    const hours = new Date(timestamp).getHours()
    return hours >= startHour && hours < endHour
  }

  // IN 1 → earliest log between 6–12
  slots.in1 = sorted.find((e) => isBetween(toTimestamp(e.date, e.scanned_time), 6, 12)) ?? null

  // OUT 1 → first log between 12–13 (regardless of is_in/out)
  slots.out1 = sorted.find((e) => isBetween(toTimestamp(e.date, e.scanned_time), 12, 13)) ?? null

  // IN 2 → first log after OUT1 that’s between 12–14
  if (slots.out1) {
    const out1Time = new Date(toTimestamp(slots.out1.date, slots.out1.scanned_time)).getTime()
    slots.in2 =
      sorted.find((e) => {
        const timestamp = toTimestamp(e.date, e.scanned_time)
        const time = new Date(timestamp).getTime()
        return isBetween(timestamp, 12, 14) && time >= out1Time + 15 * 60 * 1000
      }) ?? null
  }

  // OUT 2 → first log ≥ 14 (regardless of is_in/out)
  slots.out2 = sorted.find((e) => new Date(toTimestamp(e.date, e.scanned_time)).getHours() >= 14) ?? null

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

  // Convert log -> timestamp string
  const toDate = (log: TimeLogResponse) => new Date(toTimestamp(log.date, log.scanned_time))

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

/**
 * Collapse a list of daily time records (DTRs) into groups by month.
 * Example:
 * Input: [{ date: "2025-09-16" }, { date: "2025-09-05" }, { date: "2025-08-31" }]
 * Output: [
 *   { month: "September 2025", records: [...] },
 *   { month: "August 2025", records: [...] }
 * ]
 */
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

/**
 * Convert a Date object into a compact year-month string (`YYYY-MM`).
 * Example:
 * formatDateToYearMonth(new Date("2025-09-16")) // "2025-09"
 */
export const formatDateToYearMonth = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0') // pad single digit months
  return `${year}-${month}`
}

/**
 * Normalize a date to a timestamp representing midnight (00:00:00) local time.
 * Example:
 * normalizeDateTimestamp("2025-09-16T10:30:00Z") // timestamp for "2025-09-16T00:00:00"
 */
export const normalizeDateTimestamp = (d: string | Date | null): number | null => {
  if (!d) return null
  const dt = new Date(d)
  dt.setHours(0, 0, 0, 0)
  return dt.getTime()
}

/**
 * Formats a given date into a string with the format "YYYY-MM-DD".
 */
export const formatDateYMD = (date: Date | string) => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Normalizes a time value into a 24-hour `HH:mm:ss` format string.
 *
 * Supported inputs:
 *  - String in `HH:mm` or `HH:mm:ss` 24-hour format
 *  - String in `HH:mm AM/PM` 12-hour format
 *
 * Examples:
 *  normalizeTimeOnly(new Date("2025-09-18T08:05:00")) → "08:05:00"
 */
export const normalizeTimeOnly = (val?: string | Date | null) => {
  if (!val) return null

  let str: string
  if (val instanceof Date) {
    str = `${val.getHours().toString().padStart(2, '0')}:${val.getMinutes().toString().padStart(2, '0')}`
  } else {
    str = val.toString().trim()
  }

  const match24 = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (match24) {
    const h = match24[1].padStart(2, '0')
    const m = match24[2].padStart(2, '0')
    const s = match24[3]?.padStart(2, '0') ?? '00'
    return `${h}:${m}:${s}`
  }

  const matchAMPM = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (matchAMPM) {
    let h = Number(matchAMPM[1])
    const m = matchAMPM[2].padStart(2, '0')
    const period = matchAMPM[3].toUpperCase()
    if (period === 'PM' && h < 12) h += 12
    if (period === 'AM' && h === 12) h = 0
    return `${h.toString().padStart(2, '0')}:${m}:00`
  }

  return null
}
