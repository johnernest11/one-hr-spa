import { ref } from 'vue'
import { defineStore } from 'pinia'
import { WbAutoCompleteOption } from '@/components/webkit/WbAutoComplete.vue'
import { ApiResponseBody } from '@/typings/http-resources.types'
import { SalaryGradeResponse } from '@/typings/models.types'
import { useApiCall } from '@/composables/network'
import { useAuthStore } from './auth.store'

export const useSalaryGradesStore = defineStore('salary-grades', () => {
  /** States */
  const authStore = useAuthStore()
  const salaryGradesOptions = ref<WbAutoCompleteOption[]>([])
  const salaryGradesOptionsLoading = ref(false)

  const fetchSalaryGrade = async () => {
    if (salaryGradesOptions.value.length > 0) return null

    salaryGradesOptionsLoading.value = true
    const { data } = await useApiCall('/libraries/salary-grades?per_page=1000', authStore.authenticationToken).get().json()
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

  return {
    fetchSalaryGrade,
    salaryGradesOptions,
  }
})
