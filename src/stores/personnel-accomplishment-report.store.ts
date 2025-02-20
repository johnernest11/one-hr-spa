import { defineStore } from 'pinia'
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

  const fetchAccomplishmentById = async (roleFilter: string | number | null = null, id: string) => {
    const url = roleFilter ? `/accomplishment-reports/${roleFilter}/${id}` : `/accomplishment-reports/${id}`

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

  return {
    accomplishmentReportArray,
    createAccomplishment,
    fetchAccomplishment,
    fetchAccomplishmentById,
    updateAccomplishment,
    searchAccomplishment,
  }
})
