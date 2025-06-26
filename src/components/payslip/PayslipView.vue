<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { PayrollResponse } from '@/typings/models.types.ts'
import { usePayRollStore, PayRollPayload } from '@/stores/payroll.store'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { formatAmount, formatPayrollPeriod } from '@/utils/helpers'
import { useRoute } from 'vue-router'

import Button from 'primevue/button'
import Card from 'primevue/card'
import Divider from 'primevue/divider'

const route = useRoute()
const payRollStore = usePayRollStore()
const isLoading = ref(true)

const payload = reactive<PayRollPayload>({
  ...payRollStore.payrollInfo,
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
          }
          : {
            name: '',
            code: null,
            details: null,
            id: '',
          },
      }))
      : []
    if (payRoll.employee_id) {
      payload.payroll.employee_id = {
        id: payRoll.employee_id.id ?? null,
        individual_basic_detail_id: payRoll.employee_id.individual_basic_detail_id ?? {
          id: 0,
          first_name: '',
          last_name: '',
          middle_name: null,
          ext_name: null,
          birthday: '',
          sex: '',
          place_of_birth: '',
          civil_status: '',
          height: 0,
          weight: 0,
          blood_type: '',
          gsis_no: '',
          pag_ibig_no: '',
          philhealth_no: '',
          sss_no: '',
          tin: '',
          citizenship: '',
          citizenship_acquisition: '',
          individual_address: null,
          individual_contact_info: null,
          employee: null,
        },
        id_number: payRoll.employee_id.id_number ?? null,
        item_id: payRoll.employee_id.item_id ?? {
          id: '',
          number: null,
          date_of_creation: null,
          status: null,
          date_filled_up: null,
          fund_source_id: null,
          employment_status: null,
          position: null,
          position_id: null,
        },
        salary_grade_id: payRoll.employee_id.salary_grade_id ?? {
          id: '',
          nbc_no: 0,
          effective_date: '',
          tranche: 0,
          salary_grade: 0,
          step: 0,
          amount: 0,
        },
        position: payRoll.employee_id.position ?? null,
        fund_source: payRoll.employee_id.fund_source ?? { id: null, name: null },
        agency_employee_no: payRoll.employee_id.agency_employee_no ?? null,
        office_id: payRoll.employee_id.office_id ?? null,
        division_id: payRoll.employee_id.division_id ?? {
          id: '',
          name: null,
          head_user_id: null,
          added_by_user_id: null,
          last_modified_by_user_id: null,
        },
        section_or_unit_id: payRoll.employee_id.section_or_unit_id ?? {
          id: '',
          name: null,
          division_id: null,
          head_user_id: null,
          added_by_user_id: null,
          last_modified_by_user_id: null,
        },
      }
    }
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
              <font-awesome-icon :icon="['fas', 'money-bill-trend-up']" class="h-5 text-primary-700 sm:h-6 md:h-7" />
              My Payslip
              <br />
              <span class="ml-10 text-lg text-surface-600 md:text-xl lg:text-2xl">
                For the Period of
                {{
                  formatPayrollPeriod(
                    payload.payroll.period
                      ? payload.payroll.period.map((date) => date.toISOString().split('T')[0]).join(', ')
                      : null
                  )
                }}
              </span>
            </h2>
          </div>
          <br />

          <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <!-- Salary Details -->
            <div class="flex flex-col items-start gap-2 px-4 md:w-2/3 lg:w-1/2">
              <div class="flex w-full flex-col">
                <h2 class="text-lg font-semibold text-surface-600 dark:text-primary-100">
                  Gross Monthly Salary - {{ formatAmount(payload.payroll.employee_id.salary_grade_id?.amount) }}
                </h2>
                <h1 class="text-lg font-semibold text-surface-600 dark:text-primary-100">
                  Net Pay - {{ formatAmount(payload.payroll.amount_earned_whole) }}
                </h1>
              </div>
            </div>

            <!-- Export Button -->
            <div class="flex w-full justify-end px-4 md:w-auto md:justify-start">
              <Button
                label="Export Payslip"
                class="dark:text-secondary-100 border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
                text
              >
                <template #icon>
                  <i class="pi pi-file-pdf mr-2"></i>
                </template>
              </Button>
            </div>
          </div>

          <div class="grid grid-cols-1 justify-center gap-2 border-b-2 bg-surface-100 px-2 py-4 md:grid-cols-3 md:gap-4 md:px-24">
            <div class="text-start font-semibold text-surface-500 md:ml-24">DEDUCTION</div>
            <div class="text-start font-semibold text-surface-500 md:ml-24">1-15</div>
            <div class="text-center font-semibold text-surface-500 md:mr-24">16-30/31</div>
          </div>
          <p class="create-ar-creds-section text-xs font-medium uppercase"></p>

          <div
            v-for="(deduction, index) in payload.payroll.payroll_deduction_id"
            :key="index"
            class="flex flex-col md:flex-row md:items-center md:justify-between"
          >
            <!-- Deduction Name -->
            <div class="flex w-full flex-col items-start justify-center gap-0 py-1 md:w-5/12">
              <p class="font-base ml-10 text-left text-sm text-surface-600 md:ml-40 md:text-left md:text-lg">
                {{ deduction.deduction_id.name }}
              </p>
            </div>

            <Divider layout="vertical" class="hidden md:block"></Divider>

            <!-- 1st Half Amount -->
            <div class="flex w-full flex-col items-end justify-center gap-0 py-1 md:w-5/12">
              <p
                v-if="deduction.range === '1st Half'"
                class="font-base mr-10 text-right text-sm text-surface-600 md:mr-80 md:text-base"
              >
                {{ formatAmount(deduction.amount) }}
              </p>
            </div>

            <Divider layout="vertical" class="hidden md:block"></Divider>

            <!-- 2nd Half Amount -->
            <div class="flex w-full flex-col items-end justify-center gap-0 py-1 md:w-5/12">
              <p
                v-if="deduction.range === '2nd Half'"
                class="font-base mr-10 text-right text-sm text-surface-600 md:mr-80 md:text-base"
              >
                {{ formatAmount(deduction.amount) }}
              </p>
            </div>
          </div>

          <hr />
          <div class="flex flex-col md:flex-row">
            <div class="md:w-12/12 flex w-full flex-col items-start justify-center gap-0 py-1">
              <p class="ml-40 text-sm font-semibold text-surface-600 md:text-base">TOTAL DEDUCTION</p>
            </div>
            <div class="md:w-12/12 flex w-full flex-col items-start justify-center gap-0 py-1">
              <p class="ml-32 text-sm font-semibold text-error-600 md:text-base">
                {{ formatAmount(payload.payroll.total_deductions_1st_half) }}
              </p>
            </div>
            <div class="flex w-full flex-col items-start justify-center gap-0 py-1">
              <p class="ml-32 text-sm font-semibold text-error-600 md:text-base">
                {{ formatAmount(payload.payroll.total_deductions_2nd_half) }}
              </p>
            </div>
          </div>
          <hr />
          <div class="flex flex-col md:flex-row">
            <div class="md:w-12/12 flex w-full flex-col items-start justify-center gap-0 py-1">
              <p class="ml-40 text-sm font-semibold text-surface-600 md:text-lg">AMOUNT EARNED</p>
            </div>
            <div class="flex w-full flex-col items-start justify-center gap-0 py-1">
              <p class="ml-96 text-sm font-semibold text-surface-600 md:text-lg">
                {{ formatAmount(payload.payroll.amount_earned_whole) }}
              </p>
            </div>
          </div>
          <hr />
          <div v-if="payload.payroll.employee_id.item_id?.employment_status === 'Permanent'" class="flex flex-col md:flex-row">
            <div class="md:w-12/12 flex w-full flex-col items-start justify-center gap-0 py-1">
              <p class="ml-56 text-sm font-semibold text-surface-600 md:text-base">ADD ACA/PERA</p>
            </div>
            <div class="flex w-full flex-col items-start justify-center gap-0 py-1">
              <p class="ml-96 text-sm font-semibold text-surface-600 md:text-base"></p>
            </div>
          </div>
          <div class="flex flex-col md:flex-row">
            <div class="md:w-12/12 flex w-full flex-col items-start justify-center gap-0 py-1">
              <p class="ml-56 text-sm font-semibold text-surface-600 md:text-base">1-15 January 2025</p>
            </div>
            <div class="flex w-full flex-col items-start justify-center gap-0 py-1">
              <p class="ml-96 text-sm font-semibold text-surface-600 md:text-base">
                {{ formatAmount(payload.payroll.amount_earned_1st_half) }}
              </p>
            </div>
          </div>
          <div class="flex flex-col md:flex-row">
            <div class="md:w-12/12 flex w-full flex-col items-start justify-center gap-0 py-1">
              <p class="ml-56 text-sm font-semibold text-surface-600 md:text-base">16-30/21 January 2025</p>
            </div>
            <div class="flex w-full flex-col items-start justify-center gap-0 py-1">
              <p class="ml-96 text-sm font-semibold text-surface-600 md:text-base">
                {{ formatAmount(payload.payroll.amount_earned_2nd_half) }}
              </p>
            </div>
          </div>
          <hr />
          <div class="flex flex-col md:flex-row">
            <div class="md:w-12/12 flex w-full flex-col items-start justify-center gap-0 py-1">
              <p class="ml-40 text-sm font-semibold text-surface-600 md:text-lg">NET PAY</p>
            </div>
            <div class="flex w-full flex-col items-start justify-center gap-0 py-1">
              <p class="ml-96 text-sm font-semibold text-surface-600 md:text-lg">
                {{ formatAmount(payload.payroll.amount_earned_whole) }}
              </p>
            </div>
          </div>
        </template>
      </Card>
    </div>
  </form>
</template>
