<script setup lang="ts">
import { onBeforeMount, ref, watch } from 'vue'
import Button from 'primevue/button'
import Chip from 'primevue/chip'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import InputGroup from 'primevue/inputgroup'
import Paginator, { PageState } from 'primevue/paginator'
import { ApiResponsePagination } from '@/typings/http-resources.types.ts'
import { LeaveApplicationResponse } from '@/typings/models.types.ts'
import { useLeaveApplicationStore } from '@/stores/leave-application.store'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'

const router = useRouter()
const navigateToDetails = (applicationLeave: LeaveApplicationResponse) => {
  if (!applicationLeave || !applicationLeave.id) {
    console.error('Cannot navigate to details: Application  for Leave or ID is undefined', applicationLeave)
    return
  }
  router.push({
    name: 'my-leaveapplications/editor',
    params: {
      id: applicationLeave.id,
    },
  })
}

const applicationLeaveStore = useLeaveApplicationStore()

const applicationLeaveIsLoading = ref(false)
const paginationLimit = 5
onBeforeMount(async () => {
  applicationLeaveIsLoading.value = true
  const response = await applicationLeaveStore.fetchLeaveApplication(paginationLimit)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  applicationLeaveIsLoading.value = false
})

const pagination = ref<ApiResponsePagination | null>(null)
const handlePaginationPageChange = async (event: PageState) => {
  const pageSelected = event.page + 1
  applicationLeaveIsLoading.value = true
  const response = await applicationLeaveStore.fetchLeaveApplication(paginationLimit, pageSelected)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  applicationLeaveIsLoading.value = false
}

const roleFilter = ref<number | null>(null)
const searchQuery = ref<string | null>(null)
const isSearching = ref(false)
watch(
  () => roleFilter.value,
  async () => {
    applicationLeaveIsLoading.value = true
    searchQuery.value = null
    isSearching.value = false
    const response = await applicationLeaveStore.fetchLeaveApplication(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    applicationLeaveIsLoading.value = false
  }
)
const searchSubmitted = ref(false)
const handleSearchApplicationLeave = async () => {
  applicationLeaveIsLoading.value = true
  searchSubmitted.value = true

  if (!searchQuery.value) {
    const response = await applicationLeaveStore.fetchLeaveApplication(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    applicationLeaveIsLoading.value = false
    return
  }

  const response = await applicationLeaveStore.searchLeaveApplication(searchQuery.value)
  if (response.success && response.pagination) {
    pagination.value = response.pagination

    searchQuery.value = null
  }
  applicationLeaveIsLoading.value = false
}

const toast = useToast()
const exportPdf = async (leaveApplication: LeaveApplicationResponse) => {
  toast.add({
    severity: 'info',
    summary: 'Exporting...',
    detail: `Exporting ${leaveApplication.date_of_filing || 'the Leave Application '}...`,
    life: 5000,
  })
  const reportResponse = await applicationLeaveStore.generateLeaveApplication(String(leaveApplication.id))

  const blob = reportResponse.data.value // Get the Blob

  if (blob) {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportResponse.fileNameHeader.value}`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    toast.add({
      severity: 'success',
      summary: 'Leave Application Details Exported',
      detail: `The Leave Application from ${leaveApplication.date_of_filing} was successfully exported.`,
      life: 5000,
    })
  }
}

const formatDateRanges = (ranges: { start_date: string; end_date: string }[]): string => {
  if (!ranges || !Array.isArray(ranges)) return ''

  return ranges
    .map(({ start_date, end_date }) => {
      const start = new Date(start_date)
      const end = new Date(end_date)

      const sameMonthYear = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()

      const formatDay = (date: Date) => date.getDate().toString().padStart(2, '0')
      const formatMonthYear = (date: Date) => date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

      if (sameMonthYear) {
        return `${formatDay(start)} - ${formatDay(end)} ${formatMonthYear(end)}`
      } else {
        return `${formatDay(start)} ${formatMonthYear(start)} - ${formatDay(end)} ${formatMonthYear(end)}`
      }
    })
    .join(', ')
}

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      console.error('Invalid date string:', dateString)
      return 'Invalid Date'
    }
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
    const formattedDate = date.toLocaleDateString(undefined, options)
    return formattedDate.replace(/^(\w+)\s(\d+),\s(\d+)$/, '$2 $1 $3')
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Invalid Date'
  }
}
</script>
<template>
  <div class="mx-auto flex h-full w-full flex-col pl-4 pt-8">
    <Card class="h-full">
      <template #content>
        <div>
          <div class="mx-auto flex h-full w-full flex-col">
            <div class="flex w-full items-center justify-end gap-4">
              <div
                class="my-6 flex w-full flex-col items-center justify-between gap-4 rounded-lg bg-surface-0 px-6 py-6 dark:bg-surface-800 md:my-4 md:flex-row md:px-4 md:py-4"
              >
                <h1
                  class="mb-2 mr-4 whitespace-nowrap text-xl font-semibold text-primary-800 dark:text-primary-100 md:text-xl lg:text-4xl"
                >
                  My Application for Leave
                </h1>
              </div>
              <div class="flex w-full items-center justify-end gap-4">
                <div class="flex space-x-2 whitespace-nowrap md:w-auto">
                  <Button
                    icon="pi pi-filter-fill"
                    v-tooltip.top="'Filter Leave Application'"
                    severity="info"
                    size="large"
                    class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100"
                    text
                    @click="$router.push({ name: 'sign-up' })"
                  />
                  <RouterLink :to="{ name: 'my-leaveapplications/store' }">
                    <Button
                      icon="pi pi-plus"
                      v-tooltip.top="'Create Application Leave Form'"
                      severity="info"
                      size="large"
                      class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100"
                      text
                    />
                  </RouterLink>
                </div>
                <div class="flex w-full md:w-auto lg:w-1/2">
                  <InputGroup v-model="searchQuery" class="w-full">
                    <InputText
                      v-model="searchQuery"
                      placeholder="Search via Period or Leave"
                      class="w-full"
                      :disabled="applicationLeaveIsLoading"
                      @keyup.enter="handleSearchApplicationLeave"
                    />
                    <Button icon="pi pi-search" @click="handleSearchApplicationLeave" />
                  </InputGroup>
                </div>
              </div>
            </div>
            <div class="mx-auto flex h-full w-full flex-col">
              <DataTable :value="applicationLeaveStore.leaveApplication" class="mt-6" dataKey="id">
                <Column
                  field="period"
                  header="Leave Period"
                  headerClass="w-64 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
                >
                  <template #body="props">
                    <p class="font-semibold uppercase text-surface-600">{{ formatDateRanges(props.data.dates) }}</p>
                  </template>
                </Column>
                <Column
                  field="status"
                  header="Status"
                  headerClass="w-64 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
                >
                  <template #body="props">
                    <template v-if="props.data.leave_type_id.title === 'Sick Leave'">
                      <p class="uppercase text-surface-600">
                        <font-awesome-icon :icon="['fas', 'kit-medical']" /> {{ props.data.leave_type_id.title }}
                      </p>
                    </template>
                    <template v-else-if="props.data.leave_type_id.title === 'Vacation Leave'">
                      <p class="uppercase text-surface-600">
                        <font-awesome-icon :icon="['fas', 'umbrella-beach']" /> {{ props.data.leave_type_id.title }}
                      </p>
                    </template>
                    <template v-else-if="props.data.leave_type_id.title === 'Study Leave'">
                      <p class="uppercase text-surface-600">
                        <font-awesome-icon :icon="['fas', 'book']" /> {{ props.data.leave_type_id.title }}
                      </p>
                    </template>
                  </template>
                </Column>
                <Column
                  field="edited_at"
                  header="Date Filed"
                  headerClass=" w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
                >
                  <template #body="props">
                    <p class="uppercase text-surface-600">{{ formatDate(props.data.date_of_filing) }}</p>
                  </template>
                </Column>
                <Column
                  field="status"
                  header="Status"
                  headerClass="w-64 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
                >
                  <template #body="props">
                    <template v-if="props.data.status === 'Draft'">
                      <Chip
                        label="Draft"
                        class="flex items-center justify-center bg-surface-600 px-4 py-1 font-semibold text-clear-500"
                      >
                      </Chip>
                    </template>
                    <template v-else-if="props.data.status === 'Review'">
                      <Chip
                        label="For Review"
                        class="flex items-center justify-center bg-success-800 px-4 py-1 font-semibold text-clear-500"
                      />
                    </template>
                    <template v-else-if="props.data.status === 'Approved'">
                      <Chip
                        label="Approved"
                        class="flex items-center justify-center bg-info-800 px-4 py-1 font-semibold text-clear-500"
                      />
                    </template>
                  </template>
                </Column>
                <Column field="action" header="Actions" headerClass="w-64 bg-surface-100 opacity-70 font-bold py-2">
                  <template #body="props">
                    <div class="flex gap-4 whitespace-nowrap md:w-auto">
                      <Button
                        icon="pi pi-eye"
                        v-tooltip.top="'View Leave Application'"
                        severity="info"
                        class="border-none text-lg font-semibold text-primary-600 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
                        text
                        @click="navigateToDetails(props.data)"
                      />
                      <Button
                        icon="pi pi-file-pdf"
                        v-tooltip.top="'View Leave Application'"
                        severity="info"
                        class="border-none text-lg font-semibold text-primary-600 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
                        text
                        @click="exportPdf(props.data)"
                      />
                    </div>
                  </template>
                </Column>
              </DataTable>
            </div>
            <div class="mt-6 flex w-full justify-center md:mt-10">
              <Paginator
                v-if="pagination && pagination.total > 0"
                :rows="pagination.per_page"
                :total-records="pagination.total"
                template="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
                @page="(event: PageState) => handlePaginationPageChange(event)"
                class="text-s md:text-sm"
                :pt="{ pageButton: {} }"
              />
            </div>
          </div>
          <div
            v-if="searchSubmitted && !applicationLeaveIsLoading && !applicationLeaveStore.leaveApplication.length"
            class="flex h-full w-full flex-col items-center justify-center font-menu text-lg dark:text-surface-300"
          >
            <i class="pi pi-exclamation-triangle mb-2 text-2xl"></i>
            <p>No Leave Applications found</p>
          </div>
          <div
            v-if="!applicationLeaveIsLoading && !applicationLeaveStore.leaveApplication.length && !searchSubmitted"
            class="mx-auto flex h-full w-full flex-col"
          >
            <Card class="w-full p-0 shadow-none">
              <template #content>
                <div class="flex flex-col items-center">
                  <div
                    class="my-6 flex w-full flex-col items-center justify-between gap-4 rounded-lg bg-surface-0 px-6 py-6 dark:bg-surface-800 md:my-4 md:flex-row md:px-4 md:py-4"
                  ></div>
                  <div class="flex justify-center">
                    <img src="@/assets/image/undraw_filing-system.svg" class="w-96 pt-36" />
                  </div>
                  <h2
                    class="mb-2 mt-4 flex w-full justify-center text-center text-xl font-semibold text-surface-800 dark:text-primary-100 sm:text-2xl"
                  >
                    You have no Application for Leave
                  </h2>
                  <h1 class="mb-4 text-center text-base text-surface-600 dark:text-surface-400 sm:text-lg">
                    Application for Leave created by you shall appear here.
                  </h1>
                  <div class="mt-4 flex w-full justify-center">
                    <RouterLink :to="{ name: 'my-leaveapplications/store' }">
                      <Button
                        icon="pi pi-plus"
                        label="New Application for Leave"
                        severity="info"
                        size="large"
                        class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100 sm:text-primary-400 md:text-primary-400 lg:text-primary-400 dark:lg:text-primary-400"
                        text
                      />
                    </RouterLink>
                  </div>
                </div>
              </template>
            </Card>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>
