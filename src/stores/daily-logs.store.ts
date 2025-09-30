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

  const getTodayWarmBodies = computed(
    () => (date: string) =>
      dailyLogs.value.find((l) => l.date === date)
        ? [...dailyLogs.value.find((l) => l.date === date)!.warm_bodies].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        : []
  )

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
    const logEntry = dailyLogs.value.find((l) => l.date === date)
    if (logEntry) {
      logEntry.warm_bodies = logs
    } else {
      dailyLogs.value.push({ date, warm_bodies: logs })
    }
  }

  const logEmployeeTime = async (payload: { scanned_qr: string; captured_image: string | null }) => {
    const { data } = await useApiCall('employees/log-time', authStore.authenticationToken).post(payload).json()
    const responseBody: ApiResponseBody = data.value
    return responseBody
  }

  const fetchDailyLogs = async (date: string) => {
    const officeId = timelogOfficeId.value
    let url = `employees/daily-time-records/time-logs?date=${date}`
    if (officeId) url += `&office_id=${officeId}`
    const { data } = await useApiCall(url, authStore.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody?.success && Array.isArray(responseBody.data)) {
      const mappedLogs = (responseBody.data as TimeLogEntry[]).map((log) => ({
        employee_id: log.id_number,
        timestamp: `${log.time_log_date}T${log.scanned_time}`,
        is_in: log.is_in,
        id: log.time_log_id,
        created_at: undefined,
        updated_at: undefined,
        daily_time_record: undefined,
      }))
      updateDailyLogs(date, mappedLogs as WarmBodyLogEntry[])
    } else if (responseBody) {
      updateDailyLogs(date, [])
    }
    return responseBody
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
    showScannedEmployeeModal,
    updateDailyLogs,
  }
})
