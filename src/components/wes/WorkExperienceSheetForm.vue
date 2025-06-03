<script setup lang="ts">
import { ref, reactive } from 'vue'
import { parseApiResponseError } from '@/utils/error-handle.ts'
import { helpers, maxLength, required } from '@vuelidate/validators'
import WbTextarea from '@/components/webkit/WbTextArea.vue'
import WbInputText from '@/components/webkit/WbInputText.vue'
import Button from 'primevue/button'
import useVuelidate from '@vuelidate/core'
import Divider from 'primevue/divider'
import Dialog from 'primevue/dialog'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useToast } from 'primevue/usetoast'
import { WorkExperienceSheetPayload, useWorkExperienceSheetStore } from '@/stores/work-experience-sheet.store'

/** Payload for the Work Experience Sheet */
const payload = reactive<WorkExperienceSheetPayload>({
  duration: '',
  position: '',
  name_office_unit: '',
  immediate_supervisor: '',
  name_agency: '',
  list_accomplishment: null,
  summary_duties: null,
})

/** Array to store the Work Experience Sheet entries */
const workexperiencesheets = ref([
  {
    duration: payload.duration,
    position: payload.position,
    name_office_unit: payload.name_office_unit,
    immediate_supervisor: payload.immediate_supervisor,
    name_agency: payload.name_agency,
    list_accomplishment: payload.list_accomplishment,
    summary_duties: payload.summary_duties,
  },
])

/** Function to add a new Work Experience Sheet entry */
const addWorkExperienceSheet = (newFields = {}) => {
  const defaultWorkExperienceSheet = {
    duration: '',
    position: '',
    name_office_unit: '',
    immediate_supervisor: '',
    name_agency: '',
    list_accomplishment: null,
    summary_duties: null,
  }

  const newWorkExperienceSheet = { ...defaultWorkExperienceSheet, ...newFields }
  workexperiencesheets.value.push(newWorkExperienceSheet)
  validator.value.workexperiencesheet.$touch()
}

/** Function to remove an Work Experience Sheet entry */
const removeWorkExperienceSheet = (index: number) => {
  if (index >= 0 && index < workexperiencesheets.value.length) {
    workexperiencesheets.value.splice(index, 1)
  }
}

const visible = ref(false)
const dialogType = ref('') // Add empty string for initial value
const dialogTitle = ref('')
const dialogMessage = ref('')
const confirmButtonLabel = ref('')

/** Validation */
const globalStringMaxLength = import.meta.env.VITE_GLOBAL_STRING_MAX_LENGTH
const globalStringMaxLengthRule = helpers.withMessage(
  `Must not exceed ${globalStringMaxLength} characters`,
  maxLength(globalStringMaxLength)
)
const formRules = () => ({
  $lazy: true,
  duration: {
    required: helpers.withMessage('Duration of Work Experience Sheet is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
  },
  position: {
    required: helpers.withMessage('Position of Work Experience Sheet is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
  },
  name_office_unit: {
    required: helpers.withMessage('Name of Office/Unit of Work Experience Sheet is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
  },
  immediate_supervisor: {
    required: helpers.withMessage('Immediate Supervisor of Work Experience Sheet is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
  },
  name_agency: {
    required: helpers.withMessage('Name of Agency/Organization and Location of Work Experience Sheet is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
  },
})

/** Handle Form Submission */
const validator = useVuelidate<Partial<WorkExperienceSheetPayload>>(formRules, payload)
const formIsSubmitting = ref(false)
const showErrorAlert = ref(false)
const errorMessage = ref<string | null>(null)
const errorDetails = ref<string[]>([])
const workExperienceSheetStore = useWorkExperienceSheetStore()
const toast = useToast()
/** Emits */
const emit = defineEmits<{
  (e: 'wes-created', value: boolean): void
}>()
/** Open a dialog with a specified type (export, markDone, or saveDraft) */
const openDialog = (type: 'save') => {
  dialogType.value = type
  visible.value = true

  if (type === 'save') {
    dialogTitle.value = 'Save Work Experience Sheet ?'
    dialogMessage.value = 'Saving as draft allows you to continue editing later.'
    confirmButtonLabel.value = 'Save as Draft'
  }
}
/** Confirm the action based on the dialog type */
const handleSaveSubmissionif = async () => {
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
      duration: payload.duration,
      position: payload.position,
      name_office_unit: payload.name_office_unit,
      immediate_supervisor: payload.immediate_supervisor,
      name_agency: payload.name_agency,
      list_accomplishment: payload.list_accomplishment,
      summary_duties: payload.summary_duties,
    }

    const periodResponse = await workExperienceSheetStore.createWorkExperienceSheet(periodData)

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
      document.querySelector('.create-wes-creds-section')?.scrollIntoView({ behavior: 'smooth' })
      return // Ensure you return after handling the error
    }

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Work Experience Sheet submitted successfully',
      life: 5000,
    })
    emit('wes-created', true)

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
    <div class="flex h-full w-full flex-col shadow-md">
      <div class="h-full w-full rounded-md bg-surface-0 p-6">
        <div
          class="flex items-center justify-between space-x-4 font-medium text-surface-700 dark:text-surface-100 md:ml-4 md:mt-2 md:flex-row"
        >
          <h1 class="mb-2 mr-4 whitespace-nowrap text-xl text-surface-700 dark:text-primary-100 md:text-xl lg:text-3xl">
            My Work Experience Sheet
          </h1>
          <!-- Button aligned to the end -->
          <div class="flex w-full justify-end">
            <Button
              label="Export to word file"
              type="submit"
              size="large"
              class="dark:text-secondary-100 bottom-0 right-0 mt-4 border border-primary-500 text-base text-primary-700 dark:border-surface-700 lg:text-primary-600 dark:lg:text-surface-400"
              text
            >
              <template #icon>
                <i class="pi pi-save mr-2"></i>
              </template>
            </Button>
          </div>
        </div>
        <div
          class="flex flex-row items-center space-x-4 font-medium text-primary-900 dark:text-primary-100 md:ml-4 md:mt-2 md:flex-row"
        >
          <span class="flex flex-col justify-center pl-4">
            <p class="text-xl italic md:text-2xl">Instructions:</p>
          </span>
        </div>
        <div
          class="flex flex-row items-center space-x-4 font-medium text-surface-700 dark:text-primary-100 md:ml-4 md:mt-2 md:flex-row"
        >
          <span class="flex flex-col justify-center pl-36">
            <p class="text-md italic md:text-lg">
              1. Include only the work experiences relevant to the position being applied to.
            </p>
            <p class="text-md italic md:text-lg">
              2. The duration should include start and finish dates, if known, month in abbreviated form, if known, and year in
              full. For the
            </p>
            <p class="text-md italic md:text-lg">
              current position, use the word Present, e.g., 1998-Present. Work experience should be listed from most recent first.
            </p>
          </span>
        </div>

        <div class="mt-2 flex flex-col">
          <div class="w-full">
            <div class="w-full">
              <div class="flex flex-col gap-4">
                <!-- START ITEM NUMBER Fields as HR PPMS -->
                <div v-for="(workexperiencesheet, index) in workexperiencesheets" :key="index" class="mb-4 flex flex-col">
                  <div class="flex flex-row items-center justify-end gap-4">
                    <div>
                      <Button
                        @click="removeWorkExperienceSheet(index)"
                        v-if="workexperiencesheets.length > 1"
                        label="Remove WES"
                        severity="danger"
                        size="large"
                        class="dark:text-secondary-100 bottom-0 right-0 mt-4 w-full border border-error-600 text-base text-error-600 dark:border-surface-700 lg:text-error-600 dark:lg:text-surface-400"
                        text
                      >
                        <template #icon>
                          <i class="pi pi-trash mr-2"></i>
                        </template>
                      </Button>
                    </div>
                  </div>
                  <Divider layout="horizontal" class="mt-4 md:hidden" v-if="index < workexperiencesheets.length - 1" />
                  <div class="flex flex-row items-center justify-center gap-4">
                    <WbInputText
                      label="Duration"
                      v-model="workexperiencesheet.duration"
                      :invalid="validator.duration.$invalid"
                      :invalid-text="validator.duration.$errors[0]?.$message"
                      @blur="validator.duration.$touch"
                      @focusin="validator.duration.$dirty = false"
                      required
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                    >
                    </WbInputText>
                  </div>
                  <div class="mt-6 flex flex-row items-center justify-center gap-4">
                    <WbInputText
                      label="Position"
                      required
                      v-model="workexperiencesheet.position"
                      :invalid="validator.position.$invalid"
                      :invalid-text="validator.position.$errors[0]?.$message"
                      @blur="validator.position.$touch"
                      @focusin="validator.position.$dirty = false"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                    >
                    </WbInputText>
                  </div>
                  <div class="mt-6 flex flex-row items-center justify-center gap-4">
                    <WbInputText
                      label="Name of Office/Unit"
                      required
                      v-model="workexperiencesheet.name_office_unit"
                      :invalid="validator.name_office_unit.$invalid"
                      :invalid-text="validator.name_office_unit.$errors[0]?.$message"
                      @blur="validator.name_office_unit.$touch"
                      @focusin="validator.name_office_unit.$dirty = false"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                    >
                    </WbInputText>
                  </div>
                  <div class="mt-6 flex flex-row items-center justify-center gap-4">
                    <WbInputText
                      label="Immediate Supervisor"
                      required
                      v-model="workexperiencesheet.immediate_supervisor"
                      :invalid="validator.immediate_supervisor.$invalid"
                      :invalid-text="validator.immediate_supervisor.$errors[0]?.$message"
                      @blur="validator.immediate_supervisor.$touch"
                      @focusin="validator.immediate_supervisor.$dirty = false"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                    >
                    </WbInputText>
                  </div>
                  <div class="mt-6 flex flex-row items-center justify-center gap-4">
                    <WbInputText
                      label="Name of Agency/Organization and Location"
                      required
                      v-model="workexperiencesheet.name_agency"
                      :invalid="validator.name_agency.$invalid"
                      :invalid-text="validator.name_agency.$errors[0]?.$message"
                      @blur="validator.name_agency.$touch"
                      @focusin="validator.name_agency.$dirty = false"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                    >
                    </WbInputText>
                  </div>
                  <div class="mt-6 flex flex-row items-center justify-center gap-4">
                    <WbTextarea
                      v-model="workexperiencesheet.list_accomplishment"
                      label="List of Accomplishments and Contributions (if any)"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                    >
                    </WbTextarea>
                  </div>
                  <div class="mt-6 flex flex-row items-center justify-center gap-4">
                    <WbTextarea
                      v-model="workexperiencesheet.summary_duties"
                      label="Summary of Actual Duties"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                    >
                    </WbTextarea>
                  </div>
                </div>
              </div>
              <div class="flex flex-row items-center justify-start gap-4">
                <div>
                  <Button
                    label="+ Add additional Work Experience field"
                    type="submit"
                    @click="addWorkExperienceSheet"
                    size="large"
                    class="dark:text-secondary-100 bottom-0 right-0 mt-4 w-full border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-600 dark:lg:text-surface-600"
                    text
                  >
                  </Button>
                </div>
              </div>
              <div class="flex flex-row items-center justify-end gap-4">
                <div>
                  <Button
                    @click="openDialog('save')"
                    label="Save WES"
                    type="submit"
                    size="large"
                    class="dark:text-secondary-100 bottom-0 right-0 mt-4 w-full border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-600 dark:lg:text-surface-600"
                    text
                  >
                    <template #icon>
                      <i class="pi pi-save mr-2"></i>
                    </template>
                  </Button>
                </div>
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
                    class="dark:text-secondary-100 border border-surface-400 text-xs text-surface-500 dark:border-surface-700 lg:text-surface-500 dark:lg:text-surface-600"
                    text
                    @click="visible = false"
                  >
                    <template #icon>
                      <i class="pi pi-ban mr-2"></i>
                    </template>
                  </Button>
                  <Button
                    @click="handleSaveSubmissionif"
                    :label="confirmButtonLabel"
                    :loading="formIsSubmitting"
                    :disabled="formIsSubmitting"
                    class="dark:text-secondary-100 border border-primary-500 text-xs text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-600"
                    text
                  >
                    <template #icon>
                      <font-awesome-icon :icon="['fas', 'share']" class="mr-2" />
                    </template>
                  </Button>
                </template>
              </Dialog>
              <!-- End Dialog Confirmation Modal Action -->
            </div>
          </div>
        </div>
      </div>
    </div>
  </form>
</template>
