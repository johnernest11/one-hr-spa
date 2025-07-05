<script setup lang="ts">
import { onBeforeMount, ref, toRef, computed } from 'vue'
import { useLibrariesStore } from '@/stores/libraries.store'
import { useDocumentRequestStore } from '@/stores/document-request.store'
import { DocumentRequestResponse } from '@/typings/models.types.ts'
import { useRoute, useRouter } from 'vue-router'

import Button from 'primevue/button'
import Chip from 'primevue/chip'
import Card from 'primevue/card'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import InputGroup from 'primevue/inputgroup'
import WbDropdown from '@/components/webkit/WbDropdown.vue'
import WbAutoComplete, { WbAutoCompleteOption, WbAutoCompleteOptionTrueValue } from '@/components/webkit/WbAutoComplete.vue'
import { useWbAutoCompleteHandleTrueValue } from '@/composables/wb-ui-components'

import Paginator, { PageState } from 'primevue/paginator'
import { ApiResponsePagination } from '@/typings/http-resources.types.ts'
import { formatDate, snakeCaseToTitleCase } from '@/utils/helpers.ts'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useToast } from 'primevue/usetoast'
import { usePrependOrAppendOnce } from '@/utils/helpers'

const libraryStore = useLibrariesStore()
const documentRequestStore = useDocumentRequestStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const isHumanResourceActive = computed(() => route.name === 'document-requests')
const getId = usePrependOrAppendOnce('documents-request')

const documentRequestIsLoading = ref(false)
const showModal = ref(false)
const paginationLimit = 5
const searchSubmitted = ref(false)

const searchQuery = ref<string | null>(null)
const selectedStatus = ref<string | null>(null)
const selectedDivision = ref<WbAutoCompleteOption[] | null>(null)
const selectedSectionUnit = ref<WbAutoCompleteOption[] | null>(null)
const selectedFundingSources = ref<WbAutoCompleteOption[] | null>(null)
const pagination = ref<ApiResponsePagination | null>(null)

const navigateToDetails = (documentRequest: DocumentRequestResponse) => {
  if (!documentRequest || !documentRequest.id) {
    console.error('Cannot navigate to details: Document Request or ID is undefined', documentRequest)
    return
  }
  let targetRouteName
  if (isHumanResourceActive.value) {
    targetRouteName = 'document-requests/editor'
  } else {
    targetRouteName = 'request-documents/editor'
  }

  router.push({
    name: targetRouteName,
    params: {
      id: documentRequest.id,
    },
  })
}

const employementStatusOptions = [
  { label: 'Permanent', value: 'Permanent' },
  { label: 'Contractual', value: 'Contractual' },
  { label: 'Contract of Service', value: 'Contract of Service' },
  { label: 'Job Order', value: 'Job Order' },
]

const statusOptions = ref([
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in progress' },
  { label: 'Released', value: 'released' },
])

onBeforeMount(async () => {
  documentRequestIsLoading.value = true
  const response = await documentRequestStore.fetchDocumentRequest(paginationLimit)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  documentRequestIsLoading.value = false
})

const fetchDocumentRequestBasedOnContext = async (page = 1) => {
  documentRequestIsLoading.value = true
  const statusFilter = isHumanResourceActive.value ? ['Pending', 'For Review', 'Released'] : undefined

  const response = await documentRequestStore.fetchDocumentRequest(paginationLimit, page, statusFilter)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  documentRequestIsLoading.value = false
}

onBeforeMount(() => fetchDocumentRequestBasedOnContext())

const handlePaginationPageChange = async (event: PageState) => {
  await fetchDocumentRequestBasedOnContext(event.page + 1)
}

const handleSearchDocumentRequest = async () => {
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

const handleFilterDocumentRequest = async () => {
  documentRequestIsLoading.value = true
  searchSubmitted.value = true
  if (!selectedStatus.value) {
    const response = await documentRequestStore.fetchDocumentRequest(paginationLimit) // 5 = pagination limit
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    return (documentRequestIsLoading.value = false)
  }

  const response = await documentRequestStore.filterDocumentRequest(selectedStatus.value)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
    searchQuery.value = null
  }

  documentRequestIsLoading.value = false
  showModal.value = false
}

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
      detail: 'There was an issue exporting the doucment request. Please try again.',
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
          {{ !isHumanResourceActive ? '  My Document Request ' : 'Document Request' }}
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
              @click="showModal = true"
            />
            <RouterLink :to="{ name: 'request-documents/store' }">
              <Button
                v-if="!isHumanResourceActive"
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
                @keyup.enter="handleSearchDocumentRequest"
              />
              <Button
                icon="pi pi-search"
                @click="handleSearchDocumentRequest"
                :loading="documentRequestIsLoading"
                :disabled="documentRequestIsLoading"
              />
            </InputGroup>
          </div>
        </div>
      </div>
      <div class="mt-6 flex flex-col">
        <div class="w-full">
          <div
            v-if="documentRequestStore.documentRequest && documentRequestStore.documentRequest.length > 0"
            class="mx-auto flex h-full w-full flex-col"
          >
            <DataTable :value="documentRequestStore.documentRequest" class="mt-6" dataKey="id">
              <Column
                field="period"
                header="Document Request"
                headerClass="w-1/2 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="font-semibold uppercase text-surface-600">{{ props.data.certificate_type }}</p>
                  <p v-if="isHumanResourceActive" class="uppercase text-surface-600">
                    {{ snakeCaseToTitleCase(props.data.employee_id.first_name) }}
                    {{ snakeCaseToTitleCase(props.data.employee_id.middle_name ?? '') }}
                    {{ snakeCaseToTitleCase(props.data.employee_id.last_name) }}
                  </p>
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
                  <template v-if="props.data.status === 'pending'">
                    <Chip
                      label="Pending"
                      class="flex items-center justify-center !bg-warn-500 px-4 py-1 font-semibold !text-surface-0"
                    >
                    </Chip>
                  </template>
                  <template v-else-if="props.data.status === 'in progress'">
                    <Chip
                      label="In Progress"
                      class="flex items-center justify-center !bg-success-800 px-4 py-1 font-semibold !text-surface-0"
                    />
                  </template>
                  <template v-else-if="props.data.status === 'released'">
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
          <p>No Document Request found</p>
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
                  <RouterLink :to="{ name: 'request-documents/store' }">
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
  <!--Filter & Field Options Dialog -->
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
    <!-- Custom header slot -->
    <template #header>
      <div class="flex w-full items-center justify-between p-4 pb-0">
        <h1 class="text-xl font-semibold text-surface-600 dark:text-primary-100">
          <font-awesome-icon icon="bars-staggered" class="mr-2" />
          Filter and Field Options
        </h1>
      </div>
    </template>
    <!-- Scrollable Content (space reserved for footer height) -->
    <div class="flex-1 overflow-auto px-4 pb-24">
      <h2 class="mb-2 mt-4 text-sm font-medium text-surface-500 dark:text-primary-100">Filters</h2>
      <div class="mb-4" v-if="isHumanResourceActive">
        <WbAutoComplete
          :useApiFilter="true"
          :apiEndpoint="'/libraries/divisions/search'"
          :suggestions="libraryStore.divisionOptions"
          :loading="libraryStore.divisionOptionsLoading"
          apiOptionLabel="name"
          label="Division"
          placeholder="Type the Division"
          v-model="selectedDivision"
          :id="getId('input-division')"
          optionLabel="label"
          optionValue="value"
          @on-true-value-computed="
            (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
              useWbAutoCompleteHandleTrueValue(value, toRef('division_id'))
          "
          label-class="text-sm text-start text-surface-600 dark:lg:text-surface-200"
          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
        />
      </div>
      <div class="mb-4" v-if="isHumanResourceActive">
        <WbAutoComplete
          :useApiFilter="true"
          :apiEndpoint="'/libraries/section-or-units/search'"
          :suggestions="libraryStore.sectionUnitOptions"
          :loading="libraryStore.sectionUnitOptionsLoading"
          apiOptionLabel="name"
          label="Section/Unit"
          placeholder="Type the Section / Unit"
          v-model="selectedSectionUnit"
          :id="getId('input-section-unit')"
          optionLabel="label"
          optionValue="value"
          @on-true-value-computed="
            (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
              useWbAutoCompleteHandleTrueValue(value, toRef('section_or_unit_id'))
          "
          label-class="text-sm text-start text-surface-600 dark:lg:text-surface-200"
          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
        />
      </div>
      <div class="mb-4" v-if="isHumanResourceActive">
        <WbAutoComplete
          :useApiFilter="true"
          :apiEndpoint="'/libraries/fund-sources/search'"
          :suggestions="libraryStore.fundingSourcesOptions"
          :loading="libraryStore.fundingSourcesOptionsLoading"
          apiOptionLabel="name"
          label="Funding"
          placeholder="Type the Funding"
          v-model="selectedFundingSources"
          :id="getId('input-funding-sources')"
          optionLabel="label"
          optionValue="value"
          @on-true-value-computed="
            (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
              useWbAutoCompleteHandleTrueValue(value, toRef('fund_source'))
          "
          label-class="text-sm text-start text-surface-600 dark:lg:text-surface-200"
          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
        />
      </div>
      <div class="mb-4" v-if="isHumanResourceActive">
        <WbDropdown
          :options="employementStatusOptions"
          optionLabel="label"
          optionValue="value"
          label="Employment Status"
          placeholder="Select Employment Status"
          label-class="text-sm text-start text-surface-600"
        />
      </div>
      <div class="mb-40">
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
          :loading="documentRequestIsLoading"
          :disabled="documentRequestIsLoading"
          @click="handleFilterDocumentRequest"
          label="Apply"
          class="dark:text-secondary-100 w-full border border-primary-500 px-4 py-3 text-primary-600 dark:border-surface-700"
          text
        >
          <template #icon>
            <font-awesome-icon icon="check" class="mr-2 text-lg" />
          </template>
        </Button>
      </div>
    </div>
  </Dialog>
</template>
