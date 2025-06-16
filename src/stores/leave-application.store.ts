import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store.ts'
import { useApiCall } from '@/composables/network'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { LeaveApplicationResponse } from '@/typings/models.types'
import { useDateFormat } from '@vueuse/core'

export type LeaveApplicationPayload = {
  date_of_filing: string | null
  others_notes: string | null
  number_of_days: string | null
  detail_of_leave: string | null
  specific_detail: string | null
  commutation: string | null
  status: string
  division_head_disapproval_notes: string | null
  days_with_pay: string | null
  days_without_pay: string | null
  disapproved_notes: string | null
  employee_id?: string | number | null
  leave_type_id: {
    title: string | null
    description: string | null
  }
  dates: {
    start_date: string | null
    end_date: string | null
  }[]
}

export const useLeaveApplicationStore = defineStore('leave-application', () => {
  const auth = useAuthStore()
  const leaveApplication = ref<LeaveApplicationResponse[]>([])
  const selectedLeaveApplication = ref<LeaveApplicationResponse | null>(null)

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
      leave_type_id: {
        id: 3,
        title: 'SICK LEAVE',
        description: 'Sec. 43, Rule XVI, Omnibus Rules Implementing E.O. No. 292',
      },
      date_of_filing: '2025-06-01',
      others_notes: 'Medical leave',
      number_of_days: '2',
      detail_of_leave: 'Fever',
      specific_detail: 'High fever and fatigue',
      commutation: 'yes',
      status: 'for review',
      division_head_disapproval_notes: null,
      days_with_pay: '2',
      days_without_pay: '0',
      disapproved_notes: null,
      dates: [
        {
          id: 1,
          leave_application_id: null,
          start_date: '2025-06-05',
          end_date: '2025-06-06',
        },
      ],
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
      leave_type_id: {
        id: 6,
        title: 'SPECIAL PRIVILEGE LEAVE',
        description: 'Sec. 21, Rule XVI, Omnibus Rules Implementing E.O. No. 292',
      },
      date_of_filing: '2025-05-15',
      others_notes: 'Family vacation',
      number_of_days: '5',
      detail_of_leave: 'Family trip',
      specific_detail: 'Traveling to hometown',
      commutation: 'no',
      status: 'for review',
      division_head_disapproval_notes: null,
      days_with_pay: '5',
      days_without_pay: '0',
      disapproved_notes: null,
      dates: [
        {
          id: 2,
          leave_application_id: null,
          start_date: '2025-06-10',
          end_date: '2025-06-14',
        },
        {
          id: 5,
          leave_application_id: null,
          start_date: '2025-06-10',
          end_date: '2025-06-14',
        },
      ],
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
      leave_type_id: {
        id: 7,
        title: 'SOLO PARENT LEAVE',
        description: 'Sec. 21, Rule XVI, Omnibus Rules Implementing E.O. No. 292',
      },
      date_of_filing: '2025-06-02',
      others_notes: 'Flu symptoms',
      number_of_days: '3',
      detail_of_leave: 'Flu',
      specific_detail: 'Cough and fever',
      commutation: 'yes',
      status: 'approved',
      division_head_disapproval_notes: null,
      days_with_pay: '3',
      days_without_pay: '0',
      disapproved_notes: null,
      dates: [
        {
          id: 3,
          leave_application_id: null,
          start_date: '2025-06-07',
          end_date: '2025-06-09',
        },
      ],
    },
  ]

  const fetchLeaveApplication = async (limit = 10, page = 1, status?: string | string[]) => {
    let filteredData = [...mockData]

    // Normalize status filter
    if (status) {
      const statuses = Array.isArray(status) ? status.map((s) => s.toLowerCase()) : [status.toLowerCase()]

      filteredData = filteredData.filter((item) => statuses.includes(item.status.toLowerCase()))
    }

    const total = filteredData.length
    const start = (page - 1) * limit
    const paginated = filteredData.slice(start, start + limit)

    leaveApplication.value = [...paginated]

    return {
      success: true,
      data: paginated,
      pagination: {
        current_page: page,
        last_page: Math.ceil(total / limit),
        per_page: limit,
        total,
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

  const fetchLeaveApplicationById = async (id: string) => {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const foundData = mockData.find((item) => item.id === parseInt(id))

    const responseBody = {
      success: !!foundData,
      data: foundData || null,
      message: foundData ? 'Data fetched successfully.' : 'Record not found.',
    }

    if (responseBody.success) {
      selectedLeaveApplication.value = responseBody.data
    }

    return responseBody
  }

  const createLeaveApplication = async (leave: Partial<LeaveApplicationPayload>) => {
    const formatDate = (date: Date | string | null | undefined): string | undefined => {
      return date ? useDateFormat(date, 'YYYY-MM-DD').value.toString() : undefined
    }
    const today = new Date()
    leave.date_of_filing = formatDate(today)
    const { data } = await useApiCall('/leave-applications/', auth.authenticationToken).post(leave).json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      leaveApplication.value.unshift(responseBody.data as LeaveApplicationResponse)
    }
    return responseBody
  }

  const searchLeaveApplication = async (query: string | null) => {
    let uri = '/leave-applications/search?'
    if (query) uri += `query=${query}`
    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const leaveApplicationsList = responseBody.data as LeaveApplicationResponse[]
      leaveApplication.value = [...leaveApplicationsList]
    }
    return responseBody
  }

  const updateLeaveApplication = async (leave: Partial<LeaveApplicationPayload>, id: string | number) => {
    const formatDate = (date: Date | string | null | undefined): string | undefined => {
      return date ? useDateFormat(date, 'YYYY-MM-DD').value.toString() : undefined
    }
    const today = new Date()
    leave.date_of_filing = formatDate(today)
    const { data } = await useApiCall(`/leave-applications/${id}`, auth.authenticationToken).put(leave).json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const index = leaveApplication.value.findIndex((leaveApplication) => leaveApplication?.id === id)
      if (index === -1) return responseBody
      leaveApplication.value[index] = responseBody.data as LeaveApplicationResponse
    }
    return responseBody
  }

  const generateLeaveApplication = async (id: string) => {
    const response = await fetch('/mock/Application-for-Leave.xlsx')
    const blob = await response.blob()
    const fileNameHeader = `Application-for-Leave-${id}.xlsx`

    return {
      data: ref(blob),
      fileNameHeader: ref(fileNameHeader),
    }
  }

  return {
    leaveApplication,
    createLeaveApplication,
    fetchLeaveApplication,
    fetchLeaveApplicationById,
    searchLeaveApplication,
    updateLeaveApplication,
    generateLeaveApplication,
  }
})
