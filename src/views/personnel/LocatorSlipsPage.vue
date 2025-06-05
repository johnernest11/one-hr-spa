<script setup lang="ts">
import { onBeforeMount, ref, watch, computed } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import InputGroup from 'primevue/inputgroup'
import Paginator, { PageState } from 'primevue/paginator'
import { ApiResponsePagination } from '@/typings/http-resources.types.ts'
import { useAuthStore } from '@/stores/auth.store.ts'
import { LocatorSlipResponse } from '@/typings/models.types.ts'
import { useLocatorSlipStore } from '@/stores/locator-slip.store'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { getMonthAndYear, formatDateRanges, snakeCaseToTitleCase } from '@/utils/helpers.ts'

const authStore = useAuthStore()
const RoleAssignView = computed(() => {
  return authStore.authHasRequiredRole(['hr_pas_admin', 'admin', 'super_user'])
})
const router = useRouter()
const navigateToDetails = (locatorSlip: LocatorSlipResponse) => {
  if (!locatorSlip || !locatorSlip.id) {
    console.error('Cannot navigate to details: Locator Slips or ID is undefined', locatorSlip)
    return
  }
  router.push({
    name: 'my-locator-slips/editor',
    params: {
      id: locatorSlip.id,
    },
  })
}

const locatorSlipsStore = useLocatorSlipStore()

const locatorSlipsIsLoading = ref(false)
const paginationLimit = 5
onBeforeMount(async () => {
  locatorSlipsIsLoading.value = true
  const response = await locatorSlipsStore.fetchLocatorSlip(paginationLimit)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  locatorSlipsIsLoading.value = false
})

const pagination = ref<ApiResponsePagination | null>(null)
const handlePaginationPageChange = async (event: PageState) => {
  const pageSelected = event.page + 1
  locatorSlipsIsLoading.value = true
  const response = await locatorSlipsStore.fetchLocatorSlip(paginationLimit, pageSelected)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  locatorSlipsIsLoading.value = false
}

const roleFilter = ref<number | null>(null)
const searchQuery = ref<string | null>(null)
const isSearching = ref(false)
watch(
  () => roleFilter.value,
  async () => {
    locatorSlipsIsLoading.value = true
    searchQuery.value = null
    isSearching.value = false
    const response = await locatorSlipsStore.fetchLocatorSlip(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    locatorSlipsIsLoading.value = false
  }
)
const searchSubmitted = ref(false)
const handleSearchLocatorSlip = async () => {
  locatorSlipsIsLoading.value = true
  searchSubmitted.value = true

  if (!searchQuery.value) {
    const response = await locatorSlipsStore.fetchLocatorSlip(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    locatorSlipsIsLoading.value = false
    return
  }

  const response = await locatorSlipsStore.searchLocatorSlip(searchQuery.value)
  if (response.success && response.pagination) {
    pagination.value = response.pagination

    searchQuery.value = null
  }
  locatorSlipsIsLoading.value = false
}

const toast = useToast()
const exportPdf = async (locatorSlips: LocatorSlipResponse) => {
  toast.add({
    severity: 'info',
    summary: 'Exporting...',
    detail: `Exporting ${locatorSlips.period_covered_from} - ${locatorSlips.period_covered_to} || 'the Locator Slip '}...`,
    life: 5000,
  })
  const reportResponse = await locatorSlipsStore.generateLocatorSlip(String(locatorSlips.id))

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
      summary: 'Locator Slip Details Exported',
      detail: `The Locator Slip from ${locatorSlips.period_covered_from} - ${locatorSlips.period_covered_to}  was successfully exported.`,
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
        <h1
          v-if="!RoleAssignView"
          class="mb-2 mr-4 whitespace-nowrap text-xl text-surface-600 dark:text-primary-100 md:text-xl lg:text-4xl"
        >
          My Locator Slips
        </h1>

        <h1
          v-if="RoleAssignView"
          class="mb-2 mr-4 whitespace-nowrap text-xl text-surface-600 dark:text-primary-100 md:text-xl lg:text-4xl"
        >
          Locator Slips
        </h1>

        <div class="flex w-full items-center justify-end gap-4">
          <div class="gap-4 whitespace-nowrap md:w-auto">
            <Button
              icon="pi pi-filter-fill"
              v-tooltip.top="'Filter'"
              severity="info"
              size="large"
              class="mr-2 border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100 sm:text-primary-400 md:text-primary-400 lg:text-primary-400 dark:lg:text-primary-400"
              text
            />
            <Button
              icon="pi pi-file-excel"
              v-tooltip.top="'Reques Locator Slip'"
              severity="info"
              size="large"
              class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100 sm:text-primary-400 md:text-primary-400 lg:text-primary-400 dark:lg:text-primary-400"
              text
            />
          </div>
          <div class="flex w-full md:w-auto lg:w-1/2">
            <InputGroup v-model="searchQuery" class="w-full">
              <InputText
                v-model="searchQuery"
                placeholder="Search via Period or Date"
                class="w-full"
                :disabled="locatorSlipsIsLoading"
                @keyup.enter="handleSearchLocatorSlip"
              />
              <Button icon="pi pi-search" @click="handleSearchLocatorSlip" />
            </InputGroup>
          </div>
        </div>
      </div>

      <div class="mt-6 flex flex-col">
        <div class="w-full">
          <div class="mx-auto flex h-full w-full flex-col">
            <DataTable :value="locatorSlipsStore.locatorSlip" class="mt-6" dataKey="id">
              <Column
                field="period"
                header="Period Request"
                headerClass="w-64 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="font-semibold uppercase text-surface-600">
                    {{ getMonthAndYear(props.data.period_covered_from) }}
                  </p>
                  <p v-if="RoleAssignView" class="uppercase text-surface-600">
                    {{ snakeCaseToTitleCase(props.data.employee_id.first_name) }}
                    {{ snakeCaseToTitleCase(props.data.employee_id.middle_name ?? '') }}
                    {{ snakeCaseToTitleCase(props.data.employee_id.last_name) }}
                  </p>
                </template>
              </Column>
              <Column
                field="edited_at"
                header="Period Covered"
                headerClass=" w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="uppercase text-surface-600">
                    {{
                      formatDateRanges([{ start_date: props.data.period_covered_from, end_date: props.data.period_covered_to }])
                    }}
                  </p>
                </template>
              </Column>
              <Column field="action" header="Actions" headerClass="w-64 bg-surface-100 opacity-70 font-bold py-2">
                <template #body="props">
                  <div class="flex gap-4 whitespace-nowrap md:w-auto">
                    <Button
                      icon="pi pi-eye"
                      v-tooltip.top="'View LocatorSlip'"
                      severity="info"
                      class="border-none text-lg font-semibold text-primary-600 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
                      text
                      @click="navigateToDetails(props.data)"
                    />
                    <Button
                      icon="pi pi-file-pdf"
                      v-tooltip.top="'Export to PDF'"
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
          v-if="searchSubmitted && !locatorSlipsIsLoading && !locatorSlipsStore.locatorSlip.length"
          class="flex h-full w-full flex-col items-center justify-center font-menu text-lg dark:text-surface-300"
        >
          <i class="pi pi-exclamation-triangle mb-2 text-2xl"></i>
          <p>No Locator Slips found</p>
        </div>
        <div
          v-if="!locatorSlipsIsLoading && !locatorSlipsStore.locatorSlip.length && !searchSubmitted"
          class="mx-auto flex h-full w-full flex-col"
        >
          <Card class="w-full p-0 shadow-none">
            <template #content>
              <div class="flex flex-col items-center">
                <div
                  class="my-6 flex w-full flex-col items-center justify-between gap-4 rounded-lg bg-surface-0 px-6 py-6 dark:bg-surface-800 md:my-4 md:flex-row md:px-4 md:py-4"
                ></div>
                <div class="flex justify-center">
                  <img src="@/assets/image/undraw_payments.svg" class="w-96 pt-44" />
                </div>
                <h2
                  class="mb-2 mt-4 flex w-full justify-center text-center text-xl font-semibold text-surface-800 dark:text-primary-100 sm:text-2xl"
                >
                  No Locator Slip available
                </h2>
                <h1 class="mb-4 text-center text-base text-surface-600 dark:text-surface-400 sm:text-lg">
                  Locator Slip shall appear here.
                </h1>
                <div class="mt-4 flex w-full justify-center">
                  <RouterLink :to="{ name: 'my-locator-slips' }">
                    <Button
                      icon="pi pi-file-excel"
                      label="Request Locator Slip"
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
