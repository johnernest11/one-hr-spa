<script setup lang="ts">
import { ref, reactive, onBeforeMount, toRef, onMounted, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { parseApiResponseError } from '@/utils/error-handle.ts'
import { ItemNumberResponse } from '@/typings/models.types.ts'
import useVuelidate from '@vuelidate/core'
import { helpers, maxLength, required } from '@vuelidate/validators'
import WbAutoComplete, { WbAutoCompleteOption, WbAutoCompleteOptionTrueValue } from '@/components/webkit/WbAutoComplete.vue'
import WbInputText from '@/components/webkit/WbInputText.vue'
import WbDropdown from '@/components//webkit/WbDropdown.vue'
import WbCalendar from '../webkit/WbCalendar.vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Dialog from 'primevue/dialog'
import { usePositionStore } from '@/stores/position.store.ts'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { ItemNumberPayload, useItemNumberStore } from '@/stores/item-number.store'
import { useFundSourceStore } from '@/stores/fund-source.store'
import { useRoute } from 'vue-router'

/** Payload for the Item Number */
const payload = reactive<ItemNumberPayload>({
  item_number: null,
  date_of_creation: '',
  status: '',
  date_filled_up: '',
  employment_status: '',
  fund_source_id: '',
  position_id: '',
})
const route = useRoute()
const isLoading = ref(true)
const visible = ref(false)
const dialogType = ref('') // Add empty string for initial value
const dialogTitle = ref('')
const dialogMessage = ref('')
const confirmButtonLabel = ref('')

// Start combo and select box options
const statusOptions = [
  { label: 'Filled', value: 'Filled' },
  { label: 'Unfilled', value: 'Unfilled' },
]

const employementStatusOptions = [
  { label: 'Permanent', value: 'Permanent' },
  { label: 'Contractual', value: 'Contractual' },
  { label: 'Casual', value: 'Casual' },
  { label: 'Contract of Service', value: 'Contract of Service' },
  { label: 'Job Order', value: 'Job Order' },
]

/** Initialize Position & Fund Sources Options List */
const publicPositionStore = usePositionStore()
const publicFundSourceStore = useFundSourceStore()
onBeforeMount(async () => {
  await Promise.allSettled([publicPositionStore.fetchPositions(), publicFundSourceStore.fetchFundSources()])
})

/** Position & Fund Sources WbAutoComplete Object References */
const selectedPosition = ref<WbAutoCompleteOption | null>(null)
const selectedFundSource = ref<WbAutoCompleteOption | null>(null)

/** Emits */
const emit = defineEmits<{
  (e: 'item-number-updated', value: boolean): void
}>()

/** Props */
type ItemNumberDetailsFormProps = {
  itemNumber?: ItemNumberResponse
}
const props = defineProps<ItemNumberDetailsFormProps>()

/** Lifecycle hook that runs when the component is mounted */
onMounted(async () => {
  const id = route.params.id as string
  if (id) {
    const response = await ItemNumberStore.fetchItemNumberById(id)
    if (response && response.success) {
      updatePayloadFromReport(response.data as ItemNumberResponse)
    }
  }
  isLoading.value = false
})

/** Update the payload from the fetched item number */
const updatePayloadFromReport = (itemNumber: ItemNumberResponse | null) => {
  if (itemNumber) {
    payload.item_number = itemNumber.item_number ?? null
    payload.date_of_creation = itemNumber.date_of_creation ?? ''
    payload.status = String(itemNumber.status ?? '')
    payload.date_of_creation = itemNumber.date_of_creation ?? ''
    payload.fund_source_id = String(itemNumber.fund_source_id ?? '')
    payload.employment_status = String(itemNumber.employment_status ?? '') // Corrected line
    payload.position_id = String(itemNumber.position_id ?? '') // Corrected line
  } else {
    // Important: Reset payload if report is null
    payload.item_number = ''
    payload.date_of_creation = ''
    payload.status = ''
    payload.date_of_creation = ''
    payload.fund_source_id = ''
    payload.employment_status = ''
    payload.position_id = ''
  }
}

/** Watcher to reactively respond to changes in the item number prop */
watch(
  () => props.itemNumber,
  (newValue) => {
    // Check if newValue exists before accessing its properties
    if (newValue) {
      payload.item_number = newValue.item_number ?? null
      payload.date_of_creation = newValue.date_of_creation ?? ''
      payload.status = String(newValue.status ?? '')
      payload.date_of_creation = newValue.date_of_creation ?? ''
      payload.fund_source_id = String(newValue.fund_source_id ?? '')
      payload.employment_status = String(newValue.employment_status ?? '') // Corrected line
      payload.position_id = String(newValue.position_id ?? '') // Corrected line
    } else {
      // Reset payload if itemNumber becomes undefined
      payload.item_number = ''
      payload.date_of_creation = ''
      payload.status = ''
      payload.date_of_creation = ''
      payload.fund_source_id = ''
      payload.employment_status = ''
      payload.position_id = ''
    }
  },
  { immediate: true }
)

/** Validation */
const globalStringMaxLength = import.meta.env.VITE_GLOBAL_STRING_MAX_LENGTH
const globalStringMaxLengthRule = helpers.withMessage(
  `Must not exceed ${globalStringMaxLength} characters`,
  maxLength(globalStringMaxLength)
)
const formRules = {
  $lazy: true,
  item_number: {
    required: helpers.withMessage('Item Number is required', required),
    maxLength: globalStringMaxLengthRule,
  },
  date_of_creation: {
    required: helpers.withMessage('Date of Creation is required', required),
  },
  status: {
    required: helpers.withMessage('Status is required', required),
  },
  fund_source: {
    required: helpers.withMessage('Fund Source is required', required),
  },
  employment_status: {
    required: helpers.withMessage('Employment Status is required', required),
  },
  position: {
    required: helpers.withMessage('Position is required', required),
  },
}

/** Handle Form Submission */
const validator = useVuelidate<Partial<ItemNumberPayload>>(formRules, payload)
const formIsSubmitting = ref(false)
const showErrorAlert = ref(false)
const errorMessage = ref<string | null>(null)
const errorDetails = ref<string[]>([])
const ItemNumberStore = useItemNumberStore()
const toast = useToast()

/** Open a dialog */
const openDialog = (type: 'update') => {
  dialogType.value = type
  visible.value = true

  if (type === 'update') {
    dialogTitle.value = 'Update Item Number ?'
    dialogMessage.value = 'Update this Item Number allows you to continue editing later.'
    confirmButtonLabel.value = 'Update'
  }
}

/** Confirm the action based on the dialog type */
const confirmAction = () => {
  handleUpdated()

  visible.value = false
}
/** Handle updates to the item number */
const IsBeingUpdated = ref(false)

/** Check if the page should be reloaded after the update */
const shouldReloadPageAfterUpdate = (): boolean => {
  return true
}

/** Handle updating the item number */
const handleUpdated = async () => {
  IsBeingUpdated.value = true
  const id = route.params.id as string

  const response = await ItemNumberStore.updateItemNumber(payload, id)

  if (!response.success) {
    const result = parseApiResponseError(response)
    if (!result) return (formIsSubmitting.value = false)

    showErrorAlert.value = true
    errorMessage.value = result.message
    errorDetails.value = result.errors
    IsBeingUpdated.value = false
    return document.getElementsByClassName('update-item-number-creds-section')[0]?.scrollIntoView({ behavior: 'smooth' })
  }

  toast.add({
    severity: 'success',
    summary: 'Item Number Details update',
    detail: `${id || 'The Item Number '} was successfully updated`,
    life: 3000,
  })

  if (shouldReloadPageAfterUpdate()) {
    setTimeout(() => {
      window.location.reload()
    }, 2000)
  }

  emit('item-number-updated', true)
}
</script>

<template>
  <form autocomplete="off" @submit.prevent>
    <div class="flex w-full flex-col gap-4 pb-4 pl-4 pt-8">
      <Card class="h-full">
        <template #content>
          <div class="flex w-full flex-col items-start md:flex-row">
            <Button
              icon="pi pi-angle-left"
              severity="secondary"
              aria-label="Bookmark"
              rounded
              @click="$router.go(-1)"
              size="small"
              class="mb-2 ml-4 md:mb-0 md:ml-0"
            />
            <h2 class="mb-2 ml-4 pb-6 text-3xl font-semibold text-primary-800 dark:text-primary-100 md:ml-4">
              <font-awesome-icon :icon="['fas', 'sitemap']" /> Viewing Item Number
            </h2>
          </div>

          <h2 class="mb-2 pb-6 text-2xl font-semibold text-primary-800 dark:text-primary-100">Credentials</h2>

          <div class="flex flex-col gap-4 pb-6 md:flex-row">
            <div class="flex w-full flex-col">
              <WbInputText
                v-model="payload.item_number"
                label="Item Number "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.item_number.$invalid"
                :invalid-text="validator.item_number.$errors[0]?.$message"
                @blur="validator.item_number.$touch"
              >
              </WbInputText>
            </div>
            <div class="flex w-full flex-col">
              <WbCalendar v-model="payload.date_filled_up" label="Date Filled up  " label-class="mb-0 text-xs text-surface-600">
              </WbCalendar>
            </div>
          </div>
          <div class="flex flex-col gap-4 pb-6 md:flex-row">
            <div class="flex w-full flex-col">
              <WbCalendar
                v-model="payload.date_of_creation"
                label="Date of creation "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.date_of_creation.$invalid"
                :invalid-text="validator.date_of_creation.$errors[0]?.$message"
                @blur="validator.date_of_creation.$touch"
              >
              </WbCalendar>
            </div>
            <div class="flex w-full flex-col">
              <WbDropdown
                v-model="payload.status"
                :options="statusOptions"
                optionLabel="label"
                optionValue="value"
                :invalid="validator.status.$invalid"
                :invalid-text="validator.status.$errors[0]?.$message"
                @blur="validator.status.$touch"
                label="Status  "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
              >
              </WbDropdown>
            </div>
          </div>
          <div class="flex flex-col gap-4 pb-6 md:flex-row">
            <div class="flex w-full flex-col">
              <WbAutoComplete
                v-model="selectedFundSource"
                :suggestions="publicFundSourceStore.fundSourceOptions"
                label="Fund Source "
                optionLabel="label"
                forceSelection
                @on-true-value-computed="
                  (value: WbAutoCompleteOptionTrueValue) =>
                    useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'fund_source_id'))
                "
                :loading="publicFundSourceStore.fundSourceOptionsIsLoading"
                :disabled="publicFundSourceStore.fundSourceOptionsIsLoading"
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.fund_source.$invalid"
                :invalid-text="validator.fund_source.$errors[0]?.$message"
                @blur="validator.fund_source.$touch"
              >
              </WbAutoComplete>
            </div>
            <div class="flex w-full flex-col">
              <WbDropdown
                v-model="payload.employment_status"
                :options="employementStatusOptions"
                optionLabel="label"
                optionValue="value"
                label="Employement Status  "
                :invalid="validator.employment_status.$invalid"
                :invalid-text="validator.employment_status.$errors[0]?.$message"
                @blur="validator.employment_status.$touch"
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
              >
              </WbDropdown>
            </div>
          </div>
          <div class="flex flex-col gap-4 pb-6 md:flex-row">
            <div class="flex w-full flex-col">
              <WbAutoComplete
                v-model="selectedPosition"
                :suggestions="publicPositionStore.positionOptions"
                label="Position "
                optionLabel="label"
                forceSelection
                @on-true-value-computed="
                  (value: WbAutoCompleteOptionTrueValue) => useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'position_id'))
                "
                :loading="publicPositionStore.positionOptionsIsLoading"
                :disabled="publicPositionStore.positionOptionsIsLoading"
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.position.$invalid"
                :invalid-text="validator.position.$errors[0]?.$message"
                @blur="validator.position.$touch"
              >
              </WbAutoComplete>
            </div>
          </div>

          <!-- Other content -->
          <div class="mt-2 flex justify-end gap-2">
            <Button
              @click="openDialog('update')"
              label="Update"
              :loading="formIsSubmitting"
              :disabled="formIsSubmitting"
              class="dark:text-secondary-100 border border-primary-500 text-xs text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
              text
            >
              <template #icon>
                <i class="pi pi-save mr-2"></i>
              </template>
            </Button>
          </div>
          <!-- Start Dialog Confirmation Modal Action  -->
          <Dialog v-model:visible="visible" modal :style="{ width: '25vw' }" :closable="false">
            <template #header>
              <div style="display: flex; justify-content: flex-end; width: 100%">
                <Button
                  :loading="formIsSubmitting"
                  :disabled="formIsSubmitting"
                  class="dark:text-secondary-100 border-none text-xs text-surface-500 dark:border-surface-700 lg:text-surface-500 dark:lg:text-surface-400"
                  text
                  @click="visible = false"
                >
                  <template #icon>
                    <i class="pi pi pi-times mr-2"></i>
                  </template>
                </Button>
              </div>
            </template>
            <h1 class="text-md font-bold">
              {{ dialogTitle }}
            </h1>
            <p>{{ dialogMessage }}</p>
            <template #footer>
              <Button
                label="Cancel"
                :loading="formIsSubmitting"
                :disabled="formIsSubmitting"
                class="dark:text-secondary-100 border border-surface-400 text-xs text-surface-500 dark:border-surface-700 lg:text-surface-500 dark:lg:text-surface-400"
                text
                @click="visible = false"
              >
                <template #icon>
                  <i class="pi pi-ban mr-2"></i>
                </template>
              </Button>
              <Button
                @click="confirmAction"
                :label="confirmButtonLabel"
                :loading="formIsSubmitting"
                :disabled="formIsSubmitting"
                class="dark:text-secondary-100 border border-primary-500 text-xs text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
                text
              >
                <template #icon>
                  <font-awesome-icon :icon="['fas', 'share']" class="mr-2" />
                </template>
              </Button>
            </template>
          </Dialog>
          <!-- End Dialog Confirmation Modal Action -->
          <!-- End Action Buttons -->
        </template>
      </Card>
    </div>
  </form>
</template>
