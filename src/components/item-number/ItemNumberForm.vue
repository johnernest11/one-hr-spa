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
  fund_source_id: {
    required: helpers.withMessage('Fund Source Status is Required', required),
  },
  position_id: {
    required: helpers.withMessage('Position Status is Required', required),
  },
}

const route = useRoute()
const router = useRouter()
const publicPositionStore = usePositionStore()
const publicFundSourceStore = useFundSourceStore()
const itemNumberStore = useItemNumberStore()
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
const selectedFundSource = ref<WbAutoCompleteOption | null>(null)

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

let lastTimeout: NodeJS.Timeout | number | null = null

const onInputSearch = (event: InputEvent, type: 'position' | 'fundSource') => {
  const target = event.target as HTMLInputElement
  searchQuery.value = target.value.trim()
  lastTimeout = setTimeout(async () => {
    if (type === 'position') {
      await publicPositionStore.searchPosition(searchQuery.value)
    } else if (type === 'fundSource') {
      await publicFundSourceStore.searchFundSources(searchQuery.value)
    }
    lastTimeout = null
  }, 1000)
}

onInputSearch.lastTimeout = lastTimeout

onInputSearch.lastTimeout = null

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

    formIsSubmitting.value = false
  }

  formIsSubmitting.value = false
  toast.add({
    severity: 'success',
    summary: 'New Item Number',
    detail: "You've successfully created a Item Number",
    life: 3000,
  })
  formIsSubmitting.value = false
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
              <WbInputText
                v-model="payload.number"
                label=" Item Number "
                label-class="text-sm text-surface-600"
                :invalid="validator.number.$invalid"
                :invalid-text="validator.number.$errors[0]?.$message"
                @blur="validator.number.$touch"
                required
              />
            </div>
            <div class="flex w-full flex-col">
              <WbCalendar
                v-model="payload.date_filled_up"
                label="Date Filled Up  "
                label-class=" text-sm text-surface-600"
                dateFormat="MM dd, yy"
                :maxDate="new Date()"
              >
              </WbCalendar>
            </div>
          </div>
          <div class="flex flex-col gap-4 pb-6 md:flex-row">
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
            <div class="flex w-full flex-col">
              <WbAutoComplete
                v-model="selectedFundSource"
                :suggestions="publicFundSourceStore.fundSourceOptions"
                :loading="publicFundSourceStore.fundSourceOptionsIsLoading"
                :invalid="validator.fund_source_id.$invalid"
                :invalid-text="validator.fund_source_id.$errors[0]?.$message"
                @blur="validator.fund_source_id.$touch"
                label="Fund Source"
                optionLabel="label"
                optionValue="value"
                forceSelection
                @input="onInputSearch($event, 'fundSource')"
                @on-true-value-computed="
                  (value: WbAutoCompleteOptionTrueValue) =>
                    useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'fund_source_id'))
                "
                label-class="text-sm text-surface-600"
                required
              >
              </WbAutoComplete>
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
                v-model="selectedPosition"
                :suggestions="publicPositionStore.positionOptions"
                :loading="publicPositionStore.positionOptionsIsLoading"
                :invalid="validator.position_id.$invalid"
                :invalid-text="validator.position_id.$errors[0]?.$message"
                @blur="validator.position_id.$touch"
                label="Position"
                optionLabel="label"
                optionValue="value"
                forceSelection
                @input="onInputSearch($event, 'position')"
                @on-true-value-computed="
                  (value: WbAutoCompleteOptionTrueValue) => useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'position_id'))
                "
                label-class="text-sm text-surface-600"
                required
              >
              </WbAutoComplete>
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
              :disabled="formIsSubmitting"
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
