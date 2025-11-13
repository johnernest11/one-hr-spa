import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store.ts'
import { useFetchBlob } from '@/composables/fetch.blob'
import { useApiCall } from '@/composables/network'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { LocatorSlipResponse, PersonnelResponse } from '@/typings/models.types'

export type LocatorSlipPayload = {
  form_type: string
  date: string
  period: string | null
  locator_slip_no: string | null
  auxiliary_wellness: number
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
  duration: number
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

  const searchLocatorSlip = async (query: string | null, is_pas: boolean = false, limit = 10, page: number = 1) => {
    const individual = auth.authenticatedUser.user_profile?.individual_basic_detail as PersonnelResponse
    if (!individual?.employee) {
      throw new Error('No employee data linked to current user')
    }

    const myLocUri = `/employees/${individual.employee.id}/locator-slips/search?limit=${limit}&page=${page}&`
    const pasUri = `/employees/locator-slips/search-all?limit=${limit}&page=${page}&`

    let uri = is_pas ? pasUri : myLocUri
    if (query) uri += `query=${query}`

    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()

    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const LocatorSlipList = Array.isArray(responseBody.data) ? (responseBody.data as LocatorSlipResponse[]) : []
      locatorSlip.value = [...LocatorSlipList]
    }
    return responseBody
  }

  const filterLocatorSlip = async (
    office_id?: number | null,
    division_id?: number | null,
    section_id?: number | null,
    form_type?: string | null,
    dateFilter?: string | null,
    is_pas: boolean = false,
    limit = 10,
    page: number = 1
  ) => {
    const individual = auth.authenticatedUser.user_profile?.individual_basic_detail as PersonnelResponse
    if (!individual?.employee) {
      throw new Error('No employee data linked to current user')
    }
    const myLocUri = `/employees/${individual.employee.id}/locator-slips?limit=${limit}&page=${page}&`
    const pasUri = `/employees/locator-slips/grouped?limit=${limit}&page=${page}&`

    let uri = is_pas ? pasUri : myLocUri
    if (form_type) uri += `form-type=${encodeURIComponent(form_type)}&`
    if (office_id && is_pas) uri += `office=${office_id}&`
    if (division_id && is_pas) uri += `division=${division_id}&`
    if (section_id && is_pas) uri += `section=${section_id}&`
    if (dateFilter) uri += `date-filter=${dateFilter}&`

    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      const LocatorSlipList = Array.isArray(responseBody.data) ? (responseBody.data as LocatorSlipResponse[]) : []
      locatorSlip.value = [...LocatorSlipList]
    }
    return responseBody
  }

  const generateLocatorSlip = async (id: string) => {
    const individual = auth.authenticatedUser.user_profile?.individual_basic_detail as PersonnelResponse
    if (!individual?.employee) {
      throw new Error('No employee data linked to current user')
    }
    const api_url = `/employees/${individual.employee.id}/locator-slips/${id}/generate`

    const { data, fileNameHeader } = await useFetchBlob(api_url, auth.authenticationToken)
    return { data, fileNameHeader }
  }

  const checkActiveLog = async () => {
    const individual = auth.authenticatedUser.user_profile?.individual_basic_detail as PersonnelResponse
    if (!individual?.employee) {
      throw new Error('No employee data linked to current user')
    }
    const { data } = await useApiCall(`/employees/${individual.employee.id}/locator-slips/active`, auth.authenticationToken)
      .get()
      .json()
    const responseBody: ApiResponseBody = data.value

    return responseBody
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
    checkActiveLog,
  }
})
