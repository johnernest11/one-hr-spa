import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store.ts'
import { useApiCall } from '@/composables/network'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { LeaveApplicationResponse } from '@/typings/models.types'
import { useDateFormat } from '@vueuse/core'
import { applicationLeavemockData } from '@/utils/mock-data.ts'

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

  const fetchLeaveApplication = async (limit = 10, page = 1, status?: string | string[]) => {
    let filteredData = [...applicationLeavemockData]

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

    const foundData = applicationLeavemockData.find((item) => item.id === parseInt(id))

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
