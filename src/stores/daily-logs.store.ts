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

// --- START: Type Update ---
// Ensure ScannedEmployeeResponse type (or wherever you define it) includes the 'captured_image' property
// Assuming it's in '@/typings/models.types', you should update it there, but we'll add it here for clarity
// and assume it's merged with the imported type.
// If you cannot update '@/typings/models.types', add the property here directly:
interface CustomScannedEmployeeResponse extends ScannedEmployeeResponse {
  captured_image?: string | null
}
// --- END: Type Update ---

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

export const useDailyLogsStore = defineStore('dailyLogs', () => {
  const authStore = useAuthStore()

  // 🧩 Persistent states
  const timelogOfficeId = useStorage<string | null>('timelogOfficeId', null)
  const recentLogs = useStorage<CustomScannedEmployeeResponse[]>('recentLogs', [])
  const dailyLogs = useStorage<DailyLogEntry[]>('dailyLogs', [])
  const currentScannedEmployee = ref<CustomScannedEmployeeResponse | null>(null) // Use updated type
  const lastLogMessage = ref<string | null>(null)
  const warmBodySummary = ref<WarmBodySummary | null>(null)
  const showModal = ref(false)
  let modalTimer: ReturnType<typeof setTimeout> | null = null

  /** 🧩 Helper to build fallback S3 URL if only path is given */
  const getCapturedPhotoUrl = (path?: string | null, fallback?: string) => {
    // Check for local Blob URL first (which starts with 'blob:')
    if (path?.startsWith('blob:')) return path
    if (!path) return fallback || dswdLogoMark
    if (path.startsWith('http')) return path
    return `https://hr-cares-assets.s3.ap-southeast-1.amazonaws.com/${path}`
  }

  /** ✅ Add recent log with cap limit */
  // Update addRecentLog to use the custom type
  const addRecentLog = (employee: CustomScannedEmployeeResponse) => {
    recentLogs.value.unshift(employee)
    if (recentLogs.value.length > 20) recentLogs.value.pop()
  }

  const clearRecentLogs = () => {
    recentLogs.value = []
  }

  /** ✅ Computed counters */
  const countIn = computed(
    () => (date: string) => dailyLogs.value.find((l) => l.date === date)?.warm_bodies.filter((wb) => wb.is_in).length ?? 0
  )

  const countOut = computed(
    () => (date: string) => dailyLogs.value.find((l) => l.date === date)?.warm_bodies.filter((wb) => !wb.is_in).length ?? 0
  )

  /** ✅ Safely build warm body logs (prevents invalid date errors) */
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

  /** 🏢 Office helpers */
  const setOffice = (office: WbAutoCompleteOption) => {
    timelogOfficeId.value = office.value as string
  }

  const clearOffice = () => {
    timelogOfficeId.value = null
  }

  /** 🪟 Modal handling */
  // Update showScannedEmployeeModal to use the custom type
  const showScannedEmployeeModal = (employee: CustomScannedEmployeeResponse | null, message: string) => {
    currentScannedEmployee.value = employee
    lastLogMessage.value = message
    showModal.value = true

    // The view component handles recentLogs update now, so this is commented out.
    // if (employee) addRecentLog(employee)

    if (modalTimer) clearTimeout(modalTimer)
    modalTimer = setTimeout(() => {
      showModal.value = false
      currentScannedEmployee.value = null
      lastLogMessage.value = null
    }, 10000)
  }

  const clearScannedEmployee = () => {
    currentScannedEmployee.value = null
    lastLogMessage.value = null
    showModal.value = false
    if (modalTimer) clearTimeout(modalTimer)
  }

  /** 🔁 Merge daily logs without duplication */
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

  /** 🕒 Log employee time */
  // CRITICAL FIX: Add localCapturedImageUrl parameter to pass the Blob URL
  const logEmployeeTime = async (
    payload: FormData | { scanned_qr: string; captured_image: string | null },
    localCapturedImageUrl: string | null = null // New optional parameter for Blob URL
  ) => {
    const { data } = await useApiCall('employees/log-time', authStore.authenticationToken).post(payload).json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody?.success) {
      const warmBodyLog = responseBody.data as WarmBodyLogEntry

      // Extract employee info
      const emp = warmBodyLog.daily_time_record?.employee
      const empDetails = emp?.individual_basic_detail
      const employeeDetails = warmBodyLog?.daily_time_record?.employee?.individual_basic_detail

      const messageToDisplay = responseBody.message || 'Time log successful!'

      // FIX: Use the localCapturedImageUrl (Blob) if provided, otherwise fall back to S3/default
      const profilePhotoUrl = getCapturedPhotoUrl(employeeDetails?.user_profile?.profile_picture_url, dswdLogoMark)
      const capturedImageUrl = localCapturedImageUrl || getCapturedPhotoUrl(warmBodyLog?.captured_image_url, dswdLogoMark)

      // Use CustomScannedEmployeeResponse type
      const scannedEmployee: CustomScannedEmployeeResponse = {
        id: emp?.id_number || 'N/A',
        name: `${empDetails?.first_name || ''} ${empDetails?.last_name || ''}`.trim() || 'N/A',
        position: emp?.item?.position?.title || 'N/A',
        is_in: warmBodyLog.is_in,
        timestamp: warmBodyLog.scanned_time || new Date().toISOString(),
        photo_url: profilePhotoUrl, // Employee's static profile photo
        captured_image: capturedImageUrl, // The captured photo (Blob or S3)
        captured_photo_url: capturedImageUrl, // Keeping this field for backward compatibility
      }

      const dtrDate = warmBodyLog.daily_time_record?.date || new Date().toISOString().slice(0, 10)
      updateDailyLogs(dtrDate, [warmBodyLog])
      // FIX: The view component handles the recentLogs update based on currentScannedEmployee,
      // but we still call showScannedEmployeeModal which uses currentScannedEmployee
      showScannedEmployeeModal(scannedEmployee, messageToDisplay)

      // FIX: Attach the scanned employee object for the View component to access
      currentScannedEmployee.value = scannedEmployee
    } else {
      // Handle error messages
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

  /** 📅 Fetch logs once (no auto-refresh after page reload) */
  const fetchDailyLogs = async (date: string) => {
    try {
      const url = `/employees/daily-time-records/time-logs?date=${date}`
      const { data } = await useApiCall(url, authStore.authenticationToken).get().json()
      const responseBody: ApiResponseBody = data.value

      if (responseBody?.success) {
        const logs = responseBody.data as WarmBodyLogEntry[]
        if (logs?.length) updateDailyLogs(date, logs)
      } else {
        console.warn('Failed to fetch daily logs:', responseBody?.message)
      }

      return responseBody
    } catch (error) {
      console.error('Failed to fetch daily logs:', error)
    }
  }

  /** 🧮 Fetch warm body summary */
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
