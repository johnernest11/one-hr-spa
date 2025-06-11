<script setup lang="ts">
import { onBeforeMount, ref, watch, computed, reactive } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputGroup from 'primevue/inputgroup'
import WbCalendar from '@/components/webkit/WbCalendar.vue'
import WbDropdown from '@/components/webkit/WbDropdown.vue'
import Paginator, { PageState } from 'primevue/paginator'
import { useAuthStore } from '@/stores/auth.store.ts'
import { LocatorSlipResponse } from '@/typings/models.types.ts'
import { useLocatorSlipStore, LocatorSlipPayload } from '@/stores/locator-slip.store'
import useVuelidate from '@vuelidate/core'
import { ApiResponsePagination } from '@/typings/http-resources.types.ts'
import { parseApiResponseError } from '@/utils/error-handle.ts'
import { helpers, maxLength, required } from '@vuelidate/validators'
import { getMonthAndYear, formatDateRanges, snakeCaseToTitleCase } from '@/utils/helpers.ts'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useToast } from 'primevue/usetoast'

const authStore = useAuthStore()
const RoleAssignView = computed(() => {
  return authStore.authHasRequiredRole(['hr_pas_admin', 'admin', 'super_user'])
})

const locatorSlipsStore = useLocatorSlipStore()
const locatorSlipsIsLoading = ref(false)
const paginationLimit = 5
onBeforeMount(async () => {
  locatorSlipsIsLoading.value = true
  const response = await locatorSlipsStore.fetchLocatorSlip(paginationLimit)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  locatorSlipsIsLoading.value = false
})

const pagination = ref<ApiResponsePagination | null>(null)
const handlePaginationPageChange = async (event: PageState) => {
  const pageSelected = event.page + 1
  locatorSlipsIsLoading.value = true
  const response = await locatorSlipsStore.fetchLocatorSlip(paginationLimit, pageSelected)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  locatorSlipsIsLoading.value = false
}

const roleFilter = ref<number | null>(null)
const searchQuery = ref<string | null>(null)
const isSearching = ref(false)
watch(
  () => roleFilter.value,
  async () => {
    locatorSlipsIsLoading.value = true
    searchQuery.value = null
    isSearching.value = false
    const response = await locatorSlipsStore.fetchLocatorSlip(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    locatorSlipsIsLoading.value = false
  }
)
const searchSubmitted = ref(false)
const handleSearchLocatorSlip = async () => {
  locatorSlipsIsLoading.value = true
  searchSubmitted.value = true

  if (!searchQuery.value) {
    const response = await locatorSlipsStore.fetchLocatorSlip(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    locatorSlipsIsLoading.value = false
    return
  }

  const response = await locatorSlipsStore.searchLocatorSlip(searchQuery.value)
  if (response.success && response.pagination) {
    pagination.value = response.pagination

    searchQuery.value = null
  }
  locatorSlipsIsLoading.value = false
}

const toast = useToast()
const RequestLocatorSlip = ref(false)
const exportPdf = async (locatorSlips: LocatorSlipResponse) => {
  const { period_covered_from, period_covered_to, id } = locatorSlips

  toast.add({
    severity: 'info',
    summary: 'Exporting Locator Slip...',
    detail: `Exporting locator slip for the period ${period_covered_from} to ${period_covered_to}.`,
    life: 5000,
  })

  try {
    const reportResponse = await locatorSlipsStore.generateLocatorSlip(String(id))

    const blob = reportResponse.data.value
    const fileName = reportResponse.fileNameHeader?.value || `locator-slip-${id}.pdf`

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
        summary: 'Export Successful',
        detail: `Locator Slip for ${period_covered_from} to ${period_covered_to} was exported successfully.`,
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

const payload = reactive<LocatorSlipPayload>({
  period_covered_from: '',
  period_covered_to: '',
  period_request: '',
})

const requestOptions = ref([
  { label: '1st request for this period', value: '1st request for this period' },
  { label: '2nd request for this period', value: '2nd request for this period' },
])

/** Validation */
const globalStringMaxLength = import.meta.env.VITE_GLOBAL_STRING_MAX_LENGTH
const globalStringMaxLengthRule = helpers.withMessage(
  `Must not exceed ${globalStringMaxLength} characters`,
  maxLength(globalStringMaxLength)
)
const formRules = () => ({
  $lazy: true,
  period_covered_from: {
    type_request: helpers.withMessage('Period Covered From is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
  },
  period_covered_to: {
    required: helpers.withMessage('Period Covered To is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
  },
  period_request: {
    required: helpers.withMessage('Period Request is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
  },
})

/** Handle Form Submission */
const validator = useVuelidate<Partial<LocatorSlipPayload>>(formRules, payload)
const formIsSubmitting = ref(false)
const showErrorAlert = ref(false)
const errorMessage = ref<string | null>(null)
const errorDetails = ref<string[]>([])

/** Emits */
const emit = defineEmits<{
  (e: 'locator-created', value: boolean): void
}>()
/** Confirm the action based on the dialog type */
const handleSaveSubmissionif = async () => {
  const valid = await validator.value.$validate()
  if (!valid) {
    document.querySelector('.create-locator-creds-section')?.scrollIntoView({ behavior: 'smooth' })
    toast.add({
      severity: 'error',
      summary: 'Create a Locator Slip Request',
      detail: 'Please see the validation messages',
      life: 5000,
    })
    return
  }

  formIsSubmitting.value = true

  try {
    const periodData = {
      period_covered_from: payload.period_covered_from,
      period_covered_to: payload.period_covered_to,
      period_request: payload.period_request,
    }

    const periodResponse = await locatorSlipsStore.createLocatorSlip(periodData)

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
      document.querySelector('.create-locator-creds-section')?.scrollIntoView({ behavior: 'smooth' })
      return // Ensure you return after handling the error
    }

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Locator Slip Request submitted successfully',
      life: 5000,
    })
    emit('locator-created', true)

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
          {{ !RoleAssignView ? 'My Locator Slips' : 'Locator Slips' }}
        </h1>

        <div class="flex w-full items-center justify-end gap-4">
          <div class="gap-4 whitespace-nowrap md:w-auto">
            <Button
              icon="pi pi-filter-fill"
              v-tooltip.top="'Filter'"
              severity="info"
              size="large"
              class="mr-2 border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100 sm:text-primary-400 md:text-primary-400 lg:text-primary-400 dark:lg:text-primary-400"
              text
            />
            <Button
              icon="pi pi-file-excel"
              v-tooltip.top="'Request Locator Slip'"
              severity="info"
              size="large"
              class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100 sm:text-primary-400 md:text-primary-400 lg:text-primary-400 dark:lg:text-primary-400"
              text
              @click="RequestLocatorSlip = true"
            />
            <Dialog v-model:visible="RequestLocatorSlip" modal header="Request Locator Slip" :style="{ width: '90vw' }">
              <template #header>
                <div class="flex items-center space-x-3 pt-4 sm:px-6 md:px-8">
                  <font-awesome-icon :icon="['fas', 'location-dot']" class="h-6 text-surface-600 sm:h-7 md:h-8" />
                  <h1 class="font-base text-2xl text-surface-600 sm:text-xl md:text-2xl">Request Locator Slip</h1>
                </div>
              </template>
              <hr />

              <div class="px-4 py-4 sm:px-6 sm:py-6 md:px-12">
                <div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <WbCalendar
                      v-model="payload.period_covered_from"
                      :invalid="validator.period_covered_from.$invalid"
                      :invalid-text="validator.period_covered_from.$errors[0]?.$message"
                      @blur="validator.period_covered_from.$touch"
                      @focusin="validator.period_covered_from.$dirty = false"
                      label="Period Covered From"
                      required
                      placeholder="DD / MM / YYYY"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                    />
                  </div>

                  <div>
                    <WbCalendar
                      v-model="payload.period_covered_to"
                      :invalid="validator.period_covered_to.$invalid"
                      :invalid-text="validator.period_covered_to.$errors[0]?.$message"
                      @blur="validator.period_covered_to.$touch"
                      @focusin="validator.period_covered_to.$dirty = false"
                      label="Period Covered to"
                      required
                      placeholder="DD / MM / YYYY"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                    />
                  </div>
                </div>

                <div class="mb-6">
                  <WbDropdown
                    v-model="payload.period_request"
                    label="Number of Request Made within the Period Covered "
                    required
                    :invalid="validator.period_request.$invalid"
                    :invalid-text="validator.period_request.$errors[0]?.$message"
                    @blur="validator.period_request.$touch"
                    @focusin="validator.period_request.$dirty = false"
                    :options="requestOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="mb-4 w-full"
                    placeholder="Choose Period Covered"
                  />
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
          </div>
          <div class="flex w-full md:w-auto lg:w-1/2">
            <InputGroup v-model="searchQuery" class="w-full">
              <InputText
                v-model="searchQuery"
                placeholder="Search via Period or Date"
                class="w-full"
                :disabled="locatorSlipsIsLoading"
                @keyup.enter="handleSearchLocatorSlip"
              />
              <Button icon="pi pi-search" @click="handleSearchLocatorSlip" />
            </InputGroup>
          </div>
        </div>
      </div>

      <div class="mt-6 flex flex-col">
        <div class="w-full">
          <div class="mx-auto flex h-full w-full flex-col">
            <DataTable :value="locatorSlipsStore.locatorSlip" class="mt-6" dataKey="id">
              <Column
                field="period"
                header="Period Request"
                headerClass="w-1/2 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="font-semibold uppercase text-surface-600">
                    {{ getMonthAndYear(props.data.period_covered_from) }}
                  </p>
                  <p v-if="RoleAssignView" class="uppercase text-surface-600">
                    {{ snakeCaseToTitleCase(props.data.employee_id.first_name) }}
                    {{ snakeCaseToTitleCase(props.data.employee_id.middle_name ?? '') }}
                    {{ snakeCaseToTitleCase(props.data.employee_id.last_name) }}
                  </p>
                </template>
              </Column>
              <Column
                field="edited_at"
                header="Period Covered"
                headerClass=" w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="uppercase text-surface-600">
                    {{
                      formatDateRanges([{ start_date: props.data.period_covered_from, end_date: props.data.period_covered_to }])
                    }}
                  </p>
                </template>
              </Column>
              <Column field="action" header="Action" headerClass="w-64 bg-surface-100 opacity-70 font-bold py-2">
                <template #body="props">
                  <div class="flex gap-4 whitespace-nowrap md:w-auto">
                    <Button
                      icon="pi pi-file-pdf"
                      v-tooltip.top="'Export to PDF'"
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
          v-if="searchSubmitted && !locatorSlipsIsLoading && !locatorSlipsStore.locatorSlip.length"
          class="flex h-full w-full flex-col items-center justify-center font-menu text-lg dark:text-surface-300"
        >
          <i class="pi pi-exclamation-triangle mb-2 text-2xl"></i>
          <p>No Locator Slips found</p>
        </div>
        <div
          v-if="!locatorSlipsIsLoading && !locatorSlipsStore.locatorSlip.length && !searchSubmitted"
          class="mx-auto flex h-full w-full flex-col"
        >
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
                      icon="pi pi-file-excel"
                      label="Request Locator Slip"
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
