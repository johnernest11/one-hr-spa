import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useStorage } from '@vueuse/core'
import { useApiCall } from '@/composables/network.ts'
import { useAuthStore } from '@/stores/auth.store'
import { ApiErrorCode } from '@/typings/http-resources.types.ts'
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
  captured_image_url?: string | null
  employee?: {
    user_profile?: {
      profile_picture_url?: string | null
    }
  }
}

export const useDailyLogsStore = defineStore('dailyLogs', () => {
  const authStore = useAuthStore()

  const timelogOfficeId = useStorage<string | null>('timelogOfficeId', null)
  const recentLogs = useStorage<ScannedEmployeeResponse[]>('recentLogs', [])
  const dailyLogs = useStorage<DailyLogEntry[]>('dailyLogs', [])
  const currentScannedEmployee = ref<ScannedEmployeeResponse | null>(null)
  const lastLogMessage = ref<string | null>(null)
  const warmBodySummary = ref<WarmBodySummary | null>(null)
  const showModal = ref(false)
  let modalTimer: ReturnType<typeof setTimeout> | null = null

  // ✅ Add to top of recent logs
  const addRecentLog = (employee: ScannedEmployeeResponse) => {
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
      .map((log) => ({ ...log, timestamp: `${log.date}T${log.scanned_time}` }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  })

  const setOffice = (office: WbAutoCompleteOption) => {
    timelogOfficeId.value = office.value as string
  }
  const clearOffice = () => {
    timelogOfficeId.value = null
  }

  const showScannedEmployeeModal = (employee: ScannedEmployeeResponse | null, message: string) => {
    currentScannedEmployee.value = employee
    lastLogMessage.value = message
    showModal.value = true

    if (employee) addRecentLog(employee)

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

  const updateDailyLogs = (date: string, logs: WarmBodyLogEntry[]) => {
    const index = dailyLogs.value.findIndex((l) => l.date === date)
    if (index !== -1) dailyLogs.value[index].warm_bodies = logs
    else dailyLogs.value.push({ date, warm_bodies: logs })
  }

  const logEmployeeTime = async (payload: { scanned_qr: string; captured_image: string | null } | FormData) => {
    const { data } = await useApiCall('employees/log-time', authStore.authenticationToken).post(payload).json()

    const responseBody: ApiResponseBody = data.value

    if (responseBody?.success) {
      const warmBodyLog = responseBody.data as WarmBodyLogEntry
      const emp = warmBodyLog?.daily_time_record?.employee
      const details = emp?.individual_basic_detail
      const item = emp?.item
      const messageToDisplay = responseBody.message || 'Time log successful!'

      const photoUrl = details?.user_profile?.profile_picture_url?.trim() || '@/assets/image/DSWD logo_Mark.png'

      const scannedEmployee: ScannedEmployeeResponse = {
        id: emp?.id_number || 'N/A',
        name: `${details?.first_name || ''} ${details?.last_name || ''}`.trim() || 'N/A',
        position: item?.position?.title || 'N/A',
        is_in: warmBodyLog.is_in,
        timestamp: warmBodyLog.created_at || new Date().toISOString(),
        photo_url: photoUrl,
        captured_photo_url: warmBodyLog.captured_image_url || '',
      }

      const dtrDate = warmBodyLog.daily_time_record?.date || new Date().toISOString().slice(0, 10)
      updateDailyLogs(dtrDate, [warmBodyLog])
      showScannedEmployeeModal(scannedEmployee, messageToDisplay)
    } else {
      let messageToDisplay = responseBody?.message?.trim() || 'Time log failed.'
      if (responseBody?.error_code === ApiErrorCode.VALIDATION_ERROR) {
        const apiErrors = responseBody.errors
        if (apiErrors?.length && apiErrors[0].messages?.length) {
          messageToDisplay = apiErrors[0].messages[0]
        }
      }
      showScannedEmployeeModal(null, messageToDisplay)
      return responseBody
    }
  }

  // ✅ Fetch daily logs (with profile photo fallback)
  const fetchDailyLogs = async (date: string) => {
    const officeId = timelogOfficeId.value
    let url = `employees/daily-time-records/time-logs?date=${date}`
    if (officeId) url += `&office_id=${officeId}`

    const { data } = await useApiCall(url, authStore.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody?.success && Array.isArray(responseBody.data)) {
      const mappedLogs = (responseBody.data as TimeLogEntry[]).map((log) => ({
        id: log.time_log_id,
        employee_id: log.id_number,
        date: log.time_log_date,
        scanned_time: log.scanned_time,
        timestamp: `${log.time_log_date}T${log.scanned_time}`,
        is_in: log.is_in,
        photo_url: log.employee?.user_profile?.profile_picture_url || '/assets/image/DSWD_logo_Mark.png',
        captured_photo_url: log.captured_image_url || null,
      }))
      updateDailyLogs(date, mappedLogs as WarmBodyLogEntry[])
    } else updateDailyLogs(date, [])

    return responseBody
  }

  // ✅ Fetch warm body summary
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
    fetchDailyLogs,
    fetchWarmBodySummary,
    showScannedEmployeeModal,
    clearScannedEmployee,
    updateDailyLogs,
    addRecentLog,
    clearRecentLogs,
    setOffice,
    clearOffice,
  }
})
