import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store.ts'
import { useApiCall } from '@/composables/network'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { LocatorSlipResponse } from '@/typings/models.types'
import { locatorslipmockData } from '@/utils/mock-data'

export type LocatorSlipPayload = {
  period_covered_from: string | null
  period_covered_to: string | null
  period_request: string | null
  locator_slip_no: string | null
  status: string | null
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

      const fromDate = new Date(item.period_covered_from)
      const monthName = fromDate.toLocaleString('default', { month: 'long' }).toLowerCase()
      return (
        monthName.includes(q) ||
        item.period_covered_from.toLowerCase().includes(q) ||
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
    fetchLocatorSlipById,
    updateLocatorSlip,
    searchLocatorSlip,
    filterLocatorSlip,
    generateLocatorSlip,
  }
})
