import { ref } from 'vue'
import { defineStore } from 'pinia'
import { WbAutoCompleteOption } from '@/components/webkit/WbAutoComplete.vue'
import { ApiResponseBody } from '@/typings/http-resources.types'
import { SalaryGradeResponse } from '@/typings/models.types'
import { useApiCall } from '@/composables/network'
import { useAuthStore } from './auth.store'

export type SalaryGradePayload = {
  nbc_no: number | null
  effective_date: string | null
  tranche: number | null
  salary_grade: number | null
  step: number | null
  amount: number
}

export const useSalaryGradesStore = defineStore('salary-grades', () => {
  /** States */
  const authStore = useAuthStore()
  const salaryGradesOptions = ref<WbAutoCompleteOption[]>([])
  const salaryGradesOptionsLoading = ref(false)
  const salaryGrade = ref<SalaryGradeResponse[]>([])

  const createSalaryGrade = async (user: Partial<SalaryGradeResponse>) => {
    const { data } = await useApiCall('/libraries/salary-grades/', authStore.authenticationToken).post(user).json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      // Add new user to the beginning of the list
      salaryGrade.value.unshift(responseBody.data as SalaryGradeResponse)
    }

    return responseBody
  }

  const fetchSalaryGrade = async () => {
    if (salaryGradesOptions.value.length > 0) return null

    salaryGradesOptionsLoading.value = true
    const { data } = await useApiCall('/libraries/salary-grades?limit=1000', authStore.authenticationToken).get().json()
    const res: ApiResponseBody = data.value

    if (res.success) {
      salaryGradesOptions.value = []
      const officesListResponse = res.data as SalaryGradeResponse[]
      officesListResponse.forEach((element: SalaryGradeResponse) => {
        salaryGradesOptions.value.push({
          value: element.id,
          label: `SG-${element.salary_grade}-${element.step} FY: ${element.effective_date} Tranche: ${element.tranche}`,
        })
      })
    }

    salaryGradesOptionsLoading.value = false

    return res
  }

  const fetchListSalaryGrade = async (limit: number = 15, page: number | null = null) => {
    let uri = `/libraries/salary-grades?limit=${limit}&sort=asc`
    if (page) uri += `&page=${page}`

    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      const salaryList = responseBody.data as SalaryGradeResponse[]
      salaryGrade.value = [...salaryList]
    }

    return responseBody
  }

  const searchListSalaryGrade = async (query: string | null) => {
    let uri = '/libraries/salary-grades/search?'
    if (query) uri += `query=${query}`

    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      const salaryList = responseBody.data as SalaryGradeResponse[]
      salaryGrade.value = [...salaryList]
    }

    return responseBody
  }

  return {
    salaryGrade,
    salaryGradesOptions,
    createSalaryGrade,
    fetchSalaryGrade,
    fetchListSalaryGrade,
    searchListSalaryGrade,
  }
})
