<script setup lang="ts">
import { onBeforeMount, ref, watch, reactive, onMounted } from 'vue'
import { SalaryGradeResponse } from '@/typings/models.types.ts'
import { useToast } from 'primevue/usetoast'
import { useRoute } from 'vue-router'

import Button from 'primevue/button'
import Column from 'primevue/column'
import Menu from 'primevue/menu'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputGroup from 'primevue/inputgroup'
import Paginator, { PageState } from 'primevue/paginator'
import FileUpload from 'primevue/fileupload'

import useVuelidate from '@vuelidate/core'
import { ApiResponsePagination } from '@/typings/http-resources.types.ts'
import { parseApiResponseError } from '@/utils/error-handle.ts'
import { helpers, maxLength, required } from '@vuelidate/validators'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import WbInputText from '@/components/webkit/WbInputText.vue'
import { useSalaryGradesStore, SalaryGradePayload } from '@/stores/salary-grades.store'
import { formatDate, formatAmount } from '@/utils/helpers'

const salaryGradeStore = useSalaryGradesStore()
const route = useRoute()
const toast = useToast()

const createSalaryGrade = ref(false)
const creationMode = ref<'via-manual-input' | 'via-importation' | null>(null)
const searchSubmitted = ref(false)
const salaryGradeIsLoading = ref(false)
const isLoading = ref(true)
const isEditMode = ref(false)
const formIsSubmitting = ref(false)
const showErrorAlert = ref(false)
const paginationLimit = 5
const searchQuery = ref<string | null>(null)
const errorMessage = ref<string | null>(null)
const errorDetails = ref<string[]>([])
const pagination = ref<ApiResponsePagination | null>(null)
const menu = ref()
const emit = defineEmits<{
  (e: 'salaryGrade-created', value: boolean): void
}>()

const creation_Selection = ref([
  {
    items: [
      {
        label: 'via Manual Input',
        mode: 'via-manual-input',
        command: () => {
          creationMode.value = 'via-manual-input'
          createSalaryGrade.value = true
        },
      },
      {
        label: 'via Importation',
        mode: 'via-importation',
        command: () => {
          creationMode.value = 'via-importation'
          createSalaryGrade.value = true
        },
      },
    ],
  },
])
const openSalaryGradeDialog = (salaryGrade: SalaryGradeResponse | null = null) => {
  if (!salaryGrade || !salaryGrade.id) {
    console.error('Cannot navigate to details: Salary grade or ID is undefined', salaryGrade)
    return
  }
  if (salaryGrade) {
    updatePayloadFromReport(salaryGrade)
    isEditMode.value = true
  } else {
    resetPayload() // clear form if new
    isEditMode.value = false
  }
  createSalaryGrade.value = true
}

const payload = reactive<SalaryGradePayload>({
  nbc_no: 0,
  effective_date: null,
  tranche: null,
  salary_grade: null,
  step: null,
  amount: 0,
})

const resetPayload = () => {
  payload.nbc_no = null
  payload.effective_date = null
  payload.tranche = null
  payload.salary_grade = null
  payload.step = null
  payload.amount = 0
}

const globalStringMaxLength = import.meta.env.VITE_GLOBAL_STRING_MAX_LENGTH
const globalStringMaxLengthRule = helpers.withMessage(
  `Must not exceed ${globalStringMaxLength} characters`,
  maxLength(globalStringMaxLength)
)

const formRules = () => ({
  $lazy: true,
  nbc_no: {
    required: helpers.withMessage('NBC No. is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
  },
  effective_date: {
    required: helpers.withMessage('Effective Date is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
  },
  tranche: {
    required: helpers.withMessage('Tranche No. is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
  },
  salary_grade: {
    required: helpers.withMessage('Salary Grade is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
  },
  step: {
    required: helpers.withMessage('Step No. is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
  },
  amount: {
    required: helpers.withMessage('Amount is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
  },
})

onBeforeMount(async () => {
  salaryGradeIsLoading.value = true
  const response = await salaryGradeStore.fetchListSalaryGrade(paginationLimit)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
    console.log('Fetched Salary Grade rows:', response.data)
  }
  salaryGradeIsLoading.value = false
})

const handlePaginationPageChange = async (event: PageState) => {
  const pageSelected = event.page + 1
  salaryGradeIsLoading.value = true
  const response = await salaryGradeStore.fetchListSalaryGrade(paginationLimit, pageSelected)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  salaryGradeIsLoading.value = false
}

const handleSearchSalary = async () => {
  salaryGradeIsLoading.value = true
  searchSubmitted.value = true

  if (!searchQuery.value) {
    const response = await salaryGradeStore.fetchListSalaryGrade(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    salaryGradeIsLoading.value = false
    return
  }

  const response = await salaryGradeStore.searchSalaryGrade(searchQuery.value)
  if (response.success && response.pagination) {
    pagination.value = response.pagination

    searchQuery.value = null
  }
  salaryGradeIsLoading.value = false
}

type salaryGradeDetailsFormProps = {
  salaryGrade?: SalaryGradeResponse
}
const props = defineProps<salaryGradeDetailsFormProps>()
onMounted(async () => {
  const id = route.params.id as string
  if (id) {
    const response = await salaryGradeStore.fetchListSalaryGrade()
    if (response && response.success) {
      updatePayloadFromReport(response.data as SalaryGradeResponse)
    }
  }
  isLoading.value = false
})

const updatePayloadFromReport = (salaryGrade: SalaryGradeResponse | null) => {
  payload.nbc_no = salaryGrade?.nbc_no ?? null
  payload.effective_date = salaryGrade?.effective_date ?? null
  payload.tranche = salaryGrade?.tranche ?? null
  payload.salary_grade = salaryGrade?.salary_grade ?? null
  payload.step = salaryGrade?.step ?? null
  payload.amount = salaryGrade?.amount ?? 0
}

watch(
  () => props.salaryGrade,
  (newValue) => {
    if (newValue) {
      updatePayloadFromReport(newValue)
    } else {
      payload.nbc_no = null
      payload.effective_date = null
      payload.tranche = null
      payload.salary_grade = null
      payload.step = null
      payload.amount = 0
    }
  },
  { immediate: true }
)

const toggleAddingList = (event: Event) => {
  menu.value.toggle(event)
}

const fileName = ref('No file selected')

const uploadedFile = ref<File | null>(null)

const onFileSelect = (event: { files?: File[] }) => {
  const file = event.files?.[0] || null
  uploadedFile.value = file
  fileName.value = file?.name || 'No file selected'
}

const downloadTemplate = async () => {
  const response = await fetch('/mock/Salary-Grade-Template.xlsx')
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'Salary-Grade-Template.xlsx'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)

  toast.add({
    severity: 'success',
    summary: 'Template Downloaded',
    detail: 'The salary grade template for import has been downloaded successfully.',
    life: 5000,
  })
}

const validator = useVuelidate<Partial<SalaryGradeResponse>>(formRules, payload)
const handleSaveSubmissionif = async () => {
  const valid = await validator.value.$validate()
  if (!valid) {
    document.querySelector('.create-salaryGrade-creds-section')?.scrollIntoView({ behavior: 'smooth' })
    toast.add({
      severity: 'error',
      summary: 'Create a Salary Grade',
      detail: 'Please see the validation messages',
      life: 5000,
    })
    return
  }

  formIsSubmitting.value = true

  try {
    const salaryGrade = {
      nbc_no: payload.nbc_no,
      effective_date: payload.effective_date,
      tranche: payload.tranche,
      salary_grade: payload.salary_grade,
      step: payload.step,
      amount: payload.amount,
    }

    const salaryResponse = await salaryGradeStore.createSalaryGrade(salaryGrade)

    if (!salaryResponse.success) {
      const result = parseApiResponseError(salaryResponse)
      if (!result) {
        formIsSubmitting.value = false
        return
      }
      showErrorAlert.value = true
      errorMessage.value = result.message
      errorDetails.value = result.errors
      formIsSubmitting.value = false
      document.querySelector('.create-salaryGrade-creds-section')?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Salary Grade submitted successfully',
      life: 5000,
    })
    emit('salaryGrade-created', true)
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
          <font-awesome-icon :icon="['fas', 'coins']" />
          Salary Grades Creation
        </h1>

        <div class="flex w-full items-center justify-end gap-4">
          <div class="gap-4 whitespace-nowrap md:w-auto">
            <Button
              icon="pi pi-plus"
              v-tooltip.top="'Salary Grade Creation'"
              severity="info"
              size="large"
              class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100 sm:text-primary-400 md:text-primary-400 lg:text-primary-400 dark:lg:text-primary-400"
              text
              @click="toggleAddingList"
            />
            <Menu ref="menu" id="overlay_menu" :model="creation_Selection" :popup="true">
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
                placeholder="Search via NBC No & Effective Date"
                class="w-full"
                :disabled="salaryGradeIsLoading"
                @keyup.enter="handleSearchSalary"
              />
              <Button
                icon="pi pi-search"
                @click="handleSearchSalary"
                :loading="salaryGradeIsLoading"
                :disabled="salaryGradeIsLoading"
              />
            </InputGroup>
          </div>
        </div>
      </div>

      <div class="mt-6 flex flex-col">
        <div class="w-full">
          <div
            v-if="salaryGradeStore.salaryGrade && salaryGradeStore.salaryGrade.length > 0"
            class="mx-auto flex h-full w-full flex-col"
          >
            <DataTable :value="salaryGradeStore.salaryGrade" :loading="salaryGradeIsLoading" class="mt-6" dataKey="id">
              <template #loading>
                <div class="flex h-full w-full items-center justify-center text-primary-600">
                  <i class="pi pi-spin pi-spinner text-3xl"></i>
                </div>
              </template>
              <Column
                field="title"
                header="NBC NO."
                headerClass="w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="font-semibold text-surface-600">
                    {{ props.data.nbc_no }}
                  </p>
                </template>
              </Column>
              <Column
                field="level"
                header="TRANCHE"
                headerClass=" w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="text-surface-600">
                    {{ props.data.tranche }}
                  </p>
                </template>
              </Column>
              <Column
                field="level"
                header="SALARY GRADE"
                headerClass=" w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="text-surface-600">
                    {{ props.data.salary_grade }}
                  </p>
                </template>
              </Column>
              <Column field="level" header="STEP" headerClass=" w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2">
                <template #body="props">
                  <p class="text-surface-600">
                    {{ props.data.step }}
                  </p>
                </template>
              </Column>
              <Column
                field="level"
                header="AMOUNT"
                headerClass=" w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="text-surface-600">
                    {{ formatAmount(props.data.amount) }}
                  </p>
                </template>
              </Column>
              <Column
                field="level"
                header="EFFECTIVE DATE"
                headerClass=" w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="text-surface-600">
                    {{ formatDate(props.data.effective_date) }}
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
                      :disabled="props.data.status === 'released'"
                      @click="openSalaryGradeDialog(props.data)"
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
          v-if="searchSubmitted && !salaryGradeIsLoading && !salaryGradeStore.salaryGrade.length"
          class="flex h-full w-full flex-col items-center justify-center font-menu text-lg dark:text-surface-300"
        >
          <i class="pi pi-exclamation-triangle mb-2 text-2xl"></i>
          <p>No Salary Grade found</p>
        </div>
      </div>
    </div>
  </div>
  <!-- Create/Update Salary Grade Dialog -->
  <Dialog v-model:visible="createSalaryGrade" modal header="Salary Grades Creation" :style="{ width: '90vw' }">
    <template #header>
      <div class="flex items-center space-x-3 pt-4 sm:px-6 md:px-8">
        <h1 class="font-base text-2xl text-surface-600 sm:text-xl md:text-2xl">Salary Grades Creation</h1>
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
      <div
        v-if="creationMode === 'via-importation'"
        class="mb-4 gap-4 rounded-lg border border-surface-300 bg-surface-0 p-4 shadow-sm"
      >
        <div class="flex items-start space-x-3">
          <font-awesome-icon icon="file-csv" class="mt-1 h-6 text-primary-700" />
          <div>
            <p class="text-md font-medium text-surface-700">Salary Grade Excel Template</p>
            <a
              href="#"
              @click.prevent="downloadTemplate"
              class="items-center text-xs italic text-primary-600 hover:text-primary-800 hover:underline"
            >
              Download template here
            </a>
          </div>
        </div>
      </div>
      <div v-if="creationMode === 'via-manual-input' || isEditMode" class="mb-2 flex flex-col gap-2 md:flex-row md:gap-4">
        <WbInputText
          v-model="payload.nbc_no"
          required
          label="National Budget Circular No."
          label-class="text-md text-surface-600 dark:lg:text-surface-200"
          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
        >
        </WbInputText>
      </div>
      <div v-if="creationMode === 'via-manual-input' || isEditMode" class="mb-2 flex flex-col gap-2 md:flex-row md:gap-4">
        <WbInputText
          v-model="payload.tranche"
          required
          label="Tranche"
          label-class="text-md text-surface-600 dark:lg:text-surface-200"
          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
        >
        </WbInputText>
        <WbInputText
          v-model="payload.salary_grade"
          required
          label="Salary Grade"
          label-class="text-md text-surface-600 dark:lg:text-surface-200"
          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
        >
        </WbInputText>
        <WbInputText
          v-model="payload.step"
          required
          label="Step"
          label-class="text-md text-surface-600 dark:lg:text-surface-200"
          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
        >
        </WbInputText>
      </div>
      <div v-if="creationMode === 'via-manual-input' || isEditMode" class="mb-6 flex flex-col gap-2 md:flex-row md:gap-4">
        <WbInputText
          v-model="payload.amount"
          required
          label="Amount"
          label-class="text-md text-surface-600 dark:lg:text-surface-200"
          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
        >
        </WbInputText>
        <WbInputText
          v-model="payload.effective_date"
          required
          label="Effective Date"
          label-class="text-md text-surface-600 dark:lg:text-surface-200"
          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
        >
        </WbInputText>
      </div>
      <div v-if="creationMode === 'via-importation'" class="mb-2 flex flex-col gap-2 md:flex-row md:gap-4">
        <div class="w-full">
          <label class="text-md text-surface-600 dark:lg:text-surface-200">
            Upload PDS <span class="text-error-500">*</span>
          </label>
          <div class="flex items-center gap-3">
            <FileUpload
              ref="fileUploadRef"
              mode="basic"
              name="demo[]"
              accept=".doc,.docx,.xls,.xlsx"
              :maxFileSize="5 * 1024 * 1024"
              :auto="false"
              chooseLabel=""
              class="no-file-name-button"
              @select="onFileSelect"
            />

            <span class="text-sm text-surface-600 dark:text-surface-200">
              {{ fileName }}
            </span>
          </div>
        </div>
      </div>
      <div class="mt-2 flex justify-end gap-2">
        <Button
          label="Cancel"
          class="dark:text-secondary-100 border border-surface-400 text-base text-surface-500 dark:border-surface-700 lg:text-surface-500 dark:lg:text-surface-400"
          text
          @click="createSalaryGrade = false"
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
</template>
