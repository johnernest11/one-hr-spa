import { defineStore } from 'pinia'
import { useApiCall } from '@/composables/network'
import { useFetchBlob } from '@/composables/fetch.blob'
import { useAuthStore } from '@/stores/auth.store.ts'
import { PersonnelCompensatoryDayOffResponse } from '@/typings/models.types.ts'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { ref } from 'vue'
/** Typings for Fecthing All Compensatory CTDO Report */
export type PersonnelCompensatoryTimeOffPayload = {
  ctdo_period: string | null
  ctdo_supervisor_notes: string
  ctdo_status: string
  rows: {
    days_of_the_week: string
    work_date: string
    time_start: string | null
    time_end: string | null
    accomplishment: string | null
    authorized_claim: string | null
  }[]
}
/** Typings for Creating Compensatory CTDO Report Report */
export type PersonnelCompensatoryTimeOffDetailsPayload = {
  days_of_the_week: string
  work_date: string
  time_start: string | null
  time_end: string | null
  accomplishment: string | null
  authorized_claim: string | null
}
export const useCompensatoryTimeOffStore = defineStore('personnel-compensatory-time-day-off', () => {
  const auth = useAuthStore()
  const compensatory = ref<PersonnelCompensatoryDayOffResponse[]>([])
  /** States */
  const compensatoryDayOffArray = ref<PersonnelCompensatoryDayOffResponse[]>([])
  const selectedCompensatoryDayOff = ref<PersonnelCompensatoryDayOffResponse | null>(null)
  const fetchCompensatory = async (limit: number = 10, page: number | null = null) => {
    let uri = `/compensatory-day-time-offs?limit=${limit}&sort=asc&`
    if (page) uri += `page=${page}`
    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const compensatoryDayOffList = Array.isArray(responseBody.data)
        ? (responseBody.data as PersonnelCompensatoryDayOffResponse[])
        : []
      compensatoryDayOffArray.value = [...compensatoryDayOffList]
    }
    return responseBody
  }
  const fetchCompensatoryById = async (id: string) => {
    const url = `/compensatory-day-time-offs/${id}`
    const { data } = await useApiCall(url, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      selectedCompensatoryDayOff.value = responseBody.data as PersonnelCompensatoryDayOffResponse
    }
    return responseBody
  }
  const createCompensatory = async (compensatoryDayOff: Partial<PersonnelCompensatoryTimeOffPayload>) => {
    const { data } = await useApiCall('/compensatory-day-time-offs/', auth.authenticationToken).post(compensatoryDayOff).json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      compensatory.value.unshift(responseBody.data as PersonnelCompensatoryDayOffResponse)
    }
    return responseBody
  }
  const searchCompensatory = async (query: string | null) => {
    let uri = '/compensatory-day-time-offs/search?'
    if (query) uri += `query=${query}`
    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const compensatoryDayOffsList = responseBody.data as PersonnelCompensatoryDayOffResponse[]
      compensatoryDayOffArray.value = [...compensatoryDayOffsList]
    }
    return responseBody
  }
  const updateCompensatory = async (compensatoryTimeOff: Partial<PersonnelCompensatoryTimeOffPayload>, id: string | number) => {
    const { data } = await useApiCall(`/compensatory-day-time-offs/${id}`, auth.authenticationToken)
      .put(compensatoryTimeOff)
      .json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const index = compensatory.value.findIndex((compensatoryTimeOff) => compensatoryTimeOff?.id === id)
      if (index === -1) return responseBody
      compensatory.value[index] = responseBody.data as PersonnelCompensatoryDayOffResponse
    }
    return responseBody
  }
  // store.ts
  const generateCompensatory = async (id: string) => {
    const api_url = `/compensatory-day-time-offs/${id}/generate`

    const { data, fileNameHeader } = await useFetchBlob(api_url, auth.authenticationToken)
    return { data, fileNameHeader }
  }

  return {
    compensatoryDayOffArray,
    createCompensatory,
    fetchCompensatory,
    fetchCompensatoryById,
    updateCompensatory,
    searchCompensatory,
    generateCompensatory,
  }
})
