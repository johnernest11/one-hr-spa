<script setup lang="ts">
import { onBeforeMount, ref, watch, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import Chip from 'primevue/chip'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import InputGroup from 'primevue/inputgroup'
import Paginator, { PageState } from 'primevue/paginator'
import { ApiResponsePagination } from '@/typings/http-resources.types.ts'
import { DailyTimeRecordResponse, ViewDailyTimeRecordResponse } from '@/typings/models.types.ts'
import { useDailyTimeRecordsStore } from '@/stores/daily-time-record.store.ts'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useRoute } from 'vue-router'
import { collapseDtrByMonth } from '@/utils/dtr-helpers'
import { usePersonnelStore } from '@/stores/personnel.store'
const route = useRoute()
const router = useRouter()
const dailyTimeRecordsStore = useDailyTimeRecordsStore()
const isLoading = ref(true)
const personnelStore = usePersonnelStore()
const selectedEmployeeId = ref<string | null>(null)
const monthlyRecords = ref<{ month: string; records: DailyTimeRecordResponse[] }[]>([])
onMounted(async () => {
  const id = (route.params.id as string) || null
  selectedEmployeeId.value = id

  isLoading.value = true

  let response
  if (id) {
    response = await dailyTimeRecordsStore.fetchDailyTimeRecordsByEmployee(id)
  } else {
    response = await dailyTimeRecordsStore.fetchDailyTimeRecords()
  }

  if (response.success && response.data) {
    monthlyRecords.value = collapseDtrByMonth(response.data as DailyTimeRecordResponse[])
  }

  isLoading.value = false
})

const currentEmployee = computed(() => {
  const employeeId = Number(route.params.id) || null
  if (!employeeId) return null

  return personnelStore.employees.find((emp) => emp.id === employeeId) ?? null
})

const navigateToDetails = (monthlyGroup: { month: string; records: DailyTimeRecordResponse[] }) => {
  if (!monthlyGroup || !monthlyGroup.month) {
    console.error('Cannot navigate to details: Month is undefined', monthlyGroup)
    return
  }

  // Parse "September 2025" → year + month
  const [monthName, yearStr] = monthlyGroup.month.split(' ')
  const year = Number(yearStr)

  // Map month names to numbers
  const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth() // e.g. "September" → 8

  let targetRouteName
  if (isHumanResourceActive.value) {
    targetRouteName = 'leave-applications/editor'
  } else {
    targetRouteName = 'my-monthly-dtrs'
  }

  // Get employee ID from route params if present
  const employeeId = route.params.id ? Number(route.params.id) : null

  router.push({
    name: targetRouteName,
    params: {
      id: employeeId,
      year: year.toString(),
      month: (monthIndex + 1).toString().padStart(2, '0'),
    },
  })
}

const dailyTimeRecordStore = useDailyTimeRecordsStore()

const dailyTimeRecordIsLoading = ref(false)

onBeforeMount(async () => {
  dailyTimeRecordIsLoading.value = true

  const employeeId = route.params.id ? String(route.params.id) : null

  let response
  if (employeeId) {
    // Fetch DTR for specific employee
    response = await dailyTimeRecordsStore.fetchDailyTimeRecordsByEmployee(employeeId)
  } else {
    // Fetch current user DTR
    response = await dailyTimeRecordsStore.fetchDailyTimeRecords()
  }

  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  dailyTimeRecordIsLoading.value = false
})

const pagination = ref<ApiResponsePagination | null>(null)
const currentPage = ref(1)
const rowsPerPage = 5
const searchResults = ref<{ month: string; records: DailyTimeRecordResponse[] }[]>([])
/****************************************************************
        Generated Current Month Records even record is Empty
*****************************************************************/
const currentYear = new Date().getFullYear()
const currentMonthIndex = new Date().getMonth()

const fullMonthlyRecords = computed(() => {
  const baseRecords = searchSubmitted.value ? searchResults.value : monthlyRecords.value

  const monthName = new Date(currentYear, currentMonthIndex).toLocaleString('default', { month: 'long' })
  const monthLabel = `${monthName} ${currentYear}`

  let monthGroup = baseRecords.find((m) => m.month === monthLabel)

  if (!monthGroup) {
    monthGroup = {
      month: monthLabel,
      records: [],
    }
    baseRecords.push(monthGroup)
  }

  return baseRecords
})

/****************************************************************
                 Show Monthly Record
*****************************************************************/
const paginatedMonthlyRecords = computed(() => {
  const start = (currentPage.value - 1) * rowsPerPage
  const end = start + rowsPerPage
  const records = fullMonthlyRecords.value.slice(start, end)
  return records
})

const handlePaginationPageChange = (event: PageState) => {
  currentPage.value = event.page + 1
}

const roleFilter = ref<number | null>(null)
const searchQuery = ref<string | null>(null)
const isSearching = ref(false)

watch(
  () => roleFilter.value,
  async () => {
    dailyTimeRecordIsLoading.value = true
    searchQuery.value = null
    isSearching.value = false
    const response = await dailyTimeRecordsStore.fetchDailyTimeRecords()
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    dailyTimeRecordIsLoading.value = false
  }
)

/****************************************************************
                  Search for Monthly  DTRs .
*****************************************************************/
const searchSubmitted = ref(false)

const handleSearchDailyTimeRecord = async () => {
  dailyTimeRecordIsLoading.value = true
  searchSubmitted.value = true

  try {
    const rawData = await dailyTimeRecordsStore.searchDailyTimeRecordsByMonthQuery(searchQuery.value)

    searchResults.value = collapseDtrByMonth(rawData) as { month: string; records: DailyTimeRecordResponse[] }[]

    searchQuery.value = null
  } catch (error: unknown) {
    console.error('Failed to fetch DTRs by month:', error)
  } finally {
    dailyTimeRecordIsLoading.value = false
  }
}

const toast = useToast()

/****************************************************************
                           Export to PDF  DTRs .
*****************************************************************/
const exportCurrentMonthDTR = (monthlyRecord: { month: string; records: DailyTimeRecordResponse[] }) => {
  if (!monthlyRecord.month) {
    console.error('Month not available in record')
    return
  }

  const [monthName, yearStr] = monthlyRecord.month.split(' ')
  if (!monthName || !yearStr) {
    console.error('Invalid month format in record')
    return
  }

  const yearNum = Number(yearStr)
  const monthNum = new Date(`${monthName} 1, ${yearNum}`).getMonth() + 1

  const pad = (n: number) => n.toString().padStart(2, '0')
  const startDateStr = `${yearNum}-${pad(monthNum)}-01`
  const endDateStr = `${yearNum}-${pad(monthNum)}-${new Date(yearNum, monthNum, 0).getDate()}`

  exportToPDF(selectedEmployeeId.value || '', startDateStr, endDateStr, yearNum, monthNum)
}

const exportToPDF = async (employeeId: string, startDate: string, endDate: string, yearNum?: number, monthNum?: number) => {
  const monthName = monthNum
    ? new Date(yearNum!, monthNum - 1).toLocaleString('default', { month: 'long' })
    : new Date(startDate).toLocaleString('default', { month: 'long' })
  const year = yearNum || new Date(startDate).getFullYear()

  toast.add({
    severity: 'info',
    summary: 'Exporting...',
    detail: `Exporting DTR of ${monthName} ${year}...`,
    life: 5000,
  })

  try {
    const reportResponse = await dailyTimeRecordsStore.generateDailyTimeRecords(employeeId, startDate, endDate)

    if (!reportResponse.data.value) {
      throw new Error('No data received from the server')
    }

    const blob = new Blob([reportResponse.data.value], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url

    a.download = reportResponse.fileNameHeader.value || `DTR-${employeeId}-${startDate}_to_${endDate}.pdf`

    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    toast.add({
      severity: 'success',
      summary: 'DTR Exported',
      detail: `The DTR for employee ${employeeId} for ${monthName} ${year} was successfully exported.`,
      life: 5000,
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Export Failed',
      detail: `Failed to export DTR: ${(error as Error).message}`,
      life: 5000,
    })
    console.error('Export error:', error)
  }
}
const isHumanResourceActive = computed(() => route.name === 'daily-time-records')

const getMonthlyStatus = (records: ViewDailyTimeRecordResponse[]): string => {
  if (!records || records.length === 0) return 'Draft'
  if (records.every((r) => r.status === 'Approved')) return 'Approved'
  if (records.some((r) => r.status === 'For Review')) return 'For Review'
  return 'Draft'
}
</script>
<template>
  <div class="flex h-full w-full flex-col shadow-md">
    <div class="h-full w-full rounded-md bg-surface-0 p-6">
      <div
        class="flex flex-row items-center space-x-4 font-medium text-primary-700 dark:text-primary-100 md:ml-4 md:mt-2 md:flex-row"
      >
        <Button
          icon="pi pi-angle-left"
          severity="secondary"
          aria-label="Bookmark"
          rounded
          @click="$router.go(-1)"
          size="small"
          class="mb-2 ml-4 md:mb-0 md:ml-0"
        />
        <h1 class="mb-2 mr-4 whitespace-nowrap text-xl text-surface-600 dark:text-primary-100 md:text-xl lg:text-4xl">
          <font-awesome-icon :icon="['fas', 'calendar']" class="h-5 text-surface-600 sm:h-6 md:h-7" />
          {{ route.params.id ? '' : 'My ' }}Daily Time Record (DTR)
          <br />
          <span v-if="currentEmployee" class="ml-4 text-lg text-surface-600 md:text-xl lg:text-2xl">
            {{ currentEmployee.last_name }} , {{ currentEmployee.first_name }} {{ currentEmployee.middle_name }}
          </span>
        </h1>

        <div class="flex w-full items-center justify-end gap-4">
          <div class="flex w-full md:w-auto lg:w-1/2">
            <InputGroup v-model="searchQuery" class="w-full">
              <InputText
                v-model="searchQuery"
                placeholder="Search via Period or Month"
                class="w-full"
                :disabled="dailyTimeRecordIsLoading"
                @keyup.enter="handleSearchDailyTimeRecord"
              />
              <Button
                icon="pi pi-search"
                :loading="dailyTimeRecordIsLoading"
                :disabled="dailyTimeRecordIsLoading"
                @click="handleSearchDailyTimeRecord"
              />
            </InputGroup>
          </div>
        </div>
      </div>
      <div class="mt-6 flex flex-col">
        <div class="w-full">
          <div class="mx-auto flex h-full w-full flex-col">
            <DataTable :value="paginatedMonthlyRecords" :loading="dailyTimeRecordIsLoading" class="mt-6" dataKey="month">
              <Column field="period" headerClass="w-64 bg-surface-100 border-surface-300 opacity-70 font-bold py-2">
                <template #header>
                  <div class="flex flex-col">
                    <span class="text-base text-surface-600">PERIOD</span>
                    <span class="text-sm font-normal text-surface-500">Month</span>
                  </div>
                </template>
                <template #body="props">
                  <div v-if="!dailyTimeRecordIsLoading">
                    <p class="uppercase text-surface-600">{{ props.data.month }}</p>
                  </div>
                </template>
              </Column>

              <Column
                field="status"
                header="STATUS"
                headerClass="w-64 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <template v-if="getMonthlyStatus(props.data.records) === 'Draft'">
                    <Chip
                      label="Draft"
                      class="flex items-center justify-center !bg-surface-600 px-4 py-1 font-semibold !text-surface-0"
                    >
                    </Chip>
                  </template>
                  <template v-else-if="getMonthlyStatus(props.data.records) === 'For Review'">
                    <Chip
                      label="For Review"
                      class="flex items-center justify-center !bg-success-800 px-4 py-1 font-semibold !text-surface-0"
                    />
                  </template>
                  <template v-else-if="getMonthlyStatus(props.data.records) === 'Approved'">
                    <Chip
                      label="Approved"
                      class="flex items-center justify-center !bg-info-800 px-4 py-1 font-semibold !text-surface-0"
                    />
                  </template>
                </template>
              </Column>
              <Column field="action" header="ACTIONS" headerClass="w-64 bg-surface-100 opacity-70 font-bold py-2">
                <template #body="props">
                  <div class="flex gap-4 whitespace-nowrap md:w-auto">
                    <Button
                      icon="pi pi-eye"
                      v-tooltip.top="'View Daily Time Record'"
                      severity="info"
                      class="border-none text-lg font-semibold text-primary-600 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
                      text
                      @click="navigateToDetails(props.data)"
                    />
                    <Button
                      icon="pi pi-download"
                      v-tooltip.top="'Download Daily Time Record'"
                      severity="info"
                      class="border-none text-lg font-semibold text-primary-600 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
                      text
                      @click="exportCurrentMonthDTR(props.data)"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
          </div>
          <!-- PAGINATION -->
          <div class="mt-6 flex w-full justify-center md:mt-10">
            <Paginator
              v-if="paginatedMonthlyRecords.length"
              :rows="rowsPerPage"
              :total-records="paginatedMonthlyRecords.length"
              template="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
              currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
              @page="handlePaginationPageChange"
              class="text-s md:text-sm"
            />
          </div>

          <!-- NO DTR FOUND FOR SELECTED MONTH -->
          <div
            v-if="searchSubmitted && !dailyTimeRecordIsLoading && paginatedMonthlyRecords.length === 0"
            class="flex h-full w-full flex-col items-center justify-center font-menu text-lg dark:text-surface-300"
          >
            <i class="pi pi-calendar-times mb-2 text-2xl"></i>
            <p>No Daily Time Record found for this month</p>
          </div>

          <div
            v-if="
              !fullMonthlyRecords &&
              !dailyTimeRecordIsLoading &&
              !dailyTimeRecordStore.dailyTimeRecords.length &&
              !searchSubmitted
            "
            class="mx-auto flex h-full w-full flex-col"
          >
            <Card class="w-full p-0 shadow-none">
              <template #content>
                <div class="flex flex-col items-center">
                  <img src="@/assets/image/undraw_filing-system.svg" class="w-96 pt-36" />
                  <h2
                    class="mb-2 mt-4 flex w-full justify-center text-center text-xl font-semibold text-surface-800 dark:text-primary-100 sm:text-2xl"
                  >
                    You have no Daily Time Record
                  </h2>
                  <h1 class="mb-4 text-center text-base text-surface-600 dark:text-surface-400 sm:text-lg">
                    Daily Time Records created by you shall appear here
                  </h1>
                </div>
              </template>
            </Card>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
