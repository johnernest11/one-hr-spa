import { ref } from 'vue'
import { defineStore } from 'pinia'
import { WbAutoCompleteOption } from '@/components/webkit/WbAutoComplete.vue'
import {
  DivisionResponse,
  ItemNumberResponse,
  OfficesResponse,
  SectionorUnitResponse,
  ProgramResponse,
} from '@/typings/models.types'
import { ApiResponseBody } from '@/typings/http-resources.types'
import { useApiCall } from '@/composables/network'
import { useAuthStore } from './auth.store'

export type OfficePayload = {
  name: string
}

export type DivisionPayload = {
  name: string
}

export type SectionorUnitPayload = {
  name: string
  division_id: string
}

export type ProgramPayload = {
  name: string
}

export const useLibrariesStore = defineStore('libraries', () => {
  /** States */
  const offices = ref<OfficesResponse[]>([])
  const divisions = ref<DivisionResponse[]>([])
  const sectionsorunits = ref<SectionorUnitResponse[]>([])
  const programs = ref<ProgramResponse[]>([])
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

  const createOffices = async (user: Partial<OfficesResponse>) => {
    const { data } = await useApiCall('/libraries/offices/', authStore.authenticationToken).post(user).json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      offices.value.unshift(responseBody.data as OfficesResponse)
    }

    return responseBody
  }

  const fetchOffices = async () => {
    if (officeOptions.value.length > 0) return

    officeOptionsLoading.value = true

    const { data } = await useApiCall('/libraries/offices?limit=1000', authStore.authenticationToken).get().json()
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

  const fetchListOffices = async (limit: number = 15, page: number | null = null) => {
    let uri = `/libraries/offices?limit=${limit}&sort=asc`
    if (page) uri += `&page=${page}`

    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      const officesList = responseBody.data as OfficesResponse[]
      offices.value = [...officesList]
    }

    return responseBody
  }

  const searchListOffices = async (query: string | null) => {
    let uri = '/libraries/offices/search?'
    if (query) uri += `query=${query}`

    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      const officesList = responseBody.data as OfficesResponse[]
      offices.value = [...officesList]
    }

    return responseBody
  }

  const createDivisions = async (user: Partial<OfficesResponse>) => {
    const { data } = await useApiCall('/divisions/offices/', authStore.authenticationToken).post(user).json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      divisions.value.unshift(responseBody.data as OfficesResponse)
    }

    return responseBody
  }

  const fetchDivisions = async () => {
    if (divisionOptions.value.length > 0) return null

    divisionOptionsLoading.value = true

    const { data } = await useApiCall('/libraries/divisions?limit=1000', authStore.authenticationToken).get().json()
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

  const fetchListDivisions = async (limit: number = 15, page: number | null = null) => {
    let uri = `/libraries/divisions?limit=${limit}&sort=asc`
    if (page) uri += `&page=${page}`

    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      const divisionsList = responseBody.data as DivisionResponse[]
      divisions.value = [...divisionsList]
    }

    return responseBody
  }

  const searchListDivisions = async (query: string | null) => {
    let uri = '/libraries/divisions/search?'
    if (query) uri += `query=${query}`

    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      const divisionsList = responseBody.data as DivisionResponse[]
      divisions.value = [...divisionsList]
    }

    return responseBody
  }

  const createSectionUnits = async (user: Partial<SectionorUnitResponse>) => {
    const { data } = await useApiCall('/divisions/section-or-units/', authStore.authenticationToken).post(user).json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      sectionsorunits.value.unshift(responseBody.data as SectionorUnitResponse)
    }

    return responseBody
  }

  const fetchSectionUnits = async () => {
    if (sectionUnitOptions.value.length > 0) return null

    sectionUnitOptionsLoading.value = true

    const { data } = await useApiCall('/libraries/section-or-units?limit=1000', authStore.authenticationToken).get().json()
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

  const fetchListSectionUnits = async (limit: number = 15, page: number | null = null) => {
    let uri = `/libraries/section-or-units?limit=${limit}&sort=asc`
    if (page) uri += `&page=${page}`

    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      const sectionorunitsList = responseBody.data as SectionorUnitResponse[]
      sectionsorunits.value = [...sectionorunitsList]
    }

    return responseBody
  }

  const searchListSectionUnits = async (query: string | null) => {
    let uri = '/libraries/section-or-units/search?'
    if (query) uri += `query=${query}`

    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      const sectionorunitsList = responseBody.data as SectionorUnitResponse[]
      sectionsorunits.value = [...sectionorunitsList]
    }

    return responseBody
  }

  const filterListSectionUnits = async (divisions: string | null) => {
    let uri = '/libraries/section-or-units'
    if (divisions) uri += `?division=${encodeURIComponent(divisions)}`
    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const sectionorunitsList = responseBody.data as SectionorUnitResponse[]
      sectionsorunits.value = [...sectionorunitsList]
    }
    return responseBody
  }

  /* Programs */

  const createPrograms = async (user: Partial<ProgramResponse>) => {
    const { data } = await useApiCall('/libraries/programs/', authStore.authenticationToken).post(user).json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      programs.value.unshift(responseBody.data as ProgramResponse)
    }

    return responseBody
  }

  const fetchListPrograms = async (limit: number = 15, page: number | null = null) => {
    let uri = `/libraries/programs?limit=${limit}&sort=asc`
    if (page) uri += `&page=${page}`

    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      const programsList = responseBody.data as ProgramResponse[]
      programs.value = [...programsList]
    }

    return responseBody
  }

  const searchListPrograms = async (query: string | null) => {
    let uri = '/libraries/programs/search?'
    if (query) uri += `query=${query}`

    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      const programsList = responseBody.data as SectionorUnitResponse[]
      programs.value = [...programsList]
    }

    return responseBody
  }

  /** Actions */
  return {
    fetchItems,
    itemsOptions,
    itemsOptionsLoading,
    offices,
    createOffices,
    fetchOffices,
    fetchListOffices,
    searchListOffices,
    officeOptions,
    officeOptionsLoading,
    divisions,
    createDivisions,
    fetchDivisions,
    fetchListDivisions,
    searchListDivisions,
    divisionOptions,
    divisionOptionsLoading,
    sectionsorunits,
    createSectionUnits,
    fetchSectionUnits,
    fetchListSectionUnits,
    searchListSectionUnits,
    filterListSectionUnits,
    sectionUnitOptions,
    sectionUnitOptionsLoading,
    programs,
    createPrograms,
    fetchListPrograms,
    searchListPrograms,
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
