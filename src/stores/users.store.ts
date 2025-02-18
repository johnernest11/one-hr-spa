import { defineStore } from 'pinia'
import { useApiCall } from '@/composables/network'
import { useAuthStore } from '@/stores/auth.store.ts'
import { UserResponse } from '@/typings/models.types.ts'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { ref } from 'vue'
import { useDateFormat } from '@vueuse/core'

/** Typings */
export type UserPayload = {
  email: string
  password: string
  password_confirmation: string
  active?: boolean
  email_verified_at?: boolean
  roles: Array<number | string>
  first_name: string
  last_name: string
  middle_name?: string | null
  ext_name?: string | null
  sex?: 'male' | 'female' | null
  birthday?: string | null
  mobile_number?: string | null
  telephone_number?: string | null
  barangay_id?: string | number | null
  city_id?: string | number | null
  province_id?: string | number | null
  region_id?: string | number | null
  postal_code?: string | null
  home_address?: string | null
}

export const useUsersStore = defineStore('users', () => {
  const authStore = useAuthStore()

  /** States */
  const users = ref<UserResponse[]>([])

  /** Actions */
  const fetchUsers = async (roleFilter: string | number | null = null, limit: number = 15, page: number | null = null) => {
    let uri = `/users?limit=${limit}&sort=desc&`
    if (roleFilter) uri += `role=${roleFilter}&`
    if (page) uri += `page=${page}`

    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      const usersList = responseBody.data as UserResponse[]
      users.value = [...usersList]
    }

    return responseBody
  }

  const searchUsers = async (query: string | null) => {
    let uri = '/users/search?'
    if (query) uri += `query=${query}`

    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      const usersList = responseBody.data as UserResponse[]
      users.value = [...usersList]
    }

    return responseBody
  }

  const createUser = async (user: Partial<UserPayload>, roleFilter: string | number | null = null) => {
    // The API only accepts Y-m-d format (2024-01-31)
    if (user.birthday) {
      user.birthday = useDateFormat(user.birthday, 'YYYY-MM-DD').value.toString()
    }

    const { data } = await useApiCall('/users/', authStore.authenticationToken).post(user).json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      // check if the update is still within the role filters param
      if (user.roles?.length && (roleFilter === null || (roleFilter && user.roles.includes(roleFilter)))) {
        users.value.unshift(responseBody.data as UserResponse)
      }
    }

    return responseBody
  }

  const updateUser = async (user: Partial<UserPayload>, id: string | number, roleFilter: string | number | null = null) => {
    // The API only accepts Y-m-d format (2024-01-31)
    if (user.birthday) {
      user.birthday = useDateFormat(user.birthday, 'YYYY-MM-DD').value.toString()
    }

    const { data } = await useApiCall(`/users/${id}`, authStore.authenticationToken).patch(user).json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      const index = users.value.findIndex((user) => user.id === id)
      if (index === -1) return responseBody
      users.value[index] = responseBody.data as UserResponse

      // Check if the update is still within the role filters param
      if (user.roles?.length && roleFilter !== null && !user.roles.includes(roleFilter)) {
        users.value.splice(index, 1)
      }
    }

    return responseBody
  }

  const deleteUser = async (id: string | number) => {
    const { data, statusCode } = await useApiCall(`/users/${id}`, authStore.authenticationToken).delete().json()

    if (statusCode.value === 204) {
      users.value = users.value.filter((user) => user.id !== id)
      return { success: true, message: 'User deleted' }
    }

    return data.value as ApiResponseBody
  }

  return {
    users,
    fetchUsers,
    searchUsers,
    createUser,
    updateUser,
    deleteUser,
  }
})
