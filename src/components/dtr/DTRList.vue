<script setup lang="ts">
import { onBeforeMount, ref, watch, computed } from 'vue'
import Button from 'primevue/button'
import Chip from 'primevue/chip'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import InputGroup from 'primevue/inputgroup'
import Paginator, { PageState } from 'primevue/paginator'
import { ApiResponsePagination } from '@/typings/http-resources.types.ts'
import { DailyTimeRecordResponse } from '@/typings/models.types.ts'
import { useDailyTimeRecordsStore } from '@/stores/daily-time-record.store.ts'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { formatDate } from '@/utils/helpers.ts'
import { useRoute } from 'vue-router'
const route = useRoute()
const router = useRouter()

const navigateToDetails = (dailyTimeRecord: DailyTimeRecordResponse) => {
  if (!dailyTimeRecord || !dailyTimeRecord.id) {
    console.error('Cannot navigate to details: Daily Time Record or ID is undefined', dailyTimeRecord)
    return
  }
  let targetRouteName
  if (isHumanResourceActive.value) {
    targetRouteName = 'leave-applications/editor'
  } else {
    targetRouteName = 'my-leaveapplications/editor'
  }

  router.push({
    name: targetRouteName,
    params: {
      id: dailyTimeRecord.id,
    },
  })
}

const dailyTimeRecordStore = useDailyTimeRecordsStore()

const dailyTimeRecordIsLoading = ref(false)
const paginationLimit = 5
onBeforeMount(async () => {
  dailyTimeRecordIsLoading.value = true
  const response = await dailyTimeRecordStore.fetchDailyTimeRecords(paginationLimit)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  dailyTimeRecordIsLoading.value = false
})

const pagination = ref<ApiResponsePagination | null>(null)
const fetchDailyTimeRecordBasedOnContext = async (page = 1) => {
  dailyTimeRecordIsLoading.value = true
  const statusFilter = isHumanResourceActive.value ? ['for review', 'approved'] : undefined

  const response = await dailyTimeRecordStore.fetchDailyTimeRecords(paginationLimit, page, statusFilter)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  dailyTimeRecordIsLoading.value = false
}

onBeforeMount(() => fetchDailyTimeRecordBasedOnContext())

const handlePaginationPageChange = async (event: PageState) => {
  await fetchDailyTimeRecordBasedOnContext(event.page + 1)
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
    const response = await dailyTimeRecordStore.fetchDailyTimeRecords(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    dailyTimeRecordIsLoading.value = false
  }
)
const searchSubmitted = ref(false)
const handleSearchApplicationLeave = async () => {
  dailyTimeRecordIsLoading.value = true
  searchSubmitted.value = true

  if (!searchQuery.value) {
    const response = await dailyTimeRecordStore.fetchDailyTimeRecords(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    dailyTimeRecordIsLoading.value = false
    return
  }

  const response = await dailyTimeRecordStore.searchDailyTimeRecords(searchQuery.value)
  if (response.success && response.pagination) {
    pagination.value = response.pagination

    searchQuery.value = null
  }
  dailyTimeRecordIsLoading.value = false
}

const toast = useToast()
const exportPdf = async (dailyTimeRecord: DailyTimeRecordResponse) => {
  const { date, id } = dailyTimeRecord
  toast.add({
    severity: 'info',
    summary: 'Exporting...',
    detail: `Exporting ${date}'Daily Time Record '}...`,
    life: 5000,
  })

  try {
    const reportResponse = await dailyTimeRecordStore.generateDailyTimeRecords(String(id))

    const blob = reportResponse.data.value
    const fileName = reportResponse.fileNameHeader?.value || `Daily Time Record-${id}.xlsx`

    if (blob) {
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.add({
        severity: 'success',
        summary: 'Daily Time Record Details Exported',
        detail: `The Daily Time Record from ${dailyTimeRecord.date} was successfully exported.`,
        life: 5000,
      })
    } else {
      throw new Error('Failed to generate file.')
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Export Failed',
      detail: 'There was an issue exporting the Daily Time Record. Please try again.',
      life: 5000,
    })
    console.error(error)
  }
}
const isHumanResourceActive = computed(() => route.name === 'daily-time-records')
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
          My Daily Time Record (DTR)
        </h1>
        <div class="flex w-full items-center justify-end gap-4">
          <div class="flex w-full md:w-auto lg:w-1/2">
            <InputGroup v-model="searchQuery" class="w-full">
              <InputText
                v-model="searchQuery"
                placeholder="Search via Period or Leave"
                class="w-full"
                :disabled="dailyTimeRecordIsLoading"
                @keyup.enter="handleSearchApplicationLeave"
              />
              <Button icon="pi pi-search" @click="handleSearchApplicationLeave" />
            </InputGroup>
          </div>
        </div>
      </div>
      <div class="mt-6 flex flex-col">
        <div class="w-full">
          <div class="mx-auto flex h-full w-full flex-col">
            <DataTable :value="dailyTimeRecordStore.dailyTimeRecords" class="mt-6" dataKey="id">
              <Column
                field="period"
                header="Period"
                headerClass="w-64 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="uppercase text-surface-600">{{ formatDate(props.data.date) }}</p>
                </template>
              </Column>
              <Column
                field="edited_at"
                header="Date Filed"
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
                  <template v-if="props.data.status === 'draft'">
                    <Chip
                      label="Draft"
                      class="flex items-center justify-center !bg-surface-600 px-4 py-1 font-semibold !text-surface-0"
                    >
                    </Chip>
                  </template>
                  <template v-else-if="props.data.status === 'for review'">
                    <Chip
                      label="For Review"
                      class="flex items-center justify-center !bg-success-800 px-4 py-1 font-semibold !text-surface-0"
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
                      v-tooltip.top="'View Leave Application'"
                      severity="info"
                      class="border-none text-lg font-semibold text-primary-600 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
                      text
                      @click="navigateToDetails(props.data)"
                    />
                    <Button
                      icon="pi pi-download"
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
          v-if="searchSubmitted && !dailyTimeRecordIsLoading && !dailyTimeRecordStore.dailyTimeRecords.length"
          class="flex h-full w-full flex-col items-center justify-center font-menu text-lg dark:text-surface-300"
        >
          <i class="pi pi-exclamation-triangle mb-2 text-2xl"></i>
          <p>No Daily Time Record found</p>
        </div>
        <div
          v-if="!dailyTimeRecordIsLoading && !dailyTimeRecordStore.dailyTimeRecords.length && !searchSubmitted"
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
                  You have no Daily Time Record
                </h2>
                <h1 class="mb-4 text-center text-base text-surface-600 dark:text-surface-400 sm:text-lg">
                  Daily Time Record created by you shall appear here
                </h1>
                <div class="mt-4 flex w-full justify-center">
                  <RouterLink :to="{ name: 'my-leaveapplications/store' }">
                    <Button
                      icon="pi pi-plus"
                      label="New Daily Time Record"
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
    </div>
  </div>
</template>
