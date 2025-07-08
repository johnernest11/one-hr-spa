import { Ref } from 'vue'
import { UserPayload } from '@/stores/users.store.ts'
/**
 * @description Assign the true value from the WBAutoComplete component to a Ref
 */
export const useWbAutoCompleteHandleTrueValue = <T>(value: T, reference: Ref<T>) => {
  reference.value = value
}

export const useWbAutoCompleteHandleTrueValueExtended = (value: unknown, payload: Partial<UserPayload>) => {
  const selected = Array.isArray(value) ? value[0] : value

  if (!selected || typeof selected !== 'object') {
    payload.individual_basic_detail_id = null
    payload.first_name = ''
    payload.middle_name = ''
    payload.last_name = ''
    return
  }

  payload.individual_basic_detail_id = selected.value ?? null

  const first = selected.first_name
  const middle = selected.middle_name
  const last = selected.last_name

  // If explicit fields are available, use them
  if (first || middle || last) {
    payload.first_name = first ?? ''
    payload.middle_name = middle ?? ''
    payload.last_name = last ?? ''
  } else if (typeof selected.label === 'string') {
    // Attempt to parse label string
    const parts = selected.label.split(' ')

    payload.first_name = parts[0] ?? ''
    payload.middle_name = parts.length === 3 ? parts[1] : ''
    payload.last_name = parts.length === 3 ? parts[2] : parts[1] ?? ''
  }

  payload.ext_name = selected.ext_name ?? ''
}
