import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store.ts'
import { useApiCall } from '@/composables/network'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { DocumentRequestResponse } from '@/typings/models.types'
import { useDateFormat } from '@vueuse/core'
import { documentrequestmockData } from '@/utils/mock-data'

export type DocumentRequestPayload = {
  request_date: string | null
  certificate_type: string | number | null
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

  const fetchDocumentRequest = async (limit = 10, page = 1, status?: string | string[]) => {
    let filteredData = [...documentrequestmockData]

    // Normalize status filter
    if (status) {
      const statuses = Array.isArray(status) ? status.map((s) => s.toLowerCase()) : [status.toLowerCase()]

      filteredData = filteredData.filter((item) => statuses.includes(item.status.toLowerCase()))
    }

    const total = filteredData.length
    const start = (page - 1) * limit
    const paginated = filteredData.slice(start, start + limit)

    documentRequest.value = [...paginated]

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

  const fetchDocumentRequestById = async (id: string) => {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const foundData = documentrequestmockData.find((item) => item.id === parseInt(id))

    const responseBody = {
      success: !!foundData,
      data: foundData || null,
      message: foundData ? 'Data fetched successfully.' : 'Record not found.',
    }

    if (responseBody.success) {
      selectedDocumentRequest.value = responseBody.data
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

  const searchDocumentRequest = async (query: string | null, limit = 10, page = 1) => {
    const start = (page - 1) * limit

    const filtered = documentrequestmockData.filter((item) => {
      if (!query) return true
      const q = query.toLowerCase()

      const parts = item.request_date.split(' ')
      const formattedDate = `${parts[1]} ${parts[0]} ${parts[2]}`
      const fromDate = new Date(formattedDate)
      const monthName = fromDate.toLocaleString('default', { month: 'long' }).toLowerCase()

      return (
        monthName.includes(q) ||
        item.certificate_type.toLowerCase().includes(q) ||
        item.request_date?.toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q) ||
        item.employee_id.first_name.toLowerCase().includes(q) ||
        item.employee_id.last_name.toLowerCase().includes(q)
      )
    })

    const paginated = filtered.slice(start, start + limit)
    documentRequest.value = [...paginated]

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

  const filterDocumentRequest = async (status: string | null, limit = 10, page = 1) => {
    const start = (page - 1) * limit
    const filtered = documentrequestmockData.filter((item) => item.status === status)
    const paginated = filtered.slice(start, start + limit)

    documentRequest.value = [...paginated]

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
    updateDocumentRequest,
    searchDocumentRequest,
    filterDocumentRequest,
    generateDocumentRequest,
  }
})
