import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store.ts'
import { useApiCall } from '@/composables/network'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { LocatorSlipResponse } from '@/typings/models.types'
import { locatorslipmockData } from '@/utils/mock-data'

export type LocatorSlipPayload = {
  form_type: string
  month: string
  period: string | null
  locator_slip_no: string | null
  ls_logger: LSLoggerPayload[]
}

export type LSLoggerPayload = {
  id?: number | null
  locator_slip_id: number | null
  date: string
  time_in: string | null
  time_out: string | null
  destination: string | null
  purpose: string | null
  approve_for: string | null
  duration: number | null
  remarks: string | null
}

export const useLocatorSlipStore = defineStore('locator-slip', () => {
  const auth = useAuthStore()
  const locatorSlip = ref<LocatorSlipResponse[]>([])
  const selectedlocatorSlip = ref<LocatorSlipResponse | null>(null)

  const fetchLocatorSlip = async (limit = 10, page = 1) => {
    const start = (page - 1) * limit
    const paginated = locatorslipmockData.slice(start, start + limit)
    locatorSlip.value = [...paginated]
    return {
      success: true,
      data: paginated,
      pagination: {
        current_page: page,
        last_page: Math.ceil(locatorslipmockData.length / limit),
        per_page: limit,
        total: locatorslipmockData.length,
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

  const fetchGroupedLocatorSlip = async (limit = 10, page = 1) => {
    const groups = new Map()
    locatorslipmockData.forEach((slip) => {
      const employeeId = slip.employee_id.id
      if (!groups.has(employeeId)) {
        groups.set(employeeId, {
          employee: slip.employee_id,
          locatorSlips: [],
        })
      }
      groups.get(employeeId).locatorSlips.push(slip)
    })

    const groupedData = Array.from(groups.values())
    const totalGroups = groupedData.length
    const start = (page - 1) * limit
    const paginatedGroups = groupedData.slice(start, start + limit)
    locatorSlip.value = [...paginatedGroups]

    return {
      success: true,
      data: paginatedGroups,
      pagination: {
        current_page: page,
        last_page: Math.ceil(totalGroups / limit),
        per_page: limit,
        total: totalGroups,
        from: start + 1,
        to: start + paginatedGroups.length,
        first_page_url: '',
        last_page_url: '',
        next_page_url: null,
        previous_page_url: null,
        path: '',
      },
    }
  }

  const fetchLocatorSlipById = async (id: string) => {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const foundData = locatorslipmockData.find((item) => item.id === parseInt(id))

    const responseBody = {
      success: !!foundData,
      data: foundData || null,
      message: foundData ? 'Data fetched successfully.' : 'Record not found.',
    }

    if (responseBody.success) {
      selectedlocatorSlip.value = responseBody.data
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
