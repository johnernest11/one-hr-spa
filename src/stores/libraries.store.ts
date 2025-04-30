import { ref } from 'vue'
import { defineStore } from 'pinia'
import { WbAutoCompleteOption } from '@/components/webkit/WbAutoComplete.vue'

export const useLibrariesStore = defineStore('libraries', () => {
  /** States */
  const officeOptions = ref<WbAutoCompleteOption[]>([])
  const officeOptionsLoading = ref(false)

  const sexOptions = ref([
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
  ])

  const extNameOptions = ref([
    { value: null, label: '' },
    { value: 'I', label: 'I' },
    { value: 'II', label: 'II' },
    { value: 'III', label: 'III' },
    { value: 'IV', label: 'IV' },
    { value: 'V', label: 'V' },
    { value: 'VI', label: 'VI' },
    { value: 'JR', label: 'JR' },
    { value: 'SR', label: 'SR' },
  ])

  const civilStatusOptions = ref([
    { value: 'Single', label: 'Single' },
    { value: 'Married', label: 'Married' },
    { value: 'Widowed', label: 'Widowed' },
    { value: 'Divorced', label: 'Divorced' },
    { value: 'Separated', label: 'Separated' },
  ])

  const citizenshipAcquisitionOptions = ref([
    { value: 'By Birth', label: 'By Birth' },
    { value: 'By Naturalization', label: 'By Naturalization' },
  ])

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
    sexOptions,
    extNameOptions,
    civilStatusOptions,
    citizenshipAcquisitionOptions,
  }
})
