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
  computeUTOTFlex,
  computeWorkedHours,
  isWeekend,
  resolveDTRSlots,
  formatDateToYearMonth,
  normalizeDateTimestamp,
  formatDateYMD,
  normalizeTimeOnly,
  generateUTOTTooltip,
  computeRemarks,
  DTRSlotValues,
} from '@/utils/dtr-helpers'
import { useRoute } from 'vue-router'
import { getMonthAndYear } from '@/utils/helpers'
import { parseApiResponseError } from '@/utils/error-handle'
import WbTimePicker from '../webkit/WbTimePicker.vue'
import { usePersonnelStore } from '@/stores/personnel.store'
import useVuelidate from '@vuelidate/core'
import { helpers, required } from '@vuelidate/validators'
import { useAuthStore } from '@/stores/auth.store.ts'

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

const auth = useAuthStore()

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

/*******************************************************************
        Initialize and load selected employee's DTR data
****************************************************************** */
onMounted(async () => {
  const id = (route.params.id as string) || null
  selectedEmployeeId.value = id

  isLoading.value = true

  await dailyTimeRecordsStore.fetchDailyTimeRecordsByMonth(monthDate.value, 31, selectedEmployeeId.value || undefined)

  await handleViewDtr(selectedEmployeeId.value || undefined)

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

/*******************************************************************
               Toggle of Time Logs Entries
****************************************************************** */
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

/*******************************************************************
               Handle on Viewing of Daily Time Record
****************************************************************** */
const handleViewDtr = async (employeeId?: string | number) => {
  try {
    const response = await dailyTimeRecordsStore.fetchDailyTimeRecordsByMonth(monthDate.value, 31, employeeId)
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

    if (selectedEmployeeId.value) {
      handleViewDtr(selectedEmployeeId.value)
    }
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

        const dateKey = dtr.date ? new Date(dtr.date).toISOString() : 'no-date'
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

        if (!dtr.row?.employee_remarks) {
          remarksMap[remarksKey] = computeRemarksValue.value(dtr)
        } else {
          remarksMap[remarksKey] = dtr.row.employee_remarks
        }
        remarksMap[remarksHrKey] = dtr.row?.hr_remarks || ''
      }
    })
  },
  { immediate: true, deep: true }
)
const getRemarksKey = (prefix: string, date?: Date | null): string => {
  return `${prefix}-${date ? date.toISOString() : 'no-date'}`
}

/**
 * Compute UT (Undertime) for a DTR row
 */
const computeUTValue = computed(() => {
  return (item: { date: string | Date; row: ViewDailyTimeRecordResponse | null }) => {
    if (!item.row) return 0

    const date = new Date(item.date ?? item.row.date)

    if (isWeekend(date.toISOString())) return 0

    const timeLog = item.row.time_log ?? []

    /**
     * ADDED LOGIC (rule support)
     */
    const dbUT = item.row.ut
    const hasValidDB = dbUT != null && Number(dbUT) > 0
    const hasLogs = timeLog.length > 0

    const isEdited =
      timeLog.length > 0 &&
      formatDateYMD(new Date(item.row.date)) !== formatDateYMD(new Date(toTimestamp(timeLog[0].date, timeLog[0].scanned_time)))

    const { in1, out1, in2, out2 } = resolveDTRSlots(timeLog)

    const isComplete = !!in1 && !!out2

    if (isEdited) {
      // skip DB entirely → continue to auto-compute below
    } else {
      /**
       * DB RULES (ONLY when NOT edited)
       */
      if (hasLogs && !isComplete && hasValidDB) {
        return Number(dbUT)
      }

      if (!hasLogs && hasValidDB) {
        return Number(dbUT)
      }
    }

    let inTime: string | null = null
    let outTime: string | null = null

    if (in1 && out2) {
      inTime = toTimestamp(in1.date, in1.scanned_time)
      outTime = toTimestamp(out2.date, out2.scanned_time)
    } else if (in1 && out1) {
      inTime = toTimestamp(in1.date, in1.scanned_time)
      outTime = toTimestamp(out1.date, out1.scanned_time)
    } else if (in2 && out2) {
      inTime = toTimestamp(in2.date, in2.scanned_time)
      outTime = toTimestamp(out2.date, out2.scanned_time)
    }

    /**
     * If incomplete logs → fallback to regular UT computation
     */
    if (!inTime || !outTime) {
      const worked = computeWorkedHours(timeLog)
      return computeUT(worked, isWeekend(item.row.date))
    }

    const { ut } = computeUTOTFlex(inTime, outTime)

    return ut
  }
})
/**
 * Compute OT (Overtime) for a DTR row
 */
const computeOTValue = computed(() => {
  return (item: { row: ViewDailyTimeRecordResponse | null }) => {
    if (!item.row) return 0

    const date = new Date(item.row.date)
    const day = date.getDay()
    const dbOT = item.row.ot

    const timeLog = item.row.time_log ?? []

    const isEdited =
      timeLog.length > 0 &&
      formatDateYMD(new Date(item.row.date)) !== formatDateYMD(new Date(toTimestamp(timeLog[0].date, timeLog[0].scanned_time)))

    const hasValidDB = dbOT != null && Number(dbOT) > 0

    if (!isEdited && hasValidDB) {
      return Number(dbOT)
    }

    /**
     * MONDAY FLEX RULE
     */
    if (day === 1) {
      const { in1, out2 } = resolveDTRSlots(timeLog)

      if (!in1 || !out2) return 0

      const { ot } = computeUTOTFlex(toTimestamp(in1.date, in1.scanned_time), toTimestamp(out2.date, out2.scanned_time))

      return ot
    }

    /**
     * REGULAR OT
     */
    const worked = computeWorkedHours(timeLog)
    return computeOT(worked, isWeekend(item.row.date))
  }
})

const computeRemarksValue = computed(() => {
  return (item: { row: ViewDailyTimeRecordResponse | null }) => {
    if (!item.row) return ''

    // Accept only meaningful non-empty remarks
    const remark = item.row.employee_remarks
    if (remark !== null && remark !== undefined && remark.toString().trim() !== '') {
      return remark
    }

    return computeRemarks(item.row.time_log ?? [])
  }
})

/*******************************************************************
                        Validation Form Rules
****************************************************************** */

interface FormRules {
  remarksMap: Record<string, { required: (value: unknown) => boolean }>
}

/************** Form rules **************/
const formRules = computed<FormRules>(() => {
  const rules: FormRules = { remarksMap: {} }

  monthDates.value.forEach((dtr) => {
    if (!dtr.row) return

    const timeLogs = dtr.row.time_log ?? []
    const slots = resolveDTRSlots(timeLogs)

    /*** Employee remarks required rule if any missing slot ***/
    const hasMissing = Object.values(slots).some((v) => v === null)
    if (hasMissing) {
      const remarksKey = getRemarksKey('employee_remarks', dtr.date)
      rules.remarksMap[remarksKey] = {
        required: helpers.withMessage('Required when entries are missing', required) as unknown as (value: unknown) => boolean,
      }
    }

    /*** Duplicate time entries validation (out1 → in2) ***/
    const out1 = timeLogs.find((log) => !log.is_in && log.scanned_time && log.date === formatDateYMD(dtr.date))
    const in2 = timeLogs.find((log) => log.is_in && log.scanned_time && log.date === formatDateYMD(dtr.date))

    if (out1 && in2) {
      const out1Time = new Date(`${out1.date}T${out1.scanned_time}`)
      const in2Time = new Date(`${in2.date}T${in2.scanned_time}`)

      const duplicateTime = (in2Time.getTime() - out1Time.getTime()) / (1000 * 60)

      /*** Only apply duplicate validation if both exist and are too close in time ***/
      if (duplicateTime === 0) {
        const duplicateKeys = ['in1', 'out1', 'in2', 'out2']
        duplicateKeys.forEach((slotKey) => {
          const remarksKey = getRemarksKey(slotKey, dtr.date)
          /*** Only assign if this slot doesn't already have a "missing" rule ***/
          if (rules.remarksMap[remarksKey]) {
            rules.remarksMap[remarksKey] = {
              required: helpers.withMessage('Duplicate entry', required) as unknown as (value: unknown) => boolean,
            }
          }
        })
      }
    }
  })

  return rules
})

const isEditingOtherEmployee = computed(() => {
  return (
    selectedEmployeeId.value != null &&
    Number(selectedEmployeeId.value ?? auth.authenticatedUser.user_profile?.individual_basic_detail?.employee?.id)
  )
})

const validator = useVuelidate(formRules, { remarksMap }, { $lazy: true })

/*******************************************************************
Update all DTRs but only send updates for rows that actually changed.
********************************************************************* */

/*
 * Validation Form for Duplicate Entry
 */
const validateRealtiDuplicateTimeLogs = (slots: DTRSlotValues): string | null => {
  const entries = [
    { label: 'Time In (AM)', value: slots.in1 },
    { label: 'Time Out (AM)', value: slots.out1 },
    { label: 'Time In (PM)', value: slots.in2 },
    { label: 'Time Out (PM)', value: slots.out2 },
  ].filter((entry) => entry.value)

  const seen = new Map<string, string>()

  for (const entry of entries) {
    const normalized = normalizeTimeOnly(entry.value)
    if (!normalized) continue

    if (seen.has(normalized)) {
      const previousLabel = seen.get(normalized)
      return `${previousLabel} and ${entry.label} cannot be the same`
    }

    seen.set(normalized, entry.label)
  }

  return null
}
/*
 * Update Function
 */
const updateDTRTimeLogs = async () => {
  let valid = true

  if (!isEditingOtherEmployee.value) {
    validator.value.$touch()
    valid = await validator.value.$validate()
  }

  if (!valid) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please fill all required remarks for missing entries.',
      life: 3000,
    })
    return
  }

  IsBeingUpdated.value = true
  formIsSubmitting.value = true

  // Track duplicate time entries for toast
  const duplicatedTimes: { date: string; slot: string; time: string }[] = []
  const dtrPayloads: UpdateDTRPayload['dtr'] = monthDates.value
    .map((item) => {
      const existingDTR = item.row
      const dateKey = item.date ? new Date(item.date).toISOString() : 'no-date'
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

      const time_logs: {
        id: number
        date: string
        scanned_time: string
        is_in: boolean
        is_selected: boolean
      }[] = []

      const existingLogs = existingDTR?.time_log ?? []

      /************************************************************
       * Normalize entered slots
       ************************************************************/
      const enteredSlots: Partial<Record<(typeof slots)[number], string>> = {}

      for (const slot of slots) {
        const key = `${slot}-${dateKey}`
        const value = enteredTime[key]

        if (!value) continue

        const normalized = normalizeTimeOnly(value)
        if (!normalized) continue

        enteredSlots[slot] = normalized
      }

      /************************************************************
       * Validate duplicates inside FORM (NOT DB)
       ************************************************************/
      const validationResult = validateRealtiDuplicateTimeLogs(enteredSlots as DTRSlotValues)

      if (validationResult) {
        duplicatedTimes.push({
          date: formatDateYMD(item.date),
          slot: 'FORM',
          time: validationResult,
        })

        return null
      }

      /************************************************************
       * Build time logs
       ************************************************************/
      for (const slot of slots) {
        const normalized = enteredSlots[slot]
        if (!normalized) continue

        const existingLogsForDate = existingLogs.filter((log) => formatDateYMD(log.date) === formatDateYMD(item.date))

        const existingSlot = resolveDTRSlots(existingLogsForDate)[slot]

        if (existingSlot) {
          const existingTime = normalizeTimeOnly(existingSlot.scanned_time)

          if (existingTime === normalized) continue

          time_logs.push({
            id: existingSlot.id,
            date: formatDateYMD(item.date),
            scanned_time: normalized,
            is_in: slot === 'in1' || slot === 'in2',
            is_selected: true,
          })
        } else {
          time_logs.push({
            id: 0,
            date: formatDateYMD(item.date),
            scanned_time: normalized,
            is_in: slot === 'in1' || slot === 'in2',
            is_selected: true,
          })
        }
      }

      /************************************************************
       * Existing DTR update logic
       ************************************************************/
      const hasTimeLogs = time_logs.length > 0
      const hasRemarks = enteredRemarks !== (existingDTR?.employee_remarks ?? '')

      const hasHRRemarks = enteredHRRemarks !== (existingDTR?.hr_remarks ?? '')

      const hasUT = !!route.params.id && enteredUT !== (existingDTR?.ut ?? 0)

      const hasOT = !!route.params.id && enteredOT !== (existingDTR?.ot ?? 0)

      const hasChanges = hasTimeLogs || hasRemarks || hasHRRemarks || hasUT || hasOT
      if (existingDTR) {
        if (!hasChanges) return null

        return {
          id: existingDTR.id,
          date: formatDateYMD(item.date),
          ...(hasRemarks ? { employee_remarks: enteredRemarks } : {}),
          ...(hasHRRemarks ? { hr_remarks: enteredHRRemarks } : {}),
          ...(hasUT ? { ut: enteredUT } : {}),
          ...(hasOT ? { ot: enteredOT } : {}),
          ...(hasTimeLogs ? { time_logs } : {}),
        }
      }

      /************************************************************
       * New DTR
       ************************************************************/
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

  /************************************************************
   * Handle validation errors
   ************************************************************/
  if (duplicatedTimes.length > 0) {
    const grouped = duplicatedTimes.reduce(
      (acc, dup) => {
        if (!acc[dup.date]) acc[dup.date] = []
        acc[dup.date].push({ slot: dup.slot, time: dup.time })
        return acc
      },
      {} as Record<string, { slot: string; time: string }[]>
    )

    Object.entries(grouped).forEach(([date, duplicates]) => {
      const formattedDate = new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      })

      const detail =
        duplicates[0].slot === 'FORM'
          ? `${formattedDate} - ${duplicates[0].time}`
          : `${formattedDate} - Duplicate time entries detected`

      toast.add({
        severity: 'error',
        summary: 'Invalid Time Entry',
        detail,
        life: 10000,
      })
    })

    IsBeingUpdated.value = false
    formIsSubmitting.value = false
    return
  }

  /************************************************************
   * No changes
   ************************************************************/
  if (!dtrPayloads.length) {
    toast.add({
      severity: 'info',
      summary: 'No Changes',
      detail: 'No updates to save.',
      life: 2000,
    })

    IsBeingUpdated.value = false
    formIsSubmitting.value = false
    return
  }

  /************************************************************
   * Submit
   ************************************************************/
  const updatePayload: UpdateDTRPayload = {
    month: formatDateToYearMonth(monthDate.value),
    dtr: dtrPayloads,
  }

  const employeeIdToUpdate = Number(
    selectedEmployeeId.value ?? auth.authenticatedUser.user_profile?.individual_basic_detail?.employee?.id
  )

  const response = await dailyTimeRecordsStore.updateDailyTimeRecords(employeeIdToUpdate, updatePayload)

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
/*******************************************************************
  Watch all DTR rows' time logs and always recompute UT/OT
********************************************************************* */

/**Reset the OT & UT if Timelogs Change */
watch(
  () => monthDates.value.map((dtr) => dtr.row?.time_log),
  () => {
    const today = new Date(new Date().setHours(0, 0, 0, 0))

    monthDates.value.forEach((dtr) => {
      const { date, row } = dtr

      // Skip empty rows and future dates
      if (!row || new Date(date) >= today) return

      const utKey = getRemarksKey('ut', date)
      const otKey = getRemarksKey('ot', date)

      /**
       * Use the same logic as your compute functions:
       * - If database value is non-zero, use it.
       * - If database value is 0/null/undefined, auto-compute.
       */
      remarksMap[utKey] = computeUTValue.value({
        date,
        row,
      })

      remarksMap[otKey] = computeOTValue.value({
        row,
      })
    })
  },
  { deep: true, immediate: true }
)

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

/********************************************************************
                           Export to PDF  DTRs .
*********************************************************************/

const exportCurrentMonthDTR = () => {
  // Read selected month from route params
  const monthStr = route.params.month as string | undefined
  const yearStr = route.params.year as string | undefined

  if (!monthStr || !yearStr) {
    console.error('Month or year not selected')
    return
  }

  const yearNum = Number(yearStr)
  const monthNum = Number(monthStr) // 1-12

  if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    console.error('Invalid year or month')
    return
  }

  // Helper to pad month/day
  const pad = (n: number) => n.toString().padStart(2, '0')

  const startDateStr = `${yearNum}-${pad(monthNum)}-01`
  const endDateStr = `${yearNum}-${pad(monthNum)}-${new Date(yearNum, monthNum, 0).getDate()}`

  exportToPDF(selectedEmployeeId.value || '', startDateStr, endDateStr)
}

const exportToPDF = async (
  employeeId: string,
  startDate = '1900-01-01',
  endDate = '2100-12-31',
  yearNum?: number,
  monthNum?: number
) => {
  const monthName = monthNum
    ? new Date(yearNum!, monthNum - 1).toLocaleString('default', { month: 'long' })
    : new Date(startDate).toLocaleString('default', { month: 'long' })
  const year = yearNum || new Date(startDate).getFullYear()

  toast.add({
    severity: 'info',
    summary: 'Exporting...',
    detail: `Exporting DTR of ${monthName} ${year}...`,
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
      detail: `The DTR for employee ${employeeId} for ${monthName} ${year} was successfully exported.`,
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
            {{ getMonthAndYear(monthDate) }}
            <br />
            <span v-if="!isLoading && currentEmployee" class="ml-4 text-lg text-surface-600 md:text-xl lg:text-2xl">
              {{ currentEmployee.last_name }} , {{ currentEmployee.first_name }} {{ currentEmployee.middle_name }}
              {{ currentEmployee.ext_name }}
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
              label="Export DTR"
              @click="exportCurrentMonthDTR"
              :loading="formIsSubmitting"
              :disabled="formIsSubmitting"
              class="border border-primary-400 text-base text-primary-500 dark:border-primary-700 dark:text-primary-100 lg:text-primary-500 dark:lg:text-primary-400"
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
            <div class="hidden grid-cols-8 gap-2 border-b-2 bg-surface-100 px-4 py-4 md:grid md:px-24">
              <div class="text-center text-sm font-semibold text-surface-500">WORKING</div>
              <div class="text-center text-sm font-semibold text-surface-500">AM</div>
              <div class="text-center text-sm font-semibold text-surface-500">PM</div>
              <div class="ml-32 text-right text-sm font-semibold text-surface-500">HOURS</div>
              <div class="col-span-2 ml-56 text-right text-sm font-semibold text-surface-500">REMARKS</div>
              <div class="col-span-2 ml-12 text-center text-sm font-semibold text-surface-500">HR REMARKS</div>
            </div>
            <div class="hidden grid-cols-12 gap-2 border-b-2 bg-surface-100 px-4 py-4 md:grid md:px-24">
              <div class="text-start text-sm font-semibold text-surface-500">Date</div>
              <div class="text-start text-sm font-semibold text-surface-500">Days</div>
              <div class="text-start text-sm font-semibold text-surface-500">IN 1</div>
              <div class="text-start text-sm font-semibold text-surface-500">OUT 1</div>
              <div class="text-start text-sm font-semibold text-surface-500">IN 2</div>
              <div class="text-start text-sm font-semibold text-surface-500">OUT 2</div>
              <div class="text-start text-sm font-semibold text-surface-500">UT</div>
              <div class="col-span-2 text-start text-sm font-semibold text-surface-500">OT</div>
              <div class="col-span-2 text-start text-sm font-semibold text-surface-500"></div>
            </div>

            <!-- Data row -->
            <div
              v-for="(dtr, index) in monthDates"
              :key="dtr.date.getTime()"
              class="grid cursor-pointer grid-cols-1 items-center gap-y-2 border-b border-surface-300 px-4 py-4 transition-all duration-150 hover:bg-surface-100 md:grid-cols-12 md:gap-2 md:px-24"
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
                    'cursor-pointer text-error-900': (dtr.row?.time_log?.length ?? 0) > 0,
                  }"
                  @click="(dtr.row?.time_log?.length ?? 0) > 0 ? onAccordionClick(dtr, index) : null"
                >
                  {{ getFormattedDTRDate(dtr.date) }}
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
                          <span class="mb-2 mr-6 text-xs font-semibold text-surface-500">#{{ logIDx + 1 }}.</span>
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
                  {{ getDTRDayOfWeek(dtr.date) }}
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
                    (!resolveDTRSlots(dtr.row.time_log).in1 || isEditedTimeLog('in1', dtr.row.time_log)) &&
                    new Date(dtr.date).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0)
                  "
                  v-model="remarksMap[getRemarksKey('in1', dtr.date)]"
                  label=""
                  :warning="isEditedTimeLog('in1', dtr.row?.time_log ?? [])"
                  :showIcon="false"
                  placeholder="HH:mm"
                  v-tooltip.bottom="'This time logs is edited'"
                  class="h-10 md:h-12 md:w-24"
                  inputClass="text-center"
                  :invalid="validator.remarksMap?.[getRemarksKey('in1', dtr.date)]?.$error"
                  :invalidText="validator.remarksMap?.[getRemarksKey('in1', dtr.date)]?.$errors[0]?.$message"
                  @blur="validator.remarksMap[getRemarksKey('in1', dtr.date)]?.$touch()"
                >
                </WbTimePicker>
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
                    (!resolveDTRSlots(dtr.row.time_log).out1 || isEditedTimeLog('out1', dtr.row.time_log)) &&
                    new Date(dtr.date).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0)
                  "
                  v-model="remarksMap[getRemarksKey('out1', dtr.date)]"
                  label=""
                  :warning="isEditedTimeLog('out1', dtr.row?.time_log ?? [])"
                  :showIcon="false"
                  placeholder="HH:mm"
                  v-tooltip.bottom="'This time logs is edited'"
                  class="h-10 md:h-12 md:w-24"
                  inputClass="text-center"
                  :invalid="validator.remarksMap?.[getRemarksKey('out1', dtr.date)]?.$error"
                  :invalidText="validator.remarksMap?.[getRemarksKey('out1', dtr.date)]?.$errors[0]?.$message"
                  @blur="validator.remarksMap[getRemarksKey('out1', dtr.date)]?.$touch()"
                >
                </WbTimePicker>
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
                    (!resolveDTRSlots(dtr.row.time_log).in2 || isEditedTimeLog('in2', dtr.row.time_log)) &&
                    new Date(dtr.date).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0)
                  "
                  v-model="remarksMap[getRemarksKey('in2', dtr.date)]"
                  label=""
                  :warning="isEditedTimeLog('in2', dtr.row?.time_log ?? [])"
                  :showIcon="false"
                  placeholder="HH:mm"
                  v-tooltip.bottom="'This time logs is edited'"
                  class="h-10 md:h-12 md:w-24"
                  inputClass="text-center"
                  :invalid="validator.remarksMap?.[getRemarksKey('in2', dtr.date)]?.$error"
                  :invalidText="validator.remarksMap?.[getRemarksKey('in2', dtr.date)]?.$errors[0]?.$message"
                  @blur="validator.remarksMap[getRemarksKey('in2', dtr.date)]?.$touch()"
                >
                </WbTimePicker>
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
                    (!resolveDTRSlots(dtr.row.time_log).out2 || isEditedTimeLog('out2', dtr.row.time_log)) &&
                    new Date(dtr.date).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0)
                  "
                  v-model="remarksMap[getRemarksKey('out2', dtr.date)]"
                  label=""
                  :warning="isEditedTimeLog('out2', dtr.row?.time_log ?? [])"
                  :showIcon="false"
                  placeholder="HH:mm"
                  v-tooltip.top="resolveDTRSlots(dtr.row?.time_log ?? []).out2 ? 'This time log is Edited' : ''"
                  class="h-10 md:h-12 md:w-24"
                  inputClass="text-center"
                  :invalid="validator.remarksMap?.[getRemarksKey('out2', dtr.date)]?.$error"
                  :invalidText="validator.remarksMap?.[getRemarksKey('out2', dtr.date)]?.$errors[0]?.$message"
                  @blur="validator.remarksMap[getRemarksKey('out2', dtr.date)]?.$touch()"
                >
                </WbTimePicker>
              </div>

              <!-- UT, OT, Remarks -->
              <div>
                <p class="text-xs font-semibold text-surface-500 md:hidden">UT</p>
                <template v-if="!route.params.id">
                  <p class="text-base text-surface-600" v-tooltip.bottom="generateUTOTTooltip(computeUTValue(dtr), 'UT')">
                    {{ computeUTValue(dtr) }}
                  </p>
                </template>
                <template v-else>
                  <WbInputText
                    v-if="new Date(dtr.date) < new Date(new Date().setHours(0, 0, 0, 0))"
                    v-tooltip.bottom="'Reset to 0.00 to enable auto-computation'"
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
                  <p class="text-base text-surface-600" v-tooltip.bottom="generateUTOTTooltip(computeOTValue(dtr), 'OT')">
                    {{ computeOTValue(dtr) }}
                  </p>
                </template>
                <template v-else>
                  <WbInputText
                    v-if="new Date(dtr.date) < new Date(new Date().setHours(0, 0, 0, 0))"
                    v-tooltip.bottom="'Reset to 0.00 to enable auto-computation'"
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

              <div class="col-span-2">
                <p class="text-xs font-semibold text-surface-500 md:hidden">Remarks</p>

                <textarea
                  v-model="remarksMap[getRemarksKey('employee_remarks', dtr.date)]"
                  @blur="!isEditingOtherEmployee && validator.remarksMap[getRemarksKey('employee_remarks', dtr.date)]?.$touch()"
                  :placeholder="computeRemarksValue(dtr)"
                  rows="2"
                />

                <p
                  v-if="!isEditingOtherEmployee && validator.remarksMap?.[getRemarksKey('employee_remarks', dtr.date)]?.$error"
                  class="mt-1 text-xs text-error-500"
                >
                  {{ validator.remarksMap?.[getRemarksKey('employee_remarks', dtr.date)]?.$errors[0]?.$message }}
                </p>
              </div>
              <div class="col-span-2">
                <p class="text-xs font-semibold text-surface-500 md:hidden">HR Remarks</p>
                <template v-if="!route.params.id">
                  <p class="h-12 text-surface-600 md:h-8 md:w-24">
                    {{ dtr.date ? remarksMap[`hr_remarks-${new Date(dtr.date).toISOString()}`] ?? '' : '' }}
                  </p>
                </template>
                <template v-else>
                  <WbTextArea
                    v-if="new Date(dtr.date) < new Date(new Date().setHours(0, 0, 0, 0))"
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
