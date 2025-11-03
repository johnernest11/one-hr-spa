<script setup lang="ts">
import { ref, reactive, onMounted, watch, toRef, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import { parseApiResponseError } from '@/utils/error-handle.ts'
import useVuelidate from '@vuelidate/core'
import { helpers, maxLength, required } from '@vuelidate/validators'
import WbAutoComplete, { WbAutoCompleteOption, WbAutoCompleteOptionTrueValue } from '@/components/webkit/WbAutoComplete.vue'
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
import { useRouter } from 'vue-router'
import { useWbAutoCompleteHandleTrueValue } from '@/composables/wb-ui-components.ts'
import { getPositionCode, isAfterOrEqualFromDate, usePrependOrAppendOnce } from '@/utils/helpers.ts'
import { uniqueItemNumberRuleLocal } from '@/utils/custom-validations.ts'

const route = useRoute()
const router = useRouter()
const publicPositionStore = usePositionStore()
const publicFundSourceStore = useFundSourceStore()
const itemNumberStore = useItemNumberStore()
const isEditorMode = computed(() => route.name?.toString().includes('editor'))
const initialized = ref(false)

const payload = reactive<ItemNumberPayload>({
  number: null,
  date_of_creation: '',
  status: 'Unfilled',
  date_filled_up: '',
  employment_status: '',
  fund_source: 0,
  fund_source_id: null,
  position: 0,
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
    unique: helpers.withAsync(
      helpers.withMessage(
        'This Item Number already exists.',
        uniqueItemNumberRuleLocal(
          itemNumberStore.itemNumbers.map((el) => el.number ?? ''),
          payload.number ?? ''
        )
      )
    ),
  },
  date_of_creation: {
    required: helpers.withMessage('Date of Creation is Required', required),
    maxLength: globalStringMaxLengthRule,
  },
  date_filled_up: {
    isAfterOrEqualFromDate: helpers.withMessage(
      'Date Filled Up should not be earlier than the Date of Creation',
      isAfterOrEqualFromDate(() => payload.date_of_creation)
    ),
    maxLength: globalStringMaxLengthRule,
  },
  employment_status: {
    required: helpers.withMessage('Employment Status is Required', required),
  },
  fund_source_id: {
    required: helpers.withMessage('Fund Source Status is Required', required),
  },
  position_id: {
    required: helpers.withMessage('Position Status is Required', required),
  },
}

const validator = useVuelidate<Partial<ItemNumberPayload>>(formRules, payload)
const manualInvalidFields = ref<Record<string, boolean>>({})
const errorMessage = ref<string | null>(null)
const errorDetails = ref<string[]>([])
const formIsSubmitting = ref(false)
const showErrorAlert = ref(false)
const isLoading = ref(true)
const isItemNumberManual = ref(false)
const IsBeingUpdated = ref(false)
const toast = useToast()

/** Position & Fund Sources WbAutoComplete Object References */
const selectedPosition = ref<WbAutoCompleteOption | null>(null)
const selectedFundSource = ref<WbAutoCompleteOption | null>(null)

/** Emits */
const emit = defineEmits<{
  (e: 'item-number-created', value: boolean): void
  (e: 'item-number-updated', value: boolean): void
}>()
const getId = usePrependOrAppendOnce('item-numbers')

const employementStatusOptions = [
  { label: 'Permanent', value: 'Permanent' },
  { label: 'Contractual', value: 'Contractual' },
  { label: 'Contract of Service', value: 'Contract of Service' },
  { label: 'Job Order', value: 'Job Order' },
  { label: 'Casual', value: 'Casual' },
]

type ItemNumberDetailsFormProps = {
  itemNumber?: ItemNumberResponse
}
const props = defineProps<ItemNumberDetailsFormProps>()
onMounted(async () => {
  const id = route.params.id as string
  if (id) {
    const response = await itemNumberStore.fetchItemNumberById(id)
    if (response && response.success) {
      updatePayloadFromReport(response.data as ItemNumberResponse)
    }
  }

  isLoading.value = false
})

watch(
  () => payload.fund_source_id,
  (newSelectedItem) => {
    if (!newSelectedItem) {
      selectedFundSource.value = null // Corrected to selectedFundingSources
      return
    }
  }
)

watch(
  () => payload.position_id,
  (newSelectedItem) => {
    if (!newSelectedItem) {
      selectedPosition.value = null // Corrected to selectedPosition
      return
    }
  }
)

const positionCode = computed(() => getPositionCode(selectedPosition.value?.label))

const generateItemNumber = (employment_status: string, position: string | number | null | undefined): string => {
  const current = itemNumberStore.lastNumbers[employment_status] ?? 0
  const paddedNumber = String(current + 1).padStart(7, '0')
  const pos = position ? String(position).toUpperCase() : 'UNKNOWN'

  return employment_status === 'Contract of Service'
    ? `FO1-COS-${pos}-${paddedNumber}`
    : employment_status === 'Contractual'
      ? `FO1-CONTRACTUAL-${pos}-${paddedNumber}`
      : employment_status === 'Casual'
        ? `FO1-CASUAL-${pos}-${paddedNumber}`
        : employment_status === 'Job Order'
          ? `FO1-JO-${pos}-${paddedNumber}`
          : ''
}
const isGeneratingNumber = ref(false)

watch(
  [() => payload.employment_status, () => selectedPosition.value],
  async ([newStatus, newPosition], [oldStatus, oldPosition]) => {
    if (!initialized.value) {
      initialized.value = true
      return
    }

    if (isEditorMode.value && newStatus === oldStatus && newPosition?.value === oldPosition?.value) {
      return
    }

    if (newStatus === 'Permanent') {
      payload.number = null
      isItemNumberManual.value = true
      return
    }
    if (!newStatus || !newPosition?.value) {
      payload.number = null
      isItemNumberManual.value = false
      return
    }

    isGeneratingNumber.value = true
    await itemNumberStore.fetchLastNumber(newStatus)
    isItemNumberManual.value = false
    payload.number = generateItemNumber(newStatus, positionCode.value)
    isGeneratingNumber.value = false
  }
)

const isButtonVisible = computed(() => true)
const handleButtonClick = async () => {
  formIsSubmitting.value = true

  if (route.params.id) {
    await updateButtonSubmission()
  } else {
    await saveButtonSubmission()
  }

  formIsSubmitting.value = false
}

const buttonLabel = computed(() => {
  return route.params.id ? 'Update' : 'Save'
})

const updatePayloadFromReport = (itemNumber: ItemNumberResponse | null) => {
  payload.number = itemNumber?.number ?? null
  payload.date_of_creation = itemNumber?.date_of_creation ?? ''
  payload.date_filled_up = itemNumber?.date_filled_up ?? ''
  payload.fund_source_id = itemNumber?.fund_source?.id ?? ''
  payload.employment_status = itemNumber?.employment_status ?? ''
  payload.position_id = itemNumber?.position?.id ?? ''

  payload.position_id = itemNumber?.position_id ?? null

  selectedFundSource.value = itemNumber?.fund_source
    ? {
      label: itemNumber.fund_source.name,
      value: itemNumber.fund_source.id,
    }
    : null

  selectedPosition.value = itemNumber?.position
    ? {
      label: itemNumber.position.title,
      value: itemNumber.position.id,
    }
    : null
}

watch(
  () => props.itemNumber,
  (newValue) => {
    if (newValue) {
      updatePayloadFromReport(newValue)
    } else {
      payload.number = ''
      payload.date_of_creation = ''
      payload.status = 'Unfilled'
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
    document.getElementById('Item-number')?.scrollIntoView({ behavior: 'smooth' })
    toast.add({
      severity: 'error',
      summary: 'Error in adding Item Number',
      detail: 'Please see the validation messages',
      life: 5000,
    })
    return
  }

  formIsSubmitting.value = true
  const response = await itemNumberStore.createItemNumber(payload)
  if (!response.success) {
    const result = parseApiResponseError(response)
    if (!result) return (formIsSubmitting.value = false)

    showErrorAlert.value = true
    errorMessage.value = result.message
    errorDetails.value = result.errors
    const targetMessage = 'The number has already been taken.'
    const fieldWithDuplicateError = (response.errors || []).find(
      (errorObj) => Array.isArray(errorObj.messages) && errorObj.messages.includes(targetMessage)
    )

    if (fieldWithDuplicateError) {
      const firstMessage = fieldWithDuplicateError.messages[0]

      if (fieldWithDuplicateError.field === 'number') {
        manualInvalidFields.value.number = true

        validator.value.number.$errors.push({
          $message: firstMessage,
          $params: {},
          $pending: false,
          $invalid: true,
          $uid: 'server-error',
        })

        validator.value.number.$touch()
      }
    }
    formIsSubmitting.value = false
    return
  }

  formIsSubmitting.value = false
  toast.add({
    severity: 'success',
    summary: 'New Item Number',
    detail: "You've successfully created a Item Number",
    life: 3000,
  })
  emit('item-number-created', true)
  setTimeout(async () => {
    await router.push({ name: 'item-numbers' })
  }, 500)
}

/** Handle updating the item number */
const updateButtonSubmission = async () => {
  const valid = await validator.value.$validate()
  if (!valid) {
    document.getElementById('Item-number')?.scrollIntoView({ behavior: 'smooth' })
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
  const response = await itemNumberStore.updateItemNumber(payload, id)

  if (!response.success) {
    const result = parseApiResponseError(response)
    if (!result) return (formIsSubmitting.value = false)

    showErrorAlert.value = true
    errorMessage.value = result.message
    errorDetails.value = result.errors
    IsBeingUpdated.value = false
  }

  formIsSubmitting.value = false
  toast.add({
    severity: 'success',
    summary: 'Item Number Details update',
    detail: `${id || 'The Item Number '} was successfully updated`,
    life: 1000,
  })

  formIsSubmitting.value = false
  emit('item-number-updated', true)
}
</script>

<template>
  <form autocomplete="off" @submit.prevent>
    <div class="flex w-full flex-col gap-4 pb-4 pl-4 pt-4">
      <Card class="h-full">
        <template #content>
          <div class="flex w-full flex-col items-start md:flex-row">
            <div class="pt-1">
              <Button
                icon="pi pi-angle-left"
                severity="secondary"
                aria-label="Bookmark"
                rounded
                @click="$router.go(-1)"
                size="small"
                class="mb-2 ml-4 md:mb-0 md:ml-0"
              />
            </div>
            <div>
              <h2 class="mb-2 ml-4 pb-6 text-3xl font-semibold text-primary-800 dark:text-primary-100 md:ml-4">
                <font-awesome-icon :icon="['fas', 'sitemap']" />
                {{ route.params.id ? 'Update Item Number' : 'New Item Number' }}
              </h2>
            </div>
          </div>
          <div class="flex flex-col gap-4 pb-6 md:flex-row">
            <div class="flex w-full flex-col">
              <WbDropdown
                v-model="payload.employment_status"
                :options="employementStatusOptions"
                optionLabel="label"
                optionValue="value"
                label=" Employment Status "
                :invalid="validator.employment_status.$invalid"
                :invalid-text="validator.employment_status.$errors[0]?.$message"
                @blur="validator.employment_status.$touch"
                label-class="text-sm text-surface-600"
                required
              >
              </WbDropdown>
            </div>
            <div class="flex w-full flex-col">
              <WbAutoComplete
                :useApiFilter="true"
                :apiEndpoint="'/libraries/positions/search'"
                :suggestions="publicPositionStore.positionOptions"
                :loading="publicPositionStore.positionOptionsIsLoading"
                apiOptionLabel="title"
                label="Position"
                placeholder="Type the Position"
                v-model="selectedPosition"
                :id="getId('input-positions')"
                optionLabel="label"
                optionValue="value"
                :forceSelection="true"
                required
                @on-true-value-computed="
                  (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                    useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'position_id'))
                "
                label-class="text-sm text-surface-600 dark:lg:text-surface-200"
                class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                :invalid="validator.position_id.$invalid"
                :invalid-text="validator.position_id.$errors[0]?.$message"
                @blur="validator.position_id.$touch"
                @focusin="validator.position_id.$dirty = false"
              >
              </WbAutoComplete>
            </div>
          </div>
          <div class="flex flex-col gap-4 pb-6 md:flex-row">
            <div class="flex w-full flex-col">
              <WbCalendar
                v-model="payload.date_filled_up"
                label="Date Filled Up  "
                label-class=" text-sm text-surface-600"
                dateFormat="MM dd, yy"
                :maxDate="new Date()"
                :invalid="validator.date_filled_up.$invalid"
                :invalid-text="validator.date_filled_up.$errors[0]?.$message"
                @blur="validator.date_filled_up.$touch"
              >
              </WbCalendar>
            </div>
            <div class="flex w-full flex-col">
              <WbCalendar
                v-model="payload.date_of_creation"
                label="Date of Creation"
                label-class="text-sm text-surface-600"
                dateFormat="MM dd, yy"
                :maxDate="new Date()"
                :invalid="validator.date_of_creation.$invalid"
                :invalid-text="validator.date_of_creation.$errors[0]?.$message"
                @blur="validator.date_of_creation.$touch"
                required
              >
              </WbCalendar>
            </div>
          </div>
          <div class="flex flex-col gap-4 pb-6 md:flex-row">
            <div class="flex w-full flex-col">
              <WbAutoComplete
                :useApiFilter="true"
                :apiEndpoint="'/libraries/fund-sources/search'"
                :suggestions="publicFundSourceStore.fundSourceOptions"
                :loading="publicFundSourceStore.fundSourceOptionsIsLoading"
                apiOptionLabel="name"
                label="Funding"
                placeholder="Type the Funding"
                v-model="selectedFundSource"
                :id="getId('input-funding-sources')"
                optionLabel="label"
                optionValue="value"
                :forceSelection="true"
                required
                @on-true-value-computed="
                  (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                    useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'fund_source_id'))
                "
                label-class="text-sm text-surface-600 dark:lg:text-surface-200"
                class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                :invalid="validator.fund_source_id.$invalid"
                :invalid-text="validator.fund_source_id.$errors[0]?.$message"
                @blur="validator.fund_source_id.$touch"
                @focusin="validator.fund_source_id.$dirty = false"
              >
              </WbAutoComplete>
            </div>
            <div class="flex w-full flex-col">
              <WbInputText
                v-model="payload.number"
                label="Item Number"
                label-class="text-sm text-surface-600"
                :disabled="!isItemNumberManual"
                :invalid="validator.number.$invalid || manualInvalidFields.number"
                :invalid-text="validator.number.$errors[0]?.$message"
                @blur="validator.number.$touch"
                v-tooltip.bottom="!payload.employment_status ? 'Please select Employment Status and Position first' : ''"
                required
              />
            </div>
          </div>

          <!-- Other content -->
          <div class="mt-2 flex justify-end gap-2">
            <Button
              label="Cancel"
              class="dark:text-secondary-100 border border-surface-400 text-base text-surface-500 dark:border-surface-700 lg:text-surface-500 dark:lg:text-surface-400"
              text
              @click="$router.go(-1)"
            >
              <template #icon>
                <i class="pi pi-ban mr-2"></i>
              </template>
            </Button>
            <Button
              v-if="isButtonVisible"
              :label="buttonLabel"
              @click="handleButtonClick"
              :loading="formIsSubmitting"
              :disabled="formIsSubmitting || isGeneratingNumber"
              size="large"
              class="dark:text-secondary-100 border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
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
