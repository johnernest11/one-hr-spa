<script setup lang="ts">
import { ref, reactive, watch, onBeforeMount, onMounted, computed } from 'vue'
import { PayrollResponse } from '@/typings/models.types.ts'
import { usePayRollStore, PayRollPayload } from '@/stores/payroll.store'
import { useRoute } from 'vue-router'

import Button from 'primevue/button'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import InputGroup from 'primevue/inputgroup'

import useVuelidate from '@vuelidate/core'
import Paginator, { PageState } from 'primevue/paginator'
import { parseApiResponseError } from '@/utils/error-handle'
import { ApiResponsePagination } from '@/typings/http-resources.types.ts'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useToast } from 'primevue/usetoast'
import { helpers, required } from '@vuelidate/validators'
import { formatAmount } from '@/utils/helpers'
import { deductionTypes } from '@/utils/mock-data'

const route = useRoute()
const toast = useToast()
const payRollStore = usePayRollStore()
const paginationLimit = 5

const payRollsIsLoading = ref(false)
const searchSubmitted = ref(false)
const PayrollDeduction = ref(false)
const ModifiedPayrollDeduction = ref(false)
const AddDeductionSetting = ref(false)
const formIsSubmitting = ref(false)
const isSearching = ref(false)
const isLoading = ref(true)
const showErrorAlert = ref(false)

const selectedDeductionSettingsId = ref<number[]>([])
const roleFilter = ref<number | null>(null)
const searchQuery = ref<string | null>(null)
const errorMessage = ref<string | null>(null)
const errorDetails = ref<string[]>([])
const currentEditingPayRoll = ref<PayrollResponse | null>(null)

const isRequestSelected = (id: number): boolean => selectedDeductionSettingsId.value.includes(id)

const openPayrollDeduction = (payRoll: PayrollResponse | null = null) => {
  if (!payRoll || !payRoll.id) {
    console.error('Cannot navigate to details: accomplishmentRepor or ID is undefined', payRoll)
    return
  }
  if (payRoll) {
    updatePayloadFromReport(payRoll)
  }
  currentEditingPayRoll.value = payRoll
  updatePayloadFromReport(payRoll)
  PayrollDeduction.value = true
}

const openModifiedDeduction = (payRoll: PayrollResponse | null = null) => {
  if (!payRoll || !payRoll.id) {
    console.error('Cannot open deduction settings: payroll or ID is undefined', payRoll)
    return
  }

  currentEditingPayRoll.value = payRoll

  if (payRoll && payRoll.payroll_deduction_id) {
    selectedDeductionSettingsId.value = payRoll.payroll_deduction_id
      .map((deduction) => {
        const matchingDeductionType = deductionTypes.find(
          (type) => deduction.deduction_id && type.label === deduction.deduction_id.name
        )
        return matchingDeductionType ? matchingDeductionType.id : null
      })
      .filter((id): id is number => id !== null)
  } else {
    selectedDeductionSettingsId.value = []
  }

  ModifiedPayrollDeduction.value = true
}

const openDeductionSetting = (payRoll: PayrollResponse | null = null) => {
  if (!payRoll || !payRoll.id) {
    console.error('Cannot open deduction settings: payroll or ID is undefined', payRoll)
    return
  }

  currentEditingPayRoll.value = payRoll

  if (payRoll && payRoll.payroll_deduction_id) {
    selectedDeductionSettingsId.value = payRoll.payroll_deduction_id
      .map((deduction) => {
        const matchingDeductionType = deductionTypes.find(
          (type) => deduction.deduction_id && type.label === deduction.deduction_id.name
        )
        return matchingDeductionType ? matchingDeductionType.id : null
      })
      .filter((id): id is number => id !== null)
  } else {
    selectedDeductionSettingsId.value = []
  }

  AddDeductionSetting.value = true
}

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

type PayrollDeductionFormProps = {
  payRoll?: PayrollResponse
}
const props = defineProps<PayrollDeductionFormProps>()
onMounted(async () => {
  const id = route.params.id as string
  if (id) {
    const response = await payRollStore.fetchPayRollById(id)
    if (response && response.success) {
      updatePayloadFromReport(response.data as PayrollResponse)
    }
  }
  isLoading.value = false
})

const updatePayloadFromReport = (payRoll: PayrollResponse | null) => {
  if (payRoll) {
    payload.payroll.period = payRoll.period
      ? (payRoll.period.split(', ').map((dateStr) => new Date(dateStr)) as [Date, Date])
      : null
    payload.payroll.gross_monthly_salary = payRoll.gross_monthly_salary ?? ''
    payload.payroll.net_pay = payRoll.net_pay ?? ''
    payload.payroll.total_deductions_1st_half = payRoll.total_deductions_1st_half ?? ''
    payload.payroll.amount_earned_1st_half = payRoll.amount_earned_1st_half ?? ''
    payload.payroll.total_deductions_2nd_half = payRoll.total_deductions_2nd_half ?? ''
    payload.payroll.amount_earned_2nd_half = payRoll.amount_earned_2nd_half ?? ''
    payload.payroll.total_deductions_whole = payRoll.total_deductions_whole ?? ''

    payload.payroll.amount_earned_whole = payRoll.amount_earned_whole ?? ''
    payload.payroll.payroll_deduction_id = Array.isArray(payRoll.payroll_deduction_id)
      ? payRoll.payroll_deduction_id.map((deduction) => ({
        amount: deduction.amount ?? null,
        range: deduction.range ?? null,
        deduction_id: deduction.deduction_id
          ? {
            name: deduction.deduction_id.name ?? '',
            code: deduction.deduction_id.code ?? null,
            details: deduction.deduction_id.details ?? null,
            id: deduction.deduction_id.id ?? '',
            created_at: deduction.deduction_id.created_at,
            updated_at: deduction.deduction_id.updated_at,
            deleted_at: deduction.deduction_id.deleted_at,
          }
          : {
            name: '',
            code: null,
            details: null,
            id: '',
            created_at: undefined,
            updated_at: undefined,
            deleted_at: undefined,
          },
      }))
      : []
  }
}

watch(
  () => props.payRoll,
  (newValue) => {
    if (newValue) {
      updatePayloadFromReport(newValue)
    } else {
      payload.payroll.gross_monthly_salary = ''
      payload.payroll.net_pay = ''
      payload.payroll.total_deductions_1st_half = ''
      payload.payroll.amount_earned_1st_half = ''
      payload.payroll.total_deductions_2nd_half = ''
      payload.payroll.amount_earned_2nd_half = ''
      payload.payroll.total_deductions_whole = ''
      payload.payroll.amount_earned_whole = ''
      payload.payroll.payroll_deduction_id = []
    }
  },
  { immediate: true }
)

const selectRequest = (id: number): void => {
  const index = selectedDeductionSettingsId.value.indexOf(id)
  const selectedItem = deductionTypes.find((item) => item.id === id)

  if (!selectedItem) return

  if (index !== -1) {
    // Deselect
    selectedDeductionSettingsId.value.splice(index, 1)
    payload.payroll.payroll_deduction_id = payload.payroll.payroll_deduction_id.filter(
      (deduction) => deduction.deduction_id.name !== selectedItem.label
    )
  } else {
    // Prevent duplicates
    const alreadyExists = payload.payroll.payroll_deduction_id.some(
      (deduction) => deduction.deduction_id.name === selectedItem.label
    )

    if (!alreadyExists) {
      selectedDeductionSettingsId.value.push(id)
      payload.payroll.payroll_deduction_id.push({
        amount: null,
        range: selectedItem.label,
        deduction_id: {
          name: selectedItem.label,
          code: null,
          details: null,
          id: '',
          created_at: undefined,
          updated_at: undefined,
          deleted_at: undefined,
        },
      })
    }
  }
}

watch(
  () => payload.payroll.payroll_deduction_id,
  (newVal) => {
    if (Array.isArray(newVal)) {
      selectedDeductionSettingsId.value = deductionTypes
        .filter((item) => newVal.some((ded) => ded.deduction_id.name === item.label))
        .map((item) => item.id)
    }
  },
  { immediate: true, deep: true }
)

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
const deductionTotals = computed(() => {
  let firstHalf = 0
  let secondHalf = 0
  let total = 0

  for (const deduction of payload.payroll.payroll_deduction_id) {
    if (deduction.amount) {
      const amount = parseFloat(String(deduction.amount))
      total += amount

      if (deduction.range === '1st Half') {
        firstHalf += amount
      } else if (deduction.range === '2nd Half') {
        secondHalf += amount
      }
    }
  }

  const format = (val: number) => val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return {
    firstHalf: format(firstHalf),
    secondHalf: format(secondHalf),
    total: format(total),
  }
})
</script>
<template>
  <div class="flex h-full w-full flex-col shadow-md">
    <div class="h-full w-full rounded-md bg-surface-0 p-6">
      <div
        class="flex flex-row items-center space-x-4 font-medium text-primary-700 dark:text-primary-100 md:ml-4 md:mt-2 md:flex-row"
      >
        <Button
          icon="pi pi-angle-left"
          severity="secondary"
          aria-label="Bookmark"
          rounded
          @click="$router.go(-1)"
          size="small"
          class="mb-2 ml-4 md:mb-0 md:ml-0"
        />
        <h1 class="mb-2 mr-4 whitespace-nowrap text-xl text-surface-600 dark:text-primary-100 md:text-xl lg:text-4xl">
          General Payroll
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
                header="Employee Name"
                headerClass="w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="font-base uppercase text-surface-600">
                    {{ props.data.employee_id.individual_basic_detail_id.first_name }}
                    {{ props.data.employee_id.individual_basic_detail_id.middle_name ?? '' }}
                    {{ props.data.employee_id.individual_basic_detail_id.last_name }}
                  </p>
                </template>
              </Column>
              <Column
                field="period"
                header="Division"
                headerClass="w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="font-base uppercase text-surface-600">{{ props.data.employee_id.division_id.name }}</p>
                </template>
              </Column>
              <Column
                field="edited_at"
                header="Section"
                headerClass=" w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="font-base uppercase text-surface-600">{{ props.data.employee_id.section_or_unit_id.name }}</p>
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
                      @click="openPayrollDeduction(props.data)"
                    />
                    <Button
                      icon="pi pi-file"
                      v-tooltip.top="'View Payroll'"
                      severity="info"
                      class="border-none text-lg font-semibold text-primary-600 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
                      text
                      @click="openPayrollDeduction(props.data)"
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
      </div>
      <!-- Start of Dialog Box of Payroll Deduction -->
      <Dialog
        v-model:visible="PayrollDeduction"
        modal
        header="Generate Payroll"
        :style="{ width: '90vw', maxWidth: '1000px' }"
        :closable="false"
        :value="payRollStore.payRoll"
        class="mt-6"
        dataKey="id"
      >
        <template #header>
          <div class="flex w-full flex-col gap-3 px-2 pt-2 sm:px-4">
            <!-- Top Row: Back button + Title + Icon -->
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <!-- Left Section: Back + Icon + Text -->
              <div class="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                <div class="flex items-center gap-2">
                  <Button
                    icon="pi pi-angle-left"
                    severity="secondary"
                    aria-label="Back"
                    rounded
                    @click="PayrollDeduction = false"
                    size="small"
                    class="flex-shrink-0"
                  />
                  <font-awesome-icon :icon="['fas', 'money-bill-trend-up']" class="h-5 text-primary-700 sm:h-7 md:h-8" />
                </div>
                <div class="mt-2 sm:mt-0">
                  <h1 class="text-lg font-bold text-surface-600 sm:text-xl md:text-2xl">Payroll Deductions</h1>
                  <p class="text-sm text-surface-600 sm:text-base md:text-base">John Ernest R. Catungal / IPP-RICTMS</p>
                </div>
              </div>
              <div class="mr-8 flex flex-col items-start sm:items-end">
                <p class="text-sm font-semibold text-surface-600 sm:text-base">Monthly Rate: 46,746.00</p>
                <Button
                  icon="pi pi-file-edit"
                  label="Update Employee Deduction"
                  v-tooltip.top="'Generate Payroll'"
                  severity="info"
                  size="large"
                  class="dark:text-secondary-100 mt-2 border border-primary-500 text-sm text-primary-600 dark:border-surface-700"
                  text
                  @click="openModifiedDeduction(currentEditingPayRoll)"
                />
              </div>
            </div>

            <hr />

            <!-- Deduction Header -->
            <h1 class="mb-0 text-base italic text-primary-700 sm:text-lg md:text-xl">Deductions</h1>
          </div>
        </template>

        <div class="px-4 py-4 sm:px-6 sm:py-6 md:px-12">
          <div class="mb-4 grid grid-cols-1 gap-1 sm:grid-cols-2">
            <Card
              v-for="deduction in payload.payroll.payroll_deduction_id"
              :key="deduction.deduction_id.id"
              class="h-12 border border-surface-300"
            >
              <template #content>
                <div class="relative h-full w-full">
                  <p
                    class="absolute top-1/2 m-0 w-[70%] -translate-y-9 overflow-hidden text-left text-sm sm:text-left sm:text-base md:w-[60%] lg:text-lg"
                  >
                    {{ deduction.deduction_id.name }}
                  </p>
                  <p
                    v-if="true"
                    class="!text-surface-00 absolute right-2 top-1/2 -translate-y-9 text-base sm:right-4 md:text-base lg:right-0"
                  >
                    {{ formatAmount(deduction.amount) }}
                  </p>
                </div>
              </template>
            </Card>
          </div>
          <p class="mb-2 mr-2 mt-2 whitespace-nowrap text-end font-semibold text-surface-600 md:text-lg">
            Total Deductions: {{ deductionTotals.total }}
          </p>
          <hr />
          <div class="mt-4 flex justify-end gap-2">
            <br />
            <Button
              label="Cancel"
              class="dark:text-secondary-100 border border-surface-400 text-base text-surface-500 dark:border-surface-700 lg:text-surface-500 dark:lg:text-surface-400"
              text
              @click="ModifiedPayrollDeduction = false"
            >
              <template #icon>
                <i class="pi pi-ban mr-2"></i>
              </template>
            </Button>
            <Button
              @click="handleSaveSubmissionif"
              :loading="formIsSubmitting"
              :disabled="formIsSubmitting"
              label="Upload Payroll"
              class="dark:text-secondary-100 border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-600"
              text
            >
              <template #icon>
                <font-awesome-icon :icon="['fas', 'upload']" class="mr-2" />
              </template>
            </Button>
          </div>
        </div>
      </Dialog>
      <!-- End of Dialog Box of Payroll Deduction -->
      <!-- Start of Dialog Box of Update Employee Deduction Setting -->
      <Dialog
        v-model:visible="ModifiedPayrollDeduction"
        modal
        header="Modified Deductions"
        :style="{ width: '90vw', maxWidth: '1000px' }"
        :closable="false"
        :value="payRollStore.payRoll"
        class="mt-6"
        dataKey="id"
      >
        <template #header>
          <div class="flex w-full flex-col gap-3 px-3 pt-4 sm:px-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <div class="flex items-center gap-2">
                  <Button
                    icon="pi pi-angle-left"
                    severity="secondary"
                    aria-label="Back"
                    rounded
                    size="small"
                    class="flex-shrink-0"
                    @click="ModifiedPayrollDeduction = false"
                  />
                  <font-awesome-icon :icon="['fas', 'money-bill-trend-up']" class="h-5 text-primary-700 sm:h-6 md:h-7" />
                </div>
                <div>
                  <h1 class="text-primary-00 text-lg font-bold sm:text-xl md:text-2xl">Modified Deductions</h1>
                  <p class="text-sm text-surface-700 sm:text-base">John Ernest R. Catungal / IPP-RICTMS</p>
                </div>
              </div>

              <!-- Right: Rate & Button -->
              <div class="mr-8 flex flex-col items-start sm:items-end">
                <p class="text-sm font-semibold text-surface-600 sm:text-base">Monthly Rate: 46,746.00</p>
                <Button
                  icon="pi pi-plus"
                  label="Add Additional Setting"
                  v-tooltip.top="'Generate Payroll'"
                  severity="info"
                  size="small"
                  class="dark:text-secondary-100 mt-2 border border-primary-500 text-sm text-primary-600 dark:border-surface-700"
                  text
                  @click="openDeductionSetting(currentEditingPayRoll)"
                />
              </div>
            </div>

            <hr />
            <h1 class="text-lg italic text-primary-700 sm:text-xl md:text-2xl">Deductions</h1>
            <div class="ml-1 flex items-center gap-2 text-sm italic text-surface-600 sm:ml-8">
              <font-awesome-icon :icon="['fas', 'circle-info']" class="h-4 w-4" />
              <span>Double click the area you wish to edit</span>
            </div>
          </div>
        </template>

        <div class="px-4 py-4 sm:px-6 sm:py-2 md:px-12">
          <div class="mb-4 grid grid-cols-1 gap-1 sm:grid-cols-2">
            <Card
              v-for="deduction in payload.payroll.payroll_deduction_id"
              :key="deduction.deduction_id.id"
              class="h-12 border border-surface-300"
            >
              <template #content>
                <div class="relative h-full w-full">
                  <p
                    class="absolute top-1/2 m-0 w-[70%] -translate-y-9 overflow-hidden text-left text-sm sm:text-left sm:text-sm md:w-[60%] lg:text-lg"
                  >
                    {{ deduction.deduction_id.name }}
                  </p>
                  <p
                    v-if="true"
                    class="!text-surface-00 absolute right-2 top-1/2 -translate-y-8 text-xl sm:right-4 sm:text-2xl md:text-base lg:right-0 lg:text-base"
                  >
                    <InputNumber
                      v-model="deduction.amount"
                      inputClass=" w-24  !text-surface-00 absolute left-6 top-1/2 -translate-y-5 text-base sm:right-4 md:text-base lg:right-0"
                      class="ml-24"
                      mode="decimal"
                      :minFractionDigits="2"
                      :maxFractionDigits="2"
                      placeholder="0.00"
                    />
                  </p>
                </div>
              </template>
            </Card>
          </div>
          <hr />
          <div class="mt-4 flex justify-end gap-2">
            <br />
            <Button
              label="Cancel"
              class="dark:text-secondary-100 border border-surface-400 text-base text-surface-500 dark:border-surface-700 lg:text-surface-500 dark:lg:text-surface-400"
              text
              @click="ModifiedPayrollDeduction = false"
            >
              <template #icon>
                <i class="pi pi-ban mr-2"></i>
              </template>
            </Button>
            <Button
              :loading="formIsSubmitting"
              :disabled="formIsSubmitting"
              label="Save Deduction"
              class="dark:text-secondary-100 border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-600"
              text
            >
              <template #icon>
                <font-awesome-icon :icon="['fas', 'save']" class="mr-2" />
              </template>
            </Button>
          </div>
        </div>
      </Dialog>
      <!-- End of Dialog Box of Update Employee Deduction Setting -->
      <!-- Start of Dialog Box of Additional Deduction Setting End  -->
      <Dialog
        v-model:visible="AddDeductionSetting"
        modal
        header="Generate Payroll"
        :style="{ width: '90vw', maxWidth: '1000px' }"
        :closable="false"
      >
        <template #header>
          <div class="flex w-full flex-col gap-3 px-3 pt-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <div class="flex items-center gap-2">
                  <Button
                    icon="pi pi-angle-left"
                    severity="secondary"
                    aria-label="Back"
                    rounded
                    size="small"
                    class="flex-shrink-0"
                    @click="AddDeductionSetting = false"
                  />
                  <font-awesome-icon :icon="['fas', 'money-bill-trend-up']" class="h-5 text-primary-700 sm:h-6 md:h-7" />
                </div>
                <div>
                  <h1 class="text-lg font-bold text-primary-900 sm:text-xl md:text-2xl">Employee Deductions Setting</h1>
                  <p class="text-sm text-surface-700 sm:text-base">John Ernest R. Catungal / IPP-RICTMS</p>
                </div>
              </div>
              <p class="mr-10 text-sm font-semibold text-surface-600 sm:text-base md:text-lg">Monthly Rate: 46,746.00</p>
            </div>
            <hr />
          </div>
        </template>

        <div class="px-4 py-4 sm:px-6 sm:py-6 md:px-12">
          <div class="mb-4 grid grid-cols-1 gap-1 sm:grid-cols-2">
            <Card
              v-for="item in deductionTypes"
              :key="item.id"
              class="h-12 cursor-pointer border border-surface-300"
              :class="{
                '!bg-surface-0 !text-black': true,
              }"
              @click="selectRequest(item.id)"
            >
              <template #content>
                <div class="relative h-full w-full">
                  <p
                    class="absolute top-1/2 m-0 w-[70%] -translate-y-9 overflow-hidden text-left text-sm sm:text-left sm:text-sm md:w-[60%] lg:text-lg"
                  >
                    {{ item.label }}
                  </p>
                  <p
                    v-if="true"
                    class="absolute right-2 top-1/2 -translate-y-9 text-3xl !text-surface-200 sm:right-0 sm:-translate-y-11 sm:text-2xl md:text-3xl lg:right-0 lg:text-4xl"
                  >
                    <font-awesome-icon
                      :icon="isRequestSelected(item.id) ? ['fas', 'check-square'] : ['fas', 'square-full']"
                      :class="{
                        'text-primary-600': isRequestSelected(item.id), // Color when checked
                        'border border-surface-300   text-2xl text-gray-50': !isRequestSelected(item.id), // Color when unchecked, adjust as needed
                      }"
                    />
                  </p>
                </div>
              </template>
            </Card>
          </div>
          <div class="mt-4 flex justify-end gap-2">
            <Button
              label="Cancel"
              class="dark:text-secondary-100 border border-surface-400 text-base text-surface-500 dark:border-surface-700 lg:text-surface-500 dark:lg:text-surface-400"
              text
              @click="AddDeductionSetting = false"
            >
              <template #icon>
                <i class="pi pi-ban mr-2"></i>
              </template>
            </Button>
            <Button
              :loading="formIsSubmitting"
              :disabled="formIsSubmitting"
              label="Save Setting"
              class="dark:text-secondary-100 border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-600"
              text
            >
              <template #icon>
                <font-awesome-icon :icon="['fas', 'save']" class="mr-2" />
              </template>
            </Button>
          </div>
        </div>
      </Dialog>
      <!-- End of Dialog Box of Additional Deduction Setting End  -->
    </div>
  </div>
</template>
