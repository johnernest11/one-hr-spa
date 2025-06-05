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
import { PersonnelCompensatoryDayTimeOffResponse } from '@/typings/models.types.ts'
import { useCompensatoryTimeOffStore } from '@/stores/personnel-compensatory-time-off.store.ts'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'

const router = useRouter()
const navigateToDetails = (applicationLeave: PersonnelCompensatoryDayTimeOffResponse) => {
  if (!applicationLeave || !applicationLeave.id) {
    console.error('Cannot navigate to details: Application  for Leave or ID is undefined', applicationLeave)
    return
  }
  router.push({
    name: 'ctdo-reports/editor',
    params: {
      id: applicationLeave.id,
    },
  })
}

const compensatoryDayTimeOffStore = useCompensatoryTimeOffStore()

const compensatoryDayTimeOffIsLoading = ref(false)
const paginationLimit = 5
onBeforeMount(async () => {
  compensatoryDayTimeOffIsLoading.value = true
  const response = await compensatoryDayTimeOffStore.fetchCompensatoryDayTimeOff(paginationLimit)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  compensatoryDayTimeOffIsLoading.value = false
})

const pagination = ref<ApiResponsePagination | null>(null)
const handlePaginationPageChange = async (event: PageState) => {
  const pageSelected = event.page + 1
  compensatoryDayTimeOffIsLoading.value = true
  const response = await compensatoryDayTimeOffStore.fetchCompensatoryDayTimeOff(paginationLimit, pageSelected)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  compensatoryDayTimeOffIsLoading.value = false
}

const roleFilter = ref<number | null>(null)
const searchQuery = ref<string | null>(null)
const isSearching = ref(false)
watch(
  () => roleFilter.value,
  async () => {
    compensatoryDayTimeOffIsLoading.value = true
    searchQuery.value = null
    isSearching.value = false
    const response = await compensatoryDayTimeOffStore.fetchCompensatoryDayTimeOff(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    compensatoryDayTimeOffIsLoading.value = false
  }
)
const searchSubmitted = ref(false)
const handleSearchApplicationLeave = async () => {
  compensatoryDayTimeOffIsLoading.value = true
  searchSubmitted.value = true

  if (!searchQuery.value) {
    const response = await compensatoryDayTimeOffStore.fetchCompensatoryDayTimeOff(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    compensatoryDayTimeOffIsLoading.value = false
    return
  }

  const response = await compensatoryDayTimeOffStore.searchCompensatoryDayTimeOff(searchQuery.value)
  if (response.success && response.pagination) {
    pagination.value = response.pagination

    searchQuery.value = null
  }
  compensatoryDayTimeOffIsLoading.value = false
}

const toast = useToast()
const exportPdf = async (compensatoryDayTimeOff: PersonnelCompensatoryDayTimeOffResponse) => {
  toast.add({
    severity: 'info',
    summary: 'Exporting...',
    detail: `Exporting ${compensatoryDayTimeOff.ctdo_period || 'the Compensatory Time Day Off '}...`,
    life: 5000,
  })
  const reportResponse = await compensatoryDayTimeOffStore.generateCompensatoryDayTimeOff(String(compensatoryDayTimeOff.id))

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
      summary: 'Compensatory Time Day Off Details Exported',
      detail: `The Compensatory Time Day Off from ${compensatoryDayTimeOff.ctdo_period} was successfully exported.`,
      life: 5000,
    })
  }
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
  <div class="flex h-full w-full flex-col shadow-md">
    <div class="h-full w-full rounded-md bg-surface-0 p-6">
      <div
        class="flex flex-row items-center space-x-4 font-medium text-primary-700 dark:text-primary-100 md:ml-4 md:mt-2 md:flex-row"
      >
        <h1 class="mb-2 mr-4 whitespace-nowrap text-xl text-surface-600 dark:text-primary-100 md:text-xl lg:text-4xl">
          Compensatory Day Time Offs (CTDO)
        </h1>
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
            <RouterLink :to="{ name: 'ctdo-reports/store' }">
              <Button
                icon="pi pi-plus"
                v-tooltip.top="'Create Compensatory Day Time Offs (CTDO)'"
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
                placeholder="Search via Status or Compensatory"
                class="w-full"
                :disabled="compensatoryDayTimeOffIsLoading"
                @keyup.enter="handleSearchApplicationLeave"
              />
              <Button icon="pi pi-search" @click="handleSearchApplicationLeave" />
            </InputGroup>
          </div>
        </div>
      </div>
      <div class="mx-auto flex h-full w-full flex-col">
        <DataTable :value="compensatoryDayTimeOffStore.compensatory" class="mt-6" dataKey="id">
          <Column
            field="period"
            header="Leave Period"
            headerClass="w-1/2 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
          >
            <template #body="props">
              <p class="font-semibold uppercase text-surface-600">{{ props.data.ctdo_period }}</p>
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
              <template v-if="props.data.ctdo_status === 'For Revision'">
                <Chip
                  label="For Revision"
                  class="flex items-center justify-center !bg-warn-400 px-4 py-1 font-semibold !text-surface-0"
                >
                </Chip>
              </template>
              <template v-else-if="props.data.ctdo_status === 'For Review'">
                <Chip
                  label="For Review"
                  class="flex items-center justify-center !bg-success-800 px-4 py-1 font-semibold !text-surface-0"
                />
              </template>
              <template v-else-if="props.data.ctdo_status === 'Approved'">
                <Chip
                  label="Approved"
                  class="flex items-center justify-center !bg-info-900 px-4 py-1 font-semibold !text-surface-0"
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
      v-if="searchSubmitted && !compensatoryDayTimeOffIsLoading && !compensatoryDayTimeOffStore.compensatory.length"
      class="flex h-full w-full flex-col items-center justify-center font-menu text-lg dark:text-surface-300"
    >
      <i class="pi pi-exclamation-triangle mb-2 text-2xl"></i>
      <p>No Leave Applications found</p>
    </div>
    <div
      v-if="!compensatoryDayTimeOffIsLoading && !compensatoryDayTimeOffStore.compensatory.length && !searchSubmitted"
      class="mx-auto flex h-full w-full flex-col"
    >
      <Card class="w-full p-0 shadow-none">
        <template #content>
          <div class="flex flex-col items-center">
            <div
              class="my-6 flex w-full flex-col items-center justify-between gap-4 rounded-lg bg-surface-0 px-6 py-6 dark:bg-surface-800 md:my-4 md:flex-row md:px-4 md:py-4"
            ></div>
            <div class="flex justify-center">
              <img src="@/assets/image/undraw_terms.svg" class="w-80 pt-24" />
            </div>
            <h2
              class="mb-2 mt-4 flex w-full justify-center text-center text-xl font-semibold text-surface-800 dark:text-primary-100 sm:text-2xl"
            >
              You have no CTDO Accomplishment
            </h2>
            <h1 class="mb-4 text-center text-base text-surface-600 dark:text-surface-400 sm:text-lg">
              Compensatory Day Time Offs Accomplishment created by you shall appear here.
            </h1>
            <div class="mt-4 flex w-full justify-center">
              <RouterLink :to="{ name: 'ctdo-reports/store' }">
                <Button
                  icon="pi pi-plus"
                  label="New CTDO  Accomplishment"
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
