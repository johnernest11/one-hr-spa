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
        id: 0,
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
          blood_type: null,
          gsis_no: '',
          pag_ibig_no: '',
          philhealth_no: '',
          sss_no: '',
          tin: '',
          citizenship: '',
          citizenship_acquisition: '',
          country_id: null,
          individual_address: null,
          individual_contact_info: null,
          individual_family: null,
          individual_educational_background: null,
          individual_eligibility: null,
          individual_work_experience: null,
          individual_voluntary_work: null,
          individual_lnd: null,
          individual_skills_hobby: null,
          individual_recognition: null,
          individual_membership: null,
          individual_question: null,
          individual_reference: null,
          individual_government_id: null,
          employee: null,
        },
        id_number: null,
        item_id: 0,
        salary_grade_id: 1,
        salary_grade: {
          id: 1,
          nbc_no: 123,
          effective_date: '2024-07-01',
          tranche: 4,
          salary_grade: 12,
          step: 3,
          amount: 34567.89,
        },
        fund_source: {
          id: 1,
          name: 'General Fund',
        },
        agency_employee_no: 'AGY-000123',
        office_id: 1,
        office: {
          id: 1,
          name: 'FO MAIN',
          head_user_id: null,
          added_by_user_id: null,
          last_modified_by_user_id: null,
        },
        division_id: 3,
        division: {
          id: 3,
          name: 'FINANCE AND MANAGEMENT DIVISION',
          head_user_id: null,
          added_by_user_id: null,
          last_modified_by_user_id: null,
        },
        section_or_unit_id: 5,
        section_or_unit: {
          id: 5,
          name: 'ACCOUNTING SECTION',
          division_id: null,
          head_user_id: null,
          added_by_user_id: null,
          last_modified_by_user_id: null,
        },
        item: {
          id: 0,
          division_id: 3,
          division: {
            id: 3,
            name: 'FINANCE AND MANAGEMENT DIVISION',
            head_user_id: null,
            added_by_user_id: null,
            last_modified_by_user_id: null,
          },
          section_or_unit_id: 5,
          section_or_unit: {
            id: 5,
            name: 'ACCOUNTING SECTION',
            division_id: null,
            head_user_id: null,
            added_by_user_id: null,
            last_modified_by_user_id: null,
          },
          program_id: 1,
          program: {
            id: 1,
            name: 'FO MAIN',
          },
          office_id: 1,
          office: {
            id: 1,
            name: 'FO MAIN',
            head_user_id: null,
            added_by_user_id: null,
            last_modified_by_user_id: null,
          },

          psipop_id: 1,
          psipop: {
            id: 1,
            name: 'FO MAIN',
            head_user_id: null,
            added_by_user_id: null,
            last_modified_by_user_id: null,
          },

          employment_status: 'Contract of Service',
          fund_source_id: 1,
          fund_source: {
            id: 1,
            name: 'General Fund',
            created_at: '2020-01-01',
            updated_at: '2020-01-01',
          },

          salary_grade_id: 1,
          salary_grade: { id: '', nbc_no: null, effective_date: null, tranche: null, salary_grade: null, step: null, amount: 0 },

          position_id: 1,
          position: {
            id: 1,
            title: 'Administrative Officer III',
            parenthetical_title: null,
            level: null,
            created_at: '2020-01-01',
            updated_at: '2020-01-01',
          },

          item_classification: 'Regular',
          number: 'ITEM-501',
          date_of_creation: '2020-01-01',

          designation: 'N/A',
          date_of_designation: '2020-01-01',
          special_order_number: 'N/A',

          status: 'Unfilled',
          mode_of_accession: '',
          date_filled_up: '2020-01-01',
          history_of_position: '',
          former_incumbent: '',
          mode_of_separation: '',
          date_of_vacant: null,
          remarks_of_vacancy: '',
          status_of_vacant_position: '',
          direct_contact_exposure_with_client: '',
          remarks: '',
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

  const searchPayRoll = async (query: string | null, limit = 10, page = 1) => {
    const start = (page - 1) * limit

    const filtered = payrollMockData.filter((item) => {
      if (!query) return true
      const q = query.toLowerCase()
      const formattedPeriod = (() => {
        const [startStr, endStr] = item.period.split(',').map((date) => new Date(date.trim()))

        const startDay = startStr.getDate()
        const endDay = endStr.getDate()
        const month = startStr.toLocaleString('default', { month: 'long' })
        const year = startStr.getFullYear()

        return `${startDay}–${endDay} ${month} ${year}`.toLowerCase()
      })()
      return (
        formattedPeriod.includes(q) ||
        item.employee_id.individual_basic_detail_id.first_name.toLowerCase().includes(q) ||
        item.employee_id.individual_basic_detail_id.last_name.toLowerCase().includes(q)
      )
    })

    const paginated = filtered.slice(start, start + limit)
    payRoll.value = [...paginated]

    return {
      success: true,
      data: paginated,
      pagination: {
        current_page: page,
        last_page: Math.ceil(filtered.length / limit),
        per_page: limit,
        total: filtered.length,
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
