import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store.ts'
import { useApiCall } from '@/composables/network'
import { useFetchBlob } from '@/composables/fetch.blob'
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
    is_in: boolean
  }[]
}

export type UpdateDTRPayload = {
  id?: number | null
  month: string
  dtr: {
    id?: number | null
    employee_remarks?: string
    ut?: number | null
    time_logs?: {
      id?: number | null
      date: string
      scanned_time: string
      is_selected: boolean
    }[]
    date?: string
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

  const updateDailyTimeRecordInfo = reactive<UpdateDTRPayload>({
    id: 0,
    month: '',
    dtr: [],
  })

  const fetchDailyTimeRecordsByMonth = async (date: Date, limit = 31, employeeId?: string | number) => {
    const auth = useAuthStore()

    // Use passed employeeId, fallback to authenticated user
    const id = employeeId ?? auth.authenticatedUser.user_profile?.individual_basic_detail?.employee?.id

    if (!id) {
      throw new Error('No employee ID provided or linked to the current user.')
    }

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const formattedMonthYear = `${year}-${month}`

    const uri = `/employees/${id}/daily-time-records/view-dtr?limit=${limit}&month=${formattedMonthYear}`

    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success && Array.isArray(responseBody.data)) {
      viewDailyTimeRecords.value = responseBody.data as ViewDailyTimeRecordResponse[]
    }

    return responseBody
  }

  const fetchDailyTimeRecordsByEmployee = async (employeeId: string | number) => {
    if (!employeeId) throw new Error('Employee ID is required.')
    const uri = `/employees/${employeeId}/daily-time-records/view-dtr?start_date=1900-01-01&end_date=2100-12-31&sort=asc`
    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      const dailyTimeRecordList = Array.isArray(responseBody.data) ? (responseBody.data as DailyTimeRecordResponse[]) : []
      dailyTimeRecords.value = [...dailyTimeRecordList]
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

  const createDailyTimeRecords = async (dtr: Partial<DailyTimeRecordPayload>) => {
    const { data } = await useApiCall('/daily-time-records/', auth.authenticationToken).post(dtr).json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      dailyTimeRecords.value.unshift(responseBody.data as DailyTimeRecordResponse)
    }
    return responseBody
  }

  const searchDailyTimeRecordsByMonthQuery = async (query: string | null) => {
    const now = new Date()

    if (!query?.trim()) {
      throw new Error('Please enter a valid month or format (e.g. "2025-10" or "October 2025").')
    }

    const q = query.toLowerCase().trim()
    const months = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december',
    ]

    let year = now.getFullYear()
    let month = now.getMonth()
    let matched = false

    const iso = q.match(/^(19|20)\d{2}-(0[1-9]|1[0-2])$/)
    if (iso) {
      const [y, m] = q.split('-')
      matched = true
      return fetchDailyTimeRecordsByMonth(new Date(+y, +m - 1))
    }

    const y = q.match(/\b(19|20)\d{2}\b/)
    if (y) {
      year = +y[0]
      matched = true
    }

    const mi = months.findIndex((m) => q.includes(m))
    if (mi !== -1) {
      month = mi
      matched = true
    } else {
      const num = q.match(/(?:^|\D)(0?[1-9]|1[0-2])(?:\D|$)/)
      if (num) {
        month = +num[1] - 1
        matched = true
      }
    }

    if (!matched) {
      throw new Error('Invalid search query. Please use "YYYY-MM" or a month name (e.g., "October 2025").')
    }

    return fetchDailyTimeRecordsByMonth(new Date(year, month))
  }

  const updateDailyTimeRecords = async (payload: UpdateDTRPayload) => {
    const individual = auth.authenticatedUser.user_profile?.individual_basic_detail as PersonnelResponse
    if (!individual?.employee) throw new Error('No employee linked')

    const uri = `/employees/${individual.employee.id}/daily-time-records`
    const { data } = await useApiCall(uri, auth.authenticationToken).put(payload).json()

    return data.value as ApiResponseBody
  }

  const generateDailyTimeRecords = async (employeeId: string, startDate: string, endDate: string) => {
    const fallbackEmployeeId = auth.authenticatedUser.user_profile?.individual_basic_detail?.employee?.id?.toString()

    const finalEmployeeId = employeeId || fallbackEmployeeId
    if (!finalEmployeeId) throw new Error('No employee id provided')

    const api_url = `/employees/${finalEmployeeId}/daily-time-records/generate-dtr?start_date=${startDate}&end_date=${endDate}&sort=asc`

    const { data, fileNameHeader } = await useFetchBlob(api_url, auth.authenticationToken)
    return { data, fileNameHeader }
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

  const searchTimeLogs = async (
    query: string,
    is_my_profile: boolean,
    date: string | null,
    limit: number = 5,
    page: number = 1
  ) => {
    let uri = `/employees/daily-time-records/time-logs/search?limit=${limit}&page=${page}&`

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

  const getLastTimeLog = async () => {
    const individual = auth.authenticatedUser.user_profile?.individual_basic_detail as PersonnelResponse
    if (!individual?.employee) throw new Error('No employee linked')

    const uri = `/employees/${individual.employee.id}/daily-time-records/last-time-log`
    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    return responseBody
  }

  return {
    dailyTimeRecords,
    dailyTimeRecordInfo,
    viewDailyTimeRecords,
    updateDailyTimeRecordInfo,
    createDailyTimeRecords,
    fetchDailyTimeRecords,
    fetchDailyTimeRecordsByMonth,
    fetchDailyTimeRecordsByEmployee,
    searchDailyTimeRecordsByMonthQuery,
    updateDailyTimeRecords,
    generateDailyTimeRecords,
    viewTimeLogs,
    countTimeLogs,
    fetchTimeLogsForToday,
    fetchCountWarmBodies,
    searchTimeLogs,
    getLastTimeLog,
  }
})
