<script setup lang="ts">
import { onBeforeMount, ref, watch, reactive, onMounted } from 'vue'
import { useActiveDirectoryStore, ADPayload } from '@/stores/active-directory.store'
import { ActiveDiretoryResponse } from '@/typings/models.types.ts'
import { useToast } from 'primevue/usetoast'
import { useRoute } from 'vue-router'

import Button from 'primevue/button'
import Column from 'primevue/column'
import Chip from 'primevue/chip'
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

const activeDirectoriesStore = useActiveDirectoryStore()
const route = useRoute()
const toast = useToast()

const createActiveDirectory = ref(false)
const searchSubmitted = ref(false)
const activeDirectorysIsLoading = ref(false)
const isLoading = ref(true)
const isEditMode = ref(false)
const formIsSubmitting = ref(false)
const showErrorAlert = ref(false)
const paginationLimit = 5

const searchQuery = ref<string | null>(null)
const errorMessage = ref<string | null>(null)
const errorDetails = ref<string[]>([])
const pagination = ref<ApiResponsePagination | null>(null)

const emit = defineEmits<{
  (e: 'activeDirectory-created', value: boolean): void
}>()

const openActiveDirectoryDialog = (AD: ActiveDiretoryResponse | null = null) => {
  if (!AD || !AD.id) {
    console.error('Cannot navigate to details: Active Directory or ID is undefined', AD)
    return
  }
  if (AD) {
    updatePayloadFromReport(AD)
    isEditMode.value = true
  } else {
    resetPayload() // clear form if new
    isEditMode.value = false
  }
  createActiveDirectory.value = true
}

const openactiveDirectoryForm = () => {
  resetPayload()
  createActiveDirectory.value = true
}

const payload = reactive<ADPayload>({
  guid: '',
  name: '',
  username: '',
  email: '',
  active: false,
  password: '',
  password_confirmation: '',
})

const resetPayload = () => {
  payload.guid = ''
  payload.name = ''
  payload.username = ''
  payload.email = ''
  payload.password = ''
  payload.password_confirmation = ''
}

const globalStringMaxLength = import.meta.env.VITE_GLOBAL_STRING_MAX_LENGTH
const globalStringMaxLengthRule = helpers.withMessage(
  `Must not exceed ${globalStringMaxLength} characters`,
  maxLength(globalStringMaxLength)
)

const formRules = () => ({
  $lazy: true,
  guid: {
    required: helpers.withMessage('GUID is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
  },
  name: {
    required: helpers.withMessage('Name  is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
  },
  username: {
    required: helpers.withMessage('Username is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
  },
  email: {
    required: helpers.withMessage('Email is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
  },
})

onBeforeMount(async () => {
  activeDirectorysIsLoading.value = true
  const response = await activeDirectoriesStore.fetchUsers(paginationLimit)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
    console.log('Fetched Active Directory rows:', response.data)
  }
  activeDirectorysIsLoading.value = false
})

const handlePaginationPageChange = async (event: PageState) => {
  const pageSelected = event.page + 1
  activeDirectorysIsLoading.value = true
  const response = await activeDirectoriesStore.fetchUsers(paginationLimit, pageSelected)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  activeDirectorysIsLoading.value = false
}

const handleSearchActiveDiretory = async () => {
  activeDirectorysIsLoading.value = true
  searchSubmitted.value = true

  if (!searchQuery.value) {
    const response = await activeDirectoriesStore.fetchUsers(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    activeDirectorysIsLoading.value = false
    return
  }

  const response = await activeDirectoriesStore.searchUsers(searchQuery.value)
  if (response.success && response.pagination) {
    pagination.value = response.pagination

    searchQuery.value = null
  }
  activeDirectorysIsLoading.value = false
}

type ActiveDirectoryDetailsFormProps = {
  activeDirectory?: ActiveDiretoryResponse
}
const props = defineProps<ActiveDirectoryDetailsFormProps>()
onMounted(async () => {
  const id = route.params.id as string
  if (id) {
    const response = await activeDirectoriesStore.fetchUsers()
    if (response && response.success) {
      updatePayloadFromActiveDirectory(response.data as ActiveDiretoryResponse)
    }
  }
  isLoading.value = false
})

const updatePayloadFromActiveDirectory = (activeDirectory: ActiveDiretoryResponse | null) => {
  payload.guid = activeDirectory?.guid ?? ''
  payload.name = activeDirectory?.name ?? ''
  payload.username = activeDirectory?.username ?? ''
  payload.email = activeDirectory?.email ?? ''
}

watch(
  () => props.activeDirectory,
  (newValue) => {
    if (newValue) {
      updatePayloadFromActiveDirectory(newValue)
    } else {
      payload.guid = ''
      payload.name = ''
      payload.username = ''
      payload.email = ''
    }
  },
  { immediate: true }
)

const validator = useVuelidate<Partial<ADPayload>>(formRules, payload)
const handleSaveSubmissionif = async () => {
  const valid = await validator.value.$validate()
  if (!valid) {
    document.querySelector('.create-activeDirectory-creds-section')?.scrollIntoView({ behavior: 'smooth' })
    toast.add({
      severity: 'error',
      summary: 'Create a Active Directory',
      detail: 'Please see the validation messages',
      life: 5000,
    })
    return
  }

  formIsSubmitting.value = true

  try {
    const activeDirectory = {
      guid: payload.guid,
      name: payload.name,
      username: payload.username,
      email: payload.email,
    }

    const activedirectoryResponse = await activeDirectoriesStore.createUser(activeDirectory)

    if (!activedirectoryResponse.success) {
      const result = parseApiResponseError(activedirectoryResponse)
      if (!result) {
        formIsSubmitting.value = false
        return
      }
      showErrorAlert.value = true
      errorMessage.value = result.message
      errorDetails.value = result.errors
      formIsSubmitting.value = false
      document.querySelector('.create-activeDirectory-creds-section')?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Active Directory submitted successfully',
      life: 5000,
    })
    emit('activeDirectory-created', true)
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
          <font-awesome-icon :icon="['fas', 'user-lock']" />
          Active Directory Creation
        </h1>

        <div class="flex w-full items-center justify-end gap-4">
          <div class="gap-4 whitespace-nowrap md:w-auto">
            <Button
              icon="pi pi-plus"
              v-tooltip.top="'Active Directory Creation'"
              severity="info"
              size="large"
              class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100 sm:text-primary-400 md:text-primary-400 lg:text-primary-400 dark:lg:text-primary-400"
              text
              @click="openactiveDirectoryForm"
            />
          </div>
          <div class="flex w-full md:w-auto lg:w-1/2">
            <InputGroup v-model="searchQuery" class="w-full">
              <InputText
                v-model="searchQuery"
                placeholder="Search via Fullname or Email"
                class="w-full"
                :disabled="activeDirectorysIsLoading"
                @keyup.enter="handleSearchActiveDiretory"
              />
              <Button
                icon="pi pi-search"
                @click="handleSearchActiveDiretory"
                :loading="activeDirectorysIsLoading"
                :disabled="activeDirectorysIsLoading"
              />
            </InputGroup>
          </div>
        </div>
      </div>

      <div class="mt-6 flex flex-col">
        <div class="w-full">
          <div
            v-if="activeDirectoriesStore.activeDirectory && activeDirectoriesStore.activeDirectory.length > 0"
            class="mx-auto flex h-full w-full flex-col"
          >
            <DataTable
              :value="activeDirectoriesStore.activeDirectory"
              :loading="activeDirectorysIsLoading"
              class="mt-6"
              dataKey="id"
            >
              <template #loading>
                <div class="flex h-full w-full items-center justify-center text-primary-600">
                  <i class="pi pi-spin pi-spinner text-3xl"></i>
                </div>
              </template>
              <Column field="guid" header="GUID" headerClass="w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2">
                <template #body="props">
                  <p class="font-semibold text-surface-600">
                    {{ props.data.guid }}
                  </p>
                </template>
              </Column>
              <Column
                field="full_name"
                header="FULL NAME"
                headerClass=" w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="text-surface-600">
                    {{ props.data.name }}
                  </p>
                </template>
              </Column>
              <Column
                field="username"
                header="USERNAME"
                headerClass=" w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="text-surface-600">
                    {{ props.data.username }}
                  </p>
                </template>
              </Column>
              <Column
                field="email"
                header="EMAIL"
                headerClass=" w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="text-surface-600">
                    {{ props.data.email }}
                  </p>
                </template>
              </Column>

              <Column
                field="status"
                header="Status"
                headerClass="w-64 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <template v-if="props.data.active === false">
                    <Chip
                      label="Deactive"
                      class="flex items-center justify-center !bg-error-500 px-4 py-1 font-semibold !text-surface-0"
                    >
                    </Chip>
                  </template>
                  <template v-else-if="props.data.active === true">
                    <Chip
                      label="Active"
                      class="flex items-center justify-center !bg-success-800 px-4 py-1 font-semibold !text-surface-0"
                    />
                  </template>
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
                      @click="openActiveDirectoryDialog(props.data)"
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
          v-if="searchSubmitted && !activeDirectorysIsLoading && !activeDirectoriesStore.activeDirectory.length"
          class="flex h-full w-full flex-col items-center justify-center font-menu text-lg dark:text-primary-800"
        >
          <i class="pi pi-exclamation-triangle mb-2 text-2xl"></i>
          <p>No AD Account found</p>
        </div>
      </div>
    </div>
  </div>
  <Dialog v-model:visible="createActiveDirectory" modal header="Active Directory Creation" :style="{ width: '90vw' }">
    <template #header>
      <div class="flex items-center space-x-3 pt-4 sm:px-6 md:px-8">
        <h1 class="font-base text-2xl text-surface-600 sm:text-xl md:text-2xl">Active Directory Creation</h1>
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
  <Dialog v-model:visible="createActiveDirectory" modal header="Active Directory Creation" :style="{ width: '90vw' }">
    <template #header>
      <div class="flex items-center space-x-3 pt-4 sm:px-6 md:px-8">
        <h1 class="font-base text-2xl text-surface-600 sm:text-xl md:text-2xl">Active Directory Creation</h1>
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
      <div class="mb-2 flex flex-col gap-2 md:flex-row md:gap-4">
        <WbInputText
          v-model="payload.guid"
          required
          label="Guid"
          label-class="text-md text-surface-600 dark:lg:text-surface-200"
          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
        >
        </WbInputText>
      </div>
      <div class="mb-2 flex flex-col gap-2 md:flex-row md:gap-4">
        <WbInputText
          v-model="payload.name"
          required
          label="Name"
          label-class="text-md text-surface-600 dark:lg:text-surface-200"
          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
        >
        </WbInputText>
      </div>
      <div class="mb-2 flex flex-col gap-2 md:flex-row md:gap-4">
        <WbInputText
          v-model="payload.username"
          required
          label="Username"
          label-class="text-md text-surface-600 dark:lg:text-surface-200"
          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
        >
        </WbInputText>
      </div>
      <div class="mb-6 flex flex-col gap-2 md:flex-row md:gap-4">
        <WbInputText
          v-model="payload.email"
          required
          label="Active Directory Email."
          label-class="text-md text-surface-600 dark:lg:text-surface-200"
          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
        >
        </WbInputText>
      </div>
      <div class="mt-2 flex justify-end gap-2">
        <Button
          label="Cancel"
          class="dark:text-secondary-100 border border-surface-400 text-base text-surface-500 dark:border-surface-700 lg:text-surface-500 dark:lg:text-surface-400"
          text
          @click="CreateActiveDirectory = false"
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
