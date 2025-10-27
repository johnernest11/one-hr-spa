<script setup lang="ts">
import { onBeforeMount, ref, computed, reactive, toRef } from 'vue'
import { useLibrariesStore } from '@/stores/libraries.store'
import { useLocatorSlipStore, LocatorSlipPayload } from '@/stores/locator-slip.store'
import { LocatorSlipResponse } from '@/typings/models.types.ts'
import { useToast } from 'primevue/usetoast'
import { useRoute, useRouter } from 'vue-router'

import Button from 'primevue/button'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputGroup from 'primevue/inputgroup'
import Skeleton from 'primevue/skeleton'
import Paginator, { PageState } from 'primevue/paginator'
import WbDropdown from '@/components/webkit/WbDropdown.vue'
import WbCalendar from '@/components/webkit/WbCalendar.vue'
import WbAutoComplete, { WbAutoCompleteOption, WbAutoCompleteOptionTrueValue } from '@/components/webkit/WbAutoComplete.vue'
import { useWbAutoCompleteHandleTrueValue } from '@/composables/wb-ui-components'

import useVuelidate from '@vuelidate/core'
import { ApiResponsePagination } from '@/typings/http-resources.types.ts'
import { helpers, required } from '@vuelidate/validators'
import { getLongMonthAndYear, snakeCaseToTitleCase, usePrependOrAppendOnce, formatDateSafe } from '@/utils/helpers.ts'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const locatorSlipsStore = useLocatorSlipStore()
const libraryStore = useLibrariesStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const isHumanResourceActive = computed(() => route.name === 'locator-slips')
const searchBarPlaceholder = computed(() =>
  isHumanResourceActive.value ? 'Search via Employee Name/LS No.' : 'Search via LS No.'
)
const getId = usePrependOrAppendOnce('generate-payroll')

const RequestLocatorSlip = ref(false)
const searchSubmitted = ref(false)
const locatorSlipsIsLoading = ref(false)
const formIsSubmitting = ref(false)
const showModal = ref(false)
const paginationLimit = 5
const employeeGroups = ref()
const expandedRows = ref()

const searchQuery = ref<string | null>(null)
const selectedDivision = ref<WbAutoCompleteOption | null>(null)
const selectedOffice = ref<WbAutoCompleteOption | null>(null)
const selectedSectionUnit = ref<WbAutoCompleteOption | null>(null)
const selectedFormType = ref<string | null>(null)
const selectedDateFilter = ref<Date | null>(null)
const pagination = ref<ApiResponsePagination | null>(null)

const emit = defineEmits<{
  (e: 'locator-created', value: boolean): void
}>()

const openLocatorSlip = (slip: LocatorSlipResponse | null = null) => {
  if (!slip || !slip.id) {
    console.error('Cannot navigate to details: Locator Slip or ID is undefined', slip)
    return
  } else {
    if (route.name === 'locator-slips') {
      router.push({
        name: 'locator-slips/editor',
        params: {
          id: slip.id,
        },
      })
    } else {
      router.push({
        name: 'my-locator-slips/editor',
        params: {
          id: slip.id,
        },
      })
    }
  }
}

const openNewLocatorSlipForm = () => {
  resetPayload()
  RequestLocatorSlip.value = true
}

const formTypeOptions = ref([
  { label: 'Locator Slip Form A', value: 'a' },
  { label: 'Locator Slip Form C', value: 'c' },
  { label: 'N/A', value: '' },
])

const payload = reactive<LocatorSlipPayload>({
  form_type: '',
  date: '',
  period: null,
  locator_slip_no: null,
  locator_slip_logger: [
    {
      locator_slip_id: null,
      date: '',
      time_in: null,
      time_out: null,
      destination: '',
      purpose: '',
      approved_for: null,
      duration: null,
      remarks: '',
    },
  ],
})

const resetPayload = () => {
  payload.form_type = ''
}

const formRules = () => ({
  $lazy: true,
  form_type: {
    type_request: helpers.withMessage('Form Type is required', required),
  },
})

const fetchData = async () => {
  locatorSlipsIsLoading.value = true
  if (isHumanResourceActive.value) {
    try {
      const response = await locatorSlipsStore.fetchGroupedLocatorSlip(paginationLimit)
      if (response.success && response.pagination) {
        employeeGroups.value = response.data
        pagination.value = response.pagination
      }
    } catch (e) {
      toast.add({
        severity: 'error',
        summary: 'Cannot view Locator Slips.',
        detail: e,
        life: 5000,
      })
    }
  } else {
    try {
      const response = await locatorSlipsStore.fetchLocatorSlip(paginationLimit)
      if (response.success && response.pagination) {
        pagination.value = response.pagination
      }
    } catch (e) {
      toast.add({
        severity: 'error',
        summary: 'Cannot view Locator Slips.',
        detail: e,
        life: 5000,
      })
    }
  }

  locatorSlipsIsLoading.value = false
}

onBeforeMount(async () => {
  fetchData()
})

const handlePaginationPageChange = async (event: PageState) => {
  locatorSlipsIsLoading.value = true
  const pageSelected = event.page + 1

  if (isHumanResourceActive.value) {
    const response = await locatorSlipsStore.fetchGroupedLocatorSlip(paginationLimit, pageSelected)
    if (response.success && response.pagination) {
      employeeGroups.value = response.data
      pagination.value = response.pagination
    }
  } else {
    const response = await locatorSlipsStore.fetchLocatorSlip(paginationLimit, pageSelected)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
  }
  locatorSlipsIsLoading.value = false
}

const handleSearchLocatorSlip = async () => {
  locatorSlipsIsLoading.value = true
  searchSubmitted.value = true

  if (!searchQuery.value) {
    fetchData()
    return
  }

  const response = await locatorSlipsStore.searchLocatorSlip(searchQuery.value, isHumanResourceActive.value, paginationLimit)
  if (response.success && response.pagination) {
    employeeGroups.value = response.data
    pagination.value = response.pagination
    searchQuery.value = null
  }

  locatorSlipsIsLoading.value = false
}

const handleFilterLocatorSlip = async () => {
  locatorSlipsIsLoading.value = true
  searchSubmitted.value = true

  try {
    const officeId = selectedOffice.value?.value as number | null
    const divId = selectedDivision.value?.value as number | null
    const secId = selectedSectionUnit.value?.value as number | null
    const formType = selectedFormType.value as string | null
    const dateFilter = selectedDateFilter.value ? formatDateSafe(selectedDateFilter.value) : null

    const response = await locatorSlipsStore.filterLocatorSlip(
      officeId,
      divId,
      secId,
      formType,
      dateFilter,
      isHumanResourceActive.value,
      paginationLimit
    )

    if (response.success && response.pagination) {
      employeeGroups.value = response.data
      pagination.value = response.pagination
    }
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Cannot filter Locator Slips.',
      detail: e,
      life: 5000,
    })
  }

  locatorSlipsIsLoading.value = false
  showModal.value = false
}

const exportDocx = async (locatorSlips: LocatorSlipResponse) => {
  const { period, date, id } = locatorSlips
  const monthYear = getLongMonthAndYear(date)

  const message = period
    ? `Exporting locator slip for the ${period} of ${monthYear}.`
    : `Exporting locator slip for the month of ${monthYear}.`

  toast.add({
    severity: 'info',
    summary: 'Exporting Locator Slip...',
    detail: message,
    life: 5000,
  })

  try {
    const reportResponse = await locatorSlipsStore.generateLocatorSlip(String(id))

    const blob = reportResponse.data.value

    if (blob) {
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${reportResponse.fileNameHeader.value}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      const successMessage = period
        ? `Locator Slip for the ${period} of ${monthYear} was exported successfully.`
        : `Locator Slip for the month of ${monthYear} was exported successfully.`

      toast.add({
        severity: 'success',
        summary: 'Export Successful',
        detail: successMessage,
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

const validator = useVuelidate<Partial<LocatorSlipPayload>>(formRules, payload)
const handleSaveSubmissionif = async () => {
  const valid = await validator.value.$validate()
  if (!valid) {
    document.querySelector('.create-locator-creds-section')?.scrollIntoView({ behavior: 'smooth' })
    toast.add({
      severity: 'error',
      summary: 'Cannot create a Locator Slip Request',
      detail: 'Please see the validation messages',
      life: 5000,
    })
    return
  }

  formIsSubmitting.value = true

  try {
    const response = await locatorSlipsStore.createLocatorSlip(payload)
    if (response.success) {
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Locator Slip created successfully',
        life: 5000,
      })
      emit('locator-created', true)

      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } else {
      toast.add({
        severity: 'error',
        summary: 'Locator Slip Not Created',
        detail: response.error_message,
        life: 5000,
      })
      emit('locator-created', false)
    }
  } finally {
    formIsSubmitting.value = false
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
          class="mb-2 mr-4 whitespace-nowrap text-xl font-semibold text-primary-800 dark:text-primary-100 md:text-xl lg:text-4xl"
        >
          <FontAwesomeIcon icon="fa-solid fa-location-dot" />
          {{ !isHumanResourceActive ? ' My Locator Slip ' : 'Locator Slip' }}
        </h1>

        <div class="flex w-full items-center justify-end gap-4">
          <div class="gap-4 whitespace-nowrap md:w-auto">
            <Button
              icon="pi pi-filter-fill"
              v-tooltip.top="'Filter'"
              severity="info"
              size="large"
              class="mr-2 border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100"
              text
              aria-label="Filter"
              @click="showModal = true"
            />

            <Button
              v-if="!isHumanResourceActive"
              icon="pi pi-plus"
              v-tooltip.top="'Request Locator Slip'"
              severity="info"
              size="large"
              class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100 sm:text-primary-400 md:text-primary-400 lg:text-primary-400 dark:lg:text-primary-400"
              text
              @click="openNewLocatorSlipForm"
            />
            <Dialog v-model:visible="RequestLocatorSlip" modal header="Request Locator Slip" :style="{ width: '90vw' }">
              <template #header>
                <div class="flex items-center space-x-3 pt-4 sm:px-6 md:px-8">
                  <FontAwesomeIcon
                    icon="fa-solid fa-location-dot"
                    class="h-6 text-primary-800 dark:text-primary-100 sm:h-7 md:h-8"
                  />
                  <h1 class="font-base text-2xl text-primary-800 dark:text-primary-100 sm:text-xl md:text-2xl">
                    New Locator Slip
                  </h1>
                </div>
              </template>
              <hr />

              <div class="px-4 py-4 sm:px-6 sm:py-6 md:px-12">
                <div class="mb-2">
                  <WbDropdown
                    v-model="payload.form_type"
                    label="Type"
                    required
                    :invalid="validator.form_type.$invalid"
                    :invalid-text="validator.form_type.$errors[0]?.$message"
                    @blur="validator.form_type.$touch"
                    @focusin="validator.form_type.$dirty = false"
                    :options="formTypeOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="mb-4 w-full"
                    placeholder="Choose the type of locator slip."
                    :disabled="isHumanResourceActive"
                  />
                </div>
                <hr />
                <p class="my-2">
                  <strong>Form A - Official Business -</strong> anything related to the performance of official duties /
                  functions.
                  <br />
                  <strong>Form C - Personal Transactions -</strong> anything <strong>NOT</strong> related to the performance of
                  one's official duties / functions. (to be allowed either on Official Time or Personal Time)
                </p>
                <div class="flex justify-end">
                  <Button
                    @click="handleSaveSubmissionif"
                    :loading="formIsSubmitting"
                    :disabled="formIsSubmitting"
                    label="Submit"
                    class="dark:text-secondary-100 border border-primary-500 text-xs text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-600"
                    text
                  >
                    <template #icon>
                      <FontAwesomeIcon icon="fa-solid fa-save" class="mr-2" />
                    </template>
                  </Button>
                </div>
              </div>
            </Dialog>
          </div>
          <div class="flex w-full md:w-auto lg:w-1/2">
            <InputGroup v-model="searchQuery" class="w-full">
              <InputText
                v-model="searchQuery"
                :placeholder="searchBarPlaceholder"
                class="w-full"
                :disabled="locatorSlipsIsLoading"
                @keyup.enter="handleSearchLocatorSlip"
              />
              <Button
                icon="pi pi-search"
                @click="handleSearchLocatorSlip"
                :loading="locatorSlipsIsLoading"
                :disabled="locatorSlipsIsLoading"
              />
            </InputGroup>
          </div>
        </div>
      </div>

      <div class="mt-6 flex flex-col">
        <div class="w-full">
          <div
            v-if="locatorSlipsStore.locatorSlip && locatorSlipsStore.locatorSlip.length > 0 && !locatorSlipsIsLoading"
            class="mx-auto flex h-full w-full flex-col"
          >
            <DataTable
              v-if="!isHumanResourceActive"
              :value="locatorSlipsStore.locatorSlip"
              :loading="locatorSlipsIsLoading"
              class="mt-6"
              dataKey="id"
            >
              <Column
                field="form_type"
                header="Locator Slip"
                headerClass="w-1/3 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="font-semibold uppercase text-surface-600">
                    Locator Slip Form
                    {{ props.data.form_type }}
                  </p>
                  <p v-if="props.data.form_type === 'c'" class="font-semibold uppercase text-success-600">
                    LS No: {{ props.data.locator_slip_no }}
                  </p>
                </template>
              </Column>
              <Column
                field="period"
                header="Period"
                headerClass=" w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="uppercase text-surface-600">
                    {{ props.data.period }}
                    {{ getLongMonthAndYear(props.data.date) }}
                  </p>
                </template>
              </Column>
              <Column field="action" header="Actions" headerClass="w-64 bg-surface-100 opacity-70 font-bold py-2">
                <template #body="props">
                  <div class="flex gap-4 whitespace-nowrap md:w-auto">
                    <Button
                      icon="pi pi-eye"
                      v-tooltip.top="'View Locator Slip'"
                      severity="info"
                      size="large"
                      class="border-none text-lg font-semibold text-primary-600 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
                      text
                      :disabled="props.data.status === 'released'"
                      @click="openLocatorSlip(props.data)"
                    />
                    <Button
                      icon="pi pi-download"
                      v-tooltip.top="'Download Locator Slip'"
                      severity="info"
                      class="border-none text-lg font-semibold text-primary-600 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
                      text
                      @click="exportDocx(props.data)"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>

            <DataTable
              v-else
              v-model:expanded-rows="expandedRows"
              :value="employeeGroups"
              :loading="locatorSlipsIsLoading"
              class="main-locator-table mt-6"
              dataKey="id"
            >
              <Column expander style="width: 5rem" headerClass="bg-surface-100 border-surface-300 opacity-70" />
              <Column
                field="employee.name"
                header="Employee"
                headerClass="w-1/5 bg-surface-100 border-surface-300 opacity-70 font-bold"
              >
                <template #body="props">
                  {{ snakeCaseToTitleCase(props.data.individual_basic_detail.first_name) }}
                  {{ snakeCaseToTitleCase(props.data.individual_basic_detail.middle_name ?? '') }}
                  {{ snakeCaseToTitleCase(props.data.individual_basic_detail.last_name) }}
                </template>
              </Column>
              <Column
                field="id_number"
                header="ID Number"
                headerClass="w-1/5 bg-surface-100 border-surface-300 opacity-70 font-bold"
              >
                <template #body="props">{{ props.data.id_number }}</template>
              </Column>
              <Column field="office" header="Office" headerClass="w-1/5 bg-surface-100 border-surface-300 opacity-70 font-bold">
                <template #body="props">{{ props.data.office.name }}</template>
              </Column>
              <Column
                field="division"
                header="Division"
                headerClass="w-1/5 bg-surface-100 border-surface-300 opacity-70 font-bold"
              >
                <template #body="props">{{ props.data.division.name }}</template>
              </Column>
              <Column
                field="section"
                header="Section or Unit"
                headerClass="w-1/5 bg-surface-100 border-surface-300 opacity-70 font-bold"
              >
                <template #body="props">{{ props.data.section_or_unit.name }}</template>
              </Column>
              <template #expansion="slotProps">
                <DataTable scrollable scroll-height="400px" :value="slotProps.data.locator_slip" dataKey="id">
                  <Column field="form_type" header="Locator Slip" headerClass="w-1/3 border-surface-300 opacity-100 font-bold">
                    <template #body="props">
                      <p class="font-semibold uppercase text-surface-600">
                        Locator Slip Form
                        {{ props.data.form_type }}
                      </p>
                      <p v-if="props.data.form_type === 'c'" class="font-semibold uppercase text-success-600">
                        LS No: {{ props.data.locator_slip_no }}
                      </p>
                    </template>
                  </Column>
                  <Column field="date" header="Period" sortable headerClass="w-80 border-surface-300 opacity-100 font-bold">
                    <template #body="props">
                      <p class="uppercase text-surface-600">
                        {{ props.data.period }}
                        {{ getLongMonthAndYear(props.data.date) }}
                      </p>
                    </template>
                  </Column>
                  <Column field="action" header="Actions" headerClass="w-64 border-surface-300 opacity-100 font-bold">
                    <template #body="props">
                      <div class="flex gap-4 whitespace-nowrap md:w-auto">
                        <Button
                          icon="pi pi-eye"
                          v-tooltip.top="'View Locator Slip'"
                          severity="info"
                          size="large"
                          class="border-none text-lg font-semibold text-primary-600 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
                          text
                          :disabled="props.data.status === 'released'"
                          @click="openLocatorSlip(props.data)"
                        />
                      </div>
                    </template>
                  </Column>
                </DataTable>
              </template>
            </DataTable>
          </div>
          <!-- Skeleton Loader -->
          <div v-else-if="locatorSlipsIsLoading">
            <div class="flex w-full">
              <div v-for="i in isHumanResourceActive ? 5 : 3" :key="i" class="mr-1 flex-1 px-2 py-3">
                <Skeleton height="1.5rem" class="w-full" />
              </div>
            </div>

            <div v-for="i in 5" :key="'row-' + i" class="flex w-full border-b border-surface-200 py-2">
              <template v-if="isHumanResourceActive">
                <div style="width: 5rem" class="flex flex-none items-center justify-center px-2">
                  <Skeleton shape="circle" size="1.5rem" />
                </div>
                <div v-for="j in 5" :key="`hr-col-${i}-${j}`" class="mr-1 flex flex-1 items-center px-2">
                  <Skeleton height="1rem" :width="j === 1 ? '70%' : '90%'" />
                </div>
              </template>

              <template v-else>
                <div class="flex w-1/3 flex-col justify-center px-2">
                  <Skeleton height="1rem" width="60%" class="mb-1" />
                  <Skeleton height="0.75rem" width="40%" />
                </div>
                <div class="flex w-80 flex-none items-center px-2">
                  <Skeleton height="1rem" width="80%" />
                </div>
                <div class="flex w-80 flex-none items-start justify-end px-2">
                  <Skeleton shape="circle" size="2.5rem" />
                  <Skeleton shape="circle" size="2.5rem" />
                </div>
              </template>
            </div>
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
        <div v-if="!locatorSlipsIsLoading && !pagination?.total && !searchSubmitted" class="mx-auto flex h-full w-full flex-col">
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
                      icon="pi pi-plus"
                      label="Request Locator Slip"
                      severity="info"
                      size="large"
                      class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100 sm:text-primary-400 md:text-primary-400 lg:text-primary-400 dark:lg:text-primary-400"
                      text
                      @click="openNewLocatorSlipForm"
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
          :apiEndpoint="'/libraries/offices/search'"
          :suggestions="libraryStore.officeOptions"
          :loading="libraryStore.officeOptionsLoading"
          apiOptionLabel="name"
          label="Office"
          placeholder="Type the Office"
          v-model="selectedOffice"
          :id="getId('input-office')"
          optionLabel="label"
          optionValue="value"
          @on-true-value-computed="
            (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
              useWbAutoCompleteHandleTrueValue(value, toRef('office_id'))
          "
          label-class="text-sm text-start text-surface-600 dark:lg:text-surface-200"
          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
        />
      </div>
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
      <div class="mb-4">
        <WbDropdown
          v-model="selectedFormType"
          :options="formTypeOptions"
          optionLabel="label"
          optionValue="value"
          label="Form Type"
          placeholder="Select Form Type"
          label-class="text-sm text-start text-surface-600"
        />
      </div>
      <div class="mb-4">
        <WbCalendar
          view="month"
          v-model="selectedDateFilter"
          label="Month and Year"
          label-class=" text-sm text-surface-600"
          dateFormat="MM, yy"
          :maxDate="new Date()"
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
          :loading="locatorSlipsIsLoading"
          :disabled="locatorSlipsIsLoading"
          @click="handleFilterLocatorSlip"
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
