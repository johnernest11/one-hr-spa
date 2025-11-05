<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue'
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import Card from 'primevue/card'
import Dialog from 'primevue/dialog'
import useVuelidate from '@vuelidate/core'
import { helpers, maxLength, required } from '@vuelidate/validators'
import WbInputText from '@/components/webkit/WbInputText.vue'
import WbCalendar from '@/components/webkit/WbCalendar.vue'
import WbDropdown from '@/components/webkit/WbDropdown.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { DateToday, formatDateRequest } from '@/utils/helpers.ts'
import { useToast } from 'primevue/usetoast'
import { parseApiResponseError } from '@/utils/error-handle.ts'
import { LeaveApplicationPayload, useLeaveApplicationStore } from '@/stores/leave-application.store'
import { LeaveApplicationResponse } from '@/typings/models.types'
import { useAuthStore } from '@/stores/auth.store'
import { useRoute } from 'vue-router'

const authStore = useAuthStore()
const isUpdateMode = computed(() => !!route.params.id)
const visible = ref(false)
const dialogType = ref('')
const dialogTitle = ref('')
const dialogMessage = ref('')
const confirmButtonLabel = ref('')
// const compensatoryBtn = ref(false)
const selectedtypeofLeaveId = ref<number | null>(null)

const typeofLeave = [
  {
    id: 1,
    title: 'VACATION LEAVE',
    description: 'Sec. 51, Rule XVI, Omnibus Rules Implementing E.O. No. 292',
  },
  {
    id: 2,
    title: 'MANDATORY/FORCED LEAVE',
    description: 'Sec. 25, Rule XVI, Omnibus Rules Implementing E.O. No. 292',
  },
  {
    id: 3,
    title: 'SICK LEAVE',
    description: 'Sec. 43, Rule XVI, Omnibus Rules Implementing E.O. No. 292',
  },
  {
    id: 4,
    title: 'MATERNITY LEAVE',
    description: 'R.A. No. 11210 / IRR issued by CSC, DOLE and SSS',
  },
  {
    id: 5,
    title: 'PATERNITY LEAVE',
    description: 'R.A. No. 8187 / CSC MC No 71, s. 1998, as amended',
  },
  {
    id: 6,
    title: 'SPECIAL PRIVILEGE LEAVE',
    description: 'Sec. 21, Rule XVI, Omnibus Rules Implementing E.O. No. 292',
  },
  {
    id: 7,
    title: 'SPECIAL  LEAVE BENEFITS FOR WOMEN',
    description: '(RA No. 9710 / CSC MC No. 25, s. 2010)',
  },
  {
    id: 8,
    title: 'SOLO PARENT LEAVE',
    description: 'Sec. 21, Rule XVI, Omnibus Rules Implementing E.O. No. 292',
  },
  {
    id: 9,
    title: 'STUDY LEAVE',
    description: 'Sec. 68, Rule XVI, Omnibus Rules Implementing E.O. No. 292',
  },
  {
    id: 10,
    title: '10-DAY VAWC LEAVE',
    description: 'RA No. 9262 / CSC MC No. 15, s. 2005',
  },
  {
    id: 11,
    title: 'REHABILITATION PRIVILEGE',
    description: 'Sec. 55, Rule XVI, Omnibus Rules Implementing E.O. No. 292',
  },
  {
    id: 12,
    title: 'SPECIAL EMERGENCY (Calamity)  LEAVE',
    description: 'CSC MC No. 2, s. 2012, as amended',
  },
  {
    id: 13,
    title: 'OTHERS',
    description: '',
  },

  {
    id: 14,
    title: 'ADOPTION LEAVE',
    description: 'R.A. No. 8552',
  },
]

/** Payload for the Request Document */
const payload = reactive<LeaveApplicationPayload>({
  date_of_filing: DateToday,
  leave_type_id: {
    title: '',
    description: '',
  },
  others_notes: '',
  number_of_days: '',
  detail_of_leave: '',
  specific_detail: '',
  commutation: '',
  status: '',
  division_head_disapproval_notes: '',
  days_with_pay: '',
  days_without_pay: '',
  disapproved_notes: '',
  dates: [],
})

payload.dates = reactive([
  {
    start_date: '',
    end_date: '',
  },
])
const formattedDate = formatDateRequest(payload.date_of_filing)
watch(
  () => payload.leave_type_id,
  (newVal) => {
    if (newVal && typeof newVal === 'object' && 'title' in newVal && 'description' in newVal) {
      const matched = typeofLeave.find((item) => item.title === newVal.title && item.description === newVal.description)
      selectedtypeofLeaveId.value = matched ? matched.id : null
    } else {
      selectedtypeofLeaveId.value = null
    }
  },
  { immediate: true }
)

const selectLeave = (id: number): void => {
  if (selectedtypeofLeaveId.value === id) {
    selectedtypeofLeaveId.value = null
    payload.leave_type_id = { title: '', description: '' }
  } else {
    const selectedItem = typeofLeave.find((item) => item.id === id)
    if (selectedItem) {
      selectedtypeofLeaveId.value = id
      payload.leave_type_id = {
        title: selectedItem.title,
        description: selectedItem.description,
      }
    }
  }
}

const isLeaveSelected = (id: number): boolean => {
  return selectedtypeofLeaveId.value === id
}

watch(
  () => payload.dates.map((dates) => dates.start_date),
  () => {}
)
/** Array to store the accomplishment entries */
const addInclusiveDates = (newFields = {}) => {
  const defaultInclusiveDates = {
    start_date: '',
    end_date: '',
  }

  const newInclusiveDates = { ...defaultInclusiveDates, ...newFields }
  payload.dates.push(newInclusiveDates)
  validator.value.inclusiveDates.$touch()
}

/** Function to remove an accomplishment entry */
const removeInclusiveDates = (index: number) => {
  if (index >= 0 && index < payload.dates.length) {
    payload.dates.splice(index, 1)
  }
}
/** Options for selecting the week number */
const modeofReceiptOptions = ref([
  { label: 'Not Requested', value: 'Not Requested' },
  { label: 'Requested', value: 'Requested' },
])

const recommendationOptions = ref([
  { label: 'Disapprove', value: 'Disapprove' },
  { label: 'Approve', value: 'Approve' },
])

const approvedForOptions = ref([
  { label: 'Disapprove', value: 'Disapprove' },
  { label: 'Approve', value: 'Approve' },
])

type LeaveApplicationFormProps = {
  leaveApplication?: LeaveApplicationResponse
}
const props = defineProps<LeaveApplicationFormProps>()
onMounted(async () => {
  const id = route.params.id as string
  if (id) {
    const response = await leaveApplicationStore.fetchLeaveApplicationById(id)
    if (response && response.success) {
      updatePayloadFromReport(response.data as LeaveApplicationResponse)
    }
  }
  isLoading.value = false
})

const updatePayloadFromReport = (leaveApplication: LeaveApplicationResponse | null) => {
  payload.leave_type_id = leaveApplication?.leave_type_id
    ? {
        title: leaveApplication.leave_type_id.title ?? '',
        description: leaveApplication.leave_type_id.description != null ? String(leaveApplication.leave_type_id.description) : '',
      }
    : { title: '', description: '' }
  payload.date_of_filing = leaveApplication?.date_of_filing ?? null
  payload.others_notes = leaveApplication?.others_notes ?? ''
  payload.number_of_days = leaveApplication?.number_of_days ?? ''
  payload.detail_of_leave = leaveApplication?.detail_of_leave ?? ''
  payload.specific_detail = leaveApplication?.specific_detail ?? ''
  payload.commutation = leaveApplication?.commutation ?? ''
  payload.status = leaveApplication?.status ?? ''
  payload.division_head_disapproval_notes = leaveApplication?.division_head_disapproval_notes ?? ''
  payload.days_with_pay = leaveApplication?.days_with_pay ?? ''
  payload.days_without_pay = leaveApplication?.days_without_pay ?? ''
  payload.disapproved_notes = leaveApplication?.disapproved_notes ?? ''
  payload.dates = leaveApplication?.dates ?? []
}

watch(
  () => props.leaveApplication,
  (newValue) => {
    if (newValue) {
      updatePayloadFromReport(newValue)
    } else {
      payload.leave_type_id = { title: '', description: '' }
      payload.date_of_filing = ''
      payload.others_notes = ''
      payload.number_of_days = ''
      payload.detail_of_leave = ''
      payload.specific_detail = ''
      payload.commutation = ''
      payload.status = ''
      payload.division_head_disapproval_notes = ''
      payload.days_with_pay = ''
      payload.days_without_pay = ''
      payload.disapproved_notes = ''
      payload.dates = [
        {
          start_date: '',
          end_date: '',
        },
      ]
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
  number_of_days: {
    type_request: helpers.withMessage('Number of Days is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
  },
  dates: {
    $each: {
      start_date: {
        required: helpers.withMessage('Start date is required', required),
      },
      end_date: {
        required: helpers.withMessage('End date is required', required),
      },
    },
  },
})

/** Handle Form Submission */
const validator = useVuelidate<Partial<LeaveApplicationPayload>>(formRules, payload)
const formIsSubmitting = ref(false)
const showErrorAlert = ref(false)
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const errorDetails = ref<string[]>([])
const toast = useToast()
const route = useRoute()
const leaveApplicationStore = useLeaveApplicationStore()

/** Emits */
const emit = defineEmits<{
  (e: 'leave-created', value: boolean): void
}>()

const openDialog = (type: 'for review' | 'draft' | 'approved') => {
  dialogType.value = type
  visible.value = true

  switch (type) {
    case 'for review':
      dialogTitle.value = 'File Leave Application?'
      dialogMessage.value = 'Filling your Leave Application, will allow you to continue editing it later.'
      confirmButtonLabel.value = 'File and Submit'
      break

    case 'draft':
      dialogTitle.value = 'Save as Draft this Leave Application?'
      dialogMessage.value = 'Save as Draft your Leave Application, will allow you to continue editing it later.'
      confirmButtonLabel.value = 'Save as Draft'
      break
    case 'approved':
      dialogTitle.value = 'Approve Leave Application?'
      dialogMessage.value = 'Approving this Leave Application will mark it as complete and archive it.'
      confirmButtonLabel.value = 'Approve and Archive'
      break
  }
}

/** Confirm the action based on the dialog type */
const confirmAction = () => {
  if (dialogType.value === 'draft') {
    handleSaveSubmissionif()
  } else if (dialogType.value === 'in review') {
    handleSaveSubmissionif()
  } else if (dialogType.value === 'approved') {
    handleSaveSubmissionif()
  }

  visible.value = false
}
/** Confirm the action based on the dialog type */
const handleSaveSubmissionif = async () => {
  const valid = await validator.value.$validate()
  if (!valid) {
    document.querySelector('.create-leave-creds-section')?.scrollIntoView({ behavior: 'smooth' })
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
      date_of_filing: payload.date_of_filing,
      others_notes: payload.others_notes,
      number_of_days: payload.number_of_days,
      detail_of_leave: payload.detail_of_leave,
      specific_detail: payload.specific_detail,
      commutation: payload.commutation,
      status: payload.status,
      division_head_disapproval_notes: payload.division_head_disapproval_notes,
      days_with_pay: payload.days_with_pay,
      days_without_pay: payload.days_without_pay,
      disapproved_notes: payload.disapproved_notes,
      dates: payload.dates,
    }

    const periodResponse = await leaveApplicationStore.createLeaveApplication(periodData)

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
      document.querySelector('.create-leave-creds-section')?.scrollIntoView({ behavior: 'smooth' })
      return // Ensure you return after handling the error
    }

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Leave Application submitted successfully',
      life: 5000,
    })
    emit('leave-created', true)

    setTimeout(() => {
      window.location.reload() // Consider alternative approaches if full reload isn't necessary
    }, 1000)
  } finally {
    formIsSubmitting.value = false // Ensure formIsSubmitting is always set to false
  }
}

const isHumanResourceActive = computed(() => route.name === 'leave-applications/editor')
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
                  ? 'Viewing Application for Leave'
                  : route.params.id
                    ? 'Update Application for Leave'
                    : 'New Application for Leave'
              }}
              <br />
              <span class="ml-10 text-lg text-surface-600 md:text-xl lg:text-2xl">
                {{ isHumanResourceActive && authStore.authFullName ? authStore.authFullName : '' }}
              </span>
            </h2>
          </div>
          <br />
          <div class="mb-8 mt-2 flex flex-col md:flex-row md:items-center md:justify-between">
            <div class="mb-4 ml-0 flex w-full flex-col items-start justify-center gap-2 py-2 md:mb-0 md:ml-6 md:w-2/6">
              <div class="flex w-full flex-col">
                <WbInputText
                  label="Number of Days"
                  v-model="payload.number_of_days"
                  required
                  placeholder="e.g. 2"
                  :disabled="isHumanResourceActive || payload.status === 'approved'"
                  label-class="text-md text-surface-600 dark:lg:text-surface-200"
                  class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                  validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                />
              </div>
            </div>

            <div class="mb-6 mr-4 flex w-full justify-end md:mb-0 md:w-auto">
              <h1 class="mb-6 mr-4 flex justify-end text-lg font-semibold text-surface-600 dark:text-primary-100">
                Date of Request:
                {{ isUpdateMode ? formattedDate : isHumanResourceActive ? formattedDate : DateToday }}
              </h1>
            </div>
          </div>
          <div class="justify-center gap-2 border-b-2 bg-surface-100 px-2 py-2 md:gap-4 md:px-0">
            <div class="text-center font-semibold text-surface-500">TYPE OF LEAVE TO BE AVAILED</div>
          </div>
          <div class="max-w-screen- my-0 grid grid-cols-1 gap-2 px-4 py-2 sm:grid-cols-2 md:gap-4 md:px-0 lg:mx-24">
            <Card
              v-for="item in typeofLeave"
              :key="item.id"
              class="cursor-pointer"
              :class="{
                '!bg-primary-400 !text-white': item.id === selectedtypeofLeaveId,
                '!bg-surface-0 !text-black': item.id !== selectedtypeofLeaveId,
              }"
              @click="['approved'].includes(payload.status || '') || isHumanResourceActive ? null : selectLeave(item.id)"
            >
              <template #content>
                <div class="relative h-full w-full">
                  <p
                    class="absolute left-1/2 top-1/2 m-0 w-[70%] -translate-x-1/2 -translate-y-1/2 overflow-hidden text-sm sm:text-base md:w-[80%] lg:text-lg"
                  >
                    {{ item.title }}
                    <br />
                    <span
                      class="text-xs sm:text-sm"
                      :class="!isLeaveSelected(item.id) ? 'text-surface-600 dark:text-surface-300' : 'text-surface-0'"
                    >
                      {{ item.description }}
                    </span>
                  </p>

                  <p
                    v-if="isLeaveSelected(item.id)"
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-xl !text-surface-200 sm:right-4 sm:text-2xl md:text-3xl lg:right-6 lg:text-4xl"
                  >
                    <font-awesome-icon :icon="['fas', 'check-circle']" class="text-surface-0" />
                  </p>
                </div>
              </template>
            </Card>
            <div v-if="selectedtypeofLeaveId === 13" class="px-2 md:px-0">
              <WbInputText
                label=""
                v-model="payload.others_notes"
                placeholder=" Please Specify:"
                label-class="text-md text-surface-600 dark:lg:text-surface-200"
                class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
              />
            </div>
          </div>

          <div class="mt-6 justify-center gap-2 border-b-2 bg-surface-100 px-2 py-2 md:gap-4 md:px-0">
            <div class="text-center font-semibold text-surface-500">DETAILS OF LEAVE</div>
          </div>
          <div class="mx-auto my-4 flex h-full flex-col lg:mx-24">
            <Card
              v-if="selectedtypeofLeaveId === 7"
              class="h-22 mx-auto my-0 w-full cursor-pointer rounded-md !bg-primary-200 transition-colors"
            >
              <template #content>
                <div class="relative mb-2 h-12 w-full">
                  <p
                    class="absolute left-1/2 top-1/2 m-0 w-[90%] -translate-x-1/2 -translate-y-1/2 overflow-hidden text-sm sm:text-base md:w-[90%] lg:text-lg"
                  >
                    In case of Special Leave Benefits for Women:
                    <WbInputText
                      label="(Specify Illness)"
                      v-model="payload.others_notes"
                      placeholder=" Please Specify:"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                    />
                  </p>
                </div>
              </template>
            </Card>
          </div>
          <div
            v-for="(inclusiveDate, index) in payload.dates"
            :key="index"
            :class="[
              'max-w-screen- my-0 grid grid-cols-1 gap-2 px-4 py-0 sm:grid-cols-3 md:gap-4 md:px-0 lg:mx-24',
              { 'mb-0': index < payload.dates.length - 1 }, // Add border only between rows
            ]"
          >
            <div
              :class="[
                'mx-4 flex flex-row items-center justify-center gap-2',
                { 'mt-0': index === 0, 'mt-1': index > 0 }, // Adjust top margin based on row
              ]"
            >
              <WbCalendar
                :label="index === 0 ? 'Inclusive Dates From' : ''"
                v-model="inclusiveDate.start_date"
                :required="index === 0"
                :disabled="isHumanResourceActive || payload.status === 'approved'"
                placeholder="DD / MM / YYYY"
                label-class="text-md text-surface-600 dark:lg:text-surface-200"
                class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
              />
            </div>
            <div
              :class="[
                'mx-4 flex flex-row items-center justify-center gap-2',
                { 'mt-0': index === 0, 'mt-1': index > 0 }, // Keep mt-2 for consistency, adjust if needed
              ]"
            >
              <WbCalendar
                :label="index === 0 ? 'Inclusive Dates To' : ''"
                v-model="inclusiveDate.end_date"
                :required="index === 0"
                :disabled="isHumanResourceActive || payload.status === 'approved'"
                placeholder="DD / MM / YYYY"
                label-class="text-md text-surface-600 dark:lg:text-surface-200"
                class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
              />
              <div
                :class="[
                  'flex justify-center',
                  { 'mt-2': index === 0, 'mt-1': index > 0 }, // Keep mt-2 for consistency, adjust if needed
                ]"
              >
                <Button
                  icon="pi pi-trash"
                  severity="danger"
                  rounded
                  @click="removeInclusiveDates(index)"
                  v-if="!['approved'].includes(payload.status) && payload.dates.length > 1 && !isHumanResourceActive"
                  class="mt-2"
                />
              </div>
            </div>
            <div
              v-if="index === 0"
              :class="[
                'mx-6 flex flex-row items-center justify-center gap-4',
                { 'mt-2': index === 0, 'mt-0': index > 0 }, // Adjust top margin if needed, but only for first row now
              ]"
            >
              <WbDropdown
                v-tooltip.top="'Choose Commutation'"
                :options="modeofReceiptOptions"
                v-model="payload.commutation"
                optionLabel="label"
                optionValue="value"
                class="mb-4 w-full"
                label="Commutation"
                label-class="text-md text-surface-600 dark:lg:text-surface-200"
                placeholder="Choose Commutation"
                :disabled="isHumanResourceActive || payload.status === 'approved'"
              />
            </div>
          </div>
          <div class="mx-10 flex w-full gap-4 sm:mx-8 md:mx-4 md:py-4 lg:mx-28">
            <Button
              label="+ Add Additional Dates"
              v-if="!['approved'].includes(payload.status) && !isHumanResourceActive"
              @click="addInclusiveDates"
              class="dark:text-secondary-100 border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
              text
            />
          </div>
          <div class="mb-4 mt-6 justify-center gap-2 border-b-2 bg-surface-100 px-2 py-2 md:gap-4 md:px-0">
            <div class="text-center font-semibold text-surface-500">DETAILS OF ACTION ON APPLICATION</div>
          </div>
          <div class="max-w-screen- my-0 grid grid-cols-1 gap-2 px-4 py-2 sm:grid-cols-2 md:gap-4 md:px-0 lg:mx-24">
            <div class="w-full rounded-lg border border-surface-300 text-sm">
              <div class="grid grid-cols-3">
                <div
                  class="col-span-1 w-full border-b border-l border-surface-300 bg-surface-100 py-2 text-center opacity-70"
                ></div>
                <div class="col-span-2 grid grid-cols-2">
                  <div class="w-full border-b border-l border-surface-300 bg-surface-100 py-2 text-center opacity-70">
                    <p class="font-bold">VACATION LEAVE</p>
                  </div>
                  <div class="w-full border-b border-l border-surface-300 bg-surface-100 py-2 text-center opacity-70">
                    <p class="font-bold">SICK LEAVE</p>
                  </div>
                </div>
              </div>
              <div class="grid grid-cols-3">
                <div class="col-span-1 flex items-center border-b border-surface-300 p-2">
                  <p class="font-semibold uppercase text-surface-600">Total Earned</p>
                </div>
                <div class="col-span-2 grid grid-cols-2">
                  <div class="w-full border-b border-l border-surface-300 p-2 text-center">
                    <p class="font-semibold uppercase text-surface-600">17.108</p>
                  </div>
                  <div class="w-full border-b border-l border-surface-300 p-2 text-center">
                    <p class="font-semibold uppercase text-surface-600">111.708</p>
                  </div>
                </div>
              </div>
              <div class="grid grid-cols-3">
                <div class="col-span-1 flex items-center border-b border-surface-300 p-2">
                  <p class="font-semibold uppercase text-surface-600">Less this Application</p>
                </div>
                <div class="col-span-2 grid grid-cols-2">
                  <div class="w-full border-b border-l border-surface-300 p-2 text-center">
                    <p class="font-semibold uppercase text-surface-600"></p>
                  </div>
                  <div class="w-full border-b border-l border-surface-300 p-2 text-center">
                    <p class="font-semibold uppercase text-surface-600"></p>
                  </div>
                </div>
              </div>
              <div class="grid grid-cols-3">
                <div class="col-span-1 flex items-center p-2">
                  <p class="font-semibold uppercase text-surface-600">Balance</p>
                </div>
                <div class="col-span-2 grid grid-cols-2">
                  <div class="w-full border-l border-surface-300 p-2 text-center">
                    <p class="font-semibold uppercase text-surface-600">17.108</p>
                  </div>
                  <div class="w-full border-l border-surface-300 p-2 text-center">
                    <p class="font-semibold uppercase text-surface-600">111.708</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="grid sm:grid-cols-2">
              <WbDropdown
                v-tooltip.top="'Choose Recommendation'"
                :options="recommendationOptions"
                optionLabel="label"
                optionValue="value"
                class="mb-4 w-full"
                label="Recommendation"
                label-class="text-md text-surface-600 dark:lg:text-surface-200"
                placeholder="Choose Recommendation"
                :disabled="isHumanResourceActive || payload.status === 'approved'"
              />
              <WbDropdown
                v-tooltip.top="'Choose Approved For'"
                :options="approvedForOptions"
                optionLabel="label"
                optionValue="value"
                class="ml-6 w-full"
                label="Approved For"
                label-class="text-md ml-6 text-surface-600 dark:lg:text-surface-200"
                placeholder="Choose Approved For"
                :disabled="isHumanResourceActive || payload.status === 'approved'"
              />
            </div>
          </div>
          <Divider layout="horizontal" class="mb-12 ml-2 hidden md:block"></Divider>
          <!-- Other content -->
          <div class="mt-2 flex justify-end gap-2">
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
              @click="openDialog('for review')"
              v-if="isUpdateMode && !isHumanResourceActive"
              label="Update File Leave"
              :disabled="payload && payload.status === 'approved'"
              :loading="formIsSubmitting"
              class="dark:text-secondary-100 border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
              text
            >
              <template #icon>
                <i class="pi pi-file mr-2"></i>
              </template>
            </Button>
            <Button
              @click="openDialog('approved')"
              v-if="isHumanResourceActive"
              label="Approved Leave"
              :disabled="payload && payload.status === 'approved'"
              :loading="formIsSubmitting"
              class="dark:text-secondary-100 border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
              text
            >
              <template #icon>
                <i class="pi pi-file mr-2"></i>
              </template>
            </Button>
            <Button
              @click="openDialog('draft')"
              v-if="!isUpdateMode"
              label="Save as Draft"
              :loading="formIsSubmitting"
              :disabled="formIsSubmitting"
              class="dark:text-secondary-100 border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
              text
            >
              <template #icon>
                <i class="pi pi-save mr-2"></i>
              </template>
            </Button>
            <Button
              @click="openDialog('for review')"
              v-if="!isUpdateMode"
              label="File Leave"
              :loading="formIsSubmitting"
              :disabled="formIsSubmitting"
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
              <div class="flex items-center sm:px-0 md:px-0">
                <h1 class="font-base text-2xl text-surface-900 sm:text-base md:text-base">{{ dialogTitle }}</h1>
              </div>
            </template>
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
