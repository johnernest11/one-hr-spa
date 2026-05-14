import { CountryCode, isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js'
import { Ref } from 'vue'
import { useDateFormat } from '@vueuse/core'
import { helpers } from '@vuelidate/validators'
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
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(now)
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
 * @description Formats a date string into "d MM yy" format.
 * @example "04 October 2025"
 */
export const formatDateLong = (dateString: string | null | undefined): string => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      console.error('Invalid date string:', dateString)
      return 'Invalid Date'
    }
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'long',
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
export const getMonthAndYear = (dateValue: string | Date | null | undefined): string => {
  if (!dateValue) return ''

  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue
  if (isNaN(date.getTime())) {
    console.error('Invalid date value:', dateValue)
    return 'Invalid Date'
  }

  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    year: 'numeric',
  }

  return date.toLocaleDateString(undefined, options)
}

/**
 * @description Gets long "Month Year" from a date string.
 * @example getMonthAndYear('2025-07-14') // "July 2025"
 */
export const getLongMonthAndYear = (dateString: string | null | undefined): string => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      console.error('Invalid date string:', dateString)
      return 'Invalid Date'
    }

    const options: Intl.DateTimeFormatOptions = {
      month: 'long',
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
 * Validator: ensures a given date is not in the future.
 */
export const notInFuture = (val: string | number | Date | null) => {
  if (!helpers.req(val)) return true // skip if empty
  const date = new Date(val as string | number | Date)
  if (isNaN(date.getTime())) return true
  const today = new Date()
  today.setHours(0, 0, 0, 0) // normalize to midnight
  return date <= today
}

/**
 * Checks if the first date is on or after the second date, ignoring time.
 * @param {string | Date} date1 The date to check.
 * @param {string | Date} date2 The date to compare against.
 * @returns {boolean} True if date1 is on or after date2, otherwise false.
 */
export const isSameOrAfterDate = (date1: string, date2: string) => {
  const d1 = new Date(date1)
  d1.setHours(0, 0, 0, 0)

  const d2 = new Date(date2)
  d2.setHours(0, 0, 0, 0)

  return d1 >= d2
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

export const formatTimeTo12Hour = (timeString: string | undefined): string => {
  if (!timeString) return '—'

  const [hourStr, minuteStr] = timeString.split(':')
  let hour = parseInt(hourStr)
  const minute = minuteStr.padStart(2, '0')

  const period = hour >= 12 ? 'PM' : 'AM'
  hour = hour % 12 || 12

  return `${hour}:${minute} ${period}`
}

/**
 * Formats a date input (string, number, or Date) to 'YYYY-MM-DD'.
 *
 * The `canBeFuture` parameter controls the cutoff logic:
 * - If `canBeFuture` is **false** (default), it returns an empty string if the date is in the **future** (today or earlier is allowed).
 * - If `canBeFuture` is **true**, it will proceed with the date formatting.
 *
 * It always returns an empty string if the input is an invalid date.
 *
 * @param input - A date in string, number, or Date format.
 * @param canBeFuture - If true, dates in the future are valid for formatting. Defaults to false.
 * @returns Formatted date string or empty string if invalid or outside the acceptable date range.
 */
export const formatDateSafe = (input: unknown, canBeFuture: boolean = false, format: string = 'YYYY-MM-DD'): string => {
  const date = new Date(input as string | number | Date)

  // Invalid date check
  if (isNaN(date.getTime())) return ''

  // Today cutoff
  const today = new Date()
  if (!canBeFuture) {
    if (date > today) return ''
  }

  return useDateFormat(date, format).value
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
 * It defaults to ensuring the date cannot be in the future (canBeFuture: false),
 * but allows overriding this behavior for specific fields.
 *
 * @param entries - Array of objects with potentially date fields.
 * @param fields - A list of keys to be formatted. This can be:
 * 1. A string array of field names (e.g., ['field1', 'field2']).
 * These default to `canBeFuture: false`.
 * 2. An array of objects to configure specific fields (e.g., [{ field: 'field3', canBeFuture: true }]).
 * 3. A mixed array of both strings and objects.
 */
export const formatDateFields = <T extends Record<string, unknown>>(
  entries: T[],
  fields: (keyof T | { field: keyof T; canBeFuture: boolean })[]
) => {
  const fieldConfigs: { field: keyof T; canBeFuture: boolean }[] = (fields as any).map((item: any) => {
    if (typeof item === 'string') {
      return { field: item, canBeFuture: false }
    }
    return item
  })

  entries.forEach((entry) => {
    fieldConfigs.forEach((config) => {
      const { field, canBeFuture } = config
      entry[field] = formatDateSafe(entry[field], canBeFuture) as T[keyof T]
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
 * Convert a full position label into an abbreviation code.
 *
 * Rules:
 * - Take the first letter of each word
 * - Skip filler words like "OFFICER" and "AND"
 * - Keep the Roman numeral (I, II, III, IV, etc.) intact at the end
 */
export function getPositionCode(label: string | null | undefined): string | null {
  if (!label) return null

  const words = label.trim().split(/\s+/)

  const lastWord = words[words.length - 1]
  const isRoman = /^[IVXLCDM]+$/i.test(lastWord)

  const skipWords = ['AND']

  let initials = words
    .slice(0, isRoman ? -1 : words.length)
    .filter((w) => !skipWords.includes(w.toUpperCase()))
    .map((w) => w[0].toUpperCase())
    .join('')

  if (isRoman) {
    initials += lastWord.toUpperCase()
  }

  return initials
}

// utils/dateHelpers.ts
export const formatToYMD = (date: string | Date | null): string | null => {
  if (!date) return null
  if (date instanceof Date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  // Assume string in MM/DD/YYYY or YYYY-MM-DD
  const parts = date.split('/')
  if (parts.length === 3) {
    // Convert MM/DD/YYYY → YYYY-MM-DD
    const [month, day, year] = parts
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  return date // already in YYYY-MM-DD
}

/** Service Record Helpers */
// Helper to format number as Philippine Peso
export const formatPeso = (amount: number | null | undefined) => {
  if (!amount) return '-'
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount)
}

/** --------------- Format Date for WES Duration------------------
 * Formats a date range for WES (Work Experience Sheet) duration.
 * e.g January 1, 2010 - February 11, 2011 ,
 * e.g February 11, 2011 – present)
 * --------------------------------------------------------------- */
export const formatWesDuration = (from: string | null, to: string | null, isCurrent: boolean = false): string => {
  if (!from && !to) return ''

  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }

  const startDate = from ? new Date(from) : null
  let endStr: string

  if (isCurrent) {
    endStr = 'Present'
  } else {
    const endDate = to ? new Date(to) : null
    endStr = endDate ? endDate.toLocaleDateString('en-US', options) : 'Present'
  }

  const startStr = startDate ? startDate.toLocaleDateString('en-US', options) : 'Unknown'

  return `${startStr} – ${endStr}`
}
