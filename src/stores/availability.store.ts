import { defineStore } from 'pinia'
import { useApiCall } from '@/composables/network.ts'
import { parsePhoneNumber } from 'libphonenumber-js'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'

export const useAvailabilitiesStore = defineStore('availabilities', () => {
  const checkUserUniqueIdentifierAvailability = async (
    key: 'mobile_number' | 'email',
    value: string,
    excludeId: string | number | null = null
  ) => {
    if (key === 'mobile_number') {
      value = encodeURIComponent(parsePhoneNumber(value, 'PH').number)
    }

    let url = `/availability/${key}?value=${value}`
    if (excludeId) url += `&excluded_id=${excludeId}`

    const { data } = await useApiCall(url).get().json()
    return data.value as ApiResponseBody & { data: { is_available: boolean } }
  }

  const checkItemNumberUniqueIdentifierAvailability = async (
    key: 'item_number',
    value: string,
    excludeId: string | number | null = null
  ) => {
    let url = `/availability/${key}?value=${value}`
    if (excludeId) url += `&excluded_id=${excludeId}`

    const { data } = await useApiCall(url).get().json()
    return data.value as ApiResponseBody & { data: { is_available: boolean } }
  }

  return {
    checkUserUniqueIdentifierAvailability,
    checkItemNumberUniqueIdentifierAvailability,
  }
})
