import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useStorage } from '@vueuse/core'
import { useApiCall } from '@/composables/network.ts'
import { useAuthStore } from '@/stores/auth.store'
import type { ApiResponseBody, WarmBodyLogEntry, DailyLogEntry } from '@/typings/http-resources.types.ts'
import type { ScannedEmployeeResponse } from '@/typings/models.types'
import { getManilaTodayISO } from '@/utils/helpers.ts'
import defaultLogoMark from '@/assets/image/DSWD logo_Mark.png'

/** Interfaces */
interface DivisionSectionSummary {
  name: string
  count: number
  in_office_count?: number
  out_of_office_count?: number
}

interface WarmBodySummary {
  date: string
  total_employees: number
  in_office: number
  out_of_office: number
  per_division: DivisionSectionSummary[]
  per_section: DivisionSectionSummary[]
}

interface TimeLogEntry {
  dtr_date: string
  time_log_id: number
  is_in: boolean
  scanned_time: string
  time_log_date: string
  id_number: string
  first_name: string
  middle_name: string | null
  last_name: string
  ext_name: string | null
  division_name: string
  section_name: string
}

export const useDailyLogsStore = defineStore('dailyLogs', () => {
  const authStore = useAuthStore()
  const timelogOfficeId = useStorage<string | null>('timelogOfficeId', null)
  const dailyLogs = ref<DailyLogEntry[]>([])
  const currentScannedEmployee = ref<ScannedEmployeeResponse | null>(null)
  const lastLogMessage = ref<string | null>(null)
  const warmBodySummary = ref<WarmBodySummary | null>(null)

  const countIn = computed(
    () => (date: string) => dailyLogs.value.find((l) => l.date === date)?.warm_bodies.filter((wb) => wb.is_in).length ?? 0
  )

  const countOut = computed(
    () => (date: string) => dailyLogs.value.find((l) => l.date === date)?.warm_bodies.filter((wb) => !wb.is_in).length ?? 0
  )

  const getTodayWarmBodies = computed(
    () => (date: string) =>
      dailyLogs.value.find((l) => l.date === date)
        ? [...dailyLogs.value.find((l) => l.date === date)!.warm_bodies].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        : []
  )

  const logEmployeeTime = async (rawQrText: string, capturedImage: string | null) => {
    currentScannedEmployee.value = null
    lastLogMessage.value = null

    try {
      const payload = { scanned_qr: rawQrText, captured_image: capturedImage }
      const { data, error } = await useApiCall('employees/log-time', authStore.authenticationToken).post(payload).json()

      if (error.value) {
        lastLogMessage.value = error.value.message || 'Network error. Please try again.'
        return { success: false, message: lastLogMessage.value, data: null }
      }

      const responseBody: ApiResponseBody = data.value
      if (!responseBody.success) {
        lastLogMessage.value = responseBody.error_message || responseBody.message || 'Failed to log time.'
        return { success: false, message: lastLogMessage.value, data: null }
      }

      lastLogMessage.value = responseBody.message || 'Time logged successfully.'
      const warmBodyLog = responseBody.data as WarmBodyLogEntry
      const employeeDetails = warmBodyLog?.daily_time_record?.employee?.individual_basic_detail
      const employeeItem = warmBodyLog?.daily_time_record?.employee?.item

      if (!employeeDetails || !employeeItem) {
        lastLogMessage.value = 'Incomplete employee details.'
        return { success: false, message: lastLogMessage.value, data: null }
      }

      currentScannedEmployee.value = {
        id: warmBodyLog.daily_time_record.employee.id_number || 'N/A',
        name: `${employeeDetails.first_name || ''} ${employeeDetails.last_name || ''}`.trim() || 'N/A',
        position: employeeItem.position?.title || 'N/A',
        is_in: warmBodyLog.is_in,
        timestamp: warmBodyLog.created_at || new Date().toISOString(),
        photo_url:
          employeeDetails.user_profile?.profile_picture_url?.trim() !== ''
            ? employeeDetails.user_profile.profile_picture_url
            : defaultLogoMark,
      }

      const today = getManilaTodayISO()
      void fetchWarmBodySummary(today)
      void fetchDailyLogs(today)

      return { success: true, message: lastLogMessage.value, data: currentScannedEmployee.value }
    } catch (err) {
      lastLogMessage.value = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unexpected error occurred.'
      return { success: false, message: lastLogMessage.value, data: null }
    }
  }

  const clearScannedEmployee = () => {
    currentScannedEmployee.value = null
    lastLogMessage.value = null
  }

  const fetchDailyLogs = async (date: string) => {
    try {
      const { data, error } = await useApiCall(
        `employees/daily-time-records/time-logs?date=${date}`,
        authStore.authenticationToken
      )
        .get()
        .json()

      if (error.value) return { success: false, message: error.value.message }

      const responseBody: ApiResponseBody = data.value
      if (!responseBody.success || !Array.isArray(responseBody.data)) {
        updateDailyLogs(date, [])
        return responseBody
      }

      const mappedLogs = (responseBody.data as TimeLogEntry[]).map((log) => ({
        employee_id: log.id_number,
        timestamp: `${log.time_log_date}T${log.scanned_time}`,
        is_in: log.is_in,
        id: log.time_log_id,
        daily_time_record_id: undefined,
      }))

      updateDailyLogs(date, mappedLogs)
      return { success: true, message: responseBody.message }
    } catch {
      updateDailyLogs(date, [])
      return { success: false, message: 'Failed to fetch daily logs.' }
    }
  }

  const fetchWarmBodySummary = async (date: string) => {
    try {
      const { data, error } = await useApiCall(
        `/employees/daily-time-records/warm-bodies/count?date=${date}`,
        authStore.authenticationToken
      )
        .get()
        .json()

      if (error.value) {
        warmBodySummary.value = null
        return { success: false, message: error.value.message }
      }

      const responseBody: ApiResponseBody = data.value
      warmBodySummary.value = responseBody.success ? (responseBody.data as WarmBodySummary) : null
      return responseBody
    } catch {
      warmBodySummary.value = null
      return { success: false, message: 'Failed to fetch warm body summary.' }
    }
  }

  const updateDailyLogs = (date: string, logs: WarmBodyLogEntry[]) => {
    const logEntry = dailyLogs.value.find((l) => l.date === date)
    if (logEntry) {
      logEntry.warm_bodies = logs
    } else {
      dailyLogs.value.push({ date, warm_bodies: logs })
    }
  }

  return {
    timelogOfficeId,
    dailyLogs,
    currentScannedEmployee,
    lastLogMessage,
    warmBodySummary,
    countIn,
    countOut,
    getTodayWarmBodies,
    logEmployeeTime,
    clearScannedEmployee,
    fetchDailyLogs,
    fetchWarmBodySummary,
  }
})
