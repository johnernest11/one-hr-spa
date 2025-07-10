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
    console.log('API called')
    currentScannedEmployee.value = null
    lastLogMessage.value = null

    const payload = {
      scanned_qr: rawQrText,
    }

    const { data } = await useApiCall('employees/log-time', authStore.authenticationToken).post(payload).json()

    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      lastLogMessage.value = responseBody.message || 'Time logged successfully.'
      const warmBodyLog = responseBody.data as WarmBodyLogEntry

      const employeeDetails = warmBodyLog?.daily_time_record?.employee?.individual_basic_detail
      const employeeItem = warmBodyLog?.daily_time_record?.employee?.item

      const photoUrl =
        employeeDetails?.user_profile?.profile_picture_url && employeeDetails.user_profile.profile_picture_url.trim() !== ''
          ? employeeDetails.user_profile.profile_picture_url
          : '/src/assets/image/Photo Card.png'

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
          photo_url: '/src/assets/image/placeholder-profile.png',
        }
      }

      const today = getManilaTodayISO()
      await fetchWarmBodySummary(today)
      await fetchDailyLogs(today)
    } else {
      lastLogMessage.value = responseBody.message || 'Failed to log time.'
      currentScannedEmployee.value = null
    }

    return {
      success: responseBody.success,
      message: lastLogMessage.value,
      data: currentScannedEmployee.value,
    }
  }

  const clearScannedEmployee = () => {
    currentScannedEmployee.value = null
    lastLogMessage.value = null
  }

  const fetchDailyLogs = async (date: string) => {
    const { data } = await useApiCall(`employees/daily-time-records/time-logs?date=${date}`, authStore.authenticationToken)
      .get()
      .json()

    const responseBody: ApiResponseBody = data.value

    if (responseBody.success && Array.isArray(responseBody.data)) {
      const mappedLogs = (responseBody.data as TimeLogEntry[])
        .map((log: TimeLogEntry) => ({
          employee_id: log.id_number,
          timestamp: `${log.time_log_date}T${log.scanned_time}`,
          is_in: log.is_in,
          id: log.time_log_id,
          daily_time_record_id: undefined,
        }))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      const logEntry = dailyLogs.value.find((l) => l.date === date)
      if (logEntry) {
        logEntry.warm_bodies = mappedLogs
      } else {
        dailyLogs.value.push({
          date: date,
          warm_bodies: mappedLogs,
        })
      }
    } else {
      const logEntry = dailyLogs.value.find((l) => l.date === date)
      if (logEntry) {
        logEntry.warm_bodies = []
      }
    }
    return responseBody
  }

  const fetchWarmBodySummary = async (date: string) => {
    const { data } = await useApiCall(
      `/employees/daily-time-records/warm-bodies/count?date=${date}`,
      authStore.authenticationToken
    )
      .get()
      .json()

    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      warmBodySummary.value = responseBody.data as WarmBodySummary
    } else {
      warmBodySummary.value = null
    }

    return responseBody
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
