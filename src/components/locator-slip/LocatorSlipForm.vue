<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { helpers, maxLength, required } from '@vuelidate/validators'
import useVuelidate from '@vuelidate/core'
import { useRoute } from 'vue-router'
import Button from 'primevue/button'
import RadioButton from 'primevue/radiobutton'
import Card from 'primevue/card'
import Message from 'primevue/message'
import MeterGroup from 'primevue/metergroup'
import { useToast } from 'primevue/usetoast'
import { useLocatorSlipStore, LocatorSlipPayload } from '@/stores/locator-slip.store'
import { useDailyTimeRecordsStore } from '@/stores/daily-time-record.store'
import { useLibrariesStore } from '@/stores/libraries.store.ts'
import { formatDateSafe, isSameOrAfterDate, formatDateLong } from '@/utils/helpers.ts'
import WbInputText from '@/components/webkit/WbInputText.vue'
import WbCalendar from '../webkit/WbCalendar.vue'
import { LSLoggerResponse, TimeLogResponse } from '@/typings/models.types'
import TreeSelect from 'primevue/treeselect'

const locatorSlipStore = useLocatorSlipStore()
const warmBodiesStore = useDailyTimeRecordsStore()
const librariesStore = useLibrariesStore()
const route = useRoute()
const toast = useToast()

const isHumanResourceActive = computed(() => route.name === 'locator-slips/editor')
const addLoggerBtn = ref(true)
const isLoading = ref(true)
const formIsSubmitting = ref(false)
const isFormTypeA = ref(false)
const isThereActiveLog = ref(false)
const isInOffice = ref(false)
const isLate = ref(false)
const displayLocatorWarning = ref(false)
const warningMessage = ref(
  "Heads Up! You are currently out of the office. This slip's Time Out will be linked to your next physical Time Out."
)
const defaultApproval = ref('personal_time')
const purposePlaceholder = ref('e.g. Wellness Activity')
const destinationPlaceholder = ref('e.g. Robinsons, San Fernando, La Union')

onMounted(async () => {
  await librariesStore.fetchListLocatorActivities()
})

// Define a clear, recursive interface for your tree nodes
interface TreeNode {
  label: string
  key: string
  children?: TreeNode[]
}

const getSelectionObjectFromPath = (tree: TreeNode[], pathString: string): Record<string, boolean> | null => {
  if (!pathString || typeof pathString !== 'string') return null

  const targetLabels = pathString.split('>').map((label) => label.trim())

  const findKeyByLabels = (nodesArray: TreeNode[], level: number): string | null => {
    const currentTargetLabel = targetLabels[level]

    for (const node of nodesArray) {
      if (node.label.trim() === currentTargetLabel) {
        if (level === targetLabels.length - 1) return node.key
        if (node.children) {
          const foundKey = findKeyByLabels(node.children, level + 1)
          if (foundKey) return foundKey
        }
      }
    }
    return null
  }

  const matchedKey = findKeyByLabels(tree, 0)
  return matchedKey ? { [matchedKey]: true } : null
}

const getHierarchyPath = (tree: any[], targetKey: string, currentPath: string[] = []): string[] | null => {
  for (const node of tree) {
    const path = [...currentPath, node.label.trim()]
    if (node.key === targetKey) return path
    if (node.children) {
      const foundPath = getHierarchyPath(node.children, targetKey, path)
      if (foundPath) return foundPath
    }
  }
  return null
}

const bindPurpose = (row: any) => {
  return computed({
    get() {
      if (typeof row.purpose === 'string') {
        return getSelectionObjectFromPath(librariesStore.locatorActivities, row.purpose) || {}
      }
      return row.purpose || {}
    },
    set(newValue) {
      if (newValue && typeof newValue === 'object') {
        const activeKey = Object.keys(newValue)[0]
        if (activeKey) {
          const pathArray = getHierarchyPath(librariesStore.locatorActivities, activeKey)
          if (pathArray) {
            row.purpose = pathArray.join(' > ')
            return
          }
        }
      }
      row.purpose = ''
    },
  })
}

const auxRemaining = ref(0)
const auxUsed = ref(0)

const validateDateNow = (value: string) => {
  if (!value) return false
  return isSameOrAfterDate(value, new Date().toString())
}

const validateMonth = (value: string) => {
  if (!value) return false
  const now = new Date()
  const compareDate = new Date(value)

  if (payload.period === '1st Half') {
    const monthValid =
      now.getFullYear() === compareDate.getFullYear() && now.getMonth() === compareDate.getMonth() && now.getDate() <= 15
    if (!monthValid) {
      warningMessage.value = 'The period of this locator slip has already passed. Please generate a new one.'
    }
    return monthValid
  }

  const monthValid = now.getFullYear() === compareDate.getFullYear() && now.getMonth() === compareDate.getMonth()
  if (!monthValid) {
    warningMessage.value = 'The period of this locator slip has already passed. Please generate a new one.'
  }
  return monthValid
}

const today = new Date()
const currentMonth = today.getMonth()
const currentYear = today.getFullYear()
const lastDayOfCurrentMonth = ref(new Date(currentYear, currentMonth + 1, 0))

onMounted(async () => {
  const id = route.params.id as string
  if (id) {
    await checkCurrentEmployeeStatus()
    await checkActiveLog()

    const response = await locatorSlipStore.fetchLocatorSlipById(id)
    if (response && response.success) {
      const locatorSlipData = response.data
      updatePayloadFromResponse(locatorSlipData as LocatorSlipPayload)

      if (payload.form_type === 'c' && payload.period != null) {
        if (payload.period === '1st Half') {
          lastDayOfCurrentMonth.value = new Date(currentYear, currentMonth, 15)
        }
      }

      if (payload.form_type === 'a') {
        defaultApproval.value = 'official_business'
        purposePlaceholder.value = 'e.g. Provide TA'
        destinationPlaceholder.value = 'e.g. RPMO'
      }
    }
  }

  isLoading.value = false
})

const payload = reactive<LocatorSlipPayload>({
  form_type: '',
  date: '',
  period: null,
  locator_slip_no: null,
  auxiliary_wellness: 0,
  locator_slip_logger: [
    {
      locator_slip_id: null,
      date: '',
      time_in: null,
      time_out: null,
      destination: '',
      purpose: '',
      approved_for: defaultApproval.value,
      duration: 0,
      remarks: '',
    },
  ],
})

const updatePayloadFromResponse = (locatorSlip: LocatorSlipPayload | null) => {
  ;(payload.form_type = locatorSlip?.form_type ?? ''),
  (payload.date = locatorSlip?.date ?? ''),
  (payload.period = locatorSlip?.period ?? null),
  (payload.locator_slip_no = locatorSlip?.locator_slip_no ?? null),
  (payload.auxiliary_wellness = locatorSlip?.auxiliary_wellness ?? 0),
  (payload.locator_slip_logger = locatorSlip?.locator_slip_logger ?? [])

  if (payload.locator_slip_logger) {
    payload.locator_slip_logger.forEach((log) => {
      const formattedDate = formatDateLong(log.date)
      log.date = formattedDate
      log.duration = parseFloat(log.duration?.toFixed(2))
    })
  }
  isFormTypeA.value = payload.form_type === 'a' ? true : false

  auxRemaining.value = payload.auxiliary_wellness
  auxUsed.value = 2 - payload.auxiliary_wellness
}

const checkActiveLog = async () => {
  const response = await locatorSlipStore.checkActiveLog()
  if (response && response.success) {
    if (response.data) {
      isThereActiveLog.value = true

      const activeLog = response.data as LSLoggerResponse
      if (!activeLog.time_out && !isInOffice.value) displayLocatorWarning.value = true
    } else {
      if (!isInOffice.value) displayLocatorWarning.value = true
    }
  }
}

const checkCurrentEmployeeStatus = async () => {
  const [response, checkLateResponse] = await Promise.all([warmBodiesStore.getLastTimeLog(), warmBodiesStore.checkLate()])

  if (response && response.success) {
    if (response.data) {
      const lastLog = response.data as TimeLogResponse
      if (lastLog.is_in) isInOffice.value = true
    }
  } else {
    toast.add({
      severity: 'error',
      summary: 'An error has occured.',
      detail: response.error_message,
      life: 5000,
    })
  }

  if (checkLateResponse && checkLateResponse.success) {
    if (checkLateResponse.data) {
      isLate.value = checkLateResponse.data.is_late
    }
  } else {
    toast.add({
      severity: 'error',
      summary: 'An error has occured.',
      detail: checkLateResponse.error_message,
      life: 5000,
    })
  }
}

const auxiliaryWellnessData = computed(() => {
  return [
    { label: 'Used', value: auxUsed.value, color: 'bg-primary-500 dark:bg-primary-400', icon: 'pi pi-times' },
    { label: 'Remaining', value: auxRemaining.value, color: 'rgb(203 213 225)', icon: 'pi pi-clock' },
  ]
})

/** Validation */
const globalStringMaxLength = import.meta.env.VITE_GLOBAL_STRING_MAX_LENGTH
const globalStringMaxLengthRule = helpers.withMessage(
  `Must not exceed ${globalStringMaxLength} characters`,
  maxLength(globalStringMaxLength)
)
const formRules = computed(() => ({
  $lazy: true,
  locator_slip_logger: payload.locator_slip_logger.map((_, index) => ({
    date: {
      maxLength: globalStringMaxLengthRule,
    },
    destination: {
      required: helpers.withMessage('Destination is required', required),
      maxLength: helpers.withMessage('', globalStringMaxLengthRule),
    },
    purpose: {
      auxiliaryCheck: helpers.withMessage('The 2 hrs of your auxiliary wellness has already been used.', () => {
        const locatorLog = payload.locator_slip_logger[index]
        const selectedPurpose = locatorLog.purpose
        const hasId = !!locatorLog.id

        if (selectedPurpose === 'Auxiliary Wellness' && !hasId) {
          const isAuxUsed = auxRemaining.value === 0
          return !isAuxUsed
        }
        return true
      }),
      wellnessMonday: helpers.withMessage('Wellness activity is not allowed on Mondays.', () => {
        const locatorLog = payload.locator_slip_logger[index]
        const selectedPurpose = locatorLog.purpose
        const hasId = !!locatorLog.id
        const today = new Date()
        const isMonday = today.getDay() === 1

        if (selectedPurpose === 'Wellness Activity' && !hasId && isMonday) {
          return false
        }
        return true
      }),
      lateCheck: helpers.withMessage('You are late today. You cannot claim wellness activity.', () => {
        const locatorLog = payload.locator_slip_logger[index]
        const selectedPurpose = locatorLog.purpose
        const hasId = !!locatorLog.id

        if (selectedPurpose === 'Wellness Activity' && !hasId && isLate.value) {
          return false
        }
        return true
      }),
      required: helpers.withMessage('Purpose is required', required),
      maxLength: helpers.withMessage('', globalStringMaxLengthRule),
    },
    remarks: {
      maxLength: helpers.withMessage('', globalStringMaxLengthRule),
    },
    approved_for: {
      required: helpers.withMessage('Approval Type is required', required),
    },
    duration: {
      durationFormat: helpers.withMessage(
        'Invalid format. Please enter valid hours (e.g. 1, 1.5, 0.25).',
        (value: string | null) => {
          if (!value) return true
          return /^\d+(\.\d{1,2})?$/.test(value)
        }
      ),
    },
  })),
}))

/** Handle Form Submission */
const validator = useVuelidate<Partial<LocatorSlipPayload>>(formRules, payload)

/* -------------------------------------------------------------------------- */
/*                             Button Interactions                            */
/* -------------------------------------------------------------------------- */

const isButtonVisible = computed(() => true)
const handleButtonClick = async () => {
  formIsSubmitting.value = true

  await saveButtonSubmission()

  formIsSubmitting.value = false
}

/** Function to add a new ls logger */
const addLogger = () => {
  const dateNow = new Date()
  const id = Number(route.params.id)

  const defaultLog = {
    locator_slip_id: id ?? null,
    date: formatDateLong(dateNow.toDateString()),
    time_in: null,
    time_out: null,
    destination: '',
    purpose: '',
    approved_for: defaultApproval.value,
    duration: 0,
    remarks: '',
  }

  const newLSLog = { ...defaultLog }
  payload.locator_slip_logger.push(newLSLog)
}

/** Function to remove ls loggers */
const removeLoggers = (index: number) => {
  if (index >= 0 && index < payload.locator_slip_logger.length) {
    payload.locator_slip_logger.splice(index, 1)
  }
}

const padToTwoDigits = (num: number) => String(num).padStart(2, '0')

/** Form Submission */
const saveButtonSubmission = async () => {
  validator.value.$touch()
  const valid = await validator.value.$validate()

  if (!valid) {
    toast.add({
      severity: 'error',
      summary: 'Locator Slip not updated.',
      detail: 'Please see the validation messages.',
      life: 5000,
    })
    return
  }

  formIsSubmitting.value = true

  payload.locator_slip_logger.forEach((loggerItem) => {
    if (loggerItem.date) {
      const dateToCheck = loggerItem.date as unknown as Date | string

      if (typeof dateToCheck === 'object' && dateToCheck !== null && dateToCheck instanceof Date) {
        loggerItem.date = formatDateLong(dateToCheck.toISOString())
      }
      loggerItem.date = formatDateSafe(loggerItem.date, true)
    }

    if (loggerItem.time_in) {
      const dateObj = new Date(`2000-01-01T${loggerItem.time_in}`)

      if (!isNaN(dateObj.getTime())) {
        const hours = padToTwoDigits(dateObj.getHours())
        const minutes = padToTwoDigits(dateObj.getMinutes())

        loggerItem.time_in = `${hours}:${minutes}`
      }
    }

    if (loggerItem.time_out) {
      const dateObj = new Date(`2000-01-01T${loggerItem.time_out}`)

      if (!isNaN(dateObj.getTime())) {
        const hours = padToTwoDigits(dateObj.getHours())
        const minutes = padToTwoDigits(dateObj.getMinutes())

        loggerItem.time_out = `${hours}:${minutes}`
      }
    }
  })

  try {
    const response = await locatorSlipStore.updateLocatorSlip(payload, route.params.id as string)
    if (response.success) {
      isThereActiveLog.value = true

      const locatorSlipData = response.data
      updatePayloadFromResponse(locatorSlipData as LocatorSlipPayload)

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Locator Slip updated successfully.',
        life: 5000,
      })
    } else {
      toast.add({
        severity: 'error',
        summary: 'Locator Slip Not Created',
        detail: response.error_message,
        life: 5000,
      })
    }
  } finally {
    formIsSubmitting.value = false
  }
}
</script>
<template>
  <div class="flex h-full w-full flex-col shadow-md">
    <Card class="h-full">
      <template #content v-if="!isLoading">
        <div class="flex w-full flex-col items-center md:flex-row">
          <Button
            icon="pi pi-angle-left"
            severity="secondary"
            aria-label="Bookmark"
            rounded
            @click="$router.go(-1)"
            size="small"
            class="mb-2 ml-4 md:mb-0 md:ml-0"
          />
          <h2 class="ml-4 text-3xl font-semibold text-primary-800 dark:text-primary-100 md:ml-4">
            <FontAwesomeIcon icon="fa-solid fa-location-dot" class="h-5 text-primary-700 sm:h-6 md:h-7" />
            Locator Slip Logger
          </h2>
        </div>

        <!-- Content for Locator Slip Logger-->
        <div class="mt-4 p-4">
          <h2 class="mb-4 ml-4 text-2xl italic text-primary-700 dark:text-primary-700 md:ml-4">
            Locator Slip Form {{ payload.form_type.toUpperCase() }}
            <div v-if="payload.locator_slip_no" class="text-xl font-semibold uppercase text-success-600">
              LS No: {{ payload.locator_slip_no }}
            </div>
            <br />

            <Message :closable="false" v-if="displayLocatorWarning">
              {{ warningMessage }}
            </Message>
          </h2>
          <!-- Header: visible only on md and up -->
          <div class="grid-rows-2">
            <div class="hidden grid-cols-10 items-center gap-2 bg-surface-100 px-4 py-1 text-center md:grid md:px-10">
              <div class="row-span-2 flex items-center justify-center text-sm font-semibold text-surface-500">Date</div>
              <div class="row-span-2 flex items-center justify-center text-sm font-semibold text-surface-500">Time Out</div>
              <div class="row-span-2 flex items-center justify-center text-sm font-semibold text-surface-500">Time In</div>
              <div class="row-span-2 flex items-center justify-center text-sm font-semibold text-surface-500">Destination</div>
              <div class="row-span-2 flex items-center justify-center text-sm font-semibold text-surface-500">Purpose</div>
              <div class="col-span-2 text-sm font-semibold text-surface-500">
                Approved For
                <div class="text-xs font-normal text-surface-400">To be check by Division Chief concerned / Section Head</div>
              </div>
              <div class="text-sm font-semibold text-surface-500">
                No. of Hrs/Mins on Personal Time
                <div class="text-xs font-normal text-surface-400">(to be accomplished by PAS)</div>
              </div>
              <div class="col-span-2 row-span-2 flex items-center justify-center text-sm font-semibold text-surface-500">
                Remarks
              </div>
            </div>
            <div class="hidden grid-cols-10 gap-2 border-b-2 bg-surface-100 px-4 py-1 text-center md:grid md:px-10">
              <div class="col-span-5"></div>
              <template v-if="!isFormTypeA">
                <div class="text-sm font-semibold text-surface-500">Official Time</div>
                <div class="text-sm font-semibold text-surface-500">Personal Time</div>
              </template>
              <template v-else>
                <div class="col-span-2 text-sm font-semibold text-surface-500">Official Business</div>
              </template>
              <div class="col-span-3"></div>
            </div>
          </div>

          <!-- Data row -->
          <div
            v-for="(row, index) in payload.locator_slip_logger"
            :key="index"
            class="grid grid-cols-10 items-center justify-items-center gap-2 border-b border-surface-300 px-4 py-2 text-center"
          >
            <div>
              <p class="text-xs font-semibold text-surface-500 md:hidden">Date</p>
              <WbCalendar
                v-model="row.date"
                label=""
                dateFormat="d MM yy"
                :minDate="today"
                :maxDate="lastDayOfCurrentMonth"
                :invalid="validator.locator_slip_logger?.[index]?.date?.$error"
                :invalid-text="validator.locator_slip_logger?.[index]?.date?.$errors[0]?.$message"
                @blur="validator.locator_slip_logger?.[index]?.date?.$touch()"
                :disabled="!validateDateNow(row.date) || isHumanResourceActive || row.time_out || row.time_in"
              >
              </WbCalendar>
            </div>
            <div>
              <p class="text-xs font-semibold text-surface-500 md:hidden">Time Out</p>
              <p class="text-base text-surface-600">
                {{ row.time_out }}
              </p>
            </div>
            <div>
              <p class="text-xs font-semibold text-surface-500 md:hidden">Time In</p>
              <p class="text-base text-surface-600">
                {{ row.time_in }}
              </p>
            </div>
            <div>
              <p class="text-xs font-semibold text-surface-500 md:hidden">Destination</p>
              <p class="text-base text-surface-600">
                <WbInputText
                  v-model="row.destination"
                  label=""
                  label-class="text-sm text-surface-600"
                  :placeholder="destinationPlaceholder"
                  class="w-full"
                  :disabled="!validateDateNow(row.date) || isHumanResourceActive || row.time_out || row.time_in"
                  :invalidText="validator.locator_slip_logger?.[index]?.destination?.$errors[0]?.$message"
                  :invalid="validator.locator_slip_logger?.[index]?.destination?.$error"
                  @blur="validator.locator_slip_logger?.[index]?.destination?.$touch()"
                />
              </p>
            </div>
            <div v-if="row.approved_for !== 'official_time'">
              <p class="text-xs font-semibold text-surface-500 md:hidden">Purpose</p>
              <WbInputText
                v-model="row.purpose"
                label=""
                label-class="text-sm text-surface-600"
                :placeholder="purposePlaceholder"
                class="w-full"
                :disabled="!validateDateNow(row.date) || isHumanResourceActive || row.time_out || row.time_in"
                :invalidText="validator.locator_slip_logger?.[index]?.purpose?.$errors[0]?.$message"
                :invalid="validator.locator_slip_logger?.[index]?.purpose?.$error"
                @blur="validator.locator_slip_logger?.[index]?.purpose?.$touch()"
              />
              <p class="text-base text-surface-600"></p>
            </div>
            <div v-else class="w-full">
              <p class="text-xs font-semibold text-surface-500 md:hidden">Purpose</p>
              <TreeSelect
                v-model="bindPurpose(row).value"
                :options="librariesStore.locatorActivities"
                selectionMode="single"
                placeholder="Purpose"
                :disabled="!validateDateNow(row.date) || isHumanResourceActive || !!row.time_out || !!row.time_in"
                :invalidText="validator.locator_slip_logger?.[index]?.purpose?.$errors[0]?.$message"
                :invalid="validator.locator_slip_logger?.[index]?.purpose?.$error"
                @blur="validator.locator_slip_logger?.[index]?.purpose?.$touch()"
                class="md:w-20rem mt-2 flex h-12 w-full items-center"
              />
              <p class="text-base text-surface-600"></p>
            </div>
            <template v-if="isFormTypeA">
              <div class="col-span-2 flex items-center">
                <p class="text-xs font-semibold text-surface-500 md:hidden">Official Business</p>
                <RadioButton
                  v-model="row.approved_for"
                  name="official_business"
                  inputId="official_business"
                  value="official_business"
                  class="scale-150 transform"
                  :disabled="!validateDateNow(row.date) || isHumanResourceActive"
                />
              </div>
            </template>

            <template v-else>
              <div class="flex items-center">
                <p class="text-xs font-semibold text-surface-500 md:hidden">Official Time</p>
                <RadioButton
                  v-model="row.approved_for"
                  name="official_time"
                  inputId="official_time"
                  value="official_time"
                  class="scale-150 transform"
                  :disabled="!validateDateNow(row.date) || isHumanResourceActive || !!row.time_out || !!row.time_in"
                />
              </div>
              <div class="flex items-center">
                <p class="text-xs font-semibold text-surface-500 md:hidden">Personal Time</p>
                <RadioButton
                  v-model="row.approved_for"
                  name="personal_time"
                  inputId="personal_time"
                  value="personal_time"
                  class="scale-150 transform"
                  :disabled="!validateDateNow(row.date) || isHumanResourceActive || !!row.time_out || !!row.time_in"
                />
              </div>
            </template>
            <div>
              <p class="text-xs font-semibold text-surface-500 md:hidden">No. of Hours</p>
              <p class="text-base text-surface-600">
                <WbInputText
                  v-model="row.duration"
                  label=""
                  label-class="text-sm text-surface-600"
                  placeholder="e.g. 0"
                  :disabled="!isHumanResourceActive"
                  :invalidText="validator.locator_slip_logger?.[index]?.duration?.$errors[0]?.$message"
                  :invalid="validator.locator_slip_logger?.[index]?.duration?.$error"
                  @blur="validator.locator_slip_logger?.[index]?.duration?.$touch()"
                />
              </p>
            </div>

            <div class="col-span-2 flex w-full">
              <div class="w-3/4">
                <p class="text-xs font-semibold text-surface-500 md:hidden">Remarks</p>
                <p class="text-base text-surface-600">
                  <WbInputText
                    v-model="row.remarks"
                    label=""
                    label-class="text-sm text-surface-600"
                    :disabled="isHumanResourceActive"
                    :invalidText="validator.locator_slip_logger?.[index]?.remarks?.$errors[0]?.$message"
                    :invalid="validator.locator_slip_logger?.[index]?.remarks?.$error"
                    @blur="validator.locator_slip_logger?.[index]?.remarks?.$touch()"
                  />
                </p>
              </div>
              <div class="flex w-1/4 items-center justify-end">
                <p class="text-xs font-semibold text-surface-500 md:hidden">Actions</p>
                <Button icon="pi pi-trash" severity="danger" rounded @click="removeLoggers(index)" v-if="!row.id" />
              </div>
            </div>
          </div>
        </div>
        <div class="flex w-full flex-col gap-4 p-4">
          <Button
            v-if="addLoggerBtn"
            label="+ Request New Logger"
            :disabled="!validateMonth(payload.date) || isHumanResourceActive || isThereActiveLog"
            @click="addLogger"
            class="dark:text-secondary-100 border border-primary-500 text-sm text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
            text
          />
        </div>

        <br />

        <!-- Save/Update Buttons -->
        <div v-if="!isFormTypeA">
          <h3 class="mb-4 ml-4 text-2xl text-primary-700 dark:text-primary-700 md:ml-4">
            Remaining auxiliary wellness for the month:
          </h3>
          <MeterGroup :value="auxiliaryWellnessData" :max="2">
            <template #label>
              <div class="text-l">
                <span class="pr-3">
                  <i :class="auxiliaryWellnessData[0].icon" class="dark:text-primary-40 text-primary-500" />
                  Used ({{ auxiliaryWellnessData[0].value.toFixed(2) }} hrs)
                </span>
                <span>
                  <i :class="auxiliaryWellnessData[1].icon" class="dark:text-primary-40 text-surface-500" />
                  Remaining ({{ auxiliaryWellnessData[1].value.toFixed(2) }} hrs)
                </span>
              </div>
            </template>
          </MeterGroup>
        </div>
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
            v-if="isButtonVisible"
            label="Save"
            @click="handleButtonClick"
            :loading="formIsSubmitting"
            :disabled="formIsSubmitting"
            size="large"
            class="dark:text-secondary-100 border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
            text
          >
            <template #icon>
              <i class="pi pi-save mr-2"></i>
            </template>
          </Button>
        </div>
      </template>
      <template #content v-else-if="isLoading">
        <div class="animate-pulse">
          <div class="flex w-full flex-col items-start md:flex-row">
            <div class="mb-2 ml-4 h-8 w-8 rounded-full bg-gray-200 md:mb-0 md:ml-0"></div>
          </div>

          <div class="p-4">
            <div class="mb-4 ml-4 h-7 w-80 rounded bg-gray-200 md:ml-4"></div>
            <div class="ml-4 h-6 w-48 rounded bg-gray-200 md:ml-4"></div>
          </div>

          <div class="p-4">
            <div class="hidden h-12 bg-gray-100 md:grid md:px-10"></div>

            <div v-for="i in 4" :key="i">
              <div
                class="grid grid-cols-10 items-center justify-items-center gap-2 border-b border-surface-300 px-4 py-2 text-center"
              >
                <div class="h-10 w-full rounded bg-gray-200"></div>

                <div class="h-6 w-full rounded bg-gray-200"></div>
                <div class="h-6 w-full rounded bg-gray-200"></div>

                <div class="h-10 w-full rounded bg-gray-200"></div>
                <div class="h-10 w-full rounded bg-gray-200"></div>

                <div class="flex items-center justify-center gap-2">
                  <div class="h-6 w-6 rounded-full bg-gray-200"></div>
                </div>

                <div class="h-6 w-full rounded bg-gray-200"></div>

                <div class="col-span-2 flex w-full">
                  <div class="h-10 w-3/4 rounded bg-gray-200"></div>
                  <div class="flex w-1/4 justify-end">
                    <div class="h-8 w-8 rounded-full bg-gray-200"></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-4 flex w-full flex-col gap-4 p-4">
              <div class="h-10 w-full self-start rounded bg-gray-200"></div>
            </div>
          </div>

          <br />

          <div class="mt-2 flex justify-end gap-2 p-4">
            <div class="h-10 w-24 rounded bg-gray-200"></div>
            <div class="h-10 w-28 rounded bg-primary-300"></div>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>
