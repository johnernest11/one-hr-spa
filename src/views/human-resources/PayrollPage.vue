<script setup lang="ts">
import { ref, reactive, watch, onBeforeMount, toRef } from 'vue'
import useVuelidate from '@vuelidate/core'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputGroup from 'primevue/inputgroup'
import WbCalendar from '@/components/webkit/WbCalendar.vue'
import WbDropdown from '@/components/webkit/WbDropdown.vue'
import WbAutoComplete, { WbAutoCompleteOption, WbAutoCompleteOptionTrueValue } from '@/components/webkit/WbAutoComplete.vue'
import { useWbAutoCompleteHandleTrueValue } from '@/composables/wb-ui-components'
import Paginator, { PageState } from 'primevue/paginator'
import { parseApiResponseError } from '@/utils/error-handle'
import { usePrependOrAppendOnce, formatPayrollPeriod } from '@/utils/helpers'
import { ApiResponsePagination } from '@/typings/http-resources.types.ts'
import { PayrollResponse } from '@/typings/models.types.ts'
import { usePayRollStore, PayRollPayload } from '@/stores/payroll.store'
import { useLibrariesStore } from '@/stores/libraries.store'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { helpers, required } from '@vuelidate/validators'

const router = useRouter()
const navigateToDetails = (payRoll: PayrollResponse) => {
  if (!payRoll || !payRoll.id) {
    console.error('Cannot navigate to details: Pay Roll or ID is undefined', payRoll)
    return
  }
  router.push({
    name: 'employee-payrolls',
    params: {
      id: payRoll.id,
    },
  })
}
const libraryStore = useLibrariesStore()
const payRollStore = usePayRollStore()
const toast = useToast()
const getId = usePrependOrAppendOnce('generate-payroll')
const GeneratePayroll = ref(false)
const formIsSubmitting = ref(false)
const openNewLocatorSlipForm = () => {
  // Renamed for clarity, though not strictly necessary
  GeneratePayroll.value = true
}

/* State */
const payload = reactive<PayRollPayload>({
  ...payRollStore.payrollInfo,
})

const formRules = () => ({
  $lazy: true,
  payroll: {
    period: {
      required: helpers.withMessage('Please choose the period of the payroll', required),
    },
    item_id: {
      required: helpers.withMessage('Please choose the employment status of the payroll', required),
    },
    employee: {
      fund_source: {
        required: helpers.withMessage('Please choose the fund source of the payroll', required),
      },
      division_id: {
        required: helpers.withMessage('Please choose the division of the payroll', required),
      },
      section_or_unit_id: {
        required: helpers.withMessage('Please choose the section/unit of the payroll', required),
      },
    },
  },
})
const selectedDivision = ref<WbAutoCompleteOption[] | null>(null)
const selectedSectionUnit = ref<WbAutoCompleteOption[] | null>(null)
const selectedFundingSources = ref<WbAutoCompleteOption[] | null>(null)
const employementStatusOptions = [
  { label: 'Permanent', value: 'Permanent' },
  { label: 'Contractual', value: 'Contractual' },
  { label: 'Contract of Service', value: 'Contract of Service' },
  { label: 'Job Order', value: 'Job Order' },
]

const payRollsIsLoading = ref(false)
const paginationLimit = 5
onBeforeMount(async () => {
  payRollsIsLoading.value = true
  const response = await payRollStore.fetchPayRoll(paginationLimit)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  payRollsIsLoading.value = false
})

const pagination = ref<ApiResponsePagination | null>(null)
const handlePaginationPageChange = async (event: PageState) => {
  const pageSelected = event.page + 1
  payRollsIsLoading.value = true
  const response = await payRollStore.fetchPayRoll(paginationLimit, pageSelected)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  payRollsIsLoading.value = false
}

const roleFilter = ref<number | null>(null)
const searchQuery = ref<string | null>(null)
const isSearching = ref(false)
watch(
  () => payload.payroll.employee_id.division_id,
  (newSelectedItem) => {
    if (!newSelectedItem) {
      selectedDivision.value = null
      return
    }
  }
)
watch(
  () => payload.payroll.employee_id.section_or_unit_id,
  (newSelectedItem) => {
    if (!newSelectedItem) {
      selectedSectionUnit.value = null
      return
    }
  }
)
watch(
  () => payload.payroll.employee_id.fund_source,
  (newSelectedItem) => {
    if (!newSelectedItem) {
      selectedFundingSources.value = null // Corrected to selectedFundingSources
      return
    }
  }
)
watch(
  () => roleFilter.value,
  async () => {
    payRollsIsLoading.value = true
    searchQuery.value = null
    isSearching.value = false
    const response = await payRollStore.fetchPayRoll(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    payRollsIsLoading.value = false
  }
)
const searchSubmitted = ref(false)
const handleSearchPayRoll = async () => {
  payRollsIsLoading.value = true
  searchSubmitted.value = true

  if (!searchQuery.value) {
    const response = await payRollStore.fetchPayRoll(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    payRollsIsLoading.value = false
    return
  }

  const response = await payRollStore.searchPayRoll(searchQuery.value)
  if (response.success && response.pagination) {
    pagination.value = response.pagination

    searchQuery.value = null
  }
  payRollsIsLoading.value = false
}

const showErrorAlert = ref(false)
const errorMessage = ref<string | null>(null)
const errorDetails = ref<string[]>([])
/* Emit */
const emit = defineEmits<{
  (e: 'payroll-created', value: boolean): void // Changed event name to payroll-created
}>()
const validator = useVuelidate<Partial<PayRollPayload>>(formRules, payload)
const handleSaveSubmissionif = async () => {
  const valid = await validator.value.$validate()
  if (!valid) {
    document.querySelector('.create-generated-payroll-section')?.scrollIntoView({ behavior: 'smooth' })
    toast.add({
      severity: 'error',
      summary: 'Generate a Payroll',
      detail: 'Please see the validation messages',
      life: 5000,
    })
    return
  }

  formIsSubmitting.value = true
  try {
    const periodData = { payroll: { ...payload.payroll } }
    const periodResponse = await payRollStore.createPayRoll(periodData)

    if (!periodResponse.success) {
      const result = parseApiResponseError(periodResponse)
      if (!result) {
        formIsSubmitting.value = false
        return
      }

      showErrorAlert.value = true
      errorMessage.value = result.message
      errorDetails.value = result.errors
      document.querySelector('.create-locator-creds-section')?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Payroll generated successfully', // Updated message
      life: 5000,
    })

    // Assuming this emit and reload is for refreshing the list of payrolls
    emit('payroll-created', true) // Changed event name to payroll-created
    setTimeout(() => window.location.reload(), 1000)
  } finally {
    formIsSubmitting.value = false
  }
}
</script>
<template>
  <div class="flex h-full w-full flex-col shadow-md">
    <div class="h-full w-full rounded-md bg-surface-0 p-6">
      <div
        class="flex flex-row items-center space-x-4 font-medium text-primary-700 dark:text-primary-100 md:ml-4 md:mt-2 md:flex-row"
      >
        <h1 class="mb-2 mr-4 whitespace-nowrap text-xl text-surface-600 dark:text-primary-100 md:text-xl lg:text-4xl">
          Generated Payroll
        </h1>
        <div class="flex w-full items-center justify-end gap-4">
          <div class="gap-4 whitespace-nowrap md:w-auto">
            <Button
              icon="pi pi-filter-fill"
              v-tooltip.top="'Filter'"
              severity="info"
              size="large"
              class="mr-2 border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100 sm:text-primary-400 md:text-primary-400 lg:text-primary-400 dark:lg:text-primary-400"
              text
            />
            <Button
              icon="pi pi-money-bill"
              v-tooltip.top="'Generate Payroll'"
              severity="info"
              size="large"
              class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100 sm:text-primary-400 md:text-primary-400 lg:text-primary-400 dark:lg:text-primary-400"
              text
              @click="openNewLocatorSlipForm"
            />
            <Dialog
              v-model:visible="GeneratePayroll"
              modal
              header="Generate Payroll"
              :style="{ width: '90vw', maxWidth: '1000px' }"
            >
              <template #header>
                <div class="flex items-center space-x-3 pt-4 sm:px-2 md:px-2">
                  <Button
                    icon="pi pi-angle-left"
                    severity="secondary"
                    aria-label="Bookmark"
                    rounded
                    @click="GeneratePayroll = false"
                    size="small"
                    class="mb-2 ml-4 md:mb-0 md:ml-0"
                  />
                  <h1 class="font-base text-2xl text-surface-600 sm:text-xl md:text-2xl">Generate Payroll</h1>
                </div>
              </template>
              <hr />

              <div class="px-4 py-4 sm:px-2 sm:py-6">
                <div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <WbCalendar
                      v-model="payload.payroll.period"
                      label="Payroll Period"
                      selection-mode="range"
                      required
                      placeholder="DD / MM / YYYY - DD / MM / YYYY"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      :invalid="validator.payroll.period.$invalid"
                      :invalid-text="validator.payroll.period.$errors[0]?.$message"
                      @blur="validator.payroll.period.$touch"
                      @focusin="validator.payroll.period.$dirty = false"
                    />
                  </div>

                  <div>
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
                      required
                      @on-true-value-computed="
                        (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                          useWbAutoCompleteHandleTrueValue(value, toRef(payload.payroll.employee_id, 'division_id'))
                      "
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :invalid="validator.payroll.employee.division_id.$invalid"
                      :invalid-text="validator.payroll.employee.division_id.$errors[0]?.$message"
                      @blur="validator.payroll.employee.division_id.$touch"
                      @focusin="validator.payroll.employee.division_id.$dirty = false"
                    />
                  </div>
                </div>
                <div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
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
                      required
                      @on-true-value-computed="
                        (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                          useWbAutoCompleteHandleTrueValue(value, toRef(payload.payroll.employee_id, 'section_or_unit_id'))
                      "
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :invalid="validator.payroll.employee.section_or_unit_id.$invalid"
                      :invalid-text="validator.payroll.employee.section_or_unit_id.$errors[0]?.$message"
                      @blur="validator.payroll.employee.section_or_unit_id.$touch"
                      @focusin="validator.payroll.employee.section_or_unit_id.$dirty = false"
                    >
                    </WbAutoComplete>
                  </div>
                  <div>
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
                      required
                      @on-true-value-computed="
                        (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                          useWbAutoCompleteHandleTrueValue(value, toRef(payload.payroll.employee_id, 'fund_source'))
                      "
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :invalid="validator.payroll.employee.fund_source.$invalid"
                      :invalid-text="validator.payroll.employee.fund_source.$errors[0]?.$message"
                      @blur="validator.payroll.employee.fund_source.$touch"
                      @focusin="validator.payroll.employee.fund_source.$dirty = false"
                    >
                    </WbAutoComplete>
                  </div>
                </div>
                <div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <WbDropdown
                      v-model="payload.payroll.employee_id.item_id"
                      :options="employementStatusOptions"
                      optionLabel="label"
                      optionValue="value"
                      label="Employment Status"
                      label-class="text-sm text-surface-600"
                      :invalid="validator.payroll.item_id.$invalid"
                      :invalid-text="validator.payroll.item_id.$errors[0]?.$message"
                      @blur="validator.payroll.item_id.$touch"
                      @focusin="validator.payroll.item_id.$dirty = false"
                      required
                    >
                    </WbDropdown>
                  </div>
                </div>

                <div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2"></div>
                <div class="mt-2 flex justify-end gap-2">
                  <Button
                    label="Cancel"
                    class="dark:text-secondary-100 border border-surface-400 text-base text-surface-500 dark:border-surface-700 lg:text-surface-500 dark:lg:text-surface-400"
                    text
                    @click="GeneratePayroll = false"
                  >
                    <template #icon>
                      <i class="pi pi-ban mr-2"></i>
                    </template>
                  </Button>
                  <Button
                    @click="handleSaveSubmissionif"
                    :loading="formIsSubmitting"
                    :disabled="formIsSubmitting"
                    label="Generate Payroll"
                    class="dark:text-secondary-100 border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-600"
                    text
                  >
                    <template #icon>
                      <font-awesome-icon :icon="['fas', 'cart-plus']" class="mr-2" />
                    </template>
                  </Button>
                </div>
              </div>
            </Dialog>
          </div>
          <div class="w-full md:w-1/2">
            <InputGroup v-model="searchQuery" class="w-full">
              <InputText
                v-model="searchQuery"
                placeholder="Search via Name or Division/Section"
                class="w-full"
                :disabled="payRollsIsLoading"
                @keyup.enter="handleSearchPayRoll"
              />
              <Button icon="pi pi-search" @click="handleSearchPayRoll" />
            </InputGroup>
          </div>
        </div>
      </div>

      <div class="mt-6 flex flex-col">
        <div class="w-full">
          <div class="mx-auto flex h-full w-full flex-col">
            <DataTable :value="payRollStore.payRoll" class="mt-6" dataKey="id">
              <Column
                field="period"
                header="Payroll Period"
                headerClass="w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="font-base uppercase text-surface-600">{{ formatPayrollPeriod(props.data.period) }}</p>
                </template>
              </Column>
              <Column
                field="edited_at"
                header="Funding"
                headerClass=" w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="font-base uppercase text-surface-600">{{ props.data.employee_id.fund_source.name }}</p>
                </template>
              </Column>
              <Column
                field="edited_at"
                header="Generated by"
                headerClass=" w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="font-base uppercase text-surface-600">{{ props.data.employee_id.position }}</p>
                </template>
              </Column>
              <Column field="action" header="Actions" headerClass="w-64 bg-surface-100 opacity-70 font-bold py-2">
                <template #body="props">
                  <div class="flex gap-4 whitespace-nowrap md:w-auto">
                    <Button
                      icon="pi pi-eye"
                      v-tooltip.top="'View Payroll'"
                      severity="info"
                      class="border-none text-lg font-semibold text-primary-600 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
                      text
                      @click="navigateToDetails(props.data)"
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
          v-if="searchSubmitted && !payRollsIsLoading && !payRollStore.payRoll.length"
          class="flex h-full w-full flex-col items-center justify-center font-menu text-lg dark:text-surface-300"
        >
          <i class="pi pi-exclamation-triangle mb-2 text-2xl"></i>
          <p>No Pay Roll found</p>
        </div>
        <div
          v-if="!payRollsIsLoading && !payRollStore.payRoll.length && !searchSubmitted"
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
                  You have no Payroll Records
                </h2>
                <h1 class="mb-4 text-center text-base text-surface-600 dark:text-surface-400 sm:text-lg">
                  Employee Payroll Records created by you shall appear here.
                </h1>
                <div class="mt-4 flex w-full justify-center">
                  <RouterLink :to="{ name: 'payrolls' }">
                    <Button
                      icon="pi pi-plus"
                      label="New Application for Leave"
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
</template>
