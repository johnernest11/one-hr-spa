import { defineStore } from 'pinia'
import { useGlobalUiStore } from '@/stores/ui.store.ts'
import { useFetch } from '@vueuse/core'
import { useApiCall } from '@/composables/network'
import { useAuthStore } from '@/stores/auth.store.ts'
import { PersonnelAccomplishmentReportResponse } from '@/typings/models.types.ts'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { ref } from 'vue'
/** Typings for Fecthing All Ccaomplishment Report */
export type PersonnelAccomplishmentReportPayload = {
  period: string | null
  supervisor_notes: string
  status: string
  rows: {
    week_num: string // Consider a more specific type if possible (e.g., number, string)
    dates_in_week: string // Consider a more specific type (e.g., Date[], string[])
    specific_activity: string | null // Consider a more specific type (e.g., string)
    highlights: string | null // Consider a more specific type (e.g., string)
  }[]
}
/** Typings for Creating Accomplishment Report */
export type PersonnelAccomplishmentReportDetailsPayload = {
  week_num: string
  dates_in_week: string
  specific_activity: string | null
  highlights: string | null
}
export const useAccomplishmentReportStore = defineStore('personnel-accomplishment-report', () => {
  const auth = useAuthStore()
  const accomplishment = ref<PersonnelAccomplishmentReportResponse[]>([])
  /** States */
  const accomplishmentReportArray = ref<PersonnelAccomplishmentReportResponse[]>([])
  const selectedAccomplishmentReport = ref<PersonnelAccomplishmentReportResponse | null>(null)
  const fetchAccomplishment = async (limit: number = 10, page: number | null = null) => {
    let uri = `/accomplishment-reports?limit=${limit}&sort=asc&`
    if (page) uri += `page=${page}`
    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const accomplishmentReportsList = Array.isArray(responseBody.data)
        ? (responseBody.data as PersonnelAccomplishmentReportResponse[])
        : []
      accomplishmentReportArray.value = [...accomplishmentReportsList]
    }
    return responseBody
  }
  const fetchAccomplishmentById = async (id: string) => {
    const url = `/accomplishment-reports/${id}`
    const { data } = await useApiCall(url, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      selectedAccomplishmentReport.value = responseBody.data as PersonnelAccomplishmentReportResponse
    }
    return responseBody
  }
  const createAccomplishment = async (accomplishmentReport: Partial<PersonnelAccomplishmentReportPayload>) => {
    const { data } = await useApiCall('/accomplishment-reports/', auth.authenticationToken).post(accomplishmentReport).json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      accomplishment.value.unshift(responseBody.data as PersonnelAccomplishmentReportResponse)
    }
    return responseBody
  }
  const searchAccomplishment = async (query: string | null) => {
    let uri = '/accomplishment-reports/search?'
    if (query) uri += `query=${query}`
    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const accomplishmentReportsList = responseBody.data as PersonnelAccomplishmentReportResponse[]
      accomplishmentReportArray.value = [...accomplishmentReportsList]
    }
    return responseBody
  }
  const updateAccomplishment = async (
    accomplishmentReport: Partial<PersonnelAccomplishmentReportPayload>,
    id: string | number
  ) => {
    const { data } = await useApiCall(`/accomplishment-reports/${id}`, auth.authenticationToken).put(accomplishmentReport).json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const index = accomplishment.value.findIndex((accomplishmentReport) => accomplishmentReport?.id === id)
      if (index === -1) return responseBody
      accomplishment.value[index] = responseBody.data as PersonnelAccomplishmentReportResponse
    }
    return responseBody
  }
  // store.ts
  const generateAccomplishmentReport = async (id: string) => {
    let api_url = `/accomplishment-reports/${id}/generate`

    // Call useFetch and not useApiCall to intercept the response and get the header for the filename of the document
    // The following code copies the structure in network.ts
    // Only added afterFetch() to get the header

    const fileNameHeader = ref<string | null>(null)

    const baseUrl = import.meta.env.VITE_API_ROOT_URL

    // Remove the first char of the uri if it starts with a '/'
    if (api_url.charAt(0) === '/') api_url = api_url.substring(1)

    const { data } = await useFetch(`${baseUrl}/${api_url}`, {
      async beforeFetch({ url, options }) {
        if (!auth.authenticationToken) return { url, options }

        // We add the auth token if the request needs authentication
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${auth.authenticationToken}`,
        }

        return { options, url }
      },
      // Intercept when the auth token expires
      onFetchError(ctx) {
        const authStore = useAuthStore()
        const authToken = authStore.authenticationToken
        if (authToken && ctx?.data?.error_code === 'UNAUTHORIZED_ERROR' && ctx?.response?.status === 401) {
          const authStore = useAuthStore()
          if (authStore.authenticatedUser !== null) authStore.authExpired = true
        }

        // Handle Rate limit
        const globalStore = useGlobalUiStore()
        if (ctx?.response?.status === 429) {
          globalStore.showRateLimitToast = new Date()
        }

        return ctx
      },
      updateDataOnError: true,
      afterFetch(ctx) {
        // Get Content-Disposition header to get the filename
        if (ctx.response && ctx.response.headers) {
          const contentDisposition = ctx.response.headers.get('content-disposition')
          if (contentDisposition) {
            const filenameMatch = /filename="([^"]+)"/.exec(contentDisposition)
            if (filenameMatch && filenameMatch[1]) {
              fileNameHeader.value = filenameMatch[1]
            } else {
              // Alternative regex for filename*
              const filenameMatch2 = /filename\*=UTF-8''([^"]+)/.exec(contentDisposition)
              if (filenameMatch2 && filenameMatch2[1]) {
                fileNameHeader.value = decodeURIComponent(filenameMatch2[1])
              }
            }
          }
        }
        return ctx
      },
    })
      .get()
      .blob() // Parse data as blob

    return { data, fileNameHeader }
  }

  return {
    accomplishmentReportArray,
    createAccomplishment,
    fetchAccomplishment,
    fetchAccomplishmentById,
    updateAccomplishment,
    searchAccomplishment,
    generateAccomplishmentReport,
  }
})
