import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store.ts'
import { useApiCall } from '@/composables/network'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { LeaveCreditsResponse } from '@/typings/models.types'
import { leavecreditsmockData } from '@/utils/mock-data'

export type LeaveCreditsPayload = {
  type: string | null
  particular: string | null
  ut_w_pay_day: string | null
  ut_w_pay_hr: string | null
  ut_w_pay_min: string | null
  ut_day: string | null
  ut_hr: string
  ut_min: string | null
  ut_w_pay: string | null
  earned: string | null
  balance: string | null
  ut_wo_pay: string | null
  salary: string | null
  aca_pera: string | null
  leave_credits_dates: {
    start_date: string | null
    end_date: string | null
  }[]
}

export const useLeaveCreditsStore = defineStore('leave-credits', () => {
  const auth = useAuthStore()
  const leaveCredits = ref<LeaveCreditsResponse[]>([])
  const selectedLeaveCredits = ref<LeaveCreditsResponse | null>(null)

  const fetchLeaveCredits = async (limit = 10, page = 1) => {
    const start = (page - 1) * limit
    const paginated = leavecreditsmockData.slice(start, start + limit)
    leaveCredits.value = [...paginated]
    return {
      success: true,
      data: paginated,
      pagination: {
        current_page: page,
        last_page: Math.ceil(leavecreditsmockData.length / limit),
        per_page: limit,
        total: leavecreditsmockData.length,
        from: start + 1,
        to: start + paginated.length,
        first_page_url: '',
        last_page_url: '',
        next_page_url: null,
        previous_page_url: null,
        path: '',
      },
    }
  }
  const fetchLeaveCreditsById = async (id: string) => {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const foundData = leavecreditsmockData.find((item) => item.id === parseInt(id))

    const responseBody = {
      success: !!foundData,
      data: foundData || null,
      message: foundData ? 'Data fetched successfully.' : 'Record not found.',
    }

    if (responseBody.success) {
      selectedLeaveCredits.value = responseBody.data
    }

    return responseBody
  }

  const createLeaveCredits = async (leave: Partial<LeaveCreditsPayload>) => {
    const { data } = await useApiCall('/leave-credits/', auth.authenticationToken).post(leave).json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      leaveCredits.value.unshift(responseBody.data as LeaveCreditsResponse)
    }
    return responseBody
  }

  const searchLeaveCredits = async (query: string | null) => {
    let uri = '/leave-credits/search?'
    if (query) uri += `query=${query}`
    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const leaveCreditsList = responseBody.data as LeaveCreditsResponse[]
      leaveCredits.value = [...leaveCreditsList]
    }
    return responseBody
  }

  const updateLeaveCredits = async (leave: Partial<LeaveCreditsPayload>, id: string | number) => {
    const { data } = await useApiCall(`/leave-credits/${id}`, auth.authenticationToken).put(leave).json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const index = leaveCredits.value.findIndex((leaveCredits) => leaveCredits?.id === id)
      if (index === -1) return responseBody
      leaveCredits.value[index] = responseBody.data as LeaveCreditsResponse
    }
    return responseBody
  }

  return {
    leaveCredits,
    createLeaveCredits,
    fetchLeaveCredits,
    fetchLeaveCreditsById,
    searchLeaveCredits,
    updateLeaveCredits,
  }
})
