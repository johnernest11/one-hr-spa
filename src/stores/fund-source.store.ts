import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApiCall } from '@/composables/network.ts'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { WbAutoCompleteOption } from '@/components/webkit/WbAutoComplete.vue'
import { FundSourceResponse } from '@/typings/models.types.ts'

export const useFundSourceStore = defineStore('fund_source', () => {
  /** States */
  const fundSourceOptions = ref<WbAutoCompleteOption[]>([])
  const fundSourceOptionsIsLoading = ref(false)

  /** Actions */
  const fetchFundSources = async () => {
    if (fundSourceOptions.value.length > 0) return null

    fundSourceOptionsIsLoading.value = true
    const { data } = await useApiCall('/libraries/fund_sources').get().json()
    const res: ApiResponseBody = data.value

    if (res.success) {
      fundSourceOptions.value = []
      const fundSourcesListResponse = res.data as FundSourceResponse[]
      fundSourcesListResponse.forEach((position: FundSourceResponse) => {
        fundSourceOptions.value.push({ value: position.id, label: position.name })
      })
    }

    fundSourceOptionsIsLoading.value = false

    return res
  }

  return {
    fundSourceOptions,
    fetchFundSources,
    fundSourceOptionsIsLoading,
  }
})
