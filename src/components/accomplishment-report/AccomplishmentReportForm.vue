<script setup lang="ts">
import { ref, reactive, onBeforeMount, watch, onMounted, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import { parseApiResponseError } from '@/utils/error-handle.ts'
import useVuelidate from '@vuelidate/core'
import { helpers, maxLength, required } from '@vuelidate/validators'
import WbInputText from '@/components/webkit/WbInputText.vue'
import WbTextArea from '../webkit/WbTextArea.vue'
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import Card from 'primevue/card'
import Dialog from 'primevue/dialog'
import WbDropdown from '@/components/webkit/WbDropdown.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useRolesStore } from '@/stores/roles.store.ts'
import { useRoute } from 'vue-router'
import {
  PersonnelAccomplishmentReportPayload,
  useAccomplishmentReportStore,
} from '@/stores/personnel-accomplishment-report.store'
import { PersonnelAccomplishmentReportResponse } from '@/typings/models.types'
import { useAuthStore } from '@/stores/auth.store'

/** Payload for the Personnel Accomplishment Report */
const payload = reactive<PersonnelAccomplishmentReportPayload>({
  period: null,
  supervisor_notes: '',
  status: '',
  rows: [],
})

payload.rows = reactive([
  {
    week_num: '',
    dates_in_week: '',
    specific_activity: null,
    highlights: null,
  },
])

/** Options for selecting the week number */
const weekOptions = ref([
  { label: 'Week 1', value: 'Week 1' },
  { label: 'Week 2', value: 'Week 2' },
  { label: 'Week 3', value: 'Week 3' },
  { label: 'Week 4', value: 'Week 4' },
  { label: 'Week 5', value: 'Week 5' },
])

/** Controls  */
const accomplishmentBtn = ref(false)
const addAccomplishmentFieldBtn = ref(false)
const showTextAreaActivity = ref(false)
const showTextAreaHighlights = ref(false)
const rolesOptionsIsLoading = ref(false)
const isLoading = ref(true)
const visible = ref(false)
const dialogType = ref('')
const dialogTitle = ref('')
const dialogMessage = ref('')
const confirmButtonLabel = ref('')
const route = useRoute()
const rolesStore = useRolesStore()
const authStore = useAuthStore()
const isUpdateMode = computed(() => !!route.params.id)
const accomplishmentReportExportFile = ref<PersonnelAccomplishmentReportResponse | null>(null)
const props = defineProps<AccomplishmentReportFormProps>()

/** Function to add a new accomplishment entry */
const addAccomplishment = (newFields = {}) => {
  const defaultAccomplishment = {
    week_num: '',
    dates_in_week: '',
    specific_activity: null,
    highlights: null,
  }

  const newAccomplishment = { ...defaultAccomplishment, ...newFields }
  payload.rows.push(newAccomplishment)
}

/** Function to remove an accomplishment entry */
const removeAccomplishment = (index: number) => {
  if (index >= 0 && index < payload.rows.length) {
    payload.rows.splice(index, 1)
  }
}

/** Function to handle changes in the selected week */
const handleWeekChange = () => {
  const hasWeekNum = payload.rows.some((item) => item.week_num !== '')

  showTextAreaActivity.value = hasWeekNum
  showTextAreaHighlights.value = hasWeekNum
  accomplishmentBtn.value = hasWeekNum
  addAccomplishmentFieldBtn.value = hasWeekNum
}

type AccomplishmentReportFormProps = {
  accomplishmentReport?: PersonnelAccomplishmentReportResponse
}

const updatePayloadFromReport = (accomplishmentReport: PersonnelAccomplishmentReportResponse | null) => {
  payload.period = accomplishmentReport?.period ?? null
  payload.supervisor_notes = accomplishmentReport?.supervisor_notes ?? ''
  payload.status = accomplishmentReport?.status ?? ''
  payload.rows = accomplishmentReport?.rows ?? []
}

onMounted(async () => {
  const id = route.params.id as string
  if (id) {
    const response = await accomplishmentReportStore.fetchAccomplishmentById(id)
    if (response && response.success) {
      accomplishmentReportExportFile.value = response.data as PersonnelAccomplishmentReportResponse // Directly update the ref
      updatePayloadFromReport(response.data as PersonnelAccomplishmentReportResponse)
    }
  }
  handleWeekChange()
  isLoading.value = false
})

onBeforeMount(async () => {
  rolesOptionsIsLoading.value = true
  await rolesStore.fetchRoles()
  rolesOptionsIsLoading.value = false
})

watch(
  () => props.accomplishmentReport,
  (newValue) => {
    if (newValue) {
      updatePayloadFromReport(newValue)
    } else {
      payload.period = ''
      payload.supervisor_notes = ''
      payload.status = 'Unfilled'
      payload.rows = [
        {
          week_num: '',
          dates_in_week: '',
          specific_activity: null,
          highlights: null,
        },
      ]
    }
  },
  { immediate: true }
)

/** Watcher to update the week number of all existing accomplishments when the selectedWeek changes */
watch(
  () => payload.rows.map((row) => row.week_num),
  () => {}
)

/** Validation */
const globalStringMaxLength = import.meta.env.VITE_GLOBAL_STRING_MAX_LENGTH
const globalStringMaxLengthRule = helpers.withMessage(
  `Must not exceed ${globalStringMaxLength} characters`,
  maxLength(globalStringMaxLength)
)
const formRules = {
  $lazy: true,
  period: {
    required: helpers.withMessage('Period of Accomplishment is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
  },
}

/** Handle Form Submission */
const validator = useVuelidate<Partial<PersonnelAccomplishmentReportPayload>>(formRules, payload)
const formIsSubmitting = ref(false)
const showErrorAlert = ref(false)
const errorMessage = ref<string | null>(null)
const errorDetails = ref<string[]>([])
const accomplishmentReportStore = useAccomplishmentReportStore()
const toast = useToast()
const IsBeingUpdated = ref(false)

/** Check if the page should be reloaded after the update */
const shouldReloadPageAfterUpdate = (): boolean => {
  return true
}
/** Emits */
const emit = defineEmits<{
  (e: 'ar-created', value: boolean): void
  (e: 'ar-updated', value: boolean): void
}>()
/** Open a dialog with a specified type (export, markDone, or saveDraft) */
const openDialog = (type: 'draft' | 'done' | 'export' | 'markDone' | 'saveDraft') => {
  dialogType.value = type
  visible.value = true

  switch (type) {
    case 'draft':
    case 'saveDraft':
      dialogTitle.value = 'Are you sure you want to save this accomplishment as Draft?'
      dialogMessage.value = 'Saving your accomplishment as draft will allow you to edit it later.'
      confirmButtonLabel.value = 'Yes, Save as Draft'
      break

    case 'done':
      dialogTitle.value = 'Save and Finalize Accomplishment ?'
      dialogMessage.value = 'Finalizing will save the accomplishment and prevent further edits.'
      confirmButtonLabel.value = 'Save and Finalize'
      break

    case 'export':
      dialogTitle.value = 'Are you sure you want to export this accomplishment as File?'
      dialogMessage.value = 'Exporting your accomplishment will download a Word file.'
      confirmButtonLabel.value = 'Yes, Export this Document'
      break

    case 'markDone':
      dialogTitle.value = 'Are you sure you want to mark this accomplishment as Done?'
      dialogMessage.value = 'Marking your accomplishment as done will make it uneditable.'
      confirmButtonLabel.value = 'Yes, Archive this Document'
      break
  }
}

/** Confirm the action based on the dialog type */
const confirmAction = () => {
  if (dialogType.value === 'draft') {
    handleSaveSubmissionif('draft')
  } else if (dialogType.value === 'saveDraft') {
    handleUpdated()
  } else if (dialogType.value === 'done') {
    handleSaveSubmissionif('done')
  } else if (dialogType.value === 'markDone') {
    handleMarkDone()
  } else if (dialogType.value === 'export') {
    if (accomplishmentReportExportFile.value) {
      exportToFile(accomplishmentReportExportFile.value)
    }
  }
  visible.value = false
}

const handleSaveSubmissionif = async (status: string) => {
  const valid = await validator.value.$validate()
  if (!valid) {
    document.querySelector('.create-ar-creds-section')?.scrollIntoView({ behavior: 'smooth' })
    toast.add({
      severity: 'error',
      summary: 'Create Accomplishment Report',
      detail: 'Please see the validation messages',
      life: 5000,
    })
    return
  }

  formIsSubmitting.value = true

  try {
    const periodData = {
      period: payload.period,
      supervisor_notes: payload.supervisor_notes,
      status: status,
    }

    const rows = payload.rows
      .filter(
        (accomplishment) =>
          accomplishment.week_num && accomplishment.dates_in_week && accomplishment.specific_activity && accomplishment.highlights
      )
      .map((accomplishment) => ({
        week_num: accomplishment.week_num,
        dates_in_week: accomplishment.dates_in_week,
        specific_activity: accomplishment.specific_activity,
        highlights: accomplishment.highlights,
      }))
    const fullPayload = { ...periodData, rows }

    const periodResponse = await accomplishmentReportStore.createAccomplishment(
      fullPayload as PersonnelAccomplishmentReportPayload
    )

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
      return
    }
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Accomplishment Report submitted successfully',
      life: 5000,
    })
    emit('ar-created', true)

    setTimeout(() => {
      window.location.reload()
    }, 1000)
  } finally {
    formIsSubmitting.value = false
  }
}

/** Handle exporting the report to MS Word */
const exportToFile = async (accomplishmentReport: PersonnelAccomplishmentReportResponse) => {
  toast.add({
    severity: 'info',
    summary: 'Exporting...',
    detail: `Exporting ${accomplishmentReport.period || 'the Accomplishment Report '}...`,
    life: 5000,
  })
  const reportResponse = await accomplishmentReportStore.generateAccomplishmentReport(accomplishmentReport.id as string)

  const blob = reportResponse.data.value

  if (blob) {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportResponse.fileNameHeader.value}`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    toast.add({
      severity: 'success',
      summary: 'Accomplishment Report Details Exported',
      detail: `The Accomplishment Report from ${accomplishmentReport.period} was successfully exported.`,
      life: 5000,
    })
  }
}

/** Handle updating the accomplishment report */
const handleUpdated = async () => {
  IsBeingUpdated.value = true
  const id = route.params.id as string

  const response = await accomplishmentReportStore.updateAccomplishment(payload, id)

  if (!response.success) {
    const result = parseApiResponseError(response)
    if (!result) return (formIsSubmitting.value = false)

    showErrorAlert.value = true
    errorMessage.value = result.message
    errorDetails.value = result.errors
    IsBeingUpdated.value = false
    return document.getElementsByClassName('update-ar-creds-section')[0]?.scrollIntoView({ behavior: 'smooth' })
  }

  toast.add({
    severity: 'success',
    summary: 'Accomplishment Report Details update',
    detail: `${id || 'The Accomplishment Report '} was successfully updated`,
    life: 3000,
  })

  if (shouldReloadPageAfterUpdate()) {
    setTimeout(() => {
      window.location.reload()
    }, 2000)
  }

  emit('ar-updated', true)
}
/** Handle marking the accomplishment report as done */
const handleMarkDone = async () => {
  IsBeingUpdated.value = true
  const id = route.params.id as string
  payload.status = 'done'
  const response = await accomplishmentReportStore.updateAccomplishment(payload, id)

  if (!response.success) {
    const result = parseApiResponseError(response)
    if (!result) return (formIsSubmitting.value = false)

    showErrorAlert.value = true
    errorMessage.value = result.message
    errorDetails.value = result.errors
    IsBeingUpdated.value = false
    return document.getElementsByClassName('update-ar-creds-section')[0]?.scrollIntoView({ behavior: 'smooth' })
  }

  toast.add({
    severity: 'success',
    summary: 'Accomplishment Report Marked as Done',
    detail: `${id || 'The Accomplishment Report '} was successfully marked as done`,
    life: 3000,
  })

  if (shouldReloadPageAfterUpdate()) {
    setTimeout(() => {
      window.location.reload()
    }, 2000)
  }

  emit('ar-updated', true)
}

const isSupervisorView = computed(() => route.name === 'accomplishment-report-list/editor')
</script>

<template>
  <form autocomplete="off" @submit.prevent>
    <div class="flex w-full flex-col gap-4 pb-4 pl-4 pt-8">
      <Card class="h-full">
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
            <h2 class="mb-2 ml-4 text-3xl font-semibold text-primary-800 dark:text-primary-100 md:ml-4">
              <font-awesome-icon :icon="['fas', isSupervisorView ? 'magnifying-glass' : 'check-double']" />
              {{
                isSupervisorView
                  ? 'Viewing Accomplishment Report'
                  : route.params.id
                    ? 'Update Accomplishment Report'
                    : 'New Accomplishment Report'
              }}
              <br />
              <span class="ml-10 text-lg text-surface-600 md:text-xl lg:text-2xl">
                {{ isSupervisorView && authStore.authFullName ? authStore.authFullName : '' }}
              </span>
            </h2>
          </div>
          <br />

          <h2 class="mb-2 text-lg font-semibold text-surface-600 dark:text-primary-100">Timeline</h2>
          <div class="flex flex-col md:flex-row">
            <div class="mb-4 ml-0 flex w-full flex-col items-start justify-center gap-2 py-2 md:ml-6 md:w-2/6">
              <div class="flex w-full flex-col">
                <WbInputText
                  v-model="payload.period"
                  label="Period of Accomplishment"
                  required
                  placeholder="Period of Accomplishment"
                  :invalid="validator.period.$invalid"
                  :invalid-text="validator.period.$errors[0]?.$message"
                  @blur="validator.period.$touch"
                  @focusin="validator.period.$dirty = false"
                  label-class="text-sm text-surface-600"
                />
              </div>
            </div>
            <div
              v-if="isUpdateMode"
              class="mt-2 flex w-64 flex-initial justify-end gap-2 md:ml-auto md:w-auto md:items-center md:justify-start"
            >
              <Button
                label="Export to MS Word"
                v-if="!isSupervisorView"
                class="dark:text-secondary-100 border border-primary-500 text-xs text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
                text
                @click="openDialog('export')"
              >
                <template #icon>
                  <i class="pi pi-file-word mr-2"></i>
                </template>
              </Button>

              <Button
                label="Mark as Done"
                v-if="!isSupervisorView"
                :loading="formIsSubmitting"
                :disabled="payload && payload.status === 'done'"
                class="dark:text-secondary-100 border border-primary-500 text-xs text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
                text
                @click="openDialog('markDone')"
              >
                <template #icon>
                  <i class="pi pi-save mr-2"></i>
                </template>
              </Button>

              <Button
                @click="openDialog('saveDraft')"
                v-if="isSupervisorView"
                label="Approved Accomplishment"
                :loading="formIsSubmitting"
                class="dark:text-secondary-100 border border-primary-500 text-xs text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
                text
              >
                <template #icon> <i class="pi pi-save mr-2"></i> </template
              ></Button>
            </div>
          </div>

          <h1 class="mb-2 text-lg font-semibold text-surface-600 dark:text-primary-100">Accomplishment</h1>
          <div class="grid grid-cols-1 justify-center gap-2 border-b-2 bg-surface-100 px-2 py-2 md:grid-cols-3 md:gap-4 md:px-0">
            <div class="text-start font-semibold text-surface-500 md:ml-24">Week # (Date/s)</div>
            <div class="text-start font-semibold text-surface-500">SPECIFIC ACTIVITY</div>
            <div class="text-center font-semibold text-surface-500 md:mr-12">HIGHLIGHTS OF ACCOMPLISHMENT</div>
          </div>
          <p class="create-ar-creds-section text-xs font-medium uppercase"></p>

          <div v-for="(accomplishment, index) in payload.rows" :key="index" class="mb-4 flex flex-col md:flex-row">
            <div class="mb-4 ml-0 flex w-full flex-col items-start justify-center gap-2 py-2 pt-8 md:ml-12 md:w-2/12">
              <div class="flex w-full flex-col">
                <WbDropdown
                  :id="'week-' + index"
                  v-model="accomplishment.week_num"
                  v-tooltip.top="'Choose a Week'"
                  :options="weekOptions"
                  optionLabel="label"
                  optionValue="value"
                  @change="handleWeekChange()"
                  class="mb-4 w-full"
                  label-class="text-sm text-surface-600"
                  label="Week"
                  required
                  placeholder="Choose a week"
                />
                <label for="converage" class="mb-0 text-sm text-surface-600">
                  Date/s or Converage <span class="text-error-500">*</span>
                </label>
                <WbInputText
                  v-model="accomplishment.dates_in_week"
                  label=""
                  placeholder="e.g. 16-17 January 2025 or 1, 3, 4 & 5 January 2025"
                  class="w-full"
                ></WbInputText>
              </div>
            </div>
            <Divider layout="vertical" class="hidden md:block"></Divider>
            <div v-if="showTextAreaActivity" class="flex w-full flex-col items-start justify-center gap-3 py-2 md:w-5/12">
              <div class="flex w-full flex-col gap-2">
                <textarea
                  v-model="accomplishment.specific_activity"
                  class="w-full border-b-2 border-surface-300 outline-none focus:outline-none focus:ring-primary-500"
                  placeholder="Enter your Specific Activity..."
                  rows="10"
                />
              </div>
            </div>
            <Divider layout="vertical" class="hidden md:block"></Divider>
            <div v-if="showTextAreaHighlights" class="flex w-full flex-col items-start justify-center gap-3 py-2 md:w-5/12">
              <div class="flex w-full flex-col gap-2">
                <textarea
                  v-model="accomplishment.highlights"
                  class="w-full border-b-2 border-surface-300 outline-none focus:outline-none focus:ring-primary-500"
                  placeholder="Enter your Highlights of Accomplishment..."
                  rows="10"
                />
              </div>
            </div>

            <div class="mt-2 flex justify-center pt-16 md:ml-8 md:mt-0 md:block">
              <Button
                icon="pi pi-trash"
                severity="danger"
                rounded
                @click="removeAccomplishment(index)"
                v-if="payload.status !== 'done' && payload.rows.length > 1"
                class="mt-2"
              />
            </div>
            <Divider layout="horizontal" class="mt-4 md:hidden" v-if="index < payload.rows.length - 1" />
          </div>

          <Divider layout="horizontal" class="mb-14 hidden md:block"></Divider>
          <div class="flex w-full flex-col">
            <WbTextArea
              v-if="isSupervisorView"
              label="Comments"
              required
              label-class="text-md text-surface-600 dark:lg:text-surface-200"
              class="lg:text-md lg:placeholder:text-md mb-4 w-full text-sm placeholder:text-sm"
              validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
            />
          </div>
          <div class="flex w-full flex-col">
            <WbInputText
              v-if="isSupervisorView"
              label="Supervisor`s Notes"
              required
              label-class="text-md text-surface-600 dark:lg:text-surface-200"
              class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
              validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
            />
          </div>
          <div class="flex w-full flex-col gap-4 pb-4">
            <hr />
            <Button
              v-if="addAccomplishmentFieldBtn && payload.status !== 'done'"
              label="+ Add Additional Week"
              @click="addAccomplishment"
              :disabled="payload && payload.status === 'done'"
              class="dark:text-secondary-100 border border-primary-500 text-xs text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
              text
            />
          </div>
          <!-- Other content -->
          <div v-if="accomplishmentBtn" class="mt-2 flex justify-end gap-2">
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
              label="Draft"
              v-if="!isUpdateMode"
              :disabled="payload && payload.status === 'done'"
              :loading="formIsSubmitting"
              class="dark:text-secondary-100 border border-primary-500 text-xs text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
              text
            >
              <template #icon>
                <i class="pi pi-file mr-2"></i>
              </template>
            </Button>
            <Button
              @click="openDialog('saveDraft')"
              v-if="isUpdateMode && !isSupervisorView"
              label="Save as Draft"
              :disabled="payload && payload.status === 'done'"
              :loading="formIsSubmitting"
              class="dark:text-secondary-100 border border-primary-500 text-xs text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
              text
            >
              <template #icon>
                <i class="pi pi-file mr-2"></i>
              </template>
            </Button>
            <Button
              @click="openDialog('saveDraft')"
              v-if="isSupervisorView"
              label="Revised Accomplishment"
              :loading="formIsSubmitting"
              class="dark:text-secondary-100 border border-primary-500 text-xs text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
              text
            >
              <template #icon>
                <i class="pi pi-file mr-2"></i>
              </template>
            </Button>
            <Button
              @click="openDialog('done')"
              v-if="!isUpdateMode"
              label="Save Accomplishment"
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
