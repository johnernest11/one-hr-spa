import { defineStore } from 'pinia'
import { useApiCall } from '@/composables/network'
import { useAuthStore } from '@/stores/auth.store.ts'
import { PersonnelAccomplishmentReportResponse, UserResponse } from '@/typings/models.types.ts'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { ref } from 'vue'

/** Typings for Fecthing All Ccaomplishment Report */
export type PersonnelAccomplishmentReportPayload = {
  period: string | null
  supervisor_notes: string
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
  const users = ref<UserResponse[]>([])
  /** States */
  const accomplishmentReport = ref<PersonnelAccomplishmentReportResponse[]>([])

  const fetchAccomplishment = async (limit: number = 10, page: number | null = null) => {
    let uri = `/accomplishment-report?limit=${limit}&sort=asc&`
    if (page) uri += `page=${page}`

    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      const accomplishmentList = Array.isArray(responseBody.data)
        ? (responseBody.data as PersonnelAccomplishmentReportResponse[])
        : responseBody.data
          ? [responseBody.data as PersonnelAccomplishmentReportResponse]
          : []

      accomplishmentReport.value = [...accomplishmentList]
    }

    return responseBody
  }

  const createAccomplishment = async (accomplishmentReport: Partial<PersonnelAccomplishmentReportPayload>) => {
    const { data } = await useApiCall('/accomplishment-report/', auth.authenticationToken).post(accomplishmentReport).json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      users.value.unshift(responseBody.data as UserResponse)
    }

    return responseBody
  }

  const searchAccomplishment = async (query: string | null) => {
    let uri = '/accomplishment-report/search?'
    if (query) uri += `query=${query}`

    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      const usersList = responseBody.data as PersonnelAccomplishmentReportResponse[]
      accomplishmentReport.value = [...usersList]
    }

    return responseBody
  }

  const updateAccomplishment = async (
    accomplishmentReport: Partial<PersonnelAccomplishmentReportPayload>,
    id: string | number
  ) => {
    const { data } = await useApiCall(`/accomplishment-report/${id}`, auth.authenticationToken).put(accomplishmentReport).json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      const index = users.value.findIndex((accomplishmentReport) => accomplishmentReport?.id === id)
      if (index === -1) return responseBody
      users.value[index] = responseBody.data as UserResponse
    }

    return responseBody
  }

  return {
    accomplishmentReport,
    createAccomplishment,
    fetchAccomplishment,
    updateAccomplishment,
    searchAccomplishment,
  }
})
