import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { useAuthStore } from '@/stores/auth.store.ts'
import { useApiCall } from '@/composables/network'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { DeductionResponse, PayrollResponse, PersonnelEmployee } from '@/typings/models.types'
import { useFetchBlob } from '@/composables/fetch.blob'
import { payrollMockData } from '@/utils/mock-data'

export type PayRollPayload = {
  payroll: {
    period: [Date, Date] | null
    gross_monthly_salary: string | null
    net_pay: string | null
    total_deductions_1st_half: string | null
    amount_earned_1st_half: string | null
    total_deductions_2nd_half: string | null
    amount_earned_2nd_half: string | null
    total_deductions_whole: string | null
    amount_earned_whole: string | null
    payroll_deduction_id: {
      amount: number | null
      range: string | null
      deduction_id: DeductionResponse
    }[]
    employee_id: PersonnelEmployee
  }
}

export const usePayRollStore = defineStore('pay-roll', () => {
  const auth = useAuthStore()
  const payRoll = ref<PayrollResponse[]>([])
  const selectedpayRoll = ref<PayrollResponse | null>(null)

  const payrollInfo = ref<PayRollPayload>({
    payroll: {
      period: null as [Date, Date] | null,
      gross_monthly_salary: null,
      net_pay: null,
      total_deductions_1st_half: null,
      amount_earned_1st_half: null,
      total_deductions_2nd_half: null,
      amount_earned_2nd_half: null,
      total_deductions_whole: null,
      amount_earned_whole: null,
      payroll_deduction_id: reactive([
        {
          amount: null,
          range: null,
          deduction_id: {
            id: '',
            name: '',
            code: null,
            details: null,
            created_at: undefined,
            updated_at: undefined,
          },
        },
      ]),
      employee_id: {
        id: null,
        individual_basic_detail_id: {
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
        id_number: null,
        item_id: 0,
        item: {
          id: 0,
          number: null,
          date_of_creation: null,
          status: null,
          date_filled_up: null,
          fund_source_id: 0,
          fund_source: null,
          employment_status: null,
          position_id: 0,
          position: {
            id: '',
            title: '',
            parenthetical_title: null,
            level: null,
          },
        },
        salary_grade_id: {
          id: '',
          nbc_no: null,
          effective_date: null,
          tranche: null,
          salary_grade: null,
          step: null,
          amount: null,
        },
        fund_source: {
          id: null,
          name: null,
        },
        agency_employee_no: null,
        office_id: null,
        division_id: {
          id: '',
          name: null,
          head_user_id: null,
          added_by_user_id: null,
          last_modified_by_user_id: null,
        },
        section_or_unit_id: {
          id: '',
          name: null,
          division_id: null,
          head_user_id: null,
          added_by_user_id: null,
          last_modified_by_user_id: null,
        },
        item: {
          id: 0,
          number: null,
          date_of_creation: null,
          status: null,
          date_filled_up: null,
          fund_source_id: 0,
          fund_source: {
            id: '',
            name: '',
          },
          employment_status: null,
          position_id: 0,
          position: {
            id: '',
            title: '',
            parenthetical_title: null,
            level: null,
          },
        },
      },
    },
  })

  const fetchPayRoll = async (limit = 10, page = 1) => {
    const start = (page - 1) * limit
    const paginated = payrollMockData.slice(start, start + limit).map((item) => ({
      ...item,
      payroll_deduction_id:
        typeof item.payroll_deduction_id === 'function' ? item.payroll_deduction_id : item.payroll_deduction_id,
    }))
    payRoll.value = [...paginated]
    return {
      success: true,
      data: paginated,
      pagination: {
        current_page: page,
        last_page: Math.ceil(payrollMockData.length / limit),
        per_page: limit,
        total: payrollMockData.length,
        from: start + 1,
        to: start + paginated.length,
        first_page_url: '',
        last_page_url: '',
        next_page_url: null,
        previous_page_url: null,
        path: '',
      },
    }
  }

  const fetchPayRollById = async (id: string) => {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const foundData = payrollMockData.find((item) => item.id === parseInt(id))

    const responseBody = {
      success: !!foundData,
      data: foundData || null,
      message: foundData ? 'Data fetched successfully.' : 'Record not found.',
    }

    if (responseBody.success) {
      const data = responseBody.data
      if (data) {
        selectedpayRoll.value = {
          ...data,
          payroll_deduction_id:
            typeof data.payroll_deduction_id === 'function' ? data.payroll_deduction_id : data.payroll_deduction_id,
        }
      } else {
        selectedpayRoll.value = null
      }
    }

    return responseBody
  }

  const createPayRoll = async (payroll: Partial<PayRollPayload>) => {
    const { data } = await useApiCall('/pay-rolls/', auth.authenticationToken).post(payroll).json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      payRoll.value.unshift(responseBody.data as PayrollResponse)
    }
    return responseBody
  }

  const searchPayRoll = async (query: string | null) => {
    let uri = '/pay-rolls/search?'
    if (query) uri += `query=${query}`
    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const paySlipsList = responseBody.data as PayrollResponse[]
      payRoll.value = [...paySlipsList]
    }
    return responseBody
  }

  const updatePayRoll = async (payroll: Partial<PayRollPayload>, id: string | number) => {
    const { data } = await useApiCall(`/pay-rolls/${id}`, auth.authenticationToken).put(payroll).json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const index = payRoll.value.findIndex((payRoll) => payRoll?.id === id)
      if (index === -1) return responseBody
      payRoll.value[index] = responseBody.data as PayrollResponse
    }
    return responseBody
  }

  const generatePayRoll = async (id: string) => {
    const api_url = `/pay-rolls/${id}/generate`
    const authenticationToken = ''
    const { data, fileNameHeader } = await useFetchBlob(api_url, authenticationToken)
    return { data, fileNameHeader }
  }

  return {
    payRoll,
    payrollInfo,
    createPayRoll,
    fetchPayRoll,
    fetchPayRollById,
    searchPayRoll,
    updatePayRoll,
    generatePayRoll,
  }
})
