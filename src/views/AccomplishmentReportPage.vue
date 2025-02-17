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
import { useAccomplishmentReportStore } from '@/stores/personnelAccomplishmentReport.store'
import ARViewBtn from '@/components/accomplishment-report-page/ARViewBtn.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const navigateToDetails = (accomplishmentReport: PersonnelAccomplishmentReportResponse) => {
  if (!accomplishmentReport || !accomplishmentReport.id) {
    console.error('Cannot navigate to details: accomplishmentRepor or ID is undefined', accomplishmentReport)
    return
  }
  router.push({
    name: 'accomplishment-report-view',
    params: {
      id: accomplishmentReport.id,
    },
  })
}

const accomplishmentReportStore = useAccomplishmentReportStore()
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
  const pageSelected = event.page + 1 // The page state object starts at 0

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
    searchQuery.value = null // We clear the search query
    const response = await accomplishmentReportStore.fetchAccomplishment(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    accomplishmentReportIsLoading.value = false
  }
)

const handleSearchUser = async () => {
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
  console.log('Navigating to create-accomplishment-report') // Debugging
  router
    .push({ name: 'create-accomplishment-report' })
    .then(() => console.log('Navigation successful')) // Debugging
    .catch((err) => console.error('Navigation failed:', err)) // Debugging
}
</script>

<template>
  <div class="mx-auto flex h-[100%] w-full flex-col pl-4 pt-8">
    <Card class="h-full">
      <template #content>
        <!-- Start Filter Create & Search Accomplishment Report Button -->
        <div
          class="my-6 flex w-full flex-col items-center justify-between gap-4 rounded-lg bg-surface-0 px-6 py-6 dark:bg-surface-800 md:my-4 md:flex-row md:px-4 md:py-4"
        >
          <h1 class="mb-2 mr-4 whitespace-nowrap text-xl font-semibold text-gray-800 dark:text-white md:text-xl lg:text-4xl">
            Accomplishment Reports
          </h1>
          <div class="flex w-full items-center justify-end gap-4">
            <div class="gap-4 whitespace-nowrap md:w-auto">
              <Button
                icon="pi pi-filter-fill"
                v-tooltip.top="'Filter Accomplishments'"
                severity="info"
                size="large"
                class="mr-2 border border-blue-400 text-lg font-semibold text-primary-400 dark:text-primary-100 sm:text-primary-400 md:text-primary-400 lg:text-primary-400 dark:lg:text-primary-400"
                text
                @click="$router.push({ name: 'sign-up' })"
              />

              <Button
                icon="pi pi-plus"
                v-tooltip.top="'Create Accomplishments'"
                severity="info"
                size="large"
                class="border border-blue-400 text-lg font-semibold text-primary-400 dark:text-primary-100 sm:text-primary-400 md:text-primary-400 lg:text-primary-400 dark:lg:text-primary-400"
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
                  @keyup.enter="handleSearchUser"
                />
                <Button
                  icon="pi pi-search"
                  @click="handleSearchUser"
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
            v-if="accomplishmentReportStore.accomplishmentReport && accomplishmentReportStore.accomplishmentReport.length > 0"
            class="mx-auto flex h-[100%] w-full flex-col"
          >
            <DataTable :value="accomplishmentReportStore.accomplishmentReport" class="mt-6" dataKey="id">
              <Column
                field="org_name"
                header="Accomplishment Period"
                headerClass="w-[500px] bg-gray-100 border-gray-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="font-semibold uppercase text-surface-600">{{ props.data.period }}</p>
                </template>
              </Column>
              <Column
                field="org_address"
                header="Last Edited"
                headerClass=" w-[400px] bg-gray-100 border-gray-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="uppercase text-surface-600">{{ props.data.updated_at }}</p>
                </template>
              </Column>
              <Column
                field="position_nature_of_work"
                header="Status"
                headerClass="w-[400px] bg-gray-100 border-gray-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <span>{{ props.data.status }}</span>
                </template>
              </Column>
              <Column field="action" header="Actions" headerClass="bg-gray-100 opacity-70 font-bold py-2">
                <template #body="props">
                  <div class="flex gap-4 whitespace-nowrap md:w-auto">
                    <ARViewBtn
                      :accomplishmentReport="props.data"
                      :role-filter="roleFilter"
                      class="transition-all hover:scale-105 hover:cursor-pointer hover:shadow-xl"
                    />
                    <Button
                      icon="pi pi-file-word"
                      v-tooltip.top="'Export to MS Word'"
                      severity="info"
                      class="border-none text-lg font-semibold text-primary-900 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
                      text
                      @click="navigateToDetails(props.data)"
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
          <div v-if="!accomplishmentReportIsLoading && !pagination?.total" class="mx-auto flex h-[100%] w-full flex-col">
            <Card class="w-full p-0 shadow-none">
              <template #content>
                <div class="flex flex-col items-center sm:flex-col md:flex-col">
                  <div><img src="@/assets/image/AR.png" width="500" class="mx-auto my-1" /></div>
                  <h2
                    class="mb-2 mt-4 flex w-full justify-center text-xl font-semibold text-gray-800 dark:text-white sm:text-2xl"
                  >
                    You have no accomplishments
                  </h2>
                  <h1 class="mb-4 text-base text-gray-600 dark:text-gray-400 sm:text-lg">
                    Accomplishment Reports created by you shall appear here.
                  </h1>
                  <div class="mt-4 flex w-full justify-center">
                    <Button
                      label="New Accomplishment Report"
                      severity="primary"
                      outlined
                      @click="$router.push({ name: 'create-accomplishment-report' })"
                      class="border border-blue-400 text-lg font-semibold text-primary-400 dark:text-primary-100 sm:text-primary-400 md:text-primary-400 lg:text-primary-400 dark:lg:text-primary-400"
                    >
                      <template #icon>
                        <i class="pi pi-plus mr-2" />
                      </template>
                    </Button>
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
