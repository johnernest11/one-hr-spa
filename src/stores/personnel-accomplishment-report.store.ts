import { defineStore } from 'pinia'
import { useApiCall } from '@/composables/network'
import { useFetchBlob } from '@/composables/fetch.blob'
import { useAuthStore } from '@/stores/auth.store.ts'
import { PersonnelAccomplishmentReportResponse } from '@/typings/models.types.ts'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { ref } from 'vue'

export type PersonnelAccomplishmentReportPayload = {
  period: string | null
  supervisor_notes: string
  status: string
  rows: {
    week_num: string
    dates_in_week: string
    specific_activity: string | null
    highlights: string | null
  }[]
}

export const useAccomplishmentReportStore = defineStore('personnel-accomplishment-report', () => {
  /** States */
  const auth = useAuthStore()
  const accomplishment = ref<PersonnelAccomplishmentReportResponse[]>([])
  const fectchAccomplishmentReportId = ref<PersonnelAccomplishmentReportResponse | null>(null)

  const fetchAccomplishment = async (limit: number = 10, page: number | null = null, status?: string) => {
    let uri = `/accomplishment-reports?limit=${limit}&sort=asc&`
    if (page) uri += `page=${page}`
    if (status) uri += `&status=${encodeURIComponent(status)}`
    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const accomplishmentReportsList = Array.isArray(responseBody.data)
        ? (responseBody.data as PersonnelAccomplishmentReportResponse[])
        : []
      accomplishment.value = [...accomplishmentReportsList]
    }
    return responseBody
  }

  const fetchAccomplishmentById = async (id: string) => {
    const url = `/accomplishment-reports/${id}`
    const { data } = await useApiCall(url, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      fectchAccomplishmentReportId.value = responseBody.data as PersonnelAccomplishmentReportResponse
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

  const searchAccomplishment = async (query: string | null) => {
    let uri = '/accomplishment-reports/search?'
    if (query) uri += `query=${query}`
    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const accomplishmentReportsList = responseBody.data as PersonnelAccomplishmentReportResponse[]
      accomplishment.value = [...accomplishmentReportsList]
    }
    return responseBody
  }

  const filterAccomplishment = async (status: string | null) => {
    let uri = '/accomplishment-reports'
    if (status) uri += `?status=${encodeURIComponent(status)}`
    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const accomplishmentReportsList = responseBody.data as PersonnelAccomplishmentReportResponse[]
      accomplishment.value = [...accomplishmentReportsList]
    }
    return responseBody
  }

  const generateAccomplishmentReport = async (id: string) => {
    const api_url = `/accomplishment-reports/${id}/generate`

    const { data, fileNameHeader } = await useFetchBlob(api_url, auth.authenticationToken)
    return { data, fileNameHeader }
  }

  return {
    accomplishment,
    createAccomplishment,
    fetchAccomplishment,
    fetchAccomplishmentById,
    updateAccomplishment,
    searchAccomplishment,
    filterAccomplishment,
    generateAccomplishmentReport,
  }
})
