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
import { PayrollResponse } from '@/typings/models.types.ts'
import { usePayRollStore } from '@/stores/payroll.store'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { getMonthAndYear, formatDate } from '@/utils/helpers.ts'

const router = useRouter()
const navigateToDetails = (paySlip: PayrollResponse) => {
  if (!paySlip || !paySlip.id) {
    console.error('Cannot navigate to details: Pay Slip or ID is undefined', paySlip)
    return
  }
  router.push({
    name: 'my-paySlips/editor',
    params: {
      id: paySlip.id,
    },
  })
}

const paySlipsStore = usePayRollStore()

const paySlipsIsLoading = ref(false)
const paginationLimit = 5
onBeforeMount(async () => {
  paySlipsIsLoading.value = true
  const response = await paySlipsStore.fetchPayRoll(paginationLimit)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  paySlipsIsLoading.value = false
})

const pagination = ref<ApiResponsePagination | null>(null)
const handlePaginationPageChange = async (event: PageState) => {
  const pageSelected = event.page + 1
  paySlipsIsLoading.value = true
  const response = await paySlipsStore.fetchPayRoll(paginationLimit, pageSelected)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  paySlipsIsLoading.value = false
}

const roleFilter = ref<number | null>(null)
const searchQuery = ref<string | null>(null)
const isSearching = ref(false)
watch(
  () => roleFilter.value,
  async () => {
    paySlipsIsLoading.value = true
    searchQuery.value = null
    isSearching.value = false
    const response = await paySlipsStore.fetchPayRoll(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    paySlipsIsLoading.value = false
  }
)
const searchSubmitted = ref(false)
const handleSearchPaySlip = async () => {
  paySlipsIsLoading.value = true
  searchSubmitted.value = true

  if (!searchQuery.value) {
    const response = await paySlipsStore.fetchPayRoll(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    paySlipsIsLoading.value = false
    return
  }

  const response = await paySlipsStore.searchPayRoll(searchQuery.value)
  if (response.success && response.pagination) {
    pagination.value = response.pagination

    searchQuery.value = null
  }
  paySlipsIsLoading.value = false
}

const toast = useToast()
const exportPdf = async (paySlips: PayrollResponse) => {
  toast.add({
    severity: 'info',
    summary: 'Exporting...',
    detail: `Exporting ${paySlips.period_from} - ${paySlips.period_to} || 'the Pay Slip '}...`,
    life: 5000,
  })
  const reportResponse = await paySlipsStore.generatePayRoll(String(paySlips.id))

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
      summary: 'Pay Slip Details Exported',
      detail: `The Pay Slip from ${paySlips.period_from} - ${paySlips.period_to}  was successfully exported.`,
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
          My Payslip
        </h1>
        <div class="flex w-full items-center justify-end gap-4">
          <div class="flex w-full md:w-auto lg:w-1/2">
            <InputGroup v-model="searchQuery" class="w-full">
              <InputText
                v-model="searchQuery"
                placeholder="Search via Payslip or Period"
                class="w-full"
                :disabled="paySlipsIsLoading"
                @keyup.enter="handleSearchPaySlip"
              />
              <Button icon="pi pi-search" @click="handleSearchPaySlip" />
            </InputGroup>
          </div>
        </div>
      </div>

      <div class="mt-6 flex flex-col">
        <div class="w-full">
          <div class="mx-auto flex h-full w-full flex-col">
            <DataTable :value="paySlipsStore.payRoll" class="mt-6" dataKey="id">
              <Column
                field="period"
                header="Payslip Period"
                headerClass="w-64 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="font-semibold uppercase text-surface-600">{{ getMonthAndYear(props.data.period_to) }}</p>
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
              <Column field="action" header="Actions" headerClass="w-64 bg-surface-100 opacity-70 font-bold py-2">
                <template #body="props">
                  <div class="flex gap-4 whitespace-nowrap md:w-auto">
                    <Button
                      icon="pi pi-eye"
                      v-tooltip.top="'View PaySlip'"
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
          v-if="searchSubmitted && !paySlipsIsLoading && !paySlipsStore.payRoll.length"
          class="flex h-full w-full flex-col items-center justify-center font-menu text-lg dark:text-surface-300"
        >
          <i class="pi pi-exclamation-triangle mb-2 text-2xl"></i>
          <p>No PaySlip found</p>
        </div>
        <div
          v-if="!paySlipsIsLoading && !paySlipsStore.payRoll.length && !searchSubmitted"
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
                  You have no Payslip
                </h2>
                <h1 class="mb-4 text-center text-base text-surface-600 dark:text-surface-400 sm:text-lg">
                  Payroll Payslip created by HR-PAS shall appear here.
                </h1>
              </div>
            </template>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>
