<script setup lang="ts">
import { ref, reactive } from 'vue'
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import Card from 'primevue/card'
import useVuelidate from '@vuelidate/core'
import { helpers, maxLength, required } from '@vuelidate/validators'
import WbInputText from '@/components/webkit/WbInputText.vue'
import WbCalendar from '@/components/webkit/WbCalendar.vue'
import WbDropdown from '@/components/webkit/WbDropdown.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { DateToday } from '@/utils/helpers.ts'
import { useToast } from 'primevue/usetoast'
import { parseApiResponseError } from '@/utils/error-handle.ts'
import { LeaveApplicationPayload, useLeaveApplicationStore } from '@/stores/leave-application.store'

/** Payload for the Request Document */
const payload = reactive<LeaveApplicationPayload>({
  date_of_filing: DateToday,
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
  leave_type_id: '',
  dates: [
    {
      start_date: '',
      end_date: '',
    },
  ],
})

/** Array to store the accomplishment entries */
const inclusiveDates = ref([
  {
    start_date: payload.dates[0].start_date,
    end_date: payload.dates[0].end_date,
  },
])
const addInclusiveDates = (newFields = {}) => {
  const defaultInclusiveDates = {
    start_date: '',
    end_date: '',
  }

  const newInclusiveDates = { ...defaultInclusiveDates, ...newFields }
  inclusiveDates.value.push(newInclusiveDates)
  validator.value.inclusiveDates.$touch()
}

/** Function to remove an accomplishment entry */
const removeInclusiveDates = (index: number) => {
  if (index >= 0 && index < inclusiveDates.value.length) {
    inclusiveDates.value.splice(index, 1)
  }
}
/** Options for selecting the week number */
const modeofReceiptOptions = ref([
  { label: 'Not Requested', value: 'Not Requested' },
  { label: 'Requested', value: 'Requested' },
])
const selectedtypeofLeaveId = ref<number | null>(null)

const typeofLeave = [
  {
    id: 1,
    label: 'MANDATORY/FORCED LEAVE',
    description: '(Sec. 25, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
  },
  {
    id: 2,
    label: 'MANDATORY/FORCED LEAVE', // Duplicate entry from image
    description: '(Sec. 25, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
  },
  {
    id: 3,
    label: 'SICK LEAVE',
    description: '(Sec. 43, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
  },
  {
    id: 4,
    label: 'MATERNITY LEAVE',
    description: '(R.A. No. 11210 / IRR issued by CSC, DOLE and SSS)',
  },
  {
    id: 5,
    label: 'PATERNITY LEAVE',
    description: '(R.A. No. 8187 / CSC MC No 71, s. 1998, as amended)',
  },
  {
    id: 6,
    label: 'SPECIAL PRIVILEGE LEAVE',
    description: '(Sec. 21, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
  },
  {
    id: 7,
    label: 'SOLO PARENT LEAVE',
    description: '(Sec. 21, Rule XVI, Omnibus Rules Implementing E.O. No. 292)', // Different description than the other SOLO PARENT LEAVE
  },
  {
    id: 8,
    label: 'PATERNITY LEAVE', // Duplicate entry from image
    description: '(R.A. No. 8187 / CSC MC No 71, s. 1998, as amended)',
  },
  {
    id: 9,
    label: 'SPECIAL PRIVILEGE LEAVE', // Duplicate entry from image
    description: '(Sec. 21, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
  },
  {
    id: 10,
    label: 'SOLO PARENT LEAVE',
    description: '(RA No. 8972 / CSC MC No. 8, s. 2004)',
  },
  {
    id: 11,
    label: 'STUDY LEAVE',
    description: '(Sec. 68, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
  },
  {
    id: 12,
    label: '10 DAY VAWC LEAVE',
    description: '(RA No. 9262 / CSC MC No. 15, s. 2005)',
  },
  {
    id: 13,
    label: 'REHABILITATION PRIVILEGE',
    description: '(Sec. 55, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
  },
  {
    id: 14,
    label: 'SPECIAL LEAVE BENEFITS FOR WOMEN',
    description: '(RA No. 9710 / CSC MC No 25, s. 2010)',
  },
  {
    id: 15,
    label: 'SPECIAL EMERGENCY (Calamity) LEAVE',
    description: '(CSC MC No. 2, s. 2012, as amended)',
  },
  {
    id: 16,
    label: 'ADOPTION LEAVE',
    description: '(R.A. No. 8552)',
  },
  {
    id: 17,
    label: 'OTHERS',
    description: '', // As seen in the image, 'OTHERS' doesn't have a description text, just the 'M' icon.
  },
]

const isLeaveSelected = (id: number): boolean => {
  return selectedtypeofLeaveId.value === id
}

const selectLeave = (id: number): void => {
  if (selectedtypeofLeaveId.value === id) {
    selectedtypeofLeaveId.value = null
    payload.leave_type_id = ''
  } else {
    selectedtypeofLeaveId.value = id
    const selectedItem = typeofLeave.find((item) => item.id === id)

    if (selectedItem) {
      payload.leave_type_id = selectedItem.id
      console.log('Action: Selected specific type:', payload)
    } else {
      payload.leave_type_id = ''
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
  number_of_days: {
    type_request: helpers.withMessage('Number of Days is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
  },
  ates: {
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
const errorMessage = ref<string | null>(null)
const errorDetails = ref<string[]>([])
const toast = useToast()
const leaveApplicationStore = useLeaveApplicationStore()

/** Emits */
const emit = defineEmits<{
  (e: 'leave-created', value: boolean): void
}>()
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
              <font-awesome-icon :icon="['fas', 'check-double']" /> New Application for Leave
            </h2>
          </div>
          <br />
          <div class="mb-8 mt-12 flex flex-col md:flex-row md:items-center md:justify-between">
            <div class="mb-4 ml-0 flex w-full flex-col items-start justify-center gap-2 py-2 md:mb-0 md:ml-6 md:w-2/6">
              <div class="flex w-full flex-col">
                <WbInputText
                  label="Number of Days"
                  v-model="payload.number_of_days"
                  required
                  placeholder="e.g. 2"
                  label-class="text-md text-surface-600 dark:lg:text-surface-200"
                  class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                  validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                />
              </div>
            </div>

            <div class="mb-6 mr-4 flex w-full justify-end md:mb-0 md:w-auto">
              <h1 class="text-lg font-semibold text-surface-600 dark:text-primary-100">Date of Request: {{ DateToday }}</h1>
            </div>
          </div>
          <div class="justify-center gap-2 border-b-2 bg-surface-100 px-2 py-2 md:gap-4 md:px-0">
            <div class="text-center font-semibold text-surface-500">TYPE OF LEAVE TO BE AVAILED</div>
          </div>
          <div class="max-w-screen- my-0 grid grid-cols-1 gap-2 px-4 py-2 sm:grid-cols-2 md:gap-4 md:px-0 lg:mx-24">
            <Card
              v-for="item in typeofLeave"
              :key="item.id"
              class="h-22 mx-auto my-0 w-full cursor-pointer rounded-md transition-colors"
              :class="!isLeaveSelected(item.id) ? '!bg-surface-0 !text-surface-900' : '!bg-primary-400 !text-surface-0'"
              @click="selectLeave(item.id)"
            >
              <template #content>
                <div class="relative h-full w-full">
                  <p
                    class="absolute left-1/2 top-1/2 m-0 w-[70%] -translate-x-1/2 -translate-y-1/2 overflow-hidden text-sm sm:text-base md:w-[80%] lg:text-lg"
                  >
                    {{ item.label }}
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
            <div v-if="selectedtypeofLeaveId === 17" class="px-2 md:px-0">
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
              v-if="selectedtypeofLeaveId === 14"
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
            v-for="(inclusiveDate, index) in inclusiveDates"
            :key="index"
            :class="[
              'max-w-screen- my-0 grid grid-cols-1 gap-2 px-4 py-0 sm:grid-cols-3 md:gap-4 md:px-0 lg:mx-24',
              { 'mb-0': index < inclusiveDates.length - 1 }, // Add border only between rows
            ]"
          >
            <div
              :class="[
                'mx-4 flex flex-row items-center justify-center gap-2',
                { 'mt-10': index === 0, 'mt-1': index > 0 }, // Adjust top margin based on row
              ]"
            >
              <WbCalendar
                :label="index === 0 ? 'Inclusive Dates From' : ''"
                v-model="inclusiveDate.start_date"
                :required="index === 0"
                placeholder="DD / MM / YYYY"
                label-class="text-md text-surface-600 dark:lg:text-surface-200"
                class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
              />
            </div>
            <div
              :class="[
                'mx-4 flex flex-row items-center justify-center gap-2',
                { 'mt-10': index === 0, 'mt-1': index > 0 }, // Keep mt-2 for consistency, adjust if needed
              ]"
            >
              <WbCalendar
                :label="index === 0 ? 'Inclusive Dates To' : ''"
                v-model="inclusiveDate.end_date"
                :required="index === 0"
                placeholder="DD / MM / YYYY"
                label-class="text-md text-surface-600 dark:lg:text-surface-200"
                class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
              />
              <div
                :class="[
                  'mx-0 flex flex-row items-center justify-center gap-2',
                  { 'mt-10': index === 0, 'mt-1': index > 0 }, // Keep mt-2 for consistency, adjust if needed
                ]"
              >
                <Button
                  icon="pi pi-trash"
                  severity="danger"
                  rounded
                  @click="removeInclusiveDates(index)"
                  v-if="inclusiveDates.length > 1"
                  class="mt-2"
                />
              </div>
            </div>
            <div
              v-if="index === 0"
              :class="[
                'mx-6 flex flex-row items-center justify-center gap-4',
                { 'mt-12': index === 0, 'mt-0': index > 0 }, // Adjust top margin if needed, but only for first row now
              ]"
            >
              <WbDropdown
                v-tooltip.top="'Choose Commutation'"
                :options="modeofReceiptOptions"
                optionLabel="label"
                optionValue="value"
                class="mb-4 w-full"
                label="Commutation"
                label-class="text-md text-surface-600 dark:lg:text-surface-200"
                placeholder="Choose Commutation"
              />
            </div>
          </div>
          <div class="mx-10 flex w-full gap-4 sm:mx-8 md:mx-4 md:py-4 lg:mx-28">
            <Button
              label="+ Add Additional Dates"
              @click="addInclusiveDates"
              class="dark:text-secondary-100 border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
              text
            />
          </div>
          <div class="mb-4 mt-6 justify-center gap-2 border-b-2 bg-surface-100 px-2 py-2 md:gap-4 md:px-0">
            <div class="text-center font-semibold text-surface-500">DETAILS OF ACTION ON APPLICATION</div>
          </div>
          <div class="mx-auto my-2 flex h-full flex-col">
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
              label="File Leave"
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
