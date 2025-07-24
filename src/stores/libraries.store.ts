import { ref } from 'vue'
import { defineStore } from 'pinia'
import { WbAutoCompleteOption } from '@/components/webkit/WbAutoComplete.vue'
import { DivisionResponse, ItemNumberResponse, OfficesResponse, SectionorUnitResponse } from '@/typings/models.types'
import { ApiResponseBody } from '@/typings/http-resources.types'
import { useApiCall } from '@/composables/network'
import { useAuthStore } from './auth.store'

export const useLibrariesStore = defineStore('libraries', () => {
  /** States */
  const officeOptions = ref<WbAutoCompleteOption[]>([])
  const officeOptionsLoading = ref(false)
  const authStore = useAuthStore()
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

  const itemsOptions = ref<WbAutoCompleteOption[]>([])
  const itemsOptionsLoading = ref(false)

  const fundingSourcesOptions = ref<WbAutoCompleteOption[]>([])
  const fundingSourcesOptionsLoading = ref(false)

  const positionsOptions = ref<WbAutoCompleteOption[]>([])
  const positionsOptionsLoading = ref(false)

  const countryOptions = ref<WbAutoCompleteOption[]>([])
  const countryOptionsLoading = ref(false)

  const fetchItems = async () => {
    if (itemsOptions.value.length > 0) return null

    itemsOptionsLoading.value = true

    const { data } = await useApiCall('/items', authStore.authenticationToken).get().json()
    const res: ApiResponseBody = data.value

    if (res.success && Array.isArray(res.data)) {
      const itemsListResponse = res.data as ItemNumberResponse[]
      itemsOptions.value = [
        ...itemsListResponse.map((item) => ({
          value: item.id,
          label: item.number,
        })),
      ]
    }

    itemsOptionsLoading.value = false
    return res
  }

  const fetchOffices = async () => {
    if (officeOptions.value.length > 0) return

    officeOptionsLoading.value = true

    const { data } = await useApiCall('/libraries/offices?per_page=1000', authStore.authenticationToken).get().json()
    const res: ApiResponseBody = data.value

    if (res.success && Array.isArray(res.data)) {
      const officesList = res.data as OfficesResponse[]
      officeOptions.value = [
        ...officesList.map((office) => ({
          value: office.id,
          label: office.name,
        })),
      ]
    }

    officeOptionsLoading.value = false
    return res
  }

  const fetchDivisions = async () => {
    if (divisionOptions.value.length > 0) return null

    divisionOptionsLoading.value = true

    const { data } = await useApiCall('/libraries/divisions?per_page=1000', authStore.authenticationToken).get().json()
    const res: ApiResponseBody = data.value

    if (res.success && Array.isArray(res.data)) {
      const divisionsListResponse = res.data as DivisionResponse[]
      divisionOptions.value = [
        ...divisionsListResponse.map((division) => ({
          value: division.id,
          label: division.name,
        })),
      ]
    }

    divisionOptionsLoading.value = false
    return res
  }

  const fetchSectionUnits = async () => {
    if (sectionUnitOptions.value.length > 0) return null

    sectionUnitOptionsLoading.value = true

    const { data } = await useApiCall('/libraries/section-or-units?per_page=1000', authStore.authenticationToken).get().json()
    const res: ApiResponseBody = data.value

    if (res.success && Array.isArray(res.data)) {
      const sectionUnitsListResponse = res.data as SectionorUnitResponse[]
      sectionUnitOptions.value = [
        ...sectionUnitsListResponse.map((unit) => ({
          value: unit.id,
          label: unit.name,
        })),
      ]
    }

    sectionUnitOptionsLoading.value = false
    return res
  }

  /** Actions */

  return {
    fetchItems,
    itemsOptions,
    itemsOptionsLoading,
    fetchOffices,
    officeOptions,
    officeOptionsLoading,
    fetchDivisions,
    divisionOptions,
    divisionOptionsLoading,
    fetchSectionUnits,
    sectionUnitOptions,
    sectionUnitOptionsLoading,
    fundingSourcesOptions,
    fundingSourcesOptionsLoading,
    positionsOptions,
    positionsOptionsLoading,
    countryOptions,
    countryOptionsLoading,
    sexOptions,
    extNameOptions,
    civilStatusOptions,
    citizenshipAcquisitionOptions,
  }
})
