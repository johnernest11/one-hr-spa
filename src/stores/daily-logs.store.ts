import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useStorage } from '@vueuse/core'
import { useApiCall } from '@/composables/network.ts'
import { useAuthStore } from '@/stores/auth.store'
import type { ApiResponseBody, WarmBodyLogEntry, DailyLogEntry } from '@/typings/http-resources.types.ts'
import type { ScannedEmployeeResponse } from '@/typings/models.types'
import type { WbAutoCompleteOption } from '@/components/webkit/WbAutoComplete.vue'

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
  const showModal = ref(false)

  let modalTimer: ReturnType<typeof setTimeout> | null = null

  const countIn = computed(
    () => (date: string) => dailyLogs.value.find((l) => l.date === date)?.warm_bodies.filter((wb) => wb.is_in).length ?? 0
  )

  const countOut = computed(
    () => (date: string) => dailyLogs.value.find((l) => l.date === date)?.warm_bodies.filter((wb) => !wb.is_in).length ?? 0
  )

  const setOffice = (office: WbAutoCompleteOption) => {
    timelogOfficeId.value = office.value as string
  }

  const clearOffice = () => {
    timelogOfficeId.value = null
  }

  const getTodayWarmBodies = computed(
    () => (date: string) =>
      dailyLogs.value.find((l) => l.date === date)
        ? [...dailyLogs.value.find((l) => l.date === date)!.warm_bodies].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        : []
  )

  function showScannedEmployeeModal(employee: ScannedEmployeeResponse | null, message: string) {
    currentScannedEmployee.value = employee
    lastLogMessage.value = message
    showModal.value = true

    if (modalTimer) clearTimeout(modalTimer)

    modalTimer = setTimeout(() => {
      showModal.value = false
      currentScannedEmployee.value = null
      lastLogMessage.value = null
    }, 10000)
  }

  const logEmployeeTime = async (payload: { scanned_qr: string; captured_image: string | null }) => {
    const officeId = timelogOfficeId.value
    const newPayload = { ...payload, office_id: officeId }

    try {
      const { data } = await useApiCall('employees/log-time', authStore.authenticationToken).post(newPayload).json()

      if (data.value && data.value.success) {
        const response = data.value as ApiResponseBodyWithErrors
        const messageToDisplay = response.message || 'Time log successful!'

        const warmBodyLog = response.data as WarmBodyLogEntry
        const employeeDetails = warmBodyLog?.daily_time_record?.employee?.individual_basic_detail
        const employeeItem = warmBodyLog?.daily_time_record?.employee?.item

        const photoUrl =
          employeeDetails?.user_profile?.profile_picture_url && employeeDetails.user_profile.profile_picture_url.trim() !== ''
            ? employeeDetails.user_profile.profile_picture_url
            : '@/assets/image/DSWD logo_Mark.png'

        const scannedEmployee: ScannedEmployeeResponse = {
          id: warmBodyLog.daily_time_record?.employee?.id_number || 'N/A',
          name: `${employeeDetails?.first_name || ''} ${employeeDetails?.last_name || ''}`.trim() || 'N/A',
          position: employeeItem?.position?.title || 'N/A',
          is_in: warmBodyLog.is_in,
          timestamp: warmBodyLog.created_at || new Date().toISOString(),
          photo_url: photoUrl,
        }

        const dtrDate = warmBodyLog.daily_time_record?.date || new Date().toISOString().substring(0, 10)
        updateDailyLogs(dtrDate, [warmBodyLog])

        showScannedEmployeeModal(scannedEmployee, messageToDisplay)

        return { ...response, message: messageToDisplay } as ApiResponseBody
      } else if (data.value) {
        const response = data.value as ApiResponseBodyWithErrors
        let messageToDisplay = response.message || 'API request failed.'

        if (response.error_code === 'VALIDATION_ERROR' && response.errors?.[0]?.messages?.length) {
          messageToDisplay = response.errors[0].messages[0]
        }

        showScannedEmployeeModal(null, messageToDisplay)

        return { ...response, message: messageToDisplay } as ApiResponseBody
      }

      throw new Error('API call returned neither success data nor an error object.')
    } catch (e: unknown) {
      let messageToDisplay = 'Network or server error occurred.'
      let responseBody: ApiResponseBodyWithErrors | undefined

      if (typeof e === 'object' && e !== null) {
        const maybeError = e as { response?: { data?: unknown }; data?: unknown; message?: string }

        if (maybeError.response?.data) {
          responseBody = maybeError.response.data as ApiResponseBodyWithErrors
        } else if (maybeError.data) {
          responseBody = maybeError.data as ApiResponseBodyWithErrors
        }

        if (responseBody?.error_code === 'VALIDATION_ERROR') {
          if (responseBody.errors?.[0]?.messages?.length) {
            messageToDisplay = responseBody.errors[0].messages[0]
          } else if (maybeError.message) {
            messageToDisplay = maybeError.message
          }
        } else if (maybeError.message) {
          messageToDisplay = maybeError.message
        }
      }

      showScannedEmployeeModal(null, messageToDisplay)

      return {
        success: false,
        message: messageToDisplay,
        data: responseBody?.data || null,
      } as ApiResponseBody
    }
  }

  const clearScannedEmployee = () => {
    currentScannedEmployee.value = null
    lastLogMessage.value = null
    showModal.value = false
    if (modalTimer) clearTimeout(modalTimer)
  }

  // Inside useDailyLogsStore
  const fetchDailyLogs = async (date: string) => {
    // 1. Get the office ID from local storage
    const officeId = timelogOfficeId.value

    if (!officeId) {
      console.warn('timelogOfficeId is not set. Cannot fetch daily logs.')
      updateDailyLogs(date, [])
      return { success: false, message: 'Office not selected.' }
    }

    try {
      // 2. Append office_id to the query string
      const { data, error } = await useApiCall(
        // === MODIFIED LINE BELOW ===
        `/employees/daily-time-records/time-logs?date=${date}&office_id=${officeId}`,
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
        // You may need to ensure your TimeLogEntry interface and backend API return 'photo_url'
        // to display it in the list on the frontend.
      }))

      updateDailyLogs(date, mappedLogs)
      return { success: true, message: responseBody.message }
    } catch {
      updateDailyLogs(date, [])
      return { success: false, message: 'Failed to fetch daily logs.' }
    }
  }

  // Inside useDailyLogsStore
  const fetchWarmBodySummary = async (date: string) => {
    // 1. Get the office ID from local storage
    const officeId = timelogOfficeId.value

    if (!officeId) {
      warmBodySummary.value = null
      return { success: false, message: 'Office not selected.' }
    }

    try {
      // 2. Append office_id to the query string
      const { data, error } = await useApiCall(
        // === MODIFIED LINE BELOW ===
        `/employees/daily-time-records/warm-bodies/count?date=${date}&office_id=${officeId}`,
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
    showModal,
    countIn,
    countOut,
    getTodayWarmBodies,
    logEmployeeTime,
    clearScannedEmployee,
    fetchDailyLogs,
    fetchWarmBodySummary,
    setOffice,
    clearOffice,
  }
})
