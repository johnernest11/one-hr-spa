<script setup lang="ts">
import { ref, onMounted, computed, watch, reactive } from 'vue'
import { TimeLogResponse, ViewDailyTimeRecordResponse } from '@/typings/models.types.ts'
import { UpdateDTRPayload, useDailyTimeRecordsStore } from '@/stores/daily-time-record.store'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import WbInputText from '@/components/webkit/WbInputText.vue'
import WbTextArea from '@/components/webkit/WbTextArea.vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import { useToast } from 'primevue/usetoast'
import {
  formatDTRTime,
  getDTRDayOfWeek,
  getFormattedDTRDate,
  toTimestamp,
  computeOT,
  computeUT,
  computeWorkedHours,
  isWeekend,
  resolveDTRSlots,
  formatDateToYearMonth,
  normalizeDateTimestamp,
  formatDateYMD,
  normalizeTimeOnly,
} from '@/utils/dtr-helpers'
import { useRoute } from 'vue-router'
import { getMonthAndYear } from '@/utils/helpers'
import { parseApiResponseError } from '@/utils/error-handle'
import WbTimePicker from '../webkit/WbTimePicker.vue'
import { usePersonnelStore } from '@/stores/personnel.store'

const dailyTimeRecordsStore = useDailyTimeRecordsStore()
const route = useRoute()
const toast = useToast()
const initialYear = route.query.year ? Number(route.query.year) : new Date().getFullYear()
const initialMonth = route.query.month ? Number(route.query.month) - 1 : new Date().getMonth()
const monthDate = ref<Date>(new Date(initialYear, initialMonth))
const allDailyTimeRecordsData = ref<ViewDailyTimeRecordResponse[]>([])
const fromDate = ref<Date | null>(null)
const toDate = ref<Date | null>(null)
const remarksMap = reactive<Record<string, string | number>>({})
const activeIndices = ref<number[]>([])
const errorMessage = ref<string | null>(null)
const errorDetails = ref<string[]>([])
const formIsSubmitting = ref(false)
const showErrorAlert = ref(false)
const IsBeingUpdated = ref(false)
const isLoading = ref(true)
// Define month/year props with defaults
const props = withDefaults(
  defineProps<{
    year?: number
    month?: number
  }>(),
  {
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  }
)
const filterYear = ref(props.year!)
const filterMonth = ref(props.month!)
const personnelStore = usePersonnelStore()
const selectedEmployeeId = ref<string | null>(null)

onMounted(async () => {
  const id = (route.params.id as string) || null
  selectedEmployeeId.value = id

  isLoading.value = true

  if (id) {
    await dailyTimeRecordsStore.fetchDailyTimeRecordsByEmployee(id, new Date())
  }
  await dailyTimeRecordsStore.fetchDailyTimeRecords()

  await handleViewDtr()
  isLoading.value = false
})

const currentEmployee = computed(() => {
  const employeeId = Number(route.params.id) || null
  if (!employeeId) return null

  return personnelStore.employees.find((emp) => emp.id === employeeId) ?? null
})

/** Emits */
const emit = defineEmits<{
  (e: 'my-monthy-dtr-updated', value: boolean): void
}>()

const toggleAccordion = (index: number) => {
  if (activeIndices.value.includes(index)) {
    activeIndices.value = activeIndices.value.filter((i) => i !== index)
  } else {
    activeIndices.value.push(index)
  }
}

const onAccordionClick = (item: { is_missing: string; date: Date; row: ViewDailyTimeRecordResponse | null }, index: number) => {
  const slots = resolveDTRSlots(item.row?.time_log ?? [])
  const hasMissing = Object.values(slots).some((value) => value === null)
  const hasEnoughEntries = (item.row?.time_log?.length ?? 0) >= 4

  if (hasMissing || hasEnoughEntries) {
    toggleAccordion(index)
  }
}

const isLocatorSlip = (log: TimeLogResponse, allLogs: TimeLogResponse[]): boolean => {
  const slots = resolveDTRSlots(allLogs)

  const usedTimes = [
    slots.in1 && `${slots.in1.date} ${slots.in1.scanned_time}`,
    slots.out1 && `${slots.out1.date} ${slots.out1.scanned_time}`,
    slots.in2 && `${slots.in2.date} ${slots.in2.scanned_time}`,
    slots.out2 && `${slots.out2.date} ${slots.out2.scanned_time}`,
  ].filter(Boolean)

  const key = `${log.date} ${log.scanned_time}`
  return !usedTimes.includes(key)
}

const normalizeTimeKey = (dtrTimeLogs: string, date: Date | string | null) =>
  `${dtrTimeLogs}-${date ? new Date(date).toISOString().slice(0, 10) : 'no-date'}`

const handleViewDtr = async () => {
  try {
    const response = await dailyTimeRecordsStore.fetchDailyTimeRecordsByMonth(monthDate.value)
    if (response && response.success && Array.isArray(response.data)) {
      allDailyTimeRecordsData.value = dailyTimeRecordsStore.viewDailyTimeRecords

      allDailyTimeRecordsData.value.forEach((dtr) => {
        if (dtr.date && dtr.time_log) {
          const dtrTimeLogs = resolveDTRSlots(dtr.time_log)
          Object.entries(dtrTimeLogs).forEach(([slot, value]) => {
            const key = normalizeTimeKey(slot, dtr.date)
            if (!(key in remarksMap)) {
              if (value && typeof value === 'object' && 'date' in value && 'scanned_time' in value) {
                remarksMap[key] = formatDTRTime(toTimestamp(value.date, value.scanned_time))
              }
            }
          })

          const utKey = normalizeTimeKey('ut', dtr.date)
          if (!(utKey in remarksMap)) {
            remarksMap[utKey] = dtr.ut ?? computeUT(computeWorkedHours(dtr.time_log ?? []), isWeekend(dtr.date))
          }
        }

        if (dtr.date) {
          const key = normalizeTimeKey('employee_remarks', dtr.date)
          if (!(key in remarksMap)) {
            remarksMap[key] = dtr.employee_remarks ?? ''
          }
        }
      })
    }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    toast.add({
      severity: 'error',
      summary: 'Cannot view daily time records.',
      detail: errorMessage + ' Please contact an administrator to fix this.',
      life: 5000,
    })
    console.log('Encountered error while attempting to fetch time logs. ', e)
  }
}

watch(
  () => [route.params.id, route.params.year, route.params.month],
  ([newId, newYear, newMonth]) => {
    selectedEmployeeId.value = newId as string | null

    const year = newYear ? Number(newYear) : new Date().getFullYear()
    const month = newMonth ? Number(newMonth) - 1 : new Date().getMonth()

    filterYear.value = year
    filterMonth.value = month
    monthDate.value = new Date(year, month)

    handleViewDtr()
  },
  { immediate: true }
)

const minMaxTs = computed<{ min: number; max: number } | null>(() => {
  const tsList = filteredDTRs.value.map((r) => normalizeDateTimestamp(r.date)!).sort((a, b) => a - b)
  return tsList.length ? { min: tsList[0], max: tsList[tsList.length - 1] } : null
})

const filteredDTRs = computed(() => {
  const fromTs = normalizeDateTimestamp(fromDate.value)
  const toTs = normalizeDateTimestamp(toDate.value)

  return allDailyTimeRecordsData.value.filter((r) => {
    const rTs = normalizeDateTimestamp(r.date)!
    if (fromTs !== null && rTs < fromTs) return false
    if (toTs !== null && rTs > toTs) return false
    return true
  })
})

const daysInMonth = computed(() => new Date(filterYear.value, filterMonth.value + 1, 0).getDate())

const monthDates = computed(() => {
  const range = minMaxTs.value
  const daysTotal = daysInMonth.value
  const arr: { is_missing: string; date: Date; row: ViewDailyTimeRecordResponse | null }[] = []

  for (let d = 1; d <= daysTotal; d++) {
    const dt = new Date(filterYear.value, filterMonth.value, d)
    const ts = normalizeDateTimestamp(dt)!

    const inRange = range ? ts >= range.min && ts <= range.max : true

    const row = inRange ? filteredDTRs.value.find((r) => normalizeDateTimestamp(r.date) === ts) ?? null : null
    const is_missing = row ? '' : 'Missing'

    arr.push({ is_missing, date: dt, row })
  }

  return arr
})

watch(
  monthDates,
  (dates) => {
    dates.forEach((dtr) => {
      if (dtr.row?.time_log) {
        const slots = resolveDTRSlots(dtr.row.time_log)

        const dateKey = dtr.date.toISOString()

        remarksMap[`in1-${dateKey}`] = slots.in1 ? formatDTRTime(toTimestamp(slots.in1.date, slots.in1.scanned_time)) : ''

        remarksMap[`out1-${dateKey}`] = slots.out1 ? formatDTRTime(toTimestamp(slots.out1.date, slots.out1.scanned_time)) : ''

        remarksMap[`in2-${dateKey}`] = slots.in2 ? formatDTRTime(toTimestamp(slots.in2.date, slots.in2.scanned_time)) : ''

        remarksMap[`out2-${dateKey}`] = slots.out2 ? formatDTRTime(toTimestamp(slots.out2.date, slots.out2.scanned_time)) : ''

        const utKey = `ut-${dateKey}`
        const otKey = `ot-${dateKey}`
        const remarksKey = `employee_remarks-${dateKey}`
        const remarksHrKey = `hr_remarks-${dateKey}`

        const dbUT = dtr.row?.ut ?? 0
        const dbOT = dtr.row?.ot ?? 0
        const computedUT = computeUT(computeWorkedHours(dtr.row?.time_log ?? []), isWeekend(dtr.row?.date))
        const computedOT = computeOT(computeWorkedHours(dtr.row?.time_log ?? []), isWeekend(dtr.row?.date))

        const currentUT = remarksMap[utKey]
        if (currentUT === undefined || currentUT === '' || currentUT === null) {
          remarksMap[utKey] = Math.abs(dbUT) < 0.001 ? computedUT : dbUT
        }

        const currentOT = remarksMap[otKey]
        if (currentOT === undefined || currentOT === '' || currentOT === null) {
          remarksMap[otKey] = Math.abs(dbOT) < 0.001 ? computedOT : dbOT
        }

        remarksMap[remarksKey] = dtr.row?.employee_remarks || ''
        remarksMap[remarksHrKey] = dtr.row?.hr_remarks || ''
      }
    })
  },
  { immediate: true, deep: true }
)

/** _____________________________________________________________
Update all DTRs but only send updates for rows that actually changed.
_________________________________________________________________ */
const updateDTRTimeLogs = async () => {
  IsBeingUpdated.value = true
  formIsSubmitting.value = true
  let hasValidationError = false
  const dtrPayloads: UpdateDTRPayload['dtr'] = monthDates.value
    .map((item) => {
      const existingDTR = item.row
      const dateKey = item.date.toISOString()
      const remarksKey = `employee_remarks-${dateKey}`
      const remarksHrKey = `hr_remarks-${dateKey}`
      const utKey = `ut-${dateKey}`
      const otKey = `ot-${dateKey}`
      const enteredRemarks = remarksMap[remarksKey] ?? ''
      const enteredHRRemarks = remarksMap[remarksHrKey] ?? ''
      const enteredUT = Number(remarksMap[utKey] ?? 0)
      const enteredOT = Number(remarksMap[otKey] ?? 0)
      const enteredTime = remarksMap as Record<string, string | Date>

      const slots = ['in1', 'out1', 'in2', 'out2'] as const
      const time_logs: { id: number; date: string; scanned_time: string; is_in: boolean; is_selected: boolean }[] = []
      const existingLogs = existingDTR?.time_log ?? []

      slots.forEach((slot) => {
        const key = `${slot}-${dateKey}`
        const value = enteredTime[key]

        if (!value) return

        const normalized = normalizeTimeOnly(value)
        if (!normalized) return

        // Get existing slot (if any)
        const existingSlot = resolveDTRSlots(existingLogs)[slot]

        if (existingSlot) {
          const existingTime = normalizeTimeOnly(existingSlot.scanned_time)
          // Skip if nothing changed
          if (existingTime === normalized) return

          // If changed, update instead of adding duplicate
          time_logs.push({
            id: existingSlot.id,
            date: formatDateYMD(item.date),
            scanned_time: normalized,
            is_in: slot === 'in1' || slot === 'in2',
            is_selected: true,
          })
        } else {
          // New slot → insert
          time_logs.push({
            id: 0,
            date: formatDateYMD(item.date),
            scanned_time: normalized,
            is_in: slot === 'in1' || slot === 'in2',
            is_selected: true,
          })
        }
      })
      // === Validation: Ensure OUT1 → IN2 gap >= 15 minutes ===
      const out1 = time_logs.find((log) => log.is_in === false && log.scanned_time && log.date === formatDateYMD(item.date))
      const in2 = time_logs.find((log) => log.is_in === true && log.scanned_time && log.date === formatDateYMD(item.date))

      if (out1 && in2) {
        const out1Time = new Date(`${out1.date}T${out1.scanned_time}`)
        const in2Time = new Date(`${in2.date}T${in2.scanned_time}`)

        const diffMinutes = (in2Time.getTime() - out1Time.getTime()) / (1000 * 60)

        if (diffMinutes < 15) {
          toast.add({
            severity: 'error',
            summary: 'Invalid Time Entry',
            detail: 'There must be at least a 15-minute gap between OUT1 and IN2.',
            life: 3000,
          })
          hasValidationError = true
          return null
        }
      }

      // === Existing DTR ===
      if (existingDTR) {
        const existingSlots = resolveDTRSlots(existingDTR.time_log ?? [])

        const existingTimestamps = Object.values(existingSlots)
          .filter((slot): slot is TimeLogResponse => slot !== null)
          .map((slot) => toTimestamp(slot.date, slot.scanned_time))

        const timeLogsToAdd = time_logs
          .filter((log) => !existingTimestamps.includes(toTimestamp(log.date, log.scanned_time)))
          .map((log) => ({ ...log }))

        const remarksChanged = enteredRemarks !== (existingDTR.employee_remarks ?? '')
        const remarksHrChanged = enteredHRRemarks !== (existingDTR.hr_remarks ?? '')

        // Only allow UT/OT changes if route.params.id exists
        const canUpdateUTOT = !!route.params.id

        const utChanged = canUpdateUTOT && enteredUT !== (existingDTR.ut ?? 0)
        const otChanged = canUpdateUTOT && enteredOT !== (existingDTR.ot ?? 0)

        if (remarksChanged || remarksHrChanged || utChanged || otChanged || timeLogsToAdd.length > 0) {
          return {
            id: existingDTR.id,
            date: formatDateYMD(item.date),
            ...(remarksChanged ? { employee_remarks: enteredRemarks } : {}),
            ...(remarksHrChanged ? { hr_remarks: enteredHRRemarks } : {}),
            ...(utChanged ? { ut: enteredUT } : {}),
            ...(otChanged ? { ot: enteredOT } : {}),
            ...(timeLogsToAdd.length > 0 ? { time_logs: timeLogsToAdd } : {}),
          }
        }
        return null
      }

      // === New DTR (only if no row exists) ===
      if (enteredRemarks || enteredHRRemarks || enteredUT > 0 || enteredOT > 0 || time_logs.length > 0) {
        return {
          date: formatDateYMD(item.date),
          employee_remarks: enteredRemarks,
          hr_remarks: enteredHRRemarks,
          ut: enteredUT,
          ot: enteredOT,
          time_logs,
        }
      }
      return null
    })
    .filter(Boolean) as UpdateDTRPayload['dtr']

  if (hasValidationError) {
    IsBeingUpdated.value = false
    formIsSubmitting.value = false
    return
  }

  if (!dtrPayloads.length) {
    toast.add({ severity: 'info', summary: 'No Changes', detail: 'No updates to save.', life: 2000 })
    IsBeingUpdated.value = false
    formIsSubmitting.value = false
    return
  }

  const updatePayload: UpdateDTRPayload = {
    month: formatDateToYearMonth(monthDate.value),
    dtr: dtrPayloads,
  }

  const response = await dailyTimeRecordsStore.updateDailyTimeRecords(updatePayload)
  if (!response.success) {
    const result = parseApiResponseError(response)
    if (result) {
      showErrorAlert.value = true
      errorMessage.value = result.message
      errorDetails.value = result.errors
    }
  } else {
    toast.add({ severity: 'success', summary: 'DTR Saved', detail: 'Updates saved successfully', life: 1000 })
    emit('my-monthy-dtr-updated', true)
  }

  IsBeingUpdated.value = false
  formIsSubmitting.value = false
}

const getRemarksKey = (prefix: string, date?: Date | null): string => {
  return `${prefix}-${date ? date.toISOString() : 'no-date'}`
}

const isEditedTimeLog = computed(() => {
  return (slot: 'in1' | 'out1' | 'in2' | 'out2', logs: TimeLogResponse[] = []) => {
    const slotLog = resolveDTRSlots(logs)[slot]
    if (!slotLog) return false

    return logs.some(
      (log) =>
        log.id === slotLog.id &&
        log.is_in === slotLog.is_in &&
        log.created_at &&
        formatDateYMD(new Date(log.date)) !== formatDateYMD(new Date(log.created_at))
    )
  }
})

/** _____________________________________________________________
                           Export to PDF  DTRs .
_________________________________________________________________ */
const exportToPDF = async (employeeId: string, startDate = '1900-01-01', endDate = '2100-12-31') => {
  toast.add({
    severity: 'info',
    summary: 'Exporting...',
    detail: `Exporting DTR from ${startDate} to ${endDate}...`,
    life: 5000,
  })

  try {
    const reportResponse = await dailyTimeRecordsStore.generateDailyTimeRecords(employeeId, startDate, endDate)

    if (!reportResponse.data.value) {
      throw new Error('No data received from the server')
    }

    const blob = new Blob([reportResponse.data.value], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url

    a.download = reportResponse.fileNameHeader.value || `DTR-${employeeId}-${startDate}_to_${endDate}.pdf`

    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    toast.add({
      severity: 'success',
      summary: 'DTR Exported',
      detail: `The DTR for employee ${employeeId} was successfully exported.`,
      life: 5000,
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Export Failed',
      detail: `Failed to export DTR: ${(error as Error).message}`,
      life: 5000,
    })
    console.error('Export error:', error)
  }
}
</script>

<template>
  <div class="flex h-full w-full flex-col">
    <Card class="h-full shadow-none">
      <template #content>
        <div class="flex w-full flex-col items-start md:flex-row">
          <Button
            icon="pi pi-angle-left"
            severity="secondary"
            aria-label="Bookmark"
            rounded
            @click="$router.go(-1)"
            size="small"
            class="mb-2 ml-4 md:mb-0 md:ml-0"
          />
          <h2 class="mb-2 ml-4 text-3xl text-surface-600 dark:text-primary-100 md:ml-4">
            <font-awesome-icon :icon="['fas', 'calendar']" class="h-5 text-surface-600 sm:h-6 md:h-7" />
            {{ route.params.id ? '' : 'My ' }}Daily Time Record (DTR) for
            {{ getMonthAndYear((monthDate?.toISOString() ?? new Date().toISOString()) || '') }}
            <br />
            <span v-if="currentEmployee" class="ml-4 text-lg text-surface-600 md:text-xl lg:text-2xl">
              {{ currentEmployee.last_name }} , {{ currentEmployee.first_name }} {{ currentEmployee.middle_name }}
            </span>
          </h2>
        </div>

        <!-- Button Actions Section -->
        <div class="flex flex-col gap-2 px-4 md:flex-row md:items-center md:justify-between">
          <!-- Placeholder for filters or extra info -->
          <div class="w-full md:w-2/3 lg:w-1/2"></div>

          <!-- Export & Navigation Buttons -->
          <div class="flex w-full flex-col gap-4 md:w-auto md:flex-row md:justify-end">
            <Button
              label="Export All DTRs"
              @click="() => exportToPDF(selectedEmployeeId || '', '2025-10-01', '2025-10-31')"
              :loading="formIsSubmitting"
              :disabled="formIsSubmitting"
              text
            >
              <template #icon>
                <i class="pi pi-file-pdf mr-2"></i>
              </template>
            </Button>
          </div>
        </div>
        <br />

        <div id="dtr_table" class="relative">
          <!-- Spinner -->
          <div v-if="isLoading" class="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm">
            <span class="h-8 w-8 animate-spin rounded-full border-4 border-surface-600 border-t-transparent"></span>
          </div>
          <div v-else-if="!isLoading">
            <!-- Header: visible only on md and up -->
            <div class="hidden grid-cols-6 gap-2 border-b-2 bg-surface-100 px-4 py-4 md:grid md:px-24">
              <div class="text-center text-sm font-semibold text-surface-500">WORKING</div>
              <div class="text-center text-sm font-semibold text-surface-500">AM</div>
              <div class="text-center text-sm font-semibold text-surface-500">PM</div>
              <div class="ml-32 text-right text-sm font-semibold text-surface-500">HOURS</div>
              <div class="ml-56 text-right text-sm font-semibold text-surface-500">REMARKS</div>
              <div class="ml-12 text-center text-sm font-semibold text-surface-500">HR REMARKS</div>
            </div>
            <div class="hidden grid-cols-10 gap-2 border-b-2 bg-surface-100 px-4 py-4 md:grid md:px-24">
              <div class="text-start text-sm font-semibold text-surface-500">Date</div>
              <div class="text-start text-sm font-semibold text-surface-500">Days</div>
              <div class="text-start text-sm font-semibold text-surface-500">IN 1</div>
              <div class="text-start text-sm font-semibold text-surface-500">OUT 1</div>
              <div class="text-start text-sm font-semibold text-surface-500">IN 2</div>
              <div class="text-start text-sm font-semibold text-surface-500">OUT 2</div>
              <div class="text-start text-sm font-semibold text-surface-500">UT</div>
              <div class="text-start text-sm font-semibold text-surface-500">OT</div>
              <div class="text-start text-sm font-semibold text-surface-500"></div>
            </div>

            <!-- Data row -->
            <div
              v-for="(dtr, index) in monthDates"
              :key="dtr.date.getTime()"
              class="grid grid-cols-1 items-center gap-y-2 border-b border-surface-300 px-4 py-4 md:grid-cols-10 md:gap-2 md:px-24"
            >
              <div>
                <p class="text-xs font-semibold text-surface-500 md:hidden">Date</p>
                <!-- Show badge if there's missing entries -->
                <span
                  v-if="dtr.row && Object.values(resolveDTRSlots(dtr.row?.time_log ?? [])).some((value) => value === null)"
                  class="rounded bg-error-600 px-2 py-1 text-xs !text-surface-0"
                >
                  Missing entries
                </span>
                <br />
                <span
                  v-if="dtr.row && (dtr.row.time_log?.length ?? 0) > 4"
                  class="text-warm-900 rounded bg-warn-400 px-2 py-1 text-xs"
                >
                  Multiple Entry
                </span>

                <!-- Date text -->
                <p
                  class="text-base text-surface-600"
                  :class="{
                    'cursor-pointer text-error-900': (dtr.row?.time_log?.length ?? 0) > 4,
                  }"
                  @click="(dtr.row?.time_log?.length ?? 0) > 4 ? onAccordionClick(dtr, index) : null"
                >
                  {{ getFormattedDTRDate(dtr.date.toISOString()) }}
                </p>

                <!-- Show details if active -->
                <div v-if="dtr.row && activeIndices.includes(index)">
                  <!-- Detailed info: list of time logs -->
                  <div class="relative w-full p-2">
                    <div class="relative w-full p-2">
                      <div class="mt-2">
                        <div
                          v-for="(log, logIDx) in dtr.row?.time_log"
                          :key="log.id"
                          class="mb-1 flex cursor-pointer flex-row items-center gap-2"
                        >
                          <span class="mb-2 text-xs font-semibold text-surface-500">#{{ logIDx + 1 }}.</span>
                          <p
                            v-tooltip="isLocatorSlip(log, dtr.row?.time_log ?? []) ? 'Locator Slip' : ''"
                            :class="[
                              'absolute right-2 mb-2 text-base sm:right-2',
                              isLocatorSlip(log, dtr.row?.time_log ?? []) ? 'text-success-600' : '!text-surface-600',
                            ]"
                          >
                            {{ formatDTRTime(toTimestamp(log.date, log.scanned_time)) }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <p class="text-xs font-semibold text-surface-500 md:hidden">Day</p>
                <p class="text-base text-surface-600">
                  {{ getDTRDayOfWeek((dtr.date?.toISOString() ?? new Date().toISOString()) || '') }}
                </p>
              </div>

              <!-- IN 1 -->
              <div>
                <p class="text-xs font-semibold text-surface-500 md:hidden">IN 1</p>
                <p
                  v-if="dtr.row && resolveDTRSlots(dtr.row.time_log ?? []).in1 && !isEditedTimeLog('in1', dtr.row.time_log ?? [])"
                  class="text-base text-surface-600"
                >
                  {{
                    resolveDTRSlots(dtr.row.time_log ?? []).in1
                      ? formatDTRTime(
                          toTimestamp(
                            resolveDTRSlots(dtr.row.time_log ?? []).in1!.date,
                            resolveDTRSlots(dtr.row.time_log ?? []).in1!.scanned_time
                          )
                        )
                      : ''
                  }}
                </p>

                <WbTimePicker
                  v-else-if="
                    dtr.row &&
                    dtr.row.time_log?.length &&
                    (!resolveDTRSlots(dtr.row.time_log).in1 || isEditedTimeLog('in1', dtr.row.time_log))
                  "
                  v-model="remarksMap[getRemarksKey('in1', dtr.date)]"
                  label=""
                  :warning="isEditedTimeLog('in1', dtr.row?.time_log ?? [])"
                  :showIcon="false"
                  placeholder="HH:mm"
                  v-tooltip.bottom="'This time logs is edited'"
                  class="h-10 md:h-8 md:w-24"
                />
              </div>

              <!-- OUT 1 -->
              <div>
                <p class="text-xs font-semibold text-surface-500 md:hidden">OUT 1</p>
                <p
                  v-if="
                    dtr.row && resolveDTRSlots(dtr.row.time_log ?? []).out1 && !isEditedTimeLog('out1', dtr.row.time_log ?? [])
                  "
                  class="text-base text-surface-600"
                >
                  {{
                    resolveDTRSlots(dtr.row.time_log ?? []).in1
                      ? formatDTRTime(
                          toTimestamp(
                            resolveDTRSlots(dtr.row.time_log ?? []).out1!.date,
                            resolveDTRSlots(dtr.row.time_log ?? []).out1!.scanned_time
                          )
                        )
                      : ''
                  }}
                </p>
                <WbTimePicker
                  v-else-if="
                    dtr.row &&
                    dtr.row.time_log?.length &&
                    (!resolveDTRSlots(dtr.row.time_log).out1 || isEditedTimeLog('out1', dtr.row.time_log))
                  "
                  v-model="remarksMap[getRemarksKey('out1', dtr.date)]"
                  label=""
                  :warning="isEditedTimeLog('out1', dtr.row?.time_log ?? [])"
                  :showIcon="false"
                  placeholder="HH:mm"
                  v-tooltip.bottom="'This time logs is edited'"
                  class="h-10 md:h-8 md:w-24"
                />
              </div>

              <!-- IN 2 -->
              <div>
                <p class="text-xs font-semibold text-surface-500 md:hidden">IN 2</p>
                <p
                  v-if="dtr.row && resolveDTRSlots(dtr.row.time_log ?? []).in2 && !isEditedTimeLog('in2', dtr.row.time_log ?? [])"
                  class="text-base text-surface-600"
                >
                  {{
                    resolveDTRSlots(dtr.row.time_log ?? []).in2
                      ? formatDTRTime(
                          toTimestamp(
                            resolveDTRSlots(dtr.row.time_log ?? []).in2!.date,
                            resolveDTRSlots(dtr.row.time_log ?? []).in2!.scanned_time
                          )
                        )
                      : ''
                  }}
                </p>
                <WbTimePicker
                  v-else-if="
                    dtr.row &&
                    dtr.row.time_log?.length &&
                    (!resolveDTRSlots(dtr.row.time_log).in2 || isEditedTimeLog('in2', dtr.row.time_log))
                  "
                  v-model="remarksMap[getRemarksKey('in2', dtr.date)]"
                  label=""
                  :warning="isEditedTimeLog('in2', dtr.row?.time_log ?? [])"
                  :showIcon="false"
                  placeholder="HH:mm"
                  v-tooltip.bottom="'This time logs is edited'"
                  class="h-10 md:h-8 md:w-24"
                />
              </div>

              <!-- OUT 2 -->
              <div>
                <p class="text-xs font-semibold text-surface-500 md:hidden">OUT 2</p>
                <p
                  v-if="
                    dtr.row && resolveDTRSlots(dtr.row.time_log ?? []).out2 && !isEditedTimeLog('out2', dtr.row.time_log ?? [])
                  "
                  class="text-base text-surface-600"
                >
                  {{
                    resolveDTRSlots(dtr.row.time_log ?? []).out2
                      ? formatDTRTime(
                          toTimestamp(
                            resolveDTRSlots(dtr.row.time_log ?? []).out2!.date,
                            resolveDTRSlots(dtr.row.time_log ?? []).out2!.scanned_time
                          )
                        )
                      : ''
                  }}
                </p>
                <WbTimePicker
                  v-else-if="
                    dtr.row &&
                    dtr.row.time_log?.length &&
                    (!resolveDTRSlots(dtr.row.time_log).out2 || isEditedTimeLog('out2', dtr.row.time_log))
                  "
                  v-model="remarksMap[getRemarksKey('out2', dtr.date)]"
                  label=""
                  :warning="isEditedTimeLog('out2', dtr.row?.time_log ?? [])"
                  :showIcon="false"
                  placeholder="HH:mm"
                  v-tooltip.top="resolveDTRSlots(dtr.row?.time_log ?? []).out2 ? 'This time log is Edited' : ''"
                  class="h-10 md:h-8 md:w-24"
                />
              </div>

              <!-- UT, OT, Remarks -->
              <div>
                <p class="text-xs font-semibold text-surface-500 md:hidden">UT</p>
                <template v-if="!route.params.id">
                  <p class="h-12 text-surface-600 md:h-8 md:w-24">
                    {{ remarksMap[`ut-${dtr.date?.toISOString() ?? ''}`] ?? 0 }}
                  </p>
                </template>
                <template v-else>
                  <WbInputText
                    label=""
                    type="number"
                    v-model="remarksMap[getRemarksKey('ut', dtr.date)]"
                    step="0.01"
                    min="0"
                    placeholder="UT"
                    class="h-12 md:h-8 md:w-24"
                  />
                </template>
              </div>

              <div>
                <p class="text-xs font-semibold text-surface-500 md:hidden">OT</p>
                <template v-if="!route.params.id">
                  <p class="h-12 text-surface-600 md:h-8 md:w-24">
                    {{ remarksMap[`ot-${dtr.date?.toISOString() ?? ''}`] ?? 0 }}
                  </p>
                </template>
                <template v-else>
                  <WbInputText
                    label=""
                    type="number"
                    v-model="remarksMap[getRemarksKey('ot', dtr.date)]"
                    step="0.01"
                    min="0"
                    placeholder="OT"
                    class="h-12 md:h-8 md:w-24"
                  />
                </template>
              </div>

              <div>
                <p class="text-xs font-semibold text-surface-500 md:hidden">Remarks</p>
                <WbTextArea
                  v-model="remarksMap[getRemarksKey('employee_remarks', dtr.date)] as string"
                  label=""
                  class="md:w-30 h-8 md:h-8"
                  placeholder="Enter remarks"
                />
              </div>
              <div>
                <p class="text-xs font-semibold text-surface-500 md:hidden">HR Remarks</p>
                <template v-if="!route.params.id">
                  <p class="h-12 text-surface-600 md:h-8 md:w-24">
                    {{ remarksMap[`hr_remarks-${dtr.date?.toISOString() ?? ''}`] ?? '' }}
                  </p>
                </template>
                <template v-else>
                  <WbTextArea
                    v-model="remarksMap[getRemarksKey('hr_remarks', dtr.date)] as string"
                    label=""
                    class="h-8 md:h-8 md:w-48"
                    placeholder="Enter remarks"
                  />
                </template>
              </div>
            </div>

            <!-- Other content -->
            <div class="mt-2 flex justify-end gap-2">
              <Button
                label="Cancel"
                class="dark:text-secondary-100 border border-surface-400 text-base text-surface-500 dark:border-surface-700 lg:text-surface-500 dark:lg:text-surface-400"
                text
                @click="$router.go(-1)"
              >
                <template #icon>
                  <i class="pi pi-ban mr-2"></i>
                </template>
              </Button>
              <Button
                label="Update"
                @click="updateDTRTimeLogs"
                :loading="formIsSubmitting"
                :disabled="formIsSubmitting"
                class="border border-primary-400 text-base text-primary-500 dark:border-primary-700 dark:text-primary-100 lg:text-primary-500 dark:lg:text-primary-400"
                text
              >
                <template #icon>
                  <i class="pi pi-save mr-2"></i>
                </template>
              </Button>
            </div>
            <!-- End Action Buttons -->
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>
