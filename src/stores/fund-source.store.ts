import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApiCall } from '@/composables/network.ts'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { WbAutoCompleteOption } from '@/components/webkit/WbAutoComplete.vue'
import { FundSourceResponse } from '@/typings/models.types.ts'
import { useAuthStore } from '@/stores/auth.store.ts'

export type FundSourcePayload = {
  name: string
}

export const useFundSourceStore = defineStore('fund-source', () => {
  /** States */
  const fundSourceOptions = ref<WbAutoCompleteOption[]>([])
  const fundSourceOptionsIsLoading = ref(false)
  const authStore = useAuthStore()
  const fundSource = ref<FundSourceResponse[]>([])
  /** Actions */

  const createFundSource = async (user: Partial<FundSourceResponse>) => {
    const { data } = await useApiCall('/libraries/fund-sources/', authStore.authenticationToken).post(user).json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      fundSource.value.unshift(responseBody.data as FundSourceResponse)
    }

    return responseBody
  }

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

  const fetchListFundSources = async (limit: number = 15, page: number | null = null) => {
    let uri = `/libraries/fund-sources?limit=${limit}&sort=asc`
    if (page) uri += `&page=${page}`

    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      const usersList = responseBody.data as FundSourceResponse[]
      fundSource.value = [...usersList]
    }

    return responseBody
  }

  const searchFundSources = async (query: string | null) => {
    let uri = '/libraries/fund-sources/search?'
    if (query) uri += `query=${query}`

    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const res: ApiResponseBody = data.value

    if (res.success && Array.isArray(res.data)) {
      const fundSourcesListResponse = res.data as FundSourceResponse[]
      fundSourceOptions.value = fundSourcesListResponse.map((fundSource: FundSourceResponse) => {
        return { value: fundSource.id, label: fundSource.name }
      })
    } else {
      fundSourceOptions.value = []
    }
    return fundSourceOptions.value
  }

  const searchListFundSource = async (query: string | null) => {
    let uri = '/libraries/fund-sources/search?'
    if (query) uri += `query=${query}`

    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      const usersList = responseBody.data as FundSourceResponse[]
      fundSource.value = [...usersList]
    }

    return responseBody
  }

  return {
    fundSource,
    fundSourceOptions,
    createFundSource,
    fetchFundSources,
    fetchListFundSources,
    searchFundSources,
    searchListFundSource,
    fundSourceOptionsIsLoading,
  }
})
