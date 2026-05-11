import { helpers } from '@vuelidate/validators'

/**
 * Validates that the 'From' date is not after the 'To' date.
 * T: Constrains the form to only valid date-like property values.
 */
export const isBeforeOrEqualTo = <T extends Record<PropertyKey, string | number | Date | null | undefined>>(
  dateToFieldName: keyof T
) => {
  return (val: string | number | Date | null | undefined, vm: T): boolean => {
    const dateToValue = vm[dateToFieldName]

    // 1. If 'To' date is null/undefined/empty, skip this validation
    if (!helpers.req(dateToValue)) return true

    // 2. Parse into Date objects
    const from = val ? new Date(val) : null
    const to = dateToValue ? new Date(dateToValue) : null

    // 3. Handle Invalid Dates (isNaN)
    if (!from || !to || isNaN(from.getTime()) || isNaN(to.getTime())) {
      return true
    }

    // 4. Validation logic
    return from <= to
  }
}
