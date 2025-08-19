<script setup lang="ts">
import { onBeforeMount, ref, watch, reactive, onMounted } from 'vue'
import { FundSourceResponse } from '@/typings/models.types.ts'
import { useToast } from 'primevue/usetoast'
import { useRoute } from 'vue-router'

import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputGroup from 'primevue/inputgroup'
import Paginator, { PageState } from 'primevue/paginator'

import useVuelidate from '@vuelidate/core'
import { ApiResponsePagination } from '@/typings/http-resources.types.ts'
import { parseApiResponseError } from '@/utils/error-handle.ts'
import { helpers, maxLength, required } from '@vuelidate/validators'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import WbInputText from '@/components/webkit/WbInputText.vue'
import { useFundSourceStore, PositionPayload } from '@/stores/fund-source.store'
import { formatDate } from '@/utils/helpers'

const fundSourceStore = useFundSourceStore()
const route = useRoute()
const toast = useToast()

const CreateFundSource = ref(false)
const searchSubmitted = ref(false)
const fundSourceIsLoading = ref(false)
const isLoading = ref(true)
const formIsSubmitting = ref(false)
const showErrorAlert = ref(false)
const paginationLimit = 5

const searchQuery = ref<string | null>(null)
const errorMessage = ref<string | null>(null)
const errorDetails = ref<string[]>([])
const pagination = ref<ApiResponsePagination | null>(null)

const emit = defineEmits<{
  (e: 'fundSource-created', value: boolean): void
}>()

const openfundSourceDialog = (fundSource: FundSourceResponse | null = null) => {
  if (!fundSource || !fundSource.id) {
    console.error('Cannot navigate to details: Position or ID is undefined', fundSource)
    return
  }
  if (fundSource) {
    updatePayloadFromReport(fundSource)
  }
  CreateFundSource.value = true
}

const openfundSourceForm = () => {
  resetPayload()
  CreateFundSource.value = true
}

const payload = reactive<PositionPayload>({
  name: '',
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
  fundSourceIsLoading.value = true
  const response = await fundSourceStore.fetchListFundSources(paginationLimit)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
    console.log('Fetched Fund Source rows:', response.data)
  }
  fundSourceIsLoading.value = false
})

const handlePaginationPageChange = async (event: PageState) => {
  const pageSelected = event.page + 1
  fundSourceIsLoading.value = true
  const response = await fundSourceStore.fetchListFundSources(paginationLimit, pageSelected)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  fundSourceIsLoading.value = false
}

const handleSearchPosition = async () => {
  fundSourceIsLoading.value = true
  searchSubmitted.value = true

  if (!searchQuery.value) {
    const response = await fundSourceStore.fetchListFundSources(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    fundSourceIsLoading.value = false
    return
  }

  const response = await fundSourceStore.searchListFundSource(searchQuery.value)
  if (response.success && response.pagination) {
    pagination.value = response.pagination

    searchQuery.value = null
  }
  fundSourceIsLoading.value = false
}

type fundSourceDetailsFormProps = {
  fundSource?: FundSourceResponse
}
const props = defineProps<fundSourceDetailsFormProps>()
onMounted(async () => {
  const id = route.params.id as string
  if (id) {
    const response = await fundSourceStore.fetchListFundSources()
    if (response && response.success) {
      updatePayloadFromReport(response.data as FundSourceResponse)
    }
  }
  isLoading.value = false
})

const updatePayloadFromReport = (fundSource: FundSourceResponse | null) => {
  payload.name = fundSource?.name ?? ''
}

watch(
  () => props.fundSource,
  (newValue) => {
    if (newValue) {
      updatePayloadFromReport(newValue)
    } else {
      payload.name = ''
    }
  },
  { immediate: true }
)

const validator = useVuelidate<Partial<PositionPayload>>(formRules, payload)
const handleSaveSubmissionif = async () => {
  const valid = await validator.value.$validate()
  if (!valid) {
    document.querySelector('.create-fundSource-creds-section')?.scrollIntoView({ behavior: 'smooth' })
    toast.add({
      severity: 'error',
      summary: 'Create a Position Request',
      detail: 'Please see the validation messages',
      life: 5000,
    })
    return
  }

  formIsSubmitting.value = true

  try {
    const fundSource = {
      name: payload.name,
    }

    const periodResponse = await fundSourceStore.createFundSource(fundSource)

    if (!periodResponse.success) {
      const result = parseApiResponseError(periodResponse)
      if (!result) {
        formIsSubmitting.value = false
        return
      }
      showErrorAlert.value = true
      errorMessage.value = result.message
      errorDetails.value = result.errors
      formIsSubmitting.value = false
      document.querySelector('.create-fundSource-creds-section')?.scrollIntoView({ behavior: 'smooth' })
      return // Ensure you return after handling the error
    }

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Fund Source Request submitted successfully',
      life: 5000,
    })
    emit('fundSource-created', true)

    setTimeout(() => {
      window.location.reload() // Consider alternative approaches if full reload isn't necessary
    }, 1000)
  } finally {
    formIsSubmitting.value = false // Ensure formIsSubmitting is always set to false
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
          Fund Source Creation
        </h1>

        <div class="flex w-full items-center justify-end gap-4">
          <div class="gap-4 whitespace-nowrap md:w-auto">
            <Button
              icon="pi pi-plus"
              v-tooltip.top="'Fund Source Creation'"
              severity="info"
              size="large"
              class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100 sm:text-primary-400 md:text-primary-400 lg:text-primary-400 dark:lg:text-primary-400"
              text
              @click="openfundSourceForm"
            />
          </div>
          <div class="flex w-full md:w-auto lg:w-1/2">
            <InputGroup v-model="searchQuery" class="w-full">
              <InputText
                v-model="searchQuery"
                placeholder="Search via Name"
                class="w-full"
                :disabled="fundSourceIsLoading"
                @keyup.enter="handleSearchPosition"
              />
              <Button
                icon="pi pi-search"
                @click="handleSearchPosition"
                :loading="fundSourceIsLoading"
                :disabled="fundSourceIsLoading"
              />
            </InputGroup>
          </div>
        </div>
      </div>

      <div class="mt-6 flex flex-col">
        <div class="w-full">
          <div
            v-if="fundSourceStore.fundSource && fundSourceStore.fundSource.length > 0"
            class="mx-auto flex h-full w-full flex-col"
          >
            <DataTable :value="fundSourceStore.fundSource" :loading="fundSourceIsLoading" class="mt-6" dataKey="id">
              <Column
                field="title"
                header="FUND NAME"
                headerClass="w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="font-semibold text-surface-600">
                    {{ props.data.name }}
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
                      :disabled="props.data.status === 'released'"
                      @click="openfundSourceDialog(props.data)"
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
          v-if="searchSubmitted && !fundSourceIsLoading && !fundSourceStore.fundSource.length"
          class="flex h-full w-full flex-col items-center justify-center font-menu text-lg dark:text-surface-300"
        >
          <i class="pi pi-exclamation-triangle mb-2 text-2xl"></i>
          <p>No Position found</p>
        </div>
      </div>
    </div>
  </div>
  <Dialog v-model:visible="CreateFundSource" modal header="Fund Source Creation" :style="{ width: '90vw' }">
    <template #header>
      <div class="flex items-center space-x-3 pt-4 sm:px-6 md:px-8">
        <h1 class="font-base text-2xl text-surface-600 sm:text-xl md:text-2xl">Fund Source Creation</h1>
      </div>
    </template>
    <hr />

    <div class="px-4 py-4 sm:px-6 sm:py-6 md:px-12">
      <div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div></div>

        <div></div>
      </div>

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
            <font-awesome-icon :icon="['fas', 'save']" class="mr-2" />
          </template>
        </Button>
      </div>
    </div>
  </Dialog>
  <!-- Import PDS Dialog -->
  <Dialog v-model:visible="CreateFundSource" modal header="Fund Source Creation" :style="{ width: '90vw' }">
    <template #header>
      <div class="flex items-center space-x-3 pt-4 sm:px-6 md:px-8">
        <h1 class="font-base text-2xl text-surface-600 sm:text-xl md:text-2xl">Fund Source Creation</h1>
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
          label="Fund Source Name"
          label-class="text-md text-surface-600 dark:lg:text-surface-200"
          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
        >
        </WbInputText>
      </div>
      <div class="flex justify-end">
        <Button
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
      </div>
    </div>
  </Dialog>
</template>
