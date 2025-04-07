<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { parseApiResponseError } from '@/utils/error-handle.ts'
import useVuelidate from '@vuelidate/core'
import { helpers, maxLength, required } from '@vuelidate/validators'
import WbAutoComplete, { WbAutoCompleteOption } from '@/components/webkit/WbAutoComplete.vue'
import WbInputText from '@/components/webkit/WbInputText.vue'
import WbDropdown from '@/components//webkit/WbDropdown.vue'
import WbCalendar from '../webkit/WbCalendar.vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { ItemNumberPayload, useItemNumberStore } from '@/stores/item-number.store'
import { useFundSourceStore } from '@/stores/fund-source.store'
import { usePositionStore } from '@/stores/position.store.ts'
import { ItemNumberResponse } from '@/typings/models.types'
import { useRoute } from 'vue-router'
/** Payload for the Item Number */
const payload = reactive<ItemNumberPayload>({
  number: null,
  date_of_creation: '',
  status: 'Unfilled',
  date_filled_up: '',
  employment_status: '',
  fund_source_id: null,
  position_id: null,
})

/** Form Validation */
const globalStringMaxLength = import.meta.env.VITE_GLOBAL_STRING_MAX_LENGTH
const globalStringMaxLengthRule = helpers.withMessage(
  `Must not exceed ${globalStringMaxLength} characters`,
  maxLength(globalStringMaxLength)
)

const formRules = {
  $lazy: true,
  number: {
    required: helpers.withMessage('Item Number is Required', required),
    maxLength: globalStringMaxLengthRule,
  },
  date_of_creation: {
    required: helpers.withMessage('Date of Creation is Required', required),
  },
  employment_status: {
    required: helpers.withMessage('Employment Status is Required', required),
  },
}

const route = useRoute()
const publicPositionStore = usePositionStore()
const publicFundSourceStore = useFundSourceStore()
const ItemNumberStore = useItemNumberStore()
const validator = useVuelidate<Partial<ItemNumberPayload>>(formRules, payload)
const errorMessage = ref<string | null>(null)
const errorDetails = ref<string[]>([])
const formIsSubmitting = ref(false)
const showErrorAlert = ref(false)
const searchQuery = ref('')
const isLoading = ref(true)
const IsBeingUpdated = ref(false)
const toast = useToast()

/** Position & Fund Sources WbAutoComplete Object References */
const selectedPosition = ref<WbAutoCompleteOption | null>(null)

watch(selectedPosition, (newValue) => {
  if (newValue) {
    payload.position_id = String(newValue.value) // Assuming the value here corresponds to the position_id
  } else {
    payload.position_id = null // Reset if no selection
  }
})
const selectedFundSource = ref<WbAutoCompleteOption | null>(null)
watch(selectedFundSource, (newValue) => {
  // When a new position is selected, set the position_id in payload
  if (newValue) {
    payload.fund_source_id = String(newValue.value) // Assuming the value here corresponds to the position_id
  } else {
    payload.fund_source_id = null // Reset if no selection
  }
})

/** Check if the page should be reloaded after the update */
const shouldReloadPageAfterUpdate = (): boolean => {
  return true
}

/** Emits */
const emit = defineEmits<{
  (e: 'item-number-created', value: boolean): void
  (e: 'item-number-updated', value: boolean): void
}>()

const employementStatusOptions = [
  { label: 'Permanent', value: 'Permanent' },
  { label: 'Contractual', value: 'Contractual' },
  { label: 'Contract of Service', value: 'Contract of Service' },
  { label: 'Job Order', value: 'Job Order' },
]

// Function to handle position search
const searchPositionOptions = async (query: string) => {
  if (query) {
    console.log('Search Query:', query) // Log the search query
    try {
      await publicPositionStore.searchPosition(query)
      if (!publicPositionStore.positionOptions.length) {
        selectedPosition.value = null
      }
    } catch (error) {
      console.error('Error fetching positions:', error) // Log any errors
    }
  } else {
    publicPositionStore.positionOptions = []
    selectedPosition.value = null
  }
}

// Function to handle fund source search
const searchFundSourceOptions = async (query: string) => {
  if (query) {
    console.log('Search Query:', query) // Log the search query
    try {
      await publicFundSourceStore.searchFundSources(query)
      if (!publicFundSourceStore.fundSourceOptions.length) {
        selectedFundSource.value = null
      }
    } catch (error) {
      console.error('Error fetching positions:', error) // Log any errors
    }
  } else {
    publicFundSourceStore.fundSourceOptions = []
    selectedFundSource.value = null
  }
}

// Debounced input handler
const onInputPosition = async (event: InputEvent) => {
  const target = event.target as HTMLInputElement
  searchQuery.value = target.value

  await searchPositionOptions(searchQuery.value)
} // Adjust delay as necessary

// Debounced input handler
const onInputFundSource = async (event: InputEvent) => {
  const target = event.target as HTMLInputElement
  searchQuery.value = target.value

  await searchFundSourceOptions(searchQuery.value)
}

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
    payload.number = itemNumber.number ?? null
    payload.date_of_creation = itemNumber.date_of_creation ?? ''
    payload.date_filled_up = itemNumber.date_filled_up ?? ''
    payload.fund_source_id = String(itemNumber.fund_source_id ?? '')
    payload.employment_status = String(itemNumber.employment_status ?? '')
    payload.position_id = String(itemNumber.position_id ?? '')
  } else {
    // Reset payload if report is null
    // ... (reset payload and selected values)
    payload.number = ''
    payload.date_of_creation = ''
    payload.date_filled_up = ''
    payload.fund_source_id = null
    payload.employment_status = ''
    payload.position_id = null
  }
}
/** Watcher to reactively respond to changes in the item number prop */
watch(
  () => props.itemNumber,
  (newValue) => {
    // Check if newValue exists before accessing its properties
    if (newValue) {
      payload.number = newValue.number ?? null
      payload.date_of_creation = newValue.date_of_creation ?? ''
      ;(payload.status = 'Unfilled'), (payload.date_filled_up = newValue.date_filled_up ?? '')
      payload.fund_source_id = String(newValue.fund_source_id ?? '')
      payload.employment_status = String(newValue.employment_status ?? '') // Corrected line
      payload.position_id = String(newValue.position_id ?? '') // Ensure fetching correct ID
    } else {
      // Reset payload if itemNumber becomes undefined
      payload.number = ''
      payload.date_of_creation = ''
      ;(payload.status = 'Unfilled'), (payload.date_of_creation = '')
      payload.fund_source_id = ''
      payload.employment_status = ''
      payload.position_id = ''
    }
  },
  { immediate: true }
)
/** Form Submission */
const saveButtonSubmission = async () => {
  const valid = await validator.value.$validate()
  if (!valid) {
    document.getElementsByClassName('create-item-number-creds-section')[0]?.scrollIntoView({ behavior: 'smooth' })
    toast.add({
      severity: 'error',
      summary: 'Error in adding Item Number',
      detail: 'Please see the validation messages',
      life: 5000,
    })
    return
  }

  formIsSubmitting.value = true
  const response = await ItemNumberStore.createItemNumber(payload)
  // Handle the API error
  if (!response.success) {
    const result = parseApiResponseError(response)
    if (!result) return (formIsSubmitting.value = false)

    showErrorAlert.value = true
    errorMessage.value = result.message
    errorDetails.value = result.errors

    formIsSubmitting.value = false
    return document.getElementsByClassName('create-item-number-creds-section')[0]?.scrollIntoView({ behavior: 'smooth' })
  }

  formIsSubmitting.value = false
  toast.add({
    severity: 'success',
    summary: 'New Item Number',
    detail: "You've successfully created a Item Number",
    life: 5000,
  })

  emit('item-number-created', true)
  setTimeout(() => {
    window.location.reload() // Consider alternative approaches if full reload isn't necessary
  }, 1000)
}
/** Handle updating the item number */
const updateButtonSubmission = async () => {
  const valid = await validator.value.$validate()
  if (!valid) {
    document.getElementsByClassName('update-item-number-creds-section')[0]?.scrollIntoView({ behavior: 'smooth' })
    toast.add({
      severity: 'error',
      summary: 'Error in updating Item Number',
      detail: 'Please see the validation messages',
      life: 5000,
    })
    return
  }
  IsBeingUpdated.value = true
  const id = route.params.id as string

  formIsSubmitting.value = true
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

  formIsSubmitting.value = false
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
              <font-awesome-icon :icon="['fas', 'sitemap']" />
              {{ route.params.id ? 'Update Item Number' : 'New Item Number' }}
            </h2>
          </div>
          <div class="flex flex-col gap-4 pb-6 md:flex-row">
            <div class="flex w-full flex-col">
              <label class="mb-0 flex items-center text-xs text-surface-600">
                Item Number
                <span class="pl-1 text-red-600">*</span>
              </label>
              <WbInputText
                v-model="payload.number"
                :label="''"
                label-class="mb-0 text-xs text-surface-600"
                :invalid="validator.number.$invalid"
                :invalid-text="validator.number.$errors[0]?.$message"
                @blur="validator.number.$touch"
              />
            </div>
            <div class="flex w-full flex-col">
              <WbCalendar
                v-model="payload.date_filled_up"
                label="Date Filled Up  "
                label-class="mb-0 text-xs text-surface-600"
                dateFormat="MM dd, yy"
                :maxDate="new Date()"
              >
              </WbCalendar>
            </div>
          </div>
          <div class="flex flex-col gap-4 pb-6 md:flex-row">
            <div class="flex w-full flex-col">
              <label class="mb-0 flex items-center text-xs text-surface-600">
                Date of Creation
                <span class="pl-1 text-red-900">*</span>
              </label>
              <WbCalendar
                v-model="payload.date_of_creation"
                label=""
                label-class="mb-0 text-xs text-surface-600"
                dateFormat="MM dd, yy"
                :maxDate="new Date()"
                :invalid="validator.date_of_creation.$invalid"
                :invalid-text="validator.date_of_creation.$errors[0]?.$message"
                @blur="validator.date_of_creation.$touch"
              >
              </WbCalendar>
            </div>
            <div class="flex w-full flex-col">
              <label class="mb-0 flex items-center text-xs text-surface-600">
                Fund Source
                <span class="pl-1 text-red-600">*</span>
              </label>
              <WbAutoComplete
                v-model="selectedFundSource"
                :suggestions="publicFundSourceStore.fundSourceOptions"
                :loading="publicFundSourceStore.fundSourceOptionsIsLoading"
                label=""
                optionLabel="label"
                optionValue="value"
                forceSelection
                @input="onInputFundSource"
                label-class="mb-0 text-surface-600"
              >
              </WbAutoComplete>
            </div>
          </div>
          <div class="flex flex-col gap-4 pb-6 md:flex-row">
            <div class="flex w-full flex-col">
              <label class="mb-0 flex items-center text-xs text-surface-600">
                Employement Status
                <span class="pl-1 text-red-600">*</span>
              </label>
              <WbDropdown
                v-model="payload.employment_status"
                :options="employementStatusOptions"
                optionLabel="label"
                optionValue="value"
                label=""
                :invalid="validator.employment_status.$invalid"
                :invalid-text="validator.employment_status.$errors[0]?.$message"
                @blur="validator.employment_status.$touch"
                label-class="mb-0 text-xs text-surface-600"
              >
              </WbDropdown>
            </div>
            <div class="flex w-full flex-col">
              <label class="mb-0 flex items-center text-xs text-surface-600">
                Position
                <span class="pl-1 text-red-600">*</span>
              </label>
              <WbAutoComplete
                v-model="selectedPosition"
                :suggestions="publicPositionStore.positionOptions"
                :loading="publicPositionStore.positionOptionsIsLoading"
                label=""
                optionLabel="label"
                optionValue="value"
                forceSelection
                @input="onInputPosition"
                label-class="mb-0 text-surface-600"
              >
              </WbAutoComplete>
            </div>
          </div>

          <!-- Other content -->
          <div class="mt-2 flex justify-end gap-2">
            <Button
              label="Cancel"
              class="dark:text-secondary-100 border border-surface-400 text-xs text-surface-500 dark:border-surface-700 lg:text-surface-500 dark:lg:text-surface-400"
              text
              @click="$router.go(-1)"
            >
              <template #icon>
                <i class="pi pi-ban mr-2"></i>
              </template>
            </Button>
            <Button
              v-if="!route.params.id"
              @click="saveButtonSubmission"
              label="Save"
              :loading="formIsSubmitting"
              :disabled="formIsSubmitting"
              size="large"
              class="dark:text-secondary-100 border border-primary-500 text-xs text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
              text
            >
              <template #icon>
                <i class="pi pi-save mr-2"></i>
              </template>
            </Button>
            <!-- Update button should be visible regardless -->
            <Button
              v-if="route.params.id"
              @click="updateButtonSubmission"
              label="Update"
              :loading="formIsSubmitting"
              :disabled="formIsSubmitting"
              size="large"
              class="dark:text-secondary-100 border border-primary-500 text-xs text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
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
</template>
