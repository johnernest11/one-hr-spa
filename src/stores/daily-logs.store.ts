import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useApiCall } from '@/composables/network.ts'
import { useAuthStore } from '@/stores/auth.store'
import type { ApiResponseBody, WarmBodyLogEntry, DailyLogEntry } from '@/typings/http-resources.types.ts'
import type { ScannedEmployeeResponse } from '@/typings/models.types'

// New interface for validation error details
interface ValidationErrorDetail {
  messages?: string[]
  // Add any other properties that might exist on an individual error object in the 'errors' array
  // e.g., field?: string; code?: string;
}

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
  const isLoggingTime = ref(false)
  const currentScannedEmployee = ref<ScannedEmployeeResponse | null>(null)
  const lastLogMessage = ref<string | null>(null)
  const warmBodySummary = ref<WarmBodySummary | null>(null)
  const isFetching = ref(false)
  const errorMessage = ref<string | null>(null)

  const executeApiCall = async <T>(
    apiCallInstance: ReturnType<typeof useApiCall<T>>,
    timeoutMs: number = 5000,
    actionName: string = 'data operation'
  ): Promise<{ data: T | null; success: boolean; message: string | null }> => {
    let stopWatch: (() => void) | null = null
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let hasResolved = false

    try {
      await new Promise<void>((resolve, reject) => {
        stopWatch = watch(
          apiCallInstance.isFinished,
          (newValue) => {
            if (newValue) {
              if (stopWatch) stopWatch()
              if (timeoutId) clearTimeout(timeoutId)
              if (!hasResolved) {
                hasResolved = true
                resolve()
              }
            }
          },
          { immediate: true }
        )

        timeoutId = setTimeout(() => {
          if (stopWatch) stopWatch()
          if (!hasResolved) {
            hasResolved = true
            reject(new Error(`Request timed out for ${actionName}. Please try again later.`))
          }
        }, timeoutMs)
      })

      const responseData = apiCallInstance.data.value as ApiResponseBody<T>
      const statusCode = apiCallInstance.statusCode.value
      const apiError = apiCallInstance.error.value

      const isSuccessStatus = statusCode >= 200 && statusCode < 300

      if (isSuccessStatus && responseData && responseData.success) {
        return { data: responseData.data || null, success: true, message: responseData.message || 'Operation successful.' }
      } else {
        let msg = `Failed to ${actionName}.`
        if (responseData && typeof responseData === 'object') {
          if ('error_message' in responseData && responseData.error_message) {
            msg = responseData.error_message
          } else if ('message' in responseData && responseData.message) {
            msg = responseData.message
          } else if ('errors' in responseData && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
            // Cast responseData.errors to the new interface
            const validationErrors = (responseData.errors as ValidationErrorDetail[])
              .map((err) => (err.messages && Array.isArray(err.messages) ? err.messages.join(' ') : ''))
              .filter(Boolean)
              .join('; ')
            msg = `Validation Error: ${validationErrors || 'Unknown validation error.'}`
          } else if (statusCode) {
            msg = `Server responded with status ${statusCode}. No specific error message provided.`
          }
        } else if (apiError) {
          msg = apiError.message || `Network error during ${actionName}. Status: ${statusCode || 'Unknown'}.`
          if (statusCode === 404) msg = `API endpoint not found (404) for ${actionName}. Please verify the URL.`
          else if (statusCode === 401) msg = `Unauthorized (401) for ${actionName}. Session expired or invalid token.`
          else if (statusCode === 403) msg = `Forbidden (403) for ${actionName}. You do not have permission.`
        }
        return { data: null, success: false, message: msg }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected system error occurred during API call.'
      return { data: null, success: false, message: msg }
    }
  }

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

  const logEmployeeTime = async (
    rawQrText: string
  ): Promise<{ success: boolean; message?: string; data?: ScannedEmployeeResponse | null }> => {
    isLoggingTime.value = true
    errorMessage.value = null
    currentScannedEmployee.value = null
    lastLogMessage.value = null

    try {
      const now = new Date()
      const manilaDateTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
      const datePart = manilaDateTime.toISOString().split('T')[0]
      const timePart = manilaDateTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })

      const payload = {
        scanned_qr: rawQrText,
        date: datePart,
        scanned_time: timePart,
      }

      const apiCall = useApiCall<ApiResponseBody>('employees/log-time', authStore.authenticationToken).post(payload).json()

      const { data, success, message } = await executeApiCall(apiCall, 5000, 'log employee time')
      lastLogMessage.value = message

      if (success && data) {
        const warmBodyLog = data.data as WarmBodyLogEntry

        const employeeDetails = warmBodyLog?.daily_time_record?.employee?.individual_basic_detail
        const employeeItem = warmBodyLog?.daily_time_record?.employee?.item

        if (warmBodyLog && employeeDetails && employeeItem) {
          currentScannedEmployee.value = {
            id: warmBodyLog.daily_time_record.employee.id_number || 'N/A',
            name: `${employeeDetails.first_name || ''} ${employeeDetails.last_name || ''}`.trim() || 'N/A',
            position: employeeItem.position?.title || 'N/A',
            is_in: warmBodyLog.is_in,
            timestamp: warmBodyLog.created_at || new Date().toISOString(),
            photo_url: employeeDetails.user_profile?.profile_picture_url || '/src/assets/image/placeholder-profile.png',
          }
        } else {
          currentScannedEmployee.value = {
            id: 'N/A',
            name: 'Unknown Employee',
            position: 'N/A',
            is_in: warmBodyLog?.is_in || false,
            timestamp: warmBodyLog?.created_at || new Date().toISOString(),
            photo_url: '/src/assets/image/placeholder-profile.png',
          }
        }

        const today = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' })).toISOString().split('T')[0]

        await fetchWarmBodySummary(today)
        await fetchDailyLogs(today)

        return { success: true, message: message, data: currentScannedEmployee.value }
      } else {
        currentScannedEmployee.value = null
        errorMessage.value = message
        return { success: false, message: message }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to log time: An unexpected system error occurred.'
      lastLogMessage.value = msg
      errorMessage.value = msg
      currentScannedEmployee.value = null
      return { success: false, message: msg }
    } finally {
      isLoggingTime.value = false
    }
  }

  const clearScannedEmployee = () => {
    currentScannedEmployee.value = null
    lastLogMessage.value = null
    errorMessage.value = null
  }

  const fetchDailyLogs = async (date: string) => {
    isFetching.value = true
    errorMessage.value = null

    try {
      const apiCall = useApiCall<ApiResponseBody<TimeLogEntry[]>>(
        `employees/daily-time-records/time-logs?date=${date}`,
        authStore.authenticationToken
      )
        .get()
        .json()

      const { data, success, message } = await executeApiCall(apiCall, 5000, `fetching daily logs for ${date}`)

      if (success && data) {
        let todayLogEntry = dailyLogs.value.find((l) => l.date === date)
        if (!todayLogEntry) {
          todayLogEntry = { date: date, warm_bodies: [] }
          dailyLogs.value.push(todayLogEntry)
        }

        const mappedLogs = (data as TimeLogEntry[])
          .map((log: TimeLogEntry) => ({
            employee_id: log.id_number,
            timestamp: `${log.time_log_date}T${log.scanned_time}`,
            is_in: log.is_in,
            id: log.time_log_id,
            daily_time_record_id: undefined,
          }))
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

        todayLogEntry.warm_bodies = mappedLogs
        dailyLogs.value = [...dailyLogs.value]

        return { success: true, message: message, data: dailyLogs.value }
      } else {
        const todayLogEntry = dailyLogs.value.find((l) => l.date === date)
        if (todayLogEntry) {
          todayLogEntry.warm_bodies = []
        }
        errorMessage.value = message
        return { success: false, message: message, data: null }
      }
    } catch (err: unknown) {
      const todayLogEntry = dailyLogs.value.find((l) => l.date === date)
      if (todayLogEntry) {
        todayLogEntry.warm_bodies = []
      }
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during daily logs fetch.'
      errorMessage.value = msg
      return { success: false, message: msg, data: null }
    } finally {
      isFetching.value = false
    }
  }

  const fetchWarmBodySummary = async (date: string) => {
    isFetching.value = true
    errorMessage.value = null

    try {
      const apiCall = useApiCall<ApiResponseBody<WarmBodySummary>>(
        `/employees/daily-time-records/warm-bodies/count?date=${date}`,
        authStore.authenticationToken
      )
        .get()
        .json()

      const { data, success, message } = await executeApiCall(apiCall, 5000, `fetching warm body summary for ${date}`)

      if (success && data) {
        warmBodySummary.value = data as WarmBodySummary
        return { success: true, message: message, data: warmBodySummary.value }
      } else {
        warmBodySummary.value = null
        errorMessage.value = message
        return { success: false, message: message, data: null }
      }
    } catch (err: unknown) {
      warmBodySummary.value = null
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during warm body summary fetch.'
      errorMessage.value = msg
      return { success: false, message: msg, data: null }
    } finally {
      isFetching.value = false
    }
  }

  return {
    dailyLogs,
    isLoggingTime,
    currentScannedEmployee,
    lastLogMessage,
    warmBodySummary,
    isFetching,
    errorMessage,
    countIn,
    countOut,
    getTodayWarmBodies,
    logEmployeeTime,
    clearScannedEmployee,
    fetchDailyLogs,
    fetchWarmBodySummary,
  }
})
