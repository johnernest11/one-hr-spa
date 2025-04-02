import { defineStore } from 'pinia'
import { useApiCall } from '@/composables/network'
import { useAuthStore } from '@/stores/auth.store.ts'
import { ItemNumberResponse } from '@/typings/models.types.ts'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { ref } from 'vue'
/** Typings for Creating & Fecthing  Item Number */
export type ItemNumberPayload = {
  item_number: string | null
  date_of_creation: string
  status: string
  date_filled_up: string
  fund_source_id?: string | number | null
  employment_status: string
  position_id?: string | number | null
}
export const useItemNumberStore = defineStore('item-number', () => {
  const auth = useAuthStore()
  const itemNumber = ref<ItemNumberResponse[]>([])
  /** States */
  const ItemNumberArray = ref<ItemNumberResponse[]>([])
  const selectedItemNumber = ref<ItemNumberResponse | null>(null)
  const fetchItemNumber = async (limit: number = 10, page: number | null = null) => {
    let uri = `/item-numbers?limit=${limit}&sort=asc&`
    if (page) uri += `page=${page}`
    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const ItemNumbersList = Array.isArray(responseBody.data) ? (responseBody.data as ItemNumberResponse[]) : []
      ItemNumberArray.value = [...ItemNumbersList]
    }
    return responseBody
  }
  const fetchItemNumberById = async (id: string) => {
    const url = `/item-numbers/${id}`
    const { data } = await useApiCall(url, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      selectedItemNumber.value = responseBody.data as ItemNumberResponse
    }
    return responseBody
  }
  const createItemNumber = async (ItemNumber: Partial<ItemNumberPayload>) => {
    const { data } = await useApiCall('/item-numbers/', auth.authenticationToken).post(ItemNumber).json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      itemNumber.value.unshift(responseBody.data as ItemNumberResponse)
    }
    return responseBody
  }
  const searchItemNumber = async (query: string | null) => {
    let uri = '/item-numbers/search?'
    if (query) uri += `query=${query}`
    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const itemNumbersList = responseBody.data as ItemNumberResponse[]
      ItemNumberArray.value = [...itemNumbersList]
    }
    return responseBody
  }
  const updateItemNumber = async (ItemNumber: Partial<ItemNumberPayload>, id: string | number) => {
    const { data } = await useApiCall(`/item-numbers/${id}`, auth.authenticationToken).put(ItemNumber).json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const index = itemNumber.value.findIndex((ItemNumber) => ItemNumber?.id === id)
      if (index === -1) return responseBody
      itemNumber.value[index] = responseBody.data as ItemNumberResponse
    }
    return responseBody
  }

  return {
    ItemNumberArray,
    createItemNumber,
    fetchItemNumber,
    fetchItemNumberById,
    updateItemNumber,
    searchItemNumber,
  }
})
