<script setup lang="ts">
import { ref, reactive, onBeforeMount, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { parseApiResponseError } from '@/utils/error-handle.ts'
import useVuelidate from '@vuelidate/core'
import { helpers, maxLength, required } from '@vuelidate/validators'
import WbInputText from '@/components/webkit/WbInputText.vue'
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import Card from 'primevue/card'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import Dropdown from 'primevue/dropdown'
import { useRolesStore } from '@/stores/roles.store.ts'
import {
  PersonnelAccomplishmentReportPayload,
  PersonnelAccomplishmentReportDetailsPayload,
  useAccomplishmentReportStore,
} from '@/stores/personnel-accomplishment-report.store'

/** Payload for the Personnel Accomplishment Report */
const payload = reactive<Partial<PersonnelAccomplishmentReportPayload>>({
  period: null,
  supervisor_notes: '',
  status: '',
})

/** Payload details for each accomplishment entry */
const payloadDetails = reactive<Partial<PersonnelAccomplishmentReportDetailsPayload>>({
  week_num: '',
  dates_in_week: '',
  specific_activity: null,
  highlights: null,
})

/** Options for selecting the week number */
const weekOptions = ref([
  { label: 'Week 1', value: 'Week 1' },
  { label: 'Week 2', value: 'Week 2' },
  { label: 'Week 3', value: 'Week 3' },
  { label: 'Week 4', value: 'Week 4' },
  { label: 'Week 5', value: 'Week 5' },
])

/** Controls the visibility */
const accomplishmentBtn = ref(false)
const addAccomplishmentFieldBtn = ref(false)
const showTextAreaActivity = ref(false)
const showTextAreaHighlights = ref(false)

/** Array to store the accomplishment entries */
const accomplishments = ref([
  {
    week_num: payloadDetails.week_num,
    dates_in_week: payloadDetails.dates_in_week,
    specific_activity: payloadDetails.specific_activity,
    highlights: payloadDetails.highlights,
  },
])

/** Watcher to update the week number of all existing accomplishments when the selectedWeek changes */
watch(
  () => payloadDetails.week_num,
  (newWeekNum) => {
    accomplishments.value = accomplishments.value.map((item) => ({
      ...item,
      week_num: newWeekNum,
    }))
  }
)

/** Function to add a new accomplishment entry */
const addAccomplishment = (newFields = {}) => {
  const defaultAccomplishment = {
    week_num: '',
    dates_in_week: '',
    specific_activity: null,
    highlights: null,
  }

  const newAccomplishment = { ...defaultAccomplishment, ...newFields }
  accomplishments.value.push(newAccomplishment)
  validator.value.accomplishment.$touch()
}

/** Function to remove an accomplishment entry */
const removeAccomplishment = (index: number) => {
  if (index >= 0 && index < accomplishments.value.length) {
    accomplishments.value.splice(index, 1)
  }
}

/** Function to handle changes in the selected week */
const handleWeekChange = () => {
  showTextAreaActivity.value = accomplishments.value.some((item) => item.week_num !== '') // Check if ANY week is selected
  showTextAreaHighlights.value = accomplishments.value.some((item) => item.week_num !== '') // Check if ANY week is selected

  accomplishmentBtn.value = accomplishments.value.some((item) => item.week_num !== '') // Check if ANY week is selected
  addAccomplishmentFieldBtn.value = accomplishments.value.some((item) => item.week_num !== '') // Check if ANY week is selected
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

/** Emits */
const emit = defineEmits<{
  (e: 'ar-created', value: boolean): void
}>()

const handleSaveSubmissionif = async (status: 'done' | 'draft') => {
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

    const rows = accomplishments.value
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
    ) // No need for "as PersonnelAccomplishmentReportPayload" if types are correct

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
      detail: 'Accomplishment Report submitted successfully',
      life: 5000,
    })
    emit('ar-created', true)

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
          <div class="flex w-full flex-col items-start md:flex-row">
            <Button
              icon="pi pi-angle-left"
              severity="secondary"
              aria-label="Bookmark"
              rounded
              v-tooltip.top="'Filter Accomplishments'"
              @click="$router.go(-1)"
              size="small"
              class="mb-2 ml-4 md:mb-0 md:ml-0"
            />
            <h2 class="mb-2 ml-4 text-3xl font-semibold text-primary-800 dark:text-primary-100 md:ml-4">
              <font-awesome-icon :icon="['fas', 'check-double']" /> New Accomplishment Report
            </h2>
          </div>
          <br />

          <h2 class="mb-2 text-lg font-semibold text-surface-600 dark:text-primary-100">Timeline</h2>
          <div class="flex flex-col md:flex-row">
            <div class="mb-4 ml-0 flex w-full flex-col items-start justify-center gap-2 py-2 md:ml-6 md:w-2/6">
              <div class="flex w-full flex-col">
                <label for="period" class="mb-0 text-sm text-surface-600">
                  Period of Accomplishment <span class="text-error-500">*</span>
                </label>
                <WbInputText
                  v-model="payload.period"
                  label=""
                  placeholder="Period of Accomplishment"
                  :invalid="validator.period.$invalid"
                  :invalid-text="validator.period.$errors[0]?.$message"
                  @blur="validator.period.$touch"
                  @focusin="validator.period.$dirty = false"
                  class="w-full"
                >
                </WbInputText>
              </div>
            </div>
          </div>

          <h1 class="mb-2 text-lg font-semibold text-surface-600 dark:text-primary-100">Accomplishment</h1>
          <div class="grid grid-cols-1 justify-center gap-2 border-b-2 bg-surface-100 px-2 py-2 md:grid-cols-3 md:gap-4 md:px-0">
            <div class="text-start font-semibold text-surface-500 md:ml-24">Week # (Date/s)</div>
            <div class="text-start font-semibold text-surface-500">SPECIFIC ACTIVITY</div>
            <div class="text-center font-semibold text-surface-500 md:mr-12">HIGHLIGHTS OF ACCOMPLISHMENT</div>
          </div>
          <p class="create-ar-creds-section text-xs font-medium uppercase"></p>

          <div v-for="(accomplishment, index) in accomplishments" :key="index" class="mb-4 flex flex-col md:flex-row">
            <div class="mb-4 ml-0 flex w-full flex-col items-start justify-center gap-2 py-2 pt-8 md:ml-12 md:w-2/12">
              <div class="flex w-full flex-col">
                <label for="week" class="mb-0 text-sm text-surface-600">Week <span class="text-error-500">*</span></label>
                <Dropdown
                  :id="'week-' + index"
                  v-model="accomplishment.week_num"
                  v-tooltip.top="'Choose a Week'"
                  :options="weekOptions"
                  optionLabel="label"
                  optionValue="value"
                  @change="handleWeekChange()"
                  class="mb-4 w-full"
                  placeholder="Choose a week"
                >
                </Dropdown>
                <label for="converage" class="mb-0 text-sm text-surface-600">
                  Date/s or Converage <span class="text-error-500">*</span>
                </label>
                <WbInputText
                  v-model="accomplishment.dates_in_week"
                  label=""
                  placeholder="e.g. 16-17 January 2025 or 1, 3, 4 & 5 January 2025"
                  class="w-full"
                >
                </WbInputText>
              </div>
            </div>
            <Divider layout="vertical" class="hidden md:block"></Divider>
            <div v-if="showTextAreaActivity" class="flex w-full flex-col items-start justify-center gap-3 py-2 md:w-5/12">
              <div class="flex w-full flex-col gap-2">
                <textarea
                  v-model="accomplishment.specific_activity"
                  class="w-full border-b-2 border-gray-300 outline-none focus:outline-none focus:ring-primary-500"
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
                  class="w-full border-b-2 border-gray-300 outline-none focus:outline-none focus:ring-primary-500"
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
                v-if="accomplishments.length > 1"
                class="mt-2"
              />
            </div>
            <Divider layout="horizontal" class="mt-4 md:hidden" v-if="index < accomplishments.length - 1" />
          </div>

          <Divider layout="horizontal" class="hidden md:block"></Divider>
          <div class="flex w-full flex-col gap-4 pb-4">
            <hr />
            <Button
              v-if="addAccomplishmentFieldBtn"
              label="+ Add Additional Week"
              @click="addAccomplishment"
              class="dark:text-secondary-100 border border-primary-500 text-xs text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
              text
            />
          </div>
          <div v-if="accomplishmentBtn" class="mt-2 flex justify-end gap-2">
            <RouterLink
              :to="{ path: '/commitments/accomplishment-report' }"
              class="dark:text-secondary-100 border border-surface-400 text-xs text-surface-500 dark:border-surface-700 lg:text-surface-500 dark:lg:text-surface-400"
              custom
              v-slot="{ href, navigate }"
            >
              <Button
                :href="href"
                label="Cancel"
                @click="navigate"
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
              @click="handleSaveSubmissionif('draft')"
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
              @click="handleSaveSubmissionif('done')"
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

          <!-- End Action Buttons -->
        </template>
      </Card>
    </div>
  </form>
</template>
