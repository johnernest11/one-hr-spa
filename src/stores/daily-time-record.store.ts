import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store.ts'
import { useApiCall } from '@/composables/network'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { DailyTimeRecordResponse } from '@/typings/models.types'
import { dailyTimeRecordsmockData } from '@/utils/mock-data'

export type DailyTimeRecordPayload = {
  id: number
  date: string
  ut: string | null
  is_edit_ut: boolean | null
  ot: string | null
  is_missing: boolean | null
  employee_remarks: string | null
  hr_remarks: string | null
  warm_bodies: WarmBody[]
}

export type WarmBody = {
  id: number
  employee_id: number
  timestamp: string
  daily_time_record_id: number
  is_in: boolean // true = IN, false = OUT
}

export const useDailyTimeRecordsStore = defineStore('daily-time-records', () => {
  const auth = useAuthStore()
  const dailyTimeRecords = ref<DailyTimeRecordResponse[]>([])
  const selectedDailyTimeRecords = ref<DailyTimeRecordResponse | null>(null)

  const fetchDailyTimeRecords = async (limit = 10, page = 1, status?: string | string[]) => {
    let filteredData = [...dailyTimeRecordsmockData]

    // Normalize status filter
    if (status) {
      const statuses = Array.isArray(status) ? status.map((s) => s.toLowerCase()) : [status.toLowerCase()]

      filteredData = filteredData.filter((item) => statuses.includes(item.status.toLowerCase()))
    }

    const total = filteredData.length
    const start = (page - 1) * limit
    const paginated = filteredData.slice(start, start + limit)

    dailyTimeRecords.value = [...paginated]

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
  const fetchDailyTimeRecordsById = async (id: string) => {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const foundData = dailyTimeRecordsmockData.find((dtr) => dtr.id === parseInt(id))

    const responseBody = {
      success: !!foundData,
      data: foundData || null,
      message: foundData ? 'Data fetched successfully.' : 'Record not found.',
    }

    if (responseBody.success) {
      selectedDailyTimeRecords.value = responseBody.data
    }

    return responseBody
  }

  const createDailyTimeRecords = async (dtr: Partial<DailyTimeRecordPayload>) => {
    const { data } = await useApiCall('/daily-time-records/', auth.authenticationToken).post(dtr).json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      dailyTimeRecords.value.unshift(responseBody.data as DailyTimeRecordResponse)
    }
    return responseBody
  }

  const searchDailyTimeRecords = async (query: string | null) => {
    let uri = '/daily-time-records/search?'
    if (query) uri += `query=${query}`
    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const leaveCreditsList = responseBody.data as DailyTimeRecordResponse[]
      dailyTimeRecords.value = [...leaveCreditsList]
    }
    return responseBody
  }

  const updateDailyTimeRecords = async (dtr: Partial<DailyTimeRecordPayload>, id: string | number) => {
    const { data } = await useApiCall(`/daily-time-records/${id}`, auth.authenticationToken).put(dtr).json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const index = dailyTimeRecords.value.findIndex((dailyTimeRecords) => dailyTimeRecords?.id === id)
      if (index === -1) return responseBody
      dailyTimeRecords.value[index] = responseBody.data as DailyTimeRecordResponse
    }
    return responseBody
  }

  const generateDailyTimeRecords = async (id: string) => {
    const response = await fetch('/mock/Request-Form.docx')
    const blob = await response.blob()
    const fileNameHeader = `Request-Form-${id}.docx`

    return {
      data: ref(blob),
      fileNameHeader: ref(fileNameHeader),
    }
  }

  return {
    dailyTimeRecords,
    createDailyTimeRecords,
    fetchDailyTimeRecords,
    fetchDailyTimeRecordsById,
    searchDailyTimeRecords,
    updateDailyTimeRecords,
    generateDailyTimeRecords,
  }
})
