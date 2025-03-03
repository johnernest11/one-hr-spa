<script setup lang="ts">
import { onBeforeMount, ref, watch } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import InputGroup from 'primevue/inputgroup'
import Paginator, { PageState } from 'primevue/paginator'
import { ApiResponsePagination } from '@/typings/http-resources.types.ts'
import { PersonnelAccomplishmentReportResponse } from '@/typings/models.types.ts'
import { useAccomplishmentReportStore } from '@/stores/personnel-accomplishment-report.store'
import { useRouter } from 'vue-router'
const router = useRouter()
const navigateToDetails = (accomplishmentReport: PersonnelAccomplishmentReportResponse) => {
  if (!accomplishmentReport || !accomplishmentReport.id) {
    console.error('Cannot navigate to details: accomplishmentRepor or ID is undefined', accomplishmentReport)
    return
  }
  router.push({
    name: 'accomplishment-reports/editor',
    params: {
      id: accomplishmentReport.id,
    },
  })
}

const accomplishmentReportStore = useAccomplishmentReportStore()
const exportToFile = async (accomplishmentReport: PersonnelAccomplishmentReportResponse) => {
  const reportResponse = await accomplishmentReportStore.generateAccomplishmentReport(String(accomplishmentReport.id))
  // Check if reportResponse is a URL or an object
  let fileName = 'report.docx' // Default filename
  let fileUrl = ''
  if (typeof reportResponse === 'string') {
    // If it's a string, assume it's the URL and set the fileUrl directly
    fileUrl = reportResponse
  } else if (
    typeof reportResponse === 'object' &&
    reportResponse !== null &&
    'fileName' in reportResponse &&
    'fileContent' in reportResponse
  ) {
    // If it's an object, access fileName and also set the URL if applicable
    const reportData = reportResponse as { fileContent: string; fileName: string }
    fileName = reportData.fileName
    fileUrl = reportData.fileContent // Use fileContent instead of url
  }
  // Create link and initiate download
  const link = document.createElement('a')
  link.href = fileUrl // Set the href to the file URL
  link.download = fileName // Set the download filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const accomplishmentReportIsLoading = ref(false)
const paginationLimit = 5
onBeforeMount(async () => {
  accomplishmentReportIsLoading.value = true
  const response = await accomplishmentReportStore.fetchAccomplishment(paginationLimit)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  accomplishmentReportIsLoading.value = false
})
/** Pagination */
const pagination = ref<ApiResponsePagination | null>(null)
const handlePaginationPageChange = async (event: PageState) => {
  const pageSelected = event.page + 1
  accomplishmentReportIsLoading.value = true
  const response = await accomplishmentReportStore.fetchAccomplishment(paginationLimit, pageSelected)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  accomplishmentReportIsLoading.value = false
}
/** Search and Filters */
const roleFilter = ref<number | null>(null)
const searchQuery = ref<string | null>(null)
watch(
  () => roleFilter.value,
  async () => {
    accomplishmentReportIsLoading.value = true
    searchQuery.value = null
    const response = await accomplishmentReportStore.fetchAccomplishment(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    accomplishmentReportIsLoading.value = false
  }
)
const handleSearchAccomplishmentReport = async () => {
  // We do regular fetch if the query is null / empty
  accomplishmentReportIsLoading.value = true
  if (!searchQuery.value) {
    const response = await accomplishmentReportStore.fetchAccomplishment(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    return (accomplishmentReportIsLoading.value = false)
  }
  // Handle the search if the search query
  const response = await accomplishmentReportStore.searchAccomplishment(searchQuery.value)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
    searchQuery.value = null
  }
  accomplishmentReportIsLoading.value = false
}
/** End of Search and Filters */
const navigateToCreate = () => {
  router.push({ name: 'accomplishment-reports/store' })
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
    return formattedDate.replace(/^(\w+)\s(\d+),\s(\d+)$/, '$2 $1 $3') //Regex for month dd, yyyy
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
        <!-- Start Filter Create & Search Accomplishment Report Button -->
        <div
          class="my-6 flex w-full flex-col items-center justify-between gap-4 rounded-lg bg-surface-0 px-6 py-6 dark:bg-surface-800 md:my-4 md:flex-row md:px-4 md:py-4"
        >
          <h1
            class="mb-2 mr-4 whitespace-nowrap text-xl font-semibold text-primary-800 dark:text-primary-100 md:text-xl lg:text-4xl"
          >
            Accomplishment Reports
          </h1>
          <div class="flex w-full items-center justify-end gap-4">
            <div class="gap-4 whitespace-nowrap md:w-auto">
              <Button
                icon="pi pi-filter-fill"
                v-tooltip.top="'Filter Accomplishments'"
                severity="info"
                size="large"
                class="mr-2 border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100 sm:text-primary-400 md:text-primary-400 lg:text-primary-400 dark:lg:text-primary-400"
                text
                @click="$router.push({ name: 'sign-up' })"
              />
              <Button
                icon="pi pi-plus"
                v-tooltip.top="'Create Accomplishments'"
                severity="info"
                size="large"
                class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100 sm:text-primary-400 md:text-primary-400 lg:text-primary-400 dark:lg:text-primary-400"
                text
                @click="navigateToCreate"
              />
            </div>
            <div class="flex w-full md:w-auto lg:w-1/2">
              <InputGroup v-model="searchQuery" class="w-full">
                <InputText
                  v-model="searchQuery"
                  placeholder="Search via Period or Accomplishment"
                  class="w-full"
                  :disabled="accomplishmentReportIsLoading"
                  @keyup.enter="handleSearchAccomplishmentReport"
                />
                <Button
                  icon="pi pi-search"
                  @click="handleSearchAccomplishmentReport"
                  :loading="accomplishmentReportIsLoading"
                  :disabled="accomplishmentReportIsLoading"
                />
              </InputGroup>
            </div>
          </div>
        </div>
        <!-- End Filter Create & Search Accomplishment Report Button -->
        <!-- Start Data Table (Conditional Rendering) -->
        <div>
          <!-- Show Table if tableData has items -->
          <div
            v-if="
              accomplishmentReportStore.accomplishmentReportArray &&
              accomplishmentReportStore.accomplishmentReportArray.length > 0
            "
            class="mx-auto flex h-full w-full flex-col"
          >
            <DataTable :value="accomplishmentReportStore.accomplishmentReportArray" class="mt-6" dataKey="id">
              <Column
                field="period"
                header="Accomplishment Period"
                headerClass="w-64 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="font-semibold uppercase text-surface-600">{{ props.data.period }}</p>
                </template>
              </Column>
              <Column
                field="edited_at"
                header="Last Edited"
                headerClass=" w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="uppercase text-surface-600">{{ formatDate(props.data.updated_at) }}</p>
                </template>
              </Column>
              <Column
                field="status"
                header="Status"
                headerClass="w-64 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <span>{{ props.data.status.toUpperCase() }}</span>
                </template>
              </Column>
              <Column field="action" header="Actions" headerClass="w-64 bg-surface-100 opacity-70 font-bold py-2">
                <template #body="props">
                  <div class="flex gap-4 whitespace-nowrap md:w-auto">
                    <Button
                      icon="pi pi-eye"
                      v-tooltip.top="'View Accomplishment Report'"
                      severity="info"
                      class="border-none text-lg font-semibold text-primary-600 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
                      text
                      @click="navigateToDetails(props.data)"
                    />
                    <Button
                      icon="pi pi-file-word"
                      v-tooltip.top="'Export to MS Word'"
                      severity="info"
                      class="border-none text-lg font-semibold text-primary-700 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
                      text
                      @click="exportToFile(props.data)"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
            <!-- Start Pagination -->
            <div class="mt-6 flex w-full justify-center md:mt-10">
              <Paginator
                v-if="pagination && pagination.total > 0"
                :rows="pagination.per_page"
                :total-records="pagination.total"
                template="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
                @page="(event: PageState) => handlePaginationPageChange(event)"
                class="text-xs md:text-sm"
              />
            </div>
            <!-- End Pagination -->
          </div>
          <!-- End Data Table -->
          <!-- Show "No Accomplishment Report" message if tableData is empty -->
          <div v-if="!accomplishmentReportIsLoading && !pagination?.total" class="mx-auto flex h-full w-full flex-col">
            <Card class="w-full p-0 shadow-none">
              <template #content>
                <div class="flex flex-col items-center sm:flex-col md:flex-col">
                  <div><img src="@/assets/image/AR.png" class="mx-auto w-96 pt-12" /></div>
                  <h2
                    class="mb-2 mt-4 flex w-full justify-center text-xl font-semibold text-surface-800 dark:text-primary-100 sm:text-2xl"
                  >
                    You have no accomplishments
                  </h2>
                  <h1 class="mb-4 text-base text-surface-600 dark:text-surface-400 sm:text-lg">
                    Accomplishment Reports created by you shall appear here.
                  </h1>
                  <div class="mt-4 flex w-full justify-center">
                    <RouterLink :to="{ name: 'create-accomplishment-report' }" custom v-slot="{ href, navigate }">
                      <Button
                        :href="href"
                        label="New Accomplishment Report"
                        severity="primary"
                        outlined
                        @click="navigate"
                        class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100 sm:text-primary-400 md:text-primary-400 lg:text-primary-400 dark:lg:text-primary-400"
                      >
                        <template #icon>
                          <i class="pi pi-plus mr-2" />
                        </template>
                      </Button>
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
