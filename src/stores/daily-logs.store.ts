import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useApiCall } from '@/composables/network.ts'
import { useAuthStore } from '@/stores/auth.store'
import type { ApiResponseBody, WarmBodyLogEntry, DailyLogEntry } from '@/typings/http-resources.types.ts'
import type { ScannedEmployeeResponse } from '@/typings/models.types'
import { getManilaTodayISO } from '@/utils/helpers.ts'

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

  const dailyLogs = ref<DailyLogEntry[]>([])
  const currentScannedEmployee = ref<ScannedEmployeeResponse | null>(null)
  const lastLogMessage = ref<string | null>(null)
  const warmBodySummary = ref<WarmBodySummary | null>(null)

  const countIn = computed(() => (date: string) => {
    const log = dailyLogs.value.find((l) => l.date === date)
    return log ? log.warm_bodies.filter((wb) => wb.is_in).length : 0
  })

  const countOut = computed(() => (date: string) => {
    const log = dailyLogs.value.find((l) => l.date === date)
    return log ? log.warm_bodies.filter((wb) => !wb.is_in).length : 0
  })

  const getTodayWarmBodies = computed(() => (date: string) => {
    const log = dailyLogs.value.find((l) => l.date === date)
    return log ? [...log.warm_bodies].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) : []
  })

  const logEmployeeTime = async (rawQrText: string) => {
    currentScannedEmployee.value = null
    lastLogMessage.value = null

    const payload = {
      scanned_qr: rawQrText,
    }

    try {
      const { data, error } = await useApiCall('employees/log-time', authStore.authenticationToken).post(payload).json()

      if (error.value) {
        let errorToDisplay = 'An unexpected network error occurred. Please try again.'
        const backendErrorBody: ApiResponseBody | null = data.value as ApiResponseBody | null

        if (backendErrorBody) {
          if (backendErrorBody.errors && backendErrorBody.errors.length > 0) {
            const scannedQrError = backendErrorBody.errors.find((err) => err.field === 'scanned_qr')
            if (scannedQrError && scannedQrError.messages && scannedQrError.messages.length > 0) {
              errorToDisplay = scannedQrError.messages[0]
            } else {
              errorToDisplay = backendErrorBody.errors[0].messages[0] || backendErrorBody.message || errorToDisplay
            }
          } else if (backendErrorBody.error_message) {
            errorToDisplay = backendErrorBody.error_message
          } else if (backendErrorBody.message) {
            errorToDisplay = backendErrorBody.message
          }
        } else {
          errorToDisplay = error.value.message || 'Network unreachable or server down. Check your connection.'
        }

        lastLogMessage.value = errorToDisplay
        currentScannedEmployee.value = null
        throw new Error(lastLogMessage.value)
      }

      const responseBody: ApiResponseBody = data.value

      if (responseBody.success) {
        lastLogMessage.value = responseBody.message || 'Time logged successfully.'
        const warmBodyLog = responseBody.data as WarmBodyLogEntry

        const employeeDetails = warmBodyLog?.daily_time_record?.employee?.individual_basic_detail
        const employeeItem = warmBodyLog?.daily_time_record?.employee?.item

        const photoUrl =
          employeeDetails?.user_profile?.profile_picture_url && employeeDetails.user_profile.profile_picture_url.trim() !== ''
            ? employeeDetails.user_profile.profile_picture_url
            : '@/assets/image/DSWD logo_Mark.png'

        if (warmBodyLog && employeeDetails && employeeItem) {
          currentScannedEmployee.value = {
            id: warmBodyLog.daily_time_record?.employee?.id_number || 'N/A',
            name: `${employeeDetails.first_name || ''} ${employeeDetails.last_name || ''}`.trim() || 'N/A',
            position: employeeItem.position?.title || 'N/A',
            is_in: warmBodyLog.is_in,
            timestamp: warmBodyLog.created_at || new Date().toISOString(),
            photo_url: photoUrl,
          }
        } else {
          currentScannedEmployee.value = {
            id: 'N/A',
            name: 'Unknown Employee',
            position: 'N/A',
            is_in: warmBodyLog?.is_in || false,
            timestamp: warmBodyLog?.created_at || new Date().toISOString(),
            photo_url: '@/assets/image/DSWD logo_Mark.png',
          }
        }

        const today = getManilaTodayISO()
        void fetchWarmBodySummary(today)
        void fetchDailyLogs(today)
      } else {
        lastLogMessage.value = responseBody.error_message || responseBody.message || 'Failed to log time due to server logic.'
        currentScannedEmployee.value = null
        throw new Error(lastLogMessage.value)
      }

      return {
        success: responseBody.success,
        message: lastLogMessage.value,
        data: currentScannedEmployee.value,
      }
    } catch (err: unknown) {
      if (!lastLogMessage.value) {
        if (err instanceof Error) {
          lastLogMessage.value = err.message || 'An unexpected client-side error occurred.'
        } else if (typeof err === 'string') {
          lastLogMessage.value = err
        } else {
          lastLogMessage.value = 'An unexpected client-side error occurred.'
        }
      }
      return {
        success: false,
        message: lastLogMessage.value,
        data: null,
      }
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

      if (error.value) {
        const logEntry = dailyLogs.value.find((l) => l.date === date)
        if (logEntry) {
          logEntry.warm_bodies = []
        }
        return { success: false, message: error.value.message }
      }

      const responseBody: ApiResponseBody = data.value

      if (responseBody.success && Array.isArray(responseBody.data)) {
        const mappedLogs = (responseBody.data as TimeLogEntry[]).map((log: TimeLogEntry) => ({
          employee_id: log.id_number,
          timestamp: `${log.time_log_date}T${log.scanned_time}`,
          is_in: log.is_in,
          id: log.time_log_id,
          daily_time_record_id: undefined,
        }))

        const logEntry = dailyLogs.value.find((l) => l.date === date)
        if (logEntry) {
          logEntry.warm_bodies = mappedLogs
        } else {
          dailyLogs.value.push({
            date: date,
            warm_bodies: mappedLogs,
          })
        }
        return { success: true, message: responseBody.message }
      } else {
        const logEntry = dailyLogs.value.find((l) => l.date === date)
        if (logEntry) {
          logEntry.warm_bodies = []
        }
        return responseBody
      }
    } catch (err) {
      const logEntry = dailyLogs.value.find((l) => l.date === date)
      if (logEntry) {
        logEntry.warm_bodies = []
      }
      return { success: false, message: 'An unexpected error occurred while fetching daily logs.' }
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

      if (responseBody.success) {
        warmBodySummary.value = responseBody.data as WarmBodySummary
      } else {
        warmBodySummary.value = null
      }
      return responseBody
    } catch (err) {
      warmBodySummary.value = null
      return { success: false, message: 'An unexpected error occurred while fetching warm body summary.' }
    }
  }

  return {
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
