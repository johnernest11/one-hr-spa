import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useStorage } from '@vueuse/core'
import { useApiCall } from '@/composables/network.ts'
import { useAuthStore } from '@/stores/auth.store'
import { ApiErrorCode } from '@/typings/http-resources.types.ts'
import type { ApiResponseBody, WarmBodyLogEntry, DailyLogEntry } from '@/typings/http-resources.types.ts'
import type { ScannedEmployeeResponse } from '@/typings/models.types'
import type { WbAutoCompleteOption } from '@/components/webkit/WbAutoComplete.vue'
import dswdLogoMark from '@/assets/image/DSWD logo_Mark.png'

interface CustomScannedEmployeeResponse extends ScannedEmployeeResponse {
  employee_id?: string
  captured_image?: string | null
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

interface DailyLogDisplayEntry {
  id: number
  employee_id: string
  employee_name: string
  position: string
  scanned_time: string
  is_in: boolean
  date: string
  captured_image_url: string
  daily_time_record?: WarmBodyLogEntry['daily_time_record']
}

export const useDailyLogsStore = defineStore('dailyLogs', () => {
  const authStore = useAuthStore()

  const timelogOfficeId = useStorage<string | null>('timelogOfficeId', null)
  const recentLogs = useStorage<CustomScannedEmployeeResponse[]>('recentLogs', [])
  const dailyLogs = useStorage<DailyLogEntry[]>('dailyLogs', [])
  const currentScannedEmployee = ref<CustomScannedEmployeeResponse | null>(null)
  const lastLogMessage = ref<string | null>(null)
  const warmBodySummary = ref<WarmBodySummary | null>(null)
  const showModal = ref(false)
  const modalTimer: { current: ReturnType<typeof setTimeout> | null } = { current: null }
  const MODAL_DISPLAY_DURATION_MS = 10000

  const getCapturedPhotoUrl = (path?: string | null, fallback?: string) => {
    if (path?.startsWith('blob:')) return path
    if (!path) return fallback || dswdLogoMark
    if (path.startsWith('http')) return path
    return `https://hr-cares-assets.s3.ap-southeast-1.amazonaws.com/${path}`
  }

  const addRecentLog = (employee: CustomScannedEmployeeResponse) => {
    recentLogs.value.unshift(employee)
    if (recentLogs.value.length > 20) recentLogs.value.pop()
  }

  const clearRecentLogs = () => {
    recentLogs.value = []
  }

  const countIn = computed(
    () => (date: string) => dailyLogs.value.find((l) => l.date === date)?.warm_bodies.filter((wb) => wb.is_in).length ?? 0
  )

  const countOut = computed(
    () => (date: string) => dailyLogs.value.find((l) => l.date === date)?.warm_bodies.filter((wb) => !wb.is_in).length ?? 0
  )

  const getTodayWarmBodies = computed(() => (date: string) => {
    const dailyLog = dailyLogs.value.find((l) => l.date === date)
    if (!dailyLog) return []
    return dailyLog.warm_bodies
      .map((log) => {
        const validDate = log.date || date || new Date().toISOString().slice(0, 10)
        const validTime = log.scanned_time || '00:00:00'
        const timestamp = `${validDate}T${validTime}`
        return { ...log, timestamp }
      })
      .filter((log) => !isNaN(new Date(log.timestamp).getTime()))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  })

  const setOffice = (office: WbAutoCompleteOption) => {
    timelogOfficeId.value = office.value as string
  }

  const clearOffice = () => {
    timelogOfficeId.value = null
  }

  const showScannedEmployeeModal = (employee: CustomScannedEmployeeResponse | null, message: string) => {
    currentScannedEmployee.value = employee
    lastLogMessage.value = message
    showModal.value = true

    if (modalTimer.current) clearTimeout(modalTimer.current)
    modalTimer.current = setTimeout(() => {
      showModal.value = false
      clearScannedEmployee()
      modalTimer.current = null
    }, MODAL_DISPLAY_DURATION_MS)
  }

  const clearScannedEmployee = () => {
    currentScannedEmployee.value = null
    lastLogMessage.value = null
    showModal.value = false
    if (modalTimer.current) clearTimeout(modalTimer.current)
  }

  const updateDailyLogs = (date: string, logs: WarmBodyLogEntry[]) => {
    const existingIndex = dailyLogs.value.findIndex((l) => l.date === date)

    if (existingIndex !== -1) {
      const existingIds = new Set(dailyLogs.value[existingIndex].warm_bodies.map((l) => l.id))
      const newLogs = logs.filter((l) => !existingIds.has(l.id))
      dailyLogs.value[existingIndex].warm_bodies.unshift(...newLogs)
    } else {
      dailyLogs.value.push({ date, warm_bodies: logs })
    }
  }

  const logEmployeeTime = async (
    payload: FormData | { scanned_qr: string; captured_image: string | null },
    localCapturedImageUrl: string | null = null
  ) => {
    const { data } = await useApiCall('employees/log-time', authStore.authenticationToken).post(payload).json()

    const responseBody: ApiResponseBody = data.value

    if (responseBody?.success) {
      const warmBodyLog = responseBody.data as WarmBodyLogEntry

      const emp = warmBodyLog.daily_time_record?.employee
      const empDetails = emp?.individual_basic_detail

      const messageToDisplay = responseBody.message || 'Time log successful!'

      const profilePhotoUrl = getCapturedPhotoUrl(empDetails?.user_profile?.profile_picture_url, dswdLogoMark)
      const capturedImageUrl = localCapturedImageUrl || getCapturedPhotoUrl(warmBodyLog?.captured_image_url, dswdLogoMark)

      const employeeIdString = warmBodyLog.daily_time_record?.employee_id ?? emp?.id_number ?? 'N/A'

      const scannedEmployee: CustomScannedEmployeeResponse = {
        id: employeeIdString,
        employee_id: employeeIdString,
        name: `${empDetails?.first_name || ''} ${empDetails?.last_name || ''}`.trim() || 'N/A',
        position: emp?.item?.position?.title || 'N/A',
        is_in: warmBodyLog.is_in,
        timestamp: warmBodyLog.scanned_time || new Date().toISOString(),
        photo_url: profilePhotoUrl,
        captured_image: capturedImageUrl,
        captured_photo_url: capturedImageUrl,
      }

      const dtrDate = warmBodyLog.daily_time_record?.date || new Date().toISOString().slice(0, 10)
      updateDailyLogs(dtrDate, [warmBodyLog])
      showScannedEmployeeModal(scannedEmployee, messageToDisplay)

      currentScannedEmployee.value = scannedEmployee
    } else {
      let messageToDisplay = responseBody?.message?.trim() || 'Time log failed.'
      if (responseBody?.error_code === ApiErrorCode.VALIDATION_ERROR) {
        const apiErrors = responseBody.errors
        if (apiErrors?.length && apiErrors[0].messages?.length) {
          messageToDisplay = apiErrors[0].messages[0]
        }
      }
      showScannedEmployeeModal(null, messageToDisplay)
    }

    return responseBody
  }

  const fetchDailyLogs = async (date: string) => {
    try {
      const url = `/employees/daily-time-records/time-logs?date=${date}`
      const { data } = await useApiCall(url, authStore.authenticationToken).get().json()
      const responseBody: ApiResponseBody = data.value

      if (responseBody?.success && Array.isArray(responseBody.data)) {
        const logs: DailyLogDisplayEntry[] = (responseBody.data as WarmBodyLogEntry[]).map((log) => {
          const emp = log.daily_time_record?.employee
          const empDetails = emp?.individual_basic_detail

          const employeeId = emp?.id_number ?? 'N/A'

          return {
            id: log.id,
            employee_id: employeeId,
            employee_name: `${empDetails?.first_name || ''} ${empDetails?.last_name || ''}`.trim() || 'N/A',
            position: emp?.item?.position?.title || 'N/A',
            scanned_time: log.scanned_time || '',
            is_in: log.is_in,
            date: log.date || '',
            captured_image_url: log.captured_image_url || log.captured_photo_url || '',
            daily_time_record: log.daily_time_record,
          }
        })

        if (logs.length) updateDailyLogs(date, logs)
      } else {
        console.warn('Failed to fetch daily logs:', responseBody?.message)
      }

      return responseBody
    } catch (error) {
      console.error('Failed to fetch daily logs:', error)
    }
  }

  const fetchWarmBodySummary = async (date: string) => {
    const url = `/employees/daily-time-records/warm-bodies/count?date=${date}`
    const { data } = await useApiCall(url, authStore.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    warmBodySummary.value = responseBody?.success ? (responseBody.data as WarmBodySummary) : null
    return responseBody
  }

  return {
    timelogOfficeId,
    recentLogs,
    dailyLogs,
    currentScannedEmployee,
    lastLogMessage,
    warmBodySummary,
    showModal,
    countIn,
    countOut,
    getTodayWarmBodies,
    logEmployeeTime,
    fetchWarmBodySummary,
    fetchDailyLogs,
    showScannedEmployeeModal,
    clearScannedEmployee,
    updateDailyLogs,
    addRecentLog,
    clearRecentLogs,
    setOffice,
    clearOffice,
  }
})
