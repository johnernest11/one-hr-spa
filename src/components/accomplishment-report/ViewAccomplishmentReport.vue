<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { PersonnelAccomplishmentReportResponse } from '@/typings/models.types.ts'
import { parseApiResponseError } from '@/utils/error-handle.ts'
import Button from 'primevue/button'
import WbInputText from '@/components/webkit/WbInputText.vue'
import Message from 'primevue/message'
import Divider from 'primevue/divider'
import { useConfirm } from 'primevue/useconfirm'
import Card from 'primevue/card'
import { useAccomplishmentReportStore } from '@/stores/personnel-accomplishment-report.store'
import { PersonnelAccomplishmentReportPayload } from '@/stores/personnel-accomplishment-report.store'

/** Emits */
const emit = defineEmits<{
  (e: 'accomplishment-report-updated', value: boolean): void
}>()

/** Props */
type AccomplishmentReportDetailsFormProps = {
  currentRoleFilter: number | string | null
  accomplishmentReport: PersonnelAccomplishmentReportResponse
}

const props = withDefaults(defineProps<AccomplishmentReportDetailsFormProps>(), {
  currentRoleFilter: null,
  accomplishmentReport: undefined,
})

const payload = reactive<PersonnelAccomplishmentReportPayload>({
  period: null,
  supervisor_notes: '',
  status: '',
  rows: [],
})

// Use onMounted to initialize payload AFTER props are received
watch(
  () => props.accomplishmentReport,
  (newValue) => {
    // Check if newValue exists before accessing its properties
    if (newValue) {
      payload.period = newValue.period ?? null // Use nullish coalescing operator (??)
      payload.supervisor_notes = newValue.supervisor_notes ?? ''
      payload.rows =
        newValue.rows?.map((row) => ({
          id: row.id ?? '',
          week_num: row.week_num ?? '',
          dates_in_week: row.dates_in_week ?? '',
          specific_activity: row.specific_activity ?? null,
          highlights: row.highlights ?? null,
        })) ?? [] // Use nullish coalescing and optional chaining
    } else {
      // Reset payload if accomplishmentReport becomes undefined
      payload.period = null
      payload.supervisor_notes = ''
      payload.status = ''
      payload.rows = []
    }
  },
  { immediate: true }
)
const isEditingSpecificActivity = ref(false)
const isEditingHighlights = ref(false)

const editSpecificActivity = () => {
  isEditingSpecificActivity.value = true
}

const editHighlights = () => {
  isEditingHighlights.value = true
}

const formIsSubmitting = ref(false)
const showErrorAlert = ref(false)
const errorMessage = ref<string | null>(null)
const errorDetails = ref<string[]>([])
const accomplishmentReportStore = useAccomplishmentReportStore()
const toast = useToast()

/** Handle Accomplishment Report Update */
const IsBeingUpdated = ref(false)
const handleUpdated = async () => {
  IsBeingUpdated.value = true

  const response = await accomplishmentReportStore.updateAccomplishment(payload, props.accomplishmentReport.id)

  if (!response.success) {
    const result = parseApiResponseError(response)
    if (!result) return (formIsSubmitting.value = false)

    showErrorAlert.value = true
    errorMessage.value = result.message
    errorDetails.value = result.errors
    IsBeingUpdated.value = false
    return document.getElementsByClassName('update-ar-creds-section')[0]?.scrollIntoView({ behavior: 'smooth' })
  }

  toast.add({
    severity: 'success',
    summary: 'Accomplishment Report Details update',
    detail: `${props.accomplishmentReport.id || 'The Accomplishment Report '} was successfully update`,
    life: 3000,
  })

  if (shouldReloadPageAfterUpdate()) {
    setTimeout(() => {
      window.location.reload()
    }, 2000)
  }

  emit('accomplishment-report-updated', true)
}

const shouldReloadPageAfterUpdate = (): boolean => {
  return true
}

const confirmUpdate = useConfirm()
const requireConfirmationUpdate = (event: Event) => {
  confirmUpdate.require({
    group: 'global',
    target: event.currentTarget as HTMLElement,
    message: ' Are you sure you want to update this Accomplishment Report? You cannot undo this.',
    header: 'Update Details',
    acceptLabel: 'Confirm Update',
    rejectLabel: 'Cancel',
    accept: () => {
      handleUpdated()
    },
  })
}
</script>

<template>
  <div v-if="props.accomplishmentReport">
    <form autocomplete="off" @submit.prevent>
      <div class="flex w-full flex-col gap-4 pb-4">
        <Card class="h-full">
          <template #content>
            <div class="flex w-full">
              <Button
                icon="pi pi-angle-left"
                severity="secondary"
                aria-label="Bookmark"
                rounded
                v-tooltip.top="'Filter Accomplishments'"
                @click="$router.go(-1)"
                size="small"
              />
              <h2 class="mb-2 ml-4 text-3xl font-semibold text-primary-900 dark:text-primary-100">
                <i class="pi pi-angle-double-down text-xl"></i>Viewing Accomplishment
              </h2>
            </div>
            <p class="mb-2 ml-20 text-xl font-semibold text-primary-900 dark:text-primary-100">Viewings Accomplishments</p>
            <br />
            <h2 class="mb-2 text-lg font-semibold text-surface-600 dark:text-primary-100">Timeline</h2>
            <div class="flex flex-col md:flex-row">
              <div class="mb-4 ml-6 flex w-14 flex-none flex-col items-start justify-center gap-2 py-2 md:w-4/12">
                <div class="flex w-full flex-col">
                  <label for="password" class="mb-0 text-sm text-surface-600">
                    Period of Accomplishment <span class="text-error-500">*</span>
                  </label>
                  <WbInputText v-model="payload.period" label="" placeholder="Period of Accomplishment" class="w-full">
                  </WbInputText>
                </div>
              </div>

              <div class="mt-2 flex w-64 flex-initial justify-end gap-2 md:ml-auto md:w-auto md:items-center md:justify-start">
                <Button
                  label="Export to MS Word"
                  class="border border-primary-400 px-4 py-2 text-sm font-semibold text-surface-0 dark:text-primary-100 lg:text-primary-400 dark:lg:text-primary-400"
                  text
                >
                  <template #icon>
                    <i class="pi pi-file mr-2"></i>
                  </template>
                </Button>
                <Button
                  label="Mark as Done"
                  :loading="formIsSubmitting"
                  :disabled="formIsSubmitting"
                  class="border border-primary-400 px-4 py-2 text-sm font-semibold text-surface-0 dark:text-primary-100 lg:text-primary-400 dark:lg:text-primary-400"
                  text
                >
                  <template #icon>
                    <i class="pi pi-save mr-2"></i>
                  </template>
                </Button>
              </div>
            </div>
            <!-- Start Alert Message -->
            <transition
              enter-active-class="transition duration-200"
              enter-from-class="scale-50 opacity-0"
              leave-to-class="opacity-0"
            >
              <Message v-if="showErrorAlert" :closable="false" severity="error" class="mb-2">
                <span>{{ errorMessage }}</span>
                <div class="flex flex-col text-xs">
                  <div v-for="error in errorDetails" :key="error" class="mt-0.5">{{ '- ' + error }}</div>
                </div>
              </Message>
            </transition>
            <!-- End Alert Message -->
            <h1 class="mb-2 text-lg font-semibold text-surface-600 dark:text-primary-100">Accomplishment</h1>
            <span> <i class="pi pi-ban mr-2"></i>Double click the area you wish to edit</span>
            <div class="grid grid-cols-3 justify-center gap-4 border-b-2 bg-surface-100 py-2">
              <div class="ml-24 text-start font-semibold text-surface-500">Week # (Date/s)</div>
              <div class="text-start font-semibold text-surface-500">SPECIFIC ACTIVITY</div>
              <div class="mr-12 text-center font-semibold text-surface-500">HIGHLIGHTS OF ACCOMPLISHMENT</div>
            </div>
            <p class="create-user-creds-section text-xs font-medium uppercase"></p>
            <div v-for="(row, index) in payload.rows" :key="index" class="mb-4 flex flex-col md:flex-row">
              <div class="mb-4 ml-6 flex w-full flex-col items-start justify-center gap-2 py-8 md:w-64">
                <div class="flex w-full flex-col">
                  <label for="week" class="mb-0 text-sm text-surface-600">Week <span class="text-error-500">*</span></label>
                  <label for="dates" class="mb-0 text-sm text-surface-600"
                    >Date/s or Coverage <span class="text-error-500">*</span></label
                  >
                  <WbInputText
                    v-model="row.week_num"
                    label=""
                    placeholder="e.g. 16 - 17 January 2025"
                    class="md:w-12/12 w-full"
                  />
                  <label for="dates" class="mb-0 text-sm text-surface-600"
                    >Date/s or Coverage <span class="text-error-500">*</span></label
                  >
                  <WbInputText
                    v-model="row.dates_in_week"
                    label=""
                    placeholder="e.g. 16 - 17 January 2025, , 3, 4 & 5 January 2025"
                    class="md:w-12/12 w-full"
                  >
                  </WbInputText>
                </div>
              </div>
              <Divider layout="vertical"></Divider>
              <div class="flex w-full flex-col items-start justify-center gap-3 py-2 md:w-5/12">
                <div class="flex w-full flex-col gap-2">
                  <textarea
                    :readonly="!isEditingSpecificActivity"
                    v-model="row.specific_activity"
                    class="w-full border-b-2 border-surface-300 outline-none focus:outline-none focus:ring-primary-500"
                    placeholder="Enter your Specific Activity..."
                    rows="10"
                    @dblclick="editSpecificActivity"
                  ></textarea>
                </div>
              </div>
              <Divider layout="vertical"></Divider>
              <div class="flex w-full flex-col items-start justify-center gap-3 py-2 md:w-5/12">
                <div class="flex w-full flex-col gap-2">
                  <textarea
                    :readonly="!isEditingHighlights"
                    v-model="row.highlights"
                    class="w-full border-b-2 border-surface-300 outline-none focus:outline-none focus:ring-primary-500"
                    placeholder="Enter your Highlights..."
                    rows="10"
                    @dblclick="editHighlights"
                  ></textarea>
                </div>
              </div>
            </div>
            <Divider layout="horizontal"></Divider>
            <div class="mt-2 flex justify-end gap-2">
              <RouterLink
                :to="{ path: 'accomplishment-reports' }"
                class="dark:text-secondary-100 border border-surface-400 text-xs text-surface-500 dark:border-surface-700 lg:text-surface-500 dark:lg:text-surface-400"
                custom
                v-slot="{ href, navigate }"
              >
                <Button
                  :href="href"
                  label="Cancel"
                  @click="navigate"
                  :loading="formIsSubmitting"
                  :disabled="formIsSubmitting"
                  class="dark:text-secondary-100 border border-surface-400 text-xs text-surface-500 dark:border-surface-700 lg:text-surface-500 dark:lg:text-surface-400"
                  text
                >
                  <template #icon>
                    <i class="pi pi-ban mr-2"></i>
                  </template>
                </Button>
              </RouterLink>
              <Button
                @click="requireConfirmationUpdate($event)"
                label="Save Draft"
                :loading="formIsSubmitting"
                :disabled="formIsSubmitting"
                class="border border-primary-400 text-xs font-semibold text-surface-0 dark:text-primary-100 lg:text-primary-400 dark:lg:text-primary-400"
                text
              >
                <template #icon>
                  <i class="pi pi-save mr-2"></i>
                </template>
              </Button>
            </div>
            <!-- End Action Buttons -->
          </template>
        </Card>
      </div>
    </form>
  </div>
</template>
