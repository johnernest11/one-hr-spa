import { defineStore } from 'pinia'
import { useApiCall } from '@/composables/network'
import { useAuthStore } from '@/stores/auth.store.ts'
import { ItemNumberResponse } from '@/typings/models.types.ts'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { useDateFormat } from '@vueuse/core'
import { ref } from 'vue'
/** Typings for Creating & Fecthing  Item Number */
export type ItemNumberPayload = {
  number: string | null
  date_of_creation: string
  status: 'Unfilled'
  date_filled_up: string
  fund_source_id?: string | number | null
  employment_status: string
  position_id?: string | number | null
  // position_id?: 1
}
export const useItemNumberStore = defineStore('item-number', () => {
  const auth = useAuthStore()
  const itemNumber = ref<ItemNumberResponse[]>([])
  /** States */
  const itemNumbers = ref<ItemNumberResponse[]>([])
  const selectedItemNumber = ref<ItemNumberResponse | null>(null)
  const fetchItemNumber = async (limit: number = 10, page: number | null = null) => {
    let uri = `/items?limit=${limit}&sort=asc&`
    if (page) uri += `page=${page}`
    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const ItemNumbersList = Array.isArray(responseBody.data) ? (responseBody.data as ItemNumberResponse[]) : []
      itemNumbers.value = [...ItemNumbersList]
    }
    return responseBody
  }
  const fetchItemNumberById = async (id: string) => {
    const url = `/items/${id}`
    const { data } = await useApiCall(url, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      selectedItemNumber.value = responseBody.data as ItemNumberResponse
    }
    return responseBody
  }
  const createItemNumber = async (item: Partial<ItemNumberPayload>) => {
    const formatDate = (date: Date | string | null | undefined): string | undefined => {
      return date ? useDateFormat(date, 'YYYY-MM-DD').value.toString() : undefined
    }

    item.date_of_creation = formatDate(item.date_of_creation)
    item.date_filled_up = formatDate(item.date_filled_up)
    const { data } = await useApiCall('/items/', auth.authenticationToken).post(item).json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      itemNumber.value.unshift(responseBody.data as ItemNumberResponse)
    }
    return responseBody
  }

  const searchItemNumber = async (query: string | null) => {
    let uri = '/items/search?'
    if (query) uri += `query=${query}`
    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const itemNumbersList = responseBody.data as ItemNumberResponse[]
      itemNumbers.value = [...itemNumbersList]
    }
    return responseBody
  }

  const updateItemNumber = async (item: Partial<ItemNumberPayload>, id: string | number) => {
    const formatDate = (date: Date | string | null | undefined): string | undefined => {
      return date ? useDateFormat(date, 'YYYY-MM-DD').value.toString() : undefined
    }

    item.date_of_creation = formatDate(item.date_of_creation)
    item.date_filled_up = formatDate(item.date_filled_up)
    const { data } = await useApiCall(`/items/${id}`, auth.authenticationToken).put(item).json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const index = itemNumber.value.findIndex((ItemNumber) => ItemNumber?.id === id)
      if (index === -1) return responseBody
      itemNumber.value[index] = responseBody.data as ItemNumberResponse
    }
    return responseBody
  }

  return {
    itemNumbers,
    createItemNumber,
    fetchItemNumber,
    fetchItemNumberById,
    updateItemNumber,
    searchItemNumber,
  }
})
