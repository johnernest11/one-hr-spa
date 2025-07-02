import { defineStore } from 'pinia'
import { useApiCall } from '@/composables/network'
import { useAuthStore } from '@/stores/auth.store.ts'
import { PersonnelCompensatoryDayTimeOffResponse } from '@/typings/models.types.ts'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { compensatorymockData } from '@/utils/mock-data'
import { ref, reactive } from 'vue'
/** Typings for Fecthing All Compensatory CTDO Report */
export type PersonnelCompensatoryTimeOffPayload = {
  ctdo_period: string | null
  ctdo_supervisor_notes: string | null
  ctdo_status: string | null
  rows: {
    days_of_the_week: string | null
    work_date: string | null
    time_start: string | null
    time_end: string | null
    accomplishment: string | null
    authorized_claim: string | null
  }[]
}

export const useCompensatoryTimeOffStore = defineStore('personnel-compensatory-time-day-off', () => {
  const auth = useAuthStore()
  const compensatory = ref<PersonnelCompensatoryDayTimeOffResponse[]>([])
  const selectedCompensatoryDayOff = ref<PersonnelCompensatoryDayTimeOffResponse | null>(null)

  const compensatoryInfo = ref<PersonnelCompensatoryTimeOffPayload>({
    ctdo_period: null,
    ctdo_supervisor_notes: null,
    ctdo_status: null,
    rows: reactive([
      {
        days_of_the_week: null,
        work_date: null,
        time_start: null,
        time_end: null,
        accomplishment: null,
        authorized_claim: null,
      },
    ]),
  })

  const fetchCompensatoryDayTimeOff = async (limit = 10, page = 1, status?: string | string[]) => {
    let filteredData = [...compensatorymockData]

    // Normalize status filter
    if (status) {
      const statuses = Array.isArray(status) ? status.map((s) => s.toLowerCase()) : [status.toLowerCase()]
      filteredData = filteredData.filter((item) => statuses.includes(item.ctdo_status.toLowerCase()))
    }

    const total = filteredData.length
    const start = (page - 1) * limit
    const paginated = filteredData.slice(start, start + limit)

    compensatory.value = [...paginated]

    return {
      success: true,
      data: paginated,
      pagination: {
        current_page: page,
        last_page: Math.ceil(total / limit),
        per_page: limit,
        total,
        from: start + 1,
        to: start + paginated.length,
        first_page_url: '',
        last_page_url: '',
        next_page_url: null,
        previous_page_url: null,
        path: '',
      },
    }
  }

  const fetchCompensatoryDayTimeOffById = async (id: string) => {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const foundData = compensatorymockData.find((item) => item.id === parseInt(id))

    const responseBody = {
      success: !!foundData,
      data: foundData || null,
      message: foundData ? 'Data fetched successfully.' : 'Record not found.',
    }

    if (responseBody.success) {
      selectedCompensatoryDayOff.value = responseBody.data
    }

    return responseBody
  }

  const createCompensatoryDayTimeOff = async (compensatoryDayOff: Partial<PersonnelCompensatoryTimeOffPayload>) => {
    const { data } = await useApiCall('/compensatory-day-time-offs/', auth.authenticationToken).post(compensatoryDayOff).json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      compensatory.value.unshift(responseBody.data as PersonnelCompensatoryDayTimeOffResponse)
    }
    return responseBody
  }

  const searchCompensatoryDayTimeOff = async (query: string | null) => {
    let uri = '/compensatory-day-time-offs/search?'
    if (query) uri += `query=${query}`
    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const compensatoryDayOffsList = responseBody.data as PersonnelCompensatoryDayTimeOffResponse[]
      compensatory.value = [...compensatoryDayOffsList]
    }
    return responseBody
  }

  const updateCompensatoryDayTimeOff = async (
    compensatoryTimeOff: Partial<PersonnelCompensatoryTimeOffPayload>,
    id: string | number
  ) => {
    const { data } = await useApiCall(`/compensatory-day-time-offs/${id}`, auth.authenticationToken)
      .put(compensatoryTimeOff)
      .json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const index = compensatory.value.findIndex((compensatoryTimeOff) => compensatoryTimeOff?.id === id)
      if (index === -1) return responseBody
      compensatory.value[index] = responseBody.data as PersonnelCompensatoryDayTimeOffResponse
    }
    return responseBody
  }

  const filterCompensatoryDayTimeOff = async (ctdo_status: string | null, useMock = false) => {
    if (useMock) {
      // Filter mock data based on ctdo_status if provided
      let filteredData = compensatorymockData
      if (ctdo_status) {
        filteredData = compensatorymockData.filter((item) => item.ctdo_status === ctdo_status)
      }
      // Simulate async behavior
      await new Promise((resolve) => setTimeout(resolve, 300))
      // Update your reactive data
      compensatory.value = [...filteredData]
      return { success: true, data: filteredData }
    }

    // Actual API call
    let uri = '/compensatory-day-time-offs'
    if (ctdo_status) uri += `?ctdo_status=${encodeURIComponent(ctdo_status)}`
    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const accomplishmentReportsList = responseBody.data as PersonnelCompensatoryDayTimeOffResponse[]
      compensatory.value = [...accomplishmentReportsList]
    }
    return responseBody
  }

  const generateCompensatoryDayTimeOff = async (id: string) => {
    const response = await fetch('/mock/Certificate-of-COC-Earned.docx')
    const blob = await response.blob()
    const fileNameHeader = `Certificate-of-COC-Earned-${id}.docx`

    return {
      data: ref(blob),
      fileNameHeader: ref(fileNameHeader),
    }
  }

  return {
    compensatory,
    compensatoryInfo,
    createCompensatoryDayTimeOff,
    fetchCompensatoryDayTimeOff,
    fetchCompensatoryDayTimeOffById,
    updateCompensatoryDayTimeOff,
    searchCompensatoryDayTimeOff,
    filterCompensatoryDayTimeOff,
    generateCompensatoryDayTimeOff,
  }
})
