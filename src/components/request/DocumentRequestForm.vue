<script setup lang="ts">
import { ref, reactive } from 'vue'
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import Card from 'primevue/card'
import useVuelidate from '@vuelidate/core'
import { helpers, maxLength, required } from '@vuelidate/validators'
import WbInputText from '@/components/webkit/WbInputText.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { DateToday } from '@/utils/helpers.ts'
import { useToast } from 'primevue/usetoast'
import { parseApiResponseError } from '@/utils/error-handle.ts'
import { DocumentRequestPayload, useDocumentRequestStore } from '@/stores/document-request.store'

/** Payload for the Request Document */
const payload = reactive<DocumentRequestPayload>({
  request_date: DateToday,
  certificate_type: '',
  others_type: '',
  additional_info: '',
  others_additional_info: '',
  purpose: '',
  mode_of_receipt: '',
  status: 'Draft',
})

const selectedtypeofRequestId = ref<number | null>(null)
const selectedadditioninfoRequestId = ref<number | null>(null)

const typeofRequest = [
  { id: 1, label: 'SERVICE RECORD' },
  { id: 2, label: 'CERTIFICATE OF LEAVE CREDITS' },
  { id: 3, label: 'CERTIFICATE OF EMPLOYMENT' },
  { id: 4, label: 'DULY ACCOMPLISHED OFFICE CLEARANCE CERTIFICATE FORM' },
  { id: 5, label: 'CERTIFICATE OF LEAVE WITHOUT PAY ' },
  { id: 6, label: 'OTHERS (please specify)' },
]

const additionalInformationofRequest = [
  { id: 1, label: 'SALARY/COST OF SERVICE' },
  { id: 2, label: 'SERVICE/CONTRACT GAPS ' },
  { id: 3, label: 'OTHERS (please specify) ' },
]

const isRequestSelected = (id: number): boolean => {
  return selectedtypeofRequestId.value === id
}

const isAdditionalRequestRequestSelected = (id: number): boolean => {
  return selectedadditioninfoRequestId.value === id
}

const selectRequest = (id: number): void => {
  if (selectedtypeofRequestId.value === id) {
    selectedtypeofRequestId.value = null
    payload.certificate_type = ''
    payload.others_type = ''
  } else {
    selectedtypeofRequestId.value = id
    const selectedItem = typeofRequest.find((item) => item.id === id)

    if (selectedItem) {
      payload.certificate_type = selectedItem.label
      payload.others_type = ''
      console.log('Action: Selected specific type:', payload)
    } else {
      payload.certificate_type = ''
      payload.others_type = ''
    }
  }
}

const selectAdditionalInformationRequest = (id: number): void => {
  if (selectedadditioninfoRequestId.value === id) {
    selectedadditioninfoRequestId.value = null
    payload.additional_info = ''
    payload.others_additional_info = ''
  } else {
    selectedadditioninfoRequestId.value = id
    const selectedItem = typeofRequest.find((item) => item.id === id)

    if (selectedItem) {
      payload.additional_info = selectedItem.label
      payload.others_additional_info = ''
      console.log('Action: Selected specific type:', payload)
    } else {
      payload.additional_info = ''
      payload.others_additional_info = ''
    }
  }
}

/** Validation */
const globalStringMaxLength = import.meta.env.VITE_GLOBAL_STRING_MAX_LENGTH
const globalStringMaxLengthRule = helpers.withMessage(
  `Must not exceed ${globalStringMaxLength} characters`,
  maxLength(globalStringMaxLength)
)
const formRules = () => ({
  $lazy: true,
  certificate_type: {
    type_request: helpers.withMessage('Type of Request is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
  },
  purpose: {
    required: helpers.withMessage('Purpose is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
  },
  mode_of_reciept: {
    required: helpers.withMessage('Mode of Reciept is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
  },
})

/** Handle Form Submission */
const validator = useVuelidate<Partial<DocumentRequestPayload>>(formRules, payload)
const formIsSubmitting = ref(false)
const showErrorAlert = ref(false)
const errorMessage = ref<string | null>(null)
const errorDetails = ref<string[]>([])
const toast = useToast()
const documentRequestStore = useDocumentRequestStore()

/** Emits */
const emit = defineEmits<{
  (e: 'request-created', value: boolean): void
}>()
/** Confirm the action based on the dialog type */
const handleSaveSubmissionif = async () => {
  const valid = await validator.value.$validate()
  if (!valid) {
    document.querySelector('.create-request-creds-section')?.scrollIntoView({ behavior: 'smooth' })
    toast.add({
      severity: 'error',
      summary: 'Create a Request Document',
      detail: 'Please see the validation messages',
      life: 5000,
    })
    return
  }

  formIsSubmitting.value = true

  try {
    const periodData = {
      request_date: payload.request_date,
      certificate_type: payload.certificate_type,
      others_type: payload.others_type,
      additional_info: payload.additional_info,
      others_additional_info: payload.others_additional_info,
      purpose: payload.purpose,
      mode_of_receipt: payload.mode_of_receipt,
      status: payload.status,
    }

    const periodResponse = await documentRequestStore.createDocumentRequest(periodData)

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
      document.querySelector('.create-request-creds-section')?.scrollIntoView({ behavior: 'smooth' })
      return // Ensure you return after handling the error
    }

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Request Document submitted successfully',
      life: 5000,
    })
    emit('request-created', true)

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
              @click="$router.go(-1)"
              size="small"
              class="mb-2 ml-4 md:mb-0 md:ml-0"
            />
            <h2 class="mb-2 ml-4 text-3xl font-semibold text-primary-800 dark:text-primary-100 md:ml-4">
              <font-awesome-icon :icon="['fas', 'check-double']" /> New Document Request
            </h2>
          </div>
          <br />
          <h1 class="mb-6 mr-4 flex justify-end text-lg font-semibold text-surface-600 dark:text-primary-100">
            Date of Request: {{ DateToday }}
          </h1>
          <div class="justify-center gap-2 border-b-2 bg-surface-100 px-2 py-2 md:gap-4 md:px-0">
            <div class="text-center font-semibold text-surface-500">TYPE OF REQUEST TO BE AVAILED</div>
          </div>
          <div class="max-w-screen- my-4 grid grid-cols-1 gap-2 px-4 py-2 sm:grid-cols-2 md:gap-4 md:px-0 lg:mx-24">
            <Card
              v-for="item in typeofRequest"
              :key="item.id"
              class="h-18 mx-auto w-full cursor-pointer rounded-md transition-colors"
              :class="!isRequestSelected(item.id) ? '!bg-surface-0 !text-surface-900' : '!bg-primary-400 !text-surface-0'"
              @click="selectRequest(item.id)"
            >
              <template #content>
                <div class="relative h-full w-full">
                  <p
                    class="absolute left-1/2 top-1/2 m-0 w-[70%] -translate-x-1/2 -translate-y-1/2 overflow-hidden text-center text-sm sm:text-center sm:text-base md:w-[60%] lg:text-lg"
                  >
                    {{ item.label }}
                  </p>
                  <p
                    v-if="isRequestSelected(item.id)"
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-xl !text-surface-200 sm:right-4 sm:text-2xl md:text-3xl lg:right-6 lg:text-4xl"
                  >
                    <font-awesome-icon :icon="['fas', 'check-circle']" class="text-surface-0" />
                  </p>
                </div>
              </template>
            </Card>
            <div v-if="selectedtypeofRequestId === 6" class="px-2 md:px-0">
              <WbInputText
                label=""
                v-model="payload.others_type"
                placeholder=" Please Specify:"
                label-class="text-md text-surface-600 dark:lg:text-surface-200"
                class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
              />
            </div>
          </div>

          <div class="mt-6 justify-center gap-2 border-b-2 bg-surface-100 px-2 py-2 md:gap-4 md:px-0">
            <div class="text-center font-semibold text-surface-500">ADDITIONAL INFORMATION IF REQUESTED</div>
          </div>

          <div class="my-4 grid grid-cols-1 gap-2 border-b-2 px-4 py-2 sm:grid-cols-2 md:gap-4 md:px-0 lg:mx-24">
            <Card
              v-for="request in additionalInformationofRequest"
              :key="request.id"
              class="h-18 mx-auto w-full cursor-pointer rounded-md transition-colors"
              :class="
                !isAdditionalRequestRequestSelected(request.id)
                  ? '!bg-surface-0 !text-surface-700'
                  : '!bg-primary-400 !text-surface-0'
              "
              @click="selectAdditionalInformationRequest(request.id)"
            >
              <template #content>
                <div class="relative h-full w-full">
                  <p
                    class="absolute left-1/2 top-1/2 m-0 w-[70%] -translate-x-1/2 -translate-y-1/2 overflow-hidden text-center text-sm sm:text-base md:w-[60%] lg:text-lg"
                  >
                    {{ request.label }}
                  </p>
                  <p
                    v-if="isAdditionalRequestRequestSelected(request.id)"
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-xl !text-surface-200 sm:right-4 sm:text-2xl md:text-3xl lg:right-6 lg:text-4xl"
                  >
                    <font-awesome-icon :icon="['fas', 'check-circle']" class="text-surface-0" />
                  </p>
                </div>
              </template>
            </Card>

            <div v-if="selectedadditioninfoRequestId === 3" class="px-2 md:px-0">
              <WbInputText
                label=""
                v-model="payload.others_additional_info"
                placeholder=" Please Specify:"
                label-class="text-md text-surface-600 dark:lg:text-surface-200"
                class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
              />
            </div>
          </div>

          <Divider layout="horizontal" class="hidden md:block"></Divider>
          <div class="mx-4 mt-6 flex flex-row items-center justify-center gap-4">
            <WbInputText
              label="Purpose"
              v-model="payload.purpose"
              required
              placeholder="Purpose"
              label-class="text-md text-surface-600 dark:lg:text-surface-200"
              class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
              validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
            />
          </div>
          <div class="mx-4 mt-4 flex flex-row items-center justify-center gap-4">
            <WbInputText
              label="Mode of Receipt"
              v-model="payload.mode_of_receipt"
              required
              placeholder="Mode of Receipt"
              label-class="text-md text-surface-600 dark:lg:text-surface-200"
              class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
              validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
            />
          </div>
          <Divider layout="horizontal" class="mb-12 ml-2 hidden md:block"></Divider>
          <div class="mx-4 mt-2 flex justify-end gap-2">
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
              @click="handleSaveSubmissionif"
              :loading="formIsSubmitting"
              :disabled="formIsSubmitting"
              label="Request Document"
              size="large"
              class="dark:text-secondary-100 border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
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
