import { ref } from 'vue'
import { defineStore } from 'pinia'
import { WbAutoCompleteOption } from '@/components/webkit/WbAutoComplete.vue'

export const useLibrariesStore = defineStore('libraries', () => {
  /** States */
  const officeOptions = ref<WbAutoCompleteOption[]>([])
  const officeOptionsLoading = ref(false)

  const divisionOptions = ref<WbAutoCompleteOption[]>([])
  const divisionOptionsLoading = ref(false)

  const sectionUnitOptions = ref<WbAutoCompleteOption[]>([])
  const sectionUnitOptionsLoading = ref(false)

  /** Actions */

  return {
    officeOptions,
    officeOptionsLoading,
    divisionOptions,
    divisionOptionsLoading,
    sectionUnitOptions,
    sectionUnitOptionsLoading,
  }
})
