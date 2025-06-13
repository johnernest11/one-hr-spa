import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store.ts'
import { useApiCall } from '@/composables/network'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { DocumentRequestResponse } from '@/typings/models.types'
import { useDateFormat } from '@vueuse/core'

export type DocumentRequestPayload = {
  request_date: string | null
  certificate_type: string | null
  others_type: string | null
  additional_info: string | null
  others_additional_info: string | null
  purpose: string | null
  mode_of_receipt: string | null
  status: string | null
  employee_id?: string | number | null
}

export const useDocumentRequestStore = defineStore('document-request', () => {
  const auth = useAuthStore()
  const documentRequest = ref<DocumentRequestResponse[]>([])
  const selectedDocumentRequest = ref<DocumentRequestResponse | null>(null)

  /** MOCK DATA */
  let mockId = 1
  const mockData = [
    {
      id: mockId++,
      employee_id: {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
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
      },
      request_date: '2025-06-01',
      certificate_type: 'Duly Accomplished Office Clearance Certifate Form',
      others_type: 'N/A',
      additional_info: 'N/A',
      others_additional_info: 'yes',
      purpose: 'Draft',
      status: 'Pending',
      mode_of_receipt: 'Draft',
      created_at: '2025-06-01',
      updated_at: '2025-06-01',
    },
    {
      id: mockId++,
      employee_id: {
        id: 2,
        first_name: 'Jane',
        last_name: 'Smith',
        middle_name: 'A.',
        ext_name: null,
        birthday: '1988-11-12',
        sex: 'F',
        place_of_birth: 'Town',
        civil_status: 'Married',
        height: 160,
        weight: 60,
        blood_type: 'A',
        gsis_no: '1234567890',
        pag_ibig_no: '9876543210',
        philhealth_no: '1122334455',
        sss_no: '5566778899',
        citizenship: 'Filipino',
        tin: '111-222-333',
        citizenship_acquisition: 'By birth',
        individual_address: {
          barangay: 'Barangay 2',
          city: 'Metro City',
          province: 'Metro Province',
          id: 2,
          individual_basic_detail_id: null,
          residential_house_block_lot_no: '123',
          residential_street: 'Main St.',
          residential_subdivision_village: 'Subdivision',
          residential_brgy_id: null,
          residential_citymun_id: null,
          residential_province_id: null,
          residential_region_id: null,
          residential_zip_code: '1000',
          permanent_house_block_lot_no: '123',
          permanent_street: 'Main St.',
          permanent_subdivision_village: 'Subdivision',
          permanent_brgy_id: null,
          permanent_citymun_id: null,
          permanent_province_id: null,
          permanent_region_id: null,
          permanent_zip_code: '1000',
          created_at: null,
          updated_at: null,
          deleted_at: null,
          region: null,
        },
        individual_contact_info: {
          id: '4',
          mobile_no: '09171234567',
          tel_no: '1234567',
          email_address: 'jane.smith@example.com',
          individual_basic_detail_id: null,
        },
        employee: null,
      },
      request_date: '2025-06-01',
      certificate_type: 'Certificate of Leave Without Pay',
      others_type: 'N/A',
      additional_info: 'N/A',
      others_additional_info: 'yes',
      purpose: 'Draft',
      status: 'In Progress',
      mode_of_receipt: 'Draft',
      created_at: '2025-06-01',
      updated_at: '2025-06-01',
    },
    {
      id: mockId++,
      employee_id: {
        id: 3,
        first_name: 'Mark',
        last_name: 'Johnson',
        middle_name: 'B.',
        ext_name: null,
        birthday: '1992-03-22',
        sex: 'M',
        place_of_birth: 'Cityville',
        civil_status: 'Single',
        height: 175,
        weight: 75,
        blood_type: 'B',
        gsis_no: '',
        pag_ibig_no: '',
        philhealth_no: '',
        sss_no: '',
        citizenship: 'Filipino',
        tin: '',
        citizenship_acquisition: '',
        individual_address: {
          barangay: 'Barangay 5',
          city: 'Cityville',
          province: 'Province A',
          id: 3,
          individual_basic_detail_id: null,
          residential_house_block_lot_no: '456',
          residential_street: '2nd Ave',
          residential_subdivision_village: 'Village A',
          residential_brgy_id: null,
          residential_citymun_id: null,
          residential_province_id: null,
          residential_region_id: null,
          residential_zip_code: '2000',
          permanent_house_block_lot_no: '456',
          permanent_street: '2nd Ave',
          permanent_subdivision_village: 'Village A',
          permanent_brgy_id: null,
          permanent_citymun_id: null,
          permanent_province_id: null,
          permanent_region_id: null,
          permanent_zip_code: '2000',
          created_at: null,
          updated_at: null,
          deleted_at: null,
          region: null,
        },
        individual_contact_info: {
          id: '5',
          mobile_no: '09181234567',
          tel_no: null,
          email_address: 'mark.johnson@example.com',
          individual_basic_detail_id: null,
        },
        employee: null,
      },
      request_date: '2025-06-01',
      certificate_type: 'Certifate of Employment',
      others_type: 'N/A',
      additional_info: 'N/A',
      others_additional_info: 'yes',
      purpose: 'Draft',
      status: 'Released',
      mode_of_receipt: 'Draft',
      created_at: '2025-06-01',
      updated_at: '2025-06-01',
    },
  ]

  const fetchDocumentRequest = async (limit = 10, page = 1) => {
    const start = (page - 1) * limit
    const paginated = mockData.slice(start, start + limit)
    documentRequest.value = [...paginated]
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

  const fetchDocumentRequestById = async (id: string | number) => {
    const url = `/document-requests/${id}`
    const { data } = await useApiCall(url, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      selectedDocumentRequest.value = responseBody.data as DocumentRequestResponse
    }
    return responseBody
  }

  const createDocumentRequest = async (request: Partial<DocumentRequestPayload>) => {
    const formatDate = (date: Date | string | null | undefined): string | undefined => {
      return date ? useDateFormat(date, 'YYYY-MM-DD').value.toString() : undefined
    }
    const today = new Date()
    request.request_date = formatDate(today)
    const { data } = await useApiCall('/document-requests/', auth.authenticationToken).post(request).json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      documentRequest.value.unshift(responseBody.data as DocumentRequestResponse)
    }
    return responseBody
  }

  const searchDocumentRequest = async (query: string | null) => {
    let uri = '/document-requests/search?'
    if (query) uri += `query=${query}`
    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const documentRequestsList = responseBody.data as DocumentRequestResponse[]
      documentRequest.value = [...documentRequestsList]
    }
    return responseBody
  }

  const updateDocumentRequest = async (request: Partial<DocumentRequestPayload>, id: string | number) => {
    const formatDate = (date: Date | string | null | undefined): string | undefined => {
      return date ? useDateFormat(date, 'YYYY-MM-DD').value.toString() : undefined
    }
    const today = new Date()
    request.request_date = formatDate(today)
    const { data } = await useApiCall(`/document-requests/${id}`, auth.authenticationToken).put(request).json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const index = documentRequest.value.findIndex((documentRequest) => documentRequest?.id === id)
      if (index === -1) return responseBody
      documentRequest.value[index] = responseBody.data as DocumentRequestResponse
    }
    return responseBody
  }

  const generateDocumentRequest = async (id: string) => {
    const response = await fetch('/mock/Request-Form.docx')
    const blob = await response.blob()
    const fileNameHeader = `Request-Form-${id}.docx`

    return {
      data: ref(blob),
      fileNameHeader: ref(fileNameHeader),
    }
  }

  return {
    documentRequest,
    createDocumentRequest,
    fetchDocumentRequest,
    fetchDocumentRequestById,
    searchDocumentRequest,
    updateDocumentRequest,
    generateDocumentRequest,
  }
})
