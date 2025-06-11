import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store.ts'
import { useApiCall } from '@/composables/network'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { LocatorSlipResponse } from '@/typings/models.types'

export type LocatorSlipPayload = {
  period_covered_from: string | null
  period_covered_to: string | null
  period_request: string | null
}

export const useLocatorSlipStore = defineStore('locator-slip', () => {
  const auth = useAuthStore()
  const locatorSlip = ref<LocatorSlipResponse[]>([])
  const selectedlocatorSlip = ref<LocatorSlipResponse | null>(null)

  /** MOCK DATA */
  let mockId = 1

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
    employee: null,
  }

  const mockData = [
    {
      id: mockId++,
      period_covered_from: '2025-05-01',
      period_covered_to: '2025-05-15',
      period_request: '1st request for this period',
      employee_id: employee,
      created_at: '2025-07-06',
      updated_at: '2025-07-06',
    },
    {
      id: mockId++,
      period_covered_from: '2025-06-01',
      period_covered_to: '2025-06-15',
      period_request: '2nd request for this period',
      employee_id: employee,
      created_at: '2025-08-01',
      updated_at: '2025-08-01',
    },
    {
      id: mockId++,
      period_covered_from: '2025-07-01',
      period_covered_to: '2025-07-15',
      period_request: '2nd request for this period',
      employee_id: employee,
      created_at: '2025-09-01',
      updated_at: '2025-09-01',
    },
  ]

  const fetchLocatorSlip = async (limit = 10, page = 1) => {
    const start = (page - 1) * limit
    const paginated = mockData.slice(start, start + limit)
    locatorSlip.value = [...paginated]
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

  const fetchLocatorSlipById = async (id: string | number) => {
    const url = `/locator-slips/${id}`
    const { data } = await useApiCall(url, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      selectedlocatorSlip.value = responseBody.data as LocatorSlipResponse
    }
    return responseBody
  }

  const createLocatorSlip = async (locatorslip: Partial<LocatorSlipPayload>) => {
    const { data } = await useApiCall('/locator-slips/', auth.authenticationToken).post(locatorslip).json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      locatorSlip.value.unshift(responseBody.data as LocatorSlipResponse)
    }
    return responseBody
  }

  const searchLocatorSlip = async (query: string | null) => {
    let uri = '/locator-slips/search?'
    if (query) uri += `query=${query}`
    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const locatorSlipsList = responseBody.data as LocatorSlipResponse[]
      locatorSlip.value = [...locatorSlipsList]
    }
    return responseBody
  }

  const updateLocatorSlip = async (locatorslip: Partial<LocatorSlipPayload>, id: string | number) => {
    const { data } = await useApiCall(`/locator-slips/${id}`, auth.authenticationToken).put(locatorslip).json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const index = locatorSlip.value.findIndex((locatorslip) => locatorslip?.id === id)
      if (index === -1) return responseBody
      locatorSlip.value[index] = responseBody.data as LocatorSlipResponse
    }
    return responseBody
  }

  const generateLocatorSlip = async (id: string) => {
    const response = await fetch('/mock/Locator-Slip-Form.docx')
    const blob = await response.blob()
    const fileNameHeader = `locator-slip-${id}.docx`

    return {
      data: ref(blob),
      fileNameHeader: ref(fileNameHeader),
    }
  }

  return {
    locatorSlip,
    createLocatorSlip,
    fetchLocatorSlip,
    fetchLocatorSlipById,
    searchLocatorSlip,
    updateLocatorSlip,
    generateLocatorSlip,
  }
})
