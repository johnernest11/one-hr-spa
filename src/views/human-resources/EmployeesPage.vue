<script setup lang="ts">
import { onBeforeMount, ref, computed, watchEffect, toRef, reactive, watch } from 'vue'
import { useAuthStore } from '@/stores/auth.store.ts'
import { usePersonnelStore, FilterEmployeePayload } from '@/stores/personnel.store'
import { useItemNumberStore } from '@/stores/item-number.store.ts'
import { useSalaryGradesStore } from '@/stores/salary-grades.store.ts'
import { useLibrariesStore } from '@/stores/libraries.store'
import { usePdsStore, PersonalDataSheetPayload } from '@/stores/pds.store.ts'
import { helpers, required, maxLength } from '@vuelidate/validators'
import type { PersonnelEmployee, PersonnelResponse, QrCodeResponse, ItemNumberResponse } from '@/typings/models.types'

import QRCodeStyling from 'qr-code-styling'
import Message from 'primevue/message'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import InputGroup from 'primevue/inputgroup'
import InputText from 'primevue/inputtext'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import DSWDLogo from '@/assets/image/DSWD logo_Mark.png'
import FileUpload from 'primevue/fileupload'
import WbInputText from '@/components/webkit/WbInputText.vue'
import WbAutoComplete from '@/components/webkit/WbAutoComplete.vue'
import { WbAutoCompleteOption, WbAutoCompleteOptionTrueValue } from '@/components/webkit/WbAutoComplete.vue'
import { useWbAutoCompleteHandleTrueValue } from '@/composables/wb-ui-components.ts'

import { parseApiImportPDSResponseError } from '@/utils/error-handle.ts'
import { ApiResponseBody, ApiResponsePagination } from '@/typings/http-resources.types.ts'
import Paginator, { PageState } from 'primevue/paginator'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { usePrependOrAppendOnce } from '@/utils/helpers.js'
import useVuelidate from '@vuelidate/core'

const authStore = useAuthStore()
const personnelStore = usePersonnelStore()
const libraryStore = useLibrariesStore()
const sgStore = useSalaryGradesStore()
const employment = useItemNumberStore()
const pdsStore = usePdsStore()
const getId = usePrependOrAppendOnce('employee-filter')

const itemNumberIsLoading = ref(false)
const searchSubmitted = ref(false)
const showModal = ref(false)
const showQrModal = ref(false)
const selectedEmployeeForQr = ref()
const qrCodeIsLoading = ref(false)
const isPositionLoading = ref(false)
const formIsSubmitting = ref(false)
const ImportPDS = ref(false)
const showErrorAlert = ref(false)

const searchQuery = ref<string | null>(null)
const fetchedQrCode = ref<QrCodeResponse | null>(null)
const pagination = ref<ApiResponsePagination | null>(null)

const selectedDivision = ref<WbAutoCompleteOption[] | null>(null)
const selectedSectionUnit = ref<WbAutoCompleteOption[] | null>(null)

const selectedDivisionLabel = ref<string | null>(null)
const selectedSectionLabel = ref<string | null>(null)
const errorMessage = ref()
const errorDetails = ref()
const paginationLimit = 5
const fileUploadRef = ref()
const menu = ref()
const toast = useToast()

const items = ref([
  {
    items: [
      {
        label: 'via Manual Input',
        mode: 'via-manual-input',
        to: 'create-personnel',
      },
      {
        label: 'via PDS Importation',
        mode: 'via-pds-importation',
        command: () => {
          ImportPDS.value = true
        },
      },
    ],
  },
])

const selectedItemNo = ref<WbAutoCompleteOption[] | null>(null)
const selectedSalaryGrade = ref<WbAutoCompleteOption[] | null>(null)
const selectedOffice = ref<WbAutoCompleteOption[] | null>(null)

/** Payload */
const payload = reactive<FilterEmployeePayload>({
  division: null,
  section: null,
})

/** import Payload */
const importPayload = reactive<PersonalDataSheetPayload>({
  ...pdsStore.pdsInfo,
})

const generateMessage = (fieldName: string): { required: string; maxLength: string } => ({
  required: `Please enter your ${fieldName.replace(/_/g, ' ')}`,
  maxLength: `${fieldName.replace(/_/g, ' ')} cannot exceed the maximum length`,
})

const globalStringMaxLength = import.meta.env.VITE_GLOBAL_STRING_MAX_LENGTH
const globalStringMaxLengthRule = helpers.withMessage(
  `Must not exceed ${globalStringMaxLength} characters`,
  maxLength(globalStringMaxLength)
)

const formRules = computed(() => ({
  $lazy: true,
  /** User Profile */
  employee: {
    item_id: {
      required: helpers.withMessage('Please choose the Item Number of this employee', required),
    },
    salary_grade_id: {
      required: helpers.withMessage('Please choose the salary grade for this item', required),
    },
    office_id: {
      required: helpers.withMessage('Please choose the office of the item', required),
    },
    division_id: {
      required: helpers.withMessage('Please choose the division of the item', required),
    },
    section_or_unit_id: {
      required: helpers.withMessage('Please choose the section/unit of the item', required),
    },
    agency_employee_no: {
      required: helpers.withMessage('agency employee no is required', required),
      maxLength: helpers.withMessage(() => generateMessage('agency_employee_no').maxLength, globalStringMaxLengthRule),
    },
  },
}))

watch(
  () => importPayload.employee.agency_employee_no,
  (newAgencyNo) => {
    importPayload.employee.id_number = newAgencyNo || null
  }
)

watch(
  () => importPayload.employee.item_id,
  (newSelectedItem) => {
    if (!newSelectedItem) {
      selectedItemNo.value = null
      return
    } else {
      propPosition()
    }
  }
)

watch(
  () => importPayload.employee.salary_grade_id,
  (newSelectedItem) => {
    if (!newSelectedItem) {
      selectedSalaryGrade.value = null
      return
    }
  }
)

watch(
  () => importPayload.employee.office_id,
  (newSelectedItem) => {
    if (!newSelectedItem) {
      selectedOffice.value = null
      return
    }
  }
)

watch(
  () => importPayload.employee.division_id,
  (newSelectedItem) => {
    if (!newSelectedItem) {
      selectedDivision.value = null
      return
    }
  }
)

watch(
  () => importPayload.employee.section_or_unit_id,
  (newSelectedItem) => {
    if (!newSelectedItem) {
      selectedSectionUnit.value = null
      return
    }
  }
)

const propPosition = async () => {
  isPositionLoading.value = true

  if (importPayload.employee.item_id) {
    const itemResp = await employment.fetchItemNumberById(importPayload.employee.item_id)
    const itemRespData = itemResp.data as ItemNumberResponse
    importPayload.employee.position = itemRespData.position?.title ?? null
  }

  isPositionLoading.value = false
}

const validator = useVuelidate<PersonalDataSheetPayload>(formRules, importPayload)

const handleImportSubmission = async () => {
  const valid = await validator.value.$validate()
  if (!valid) {
    toast.add({
      severity: 'error',
      summary: 'Import Personnel Data Sheet',
      detail: 'Please see the validation messages',
      life: 5000,
    })
    return
  }

  const file = fileUploadRef.value?.files?.[0]
  if (!file) {
    toast.add({
      severity: 'error',
      summary: 'Import Error',
      detail: 'No Excel file selected.',
      life: 3000,
    })
    return
  }

  formIsSubmitting.value = true

  const metadata = {
    is_update: 0,
    item_id: importPayload.employee.item_id,
    salary_grade_id: importPayload.employee.salary_grade_id,
    office_id: importPayload.employee.office_id,
    division_id: importPayload.employee.division_id,
    section_or_unit_id: importPayload.employee.section_or_unit_id,
    agency_employee_no: importPayload.employee.agency_employee_no,
    id_number: importPayload.employee.id_number,
    employee_id: null,
  }

  const importResponse = await pdsStore.importPds(file, metadata)

  if (!importResponse.success) {
    const result = parseApiImportPDSResponseError(importResponse)

    showErrorAlert.value = true
    errorMessage.value = result?.message
    errorDetails.value = result?.errors
  } else {
    toast.add({
      severity: 'success',
      summary: 'Import Successful',
      detail: 'Personnel Data Sheet has been imported successfully.',
      life: 5000,
    })

    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }

  formIsSubmitting.value = false
}

onBeforeMount(async () => {
  itemNumberIsLoading.value = true
  const response = await personnelStore.fetchEmployees(paginationLimit)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  itemNumberIsLoading.value = false
})

const canCreateNewEmployee = computed(() => {
  return authStore.authHasRequiredRole(['hr_ppms_admin', 'admin', 'super_user'])
})

const toggleAddingList = (event: Event) => {
  menu.value.toggle(event)
}

const handlePaginationPageChange = async (event: PageState) => {
  const pageSelected = event.page + 1
  itemNumberIsLoading.value = true
  const response = await personnelStore.fetchEmployees(paginationLimit, pageSelected)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  itemNumberIsLoading.value = false
}

const handleFilterItemNumber = async () => {
  itemNumberIsLoading.value = true
  searchSubmitted.value = true

  selectedDivisionLabel.value = selectedDivision.value?.[0]?.label ?? null
  selectedSectionLabel.value = selectedSectionUnit.value?.[0]?.label ?? null

  if (!selectedDivision.value && !selectedSectionUnit.value) {
    const response = await personnelStore.fetchEmployees()
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    itemNumberIsLoading.value = false
    return
  }
  const response = await personnelStore.fetchEmployees(payload.division ?? undefined, payload.section ?? undefined)

  if (response.success && response.pagination) {
    pagination.value = response.pagination
    searchQuery.value = null
  }

  itemNumberIsLoading.value = false
  showModal.value = false
}

const handleSearchEmployee = async () => {
  itemNumberIsLoading.value = true
  searchSubmitted.value = true

  if (!searchQuery.value) {
    const response = await personnelStore.fetchEmployees(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    itemNumberIsLoading.value = false
    return
  }

  const response = await personnelStore.searchEmployees(searchQuery.value)
  if (response.success && response.pagination) {
    pagination.value = response.pagination

    searchQuery.value = null
  }
  itemNumberIsLoading.value = false
}

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

const canDownload = ref(false)
const handleViewQr = async (employee: PersonnelEmployee): Promise<QrCodeResponse> => {
  let response: ApiResponseBody
  qrCodeIsLoading.value = true
  canDownload.value = false // reset everytime user is attempting to view a QR.
  response = await personnelStore.fetchQrCode(employee.id)

  if (response.error_message === 'Employee has no QR code yet.' && !response.success) {
    response = await personnelStore.generateQrCode(employee.id)

    if (response.error_message === 'This employee has no ID number.' && !response.success) {
      toast.add({
        severity: 'error',
        summary: 'Cannot generate QR code.',
        detail: response.error_message + ' Kindly contact the administrator for support.',
        life: 5000,
      })
      console.log('Encountered error while attempting to generate QR code for the employee. ', response)

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

const qrContainerRef = ref<HTMLElement | null>(null)
let qrCode: QRCodeStyling | null = null
const closeQrModal = () => {
  showQrModal.value = false
  selectedEmployeeForQr.value = null
  fetchedQrCode.value = null

  if (qrContainerRef.value) {
    qrContainerRef.value.innerHTML = ''
  }
  qrCode = null
}

watchEffect(() => {
  if (showQrModal.value && qrContainerRef.value && fetchedQrCode.value?.qr_code_value) {
    if (!qrCode) {
      qrCode = new QRCodeStyling({
        width: 350,
        height: 350,
        type: 'canvas',
        data: fetchedQrCode.value?.qr_code_value,
        image: DSWDLogo,
        dotsOptions: {
          color: '#000000',
          type: 'extra-rounded',
        },
        backgroundOptions: {
          color: '#FFFFFF',
        },
        imageOptions: {
          crossOrigin: 'anonymous',
          margin: 5,
        },
        qrOptions: {
          errorCorrectionLevel: 'H',
        },
        cornersSquareOptions: {
          type: 'extra-rounded',
          color: '#000000',
        },
        cornersDotOptions: {
          type: 'extra-rounded',
          color: '#000000',
        },
      })
      qrCode.append(qrContainerRef.value)
    } else {
      qrCode.update({
        data: fetchedQrCode.value?.qr_code_value,
        image: DSWDLogo,
        dotsOptions: {
          type: 'extra-rounded',
        },
        cornersSquareOptions: {
          type: 'extra-rounded',
          color: '#000000',
        },
        cornersDotOptions: {
          type: 'extra-rounded',
          color: '#000000',
        },
      })
    }
  }
})

const formatName = (first_name: string, middle_name: string, last_name: string) => {
  const f = first_name?.charAt(0).toLowerCase() || ''
  const m = middle_name?.charAt(0).toLowerCase() || ''
  const l = last_name?.toLowerCase() || ''

  return `${f}${m}${l}`
}

const downloadQrCode = async () => {
  if (qrCode && selectedEmployeeForQr.value) {
    const formattedName = formatName(
      selectedEmployeeForQr.value.first_name,
      selectedEmployeeForQr.value.middle_name,
      selectedEmployeeForQr.value.last_name
    )
    await qrCode.download({
      name: `${formattedName}-QR`,
      extension: 'png',
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
              v-if="!itemNumberIsLoading && (searchSubmitted || personnelStore.employees.length > 0)"
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
                    icon="pi pi-plus"
                    v-tooltip.top="'New Employee'"
                    severity="info"
                    size="large"
                    class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100"
                    text
                    @click="toggleAddingList"
                  />
                  <Menu ref="menu" id="overlay_menu" :model="items" :popup="true">
                    <template #item="{ item }">
                      <RouterLink :to="{ name: item.to, query: { mode: item.mode } }">
                        <span class="ml-2">{{ item.label }}</span>
                      </RouterLink>
                    </template>
                  </Menu>
                </div>
                <div class="flex w-full md:w-auto lg:w-1/2">
                  <InputGroup v-model="searchQuery" class="w-full">
                    <InputText
                      v-model="searchQuery"
                      placeholder="Search Item Number"
                      class="w-full"
                      :disabled="itemNumberIsLoading"
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
              <DataTable :value="personnelStore.employees" stripedRows class="mt-6" dataKey="id" :loading="itemNumberIsLoading">
                <Column
                  field="period"
                  header="Item Numbers"
                  headerClass="w-64 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
                >
                  <template #body="props">
                    <p class="font-semibold uppercase text-surface-500">
                      {{ props.data.first_name }} {{ props.data.middle_name ?? null }} {{ props.data.last_name }}
                      {{ props.data.ext_name ?? null }}
                    </p>
                    <p class="font-semibold uppercase text-surface-500">
                      {{ props.data.employee.item.number }}
                    </p>
                  </template>
                </Column>
                <Column
                  field="employee.item.position.title"
                  header="Position / Designation"
                  headerClass=" w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
                >
                </Column>
                <Column
                  field="individual_contact_info.email_address"
                  header="Email Address"
                  headerClass="w-64 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
                >
                </Column>
                <Column field="action" header="Actions" headerClass="w-64 bg-surface-100 opacity-70 font-bold py-2">
                  <template #body="props">
                    <div class="flex gap-4 whitespace-nowrap md:w-auto">
                      <Button
                        icon="pi pi-eye"
                        v-tooltip.top="'View Employee'"
                        severity="info"
                        class="border-none text-lg font-semibold text-primary-600 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
                        text
                      />
                      <Button
                        icon="pi pi-qrcode"
                        v-tooltip.top="'Generate QR Code'"
                        severity="info"
                        class="border-none text-lg font-semibold text-primary-600 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
                        text
                        @click="openQrModal(props.data)"
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
            v-if="searchSubmitted && !itemNumberIsLoading && !personnelStore.employees.length"
            class="flex h-full w-full flex-col items-center justify-center font-menu text-lg dark:text-surface-300"
          >
            <i class="pi pi-exclamation-triangle mb-2 text-2xl"></i>
            <p>No Employees found</p>
          </div>
          <div
            v-if="!itemNumberIsLoading && !personnelStore.employees.length && !searchSubmitted"
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
                      <Button size="large" outlined severity="info" class="rounded-sm" @click="toggleAddingList">
                        <template #icon>
                          <FontAwesomeIcon icon="fa-solid fa-plus" class="mr-1.5 h-4 w-4" />
                          <span class="lg:text-md text-sm">New Employee</span>
                        </template>
                      </Button>
                      <Menu ref="menu" id="overlay_menu" :model="items" :popup="true">
                        <template #item="{ item }">
                          <RouterLink :to="{ name: item.to, query: { mode: item.mode } }">
                            <span class="ml-2">{{ item.label }}</span>
                          </RouterLink>
                        </template>
                      </Menu>
                    </div>
                  </div>
                </div>
              </template>
            </Card>
          </div>
        </div>
      </template>
    </Card>
    <!-- Import PDS Dialog -->
    <Dialog v-model:visible="ImportPDS" modal header="Request Locator Slip" :style="{ width: '90vw' }">
      <template #header>
        <div class="flex items-center space-x-3 pt-4 sm:px-6 md:px-8">
          <font-awesome-icon :icon="['fas', 'location-dot']" class="h-6 text-surface-600 sm:h-7 md:h-8" />
          <h1 class="font-base text-2xl text-surface-600 sm:text-xl md:text-2xl">Import Personnel Data Sheet</h1>
        </div>
      </template>
      <hr />
      <!-- ✅ Import Error Alert Block -->
      <div class="flex flex-col gap-4">
        <div class=" ">
          <transition
            enter-active-class="transition duration-200"
            enter-from-class="scale-50 opacity-0"
            leave-to-class="opacity-0 "
          >
            <Message v-if="showErrorAlert" :closable="false" severity="error" class="space-y-4 overflow-y-auto">
              <span>{{ errorMessage }}</span>
              <div class="text-md flex flex-col space-y-2">
                <div v-for="(error, idx) in errorDetails" :key="idx" class="mt-0.5">- {{ error }}</div>
              </div>
            </Message>
          </transition>
        </div>
      </div>
      <div class="px-4 py-4 sm:px-6 sm:py-6 md:px-12">
        <div class="mb-2 flex flex-row items-center justify-center gap-4">
          <WbAutoComplete
            :useApiFilter="true"
            :apiEndpoint="'/items/search'"
            :suggestions="employment.itemNumbersSuggestions"
            @item-select="propPosition"
            apiOptionLabel="number"
            label="Item Number"
            placeholder="Type the item number"
            v-model="selectedItemNo"
            :id="getId('input-item-no')"
            optionLabel="label"
            optionValue="value"
            required
            @on-true-value-computed="
              (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                useWbAutoCompleteHandleTrueValue(value, toRef(importPayload.employee, 'item_id'))
            "
            label-class="text-md text-surface-600 dark:lg:text-surface-200"
            class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
            validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
            :invalid="validator.employee.item_id.$invalid"
            :invalid-text="validator.employee.item_id.$errors[0]?.$message"
            @blur="validator.employee.item_id.$touch"
            @focusin="validator.employee.item_id.$dirty = false"
          >
          </WbAutoComplete>

          <RouterLink :to="{ name: 'support', state: { from: 'recruitment' } }" v-tooltip.top="'Add Item Number'">
            <FontAwesomeIcon icon="fa-solid fa-plus" class="mt-8 text-3xl font-bold text-primary-500" />
          </RouterLink>
        </div>
        <div class="mb-2 flex flex-row items-center justify-center gap-4">
          <WbInputText
            v-model="importPayload.employee.position"
            :id="getId('input-item-position')"
            label="Position"
            :loading="isPositionLoading"
            readonly
            placeholder="Position will be auto populated upon item number selection"
            class="lg:text-md lg:placeholder:text-md cursor-not-allowed bg-surface-200 text-sm placeholder:text-sm read-only:cursor-not-allowed disabled:cursor-not-allowed"
            label-class="text-md text-surface-600 dark:lg:text-surface-200"
            validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
          />
        </div>
        <div class="mb-2 flex flex-row items-center justify-center gap-4">
          <WbAutoComplete
            :useApiFilter="true"
            :apiEndpoint="'libraries/salary-grades/search'"
            :suggestions="sgStore.salaryGradesOptions"
            apiOptionLabel="salary_grade"
            label="Salary Grade"
            placeholder="Type Salary Grade with its tranche here"
            v-model="selectedSalaryGrade"
            :id="getId('input-salary-grade')"
            optionLabel="label"
            optionValue="value"
            required
            @on-true-value-computed="
              (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                useWbAutoCompleteHandleTrueValue(value, toRef(importPayload.employee, 'salary_grade_id'))
            "
            label-class="text-md text-surface-600 dark:lg:text-surface-200"
            class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
            validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
            :invalid="validator.employee.salary_grade_id.$invalid"
            :invalid-text="validator.employee.salary_grade_id.$errors[0]?.$message"
            @blur="validator.employee.salary_grade_id.$touch"
            @focusin="validator.employee.salary_grade_id.$dirty = false"
          >
          </WbAutoComplete>
        </div>
        <div class="mb-2 flex flex-col gap-2 md:flex-row md:gap-4">
          <WbAutoComplete
            :useApiFilter="true"
            :apiEndpoint="'/libraries/offices/search'"
            :suggestions="libraryStore.officeOptions"
            :loading="libraryStore.officeOptionsLoading"
            apiOptionLabel="name"
            label="Office"
            placeholder="Type the Employee's Office to search and select"
            v-model="selectedOffice"
            :id="getId('input-office')"
            optionLabel="label"
            optionValue="value"
            required
            forceSelection
            @on-true-value-computed="
              (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                useWbAutoCompleteHandleTrueValue(value, toRef(importPayload.employee, 'office_id'))
            "
            label-class="text-md text-surface-600 dark:lg:text-surface-200"
            class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
            validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
            :invalid="validator.employee.office_id.$invalid"
            :invalid-text="validator.employee.office_id.$errors[0]?.$message"
            @blur="validator.employee.office_id.$touch"
            @focusin="validator.employee.office_id.$dirty = false"
          >
          </WbAutoComplete>
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
            required
            @on-true-value-computed="
              (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                useWbAutoCompleteHandleTrueValue(value, toRef(importPayload.employee, 'division_id'))
            "
            label-class="text-md text-surface-600 dark:lg:text-surface-200"
            class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
            validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
            :invalid="validator.employee.division_id.$invalid"
            :invalid-text="validator.employee.division_id.$errors[0]?.$message"
            @blur="validator.employee.division_id.$touch"
            @focusin="validator.employee.division_id.$dirty = false"
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
            required
            @on-true-value-computed="
              (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                useWbAutoCompleteHandleTrueValue(value, toRef(importPayload.employee, 'section_or_unit_id'))
            "
            label-class="text-md text-surface-600 dark:lg:text-surface-200"
            class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
            validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
            :invalid="validator.employee.section_or_unit_id.$invalid"
            :invalid-text="validator.employee.section_or_unit_id.$errors[0]?.$message"
            @blur="validator.employee.section_or_unit_id.$touch"
            @focusin="validator.employee.section_or_unit_id.$dirty = false"
          >
          </WbAutoComplete>
        </div>
        <div class="mb-2 flex flex-col gap-2 md:flex-row md:gap-4">
          <WbInputText
            v-model="importPayload.employee.agency_employee_no"
            required
            label="Agency Employee No."
            label-class="text-md text-surface-600 dark:lg:text-surface-200"
            class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
            validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
            :invalid="validator.employee.agency_employee_no.$invalid"
            :invalid-text="validator.employee.agency_employee_no.$errors[0]?.$message"
            @blur="validator.employee.agency_employee_no.$touch"
          >
          </WbInputText>
        </div>

        <div class="card flex flex-col gap-2">
          <label class="text-sm font-medium text-surface-700 dark:text-surface-300"> Upload PDS * </label>
          <FileUpload
            ref="fileUploadRef"
            mode="basic"
            name="demo[]"
            accept=".doc,.docx,.xls,.xlsx"
            :maxFileSize="5 * 1024 * 1024"
            :auto="false"
            chooseLabel="Browse"
          />
        </div>

        <div class="flex justify-end">
          <Button
            @click="handleImportSubmission"
            :loading="formIsSubmitting"
            :disabled="formIsSubmitting"
            label="Upload"
            class="dark:text-secondary-100 border border-primary-500 text-xs text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-600"
            text
          >
            <template #icon>
              <font-awesome-icon :icon="['fas', 'upload']" class="mr-2" />
            </template>
          </Button>
        </div>
      </div>
    </Dialog>

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
            required
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
            required
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
            :loading="itemNumberIsLoading"
            :disabled="itemNumberIsLoading"
            @click="handleFilterItemNumber"
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
    <Dialog
      v-model:visible="showQrModal"
      modal
      :draggable="false"
      :dismissableMask="true"
      :closable="false"
      class="w-[90vw] max-w-md rounded-lg bg-surface-0 p-6 shadow-xl dark:bg-surface-800"
      :pt="{
        mask: {
          style: 'backdrop-filter: blur(4px)',
        },
      }"
    >
      <template #container="{}">
        <div class="rounded-lg bg-surface-0 p-6 dark:bg-surface-800">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-xl font-semibold text-surface-500 dark:text-surface-0">
              <FontAwesomeIcon icon="fa-solid fa-qrcode" /> QR CODE Generation
            </h2>
            <button
              @click="closeQrModal"
              class="text-surface-400 hover:text-surface-600 dark:text-surface-300 dark:hover:text-surface-500"
            >
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <div v-if="selectedEmployeeForQr" class="text-left">
            <div class="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div class="text-center md:w-1/2 md:text-left">
                <p class="text-lg font-bold uppercase text-surface-500 dark:text-surface-0">
                  {{ selectedEmployeeForQr.last_name }}, {{ selectedEmployeeForQr.first_name }}
                  {{ selectedEmployeeForQr.middle_name ? selectedEmployeeForQr.middle_name + ' ' : '' }}
                  {{ selectedEmployeeForQr.ext_name ? selectedEmployeeForQr.ext_name : '' }}
                </p>
                <p class="text-sm text-surface-600 dark:text-surface-300">
                  {{ selectedEmployeeForQr.employee?.item?.position?.title || '' }}
                </p>
                <p class="text-sm text-surface-600 dark:text-surface-300">
                  {{ selectedEmployeeForQr.employee?.item?.number || '' }}
                </p>
              </div>
              <div class="font-semibold md:w-1/2">
                <Button
                  @click="downloadQrCode"
                  severity="info"
                  type="button"
                  size="large"
                  :disabled="!canDownload"
                  class="dark:text-secondary-100 bottom-0 right-0 mt-4 w-full border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
                  text
                >
                  <FontAwesomeIcon icon="fa-solid fa-download" class="mr-2" /> Download QR Code
                </Button>
              </div>
            </div>

            <div ref="qrContainerRef" v-if="!qrCodeIsLoading" class="my-6 flex justify-center"></div>
            <div v-if="qrCodeIsLoading" class="my-6 flex justify-center">
              <i class="pi pi-spinner animate-spin text-2xl text-surface-400" />
            </div>
          </div>
        </div>
      </template>
    </Dialog>
  </div>
</template>
