import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store.ts'
import { useApiCall } from '@/composables/network'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { LocatorSlipResponse, PersonnelResponse } from '@/typings/models.types'
import { locatorslipmockData } from '@/utils/mock-data'

export type LocatorSlipPayload = {
  form_type: string
  date: string
  period: string | null
  locator_slip_no: string | null
  locator_slip_logger: LSLoggerPayload[]
}

export type LSLoggerPayload = {
  id?: number | null
  locator_slip_id: number | null
  date: string
  time_in: string | null
  time_out: string | null
  destination: string | null
  purpose: string | null
  approved_for: string | null
  duration: number | null
  remarks: string | null
}

export const useLocatorSlipStore = defineStore('locator-slip', () => {
  const auth = useAuthStore()
  const locatorSlip = ref<LocatorSlipResponse[]>([])
  const selectedlocatorSlip = ref<LocatorSlipResponse | null>(null)

  const fetchLocatorSlip = async (limit = 10, page = 1) => {
    const individual = auth.authenticatedUser.user_profile?.individual_basic_detail as PersonnelResponse
    if (!individual?.employee) {
      throw new Error('No employee data linked to current user')
    }
    let uri = `/employees/${individual.employee.id}/locator-slips?limit=${limit}&`
    if (page) uri += `page=${page}`
    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const LocatorSlipList = Array.isArray(responseBody.data) ? (responseBody.data as LocatorSlipResponse[]) : []
      locatorSlip.value = [...LocatorSlipList]
    }
    return responseBody
  }

  const fetchGroupedLocatorSlip = async (limit = 10, page = 1) => {
    let uri = `/employees/locator-slips/grouped?limit=${limit}&`
    if (page) uri += `page=${page}`
    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const LocatorSlipList = Array.isArray(responseBody.data) ? (responseBody.data as LocatorSlipResponse[]) : []
      locatorSlip.value = [...LocatorSlipList]
    }
    return responseBody
  }

  const fetchLocatorSlipById = async (id: string) => {
    const uri = `/employees/locator-slips/${id}`
    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      selectedlocatorSlip.value = responseBody.data as LocatorSlipResponse
    }
    return responseBody
  }

  const createLocatorSlip = async (locatorslip: Partial<LocatorSlipPayload>) => {
    const individual = auth.authenticatedUser.user_profile?.individual_basic_detail as PersonnelResponse
    if (!individual?.employee) {
      throw new Error('No employee data linked to current user')
    }
    const { data } = await useApiCall(`/employees/${individual.employee.id}/locator-slips`, auth.authenticationToken)
      .post(locatorslip)
      .json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      locatorSlip.value.unshift(responseBody.data as LocatorSlipResponse)
    }
    return responseBody
  }

  const updateLocatorSlip = async (locatorslip: Partial<LocatorSlipPayload>, id: string | number) => {
    const { data } = await useApiCall(`/employees/locator-slips/${id}`, auth.authenticationToken).put(locatorslip).json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const index = locatorSlip.value.findIndex((locatorslip) => locatorslip?.id === id)
      if (index === -1) return responseBody
      locatorSlip.value[index] = responseBody.data as LocatorSlipResponse
    }
    return responseBody
  }

  const searchLocatorSlip = async (query: string | null, limit = 10, page = 1) => {
    const start = (page - 1) * limit

    const filtered = locatorslipmockData.filter((item) => {
      if (!query) return true
      const q = query.toLowerCase()

      return (
        item.locator_slip_no?.toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q) ||
        item.employee_id.first_name.toLowerCase().includes(q) ||
        item.employee_id.last_name.toLowerCase().includes(q)
      )
    })

    const paginated = filtered.slice(start, start + limit)
    locatorSlip.value = [...paginated]

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

  const filterLocatorSlip = async (status: string | null, limit = 10, page = 1) => {
    const start = (page - 1) * limit
    const filtered = locatorslipmockData.filter((item) => item.status === status)
    const paginated = filtered.slice(start, start + limit)

    locatorSlip.value = [...paginated]

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
    fetchGroupedLocatorSlip,
    fetchLocatorSlipById,
    selectedlocatorSlip,
    updateLocatorSlip,
    searchLocatorSlip,
    filterLocatorSlip,
    generateLocatorSlip,
  }
})
