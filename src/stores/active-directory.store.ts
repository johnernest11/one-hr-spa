import { defineStore } from 'pinia'
import { useApiCall } from '@/composables/network'
import { useAuthStore } from '@/stores/auth.store.ts'
import { ActiveDiretoryResponse } from '@/typings/models.types.ts'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { ref } from 'vue'
import { WbAutoCompleteOption } from '@/components/webkit/WbAutoComplete.vue'
/** Typings */
export type ADPayload = {
  guid: string
  name: string
  username: string
  email: string
  password: string
  password_confirmation: string
  active?: boolean
  email_verified_at?: boolean
}

export const useActiveDirectoryStore = defineStore('active-directory', () => {
  const authStore = useAuthStore()
  const activeDirectory = ref<ActiveDiretoryResponse[]>([])
  const employeeOptions = ref<WbAutoCompleteOption[]>([])
  const employeeOptionsLoading = ref(false)
  /** States */

  /** Actions */
  const fetchUsers = async (limit: number = 15, page: number | null = null) => {
    let uri = `/users?limit=${limit}&sort=asc`
    if (page) uri += `&page=${page}`

    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      const usersList = responseBody.data as ActiveDiretoryResponse[]
      activeDirectory.value = [...usersList]
    }

    return responseBody
  }

  const searchUsers = async (query: string | null) => {
    let uri = '/users/search?'
    if (query) uri += `query=${query}`

    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      const usersList = responseBody.data as ActiveDiretoryResponse[]
      activeDirectory.value = [...usersList]
    }

    return responseBody
  }

  const createUser = async (user: Partial<ADPayload>) => {
    const { data } = await useApiCall('/users/', authStore.authenticationToken).post(user).json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      // Add new user to the beginning of the list
      activeDirectory.value.unshift(responseBody.data as ActiveDiretoryResponse)
    }

    return responseBody
  }

  const updateUser = async (user: Partial<ADPayload>, id: string | number) => {
    const { data } = await useApiCall(`/users/${id}`, authStore.authenticationToken).patch(user).json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      const index = activeDirectory.value.findIndex((user) => user.id === id)
      if (index === -1) return responseBody
      activeDirectory.value[index] = responseBody.data as ActiveDiretoryResponse
    }

    return responseBody
  }

  const deleteUser = async (id: string | number) => {
    const { data, statusCode } = await useApiCall(`/users/${id}`, authStore.authenticationToken).delete().json()

    if (statusCode.value === 204) {
      activeDirectory.value = activeDirectory.value.filter((activeDirectory) => activeDirectory.id !== id)
      return { success: true, message: 'User deleted' }
    }

    return data.value as ApiResponseBody
  }

  return {
    activeDirectory,
    employeeOptions,
    employeeOptionsLoading,
    createUser,
    fetchUsers,
    searchUsers,
    updateUser,
    deleteUser,
  }
})
