import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApiCall } from '@/composables/network.ts'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { WbAutoCompleteOption } from '@/components/webkit/WbAutoComplete.vue'
import { FundSourceResponse } from '@/typings/models.types.ts'
import { useAuthStore } from '@/stores/auth.store.ts'

export const useFundSourceStore = defineStore('fund_source', () => {
  /** States */
  const fundSourceOptions = ref<WbAutoCompleteOption[]>([])
  const fundSourceOptionsIsLoading = ref(false)
  const authStore = useAuthStore()
  /** Actions */
  const fetchFundSources = async () => {
    if (fundSourceOptions.value.length > 0) return null
    const uri = '/libraries/fund-sources'
    fundSourceOptionsIsLoading.value = true
    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
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

  const searchFundSources = async (query: string | null) => {
    // Early return if query is null or empty
    if (!query) {
      fundSourceOptions.value = []
      fundSourceOptionsIsLoading.value = false
      return []
    }

    fundSourceOptionsIsLoading.value = true
    let uri = '/libraries/fund-sources/search?'
    if (query) uri += `query=${query}`
    let filteredFundSources: FundSourceResponse[] = [] // Initialize filtered results

    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const res: ApiResponseBody = data.value

    if (res.success && Array.isArray(res.data)) {
      // Filter the positions
      const normalizedQuery = query.toLowerCase()
      filteredFundSources = res.data.filter(
        (fundSource) =>
          fundSource.name.toLowerCase().includes(normalizedQuery) ||
          (fundSource.id && fundSource.name.toLowerCase().includes(normalizedQuery))
      )
      // Append filtered results to existing options
      fundSourceOptions.value = [
        ...fundSourceOptions.value,
        ...filteredFundSources.map((fundSource: FundSourceResponse) => {
          const label = fundSource.name ? `${fundSource.name}` : fundSource.name
          return { value: fundSource.id, label }
        }),
      ]
    } else {
      fundSourceOptions.value = []
    }

    return filteredFundSources
  }
  return {
    fundSourceOptions,
    fetchFundSources,
    searchFundSources,
    fundSourceOptionsIsLoading,
  }
})
