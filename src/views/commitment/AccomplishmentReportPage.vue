<script setup lang="ts">
import { onBeforeMount, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PersonnelAccomplishmentReportResponse } from '@/typings/models.types.ts'
import { useAccomplishmentReportStore } from '@/stores/personnel-accomplishment-report.store'

import Button from 'primevue/button'
import Card from 'primevue/card'
import Chip from 'primevue/chip'
import Dialog from 'primevue/dialog'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import InputGroup from 'primevue/inputgroup'
import WbDropdown from '@/components/webkit/WbDropdown.vue'

import Paginator, { PageState } from 'primevue/paginator'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { ApiResponsePagination } from '@/typings/http-resources.types.ts'
import { useToast } from 'primevue/usetoast'
import { formatDate } from '@/utils/helpers.ts'

const accomplishmentReportStore = useAccomplishmentReportStore()
const router = useRouter()
const route = useRoute()
const toast = useToast()

const accomplishmentReportIsLoading = ref(false)
const showModal = ref(false)
const searchSubmitted = ref(false)
const paginationLimit = 5

const searchQuery = ref<string | null>(null)
const selectedStatus = ref<string | null>(null)
const pagination = ref<ApiResponsePagination | null>(null)
const isSupervisorView = computed(() => route.name === 'accomplishment-report-list')

onBeforeMount(async () => {
  accomplishmentReportIsLoading.value = true
  const response = await accomplishmentReportStore.fetchAccomplishment(paginationLimit)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  accomplishmentReportIsLoading.value = false
})

const navigateToDetails = (accomplishmentReport: PersonnelAccomplishmentReportResponse) => {
  if (!accomplishmentReport || !accomplishmentReport.id) {
    console.error('Cannot navigate to details: accomplishmentRepor or ID is undefined', accomplishmentReport)
    return
  }
  let targetRouteName
  if (isSupervisorView.value) {
    targetRouteName = 'accomplishment-report-list/editor'
  } else {
    targetRouteName = 'accomplishment-reports/editor'
  }

  router.push({
    name: targetRouteName,
    params: {
      id: accomplishmentReport.id,
    },
  })
}

const statusOptions = ref([
  { label: 'Draft', value: 'draft' },
  { label: 'For Review', value: 'done' },
  { label: 'For Revision', value: 'for revision' },
  { label: 'Approved', value: 'approved' },
])

const fetchAccomplishmentsBasedOnContext = async (page = 1) => {
  accomplishmentReportIsLoading.value = true
  const statusFilter = isSupervisorView.value ? 'done' : undefined
  const response = await accomplishmentReportStore.fetchAccomplishment(paginationLimit, page, statusFilter)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  accomplishmentReportIsLoading.value = false
}

onBeforeMount(() => fetchAccomplishmentsBasedOnContext())

const handlePaginationPageChange = async (event: PageState) => {
  await fetchAccomplishmentsBasedOnContext(event.page + 1)
}

const handleSearchAccomplishmentReport = async () => {
  accomplishmentReportIsLoading.value = true
  searchSubmitted.value = true
  if (!searchQuery.value) {
    const response = await accomplishmentReportStore.fetchAccomplishment(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    return (accomplishmentReportIsLoading.value = false)
  }

  const response = await accomplishmentReportStore.searchAccomplishment(searchQuery.value)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
    searchQuery.value = null
  }
  accomplishmentReportIsLoading.value = false
}

const handleFilterAccomplishmentReport = async () => {
  accomplishmentReportIsLoading.value = true
  if (!selectedStatus.value) {
    const response = await accomplishmentReportStore.fetchAccomplishment(paginationLimit) // 5 = pagination limit
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    return (accomplishmentReportIsLoading.value = false)
  }

  const response = await accomplishmentReportStore.filterAccomplishment(selectedStatus.value)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
    searchQuery.value = null
  }

  accomplishmentReportIsLoading.value = false
  showModal.value = false
}

const exportToFile = async (accomplishmentReport: PersonnelAccomplishmentReportResponse) => {
  toast.add({
    severity: 'info',
    summary: 'Exporting...',
    detail: `Exporting ${accomplishmentReport.period || 'the Accomplishment Report '}...`,
    life: 5000,
  })
  const reportResponse = await accomplishmentReportStore.generateAccomplishmentReport(accomplishmentReport.id as string)

  const blob = reportResponse.data.value

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
      summary: 'Accomplishment Report Details Exported',
      detail: `The Accomplishment Report from ${accomplishmentReport.period} was successfully exported.`,
      life: 5000,
    })
  }
}
</script>
<template>
  <div class="flex h-full w-full flex-col shadow-md">
    <div class="h-full w-full rounded-md bg-surface-0 p-6">
      <div
        class="flex flex-row items-center space-x-4 font-medium text-primary-700 dark:text-primary-100 md:ml-4 md:mt-2 md:flex-row"
      >
        <h1 class="mb-2 mr-4 whitespace-nowrap text-xl text-surface-600 dark:text-primary-100 md:text-xl lg:text-4xl">
          Accomplishment Reports
          <br />
          <span class="ml-2 text-lg text-surface-600 md:text-xl lg:text-2xl">{{ isSupervisorView ? 'For Review' : '' }}</span>
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
              @click="showModal = true"
            />
            <RouterLink :to="{ name: 'accomplishment-reports/store' }">
              <Button
                v-if="!isSupervisorView"
                icon="pi pi-plus"
                v-tooltip.top="'Create Accomplishments'"
                severity="info"
                size="large"
                class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100 sm:text-primary-400 md:text-primary-400 lg:text-primary-400 dark:lg:text-primary-400"
                text
              />
            </RouterLink>
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
      <div class="mt-6 flex flex-col">
        <!-- Show Table if tableData has items -->
        <div
          v-if="accomplishmentReportStore.accomplishment && accomplishmentReportStore.accomplishment.length > 0"
          class="mx-auto flex h-full w-full flex-col"
        >
          <DataTable
            :value="accomplishmentReportStore.accomplishment"
            :loading="accomplishmentReportIsLoading"
            class="mt-6"
            dataKey="id"
          >
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
            <Column field="status" header="Status" headerClass="w-64 bg-surface-100 border-surface-300 opacity-70 font-bold py-2">
              <template #body="props">
                <template v-if="props.data.status === 'draft'">
                  <Chip
                    label="Draft"
                    class="flex items-center justify-center !bg-surface-500 px-4 py-1 font-semibold !text-surface-0"
                  >
                  </Chip>
                </template>
                <template v-else-if="props.data.status === 'done'">
                  <Chip
                    label="For Review"
                    class="flex items-center justify-center !bg-success-800 px-4 py-1 font-semibold !text-surface-0"
                  />
                </template>
                <template v-else-if="props.data.status === 'for revision'">
                  <Chip
                    label="For Revision"
                    class="flex items-center justify-center !bg-warn-800 px-4 py-1 font-semibold !text-surface-0"
                  />
                </template>
                <template v-else-if="props.data.status === 'approved'">
                  <Chip
                    label="Approved"
                    class="flex items-center justify-center !bg-info-800 px-4 py-1 font-semibold !text-surface-0"
                  />
                </template>
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
              template="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
              currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
              @page="(event: PageState) => handlePaginationPageChange(event)"
              class="text-s md:text-sm"
              :pt="{ pageButton: {} }"
            />
          </div>
          <!-- End Pagination -->
        </div>

        <div
          v-if="searchSubmitted && !accomplishmentReportIsLoading && !accomplishmentReportStore.accomplishment.length"
          class="flex h-full w-full flex-col items-center justify-center font-menu text-lg dark:text-surface-300"
        >
          <i class="pi pi-exclamation-triangle mb-2 text-2xl"></i>
          <p>No items found</p>
        </div>
        <!-- End Data Table -->
        <!-- Show "No Accomplishment Report" message if tableData is empty -->
        <div
          v-if="!accomplishmentReportIsLoading && !pagination?.total && !searchSubmitted"
          class="mx-auto flex h-full w-full flex-col"
        >
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
                  <RouterLink :to="{ name: 'accomplishment-reports/store' }">
                    <Button
                      label="New Accomplishment Report"
                      severity="primary"
                      outlined
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
    </div>
  </div>
  <Dialog
    v-model:visible="showModal"
    :modal="false"
    closable
    :dismissableMask="true"
    :position="'right'"
    :style="{ width: '20vw', maxWidth: '600px', minWidth: '320px' }"
    :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
    :pt="{
      root: {
        class: 'relative w-full h-full flex flex-col bg-white shadow-lg',
      },
    }"
  >
    <!-- Header -->
    <template #header>
      <div class="flex w-full items-center justify-between p-4 pb-0">
        <h1 class="text-xl font-semibold text-surface-600 dark:text-primary-100">
          <font-awesome-icon :icon="['fas', 'bars-staggered']" class="mr-2" />
          Filter and Field Options
        </h1>
      </div>
    </template>
    <!-- Scrollable Content (space reserved for footer height) -->
    <div class="flex-1 overflow-auto px-4 pb-24">
      <h2 class="mb-2 mt-4 text-sm font-medium text-surface-500 dark:text-primary-100">Filters</h2>
      <div class="mb-4">
        <WbDropdown
          v-model="selectedStatus"
          :options="statusOptions"
          optionLabel="label"
          optionValue="value"
          label="Status"
          placeholder="Select Status"
          label-class="text-sm text-start text-surface-600"
        />
      </div>
    </div>
    <!-- Fixed Footer (inside dialog container) -->
    <div
      class="absolute bottom-0 left-0 right-0 border-t border-surface-300 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900"
    >
      <div class="flex flex-col items-center justify-center gap-2 sm:flex-row">
        <Button
          label="Cancel"
          class="dark:text-secondary-100 w-full border border-surface-400 px-4 py-2 text-surface-500 dark:border-surface-700"
          @click="showModal = false"
          text
        >
          <template #icon>
            <i class="pi pi-ban mr-2 text-lg"></i>
          </template>
        </Button>
        <Button
          :loading="accomplishmentReportIsLoading"
          :disabled="accomplishmentReportIsLoading"
          @click="handleFilterAccomplishmentReport"
          label="Apply"
          class="dark:text-secondary-100 w-full border border-primary-500 px-4 py-3 text-primary-600 dark:border-surface-700"
          text
        >
          <template #icon>
            <font-awesome-icon :icon="['fas', 'check']" class="mr-2 text-lg" />
          </template>
        </Button>
      </div>
    </div>
  </Dialog>
</template>
