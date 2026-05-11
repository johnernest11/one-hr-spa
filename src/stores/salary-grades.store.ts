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
  const salaryGrade = ref<SalaryGradeResponse[]>([])

  const salaryGradesOptions = ref<WbAutoCompleteOption[]>([])
  const salaryGradesOptionsLoading = ref(false)

  const createSalaryGrade = async (user: Partial<SalaryGradeResponse>) => {
    const { data } = await useApiCall('/libraries/salary-grades/', authStore.authenticationToken).post(user).json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      salaryGrade.value.unshift(responseBody.data as SalaryGradeResponse)
    }

    return responseBody
  }

  const fetchSalaryGrade = async () => {
    if (salaryGradesOptions.value.length > 0) return null

    const uri = '/libraries/salary-grades'

    salaryGradesOptionsLoading.value = true
    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const res: ApiResponseBody = data.value

    if (res.success) {
      salaryGradesOptions.value = []
      const SalaryGradeListResponses = res.data as SalaryGradeResponse[]

      salaryGradesOptions.value = SalaryGradeListResponses.map((salary: SalaryGradeResponse) => ({
        value: salary.id,
        label: `SG-${salary.salary_grade}-${salary.step} FY: ${salary.effective_date} Tranche: ${salary.tranche}`,
        tranche: salary.tranche,
        salary_grade: salary.salary_grade,
        step: salary.step,
        amount: salary.amount,
      }))
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

  const searchSalaryGrade = async (query: string | null) => {
    salaryGradesOptionsLoading.value = true
    let uri = '/libraries/salary-grades/search?'
    if (query) uri += `query=${query}`

    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    salaryGradesOptionsLoading.value = false
    const res: ApiResponseBody = data.value

    if (res.success && Array.isArray(res.data)) {
      const salaryGradesListResponse = res.data as SalaryGradeResponse[]
      salaryGradesOptions.value = salaryGradesListResponse.map((salary: SalaryGradeResponse) => {
        return {
          value: salary.id,
          label: `SG-${salary.salary_grade}-${salary.step} FY: ${salary.effective_date} Tranche: ${salary.tranche}`,
          tranche: salary.tranche,
          salary_grade: salary.salary_grade,
          step: salary.step,
          amount: salary.amount,
        }
      })
    } else {
      salaryGradesOptions.value = []
    }
    return res
  }

  return {
    salaryGrade,
    salaryGradesOptions,
    createSalaryGrade,
    fetchSalaryGrade,
    fetchListSalaryGrade,
    searchSalaryGrade,
    salaryGradesOptionsLoading,
  }
})
