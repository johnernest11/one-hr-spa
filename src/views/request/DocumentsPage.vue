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
import { DocumentRequestResponse } from '@/typings/models.types.ts'
import { useAuthStore } from '@/stores/auth.store.ts'
import { useDocumentRequestStore } from '@/stores/document-request.store'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { formatDate } from '@/utils/helpers.ts'

const authStore = useAuthStore()
const RoleAssignView = computed(() => {
  return authStore.authHasRequiredRole(['hr_pas_admin', 'admin'])
})

const filteredDocumentRequests = computed(() => {
  if (RoleAssignView.value) {
    // Show only approved if user has restricted roles
    return documentRequestStore.documentRequest.filter((app) => ['In Progress', 'Released'].includes(app.status ?? ''))
  }
  // Otherwise show all
  return documentRequestStore.documentRequest
})
const router = useRouter()
const navigateToDetails = (documentRequest: DocumentRequestResponse) => {
  if (!documentRequest || !documentRequest.id) {
    console.error('Cannot navigate to details: Application  for Leave or ID is undefined', documentRequest)
    return
  }
  router.push({
    name: 'my-leaveapplications/editor',
    params: {
      id: documentRequest.id,
    },
  })
}

const documentRequestStore = useDocumentRequestStore()

const documentRequestIsLoading = ref(false)
const paginationLimit = 5
onBeforeMount(async () => {
  documentRequestIsLoading.value = true
  const response = await documentRequestStore.fetchDocumentRequest(paginationLimit)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  documentRequestIsLoading.value = false
})

const pagination = ref<ApiResponsePagination | null>(null)
const handlePaginationPageChange = async (event: PageState) => {
  const pageSelected = event.page + 1
  documentRequestIsLoading.value = true
  const response = await documentRequestStore.fetchDocumentRequest(paginationLimit, pageSelected)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  documentRequestIsLoading.value = false
}

const roleFilter = ref<number | null>(null)
const searchQuery = ref<string | null>(null)
const isSearching = ref(false)
watch(
  () => roleFilter.value,
  async () => {
    documentRequestIsLoading.value = true
    searchQuery.value = null
    isSearching.value = false
    const response = await documentRequestStore.fetchDocumentRequest(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    documentRequestIsLoading.value = false
  }
)
const searchSubmitted = ref(false)
const handleSearchdocumentRequest = async () => {
  documentRequestIsLoading.value = true
  searchSubmitted.value = true

  if (!searchQuery.value) {
    const response = await documentRequestStore.fetchDocumentRequest(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    documentRequestIsLoading.value = false
    return
  }

  const response = await documentRequestStore.searchDocumentRequest(searchQuery.value)
  if (response.success && response.pagination) {
    pagination.value = response.pagination

    searchQuery.value = null
  }
  documentRequestIsLoading.value = false
}

const toast = useToast()
const exportPdf = async (documentRequest: DocumentRequestResponse) => {
  const { request_date, certificate_type, id } = documentRequest
  toast.add({
    severity: 'info',
    summary: 'Exporting...',
    detail: `Exporting ${certificate_type} -${request_date}'Document Request '}...`,
    life: 5000,
  })

  try {
    const reportResponse = await documentRequestStore.generateDocumentRequest(String(id))

    const blob = reportResponse.data.value
    const fileName = reportResponse.fileNameHeader?.value || `Document-Request-${id}.docx`

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
        summary: 'Document Request Details Exported',
        detail: `The Document Request from ${documentRequest.request_date} was successfully exported.`,
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
          {{ !RoleAssignView ? ' My Document Request' : 'Document Request' }}
        </h1>
        <div class="flex w-full items-center justify-end gap-4">
          <div class="flex space-x-2 whitespace-nowrap md:w-auto">
            <Button
              icon="pi pi-filter-fill"
              v-tooltip.top="'Filter Document Request'"
              severity="info"
              size="large"
              class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100"
              text
              @click="$router.push({ name: 'sign-up' })"
            />
            <RouterLink :to="{ name: 'my-leaveapplications/store' }">
              <Button
                icon="pi pi-plus"
                v-tooltip.top="'Create Document Request'"
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
                placeholder="Search via Period or Date"
                class="w-full"
                :disabled="documentRequestIsLoading"
                @keyup.enter="handleSearchdocumentRequest"
              />
              <Button icon="pi pi-search" @click="handleSearchdocumentRequest" />
            </InputGroup>
          </div>
        </div>
      </div>
      <div class="mt-6 flex flex-col">
        <div class="w-full">
          <div class="mx-auto flex h-full w-full flex-col">
            <DataTable :value="filteredDocumentRequests" class="mt-6" dataKey="id">
              <Column
                field="period"
                header="Leave Period"
                headerClass="w-1/2 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="font-semibold uppercase text-surface-600">{{ props.data.certificate_type }}</p>
                </template>
              </Column>
              <Column
                field="edited_at"
                header="Date Filed"
                headerClass=" w-64 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="uppercase text-surface-600">{{ formatDate(props.data.request_date) }}</p>
                </template>
              </Column>
              <Column
                field="status"
                header="Status"
                headerClass="w-64 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <template v-if="props.data.status === 'Pending'">
                    <Chip
                      label="Pending"
                      class="flex items-center justify-center !bg-warn-500 px-4 py-1 font-semibold !text-surface-0"
                    >
                    </Chip>
                  </template>
                  <template v-else-if="props.data.status === 'In Progress'">
                    <Chip
                      label="In Progress"
                      class="flex items-center justify-center !bg-success-800 px-4 py-1 font-semibold !text-surface-0"
                    />
                  </template>
                  <template v-else-if="props.data.status === 'Released'">
                    <Chip
                      label="Released"
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
                      v-tooltip.top="'View Document Request'"
                      severity="info"
                      class="border-none text-lg font-semibold text-primary-600 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
                      text
                      @click="navigateToDetails(props.data)"
                    />
                    <Button
                      icon="pi pi-file-pdf"
                      v-tooltip.top="'Export Document Request'"
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
              :first="(pagination.current_page - 1) * pagination.per_page"
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
          v-if="searchSubmitted && !documentRequestIsLoading && !documentRequestStore.documentRequest.length"
          class="flex h-full w-full flex-col items-center justify-center font-menu text-lg dark:text-surface-300"
        >
          <i class="pi pi-exclamation-triangle mb-2 text-2xl"></i>
          <p>No Leave Applications found</p>
        </div>
        <div
          v-if="!documentRequestIsLoading && !documentRequestStore.documentRequest.length && !searchSubmitted"
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
                  You have no Request Documents
                </h2>
                <h1 class="mb-4 text-center text-base text-surface-600 dark:text-surface-400 sm:text-lg">
                  Requested Documents created by you shall appear here.
                </h1>
                <div class="mt-4 flex w-full justify-center">
                  <RouterLink :to="{ name: 'my-leaveapplications/store' }">
                    <Button
                      icon="pi pi-plus"
                      label="Request Documents"
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
