<script setup lang="ts">
import { onBeforeMount, ref } from 'vue'
import { PayrollResponse } from '@/typings/models.types.ts'
import { usePayRollStore } from '@/stores/payroll.store'
import { useRouter } from 'vue-router'

import Button from 'primevue/button'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import InputGroup from 'primevue/inputgroup'

import Paginator, { PageState } from 'primevue/paginator'
import { ApiResponsePagination } from '@/typings/http-resources.types.ts'
import { formatPayrollPeriod } from '@/utils/helpers'
import { useToast } from 'primevue/usetoast'

const paySlipsStore = usePayRollStore()
const toast = useToast()
const router = useRouter()

const searchSubmitted = ref(false)
const paySlipsIsLoading = ref(false)

const paginationLimit = 5
const searchQuery = ref<string | null>(null)

const navigateToDetails = (paySlip: PayrollResponse) => {
  if (!paySlip || !paySlip.id) {
    console.error('Cannot navigate to details: Pay Slip or ID is undefined', paySlip)
    return
  }
  router.push({
    name: 'my-payslip/editor',
    params: {
      id: paySlip.id,
    },
  })
}

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

const exportPdf = async (paySlip: PayrollResponse) => {
  const { period, id } = paySlip

  toast.add({
    severity: 'info',
    summary: 'Exporting Pay Slip...',
    detail: `Exporting Pay Slip for the period ${period}.`,
    life: 5000,
  })

  try {
    const reportResponse = await paySlipsStore.generatePayRoll(String(id))

    const blob = reportResponse.data.value
    const fileName = reportResponse.fileNameHeader?.value || `locator-slip-${id}.pdf`

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
        summary: 'Export Successful',
        detail: `Pay Slip for ${period} was exported successfully.`,
        life: 5000,
      })
    } else {
      throw new Error('Failed to generate file.')
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Export Failed',
      detail: 'There was an issue exporting the locator slip. Please try again.',
      life: 5000,
    })
    console.error(error)
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
              <Button
                icon="pi pi-search"
                @click="handleSearchPaySlip"
                :loading="paySlipsIsLoading"
                :disabled="paySlipsIsLoading"
              />
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
                headerClass="w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="font-base uppercase text-surface-600">{{ formatPayrollPeriod(props.data.period) }}</p>
                </template>
              </Column>
              <Column
                field="edited_at"
                header="Last Edited "
                headerClass=" w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="font-base uppercase text-surface-600">{{ props.data.updated_at }}</p>
                </template>
              </Column>
              <Column field="action" header="Actions" headerClass="w-64 bg-surface-100 opacity-70 font-bold py-2">
                <template #body="props">
                  <div class="flex gap-4 whitespace-nowrap md:w-auto">
                    <Button
                      icon="pi pi-eye"
                      v-tooltip.top="'View Payroll'"
                      severity="info"
                      class="border-none text-lg font-semibold text-primary-600 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
                      text
                      @click="navigateToDetails(props.data)"
                    />
                    <Button
                      icon="pi pi-file-pdf"
                      v-tooltip.top="'Export Pay Slip'"
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
