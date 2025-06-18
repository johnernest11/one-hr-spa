<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import Card from 'primevue/card'
import Dialog from 'primevue/dialog'
import useVuelidate from '@vuelidate/core'
import { helpers, maxLength, required } from '@vuelidate/validators'
import WbInputText from '@/components/webkit/WbInputText.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { DateToday, formatDateRequest } from '@/utils/helpers.ts'
import { useToast } from 'primevue/usetoast'
import { parseApiResponseError } from '@/utils/error-handle.ts'
import { DocumentRequestPayload, useDocumentRequestStore } from '@/stores/document-request.store'
import { DocumentRequestResponse } from '@/typings/models.types'
import { useAuthStore } from '@/stores/auth.store'
import { useRoute } from 'vue-router'

const authStore = useAuthStore()
const documentRequestStore = useDocumentRequestStore()
const route = useRoute()
const isLoading = ref(true)
const visible = ref(false)
const dialogType = ref('')
const dialogTitle = ref('')
const dialogMessage = ref('')
const confirmButtonLabel = ref('')
const compensatoryBtn = ref(false)
const isUpdateMode = computed(() => !!route.params.id)

const selectedtypeofRequestId = ref<number | null>(null)

const selectedadditioninfoRequestId = ref<number | null>(null)

const typeofRequest = [
  { id: 1, label: 'SERVICE RECORD' },
  { id: 2, label: 'CERTIFICATE OF LEAVE CREDITS' },
  { id: 3, label: 'CERTIFICATE OF EMPLOYMENT' },
  { id: 4, label: 'DULY ACCOMPLISHED OFFICE CLEARANCE CERTIFICATE FORM' },
  { id: 5, label: 'CERTIFICATE OF LEAVE WITHOUT PAY' },
  { id: 6, label: 'OTHERS (please specify)' },
]

const additionalInformationofRequest = [
  { id: 1, label: 'SALARY/COST OF SERVICE' },
  { id: 2, label: 'SERVICE/CONTRACT GAPS' },
  { id: 3, label: 'OTHERS (please specify) ' },
]
/** Payload for the Request Document */
const payload = reactive<DocumentRequestPayload>({
  request_date: DateToday,
  certificate_type: null,
  others_type: '',
  additional_info: null,
  others_additional_info: '',
  purpose: '',
  mode_of_receipt: '',
  status: 'Draft',
})

// watch(
//   () => payload.certificate_type,
//   (newVal) => {
//     const matched = typeofRequest.find((item) => item.label === newVal)
//     selectedtypeofRequestId.value = matched ? matched.id : null
//   },
//   { immediate: true }
// )

watch(
  () => payload.additional_info,
  (newVal) => {
    const matched = additionalInformationofRequest.find((item) => item.label === newVal)
    selectedadditioninfoRequestId.value = matched ? matched.id : null
  },
  { immediate: true }
)

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
    }
  }
}

const isRequestSelected = (id: number) => selectedtypeofRequestId.value === id

const selectAdditionalInformationRequest = (id: number): void => {
  if (selectedadditioninfoRequestId.value === id) {
    selectedadditioninfoRequestId.value = null
    payload.additional_info = ''
    payload.others_additional_info = ''
  } else {
    selectedadditioninfoRequestId.value = id
    const selectedItem = additionalInformationofRequest.find((item) => item.id === id)
    if (selectedItem) {
      payload.additional_info = selectedItem.label
      payload.others_additional_info = ''
    }
  }
}
watch(
  () => payload.additional_info,
  (newVal) => {
    console.log('Selected Additional Info:', newVal)
  }
)
const isAdditionalRequestRequestSelected = (id: number) => selectedadditioninfoRequestId.value === id

type DocumentRequestFormProps = {
  documentRequest?: DocumentRequestResponse
}
const props = defineProps<DocumentRequestFormProps>()
onMounted(async () => {
  const id = route.params.id as string
  if (id) {
    const response = await documentRequestStore.fetchDocumentRequestById(id)
    if (response && response.success) {
      updatePayloadFromReport(response.data as DocumentRequestResponse)
    }
  }
  isLoading.value = false
})

const updatePayloadFromReport = (documentRequest: DocumentRequestResponse | null) => {
  payload.request_date = documentRequest?.request_date ?? null
  payload.certificate_type = documentRequest?.certificate_type ?? ''
  payload.others_type = documentRequest?.others_type ?? ''
  payload.additional_info = documentRequest?.additional_info ?? ''
  payload.others_additional_info = documentRequest?.others_additional_info ?? ''
  payload.purpose = documentRequest?.purpose ?? ''
  payload.mode_of_receipt = documentRequest?.mode_of_receipt ?? ''
  payload.status = documentRequest?.status ?? ''
}

watch(
  () => props.documentRequest,
  (newValue) => {
    if (newValue) {
      updatePayloadFromReport(newValue)
    } else {
      payload.request_date = ''
      payload.certificate_type = ''
      payload.others_type = ''
      payload.additional_info = ''
      payload.others_additional_info = ''
      payload.purpose = ''
      payload.mode_of_receipt = ''
      payload.status = ''
    }
  },
  { immediate: true }
)

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

/** Emits */
const emit = defineEmits<{
  (e: 'request-created', value: boolean): void
}>()

const openDialog = (type: 'pending' | 'in progress' | 'released') => {
  dialogType.value = type
  visible.value = true

  if (type === 'pending') {
    dialogTitle.value = 'Save Document Request?'
    dialogMessage.value = 'Saving this document request as draft allows you to return and complete it later.'
    confirmButtonLabel.value = 'Submit'
    payload.status = 'pending'
  }

  if (type === 'in progress') {
    dialogTitle.value = 'Submit Document Request?'
    dialogMessage.value = 'Submitting this request will send it for processing. You won’t be able to make further changes.'
    confirmButtonLabel.value = 'Submit'
    payload.status = 'in progress'
  }

  if (type === 'released') {
    dialogTitle.value = 'Approve Document Request?'
    dialogMessage.value = 'Approving this document request will mark it as completed and ready for release.'
    confirmButtonLabel.value = 'Approve Request'
    payload.status = 'released'
  }
}

/** Confirm the action based on the dialog type */
const confirmAction = () => {
  if (dialogType.value === 'pending') {
    handleSaveSubmissionif()
  } else if (dialogType.value === 'in progress') {
    handleSaveSubmissionif()
  } else if (dialogType.value === 'released') {
    handleSaveSubmissionif()
  }

  visible.value = false
}

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

const isHumanResourceActive = computed(() => route.name === 'document-requests/editor')
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
              <font-awesome-icon :icon="['fas', isHumanResourceActive ? 'magnifying-glass' : 'check-double']" />
              {{
                isHumanResourceActive
                  ? 'Viewing Document Request'
                  : route.params.id
                    ? 'Update Document Request'
                    : 'New Document Request'
              }}
              <br />
              <span class="ml-10 text-lg text-surface-600 md:text-xl lg:text-2xl">
                {{ isHumanResourceActive && authStore.authFullName ? authStore.authFullName : '' }}
              </span>
            </h2>
          </div>
          <br />
          <h1 class="mb-6 mr-4 flex justify-end text-lg font-semibold text-surface-600 dark:text-primary-100">
            Date of Request:
            {{
              isUpdateMode
                ? formatDateRequest(payload.request_date)
                : isHumanResourceActive
                  ? formatDateRequest(payload.request_date)
                  : DateToday
            }}
          </h1>
          <div class="justify-center gap-2 border-b-2 bg-surface-100 px-2 py-2 md:gap-4 md:px-0">
            <div class="text-center font-semibold text-surface-500">TYPE OF REQUEST TO BE AVAILED</div>
          </div>
          <div class="max-w-screen- my-4 grid grid-cols-1 gap-2 px-4 py-2 sm:grid-cols-2 md:gap-4 md:px-0 lg:mx-24">
            <Card
              v-for="item in typeofRequest"
              :key="item.id"
              class="cursor-pointer"
              :class="{
                '!bg-primary-400 !text-white': item.id === selectedtypeofRequestId,
                '!bg-surface-0 !text-black': item.id !== selectedtypeofRequestId,
              }"
              @click="
                ['in progress', 'released'].includes(payload.status || '') || isHumanResourceActive
                  ? null
                  : selectRequest(item.id)
              "
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
              class="cursor-pointer"
              :class="{
                '!bg-primary-400 !text-white': request.id === selectedadditioninfoRequestId,
                '!bg-surface-0 !text-black': request.id !== selectedadditioninfoRequestId,
              }"
              @click="
                ['in progress', 'released'].includes(payload.status || '') || isHumanResourceActive
                  ? null
                  : selectAdditionalInformationRequest(request.id)
              "
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
                v-model="payload.additional_info"
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
              :disabled="['in progress', 'released'].includes(payload.status || '') || isHumanResourceActive"
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
              :disabled="['in progress', 'released'].includes(payload.status || '') || isHumanResourceActive"
              placeholder="Mode of Receipt"
              label-class="text-md text-surface-600 dark:lg:text-surface-200"
              class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
              validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
            />
          </div>
          <Divider layout="horizontal" class="mb-12 ml-2 hidden md:block"></Divider>
          <!-- Other content -->
          <div v-if="!compensatoryBtn" class="mt-2 flex justify-end gap-2">
            <Button
              label="Cancel"
              :loading="formIsSubmitting"
              :disabled="formIsSubmitting"
              class="dark:text-secondary-100 border border-surface-400 text-base text-surface-500 dark:border-surface-700 lg:text-surface-500 dark:lg:text-surface-400"
              text
              @click="$router.go(-1)"
            >
              <template #icon>
                <i class="pi pi-ban mr-2"></i>
              </template>
            </Button>

            <Button
              @click="openDialog('pending')"
              v-if="!isHumanResourceActive"
              :label="isUpdateMode ? 'Update Request Document' : 'Request Document'"
              :loading="formIsSubmitting"
              :disabled="['in progress', 'released'].includes(payload.status || '') || isHumanResourceActive"
              class="dark:text-secondary-100 border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
              text
            >
              <template #icon>
                <i class="pi pi-file mr-2"></i>
              </template>
            </Button>

            <Button
              @click="openDialog('in progress')"
              v-if="isHumanResourceActive"
              label="On Hold Request"
              :loading="formIsSubmitting"
              :disabled="payload && payload.status == 'released'"
              class="dark:text-secondary-100 border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
              text
            >
              <template #icon>
                <i class="pi pi-file mr-2"></i>
              </template>
            </Button>
            <Button
              @click="openDialog('released')"
              v-if="isHumanResourceActive"
              label=" Release Document Request"
              :loading="formIsSubmitting"
              :disabled="payload && payload.status == 'released'"
              class="dark:text-secondary-100 border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
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
          <!-- End Action Buttons -->
        </template>
      </Card>
    </div>
  </form>
</template>
