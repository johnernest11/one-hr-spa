import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store.ts'
import { useApiCall } from '@/composables/network'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { PayrollResponse } from '@/typings/models.types'
import { useFetchBlob } from '@/composables/fetch.blob'

export type PayRollPayload = {
  period_from: string | null
  period_to: string | null
  gross_monthly_salary: number
  net_pay: string | null
  total_deductions_1st_half: string | null
  amount_earned_1st_half: string | null
  total_deductions_2nd_half: string | null
  amount_earned_2nd_half: string | null
  total_deductions_whole: string | null
  amount_earned_whole: string | null
  payroll_deduction_id?: string | number | null
}

export const usePayRollStore = defineStore('pay-roll', () => {
  const auth = useAuthStore()
  const payRoll = ref<PayrollResponse[]>([])
  const selectedpaySlip = ref<PayrollResponse | null>(null)

  /** MOCK DATA */
  let mockId = 1

  const employee_data = {
    id: 1,
    individual_basic_detail_id: 101,
    id_number: 'EMP-2025-001',
    item_id: 501,
    salary_grade_id: 12,
    position: 'Administrative Officer III',
    fund_source: {
      id: 1,
      name: 'General Fund',
    },
    agency_employee_no: 'AGY-000123',
    office_id: 10,
    division_id: 3,
    section_or_unit_id: 5,
    item: null,
  }

  const employee = {
    id: 1,
    first_name: 'John Ernest ',
    last_name: 'Catungal ',
    middle_name: null,
    ext_name: null,
    birthday: '1990-01-01',
    sex: 'M',
    place_of_birth: 'City',
    civil_status: 'Single',
    height: 170,
    weight: 70,
    blood_type: 'O',
    gsis_no: '',
    pag_ibig_no: 'null',
    philhealth_no: '',
    sss_no: '',
    citizenship: 'Filipino',
    tin: '',
    citizenship_acquisition: '',
    individual_address: {
      barangay: '',
      city: '',
      province: '',
      id: 1,
      individual_basic_detail_id: null,
      residential_house_block_lot_no: null,
      residential_street: null,
      residential_subdivision_village: null,
      residential_brgy_id: null,
      residential_citymun_id: null,
      residential_province_id: null,
      residential_region_id: null,
      residential_zip_code: null,
      permanent_house_block_lot_no: null,
      permanent_street: null,
      permanent_subdivision_village: null,
      permanent_brgy_id: null,
      permanent_citymun_id: null,
      permanent_province_id: null,
      permanent_region_id: null,
      permanent_zip_code: null,
      created_at: null,
      updated_at: null,
      deleted_at: null,
      region: null,
    },
    individual_contact_info: {
      id: '3',
      mobile_no: null,
      tel_no: null,
      email_address: null,
      individual_basic_detail_id: null,
    },
    employee: employee_data,
  }

  const deduction = [
    {
      id: 1,
      name: 'PhilHealth',
      code: null,
      details: null,
      description: 'PhilHealth Contribution',
      created_at: undefined,
      updated_at: undefined,
      deleted_at: undefined,
    },
    {
      id: 2,
      name: 'SSS',
      code: null,
      details: null,
      description: 'SSS Contribution',
      created_at: undefined,
      updated_at: undefined,
      deleted_at: undefined,
    },
  ]

  const deduction_setting = [
    {
      id: 1,
      amount: '2000',
      range: '1st Half',
      employee_id: employee,
      deduction_id: deduction[0],
      created_at: '2025-07-06',
      updated_at: '2025-07-06',
    },
    {
      id: 2,
      amount: '2000',
      range: '1st Half',
      employee_id: employee,
      deduction_id: deduction[1],
      created_at: '2025-07-06',
      updated_at: '2025-07-06',
    },
  ]

  const mockData = [
    {
      id: mockId++,
      period_from: '2025-05-01',
      period_to: '2025-05-15',
      gross_monthly_salary: 50000,
      net_pay: '40000',
      total_deductions_1st_half: '5000',
      amount_earned_1st_half: '20000',
      total_deductions_2nd_half: '5000',
      amount_earned_2nd_half: '20000',
      total_deductions_whole: '10000',
      amount_earned_whole: '40000',
      payroll_deduction_id: [
        {
          id: 1,
          amount: '2000',
          range: '1st Half',
          employee_id: employee,
          deduction_id: deduction[0],
          payroll_id: null,
          employee_deduction_setting_id: deduction_setting[0],
          created_at: '2025-07-06',
          updated_at: '2025-07-06',
        },
        {
          id: 2,
          amount: '3000',
          range: '2nd Half',
          employee_id: employee,
          deduction_id: deduction[1],
          payroll_id: null,
          employee_deduction_setting_id: deduction_setting[1],
          created_at: '2025-07-06',
          updated_at: '2025-07-06',
        },
      ],
      employee_id: employee,
      generate_employee_id: employee,
      created_at: '2025-07-06',
      updated_at: '2025-07-06',
    },
    {
      id: mockId++,
      period_from: '2025-06-01',
      period_to: '2025-06-15',
      gross_monthly_salary: 52000,
      net_pay: '42000',
      total_deductions_1st_half: '4500',
      amount_earned_1st_half: '21000',
      total_deductions_2nd_half: '5500',
      amount_earned_2nd_half: '21000',
      total_deductions_whole: '10000',
      amount_earned_whole: '42000',
      payroll_deduction_id: [
        {
          id: 3,
          amount: '2500',
          range: '1st Half',
          employee_id: employee,
          deduction_id: deduction[0],
          payroll_id: null,
          employee_deduction_setting_id: deduction_setting[0],
          created_at: '2025-08-01',
          updated_at: '2025-08-01',
        },
        {
          id: 4,
          amount: '2500',
          range: '2nd Half',
          employee_id: employee,
          deduction_id: deduction[1],
          payroll_id: null,
          employee_deduction_setting_id: deduction_setting[1],
          created_at: '2025-08-01',
          updated_at: '2025-08-01',
        },
      ],
      employee_id: employee,
      generate_employee_id: employee,
      created_at: '2025-08-01',
      updated_at: '2025-08-01',
    },
    {
      id: mockId++,
      period_from: '2025-07-01',
      period_to: '2025-07-15',
      gross_monthly_salary: 53000,
      net_pay: '42500',
      total_deductions_1st_half: '5000',
      amount_earned_1st_half: '21500',
      total_deductions_2nd_half: '5500',
      amount_earned_2nd_half: '21000',
      total_deductions_whole: '10500',
      amount_earned_whole: '42500',
      payroll_deduction_id: [
        {
          id: 5,
          amount: '3000',
          range: '1st Half',
          employee_id: employee,
          deduction_id: deduction[0],
          payroll_id: null,
          employee_deduction_setting_id: deduction_setting[0],
          created_at: '2025-09-01',
          updated_at: '2025-09-01',
        },
        {
          id: 6,
          amount: '3000',
          range: '2nd Half',
          employee_id: employee,
          deduction_id: deduction[1],
          payroll_id: null,
          employee_deduction_setting_id: deduction_setting[1],
          created_at: '2025-09-01',
          updated_at: '2025-09-01',
        },
      ],
      employee_id: employee,
      generate_employee_id: employee,
      created_at: '2025-09-01',
      updated_at: '2025-09-01',
    },
  ]

  const fetchPayRoll = async (limit = 10, page = 1) => {
    const start = (page - 1) * limit
    const paginated = mockData.slice(start, start + limit)
    payRoll.value = [...paginated]
    return {
      success: true,
      data: paginated,
      pagination: {
        current_page: page,
        last_page: Math.ceil(mockData.length / limit),
        per_page: limit,
        total: mockData.length,
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

  const fetchPayRollById = async (id: string | number) => {
    const url = `/pay-rolls/${id}`
    const { data } = await useApiCall(url, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      selectedpaySlip.value = responseBody.data as PayrollResponse
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
    createPayRoll,
    fetchPayRoll,
    fetchPayRollById,
    searchPayRoll,
    updatePayRoll,
    generatePayRoll,
  }
})
