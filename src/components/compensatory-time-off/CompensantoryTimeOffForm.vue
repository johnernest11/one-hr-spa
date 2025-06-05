<script setup lang="ts">
import { ref, reactive, onBeforeMount, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { parseApiResponseError } from '@/utils/error-handle.ts'
import useVuelidate from '@vuelidate/core'
import { helpers, maxLength, required } from '@vuelidate/validators'
import WbInputText from '@/components/webkit/WbInputText.vue'
import WbCalendar from '@/components/webkit/WbCalendar.vue'
import WbDropdown from '@/components/webkit/WbDropdown.vue'
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import Card from 'primevue/card'
import Dialog from 'primevue/dialog'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useRolesStore } from '@/stores/roles.store.ts'
import {
  PersonnelCompensatoryTimeOffPayload,
  PersonnelCompensatoryTimeDayOffDetailsPayload,
  useCompensatoryTimeOffStore,
} from '@/stores/personnel-compensatory-time-off.store'

/** Payload for the Personnel Compensatory Day Off  */
const payload = reactive<PersonnelCompensatoryTimeOffPayload>({
  ctdo_period: '',
  ctdo_supervisor_notes: '',
  ctdo_status: '',
  rows: [
    {
      days_of_the_week: '',
      work_date: '',
      time_start: null,
      time_end: null,
      accomplishment: null,
      authorized_claim: null,
    },
  ],
})

/** Payload details for each Compensatory Day Off entry */
const payloadDetails = reactive<Partial<PersonnelCompensatoryTimeDayOffDetailsPayload>>({
  days_of_the_week: '',
  work_date: '',
  time_start: null,
  time_end: null,
  accomplishment: null,
  authorized_claim: null,
})

/** Options for selecting the week number */
const weekOptions = ref([
  { label: 'Monday', value: 'Monday' },
  { label: 'Tuesday', value: 'Tuesday' },
  { label: 'Wednesday', value: 'Wednesday' },
  { label: 'Thursday', value: 'Thursday' },
  { label: 'Friday', value: 'Friday' },
  { label: 'Saturday', value: 'Saturday' },
  { label: 'Sunday', value: 'Sunday' },
])

const claimOptions = ref([{ label: 'COC', value: 'COC' }])

/** Controls the visibility */
const compensatoryBtn = ref(false)
const addcompensatoryFiledBtn = ref(false)
const showTextAreaActivity = ref(false)
const showTextAreaHighlights = ref(false)

const visible = ref(false)
const dialogType = ref('') // Add empty string for initial value
const dialogTitle = ref('')
const dialogMessage = ref('')
const confirmButtonLabel = ref('')

/** Array to store the Compensatory Day Off entries */
const compensatory = ref([
  {
    days_of_the_week: payloadDetails.days_of_the_week,
    work_date: payloadDetails.work_date,
    time_start: payloadDetails.time_start,
    time_end: payloadDetails.time_end,
    accomplishment: payloadDetails.accomplishment,
    authorized_claim: payloadDetails.authorized_claim,
  },
])

/** Watcher to update the week number of all existing compensatory when the selectedWeek changes */
watch(
  () => payloadDetails.days_of_the_week,
  (newWeekDayNum) => {
    compensatory.value = compensatory.value.map((item) => ({
      ...item,
      days_of_the_week: newWeekDayNum,
    }))
  }
)

/** Function to add a new Compensatory Day Off entry */
const addCompensatory = (newFields = {}) => {
  const defaultCompensatory = {
    days_of_the_week: '',
    work_date: '',
    time_start: null,
    time_end: null,
    accomplishment: null,
    authorized_claim: null,
  }

  const newCompensatory = { ...defaultCompensatory, ...newFields }
  compensatory.value.push(newCompensatory)
  validator.value.accomplishment.$touch()
}

/** Function to remove an Compensatory Day Off entry */
const removeCompensatory = (index: number) => {
  if (index >= 0 && index < compensatory.value.length) {
    compensatory.value.splice(index, 1)
  }
}

/** Function to handle changes in the selected week */
const handleWeekChange = () => {
  showTextAreaActivity.value = compensatory.value.some((item) => item.days_of_the_week !== '')
  showTextAreaHighlights.value = compensatory.value.some((item) => item.days_of_the_week !== '')

  compensatoryBtn.value = compensatory.value.some((item) => item.days_of_the_week !== '')
  addcompensatoryFiledBtn.value = compensatory.value.some((item) => item.days_of_the_week !== '')
}

/** Roles Options */
const rolesStore = useRolesStore()
const rolesOptionsIsLoading = ref(false)

onBeforeMount(async () => {
  rolesOptionsIsLoading.value = true
  await rolesStore.fetchRoles()
  rolesOptionsIsLoading.value = false
})
/** Validation */
const globalStringMaxLength = import.meta.env.VITE_GLOBAL_STRING_MAX_LENGTH
const globalStringMaxLengthRule = helpers.withMessage(
  `Must not exceed ${globalStringMaxLength} characters`,
  maxLength(globalStringMaxLength)
)
const formRules = {
  $lazy: true,
  ctdo_period: {
    required: helpers.withMessage('Period of Compensatory is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
  },
}

/** Handle Form Submission */
const validator = useVuelidate<Partial<PersonnelCompensatoryTimeOffPayload>>(formRules, payload)
const formIsSubmitting = ref(false)
const showErrorAlert = ref(false)
const errorMessage = ref<string | null>(null)
const errorDetails = ref<string[]>([])
const compensatoryTimeOffStore = useCompensatoryTimeOffStore()
const toast = useToast()

/** Emits */
const emit = defineEmits<{
  (e: 'ctdo-created', value: boolean): void
}>()
/** Open a dialog with a specified type (export, markDone, or saveDraft) */
const openDialog = (type: 'draft' | 'done') => {
  dialogType.value = type
  visible.value = true

  if (type === 'draft') {
    dialogTitle.value = 'Save CTDO Accomplishment as Draft ?'
    dialogMessage.value = 'Saving as draft allows you to continue editing later.'
    confirmButtonLabel.value = 'Save as Draft'
  } else if (type === 'done') {
    dialogTitle.value = 'Save and Finalize CTDO Accomplishment ?'
    dialogMessage.value = 'Finalizing will save the  CTDO accomplishment and prevent further edits.'
    confirmButtonLabel.value = 'Save and Finalize'
  }
}

/** Confirm the action based on the dialog type */
const confirmAction = () => {
  if (dialogType.value === 'draft') {
    handleSaveSubmissionif('draft')
  } else if (dialogType.value === 'done') {
    handleSaveSubmissionif('done')
  }
  visible.value = false
}
const handleSaveSubmissionif = async (ctdo_status: string) => {
  const valid = await validator.value.$validate()
  if (!valid) {
    document.querySelector('.create-ctdo-creds-section')?.scrollIntoView({ behavior: 'smooth' })
    toast.add({
      severity: 'error',
      summary: 'Create Compensatory Accomplishment Report',
      detail: 'Please see the validation messages',
      life: 5000,
    })
    return
  }

  formIsSubmitting.value = true

  try {
    const periodData = {
      ctdo_period: payload.ctdo_period,
      ctdo_supervisor_notes: payload.ctdo_supervisor_notes,
      ctdo_status: ctdo_status,
    }

    const rows = compensatory.value
      .filter(
        (compensatory) =>
          compensatory.days_of_the_week &&
          compensatory.work_date &&
          compensatory.time_start &&
          compensatory.time_end &&
          compensatory.accomplishment &&
          compensatory.authorized_claim
      )
      .map((compensatory) => ({
        days_of_the_week: compensatory.days_of_the_week,
        work_date: compensatory.work_date,
        time_start: compensatory.time_start,
        time_end: compensatory.time_end,
        accomplishment: compensatory.accomplishment,
        authorized_claim: compensatory.authorized_claim,
      }))
    const fullPayload = { ...periodData, rows }

    const periodResponse = await compensatoryTimeOffStore.createCompensatoryDayTimeOff(
      fullPayload as PersonnelCompensatoryTimeOffPayload
    ) // No need for "as PersonnelCompensatoryTimeOffPayload" if types are correct

    if (!periodResponse.success) {
      const result = parseApiResponseError(periodResponse)
      if (!result) {
        formIsSubmitting.value = false
        return
      }
      showErrorAlert.value = true
      errorMessage.value = result.message
      errorDetails.value = result.errors
      formIsSubmitting.value = false
      document.querySelector('.create-user-creds-section')?.scrollIntoView({ behavior: 'smooth' })
      return // Ensure you return after handling the error
    }

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Compensatory Accomplishment Report submitted successfully',
      life: 5000,
    })
    emit('ctdo-created', true)

    setTimeout(() => {
      window.location.reload() // Consider alternative approaches if full reload isn't necessary
    }, 1000)
  } finally {
    formIsSubmitting.value = false // Ensure formIsSubmitting is always set to false
  }
}
</script>

<template>
  <form autocomplete="off" @submit.prevent>
    <div class="flex w-full flex-col gap-4 pb-4 pl-4 pt-8">
      <Card class="h-full">
        <template #content>
          <div class="flex w-full flex-col items-start md:flex-row md:items-center">
            <Button
              icon="pi pi-angle-left"
              severity="secondary"
              aria-label="Bookmark"
              rounded
              @click="$router.go(-1)"
              size="small"
              class="mb-2 ml-4 md:mb-0 md:ml-0"
            />
            <h2 class="mb-2 ml-4 text-2xl font-semibold text-primary-800 dark:text-primary-100 md:ml-4 md:text-3xl">
              <font-awesome-icon :icon="['fas', 'check-double']" /> New Compensatory Day Time Offs (CTDO)
            </h2>
          </div>
          <br />

          <h2 class="mb-2 text-lg font-semibold text-surface-600 dark:text-primary-100">Timeline</h2>
          <div class="flex flex-col md:flex-row">
            <div class="mb-4 ml-0 flex w-full flex-col items-start justify-center gap-2 py-2 md:ml-6 md:w-2/6">
              <div class="flex w-full flex-col">
                <label for="period" class="mb-0 text-sm text-surface-600">
                  Period of Extra Services Rendered <span class="text-error-500">*</span>
                </label>
                <WbInputText
                  v-model="payload.ctdo_period"
                  label=""
                  placeholder="e.g. November 1-30, 2024"
                  :invalid="validator.ctdo_period.$invalid"
                  :invalid-text="validator.ctdo_period.$errors[0]?.$message"
                  @blur="validator.ctdo_period.$touch"
                  @focusin="validator.period.$dirty = false"
                  class="w-full"
                >
                </WbInputText>
              </div>
            </div>
          </div>

          <h1 class="mb-2 text-lg font-semibold text-surface-600 dark:text-primary-100">Accomplishment</h1>
          <div class="grid grid-cols-1 justify-center gap-2 border-b-2 bg-surface-100 px-2 py-2 md:grid-cols-3 md:gap-4 md:px-0">
            <div class="text-start font-semibold text-surface-500 md:ml-24">Date/s & Time</div>
            <div class="text-start font-semibold text-surface-500">SPECIFIC WORK ACCOMPLISHED</div>
            <div class="text-center font-semibold text-surface-500 md:mr-12">AUTHORIZED CLAIM FOR</div>
          </div>
          <p class="create-ar-creds-section text-xs font-medium uppercase"></p>

          <div v-for="(compensatories, index) in compensatory" :key="index" class="mb-4 flex flex-col md:flex-row">
            <div class="mb-4 ml-0 flex w-full flex-col items-start justify-center gap-2 py-2 pt-8 md:ml-12 md:w-2/12">
              <div class="flex w-full flex-col gap-2">
                <WbDropdown
                  :id="'week-' + index"
                  label="Day of the Week"
                  v-model="compensatories.days_of_the_week"
                  v-tooltip.top="'Choose a day'"
                  :options="weekOptions"
                  optionLabel="label"
                  optionValue="value"
                  @change="handleWeekChange()"
                  class="mb-4 w-full"
                  placeholder="Choose a day"
                  required
                />
                <WbCalendar
                  v-model="compensatories.work_date"
                  label=" Date"
                  placeholder="e.g. 16-17 January 2025 or 1, 3, 4 & 5 January 2025"
                  class="w-full"
                  required
                />

                <WbInputText
                  v-model="compensatories.time_start"
                  label=" From "
                  label-class="text-sm text-surface-600"
                  placeholder="e.g. 08:00 AM"
                  required
                />

                <WbInputText
                  label=" To "
                  v-model="compensatories.time_end"
                  label-class="text-sm text-surface-600"
                  placeholder="e.g. 11:50 AM"
                  required
                />
              </div>
            </div>
            <Divider layout="vertical" class="hidden md:block"></Divider>
            <div v-if="showTextAreaActivity" class="flex w-full flex-col items-start justify-center gap-3 py-2 md:w-5/12">
              <div class="flex w-full flex-col gap-2">
                <textarea
                  v-model="compensatories.accomplishment"
                  class="w-full border-b-2 border-surface-300 outline-none focus:outline-none focus:ring-primary-500"
                  placeholder="Enter your Specific Activity..."
                  rows="10"
                />
              </div>
            </div>
            <Divider layout="vertical" class="hidden md:block"></Divider>
            <div v-if="showTextAreaHighlights" class="inset-x-0 top-0 flex w-full flex-col items-start gap-3 py-2 md:w-5/12">
              <div class="flex w-full flex-col gap-2">
                <WbDropdown
                  :id="'week-' + index"
                  label=""
                  v-model="compensatories.authorized_claim"
                  v-tooltip.top="'Choose a Claim'"
                  :options="claimOptions"
                  optionLabel="label"
                  optionValue="value"
                  @change="handleWeekChange()"
                  class="mb-4 w-full"
                  placeholder="Choose a Claim"
                />
              </div>
            </div>

            <div class="mt-2 flex justify-center pt-16 md:ml-8 md:mt-0 md:block">
              <Button
                icon="pi pi-trash"
                severity="danger"
                rounded
                @click="removeCompensatory(index)"
                v-if="compensatory.length > 1"
                class="mt-2"
              />
            </div>
            <Divider layout="horizontal" class="mt-4 md:hidden" v-if="index < compensatory.length - 1" />
          </div>

          <Divider layout="horizontal" class="hidden md:block"></Divider>
          <div class="flex w-full flex-col gap-4 pb-4">
            <hr />
            <Button
              v-if="addcompensatoryFiledBtn"
              label="+ Add Additional Date / Accomplishment"
              @click="addCompensatory"
              class="dark:text-secondary-100 border border-primary-500 text-xs text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
              text
            />
          </div>
          <!-- Other content -->
          <div v-if="compensatoryBtn" class="mt-2 flex justify-end gap-2">
            <RouterLink :to="{ name: 'accomplishment-reports' }">
              <Button
                label="Cancel"
                :loading="formIsSubmitting"
                :disabled="formIsSubmitting"
                class="dark:text-secondary-100 border border-surface-400 text-xs text-surface-500 dark:border-surface-700 lg:text-surface-500 dark:lg:text-surface-400"
                text
              >
                <template #icon>
                  <i class="pi pi-ban mr-2"></i>
                </template>
              </Button>
            </RouterLink>
            <Button
              @click="openDialog('draft')"
              label="Save as Draft"
              :loading="formIsSubmitting"
              :disabled="formIsSubmitting"
              class="dark:text-secondary-100 border border-primary-500 text-xs text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
              text
            >
              <template #icon>
                <i class="pi pi-file mr-2"></i>
              </template>
            </Button>
            <Button
              @click="openDialog('done')"
              label="Save"
              :loading="formIsSubmitting"
              :disabled="formIsSubmitting"
              class="dark:text-secondary-100 border border-primary-500 text-xs text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
              text
            >
              <template #icon>
                <i class="pi pi-save mr-2"></i>
              </template>
            </Button>
          </div>
          <!-- Start Dialog Confirmation Modal Action  -->
          <Dialog v-model:visible="visible" modal :style="{ width: '25vw' }" :closable="false">
            <template #header>
              <div style="display: flex; justify-content: flex-end; width: 100%">
                <Button
                  :loading="formIsSubmitting"
                  :disabled="formIsSubmitting"
                  class="dark:text-secondary-100 border-none text-xs text-surface-500 dark:border-surface-700 lg:text-surface-500 dark:lg:text-surface-400"
                  text
                  @click="visible = false"
                >
                  <template #icon>
                    <i class="pi pi pi-times mr-2"></i>
                  </template>
                </Button>
              </div>
            </template>
            <h1 class="text-md font-bold">
              {{ dialogTitle }}
            </h1>
            <p>{{ dialogMessage }}</p>
            <template #footer>
              <Button
                label="Cancel"
                :loading="formIsSubmitting"
                :disabled="formIsSubmitting"
                class="dark:text-secondary-100 border border-surface-400 text-xs text-surface-500 dark:border-surface-700 lg:text-surface-500 dark:lg:text-surface-400"
                text
                @click="visible = false"
              >
                <template #icon>
                  <i class="pi pi-ban mr-2"></i>
                </template>
              </Button>
              <Button
                @click="confirmAction"
                :label="confirmButtonLabel"
                :loading="formIsSubmitting"
                :disabled="formIsSubmitting"
                class="dark:text-secondary-100 border border-primary-500 text-xs text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
                text
              >
                <template #icon>
                  <font-awesome-icon :icon="['fas', 'share']" class="mr-2" />
                </template>
              </Button>
            </template>
          </Dialog>
          <!-- End Dialog Confirmation Modal Action -->
          <!-- End Action Buttons -->
        </template>
      </Card>
    </div>
  </form>
</template>
