import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApiCall } from '@/composables/network'
import { useAuthStore } from '@/stores/auth.store.ts'
import { ApiResponseBody } from '@/typings/http-resources.types'
import { PersonnelResponse, QrCodeResponse } from '@/typings/models.types.ts'

export type FilterEmployeePayload = {
  division: number | null
  section: number | null
  station?: number | null
}

export const usePersonnelStore = defineStore('personnel', () => {
  /** States */
  const authStore = useAuthStore()
  const employees = ref<PersonnelResponse[]>([])
  const employeeQrCode = ref<QrCodeResponse | null>(null)
  const isEmployeesLoading = ref<boolean>(true)

  const fetchEmployees = async (limit: number = 15, page: number | null = null) => {
    let uri = `/individual-basic-details?limit=${limit}&sort=desc&`
    if (page) uri += `page=${page}`

    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      const employeeList = responseBody.data as PersonnelResponse[]
      employees.value = [...employeeList]
    }

    return responseBody
  }
  const searchEmployees = async (query: string | null, limit: number = 5, page: number | null = null) => {
    let uri = `/individual-basic-details/search?limit=${limit}&sort=desc`

    if (page) uri += `&page=${page}`
    if (query) uri += `&query=${query}`
    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const employeeList = responseBody.data as PersonnelResponse[]
      employees.value = [...employeeList]
    }
    return responseBody
  }

  const filterEmployees = async (
    divisionId?: number | null,
    sectionOrUnitId?: number | null,
    limit: number = 5,
    page: number | null = null,
    stationId?: number | null
  ) => {
    let uri = `/individual-basic-details?limit=${limit}&sort=desc`

    if (page) uri += `&page=${page}`
    if (divisionId) uri += `&division=${divisionId}`
    if (sectionOrUnitId) uri += `&section=${sectionOrUnitId}`
    if (stationId) uri += `&office_id=${stationId}`
    console.log('Token being sent:', authStore.authenticationToken)

    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      const employeeList = responseBody.data as PersonnelResponse[]
      employees.value = [...employeeList]
    }

    return responseBody
  }

  const fetchQrCode = async (employee: number) => {
    const uri = `/employees/${employee}/qr-codes`

    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      employeeQrCode.value = responseBody.data as QrCodeResponse
    }

    return responseBody
  }

  const generateQrCode = async (employee: number) => {
    const uri = `/employees/${employee}/qr-codes`

    const { data } = await useApiCall(uri, authStore.authenticationToken).post().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      employeeQrCode.value = responseBody.data as QrCodeResponse
    }

    return responseBody
  }

  return {
    isEmployeesLoading,
    employees,
    fetchEmployees,
    searchEmployees,
    filterEmployees,
    fetchQrCode,
    generateQrCode,
  }
})
