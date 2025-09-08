import { Ref } from 'vue'
import { TimeLogResponse } from '@/typings/models.types.ts'
import { useDateFormat } from '@vueuse/core'
import { helpers } from '@vuelidate/validators'

/**
 * @description Calculates the duration in minutes between two times (e.g., "07:30" to "16:30"),
 * subtracting 60 minutes if overlapping the lunch break (12:00–13:00).
 * @param start - Start time (e.g., "07:30")
 * @param end - End time (e.g., "16:30")
 * @returns number of working minutes
 */
export const calcDurationMins = (start: string, end: string): number => {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const startM = sh * 60 + sm
  let endM = eh * 60 + em

  // Adjust for overnight shift
  if (endM <= startM) {
    endM += 24 * 60
  }

  let total = endM - startM

  // Subtract 60-minute lunch if overlapping 12:00–13:00
  const lunchStart = 12 * 60
  const lunchEnd = 13 * 60
  if (startM < lunchEnd && endM > lunchStart) {
    const overlap = Math.min(endM, lunchEnd) - Math.max(startM, lunchStart)
    total -= overlap
  }
  return total
}

/**
 * @description Converts minutes into a string format of hours and minutes.
 * @example  "2hr 5min"
 */
export const fmtHoursMins = (totalMinutes: number): string => {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  const hours = `${h}hr`
  const mins = m > 0 ? ` ${m}min` : ''
  return `${hours}${mins}`
}

/**
 * @description Gets "Month Year" from a date string.
 * @example getMonthAndYear('2025-07-14') // "Jul 2025"
 */
export const getMonthAndYear = (dateString: string | null | undefined): string => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      console.error('Invalid date string:', dateString)
      return 'Invalid Date'
    }

    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      year: 'numeric',
    }

    return date.toLocaleDateString(undefined, options)
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Invalid Date'
  }
}

export const formatTime = (dateString: string | null | undefined): string => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      console.error('Invalid date string for time formatting:', dateString)
      return 'Invalid Time'
    }
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Manila',
    }
    return date.toLocaleTimeString('en-PH', options)
  } catch (error) {
    console.error('Error formatting time:', error)
    return 'Invalid Time'
  }
}

export const simulateScan = (manualInput: Ref<string>, onDecode: (value: string) => void) => {
  if (manualInput.value.trim()) {
    onDecode(manualInput.value.trim())
    manualInput.value = ''
  }
}

/**
 * @description Returns today’s full date in the format "Monday  23 June, 2025".
 * @example dateToday() // "Monday  23 June, 2025"
 */
export const dateToday = (): string => {
  const dateObj = new Date()

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]

  const dayOfWeek = days[dateObj.getDay()]
  const dayOfMonth = dateObj.getDate()
  const monthName = months[dateObj.getMonth()]
  const year = dateObj.getFullYear()

  return `${dayOfWeek}  ${dayOfMonth} ${monthName}, ${year}`
}

/**
 * @description Constant string of today's date from `dateToday()`.
 * @example DateToday // "Monday  23 June, 2025"
 */
export const DateToday = dateToday()

/**
 * @description Validator to ensure end date is not before start date.
 */
export const isAfterOrEqualFromDate = (getFromDate: () => string | null) => (value: string | null) => {
  if (!value) return true
  const fromDate = getFromDate()
  if (!fromDate) return true
  return new Date(value) >= new Date(fromDate)
}

/**
 * Summarizes leave date ranges by grouping consecutive dates into ranges.
 * Formats multiple ranges (or single dates) into a compact string.
 *
 * @param dates - Array of objects with `start_date` and `end_date`.
 * @returns A string like "11-14, 10 June 2025".
 */
export const summarizeLeaveDates = (dates: { start_date: string; end_date: string }[]): string => {
  if (!dates.length) return ''

  const pad2 = (n: number) => n.toString().padStart(2, '0')

  // Expand each range into day numbers
  const days = new Set<number>()
  dates.forEach(({ start_date, end_date }) => {
    const s = new Date(start_date)
    const e = new Date(end_date)
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      days.add(d.getDate())
    }
  })

  // Sorted unique days
  const sorted = Array.from(days).sort((a, b) => a - b)

  // Group into ranges
  const groups: [number, number][] = []
  sorted.forEach((day) => {
    const last = groups[groups.length - 1]
    if (last && day === last[1] + 1) {
      last[1] = day
    } else {
      groups.push([day, day])
    }
  })

  const dayStrings = groups.map(([start, end]) => (start === end ? pad2(start) : `${pad2(start)}–${pad2(end)}`))

  // Month & year from first date
  const first = new Date(dates[0].start_date)
  const monthYear = first.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  return `${dayStrings.join(', ')} ${monthYear}`
}

export const formatDTRTime = (dateString: string | undefined): string => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export const formatTimeTo12Hour = (timeString: string | undefined): string => {
  if (!timeString) return '—'

  const [hourStr, minuteStr] = timeString.split(':')
  let hour = parseInt(hourStr)
  const minute = minuteStr.padStart(2, '0')

  const period = hour >= 12 ? 'PM' : 'AM'
  hour = hour % 12 || 12

  return `${hour}:${minute} ${period}`
}

/** Helper to get formatted date like "1-Feb" */
export const getFormattedDTRDate = (dateString: string): string => {
  if (!dateString) return ''

  const date = new Date(dateString)
  // Format with short month and numeric day
  const formatted = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(date)
  // Intl yields "5 Jun" → convert to "5-Jun"
  return formatted.replace(' ', '-')
}

// Helper to get the day of the week like "Sat"
export const getDTRDayOfWeek = (dateString: string): string => {
  if (!dateString) return ''

  const date = new Date(dateString)
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
  }

  return date.toLocaleDateString('en-US', options)
}

export const toTimestamp = (date: string, time: string) => `${date}T${time}`

/**
 * Resolves raw DTR time log entries into structured slots (in1, out1, in2, out2).
 *
 * Rules:
 * - `in1`: First IN between 6:00 AM – 12:00 PM
 * - `out1`: First OUT between 12:00 PM – 1:00 PM
 * - `in2`: First IN between 12:00 PM – 2:00 PM (must be at least 15 mins after `out1`)
 * - `out2`: First OUT from 2:00 PM onwards
 *
 * @param entries - Array of time log responses
 * @returns An object with resolved slots: { in1, out1, in2, out2 }
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

  const slots = {
    in1: '',
    out1: '',
    in2: '',
    out2: '',
  }

  const isBetween = (timestamp: string, startHour: number, endHour: number) => {
    const date = new Date(timestamp)
    const hours = date.getHours()
    return hours >= startHour && hours < endHour
  }

  // 1. Assign in1: between 6:00 - 12:00
  const in1Candidate = inLogs.find((e) => isBetween(toTimestamp(e.date, e.scanned_time), 6, 12))
  if (in1Candidate) {
    slots.in1 = toTimestamp(in1Candidate.date, in1Candidate.scanned_time)
  }

  // 2. Assign out1: between 12:00 - 13:00
  const out1Candidate = outLogs.find((e) => isBetween(toTimestamp(e.date, e.scanned_time), 12, 13))
  if (out1Candidate) {
    slots.out1 = toTimestamp(out1Candidate.date, out1Candidate.scanned_time)
  }

  // 3. Assign in2: between 12:00 - 14:00, but not within 15 mins after out1
  if (slots.out1) {
    const out1Time = new Date(slots.out1).getTime()
    const in2Candidates = inLogs.filter((e) => {
      const timestamp = toTimestamp(e.date, e.scanned_time)
      const time = new Date(timestamp).getTime()
      return isBetween(timestamp, 12, 14) && time >= out1Time + 15 * 60 * 1000
    })

    if (in2Candidates.length) {
      slots.in2 = toTimestamp(in2Candidates[0].date, in2Candidates[0].scanned_time)
    }
  } else {
    const in2Candidate = inLogs.find((e) => isBetween(toTimestamp(e.date, e.scanned_time), 12, 14))
    if (in2Candidate) {
      slots.in2 = toTimestamp(in2Candidate.date, in2Candidate.scanned_time)
    }
  }

  // 4. Assign out2: from 14:00 onwards
  const out2Candidate = outLogs.find((e) => {
    const date = new Date(toTimestamp(e.date, e.scanned_time))
    return date.getHours() >= 14
  })
  if (out2Candidate) {
    slots.out2 = toTimestamp(out2Candidate.date, out2Candidate.scanned_time)
  }

  return slots
}

/**
 * Formats a date input (string, number, or Date) to 'YYYY-MM-DD'.
 * Returns an empty string if the input is invalid or is a future date.
 *
 * @param input - A date in string, number, or Date format.
 * @returns Formatted date string or empty string if invalid/future.
 */
export const formatDateSafe = (input: unknown): string => {
  const date = new Date(input as string | number | Date)

  // Invalid date check
  if (isNaN(date.getTime())) return ''

  // Today cutoff
  const today = new Date()
  if (date > today) return ''

  return useDateFormat(date, 'YYYY-MM-DD').value
}

/**
 * Extracts the year from a date input.
 * Returns an empty string if the date is invalid.
 *
 * @param val - A date input (string, number, or Date).
 * @returns Year as a string or empty string if invalid.
 */
export const formatYear = (val: unknown): string => {
  const date = new Date(val as string | number | Date)
  return isNaN(date.getTime()) ? '' : date.getFullYear().toString()
}

export const formatValidationDate = (val: unknown): string => {
  const date = new Date(val as string | number | Date)
  if (isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}` // Y-m-d
}

/**
 * Applies `formatDateSafe` to specific fields of each object in an array.
 *
 * @param entries - Array of objects with potentially date fields.
 * @param fields - List of keys to be formatted using `formatDateSafe`.
 */
export const formatDateFields = <T extends Record<string, unknown>>(entries: T[], fields: (keyof T)[]) => {
  entries.forEach((entry) => {
    fields.forEach((field) => {
      entry[field] = formatDateSafe(entry[field]) as T[keyof T]
    })
  })
}

/**
 * Creates a Vuelidate custom validator that checks if a date is not older than X years ago.
 * Allows null or empty values.
 *
 * @param maxYearsAgo - The maximum number of years allowed (e.g., 130 for birthdays).
 * @returns A Vuelidate validator function.
 */
export function isNotMoreThanYearsAgo(maxYearsAgo: number) {
  return helpers.withParams({ type: 'isNotMoreThanYearsAgo', maxYearsAgo }, (value: string | null) => {
    if (!value) return true // allow empty values
    const inputDate = new Date(value)
    if (isNaN(inputDate.getTime())) return false

    const today = new Date()
    const oldestAllowed = new Date(today.getFullYear() - maxYearsAgo, today.getMonth(), today.getDate())
    return inputDate >= oldestAllowed
  })
}

/**
 * Computation of Undertime & Overtime total worked hours based on DTR slots,
 * with a fixed lunch break (12:00–1:00) excluded.
 */
export const computeWorkedHours = (timeLog: TimeLogResponse[]): number => {
  const { in1, out1, in2, out2 } = resolveDTRSlots(timeLog ?? [])
  if (!in1 || !out1 || !in2 || !out2) return 0

  const toDate = (t: string) => new Date(t)

  const amHours = (toDate(out1).getTime() - toDate(in1).getTime()) / 36e5

  // clamp in2 to 1:00 PM if earlier
  const pmStart = new Date(in2)
  const onePM = new Date(in2)
  onePM.setHours(13, 0, 0, 0)
  if (pmStart < onePM) pmStart.setTime(onePM.getTime())

  const pmHours = (toDate(out2).getTime() - pmStart.getTime()) / 36e5

  return +(Math.max(amHours, 0) + Math.max(pmHours, 0)).toFixed(2)
}

/**
 * Computes undertime (UT).
 */
export const computeUT = (worked: number): number => (worked < 8 ? parseFloat((8 - worked).toFixed(2)) : 0)

/**
 * Computes overtime (OT).
 */
export const computeOT = (worked: number): number => (worked > 8 ? parseFloat((worked - 8).toFixed(2)) : 0)
