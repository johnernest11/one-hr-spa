import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useApiCall } from '@/composables/network.ts'
import { useAuthStore } from '@/stores/auth.store'
import type { ApiResponseBody, WarmBodyLogEntry, DailyLogEntry } from '@/typings/http-resources.types.ts'
import type { ScannedEmployeeResponse } from '@/typings/models.types'

// Define a type for individual division/section summary entries
interface DivisionSectionSummary {
  name: string // e.g., "HR Division", "Marketing Section"
  count: number // e.g., 15 (number of employees in that division/section)
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

      const { data, statusCode, error, isFinished } = useApiCall<ApiResponseBody>(
        'employees/log-time',
        authStore.authenticationToken
      )
        .post(payload)
        .json()

      let stopWatch: (() => void) | null = null
      let timeoutId: ReturnType<typeof setTimeout> | null = null

      await new Promise<void>((resolve, reject) => {
        stopWatch = watch(
          isFinished,
          (newValue) => {
            if (newValue) {
              if (stopWatch) {
                stopWatch()
              }
              if (timeoutId) {
                clearTimeout(timeoutId)
              }
              resolve()
            }
          },
          { immediate: true }
        )

        timeoutId = setTimeout(() => {
          if (stopWatch) {
            stopWatch()
          }
          lastLogMessage.value = 'Request Timed Out. Please try again later.'
          if (error.value) {
            reject(new Error(error.value.message || 'API call timed out and resulted in an error.'))
          } else {
            resolve()
          }
        }, 5000)
      })

      const isSuccessStatus = statusCode.value >= 200 && statusCode.value < 300
      let messageToDisplay: string = 'An unexpected error occurred.'

      if (lastLogMessage.value === 'Request Timed Out. Please try again later.') {
        return { success: false, message: lastLogMessage.value }
      }

      if (isSuccessStatus && data.value && data.value.success) {
        const warmBodyLog = data.value.data as WarmBodyLogEntry

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

        messageToDisplay =
          data.value && typeof data.value === 'object' && 'message' in data.value && data.value.message
            ? data.value.message
            : currentScannedEmployee.value?.is_in
              ? 'Successfully Timed In!'
              : 'Successfully Timed Out!'
        lastLogMessage.value = messageToDisplay

        const today = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' })).toISOString().split('T')[0]

        await fetchWarmBodySummary(today)
        await fetchDailyLogs(today)

        return { success: true, message: messageToDisplay, data: currentScannedEmployee.value }
      } else {
        currentScannedEmployee.value = null

        if (data.value && typeof data.value === 'object') {
          const apiResponse = data.value as ApiResponseBody
          if ('error_message' in apiResponse && apiResponse.error_message) {
            messageToDisplay = apiResponse.error_message
          } else if ('message' in apiResponse && apiResponse.message) {
            messageToDisplay = apiResponse.message
          } else if ('errors' in apiResponse && Array.isArray(apiResponse.errors)) {
            const validationErrors = apiResponse.errors
              .map((err) => {
                if (err.messages && Array.isArray(err.messages)) {
                  return err.messages.join(' ')
                }
                return ''
              })
              .filter(Boolean)
              .join('; ')
            messageToDisplay = `Validation Error: ${validationErrors || 'Unknown validation error.'}`
          } else {
            messageToDisplay = `Server responded with status ${statusCode.value || 'Unknown'}, but no specific error message provided.`
          }
        } else if (error.value) {
          messageToDisplay = error.value.message || `Network error. Status: ${statusCode.value || 'Unknown'}.`
          if (statusCode.value === 404) {
            messageToDisplay = 'API endpoint not found (404). Please verify the URL on the server.'
          } else if (statusCode.value === 401) {
            messageToDisplay = 'Unauthorized (401). Session expired or invalid token.'
          } else if (statusCode.value === 403) {
            messageToDisplay = 'Forbidden (403). You do not have permission to access this resource.'
          }
        } else {
          messageToDisplay = `API Error: Status ${statusCode.value || 'Unknown'}. No specific error details available.`
        }

        lastLogMessage.value = messageToDisplay
        return { success: false, message: messageToDisplay }
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        lastLogMessage.value = err.message || 'Failed to log time: An unexpected system error occurred.'
      } else if (typeof err === 'string') {
        lastLogMessage.value = err
      } else {
        lastLogMessage.value = 'Failed to log time: An unexpected system error occurred.'
      }

      currentScannedEmployee.value = null
      return { success: false, message: lastLogMessage.value }
    } finally {
      isLoggingTime.value = false
    }
  }

  const clearScannedEmployee = () => {
    currentScannedEmployee.value = null
    lastLogMessage.value = null
  }

  const fetchDailyLogs = async (date: string) => {
    try {
      const { data, statusCode, isFinished } = useApiCall<ApiResponseBody<TimeLogEntry[]>>(
        `employees/daily-time-records/time-logs?date=${date}`,
        authStore.authenticationToken
      )
        .get()
        .json()

      let stopWatch: (() => void) | null = null
      let timeoutId: ReturnType<typeof setTimeout> | null = null

      await new Promise<void>((resolve, reject) => {
        stopWatch = watch(
          isFinished,
          (newValue) => {
            if (newValue) {
              if (stopWatch) {
                stopWatch()
              }
              if (timeoutId) {
                clearTimeout(timeoutId)
              }
              resolve()
            }
          },
          { immediate: true }
        )

        timeoutId = setTimeout(() => {
          if (stopWatch) {
            stopWatch()
          }
          reject(new Error('Daily logs fetch timed out.'))
        }, 5000)
      })

      if (
        statusCode.value >= 200 &&
        statusCode.value < 300 &&
        data.value &&
        data.value.success &&
        Array.isArray(data.value.data)
      ) {
        let todayLogEntry = dailyLogs.value.find((log) => log.date === date)
        if (!todayLogEntry) {
          todayLogEntry = { date: date, warm_bodies: [] }
          dailyLogs.value.push(todayLogEntry)
        }

        const mappedLogs = data.value.data
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
      } else {
        const todayLogEntry = dailyLogs.value.find((log) => log.date === date)
        if (todayLogEntry) {
          todayLogEntry.warm_bodies = []
        }
      }
    } catch (err) {
      const todayLogEntry = dailyLogs.value.find((log) => log.date === date)
      if (todayLogEntry) {
        todayLogEntry.warm_bodies = []
      }
    }
  }

  const fetchWarmBodySummary = async (date: string) => {
    try {
      const { data, statusCode, isFinished } = useApiCall<ApiResponseBody<WarmBodySummary>>(
        `/employees/daily-time-records/warm-bodies/count?date=${date}`,
        authStore.authenticationToken
      )
        .get()
        .json()

      let stopWatch: (() => void) | null = null
      let timeoutId: ReturnType<typeof setTimeout> | null = null

      await new Promise<void>((resolve, reject) => {
        stopWatch = watch(
          isFinished,
          (newValue) => {
            if (newValue) {
              if (stopWatch) {
                stopWatch()
              }
              if (timeoutId) {
                clearTimeout(timeoutId)
              }
              resolve()
            }
          },
          { immediate: true }
        )

        timeoutId = setTimeout(() => {
          if (stopWatch) {
            stopWatch()
          }
          reject(new Error('Warm body summary fetch timed out.'))
        }, 5000)
      })

      if (statusCode.value >= 200 && statusCode.value < 300 && data.value && data.value.success) {
        warmBodySummary.value = data.value.data
      } else {
        warmBodySummary.value = null
      }
    } catch (err) {
      warmBodySummary.value = null
    }
  }

  return {
    dailyLogs,
    isLoggingTime,
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
