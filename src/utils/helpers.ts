import { CountryCode, isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js'
import { Ref } from 'vue'
import { WarmBodyResponse } from '@/typings/models.types.ts'
import { useDateFormat } from '@vueuse/core'
/**
 * @description Halt code execution for x seconds
 * @example
 * import { sleep } from '@/composables/helpers.ts'
 * await sleep(2)
 */
export const sleep = (seconds: number): Promise<boolean> => {
  return new Promise((res) => {
    setTimeout(() => {
      res(true)
    }, seconds * 1000)
  })
}

export const getManilaTodayISO = (): string => {
  const now = new Date()
  const manilaDateTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
  return manilaDateTime.toISOString().split('T')[0]
}

export const snakeCaseToTitleCase = (s: string) =>
  s.replace(/^_*(.)|_+(.)/g, (_s, c, d) => (c ? c.toUpperCase() : ' ' + d.toUpperCase()))

/**
 * @description Get the 2-letter initials from the full name
 * @example
 * import { getAvatarDisplayNamePlaceholder } from '@/composables/helpers.ts'
 * const placeholder = getAvatarDisplayNamePlaceholder('Juan Luna') // returns JL
 */
export const getAvatarDisplayNamePlaceholder = (fullName: string) => {
  if (!fullName) return null

  // we'll display the initials for the fake avatar
  const names = fullName.split(' ')
  let initials = names[0].substring(0, 1).toUpperCase()

  if (names.length > 1) {
    initials += names[names.length - 1].substring(0, 1).toUpperCase()
  }

  return initials
}

/**
 * @description Check if a string is a valid phone number for a given country
 */
export const checkIfValidMobileNumber = (value: string, country: CountryCode = 'PH') => {
  let phone

  // The library throws a NOT_A_NUMBER error if it can't parse
  // the value properly
  try {
    phone = parsePhoneNumber(value, country)
  } catch (err) {
    return false
  }

  if (!phone) return false

  return isValidPhoneNumber(value, country)
}

export const usePrependOrAppendOnce = (affix: string, type = 'append') => {
  if (!['append', 'prepend'].includes(type)) {
    throw new Error('Valid values are `prepend` and `append`')
  }
  return (value: string) => {
    return type === 'append' ? `${value}-${affix}` : `${affix}-${value}`
  }
}

/**
 * @description Generates URL with params (e.g. url?search=query&term=query)
 *
 * @param {string} url Base URL
 * @param {T} obj Parameters to append in the URL
 */
export const createUrlWithParams = <T>(url: string | undefined, obj: T) => {
  const params = []

  for (const key in obj) {
    params.push(`${encodeURIComponent(key)}=${encodeURIComponent(`${obj[key]}`)}`)
  }

  const urlParams = params.join('&')

  return `${url}?${urlParams}`
}

export const getObjectValueUsingPath = <T>(obj: T, path: string) => {
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  return path.split('.').reduce((a: any, b: any) => a[b], obj)
}

/**
 * Lower Case the first character in a string
 *
 * e.g.
 * lcFirst('ABC') outputs 'aBC'
 * lcFirst('A BC') outputs 'a BC'
 *
 *
 * @param string
 * @returns
 */
export const lcFirst = (string: string) => {
  if (typeof string !== 'string') {
    return ''
  }

  if (string.length === 0) {
    return string
  }

  return string[0].toLowerCase() + string.slice(1)
}

/**
 * @description Formats a numeric amount into a string with 2 decimal places and thousands separator.
 * @example formatAmount(12345.678) // "12,345.68"
 */
export const formatAmount = (amount: number | string | null | undefined): string => {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '0.00'
  }
  return parseFloat(String(amount)).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

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
 * @description Extracts "Month Year" from a string like "1 December 2025".
 * @example "December 2025"
 */
export const extractMonthYear = (period: string): string => {
  const parts = period.trim().split(' ')
  return parts.length >= 3 ? `${parts[1]} ${parts[2]}` : period
}

/**
 * @description Extracts "Month Year" from a string and increments the year by 1.
 * @example "December 2026"
 */
export const extractMonthYearPlusOneYear = (period: string): string => {
  const parts = period.trim().split(' ')
  if (parts.length >= 3) {
    const month = parts[1]
    const year = parseInt(parts[2], 10)
    return `${month} ${year + 1}`
  }
  return period
}

/**
 * @description Formats a date string into "DD MMM YYYY" format.
 * @example "14 Jun 2025"
 */
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      console.error('Invalid date string:', dateString)
      return 'Invalid Date'
    }
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
    const formattedDate = date.toLocaleDateString(undefined, options)
    return formattedDate.replace(/^(\w+)\s(\d+),\s(\d+)$/, '$2 $1 $3')
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Invalid Date'
  }
}

/**
 * @description Formats a single date range into a readable string.
 * @example// "01 - 15 June 2025"
 */
export const formatDateRangeObject = (start_date: string, end_date: string): string => {
  const start = new Date(start_date)
  const end = new Date(end_date)

  const sameMonthYear = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  const formatDay = (date: Date) => date.getDate().toString().padStart(2, '0')
  const formatMonthYear = (date: Date) => date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return sameMonthYear
    ? `${formatDay(start)} - ${formatDay(end)} ${formatMonthYear(end)}`
    : `${formatDay(start)} ${formatMonthYear(start)} - ${formatDay(end)} ${formatMonthYear(end)}`
}

/**
 * @description Formats multiple date ranges into a readable string, comma-separated.
 * @example "01 - 15 June 2025, 01 - 15 July 2025"
 */
export const formatDateRanges = (ranges: { start_date: string; end_date: string }[]): string => {
  if (!ranges || !Array.isArray(ranges)) return ''

  return ranges
    .map(({ start_date, end_date }) => {
      const start = new Date(start_date)
      const end = new Date(end_date)

      const sameMonthYear = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
      const formatDay = (date: Date) => date.getDate().toString().padStart(2, '0')
      const formatMonthYear = (date: Date) => date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

      return sameMonthYear
        ? `${formatDay(start)} - ${formatDay(end)} ${formatMonthYear(end)}`
        : `${formatDay(start)} ${formatMonthYear(start)} - ${formatDay(end)} ${formatMonthYear(end)}`
    })
    .join(', ')
}

/**
 * @description Formats a date into full long-form for request payloads.
 * @example formatDateRequest('2025-06-14') // "Saturday, June 14, 2025"
 */
export const formatDateRequest = (dateInput: string | null | undefined): string => {
  if (!dateInput) return ''

  const date = new Date(dateInput)
  if (isNaN(date.getTime())) return ''

  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }

  return new Intl.DateTimeFormat('en-US', options).format(date)
}

/**
 * @description Formats a payroll period string like "2025-06-01, 2025-06-15" to "1–15 June 2025".
 * @example formatPayrollPeriod('2025-06-01, 2025-06-15') // "1–15 June 2025"
 */
export const formatPayrollPeriod = (periodStr: string | null): string => {
  if (!periodStr) return ''

  const [startStr, endStr] = periodStr.split(',').map((s) => s.trim())
  const startDate = new Date(startStr)
  const endDate = new Date(endStr)

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return ''
  }

  const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' }
  return `${startDate.getDate()}–${endDate.getDate()} ${endDate.toLocaleDateString('en-US', options)}`
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

export const resolveDTRSlots = (entries: WarmBodyResponse[] = []) => {
  const inLogs = entries.filter((e) => e.is_in).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  const outLogs = entries
    .filter((e) => !e.is_in)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  const slots = {
    in1: '',
    out1: '',
    in2: '',
    out2: '',
  }

  // Helper function to check if a timestamp falls within a specific time window
  const isBetween = (timestamp: string | number | Date, startHour: number, endHour: number) => {
    const date = new Date(timestamp)
    const hours = date.getHours()
    return hours >= startHour && hours < endHour
  }

  // 1. Assign in1: between 6:00 - 9:00
  const in1Candidate = inLogs.find((e) => isBetween(e.timestamp, 6, 9))
  if (in1Candidate) slots.in1 = in1Candidate.timestamp

  // 2. Assign out1: between 12:00 - 13:00
  const out1Candidate = outLogs.find((e) => isBetween(e.timestamp, 12, 13))
  if (out1Candidate) slots.out1 = out1Candidate.timestamp

  // 3. Assign in2: between 12:00 - 14:00, but not within 15 mins after out1
  if (slots.out1) {
    const out1Time = new Date(slots.out1).getTime()
    const in2Candidates = inLogs.filter((e) => {
      const time = new Date(e.timestamp).getTime()
      return (
        isBetween(e.timestamp, 12, 14) && time >= out1Time + 15 * 60 * 1000 // at least 15 mins after out1
      )
    })
    if (in2Candidates.length) {
      // pick the earliest valid in2
      slots.in2 = in2Candidates[0].timestamp
    }
  } else {
    // fallback: pick earliest in between 12-14 if out1 not found
    const in2Candidate = inLogs.find((e) => isBetween(e.timestamp, 12, 14))
    if (in2Candidate) slots.in2 = in2Candidate.timestamp
  }

  // 4. Assign out2: from 14:00 onwards
  const out2Candidate = outLogs.find((e) => {
    const date = new Date(e.timestamp)
    return date.getHours() >= 14
  })
  if (out2Candidate) slots.out2 = out2Candidate.timestamp

  return slots
}

export const formatDateSafe = (input: unknown): string => {
  const date = new Date(input as string | number | Date)

  // Invalid date check
  if (isNaN(date.getTime())) return ''

  // Today cutoff
  const today = new Date()
  if (date > today) return ''

  return useDateFormat(date, 'YYYY-MM-DD').value
}

// Helper to safely extract year from a value
export const formatYear = (val: unknown): string => {
  const date = new Date(val as string | number | Date)
  return isNaN(date.getTime()) ? '' : date.getFullYear().toString()
}

export const formatDateFields = <T extends Record<string, unknown>>(entries: T[], fields: (keyof T)[]) => {
  entries.forEach((entry) => {
    fields.forEach((field) => {
      entry[field] = formatDateSafe(entry[field]) as T[keyof T]
    })
  })
}
