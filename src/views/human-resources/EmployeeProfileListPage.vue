<script setup lang="ts">
import { onBeforeMount, ref, computed, watchEffect, toRef, reactive } from 'vue'
import { useAuthStore } from '@/stores/auth.store.ts'
import { usePersonnelStore, FilterEmployeePayload } from '@/stores/personnel.store'
import { useLibrariesStore } from '@/stores/libraries.store'
import type { PersonnelEmployee, PersonnelResponse, QrCodeResponse } from '@/typings/models.types'

import QRCodeStyling from 'qr-code-styling'
import * as domToImage from 'dom-to-image-more'
import Button from 'primevue/button'
import InputGroup from 'primevue/inputgroup'
import InputText from 'primevue/inputtext'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import DSWDIcon from '@/assets/image/hrcares-icon.png'
import WbAutoComplete from '@/components/webkit/WbAutoComplete.vue'
import { WbAutoCompleteOption, WbAutoCompleteOptionTrueValue } from '@/components/webkit/WbAutoComplete.vue'
import { useWbAutoCompleteHandleTrueValue } from '@/composables/wb-ui-components.ts'

import { ApiResponseBody, ApiResponsePagination } from '@/typings/http-resources.types.ts'
import Paginator, { PageState } from 'primevue/paginator'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { usePrependOrAppendOnce } from '@/utils/helpers.js'
import { useRouter } from 'vue-router'
import { useRoute } from 'vue-router'

const route = useRoute()
const authStore = useAuthStore()
const personnelStore = usePersonnelStore()
const libraryStore = useLibrariesStore()
const router = useRouter()
const getId = usePrependOrAppendOnce('employee-filter')

const employeeListIsLoading = ref(false)
const searchSubmitted = ref(false)
const showModal = ref(false)
const showQrModal = ref(false)
const qrCodeIsLoading = ref(false)

const searchQuery = ref<string | null>(null)
const fetchedQrCode = ref<QrCodeResponse | null>(null)
const pagination = ref<ApiResponsePagination | null>(null)

const selectedDivision = ref<WbAutoCompleteOption[] | null>(null)
const selectedSectionUnit = ref<WbAutoCompleteOption[] | null>(null)

const selectedDivisionLabel = ref<string | null>(null)
const selectedSectionLabel = ref<string | null>(null)
const paginationLimit = 5
const toast = useToast()

const qrCardRef = ref<HTMLElement | null>(null)
const qrContainerRef = ref<HTMLElement | null>(null)
const hiddenQrCardRef = ref<HTMLElement | null>(null)
const hiddenQrContainerRef = ref<HTMLElement | null>(null)
const selectedEmployeeForQr = ref<PersonnelResponse | null>(null)
const canDownload = ref(false)

const navigateToCreate = () => {
  router.push({ name: 'create-personnel' })
}

const navigateToDetails = (personnelPds: PersonnelResponse) => {
  if (!personnelPds || !personnelPds.id) {
    console.error('Cannot navigate to details: Item Number or ID is undefined', personnelPds)
    return
  }
  router.push({
    name: 'create-personnel',
    params: {
      id: personnelPds.id,
    },
  })
}

const payload = reactive<FilterEmployeePayload>({
  division: null,
  section: null,
})

onBeforeMount(async () => {
  employeeListIsLoading.value = true
  const response = await personnelStore.fetchEmployees(paginationLimit)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  employeeListIsLoading.value = false
})

const canCreateNewEmployee = computed(() => {
  return authStore.authHasRequiredRole(['hr_ppms_admin', 'admin', 'super_user'])
})

/**************************************
        Handle Pagination Function
*************************************** */
const handlePaginationPageChange = async (event: PageState) => {
  const pageSelected = event.page + 1
  employeeListIsLoading.value = true

  let response: ApiResponseBody
  if (searchQuery.value) {
    // If there is a search query, continue searching
    response = await personnelStore.searchEmployees(searchQuery.value ?? undefined, pagination.value?.per_page ?? 5, pageSelected)
  } else if (searchSubmitted.value) {
    response = await personnelStore.filterEmployees(
      payload.division ?? undefined,
      payload.section ?? undefined,
      pagination.value?.per_page ?? 5,
      pageSelected
    )
  } else {
    response = await personnelStore.fetchEmployees(pagination.value?.per_page ?? 5, pageSelected)
  }
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  employeeListIsLoading.value = false
}

/**************************************
         Filter Employee Function
*************************************** */
const handleFilterEmployee = async () => {
  employeeListIsLoading.value = true
  searchSubmitted.value = true

  selectedDivisionLabel.value = selectedDivision.value?.[0]?.label ?? null
  selectedSectionLabel.value = selectedSectionUnit.value?.[0]?.label ?? null

  if (!selectedDivision.value && !selectedSectionUnit.value) {
    const response = await personnelStore.fetchEmployees(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    employeeListIsLoading.value = false
    return
  }
  const response = await personnelStore.filterEmployees(
    payload.division ?? undefined,
    payload.section ?? undefined,
    pagination.value?.per_page ?? 5
  )

  if (response.success && response.pagination) {
    pagination.value = response.pagination
    searchQuery.value = null
  }

  employeeListIsLoading.value = false
  showModal.value = false
}

/**************************************
         Search Employee Function
*************************************** */
const handleSearchEmployee = async () => {
  employeeListIsLoading.value = true
  searchSubmitted.value = true

  if (!searchQuery.value) {
    const response = await personnelStore.fetchEmployees(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    employeeListIsLoading.value = false
    return
  }

  const response = await personnelStore.searchEmployees(searchQuery.value, pagination.value?.per_page ?? 5)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  employeeListIsLoading.value = false
}

/**************************************
         QR Code Generation Function
*************************************** */
const openQrModal = async (individual: PersonnelResponse) => {
  selectedEmployeeForQr.value = individual
  showQrModal.value = true
  fetchedQrCode.value = null

  if (!individual.employee) {
    toast.add({
      severity: 'error',
      summary: 'Invalid action.',
      detail: 'Employee not found.',
      life: 5000,
    })
    console.log('The selected individual has no employee record.')
  } else {
    fetchedQrCode.value = await handleViewQr(individual.employee)
  }
}

const employeeHasIdNumber = (response: ApiResponseBody): boolean => {
  if (response.error_message === 'This employee has no ID number.' && !response.success) {
    toast.add({
      severity: 'error',
      summary: 'Cannot generate QR code.',
      detail: response.error_message + ' Kindly contact the administrator for support.',
      life: 5000,
    })
    return false
  }
  return true
}

const handleViewQr = async (employee: PersonnelEmployee): Promise<QrCodeResponse> => {
  qrCodeIsLoading.value = true
  canDownload.value = false

  let response = await personnelStore.fetchQrCode(employee.id)
  if (!employeeHasIdNumber(response)) {
    personnelStore.isEmployeesLoading = false
    qrCodeIsLoading.value = false
    return response.data as QrCodeResponse
  }

  if (response.error_message === 'Employee has no QR code yet.' && !response.success) {
    response = await personnelStore.generateQrCode(employee.id)

    if (!employeeHasIdNumber(response)) {
      personnelStore.isEmployeesLoading = false
      qrCodeIsLoading.value = false
      return response.data as QrCodeResponse
    }
  }

  canDownload.value = true
  personnelStore.isEmployeesLoading = false
  qrCodeIsLoading.value = false
  return response.data as QrCodeResponse
}

let qrCodeDisplay: QRCodeStyling | null = null
let qrCodeDownload: QRCodeStyling | null = null

const closeQrModal = () => {
  showQrModal.value = false
  selectedEmployeeForQr.value = null
  fetchedQrCode.value = null

  if (qrContainerRef.value) {
    qrContainerRef.value.innerHTML = ''
  }
  if (hiddenQrContainerRef.value) {
    hiddenQrContainerRef.value.innerHTML = ''
  }
  qrCodeDisplay = null
  qrCodeDownload = null
}

watchEffect(() => {
  if (!showQrModal.value || !fetchedQrCode.value?.qr_code_value) {
    return
  }

  if (qrContainerRef.value) {
    if (!qrCodeDisplay) {
      qrCodeDisplay = new QRCodeStyling({
        width: 350,
        height: 350,
        type: 'canvas',
        data: fetchedQrCode.value.qr_code_value,
        image: DSWDIcon,
        dotsOptions: { color: '#000000', type: 'square' },
        backgroundOptions: { color: '#FFFFFF' },
        imageOptions: { crossOrigin: 'anonymous', margin: 5 },
        qrOptions: { errorCorrectionLevel: 'H' },
        cornersSquareOptions: { type: 'square', color: '#000000' },
        cornersDotOptions: { type: 'square', color: '#000000' },
      })
      qrCodeDisplay.append(qrContainerRef.value)
    } else {
      qrCodeDisplay.update({ data: fetchedQrCode.value.qr_code_value })
    }
  }

  if (hiddenQrContainerRef.value) {
    if (!qrCodeDownload) {
      qrCodeDownload = new QRCodeStyling({
        width: 500,
        height: 500,
        type: 'canvas',
        data: fetchedQrCode.value.qr_code_value,
        image: DSWDIcon,
        dotsOptions: { color: '#000000', type: 'square' },
        backgroundOptions: { color: '#FFFFFF' },
        imageOptions: { crossOrigin: 'anonymous', margin: 5 },
        qrOptions: { errorCorrectionLevel: 'H' },
        cornersSquareOptions: { type: 'square', color: '#000000' },
        cornersDotOptions: { type: 'square', color: '#000000' },
      })
      qrCodeDownload.append(hiddenQrContainerRef.value)
    } else {
      qrCodeDownload.update({ data: fetchedQrCode.value.qr_code_value })
    }
  }
})

const downloadQrCode = async () => {
  const node = hiddenQrCardRef.value
  const employee = selectedEmployeeForQr.value

  if (!node || !employee) {
    console.error('Node or employee data missing for QR download.')
    return
  }

  if (!hiddenQrContainerRef.value?.firstChild) {
    console.error('Hidden QR code element not yet rendered.')
    toast.add({
      severity: 'warn',
      summary: 'Render Pending',
      detail: 'QR code not fully generated. Please wait a moment and try again.',
      life: 3000,
    })
    return
  }

  const filename = `${employee.last_name}_QRCard.png`

  try {
    const dataUrl = await domToImage.toPng(node, {
      quality: 0.95,
      bgcolor: 'white',
    })

    const link = document.createElement('a')
    link.download = filename
    link.href = dataUrl
    link.click()

    toast.add({
      severity: 'success',
      summary: 'Download Successful',
      detail: `QR Card downloaded as ${filename}.`,
      life: 3000,
    })
  } catch (error) {
    console.error('Error generating QR card image with dom-to-image:', error)
    toast.add({
      severity: 'error',
      summary: 'Download Failed',
      detail: 'Could not generate the QR image. The image library failed to capture the element.',
      life: 7000,
    })
  }
}
</script>

<template>
  <div class="mx-auto flex h-full w-full flex-col pl-4 pt-8">
    <Card class="h-full">
      <template #content>
        <div>
          <div class="mx-auto flex h-full w-full flex-col">
            <div
              class="flex w-full items-center justify-end gap-4"
              v-if="!employeeListIsLoading && (searchSubmitted || personnelStore.employees.length > 0)"
            >
              <div
                class="my-6 flex w-full flex-col items-center justify-between gap-4 rounded-lg bg-surface-0 px-6 py-6 dark:bg-surface-800 md:my-4 md:flex-row md:px-4 md:py-4"
              >
                <h1
                  class="mb-2 mr-4 whitespace-nowrap text-xl font-semibold text-primary-800 dark:text-primary-100 md:text-xl lg:text-4xl"
                >
                  <font-awesome-icon :icon="['fas', 'sitemap']" />
                  Employees
                </h1>
              </div>
              <div class="flex w-full items-center justify-end gap-4">
                <div class="flex space-x-2 whitespace-nowrap md:w-auto">
                  <Button
                    icon="pi pi-filter-fill"
                    v-tooltip.top="'Filter Item'"
                    severity="info"
                    size="large"
                    class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100"
                    text
                    @click="showModal = true"
                  />
                  <Button
                    v-if="canCreateNewEmployee && !(route.name === 'employees' && authStore.authHasRequiredRole(['super_user']))"
                    icon="pi pi-plus"
                    v-tooltip.top="'New Employee'"
                    severity="info"
                    size="large"
                    class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100"
                    text
                    @click="navigateToCreate"
                  />
                </div>
                <div class="flex w-full md:w-auto lg:w-1/2">
                  <InputGroup v-model="searchQuery" class="w-full">
                    <InputText
                      v-model="searchQuery"
                      placeholder="Search Employee"
                      class="w-full"
                      :disabled="employeeListIsLoading"
                      @keyup.enter="handleSearchEmployee"
                    />
                    <Button icon="pi pi-search" @click="handleSearchEmployee" />
                  </InputGroup>
                </div>
              </div>
            </div>
            <div
              v-if="personnelStore.employees && personnelStore.employees.length > 0"
              class="mx-auto flex h-full w-full flex-col"
            >
              <DataTable :value="personnelStore.employees" stripedRows class="mt-6" dataKey="id">
                <!-- Item Numbers Column -->
                <Column
                  field="period"
                  header="Item Numbers"
                  headerClass="w-64 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
                >
                  <template #body="props">
                    <div v-if="!employeeListIsLoading">
                      <p class="font-semibold uppercase text-surface-500">
                        {{ props.data.first_name }} {{ props.data.middle_name ?? '' }} {{ props.data.last_name }}
                        {{ props.data.ext_name ?? '' }}
                      </p>
                      <p class="font-semibold uppercase text-surface-500">
                        {{ props.data.employee?.item?.number ?? 'N/A' }}
                      </p>
                    </div>
                    <div v-else class="space-y-1">
                      <div class="h-4 w-32 rounded bg-surface-300 dark:bg-surface-700"></div>
                      <div class="h-4 w-20 rounded bg-surface-300 dark:bg-surface-700"></div>
                    </div>
                  </template>
                </Column>

                <!-- Position / Designation Column -->
                <Column
                  field="employee.item.position.title"
                  header="Position / Designation"
                  headerClass="w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
                >
                  <template #body="props">
                    <div v-if="!employeeListIsLoading">{{ props.data.employee?.item?.position?.title ?? 'N/A' }}</div>
                    <div v-else class="h-4 w-40 rounded bg-surface-300 dark:bg-surface-700"></div>
                  </template>
                </Column>

                <!-- Email Address Column -->
                <Column
                  field="individual_contact_info.email_address"
                  header="Email Address"
                  headerClass="w-64 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
                >
                  <template #body="props">
                    <div v-if="!employeeListIsLoading">{{ props.data.individual_contact_info?.email_address ?? 'N/A' }}</div>
                    <div v-else class="h-4 w-40 rounded bg-surface-300 dark:bg-surface-700"></div>
                  </template>
                </Column>

                <!-- Actions Column -->
                <Column field="action" header="Actions" headerClass="w-64 bg-surface-100 opacity-70 font-bold py-2">
                  <template #body="props">
                    <div v-if="!employeeListIsLoading" class="flex gap-4 whitespace-nowrap md:w-auto">
                      <Button
                        icon="pi pi-eye"
                        v-tooltip.top="'View Employee'"
                        severity="info"
                        class="border-none text-lg font-semibold text-primary-600 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
                        text
                        @click="navigateToDetails(props.data)"
                      />
                      <Button
                        v-if="canCreateNewEmployee"
                        icon="pi pi-qrcode"
                        v-tooltip.top="'Generate QR Code'"
                        severity="info"
                        class="border-none text-lg font-semibold text-primary-600 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
                        text
                        @click="openQrModal(props.data)"
                      />
                    </div>
                    <div v-else class="flex gap-4">
                      <div class="h-6 w-10 rounded bg-surface-300 dark:bg-surface-700"></div>
                      <div v-if="canCreateNewEmployee" class="h-6 w-10 rounded bg-surface-300 dark:bg-surface-700"></div>
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
            v-if="searchSubmitted && !employeeListIsLoading && !personnelStore.employees.length"
            class="flex h-full w-full flex-col items-center justify-center font-menu text-lg dark:text-surface-300"
          >
            <i class="pi pi-exclamation-triangle mb-2 text-2xl"></i>
            <p>No Employees found</p>
          </div>
          <div
            v-if="!employeeListIsLoading && !personnelStore.employees.length && !searchSubmitted"
            class="mx-auto flex h-full w-full flex-col"
          >
            <Card class="w-full p-0 shadow-none">
              <template #content>
                <div class="flex flex-col items-center sm:flex-col md:flex-col">
                  <div
                    class="my-6 flex w-full flex-col items-center justify-between gap-4 rounded-lg bg-surface-0 px-6 py-6 dark:bg-surface-800 md:my-4 md:flex-row md:px-4 md:py-4"
                  ></div>
                  <div class="flex justify-center">
                    <img src="@/assets/image/undraw_site-stats.svg" class="w-96 pt-12" />
                  </div>
                  <h2
                    class="mb-2 mt-4 flex w-full justify-center text-xl font-semibold text-surface-800 dark:text-primary-100 sm:text-2xl"
                  >
                    No Employees
                  </h2>
                  <h1 class="mb-4 text-base text-surface-600 dark:text-surface-400 sm:text-lg">
                    List of employees shall appear here.
                  </h1>
                  <div class="mt-4 flex w-full justify-center">
                    <div v-if="canCreateNewEmployee" class="mt-4">
                      <Button size="large" outlined severity="info" class="rounded-sm" @click="navigateToCreate">
                        <template #icon>
                          <FontAwesomeIcon icon="fa-solid fa-plus" class="mr-1.5 h-4 w-4" />
                          <span class="lg:text-md text-sm">New Employee</span>
                        </template>
                      </Button>
                    </div>
                  </div>
                </div>
              </template>
            </Card>
          </div>
        </div>
      </template>
    </Card>

    <!-- Modal of Filter -->
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
          class: 'relative w-full h-full flex flex-col bg-surface-0 shadow-lg',
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
      <div class="flex-1 px-4 pb-24">
        <h2 class="mb-2 mt-4 text-lg font-semibold text-surface-500 dark:text-primary-100">Filters</h2>
        <div class="mb-4">
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
              (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) => {
                useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'division'))
              }
            "
            label-class="mt-4 text-md text-surface-600 dark:lg:text-surface-200"
            class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
            validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
          >
          </WbAutoComplete>
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
                useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'section'))
            "
            label-class="mt-4 text-md text-surface-600 dark:lg:text-surface-200"
            class="lg:text-md lg:placeholder:text-md relative w-full max-w-[600px] text-sm placeholder:text-sm"
            validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
          >
          </WbAutoComplete>
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
            :loading="employeeListIsLoading"
            :disabled="employeeListIsLoading"
            @click="handleFilterEmployee"
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

    <!-- Modal of QR -->
    <template>
      <Dialog v-model:visible="showQrModal" modal :style="{ width: '50vw' }" @hide="closeQrModal">
        <template #header>
          <div class="flex items-center space-x-3 pt-4 sm:px-6 md:px-8">
            <font-awesome-icon icon="qrcode" class="h-6 text-surface-600 sm:h-7 md:h-8" />
            <h1 class="font-base text-2xl text-surface-600 sm:text-xl md:text-2xl">Employee QR Code</h1>
          </div>
        </template>
        <hr />

        <div
          v-if="selectedEmployeeForQr"
          ref="qrCardRef"
          class="mx-auto flex w-full max-w-sm flex-col items-center bg-white p-6 text-center sm:max-w-md"
        >
          <div class="mb-4 flex w-full flex-col items-center">
            <img src="@/assets/image/dswd-logo.png" alt="DSWD Logo" class="object-contain" />
          </div>

          <div class="mb-2 w-full">
            <p class="text-lg font-extrabold uppercase leading-tight text-gray-900 sm:text-xl">
              {{ selectedEmployeeForQr.last_name }}, {{ selectedEmployeeForQr.first_name }}
              {{ selectedEmployeeForQr.middle_name ? selectedEmployeeForQr.middle_name + ' ' : '' }}
              {{ selectedEmployeeForQr.ext_name ? selectedEmployeeForQr.ext_name : '' }}
            </p>
          </div>
          <div class="mb-4 w-full">
            <p class="mt-1 text-xs font-medium uppercase text-gray-700 sm:text-sm">
              {{ selectedEmployeeForQr.employee?.item?.position?.title || '' }}
            </p>
          </div>

          <div
            v-if="!qrCodeIsLoading"
            ref="qrContainerRef"
            class="flex h-[250px] w-[250px] justify-center bg-white sm:h-[300px] sm:w-[300px] md:h-[350px] md:w-[350px]"
          ></div>

          <div v-else class="my-6 flex justify-center">
            <i class="pi pi-spinner animate-spin text-2xl text-surface-400" />
          </div>
        </div>

        <div class="mx-auto mt-6 w-full max-w-xs" v-if="canDownload && !qrCodeIsLoading">
          <Button
            @click="downloadQrCode"
            severity="info"
            type="button"
            size="large"
            :disabled="!canDownload"
            class="w-full border-2 border-primary-500 text-base font-semibold transition-colors hover:bg-primary-50"
            text
          >
            <FontAwesomeIcon icon="fa-solid fa-download" class="mr-2" /> Download QR Card
          </Button>
        </div>
      </Dialog>

      <div
        v-if="selectedEmployeeForQr"
        ref="hiddenQrCardRef"
        style="
          position: absolute;
          left: -9999px;
          width: 650px;
          height: 900px;
          background-color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 40px;
          box-sizing: border-box;
          border: 0 !important;
          box-shadow: none !important;
          outline: none !important;
        "
      >
        <div
          style="
            margin-bottom: 30px;
            width: 100%;
            display: flex;
            justify-content: center;
            border: 0 !important;
            box-shadow: none !important;
            outline: none !important;
          "
        >
          <img
            src="@/assets/image/dswd-logo.png"
            alt="DSWD Logo"
            style="width: 412.5px; height: auto; object-fit: contain; border: 0 !important; box-shadow: none !important"
          />
        </div>

        <div style="margin-bottom: 5px; width: 100%; border: 0 !important; box-shadow: none !important; outline: none !important">
          <div style="background-color: white !important; padding: 5px 20px; border: 0 !important">
            <p
              style="
                font-size: 32px;
                font-weight: 900;
                text-transform: uppercase;
                color: #1f2937;
                line-height: 1.2;
                border: 0 !important;
              "
            >
              {{ selectedEmployeeForQr.last_name }}, {{ selectedEmployeeForQr.first_name }}
              {{ selectedEmployeeForQr.middle_name ? selectedEmployeeForQr.middle_name + ' ' : '' }}
              {{ selectedEmployeeForQr.ext_name ? selectedEmployeeForQr.ext_name : '' }}
            </p>
          </div>
        </div>

        <div
          style="margin-bottom: 30px; width: 100%; border: 0 !important; box-shadow: none !important; outline: none !important"
        >
          <div style="background-color: white !important; padding: 5px 20px; border: 0 !important">
            <p
              style="
                font-size: 22px;
                font-weight: 500;
                text-transform: uppercase;
                color: #1f2937;
                line-height: 1.2;
                border: 0 !important;
              "
            >
              {{ selectedEmployeeForQr.employee?.item?.position?.title || '' }}
            </p>
          </div>
        </div>

        <div
          v-if="!qrCodeIsLoading"
          ref="hiddenQrContainerRef"
          style="
            display: flex;
            justify-content: center;
            background-color: white;
            width: 500px;
            height: 500px;
            border: 0 !important;
          "
        ></div>
      </div>
    </template>
  </div>
</template>
