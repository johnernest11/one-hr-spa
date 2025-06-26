<script setup lang="ts">
import { onBeforeMount, ref, watch, computed, reactive, onMounted, toRef } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Chip from 'primevue/chip'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputGroup from 'primevue/inputgroup'
import WbCalendar from '@/components/webkit/WbCalendar.vue'
import WbDropdown from '@/components/webkit/WbDropdown.vue'
import Paginator, { PageState } from 'primevue/paginator'
import { LocatorSlipResponse } from '@/typings/models.types.ts'
import { useLocatorSlipStore, LocatorSlipPayload } from '@/stores/locator-slip.store'
import WbAutoComplete, { WbAutoCompleteOption, WbAutoCompleteOptionTrueValue } from '@/components/webkit/WbAutoComplete.vue'
import { useWbAutoCompleteHandleTrueValue } from '@/composables/wb-ui-components'
import useVuelidate from '@vuelidate/core'
import { ApiResponsePagination } from '@/typings/http-resources.types.ts'
import { parseApiResponseError } from '@/utils/error-handle.ts'
import { helpers, maxLength, required } from '@vuelidate/validators'
import { getMonthAndYear, formatDateRanges, snakeCaseToTitleCase, isAfterOrEqualFromDate } from '@/utils/helpers.ts'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useToast } from 'primevue/usetoast'
import { useRoute } from 'vue-router'
import { useLibrariesStore } from '@/stores/libraries.store'
import { usePrependOrAppendOnce } from '@/utils/helpers'
const route = useRoute()
const locatorSlipsStore = useLocatorSlipStore()
const libraryStore = useLibrariesStore()
const locatorSlipsIsLoading = ref(false)
const isLoading = ref(true)
const paginationLimit = 5
const getId = usePrependOrAppendOnce('generate-payroll')
const selectedDivision = ref<WbAutoCompleteOption[] | null>(null)
const selectedSectionUnit = ref<WbAutoCompleteOption[] | null>(null)
const selectedFundingSources = ref<WbAutoCompleteOption[] | null>(null)
const employementStatusOptions = [
  { label: 'Permanent', value: 'Permanent' },
  { label: 'Contractual', value: 'Contractual' },
  { label: 'Contract of Service', value: 'Contract of Service' },
  { label: 'Job Order', value: 'Job Order' },
]

onBeforeMount(async () => {
  locatorSlipsIsLoading.value = true
  const response = await locatorSlipsStore.fetchLocatorSlip(paginationLimit)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  locatorSlipsIsLoading.value = false
})

const pagination = ref<ApiResponsePagination | null>(null)
const handlePaginationPageChange = async (event: PageState) => {
  const pageSelected = event.page + 1
  locatorSlipsIsLoading.value = true
  const response = await locatorSlipsStore.fetchLocatorSlip(paginationLimit, pageSelected)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  locatorSlipsIsLoading.value = false
}

const roleFilter = ref<number | null>(null)
const searchQuery = ref<string | null>(null)
const isSearching = ref(false)
watch(
  () => roleFilter.value,
  async () => {
    locatorSlipsIsLoading.value = true
    searchQuery.value = null
    isSearching.value = false
    const response = await locatorSlipsStore.fetchLocatorSlip(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    locatorSlipsIsLoading.value = false
  }
)
const searchSubmitted = ref(false)
const handleSearchLocatorSlip = async () => {
  locatorSlipsIsLoading.value = true
  searchSubmitted.value = true

  if (!searchQuery.value) {
    const response = await locatorSlipsStore.fetchLocatorSlip(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    locatorSlipsIsLoading.value = false
    return
  }

  const response = await locatorSlipsStore.searchLocatorSlip(searchQuery.value)
  if (response.success && response.pagination) {
    pagination.value = response.pagination

    searchQuery.value = null
  }
  locatorSlipsIsLoading.value = false
}

const toast = useToast()
const RequestLocatorSlip = ref(false)
const exportPdf = async (locatorSlips: LocatorSlipResponse) => {
  const { period_covered_from, period_covered_to, id } = locatorSlips

  toast.add({
    severity: 'info',
    summary: 'Exporting Locator Slip...',
    detail: `Exporting locator slip for the period ${period_covered_from} to ${period_covered_to}.`,
    life: 5000,
  })

  try {
    const reportResponse = await locatorSlipsStore.generateLocatorSlip(String(id))

    const blob = reportResponse.data.value
    const fileName = reportResponse.fileNameHeader?.value || `locator-slip-${id}.pdf`

    if (blob) {
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.add({
        severity: 'success',
        summary: 'Export Successful',
        detail: `Locator Slip for ${period_covered_from} to ${period_covered_to} was exported successfully.`,
        life: 5000,
      })
    } else {
      throw new Error('Failed to generate file.')
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Export Failed',
      detail: 'There was an issue exporting the locator slip. Please try again.',
      life: 5000,
    })
    console.error(error)
  }
}

const payload = reactive<LocatorSlipPayload>({
  period_covered_from: '',
  period_covered_to: '',
  period_request: '',
  locator_slip_no: '',
  status: '',
})

const openLocatorSlipDialog = (slip: LocatorSlipResponse | null = null) => {
  if (!slip || !slip.id) {
    console.error('Cannot navigate to details: accomplishmentRepor or ID is undefined', slip)
    return
  }
  if (slip) {
    updatePayloadFromReport(slip)
  }
  RequestLocatorSlip.value = true
}

const openNewLocatorSlipForm = () => {
  resetPayload()
  RequestLocatorSlip.value = true
}

const resetPayload = () => {
  payload.period_covered_from = ''
  payload.period_covered_to = ''
  payload.period_request = ''
  payload.locator_slip_no = ''
  payload.status = ''
}

type LocatorSlipDetailsFormProps = {
  locatorSlip?: LocatorSlipResponse
}
const props = defineProps<LocatorSlipDetailsFormProps>()
onMounted(async () => {
  const id = route.params.id as string
  if (id) {
    const response = await locatorSlipsStore.fetchLocatorSlipById(id)
    if (response && response.success) {
      updatePayloadFromReport(response.data as LocatorSlipResponse)
    }
  }
  isLoading.value = false
})

const updatePayloadFromReport = (locatorSlip: LocatorSlipResponse | null) => {
  payload.period_covered_from = locatorSlip?.period_covered_from ?? null
  payload.period_covered_to = locatorSlip?.period_covered_to ?? ''
  payload.period_request = locatorSlip?.period_request ?? ''
  payload.locator_slip_no = locatorSlip?.locator_slip_no ?? ''
  payload.status = locatorSlip?.status ?? ''
}

watch(
  () => props.locatorSlip,
  (newValue) => {
    if (newValue) {
      updatePayloadFromReport(newValue)
    } else {
      payload.period_covered_from = ''
      payload.period_covered_to = ''
      payload.period_request = ''
      payload.locator_slip_no = ''
      payload.status = ''
    }
  },
  { immediate: true }
)
const requestOptions = ref([
  { label: '1st request for this period', value: '1st request for this period' },
  { label: '2nd request for this period', value: '2nd request for this period' },
])

const statusOptions = ref([
  { label: 'In Progress', value: 'in progress' },
  { label: 'Released', value: 'released' },
])

/** Validation */
const globalStringMaxLength = import.meta.env.VITE_GLOBAL_STRING_MAX_LENGTH
const globalStringMaxLengthRule = helpers.withMessage(
  `Must not exceed ${globalStringMaxLength} characters`,
  maxLength(globalStringMaxLength)
)
const formRules = () => ({
  $lazy: true,
  period_covered_from: {
    type_request: helpers.withMessage('Period Covered From is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
  },
  period_covered_to: {
    required: helpers.withMessage('Period Covered To is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
    isAfterOrEqualFromDate: isAfterOrEqualFromDate(() => payload.period_covered_from ?? ''),
  },
  period_request: {
    required: helpers.withMessage('Period Request is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
  },
})

/** Handle Form Submission */
const validator = useVuelidate<Partial<LocatorSlipPayload>>(formRules, payload)
const formIsSubmitting = ref(false)
const showErrorAlert = ref(false)
const errorMessage = ref<string | null>(null)
const errorDetails = ref<string[]>([])

// Add showModal for Dialog visibility
const showModal = ref(false)

/** Emits */
const emit = defineEmits<{
  (e: 'locator-created', value: boolean): void
}>()
/** Confirm the action based on the dialog type */
const handleSaveSubmissionif = async () => {
  const valid = await validator.value.$validate()
  if (!valid) {
    document.querySelector('.create-locator-creds-section')?.scrollIntoView({ behavior: 'smooth' })
    toast.add({
      severity: 'error',
      summary: 'Create a Locator Slip Request',
      detail: 'Please see the validation messages',
      life: 5000,
    })
    return
  }

  formIsSubmitting.value = true

  try {
    const periodData = {
      period_covered_from: payload.period_covered_from,
      period_covered_to: payload.period_covered_to,
      period_request: payload.period_request,
    }

    const periodResponse = await locatorSlipsStore.createLocatorSlip(periodData)

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
      document.querySelector('.create-locator-creds-section')?.scrollIntoView({ behavior: 'smooth' })
      return // Ensure you return after handling the error
    }

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Locator Slip Request submitted successfully',
      life: 5000,
    })
    emit('locator-created', true)

    setTimeout(() => {
      window.location.reload() // Consider alternative approaches if full reload isn't necessary
    }, 1000)
  } finally {
    formIsSubmitting.value = false // Ensure formIsSubmitting is always set to false
  }
}

const isHumanResourceActive = computed(() => route.name === 'locator-slips')
</script>
<template>
  <div class="flex h-full w-full flex-col shadow-md">
    <div class="h-full w-full rounded-md bg-surface-0 p-6">
      <div
        class="flex flex-row items-center space-x-4 font-medium text-primary-700 dark:text-primary-100 md:ml-4 md:mt-2 md:flex-row"
      >
        <h1 class="mb-2 mr-4 whitespace-nowrap text-xl text-surface-600 dark:text-primary-100 md:text-xl lg:text-4xl">
          {{ !isHumanResourceActive ? '  My Locator Slip ' : 'Locator Slip' }}
        </h1>

        <div class="flex w-full items-center justify-end gap-4">
          <div class="gap-4 whitespace-nowrap md:w-auto">
            <Button
              icon="pi pi-filter-fill"
              v-tooltip.top="'Filter'"
              severity="info"
              size="large"
              class="mr-2 border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100"
              text
              aria-label="Filter"
              @click="showModal = true"
            />

            <Button
              v-if="!isHumanResourceActive"
              icon="pi pi-plus"
              v-tooltip.top="'Request Locator Slip'"
              severity="info"
              size="large"
              class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100 sm:text-primary-400 md:text-primary-400 lg:text-primary-400 dark:lg:text-primary-400"
              text
              @click="openNewLocatorSlipForm"
            />
            <Dialog v-model:visible="RequestLocatorSlip" modal header="Request Locator Slip" :style="{ width: '90vw' }">
              <template #header>
                <div class="flex items-center space-x-3 pt-4 sm:px-6 md:px-8">
                  <font-awesome-icon :icon="['fas', 'location-dot']" class="h-6 text-surface-600 sm:h-7 md:h-8" />
                  <h1 class="font-base text-2xl text-surface-600 sm:text-xl md:text-2xl">Request Locator Slip</h1>
                </div>
              </template>
              <hr />

              <div class="px-4 py-4 sm:px-6 sm:py-6 md:px-12">
                <div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <WbCalendar
                      v-model="payload.period_covered_from"
                      :invalid="validator.period_covered_from.$invalid"
                      :invalid-text="validator.period_covered_from.$errors[0]?.$message"
                      @blur="validator.period_covered_from.$touch"
                      @focusin="validator.period_covered_from.$dirty = false"
                      label="Period Covered From"
                      required
                      placeholder="DD / MM / YYYY"
                      :disabled="isHumanResourceActive"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                    />
                  </div>

                  <div>
                    <WbCalendar
                      v-model="payload.period_covered_to"
                      :invalid="validator.period_covered_to.$invalid"
                      :invalid-text="validator.period_covered_to.$errors[0]?.$message"
                      @blur="validator.period_covered_to.$touch"
                      @focusin="validator.period_covered_to.$dirty = false"
                      label="Period Covered to"
                      required
                      placeholder="DD / MM / YYYY"
                      :disabled="isHumanResourceActive"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                    />
                  </div>
                </div>

                <div class="mb-2">
                  <WbDropdown
                    v-model="payload.period_request"
                    label="Number of Request Made within the Period Covered "
                    required
                    :invalid="validator.period_request.$invalid"
                    :invalid-text="validator.period_request.$errors[0]?.$message"
                    @blur="validator.period_request.$touch"
                    @focusin="validator.period_request.$dirty = false"
                    :options="requestOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="mb-4 w-full"
                    placeholder="Choose Period Covered"
                    :disabled="isHumanResourceActive"
                  />
                </div>

                <div class="mb-6">
                  <WbDropdown
                    v-if="isHumanResourceActive"
                    v-model="payload.status"
                    label="Status "
                    :options="statusOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="mb-4 w-full"
                    placeholder="Choose Status"
                  />
                </div>

                <div class="flex justify-end">
                  <Button
                    @click="handleSaveSubmissionif"
                    :loading="formIsSubmitting"
                    :disabled="formIsSubmitting"
                    label="Submit"
                    class="dark:text-secondary-100 border border-primary-500 text-xs text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-600"
                    text
                  >
                    <template #icon>
                      <font-awesome-icon :icon="['fas', 'save']" class="mr-2" />
                    </template>
                  </Button>
                </div>
              </div>
            </Dialog>
          </div>
          <div class="flex w-full md:w-auto lg:w-1/2">
            <InputGroup v-model="searchQuery" class="w-full">
              <InputText
                v-model="searchQuery"
                placeholder="Search via Period or Date"
                class="w-full"
                :disabled="locatorSlipsIsLoading"
                @keyup.enter="handleSearchLocatorSlip"
              />
              <Button icon="pi pi-search" @click="handleSearchLocatorSlip" />
            </InputGroup>
          </div>
        </div>
      </div>

      <div class="mt-6 flex flex-col">
        <div class="w-full">
          <div class="mx-auto flex h-full w-full flex-col">
            <DataTable :value="locatorSlipsStore.locatorSlip" class="mt-6" dataKey="id">
              <Column
                field="period"
                header="Period Request"
                headerClass="w-1/2 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="font-semibold uppercase text-surface-600">
                    {{ getMonthAndYear(props.data.period_covered_from) }}
                  </p>

                  <p v-if="isHumanResourceActive" class="uppercase text-surface-600">
                    {{ snakeCaseToTitleCase(props.data.employee_id.first_name) }}
                    {{ snakeCaseToTitleCase(props.data.employee_id.middle_name ?? '') }}
                    {{ snakeCaseToTitleCase(props.data.employee_id.last_name) }}
                  </p>

                  <p v-if="props.data.status?.toLowerCase() === 'released'" class="font-semibold uppercase text-success-600">
                    LS No: {{ props.data.locator_slip_no }}
                  </p>
                </template>
              </Column>
              <Column
                field="edited_at"
                header="Period Covered"
                headerClass=" w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="uppercase text-surface-600">
                    {{
                      formatDateRanges([{ start_date: props.data.period_covered_from, end_date: props.data.period_covered_to }])
                    }}
                  </p>
                </template>
              </Column>
              <Column
                field="status"
                header="Status"
                headerClass="w-64 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <template v-if="props.data.status === 'pending'">
                    <Chip
                      label="Pending"
                      class="flex items-center justify-center !bg-warn-500 px-4 py-1 font-semibold !text-surface-0"
                    >
                    </Chip>
                  </template>
                  <template v-else-if="props.data.status === 'in progress'">
                    <Chip
                      label="In Progress"
                      class="flex items-center justify-center !bg-success-800 px-4 py-1 font-semibold !text-surface-0"
                    />
                  </template>
                  <template v-else-if="props.data.status === 'released'">
                    <Chip
                      label="Released"
                      class="flex items-center justify-center !bg-info-800 px-4 py-1 font-semibold !text-surface-0"
                    />
                  </template>
                </template>
              </Column>
              <Column field="action" header="Action" headerClass="w-64 bg-surface-100 opacity-70 font-bold py-2">
                <template #body="props">
                  <div class="flex gap-4 whitespace-nowrap md:w-auto">
                    <Button
                      icon="pi pi-eye"
                      v-tooltip.top="'Update Status'"
                      severity="info"
                      size="large"
                      class="border-none text-lg font-semibold text-primary-600 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
                      text
                      :disabled="props.data.status === 'released'"
                      @click="openLocatorSlipDialog(props.data)"
                    />
                    <Button
                      v-if="props.data.status?.toLowerCase() === 'released'"
                      icon="pi pi-download"
                      v-tooltip.top="'Download Locator Slip'"
                      severity="info"
                      class="border-none text-lg font-semibold text-primary-600 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
                      text
                      @click="exportPdf(props.data)"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
          </div>
          <div class="mt-6 flex w-full justify-center md:mt-10">
            <Paginator
              v-if="pagination && pagination.total > 0"
              :rows="pagination.per_page"
              :total-records="pagination.total"
              template="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
              currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
              @page="(event: PageState) => handlePaginationPageChange(event)"
              class="text-s md:text-sm"
              :pt="{ pageButton: {} }"
            />
          </div>
        </div>
        <div
          v-if="searchSubmitted && !locatorSlipsIsLoading && !locatorSlipsStore.locatorSlip.length"
          class="flex h-full w-full flex-col items-center justify-center font-menu text-lg dark:text-surface-300"
        >
          <i class="pi pi-exclamation-triangle mb-2 text-2xl"></i>
          <p>No Locator Slips found</p>
        </div>
        <div
          v-if="!locatorSlipsIsLoading && !locatorSlipsStore.locatorSlip.length && !searchSubmitted"
          class="mx-auto flex h-full w-full flex-col"
        >
          <Card class="w-full p-0 shadow-none">
            <template #content>
              <div class="flex flex-col items-center">
                <div
                  class="my-6 flex w-full flex-col items-center justify-between gap-4 rounded-lg bg-surface-0 px-6 py-6 dark:bg-surface-800 md:my-4 md:flex-row md:px-4 md:py-4"
                ></div>
                <div class="flex justify-center">
                  <img src="@/assets/image/undraw_payments.svg" class="w-96 pt-44" />
                </div>
                <h2
                  class="mb-2 mt-4 flex w-full justify-center text-center text-xl font-semibold text-surface-800 dark:text-primary-100 sm:text-2xl"
                >
                  No Locator Slip available
                </h2>
                <h1 class="mb-4 text-center text-base text-surface-600 dark:text-surface-400 sm:text-lg">
                  Locator Slip shall appear here.
                </h1>
                <div class="mt-4 flex w-full justify-center">
                  <RouterLink :to="{ name: 'my-locator-slips' }">
                    <Button
                      icon="pi pi-file-excel"
                      label="Request Locator Slip"
                      severity="info"
                      size="large"
                      class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100 sm:text-primary-400 md:text-primary-400 lg:text-primary-400 dark:lg:text-primary-400"
                      text
                    />
                  </RouterLink>
                </div>
              </div>
            </template>
          </Card>
        </div>
      </div>
    </div>
  </div>
  <!--Filter & Field Options Dialog -->
  <Dialog
    v-model:visible="showModal"
    :modal="false"
    closable
    :dismissableMask="true"
    :position="'right'"
    :style="{ width: '20vw', maxWidth: '600px', minWidth: '320px' }"
    :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
    :pt="{
      root: {
        class: 'w-full flex flex-col h-full bg-white shadow-lg p-4',
      },
    }"
  >
    <!-- Custom header slot -->
    <template #header>
      <div class="flex w-full flex-col items-start md:flex-row">
        <h1 class="mb-2 ml-12 text-2xl text-surface-600 dark:text-primary-100 md:ml-4">
          <font-awesome-icon :icon="['fas', 'grip-lines']" class="h-5 text-surface-600 sm:h-6 md:h-7" />
          Filter and Filed Options
          <br />
        </h1>
      </div>
    </template>
    <div class="flex-grow overflow-auto pr-2">
      <h1 class="mb-2 text-xl text-surface-600 dark:text-primary-100">Filters</h1>
      <div class="mb-4">
        <WbAutoComplete
          :useApiFilter="true"
          :apiEndpoint="'/libraries/divisions/search'"
          :suggestions="libraryStore.divisionOptions"
          :loading="libraryStore.divisionOptionsLoading"
          apiOptionLabel="name"
          label="Division"
          placeholder="Type the Division"
          v-model="selectedDivision"
          :id="getId('input-division')"
          optionLabel="label"
          optionValue="value"
          @on-true-value-computed="
            (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
              useWbAutoCompleteHandleTrueValue(value, toRef('division_id'))
          "
          label-class="text-sm text-start text-surface-600 dark:lg:text-surface-200"
          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
        />
      </div>
      <div class="mb-4">
        <WbAutoComplete
          :useApiFilter="true"
          :apiEndpoint="'/libraries/section-or-units/search'"
          :suggestions="libraryStore.sectionUnitOptions"
          :loading="libraryStore.sectionUnitOptionsLoading"
          apiOptionLabel="name"
          label="Section/Unit"
          placeholder="Type the Section / Unit"
          v-model="selectedSectionUnit"
          :id="getId('input-section-unit')"
          optionLabel="label"
          optionValue="value"
          @on-true-value-computed="
            (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
              useWbAutoCompleteHandleTrueValue(value, toRef('section_or_unit_id'))
          "
          label-class="text-sm text-start text-surface-600 dark:lg:text-surface-200"
          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
        />
      </div>
      <div class="mb-4">
        <WbAutoComplete
          :useApiFilter="true"
          :apiEndpoint="'/libraries/fund-sources/search'"
          :suggestions="libraryStore.fundingSourcesOptions"
          :loading="libraryStore.fundingSourcesOptionsLoading"
          apiOptionLabel="name"
          label="Funding"
          placeholder="Type the Funding"
          v-model="selectedFundingSources"
          :id="getId('input-funding-sources')"
          optionLabel="label"
          optionValue="value"
          @on-true-value-computed="
            (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
              useWbAutoCompleteHandleTrueValue(value, toRef('fund_source'))
          "
          label-class="text-sm text-start text-surface-600 dark:lg:text-surface-200"
          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
        />
      </div>
      <div class="mb-4">
        <WbDropdown
          :options="employementStatusOptions"
          optionLabel="label"
          optionValue="value"
          label="Employment Status"
          placeholder="Select Employment Status"
          label-class="text-sm text-start text-surface-600"
        />
      </div>
      <div class="mb-40">
        <WbDropdown
          :options="statusOptions"
          optionLabel="label"
          optionValue="value"
          label="Status"
          placeholder="Select Status"
          label-class="text-sm text-start text-surface-600"
        />
      </div>
    </div>

    <div
      class="mt-48 flex w-full flex-col justify-center gap-2 border-t border-surface-200 pt-4 dark:border-surface-700 sm:flex-row"
    >
      <Button
        label="Cancel"
        class="dark:text-secondary-100 border border-surface-400 px-6 py-2 text-lg text-surface-500 dark:border-surface-700 lg:text-surface-500 dark:lg:text-surface-400"
        @click="showModal = false"
        text
      >
        <template #icon>
          <i class="pi pi-ban mr-2 text-lg"></i>
        </template>
      </Button>
      <Button
        :loading="formIsSubmitting"
        :disabled="formIsSubmitting"
        label="Apply"
        class="dark:text-secondary-100 border border-primary-500 px-6 py-3 text-lg text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-600"
        text
      >
        <template #icon>
          <font-awesome-icon :icon="['fas', 'check']" class="mr-2 text-lg" />
        </template>
      </Button>
    </div>
  </Dialog>
</template>
