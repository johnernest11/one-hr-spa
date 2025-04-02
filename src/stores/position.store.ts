import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApiCall } from '@/composables/network.ts'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { WbAutoCompleteOption } from '@/components/webkit/WbAutoComplete.vue'
import { PositionResponse } from '@/typings/models.types.ts'

export const usePositionStore = defineStore('position', () => {
  /** States */
  const positionOptions = ref<WbAutoCompleteOption[]>([])
  const positionOptionsIsLoading = ref(false)

  /** Actions */
  const fetchPositions = async () => {
    if (positionOptions.value.length > 0) return null

    positionOptionsIsLoading.value = true
    const { data } = await useApiCall('/libraries/positions').get().json()
    const res: ApiResponseBody = data.value

    if (res.success) {
      positionOptions.value = []
      const positionsListResponse = res.data as PositionResponse[]
      positionsListResponse.forEach((position: PositionResponse) => {
        positionOptions.value.push({ value: position.id, label: position.title })
      })
    }

    positionOptionsIsLoading.value = false

    return res
  }

  return {
    positionOptions,
    fetchPositions,
    positionOptionsIsLoading,
  }
})
