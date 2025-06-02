import { defineStore } from 'pinia'
import { useApiCall } from '@/composables/network'
import { useFetchBlob } from '@/composables/fetch.blob'
import { useAuthStore } from '@/stores/auth.store.ts'
import { WorkExperienceSheetResponse } from '@/typings/models.types.ts'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { ref } from 'vue'
/** Typings for Fecthing All Work Experience Sheet */
export type WorkExperienceSheetPayload = {
  duration: string
  position: string
  name_office_unit: string
  immediate_supervisor: string
  name_agency: string | null
  list_accomplishment: string | null
  summary_duties: string | null
}

export const useWorkExperienceSheetStore = defineStore('work-experience-sheet', () => {
  const auth = useAuthStore()
  const workExperience = ref<WorkExperienceSheetResponse[]>([])
  /** States */
  const workExperienceSheetArray = ref<WorkExperienceSheetResponse[]>([])
  const selectedWorkExperienceSheet = ref<WorkExperienceSheetResponse | null>(null)
  const fetchWorkExperienceSheet = async (limit: number = 10, page: number | null = null) => {
    let uri = `/work-experience-sheets?limit=${limit}&sort=asc&`
    if (page) uri += `page=${page}`
    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const workExperienceSheetsList = Array.isArray(responseBody.data)
        ? (responseBody.data as WorkExperienceSheetResponse[])
        : []
      workExperienceSheetArray.value = [...workExperienceSheetsList]
    }
    return responseBody
  }
  const fetchWorkExperienceSheetById = async (id: string) => {
    const url = `/work-experience-sheets/${id}`
    const { data } = await useApiCall(url, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      selectedWorkExperienceSheet.value = responseBody.data as WorkExperienceSheetResponse
    }
    return responseBody
  }
  const createWorkExperienceSheet = async (workExperienceSheet: Partial<WorkExperienceSheetPayload>) => {
    const { data } = await useApiCall('/work-experience-sheets/', auth.authenticationToken).post(workExperienceSheet).json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      workExperience.value.unshift(responseBody.data as WorkExperienceSheetResponse)
    }
    return responseBody
  }
  const searchWorkExperienceSheet = async (query: string | null) => {
    let uri = '/work-experience-sheets/search?'
    if (query) uri += `query=${query}`
    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const workExperienceSheetsList = responseBody.data as WorkExperienceSheetResponse[]
      workExperienceSheetArray.value = [...workExperienceSheetsList]
    }
    return responseBody
  }
  const updateWorkExperienceSheet = async (workExperienceSheet: Partial<WorkExperienceSheetPayload>, id: string | number) => {
    const { data } = await useApiCall(`/work-experience-sheets/${id}`, auth.authenticationToken).put(workExperienceSheet).json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const index = workExperience.value.findIndex((workExperienceSheet) => workExperienceSheet?.id === id)
      if (index === -1) return responseBody
      workExperience.value[index] = responseBody.data as WorkExperienceSheetResponse
    }
    return responseBody
  }
  // store.ts
  const generateWorkExperienceSheet = async (id: string) => {
    const api_url = `/work-experience-sheets/${id}/generate`

    const { data, fileNameHeader } = await useFetchBlob(api_url, auth.authenticationToken)
    return { data, fileNameHeader }
  }

  return {
    workExperienceSheetArray,
    createWorkExperienceSheet,
    fetchWorkExperienceSheet,
    fetchWorkExperienceSheetById,
    updateWorkExperienceSheet,
    searchWorkExperienceSheet,
    generateWorkExperienceSheet,
  }
})
