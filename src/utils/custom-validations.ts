/**
 * For creating custom Vuelidate Validators
 * @see https://vuelidate-next.netlify.app/custom_validators.html
 *
 * Note: for the reasoning behind allowing the `any`
 * return type, check https://github.com/vuelidate/vuelidate/issues/879
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { email, helpers } from '@vuelidate/validators'
import { parsePhoneNumber } from 'libphonenumber-js/max'
import { useAvailabilitiesStore } from '@/stores/availability.store.ts'
import useVuelidate from '@vuelidate/core'

/**
 * @description Must have one lowercase & uppercase letter, one number
 */
export const passwordRule = () => helpers.regex(/(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/)

/**
 * @description Must have a certain count of digits
 */
export const digitCountRule =
  (numOfDigits: number): any =>
    (value: string) => {
    /** @note We still need to check as the library can still take in non-string types at run time */
      if (value === null || value === '' || value === undefined) return true

      const pattern = '^\\d{' + numOfDigits + '}$'
      const regex = new RegExp(pattern)
      return regex.test(value)
    }

/**
 * @description Must be a valid mobile number format from the specified country
 * @see https://www.npmjs.com/package/libphonenumber-js
 */
export const mobilePhoneRule =
  (country = 'PH'): any =>
    (value: string) => {
    /** @note We still need to check as the library can still take in non-string types at run time */
      if (value === null || value === '' || value === undefined) return true

      let phone

      try {
        phone = parsePhoneNumber(value, country)
      } catch (err) {
        return false
      }

      if (!phone) return false

      return phone.isValid()
    }

const availabilityStore = useAvailabilitiesStore()
/**
 * @description Async check if the email or mobile number is already taken
 */
export const uniqueUserIdentifierRule =
  (key: 'mobile_number' | 'email', excludedId: string | number | undefined | null = null): any =>
    async (value: string) => {
    /** @note We still need to check as the library can still take in non-string types at run time */
      if (value === null || value === '' || value === undefined) return true

      if (key === 'email') {
      // Check if the email format is valid before making an API call
        const validator = useVuelidate({ email: { email } }, { email: value })
        const isValidFormat = await validator.value.$validate()
        if (!isValidFormat) return true
      } else {
      // Check if the mobile number format is valid before making an API call
        const validator = useVuelidate({ mobile_number: { mobile_number: mobilePhoneRule() } }, { mobile_number: value })
        const isValidFormat = await validator.value.$validate()
        if (!isValidFormat) return true
      }

      const res = await availabilityStore.checkUserUniqueIdentifierAvailability(key, value, excludedId || null)
      return res.data.is_available
    }

/**
 * @description Client-side rule to check for duplicate item numbers (no backend)
 */
export const uniqueItemNumberRuleLocal = (
  existingItemNumbers: string[], // all item numbers from store or API
  currentNumber?: string // the number of the record being updated (optional)
): ((value: string) => boolean | Promise<boolean>) => {
  return (value: string) => {
    if (!value || typeof value !== 'string') return true

    // Normalize for comparison
    const normalizedValue = value.toUpperCase().trim()

    // Filter out current number (if updating)
    const numbersToCheck = existingItemNumbers
      .map((n) => n.toUpperCase().trim())
      .filter((n) => n !== (currentNumber ?? '').toUpperCase().trim())

    // Return false if value exists in other numbers
    return !numbersToCheck.includes(normalizedValue)
  }
}

/** @description Only allow certain file extensions **/
export const mimeTypeRule = (mimeTypes: string[]) => (value: File) => {
  return mimeTypes.includes(value.type)
}

/** @description The file size must not exceed the specified size in MB*/
export const maxFileSizeRule = (maxMb: number) => (value: File) => {
  return value.size <= maxMb * 1024 * 1024
}
