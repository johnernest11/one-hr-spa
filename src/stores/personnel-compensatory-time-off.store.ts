import { defineStore } from 'pinia'
import { useApiCall } from '@/composables/network'
import { useAuthStore } from '@/stores/auth.store.ts'
import { PersonnelCompensatoryDayTimeOffResponse } from '@/typings/models.types.ts'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { ref } from 'vue'
/** Typings for Fecthing All Compensatory CTDO Report */
export type PersonnelCompensatoryTimeOffPayload = {
  ctdo_period: string | null
  ctdo_supervisor_notes: string
  ctdo_status: string
  rows: {
    days_of_the_week: string
    work_date: string
    time_start: string | null
    time_end: string | null
    accomplishment: string | null
    authorized_claim: string | null
  }[]
}

export type PersonnelCompensatoryTimeDayOffDetailsPayload = {
  days_of_the_week: string
  work_date: string
  time_start: string | null
  time_end: string | null
  accomplishment: string | null
  authorized_claim: string | null
}

export const useCompensatoryTimeOffStore = defineStore('personnel-compensatory-time-day-off', () => {
  const auth = useAuthStore()
  const compensatory = ref<PersonnelCompensatoryDayTimeOffResponse[]>([])
  const selectedCompensatoryDayOff = ref<PersonnelCompensatoryDayTimeOffResponse | null>(null)

  let mockId = 1
  const mockData = [
    {
      id: mockId++,
      ctdo_period: '01-31 December 2025',
      ctdo_supervisor_notes: 'Reviewed and approved.',
      ctdo_status: 'Approved',
      rows: [
        {
          id: 6,
          days_of_the_week: 'Monday',
          work_date: '2025-07-01',
          time_start: '09:00',
          time_end: '17:00',
          accomplishment: 'Completed project planning.',
          authorized_claim: 'COC',
        },
        {
          id: 7,
          days_of_the_week: 'Tuesday',
          work_date: '2025-07-02',
          time_start: '09:00',
          time_end: '17:00',
          accomplishment: 'Team meeting and report writing.',
          authorized_claim: 'COC',
        },
      ],
      created_at: '2025-07-01',
      updated_at: '2025-07-01',
    },
    {
      id: mockId++,
      ctdo_period: '01-31 November 2025',
      ctdo_supervisor_notes: 'Pending approval.',
      ctdo_status: 'For Revision',
      rows: [
        {
          id: 2,
          days_of_the_week: 'Wednesday',
          work_date: '2025-07-09',
          time_start: '10:00',
          time_end: '18:00',
          accomplishment: 'Client presentation.',
          authorized_claim: 'COC',
        },
        {
          id: 3,
          days_of_the_week: 'Thursday',
          work_date: '2025-07-10',
          time_start: '09:30',
          time_end: '16:30',
          accomplishment: 'Documentation updates.',
          authorized_claim: 'COC',
        },
      ],
      created_at: '2025-07-05',
      updated_at: '2025-07-05',
    },
    {
      id: mockId++,
      ctdo_period: '01-30 October 2025',
      ctdo_supervisor_notes: 'Requires additional documentation.',
      ctdo_status: 'For Review',
      rows: [
        {
          id: 4,
          days_of_the_week: 'Friday',
          work_date: '2025-07-18',
          time_start: '08:00',
          time_end: '15:00',
          accomplishment: 'Site inspection.',
          authorized_claim: 'COC',
        },
        {
          id: 5,
          days_of_the_week: 'Saturday',
          work_date: '2025-07-19',
          time_start: '08:00',
          time_end: '15:00',
          accomplishment: 'Site inspection.',
          authorized_claim: 'COC',
        },
      ],
      created_at: '2025-07-06',
      updated_at: '2025-07-06',
    },
  ]
  const fetchCompensatoryDayTimeOff = async (limit = 10, page = 1) => {
    const start = (page - 1) * limit
    const paginated = mockData.slice(start, start + limit)
    compensatory.value = [...paginated]
    return {
      success: true,
      data: paginated,
      pagination: {
        current_page: page,
        last_page: Math.ceil(mockData.length / limit),
        per_page: limit,
        total: mockData.length,
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

  const fetchCompensatoryDayTimeOffById = async (id: string) => {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const foundData = mockData.find((item) => item.id === parseInt(id))

    const responseBody = {
      success: !!foundData,
      data: foundData || null,
      message: foundData ? 'Data fetched successfully.' : 'Record not found.',
    }

    if (responseBody.success) {
      selectedCompensatoryDayOff.value = responseBody.data
    }

    return responseBody
  }

  const createCompensatoryDayTimeOff = async (compensatoryDayOff: Partial<PersonnelCompensatoryTimeOffPayload>) => {
    const { data } = await useApiCall('/compensatory-day-time-offs/', auth.authenticationToken).post(compensatoryDayOff).json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      compensatory.value.unshift(responseBody.data as PersonnelCompensatoryDayTimeOffResponse)
    }
    return responseBody
  }

  const searchCompensatoryDayTimeOff = async (query: string | null) => {
    let uri = '/compensatory-day-time-offs/search?'
    if (query) uri += `query=${query}`
    const { data } = await useApiCall(uri, auth.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const compensatoryDayOffsList = responseBody.data as PersonnelCompensatoryDayTimeOffResponse[]
      compensatory.value = [...compensatoryDayOffsList]
    }
    return responseBody
  }

  const updateCompensatoryDayTimeOff = async (
    compensatoryTimeOff: Partial<PersonnelCompensatoryTimeOffPayload>,
    id: string | number
  ) => {
    const { data } = await useApiCall(`/compensatory-day-time-offs/${id}`, auth.authenticationToken)
      .put(compensatoryTimeOff)
      .json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const index = compensatory.value.findIndex((compensatoryTimeOff) => compensatoryTimeOff?.id === id)
      if (index === -1) return responseBody
      compensatory.value[index] = responseBody.data as PersonnelCompensatoryDayTimeOffResponse
    }
    return responseBody
  }

  const generateCompensatoryDayTimeOff = async (id: string) => {
    const response = await fetch('/mock/Compensatory-Form.docx')
    const blob = await response.blob()
    const fileNameHeader = `Compensatory-Form-${id}.docx`

    return {
      data: ref(blob),
      fileNameHeader: ref(fileNameHeader),
    }
  }

  return {
    compensatory,
    createCompensatoryDayTimeOff,
    fetchCompensatoryDayTimeOff,
    fetchCompensatoryDayTimeOffById,
    updateCompensatoryDayTimeOff,
    searchCompensatoryDayTimeOff,
    generateCompensatoryDayTimeOff,
  }
})
