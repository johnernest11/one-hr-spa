import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useStorage } from '@vueuse/core'
import { useApiCall } from '@/composables/network.ts'
import { useAuthStore } from '@/stores/auth.store'
import type { ApiResponseBody, WarmBodyLogEntry, DailyLogEntry } from '@/typings/http-resources.types.ts'
import type { ScannedEmployeeResponse } from '@/typings/models.types'
import type { WbAutoCompleteOption } from '@/components/webkit/WbAutoComplete.vue'

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

  const logEmployeeTime = async (payload: { scanned_qr: string; captured_image: string | null }) => {
    const { data, error } = await useApiCall('employees/log-time', authStore.authenticationToken).post(payload).json()

    if (error.value) {
      return {
        success: false,
        message: error.value.message || 'Request failed',
        data: null,
      }
    }

    return data.value as ApiResponseBody
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
    setOffice,
    clearOffice,
  }
})
