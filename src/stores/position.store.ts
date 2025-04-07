import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApiCall } from '@/composables/network.ts'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { WbAutoCompleteOption } from '@/components/webkit/WbAutoComplete.vue'
import { PositionResponse } from '@/typings/models.types.ts'
import { useAuthStore } from '@/stores/auth.store.ts'

export const usePositionStore = defineStore('position', () => {
  const authStore = useAuthStore()
  /** States */
  const positionOptions = ref<WbAutoCompleteOption[]>([])
  const positionOptionsIsLoading = ref(false)
  /** Actions */
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

  const searchPosition = async (query: string | null) => {
    // Early return if query is null or empty
    if (!query) {
      positionOptions.value = []
      positionOptionsIsLoading.value = false
      return []
    }

    positionOptionsIsLoading.value = true
    let uri = '/libraries/positions/search?'
    if (query) uri += `query=${query}`
    let filteredPositions: PositionResponse[] = [] // Initialize filtered results

    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const res: ApiResponseBody = data.value

    if (res.success && Array.isArray(res.data)) {
      // Filter the positions
      const normalizedQuery = query.toLowerCase()
      filteredPositions = res.data.filter(
        (position) =>
          (position.id && position.title.toLowerCase().includes(normalizedQuery)) ||
          (position.id && position.parenthetical_title && position.parenthetical_title.toLowerCase().includes(normalizedQuery))
      )
      // Append filtered results to existing options
      positionOptions.value = [
        ...positionOptions.value,
        ...filteredPositions.map((position: PositionResponse) => {
          const label = position.parenthetical_title ? `${position.title} (${position.parenthetical_title})` : position.title
          return { value: position.id, label }
        }),
      ]
    } else {
      positionOptions.value = []
    }

    return filteredPositions
  }

  return {
    positionOptions,
    fetchPositions,
    searchPosition,
    positionOptionsIsLoading,
  }
})
