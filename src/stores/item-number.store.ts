import { defineStore } from 'pinia'
import { useApiCall } from '@/composables/network'
import { useAuthStore } from '@/stores/auth.store.ts'
import { ItemNumberResponse } from '@/typings/models.types.ts'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { useDateFormat } from '@vueuse/core'
import { ref } from 'vue'
import { WbAutoCompleteOption } from '@/components/webkit/WbAutoComplete.vue'

export type ItemNumberPayload = {
  number: string | null
  date_of_creation: string
  status: 'Unfilled' | 'Filled'
  date_filled_up: string
  fund_source: number
  fund_source_id?: string | number | null
  employment_status: string
  position: number
  position_id?: string | number | null
}

export const useItemNumberStore = defineStore('item-number', () => {
  const auth = useAuthStore()
  const itemNumbers = ref<ItemNumberResponse[]>([])
  const itemNumbersSuggestions = ref<WbAutoCompleteOption[]>([])
  const selectedItemNumber = ref<ItemNumberResponse | null>(null)
  const previousItemNumber = ref<string | null>(null)
  const lastNumbers = ref<Record<string, number>>({
    'Contract of Service': 0,
    Contractual: 0,
    Casual: 0,
  })

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

  const fetchItemNumberById = async (id: string | number) => {
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
      itemNumbers.value.unshift(responseBody.data as ItemNumberResponse)
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
      const index = itemNumbers.value.findIndex((itemNumbers) => itemNumbers?.id === id)
      if (index === -1) return responseBody
      itemNumbers.value[index] = responseBody.data as ItemNumberResponse
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

  const filterItemNumber = async (status: string | null) => {
    let uri = '/items'
    if (status) uri += `?status=${encodeURIComponent(status)}`
    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const accomplishmentReportsList = responseBody.data as ItemNumberResponse[]
      itemNumbers.value = [...accomplishmentReportsList]
    }
    return responseBody
  }

  const fetchLastNumber = async (employment_status: string) => {
    let page = 1
    let totalCount = 0
    let lastPage = 1

    do {
      const { data } = await useApiCall(`/items?page=${page}`, auth.authenticationToken).get().json()

      const responseBody: ApiResponseBody = data.value
      if (!responseBody.success || !Array.isArray(responseBody.data)) break

      totalCount += (responseBody.data as ItemNumberResponse[]).filter(
        (item) => item.employment_status === employment_status
      ).length

      lastPage = responseBody.pagination?.last_page ?? 1
      page++
    } while (page <= lastPage)

    lastNumbers.value[employment_status] = totalCount
    return totalCount
  }

  const updateItemStatus = async (itemNumber: string) => {
    if (previousItemNumber.value && previousItemNumber.value !== itemNumber) {
      const previousItem = itemNumbers.value.find((i) => i.number === previousItemNumber.value)
      if (previousItem) {
        await updateItemNumber({ status: 'Unfilled' }, previousItem.id!)
      }
    }
    const item = itemNumbers.value.find((i) => i.number === itemNumber)
    if (!item) return null

    const result = await updateItemNumber({ status: 'Filled' }, item.id!)
    previousItemNumber.value = itemNumber

    return result
  }

  return {
    itemNumbers,
    itemNumbersSuggestions,
    lastNumbers,
    createItemNumber,
    fetchItemNumber,
    fetchItemNumberById,
    updateItemNumber,
    searchItemNumber,
    filterItemNumber,
    fetchLastNumber,
    updateItemStatus,
  }
})
