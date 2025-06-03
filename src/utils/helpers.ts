import { CountryCode, isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js'

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

export const formatDateRanges = (ranges: { start_date: string; end_date: string }[]): string => {
  if (!ranges || !Array.isArray(ranges)) return ''

  return ranges
    .map(({ start_date, end_date }) => {
      const start = new Date(start_date)
      const end = new Date(end_date)

      const sameMonthYear = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()

      const formatDay = (date: Date) => date.getDate().toString().padStart(2, '0')
      const formatMonthYear = (date: Date) => date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

      if (sameMonthYear) {
        return `${formatDay(start)} - ${formatDay(end)} ${formatMonthYear(end)}`
      } else {
        return `${formatDay(start)} ${formatMonthYear(start)} - ${formatDay(end)} ${formatMonthYear(end)}`
      }
    })
    .join(', ')
}

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
