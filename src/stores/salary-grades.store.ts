import { ref } from 'vue'
import { defineStore } from 'pinia'
import { WbAutoCompleteOption } from '@/components/webkit/WbAutoComplete.vue'

export const useSalaryGradesStore = defineStore('salary-grades', () => {
  /** States */
  const salaryGradesOptions = ref<WbAutoCompleteOption[]>([])

  return {
    salaryGradesOptions,
  }
})
