<script setup lang="ts">
import { onBeforeMount, ref, watch, reactive, onMounted, toRef } from 'vue'
import { SectionorUnitResponse } from '@/typings/models.types.ts'
import { useToast } from 'primevue/usetoast'
import { useRoute } from 'vue-router'

import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputGroup from 'primevue/inputgroup'
import Paginator, { PageState } from 'primevue/paginator'
import WbAutoComplete, { WbAutoCompleteOption, WbAutoCompleteOptionTrueValue } from '@/components/webkit/WbAutoComplete.vue'

import { useWbAutoCompleteHandleTrueValue } from '@/composables/wb-ui-components'
import useVuelidate from '@vuelidate/core'
import { ApiResponsePagination } from '@/typings/http-resources.types.ts'
import { parseApiResponseError } from '@/utils/error-handle.ts'
import { helpers, maxLength, required } from '@vuelidate/validators'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import WbInputText from '@/components/webkit/WbInputText.vue'
import { useLibrariesStore, SectionorUnitPayload } from '@/stores/libraries.store'
import { formatDate } from '@/utils/helpers'
import { usePrependOrAppendOnce } from '@/utils/helpers'

const getId = usePrependOrAppendOnce('section-or-unit')
const sectionorunitStore = useLibrariesStore()
const route = useRoute()
const toast = useToast()

const createSectionorUnit = ref(false)
const searchSubmitted = ref(false)
const sectionorUnitIsLoading = ref(false)
const isLoading = ref(true)
const isEditMode = ref(false)
const showFilterModal = ref(false)
const formIsSubmitting = ref(false)
const showErrorAlert = ref(false)
const paginationLimit = 5
const searchQuery = ref<string | null>(null)
const errorMessage = ref<string | null>(null)
const selectedFilter = ref<string | null>(null)
const errorDetails = ref<string[]>([])
const pagination = ref<ApiResponsePagination | null>(null)
const selectedDivision = ref<WbAutoCompleteOption[] | null>(null)

const emit = defineEmits<{
  (e: 'sectionorunit-created', value: boolean): void
}>()

const openSectionUnitDialog = (sectionorunit: SectionorUnitResponse | null = null) => {
  if (!sectionorunit || !sectionorunit.id) {
    console.error('Cannot navigate to details: Section or Unit or ID is undefined', sectionorunit)
    return
  }
  if (sectionorunit) {
    updatePayloadFromSectionUnit(sectionorunit)
    isEditMode.value = true
  } else {
    resetPayload() // clear form if new
    isEditMode.value = false
  }
  createSectionorUnit.value = true
}

const opensectionorunitForm = () => {
  resetPayload()
  createSectionorUnit.value = true
}

const payload = reactive<SectionorUnitPayload>({
  name: '',
  division_id: '',
})

const resetPayload = () => {
  payload.name = ''
}

const globalStringMaxLength = import.meta.env.VITE_GLOBAL_STRING_MAX_LENGTH
const globalStringMaxLengthRule = helpers.withMessage(
  `Must not exceed ${globalStringMaxLength} characters`,
  maxLength(globalStringMaxLength)
)

const formRules = () => ({
  $lazy: true,
  name: {
    required: helpers.withMessage('Name is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
  },
})

onBeforeMount(async () => {
  sectionorUnitIsLoading.value = true
  const response = await sectionorunitStore.fetchListSectionUnits(paginationLimit)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
    console.log('Fetched Section or Unit rows:', response.data)
  }
  sectionorUnitIsLoading.value = false
})

const handlePaginationPageChange = async (event: PageState) => {
  const pageSelected = event.page + 1
  sectionorUnitIsLoading.value = true
  const response = await sectionorunitStore.fetchListSectionUnits(paginationLimit, pageSelected)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  sectionorUnitIsLoading.value = false
}

const handleSearchSectionUnits = async () => {
  sectionorUnitIsLoading.value = true
  searchSubmitted.value = true

  if (!searchQuery.value) {
    const response = await sectionorunitStore.fetchListSectionUnits(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    sectionorUnitIsLoading.value = false
    return
  }

  const response = await sectionorunitStore.searchListSectionUnits(searchQuery.value)
  if (response.success && response.pagination) {
    pagination.value = response.pagination

    searchQuery.value = null
  }
  sectionorUnitIsLoading.value = false
}

const handleFilterSectionUnits = async () => {
  sectionorUnitIsLoading.value = true
  if (!selectedFilter.value) {
    const response = await sectionorunitStore.fetchListSectionUnits(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    return (sectionorUnitIsLoading.value = false)
  }

  const response = await sectionorunitStore.filterListSectionUnits(selectedFilter.value)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
    searchQuery.value = null
  }

  sectionorUnitIsLoading.value = false
  showFilterModal.value = false
}

type sectionorunitDetailsFormProps = {
  sectionorunit?: SectionorUnitResponse
}
const props = defineProps<sectionorunitDetailsFormProps>()
onMounted(async () => {
  const id = route.params.id as string
  if (id) {
    const response = await sectionorunitStore.fetchListSectionUnits()
    if (response && response.success) {
      updatePayloadFromSectionUnit(response.data as SectionorUnitResponse)
    }
  }
  isLoading.value = false
})

const updatePayloadFromSectionUnit = (sectionorunit: SectionorUnitResponse | null) => {
  payload.name = sectionorunit?.name ?? ''
  payload.name = sectionorunit?.division_id ?? ''
}

watch(
  () => props.sectionorunit,
  (newValue) => {
    if (newValue) {
      updatePayloadFromSectionUnit(newValue)
    } else {
      payload.name = ''
      payload.division_id = ''
    }
  },
  { immediate: true }
)

const validator = useVuelidate<Partial<SectionorUnitPayload>>(formRules, payload)
const handleSaveSubmissionif = async () => {
  const valid = await validator.value.$validate()
  if (!valid) {
    document.querySelector('.create-division-creds-section')?.scrollIntoView({ behavior: 'smooth' })
    toast.add({
      severity: 'error',
      summary: 'Create a Section or Unit',
      detail: 'Please see the validation messages',
      life: 5000,
    })
    return
  }

  formIsSubmitting.value = true

  try {
    const sectionorunit = {
      name: payload.name,
      division_id: payload.division_id,
    }

    const sectionunitResponse = await sectionorunitStore.createSectionUnits(sectionorunit)

    if (!sectionunitResponse.success) {
      const result = parseApiResponseError(sectionunitResponse)
      if (!result) {
        formIsSubmitting.value = false
        return
      }
      showErrorAlert.value = true
      errorMessage.value = result.message
      errorDetails.value = result.errors
      formIsSubmitting.value = false
      document.querySelector('.create-sectionorunit-creds-section')?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Section or Unit submitted successfully',
      life: 5000,
    })
    emit('sectionorunit-created', true)
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
          class="mb-2 ml-4 mr-4 whitespace-nowrap text-xl font-semibold text-primary-800 dark:text-primary-100 md:text-xl lg:text-4xl"
        >
          <font-awesome-icon :icon="['fas', 'braille']" />
          Section or Unit Creation
        </h1>

        <div class="flex w-full items-center justify-end gap-4">
          <div class="flex space-x-2 whitespace-nowrap md:w-auto">
            <Button
              icon="pi pi-filter-fill"
              v-tooltip.top="'Filter Section or Unit'"
              severity="info"
              size="large"
              class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100"
              text
              @click="showFilterModal = true"
            />

            <Button
              icon="pi pi-plus"
              v-tooltip.top="'Section or Unit Creation'"
              severity="info"
              size="large"
              class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100 sm:text-primary-400 md:text-primary-400 lg:text-primary-400 dark:lg:text-primary-400"
              text
              @click="opensectionorunitForm"
            />
          </div>
          <div class="flex w-full md:w-auto lg:w-1/2">
            <InputGroup v-model="searchQuery" class="w-full">
              <InputText
                v-model="searchQuery"
                placeholder="Search via Section/Unit Name"
                class="w-full"
                :disabled="sectionorUnitIsLoading"
                @keyup.enter="handleSearchSectionUnits"
              />
              <Button
                icon="pi pi-search"
                @click="handleSearchSectionUnits"
                :loading="sectionorUnitIsLoading"
                :disabled="sectionorUnitIsLoading"
              />
            </InputGroup>
          </div>
        </div>
      </div>

      <div class="mt-6 flex flex-col">
        <div class="w-full">
          <div
            v-if="sectionorunitStore.sectionsorunits && sectionorunitStore.sectionsorunits.length > 0"
            class="mx-auto flex h-full w-full flex-col"
          >
            <DataTable :value="sectionorunitStore.sectionsorunits" :loading="sectionorUnitIsLoading" class="mt-6" dataKey="id">
              <template #loading>
                <div class="flex h-full w-full items-center justify-center text-primary-600">
                  <i class="pi pi-spin pi-spinner text-3xl"></i>
                </div>
              </template>
              <Column
                field="title"
                header="SECTION/UNIT NAME"
                headerClass="w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="font-semibold text-surface-600">
                    {{ props.data.name }}
                  </p>
                </template>
              </Column>
              <Column
                field="title"
                header="DIVISION NAME"
                headerClass="w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="font-semibold text-surface-600">
                    {{ props.data.divisions?.name ?? '-' }}
                  </p>
                </template>
              </Column>
              <Column
                field="level"
                header="CREATED"
                headerClass=" w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="text-surface-600">
                    {{ formatDate(props.data.created_at) }}
                  </p>
                </template>
              </Column>
              <Column field="action" header="Action" headerClass="w-64 bg-surface-100 opacity-70 font-bold py-2">
                <template #body="props">
                  <div class="flex gap-4 whitespace-nowrap md:w-auto">
                    <Button
                      icon="pi pi-eye"
                      v-tooltip.top="'Update Status'"
                      severity="info"
                      size="large"
                      class="border-none text-lg font-semibold text-primary-600 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
                      text
                      @click="openSectionUnitDialog(props.data)"
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
          v-if="searchSubmitted && !sectionorUnitIsLoading && !sectionorunitStore.sectionsorunits.length"
          class="flex h-full w-full flex-col items-center justify-center font-menu text-lg dark:text-surface-300"
        >
          <i class="pi pi-exclamation-triangle mb-2 text-2xl"></i>
          <p>No Section or Unit found</p>
        </div>
      </div>
    </div>
  </div>
  <!-- Create/Update Section or Unit Dialog -->
  <Dialog v-model:visible="createSectionorUnit" modal header="Section or Unit Creation" :style="{ width: '90vw' }">
    <template #header>
      <div class="flex items-center space-x-3 pt-4 sm:px-6 md:px-8">
        <h1 class="font-base text-2xl text-surface-600 sm:text-xl md:text-2xl">Section or Unit Creation</h1>
      </div>
    </template>
    <hr />
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
      <div class="mb-6 flex flex-col gap-2 md:flex-row md:gap-4">
        <WbInputText
          v-model="payload.name"
          required
          label="Section or Unit Name"
          label-class="text-md text-surface-600 dark:lg:text-surface-200"
          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
        >
        </WbInputText>
      </div>
      <div class="mb-6 flex flex-col gap-2 md:flex-row md:gap-4">
        <WbAutoComplete
          :useApiFilter="true"
          :apiEndpoint="'/libraries/divisions/search'"
          :suggestions="sectionorunitStore.divisionOptions"
          :loading="sectionorunitStore.divisionOptionsLoading"
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
      <div class="mt-2 flex justify-end gap-2">
        <Button
          label="Cancel"
          class="dark:text-secondary-100 border border-surface-400 text-base text-surface-500 dark:border-surface-700 lg:text-surface-500 dark:lg:text-surface-400"
          text
          @click="createSectionorUnit = false"
        >
          <template #icon>
            <i class="pi pi-ban mr-2"></i>
          </template>
        </Button>
        <Button
          v-if="!isEditMode"
          @click="handleSaveSubmissionif"
          :loading="formIsSubmitting"
          :disabled="formIsSubmitting"
          label="Create"
          class="dark:text-secondary-100 border border-primary-500 text-sm text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-600"
          text
        >
          <template #icon>
            <font-awesome-icon icon="save" class="mr-2" />
          </template>
        </Button>
        <Button
          v-else
          :loading="formIsSubmitting"
          :disabled="formIsSubmitting"
          label="Update"
          class="dark:text-secondary-100 border border-primary-500 text-sm text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-600"
          text
        >
          <template #icon>
            <font-awesome-icon icon="edit" class="mr-2" />
          </template>
        </Button>
      </div>
    </div>
  </Dialog>

  <Dialog
    v-model:visible="showFilterModal"
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
          <font-awesome-icon icon="bars-staggered" class="mr-2" />
          Filter and Field Options
        </h1>
      </div>
    </template>
    <!-- Scrollable Content (space reserved for footer height) -->
    <div class="flex-1 overflow-auto px-4 pb-24">
      <h2 class="mb-2 mt-4 text-sm font-medium text-surface-500 dark:text-primary-100">Filters</h2>
      <div class="mb-4">
        <WbAutoComplete
          :useApiFilter="true"
          :apiEndpoint="'/libraries/divisions/search'"
          :suggestions="sectionorunitStore.divisionOptions"
          :loading="sectionorunitStore.divisionOptionsLoading"
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
    </div>
    <!-- Fixed Footer (inside dialog container) -->
    <div
      class="absolute bottom-0 left-0 right-0 border-t border-surface-300 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900"
    >
      <div class="flex flex-col items-center justify-center gap-2 sm:flex-row">
        <Button
          label="Cancel"
          class="dark:text-secondary-100 w-full border border-surface-400 px-4 py-2 text-surface-500 dark:border-surface-700"
          @click="showFilterModal = false"
          text
        >
          <template #icon>
            <i class="pi pi-ban mr-2 text-lg"></i>
          </template>
        </Button>
        <Button
          :loading="sectionorUnitIsLoading"
          :disabled="sectionorUnitIsLoading"
          @click="handleFilterSectionUnits"
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
