<script setup lang="ts">
// import { onBeforeMount, reactive, ref } from 'vue'
import { ref, reactive, onBeforeMount, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { parseApiResponseError } from '@/utils/error-handle.ts'
import useVuelidate from '@vuelidate/core'
import { helpers, maxLength, required } from '@vuelidate/validators'
import WbInputText from '@/components/webkit/WbInputText.vue'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import Card from 'primevue/card'
import Message from 'primevue/message'
import Dropdown from 'primevue/dropdown'
import { useRolesStore } from '@/stores/roles.store.ts'
import {
  PersonnelAccomplishmentReportPayload,
  PersonnelAccomplishmentReportDetailsPayload,
  useAccomplishmentReportStore,
} from '@/stores/personnelAccomplishmentReport.store'

/** Payload for the Personnel Accomplishment Report */
const payload = reactive<Partial<PersonnelAccomplishmentReportPayload>>({
  period: null,
  supervisor_notes: '',
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

/** Computed property for the selected week, syncing with payloadDetails */
// const selectedWeek = computed({
//   get: () => payloadDetails.week_num,
//   set: (value) => {
//     payloadDetails.week_num = value
//   },
// })

/** Controls the visibility */
const AccomplishmentBtn = ref(false)
const AddAccomplishmentFieldBtn = ref(false)
const showTextArea1 = ref(false)
const showTextArea2 = ref(false)

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
}

/** Function to remove an accomplishment entry */
const removeAccomplishment = (index: number) => {
  if (index >= 0 && index < accomplishments.value.length) {
    accomplishments.value.splice(index, 1)
  }
}

/** Function to handle changes in the selected week */
const handleWeekChange = () => {
  showTextArea1.value = accomplishments.value.some((item) => item.week_num !== '') // Check if ANY week is selected
  showTextArea2.value = accomplishments.value.some((item) => item.week_num !== '') // Check if ANY week is selected

  AccomplishmentBtn.value = accomplishments.value.some((item) => item.week_num !== '') // Check if ANY week is selected
  AddAccomplishmentFieldBtn.value = accomplishments.value.some((item) => item.week_num !== '') // Check if ANY week is selected
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

const handleFormSubmission = async () => {
  const valid = await validator.value.$validate()
  if (!valid) {
    document.getElementsByClassName('create-ar-creds-section')[0]?.scrollIntoView({ behavior: 'smooth' })
    toast.add({
      severity: 'error',
      summary: 'Create Accomplishment Report',
      detail: 'Please see the validation messages',
      life: 5000,
    })
    return
  }
  formIsSubmitting.value = true
  let allSuccess = true

  try {
    const periodData = {
      period: payload.period,
      supervisor_notes: payload.supervisor_notes,
    }
    //  Crucial Change: Collect all accomplishments into an array of objects
    // Crucial Change: Collect all accomplishments, filtering out empty entries
    const rows = accomplishments.value
      .filter(
        (accomplishment) =>
          accomplishment.week_num && // Check if week_num is not empty
          accomplishment.dates_in_week && // Check if dates_in_week is not empty
          accomplishment.specific_activity && // Check if specific_activity is not empty
          accomplishment.highlights // Check if highlights is not empty
      )
      .map((accomplishment) => ({
        week_num: accomplishment.week_num,
        dates_in_week: accomplishment.dates_in_week,
        specific_activity: accomplishment.specific_activity,
        highlights: accomplishment.highlights,
      }))

    if (rows.length === 0) {
      // Check if all entries are empty
      toast.add({
        severity: 'error',
        summary: 'Create Accomplishment Report',
        detail: 'Please fill out at least one accomplishment entry.',
        life: 5000,
      })
      return
    }

    const fullPayload = { ...periodData, rows } // Combine period data and rows

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
      allSuccess = false
    } else {
      console.log('Accomplishment Report created successfully:', periodResponse.data) // Example
    }
  } catch (error) {
    console.error('An unexpected error occurred during form submission:', error)
    showErrorAlert.value = true
    errorMessage.value = 'An unexpected error occurred. Please try again later.'
    allSuccess = false
  } finally {
    formIsSubmitting.value = false
  }

  if (allSuccess) {
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
  } else {
    document.getElementsByClassName('create-ar-creds-section')[0]?.scrollIntoView({ behavior: 'smooth' })
  }
}
</script>

<template>
  <form autocomplete="off" @submit.prevent>
    <div class="flex w-full flex-col gap-4 pb-4 pl-4 pt-8">
      <Card class="h-full">
        <template #content>
          <div class="flex w-full">
            <Button
              icon="pi pi-angle-left"
              severity="secondary"
              aria-label="Bookmark"
              rounded
              v-tooltip.top="'Filter Accomplishments'"
              @click="$router.go(-1)"
              size="small"
            />
            <h2 class="mb-2 ml-4 text-3xl font-semibold text-blue-900 dark:text-white">
              <i class="pi pi-angle-double-down" style="font-size: 1.5rem"></i>New Accomplishment Reports
            </h2>
          </div>
          <br />
          <h2 class="mb-2 text-lg font-semibold text-gray-600 dark:text-white">Timeline</h2>
          <div class="flex flex-col md:flex-row">
            <div class="mb-4 ml-6 flex w-full flex-col items-start justify-center gap-2 py-2 md:w-2/6">
              <div class="flex w-full flex-col">
                <label for="password" class="mb-0 text-sm text-gray-600"
                  >Period of Accomplishment <span class="text-red-500">*</span></label
                >
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
          <!-- Start Alert Message -->
          <transition
            enter-active-class="transition duration-200"
            enter-from-class="scale-50 opacity-0"
            leave-to-class="opacity-0"
          >
            <Message v-if="showErrorAlert" :closable="false" severity="error" class="mb-2">
              <span>{{ errorMessage }}</span>
              <div class="flex flex-col text-xs">
                <div v-for="error in errorDetails" :key="error" class="mt-0.5">{{ '- ' + error }}</div>
              </div>
            </Message>
          </transition>
          <!-- End Alert Message -->
          <h1 class="mb-2 text-lg font-semibold text-gray-600 dark:text-white">Accomplishment</h1>
          <div class="flex justify-center border-b-2 bg-gray-100 py-2" style="min-width: 50rem">
            <div class="ml-12 w-1/6 text-left font-semibold text-gray-500">Week # (Date/s)</div>
            <div class="ml-12 w-1/2 text-center font-semibold text-gray-500">SPECIFIC ACTIVITY</div>
            <div class="w-1/2 text-center font-semibold text-gray-500">HIGHLIGHTS OF ACCOMPLISHMENT</div>
          </div>
          <p class="create-ar-creds-section text-xs font-medium uppercase"></p>
          <div v-for="(accomplishment, index) in accomplishments" :key="index" class="mb-4 flex flex-col md:flex-row">
            <div class="mb-4 ml-6 flex w-full flex-col items-start justify-center gap-2 py-2 pt-8 md:w-2/12">
              <div class="flex w-full flex-col">
                <label for="password" class="mb-0 text-sm text-gray-600">Week <span class="text-red-500">*</span></label>
                <Dropdown
                  :id="'week-' + index"
                  v-model="accomplishment.week_num"
                  :options="weekOptions"
                  optionLabel="label"
                  optionValue="value"
                  @change="handleWeekChange()"
                  class="mb-4 w-full md:w-11/12"
                  placeholder="Choose a Week"
                >
                </Dropdown>
                <label for="password" class="mb-0 text-sm text-gray-600"
                  >Date/s or Converage <span class="text-red-500">*</span></label
                >
                <WbInputText
                  v-model="accomplishment.dates_in_week"
                  label=""
                  placeholder="e.g. 16 - 17 January 2025"
                  class="md:w-12/12 w-full"
                >
                </WbInputText>
              </div>
            </div>
            <Divider layout="vertical"></Divider>
            <div v-if="showTextArea1" class="flex w-full flex-col items-start justify-center gap-3 py-2 md:w-5/12">
              <div class="flex w-full flex-col gap-2">
                <Textarea v-model="accomplishment.specific_activity" rows="10" class="w-full"> </Textarea>
              </div>
            </div>
            <Divider layout="vertical"></Divider>
            <div v-if="showTextArea2" class="flex w-full flex-col items-start justify-center gap-3 py-2 md:w-5/12">
              <div class="flex w-full flex-col gap-2">
                <Textarea v-model="accomplishment.highlights" rows="10" class="w-full"> </Textarea>
              </div>
            </div>

            <Button
              icon="pi pi-trash"
              severity="danger"
              rounded
              @click="removeAccomplishment(index)"
              v-if="accomplishments.length > 1"
              class="mt-2"
            />
          </div>
          <div class="flex w-full flex-col gap-4 pb-4">
            <hr />
            <Button
              v-if="AddAccomplishmentFieldBtn"
              label="+ Add Additional Week"
              @click="addAccomplishment"
              class="border border-blue-400 text-xs font-semibold text-surface-0 dark:text-primary-100 lg:text-primary-400 dark:lg:text-primary-400"
              text
            />
          </div>
          <div v-if="AccomplishmentBtn" class="mt-2 flex justify-end gap-2">
            <Button
              label="Cancel"
              @click="$router.push({ name: 'commitments' })"
              :loading="formIsSubmitting"
              :disabled="formIsSubmitting"
              class="dark:text-secondary-100 lg:text-secondary-400 dark:lg:text-secondary-400 border border-gray-300 text-xs text-gray-500 dark:border-surface-700"
              text
            >
              <template #icon>
                <i class="pi pi-ban mr-2"></i>
              </template>
            </Button>
            <Button
              @click="handleFormSubmission"
              label="Save as Draft"
              :loading="formIsSubmitting"
              :disabled="formIsSubmitting"
              class="dark:text-secondary-100 lg:text-secondary-400 dark:lg:text-secondary-400 border border-blue-500 text-xs text-primary-600 dark:border-surface-700"
              text
            >
              <template #icon>
                <i class="pi pi-file mr-2"></i>
              </template>
            </Button>
            <Button
              label="Save Accomplishment"
              :loading="formIsSubmitting"
              :disabled="formIsSubmitting"
              class="dark:text-secondary-100 lg:text-secondary-400 dark:lg:text-secondary-400 border border-blue-500 text-xs text-primary-600 dark:border-surface-700"
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
