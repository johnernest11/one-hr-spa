<script setup lang="ts">
import { onBeforeMount, ref, computed, toRef } from 'vue'
import { useLibrariesStore } from '@/stores/libraries.store'
import { useCompensatoryTimeOffStore } from '@/stores/personnel-compensatory-time-off.store.ts'
import { PersonnelCompensatoryDayTimeOffResponse } from '@/typings/models.types.ts'
import { useRouter } from 'vue-router'
import { useRoute } from 'vue-router'
import { formatDate } from '@/utils/helpers'

import Button from 'primevue/button'
import Chip from 'primevue/chip'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import InputGroup from 'primevue/inputgroup'
import Dialog from 'primevue/dialog'
import WbDropdown from '@/components/webkit/WbDropdown.vue'
import WbAutoComplete, { WbAutoCompleteOption, WbAutoCompleteOptionTrueValue } from '@/components/webkit/WbAutoComplete.vue'

import { useWbAutoCompleteHandleTrueValue } from '@/composables/wb-ui-components'
import { ApiResponsePagination } from '@/typings/http-resources.types.ts'
import Paginator, { PageState } from 'primevue/paginator'
import { usePrependOrAppendOnce } from '@/utils/helpers'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useToast } from 'primevue/usetoast'

const compensatoryDayTimeOffStore = useCompensatoryTimeOffStore()
const libraryStore = useLibrariesStore()
const getId = usePrependOrAppendOnce('compensatory-timeday-off')
const isHumanResourceActive = computed(() => {
  const routeName = route.name
  return routeName === 'ctdo-report-list' || routeName === 'staff-ctdos'
})

const selectedDivision = ref<WbAutoCompleteOption[] | null>(null)
const selectedSectionUnit = ref<WbAutoCompleteOption[] | null>(null)
const selectedPositions = ref<WbAutoCompleteOption[] | null>(null)
const selectedStatus = ref<string | null>(null)
const pagination = ref<ApiResponsePagination | null>(null)
const searchQuery = ref<string | null>(null)

const compensatoryDayTimeOffIsLoading = ref(false)
const searchSubmitted = ref(false)
const showModal = ref(false)
const toast = useToast()
const router = useRouter()
const route = useRoute()
const paginationLimit = 5

const employementStatusOptions = ref([
  { label: 'Permanent', value: 'Permanent' },
  { label: 'Contractual', value: 'Contractual' },
  { label: 'Contract of Service', value: 'Contract of Service' },
  { label: 'Job Order', value: 'Job Order' },
])

const statusOptions = ref([
  { label: 'Draft', value: 'draft' },
  { label: 'For Review', value: 'done' },
  { label: 'For Revision', value: 'for revision' },
  { label: 'Approved', value: 'approved' },
])

const navigateToDetails = (compensatoryTimeOff: PersonnelCompensatoryDayTimeOffResponse) => {
  if (!compensatoryTimeOff || !compensatoryTimeOff.id) {
    console.error('Cannot navigate to details: Compensatory Day Time Offs or ID is undefined', compensatoryTimeOff)
    return
  }
  let targetRouteName
  if (isHumanResourceActive.value) {
    targetRouteName = 'ctdo-report-list/editor'
  } else {
    targetRouteName = 'ctdo-reports/editor'
  }

  router.push({
    name: targetRouteName,
    params: {
      id: compensatoryTimeOff.id,
    },
  })
}

onBeforeMount(async () => {
  compensatoryDayTimeOffIsLoading.value = true
  const response = await compensatoryDayTimeOffStore.fetchCompensatoryDayTimeOff(paginationLimit)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  compensatoryDayTimeOffIsLoading.value = false
})

const fetchCompensatoryBasedOnContext = async (page = 1) => {
  compensatoryDayTimeOffIsLoading.value = true
  const statusFilter = isHumanResourceActive.value ? ['for review', 'approved'] : undefined

  const response = await compensatoryDayTimeOffStore.fetchCompensatoryDayTimeOff(paginationLimit, page, statusFilter)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  compensatoryDayTimeOffIsLoading.value = false
}

onBeforeMount(() => fetchCompensatoryBasedOnContext())

const handlePaginationPageChange = async (event: PageState) => {
  await fetchCompensatoryBasedOnContext(event.page + 1)
}

const handleSearchCompensatoryTimeOff = async () => {
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

const handleFilterCompensatoryDayTimeOff = async () => {
  compensatoryDayTimeOffIsLoading.value = true
  if (!selectedStatus.value) {
    const response = await compensatoryDayTimeOffStore.fetchCompensatoryDayTimeOff(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    return (compensatoryDayTimeOffIsLoading.value = false)
  }

  const response = await compensatoryDayTimeOffStore.filterCompensatoryDayTimeOff(selectedStatus.value)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
    searchQuery.value = null
  }

  compensatoryDayTimeOffIsLoading.value = false
  showModal.value = false
}

const exportPdf = async (compensatoryDayTimeOff: PersonnelCompensatoryDayTimeOffResponse) => {
  const { ctdo_period, id } = compensatoryDayTimeOff
  toast.add({
    severity: 'info',
    summary: 'Exporting...',
    detail: `Exporting ${ctdo_period} of  Compensatory Time Day Off '...`,
    life: 5000,
  })
  const reportResponse = await compensatoryDayTimeOffStore.generateCompensatoryDayTimeOff(String(id))

  const blob = reportResponse.data.value
  const fileName = reportResponse.fileNameHeader?.value || `Compensatory-Form-${id}.docx`

  if (blob) {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
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
</script>
<template>
  <div class="flex h-full w-full flex-col shadow-md">
    <div class="h-full w-full rounded-md bg-surface-0 p-6">
      <div
        class="flex flex-row items-center space-x-4 font-medium text-primary-700 dark:text-primary-100 md:ml-4 md:mt-2 md:flex-row"
      >
        <h1 class="mb-2 mr-4 whitespace-nowrap text-xl text-surface-600 dark:text-primary-100 md:text-xl lg:text-4xl">
          Compensatory Time Day Offs (CTDO)
          <br />
          <span class="ml-4 text-lg text-surface-600 md:text-xl lg:text-2xl">{{
            isHumanResourceActive ? 'For Review' : ''
          }}</span>
        </h1>
        <div class="flex w-full items-center justify-end gap-4">
          <div class="flex space-x-2 whitespace-nowrap md:w-auto">
            <Button
              icon="pi pi-filter-fill"
              v-tooltip.top="'Filter Compensatory Day Time Off'"
              severity="info"
              size="large"
              class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100"
              text
              @click="showModal = true"
            />
            <RouterLink :to="{ name: 'ctdo-reports/store' }">
              <Button
                v-if="!isHumanResourceActive"
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
                @keyup.enter="handleSearchCompensatoryTimeOff"
              />
              <Button icon="pi pi-search" @click="handleSearchCompensatoryTimeOff" />
            </InputGroup>
          </div>
        </div>
      </div>
      <div class="mt-6 flex flex-col">
        <div class="w-full">
          <div class="mx-auto flex h-full w-full flex-col">
            <DataTable :value="compensatoryDayTimeOffStore.compensatory" class="mt-6" dataKey="id">
              <Column
                v-if="isHumanResourceActive"
                field="period"
                headerClass="w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #header>
                  <div class="flex flex-col">
                    <span class="text-base text-surface-600">Employee</span>
                    <span class="text-sm font-normal text-surface-500">ID Number</span>
                  </div>
                </template>

                <template #body="props">
                  <div class="flex flex-col">
                    <p class="font-semibold uppercase text-surface-600">
                      {{
                        [
                          props.data.employee_id?.individual_basic_detail_id?.first_name,
                          props.data.employee_id?.individual_basic_detail_id?.middle_name,
                          props.data.employee_id?.individual_basic_detail_id?.last_name,
                        ]
                          .filter(Boolean)
                          .join(' ')
                      }}
                    </p>
                    <p class="text-sm text-surface-500">
                      {{ props.data.employee_id.id_number || 'N/A' }}
                    </p>
                  </div>
                </template>
              </Column>
              <Column
                field="period"
                header="Period"
                headerClass="w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
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
              <Column
                field="status"
                header="Status"
                headerClass="w-64 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <template v-if="props.data.ctdo_status === 'draft'">
                    <Chip
                      label="Draft"
                      class="flex items-center justify-center !bg-surface-500 px-4 py-1 font-semibold !text-surface-0"
                    >
                    </Chip>
                  </template>
                  <template v-else-if="props.data.ctdo_status === 'for review'">
                    <Chip
                      label="For Review"
                      class="flex items-center justify-center !bg-success-800 px-4 py-1 font-semibold !text-surface-0"
                    />
                  </template>
                  <template v-else-if="props.data.ctdo_status === 'for revision'">
                    <Chip
                      label="For Revision"
                      class="flex items-center justify-center !bg-warn-800 px-4 py-1 font-semibold !text-surface-0"
                    />
                  </template>
                  <template v-else-if="props.data.ctdo_status === 'approved'">
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
                      v-tooltip.top="'View Compensatory Day Time Off'"
                      severity="info"
                      class="border-none text-lg font-semibold text-primary-600 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
                      text
                      @click="navigateToDetails(props.data)"
                    />
                    <Button
                      icon="pi pi-file-pdf"
                      v-tooltip.top="'View Compensatory Day Time Off'"
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
          <p>No Compensatory Day Time Off found</p>
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
    </div>
  </div>

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
    <div class="flex-1 overflow-auto px-4 pb-24">
      <h2 class="mb-2 mt-4 text-sm font-medium text-surface-500 dark:text-primary-100">Filters</h2>
      <div class="mb-4" v-if="!isHumanResourceActive">
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
          :apiEndpoint="'/libraries/positions/search'"
          :suggestions="libraryStore.positionsOptions"
          :loading="libraryStore.positionsOptionsLoading"
          apiOptionLabel="title"
          label="Position"
          placeholder="Type the Position"
          v-model="selectedPositions"
          :id="getId('input-position')"
          optionLabel="label"
          optionValue="value"
          @on-true-value-computed="
            (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
              useWbAutoCompleteHandleTrueValue(value, toRef('position_id'))
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
          :loading="compensatoryDayTimeOffIsLoading"
          :disabled="compensatoryDayTimeOffIsLoading"
          @click="handleFilterCompensatoryDayTimeOff"
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
</template>
