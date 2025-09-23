import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store.ts'
import { useApiCall } from '@/composables/network'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import {
  CountWarmBodiesResponse,
  DailyTimeRecordResponse,
  PersonnelResponse,
  ViewDailyTimeRecordResponse,
  ViewTimeLogsResponse,
} from '@/typings/models.types'

export type DailyTimeRecordPayload = {
  id: number
  date: string
  ut: string | null
  is_edit_ut: boolean | null
  ot: string | null
  is_missing: boolean | null
  employee_remarks: string | null
  hr_remarks: string | null
  status: string | null
  warm_bodies: {
    employee_id?: string | number | null
    timestamp: string
    daily_time_record_id: number
    is_in: boolean // true = IN, false = OUT
  }[]
}

export type ViewWarmBodiesPayload = {
  division: number | null
  section: number | null
}

export const useDailyTimeRecordsStore = defineStore('daily-time-records', () => {
  const auth = useAuthStore()
  const dailyTimeRecords = ref<DailyTimeRecordResponse[]>([])
  const viewTimeLogs = ref<ViewTimeLogsResponse[]>([])
  const viewDailyTimeRecords = ref<ViewDailyTimeRecordResponse[]>([])
  const countTimeLogs = ref<CountWarmBodiesResponse[]>([])
  const selectedDailyTimeRecords = ref<DailyTimeRecordResponse | null>(null)

  const dailyTimeRecordInfo = reactive<DailyTimeRecordPayload>({
    id: 0,
    date: '',
    ut: null,
    is_edit_ut: null,
    ot: null,
    is_missing: null,
    employee_remarks: null,
    hr_remarks: null,
    status: null,
    warm_bodies: [],
  })

  const fetchDailyTimeRecordsByMonth = async (date: Date, limit = 31) => {
    const individual = auth.authenticatedUser.user_profile?.individual_basic_detail as PersonnelResponse
    if (!individual) {
      throw new Error('The current user has no individual basic detail linked to it.')
    }

    if (!individual.employee) {
      throw new Error('The current user has no employee data linked to it.')
    }

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const formattedMonthYear = `${year}-${month}`

    let uri = `/employees/${individual.employee?.id}/daily-time-records/view-dtr?limit=${limit}&`
    if (formattedMonthYear) uri += `month=${formattedMonthYear}&`

    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success && Array.isArray(responseBody.data)) {
      viewDailyTimeRecords.value = []
      viewDailyTimeRecords.value = responseBody.data as ViewDailyTimeRecordResponse[]
    }

    return responseBody
  }

  const fetchDailyTimeRecords = async () => {
    const individual = auth.authenticatedUser.user_profile?.individual_basic_detail as PersonnelResponse
    if (!individual?.employee) {
      throw new Error('No employee data linked to current user')
    }

    const uri = `/employees/${individual.employee.id}/daily-time-records/view-dtr?start_date=1900-01-01&end_date=2100-12-31&sort=asc`

    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      const dailyTimeRecordList = Array.isArray(responseBody.data) ? (responseBody.data as DailyTimeRecordResponse[]) : []
      dailyTimeRecords.value = [...dailyTimeRecordList]
    }
    return responseBody
  }

  const fetchDailyTimeRecordsById = async (id: string) => {
    const individual = auth.authenticatedUser.user_profile?.individual_basic_detail as PersonnelResponse
    if (!individual?.employee) {
      throw new Error('No employee data linked to current user')
    }
    const url = `/employees/${individual.employee.id}/daily-time-records/${id}`
    const { data } = await useApiCall(url, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      selectedDailyTimeRecords.value = responseBody.data as DailyTimeRecordResponse
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

  const fetchTimeLogsForToday = async (
    limit: number = 5,
    page: number = 1,
    division: number | null = null,
    section: number | null = null
  ) => {
    let uri = `/employees/daily-time-records/warm-bodies/today?limit=${limit}&page=${page}&`
    if (division) uri += `division=${division}&`
    if (section) uri += `section=${section}`

    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success && Array.isArray(responseBody.data)) {
      viewTimeLogs.value = []
      viewTimeLogs.value = responseBody.data as ViewTimeLogsResponse[]
    }

    return responseBody
  }

  const fetchCountWarmBodies = async () => {
    const uri = '/employees/daily-time-records/warm-bodies/count'
    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      countTimeLogs.value = []
      countTimeLogs.value.unshift(responseBody.data as CountWarmBodiesResponse)
      console.log(countTimeLogs.value)
    }
    return responseBody
  }

  const searchTimeLogs = async (query: string, is_my_profile: boolean, date: string | null, limit: number = 5) => {
    let uri = `/employees/daily-time-records/time-logs/search?limit=${limit}&`
    if (query && is_my_profile) uri += `query=${query}&is_my_profile=${+is_my_profile}&`
    if (date) uri += `date=${date}`
    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      viewTimeLogs.value = []
      viewTimeLogs.value.unshift(responseBody.data as ViewTimeLogsResponse)
      console.log(viewTimeLogs.value)
    }
    return responseBody
  }

  return {
    dailyTimeRecords,
    dailyTimeRecordInfo,
    createDailyTimeRecords,
    fetchDailyTimeRecords,
    fetchDailyTimeRecordsByMonth,
    viewDailyTimeRecords,
    fetchDailyTimeRecordsById,
    searchDailyTimeRecords,
    updateDailyTimeRecords,
    generateDailyTimeRecords,
    viewTimeLogs,
    fetchTimeLogsForToday,
    countTimeLogs,
    fetchCountWarmBodies,
    searchTimeLogs,
  }
})
