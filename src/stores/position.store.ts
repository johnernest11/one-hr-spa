import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApiCall } from '@/composables/network.ts'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { WbAutoCompleteOption } from '@/components/webkit/WbAutoComplete.vue'
import { PositionResponse } from '@/typings/models.types.ts'
import { useAuthStore } from '@/stores/auth.store.ts'

export type PositionPayload = {
  title: string
  parenthetical_title: string
  level: '1st' | '2nd' | '3rd' | null
}

export const usePositionStore = defineStore('position', () => {
  const authStore = useAuthStore()
  const position = ref<PositionResponse[]>([])
  /** States */
  const positionOptions = ref<WbAutoCompleteOption[]>([])
  const positionOptionsIsLoading = ref(false)
  /** Actions */

  const createPosition = async (user: Partial<PositionPayload>) => {
    const { data } = await useApiCall('/users/', authStore.authenticationToken).post(user).json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      // Add new user to the beginning of the list
      position.value.unshift(responseBody.data as PositionResponse)
    }

    return responseBody
  }

  const fetchPositions = async () => {
    if (positionOptions.value.length > 0) return null

    const uri = '/libraries/positions'

    positionOptionsIsLoading.value = true
    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const res: ApiResponseBody = data.value

    if (res.success) {
      positionOptions.value = []
      const positionsListResponse = res.data as PositionResponse[]

      positionsListResponse.forEach((position: PositionResponse) => {
        // Combine title and parenthetical_title into the label
        const label = position.parenthetical_title ? `${position.title} (${position.parenthetical_title})` : position.title
        positionOptions.value.push({ value: position.id, label })
      })
    }
    positionOptionsIsLoading.value = false
    return res
  }

  const fetchListPosition = async (limit: number = 15, page: number | null = null) => {
    let uri = `/libraries/positions?limit=${limit}&sort=asc`
    if (page) uri += `&page=${page}`

    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      const usersList = responseBody.data as PositionResponse[]
      position.value = [...usersList]
    }

    return responseBody
  }

  const searchPosition = async (query: string | null) => {
    let uri = '/libraries/positions/search?'
    if (query) uri += `query=${query}`

    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const res: ApiResponseBody = data.value

    if (res.success && Array.isArray(res.data)) {
      const positionsListResponse = res.data as PositionResponse[]
      positionOptions.value = positionsListResponse.map((position: PositionResponse) => {
        return {
          value: position.id,
          label: position.parenthetical_title ? `${position.title} (${position.parenthetical_title})` : position.title,
        }
      })
    } else {
      positionOptions.value = []
    }
    return positionOptions.value
  }

  const searchListPosition = async (query: string | null) => {
    let uri = '/libraries/positions/search?'
    if (query) uri += `query=${query}`

    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      const usersList = responseBody.data as PositionResponse[]
      position.value = [...usersList]
    }

    return responseBody
  }

  return {
    position,
    positionOptions,
    createPosition,
    fetchPositions,
    fetchListPosition,
    searchPosition,
    searchListPosition,
    positionOptionsIsLoading,
  }
})
