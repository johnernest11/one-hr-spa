<script setup lang="ts">
/** --- IMPORTS --- **/
import { Ref, ref, reactive, onMounted, watch, toRef, computed, onBeforeMount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import useVuelidate from '@vuelidate/core'
import { helpers, maxLength, required } from '@vuelidate/validators'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import Button from 'primevue/button'
import Card from 'primevue/card'

// Components
import WbAutoComplete, { WbAutoCompleteOption, WbAutoCompleteOptionTrueValue } from '@/components/webkit/WbAutoComplete.vue'
import WbInputText from '@/components/webkit/WbInputText.vue'
import WbDropdown from '@/components//webkit/WbDropdown.vue'
import WbCalendar from '../webkit/WbCalendar.vue'

// Stores & Types
import { usePdsStore } from '@/stores/pds.store.ts'
import { ItemNumberPayload, useItemNumberStore, LibraryStoreKeys } from '@/stores/item-number.store'
import { useFundSourceStore } from '@/stores/fund-source.store'
import { usePositionStore } from '@/stores/position.store.ts'
import { useSalaryGradesStore } from '@/stores/salary-grades.store.ts'
import { useLibrariesStore } from '@/stores/libraries.store.ts'
import { ItemNumberResponse } from '@/typings/models.types'

// Utils & Composables
import { parseApiResponseError } from '@/utils/error-handle.ts'
import { useWbAutoCompleteHandleTrueValue } from '@/composables/wb-ui-components.ts'
import { getPositionCode, isAfterOrEqualFromDate, usePrependOrAppendOnce } from '@/utils/helpers.ts'
import { uniqueItemNumberRuleLocal } from '@/utils/custom-validations.ts'

/** --- PROPS & EMITS --- **/
type ItemNumberDetailsFormProps = {
  itemNumber?: ItemNumberResponse
}
const props = defineProps<ItemNumberDetailsFormProps>()

const emit = defineEmits<{
  (e: 'item-number-created', value: boolean): void
  (e: 'item-number-updated', value: boolean): void
}>()

/** --- STORE & ROUTING INSTANCES --- **/
const route = useRoute()
const router = useRouter()
const toast = useToast()

const publicPositionStore = usePositionStore()
const publicFundSourceStore = useFundSourceStore()
const itemNumberStore = useItemNumberStore()
const salaryGradesStore = useSalaryGradesStore()
const libraryStore = useLibrariesStore()
const pdsStore = usePdsStore()

/** --- STATE MANAGEMENT --- **/
const isEditorMode = computed(() => route.name?.toString().includes('editor'))
const isItemNumberManual = ref(false)
const initialized = ref(false)
const isSalaryGradeLoading = ref(false)
const isLoading = ref(true)
const formIsSubmitting = ref(false)
const showErrorAlert = ref(false)
const IsBeingUpdated = ref(false)
const isGeneratingNumber = ref(false)
const isItemClassification = ref(false)

const manualInvalidFields = ref<Record<string, boolean>>({})
const errorMessage = ref<string | null>(null)
const errorDetails = ref<string[]>([])

const getId = usePrependOrAppendOnce('item-numbers')

/** UI Selection References (Autocomplete Objects) **/
const selectedPosition = ref<WbAutoCompleteOption | null>(null)
const selectedFundSource = ref<WbAutoCompleteOption | null>(null)
const selectedSalaryGrade = ref<WbAutoCompleteOption | null>(null)
const selectedDivision = ref<WbAutoCompleteOption | null>(null)
const selectedSectionUnit = ref<WbAutoCompleteOption | null>(null)
const selectedProgram = ref<WbAutoCompleteOption | null>(null)
const selectedOffice = ref<WbAutoCompleteOption | null>(null)
const selectedPSIPOP = ref<WbAutoCompleteOption | null>(null)

const displayParenthetical = ref('')
const displayPositionLevel = ref('')

const displayTranche = ref('')
const displayStep = ref('')
const displayAmount = ref('')

/** --- DATA OPTIONS --- **/
const employementStatusOptions = [
  { label: 'Permanent', value: 'Permanent' },
  { label: 'Coterminous', value: 'Coterminous' },
  { label: 'Contractual', value: 'Contractual' },
  { label: 'Contract of Service', value: 'Contract of Service' },
  { label: 'Job Order', value: 'Job Order' },
  { label: 'Casual', value: 'Casual' },
]

/** --- FORM PAYLOAD --- **/
const payload = reactive<ItemNumberPayload>({
  // Organizational Data
  office_id: null,
  division_id: null,
  section_or_unit_id: null,
  program_id: null,
  psipop_id: null,
  //Compensation & Employment Details
  employment_status: '',
  fund_source_id: null,
  fund_source: null,
  salary_grade_id: null,
  salary_grade: null,
  //Position Details
  position_id: null,
  position: null,
  item_classification: '',
  number: null,
  date_of_creation: '',
  //Designation Details
  designation: null,
  date_of_designation: '',
  special_order_number: null,
  //Position History & Vacancy Details
  status: 'Unfilled',
  mode_of_accession: null,
  date_filled_up: '',
  history_of_position: null,
  former_incumbent: null,
  mode_of_separation: null,
  date_of_vacant: null,
  remarks_of_vacancy: null,
  status_of_vacant_position: null,
  direct_contact_exposure_with_client: null,
  remarks: null,
})

/** --- VALIDATION RULES --- **/
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
          itemNumberStore.itemNumbers.filter((el) => el.id !== Number(route.params.id)).map((el) => el.number ?? ''),
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
    required: helpers.withMessage('Position is Required', required),
  },
  salary_grade_id: {
    required: helpers.withMessage('Salary Grade is Required', required),
  },
  division_id: {
    required: helpers.withMessage('Division is Required', required),
  },
  section_or_unit_id: {
    required: helpers.withMessage('Section/Unit is Required', required),
  },
  office_id: {
    required: helpers.withMessage('Office is Required', required),
  },

  designation: {
    maxLength: globalStringMaxLengthRule,
  },
  special_order_number: {
    maxLength: globalStringMaxLengthRule,
  },
  former_incumbent: {
    maxLength: globalStringMaxLengthRule,
  },
  history_of_position: {
    maxLength: globalStringMaxLengthRule,
  },

  mode_of_separation: {
    maxLength: globalStringMaxLengthRule,
  },

  status_of_vacant_position: {
    maxLength: globalStringMaxLengthRule,
  },

  direct_contact_exposure_with_client: {
    maxLength: globalStringMaxLengthRule,
  },
}

const validator = useVuelidate<Partial<ItemNumberPayload>>(formRules, payload)

/** --- COMPUTED PROPERTIES --- **/
const positionCode = computed(() => getPositionCode(selectedPosition.value?.label))

const isButtonVisible = computed(() => true)

const buttonLabel = computed(() => {
  return route.params.id ? 'Update' : 'Save'
})

/** --- LIFECYCLE HOOKS --- **/
onBeforeMount(async () => {
  isSalaryGradeLoading.value = true
  await Promise.allSettled([
    libraryStore.fetchOffices(),
    libraryStore.fetchDivisions(),
    libraryStore.fetchSectionUnits(),
    salaryGradesStore.fetchSalaryGrade(),
  ])
  isSalaryGradeLoading.value = false
})

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

/** --- HELPER FUNCTIONS --- **/
const updatePayloadFromReport = (itemNumber: ItemNumberResponse | null) => {
  if (!itemNumber) return
  // Reusable helper to safely parse IDs to number or null
  const extractId = (
    relation: { id?: string | number | null } | null | undefined,
    fallbackId: number | null | undefined
  ): number | null => {
    const id = relation?.id ?? fallbackId
    return id ? Number(id) : null
  }
  // Organization Data
  payload.division_id = extractId(itemNumber.division, itemNumber.division_id)
  payload.section_or_unit_id = extractId(itemNumber.section_or_unit, itemNumber.section_or_unit_id)
  payload.program_id = extractId(itemNumber.program, itemNumber.program_id)
  payload.office_id = extractId(itemNumber.office, itemNumber.office_id)

  // Since psipop_id points to division_id, we look at the division relation
  payload.psipop_id = extractId(itemNumber.psipop, itemNumber.psipop_id)

  // Compensation, Position, & Employment Details
  payload.employment_status = itemNumber.employment_status ?? ''
  payload.fund_source_id = extractId(itemNumber.fund_source, itemNumber.fund_source_id)
  payload.salary_grade_id = extractId(itemNumber.salary_grade, itemNumber.salary_grade_id)
  payload.position_id = extractId(itemNumber.position, itemNumber.position_id)
  payload.item_classification = itemNumber.item_classification ?? null
  payload.number = itemNumber.number ?? ''
  payload.date_of_creation = itemNumber.date_of_creation ?? ''

  payload.designation = itemNumber.designation ?? ''
  payload.date_of_designation = itemNumber.date_of_designation ?? ''
  payload.special_order_number = itemNumber.special_order_number ?? ''

  // Position History and Vacancy Tracking
  payload.status = itemNumber.status ?? 'Unfilled'
  payload.mode_of_accession = itemNumber.mode_of_accession ?? null
  payload.date_filled_up = itemNumber.date_filled_up ?? ''
  payload.history_of_position = itemNumber.history_of_position ?? null
  payload.former_incumbent = itemNumber.former_incumbent ?? null
  payload.mode_of_separation = itemNumber.mode_of_separation ?? null
  payload.date_of_vacant = itemNumber.date_of_vacant ?? null
  payload.remarks_of_vacancy = itemNumber.remarks_of_vacancy ?? null
  payload.status_of_vacant_position = itemNumber.status_of_vacant_position ?? null
  payload.direct_contact_exposure_with_client = itemNumber.direct_contact_exposure_with_client ?? null
  payload.remarks = itemNumber.remarks ?? null

  // Front-end UI State & Metric Displays
  displayParenthetical.value = String(itemNumber.position?.parenthetical_title ?? 'N/A')
  displayPositionLevel.value = String(itemNumber.position?.level ?? 'N/A')
  displayTranche.value = String(itemNumber.salary_grade?.tranche ?? 'N/A')
  displayStep.value = String(itemNumber.salary_grade?.step ?? 'N/A')
  displayAmount.value = String(itemNumber.salary_grade?.amount ?? 'N/A')

  // Standard Dropdown Select Objects
  selectedFundSource.value = itemNumber.fund_source
    ? { label: itemNumber.fund_source.name, value: itemNumber.fund_source.id }
    : null

  selectedPosition.value = itemNumber.position ? { label: itemNumber.position.title, value: itemNumber.position.id } : null

  selectedSalaryGrade.value = itemNumber.salary_grade
    ? {
      // Force convert the numeric salary grade into a string representation
      label: itemNumber.salary_grade.salary_grade?.toString() ?? 'N/A',
      value: itemNumber.salary_grade.id,
    }
    : null

  selectedProgram.value = itemNumber.program ? { label: itemNumber.program.name, value: itemNumber.program.id } : null
}

const generateItemClassification = (employment_status: string): string => {
  const statusMapping: Record<string, string> = {
    Permanent: 'Plantilla',
    'Contract of Service': 'Non-Plantilla',
    Contractual: 'Non-Plantilla',
    Casual: 'Non-Plantilla',
    'Job Order': 'Non-Plantilla',
  }
  const statusCode = statusMapping[employment_status]
  if (statusCode) return `${statusCode}`
  return employment_status ? 'NON-PLANTILLA' : ''
}

const generateItemNumber = (employment_status: string, position: string | number | null | undefined): string => {
  const pos = position ? String(position).toUpperCase().replace(/\(/g, '-').replace(/\)/g, '') : 'UNKNOWN'

  return employment_status === 'Contract of Service'
    ? `FO1-COS-${pos}-`
    : employment_status === 'Contractual'
      ? `FO1-CONTRACTUAL-${pos}-`
      : employment_status === 'Casual'
        ? `FO1-CASUAL-${pos}-`
        : employment_status === 'Job Order'
          ? `FO1-JO-${pos}-`
          : ''
}

/** --- WATCHERS --- **/

/** Sync UI objects when payload IDs change **/
watch(
  () => payload.fund_source_id,
  (newVal) => {
    if (!newVal) selectedFundSource.value = null
  }
)
watch(
  () => payload.position_id,
  (newVal) => {
    if (!newVal) selectedPosition.value = null
  }
)

/** Async Watchers for Library Store options (Office, Division, Section, Program) **/
const syncFromLibrary = <K extends LibraryStoreKeys>(
  idSource: () => string | number | null | undefined,
  refObj: Ref<WbAutoCompleteOption | null>,
  optionsKey: K
) => {
  watch(
    idSource,
    (newId) => {
      if (!newId) {
        refObj.value = null
        return
      }

      const findInOptions = (options: WbAutoCompleteOption[]) => options.find((opt) => Number(opt.value) === Number(newId))

      const currentOptions = libraryStore[optionsKey] as WbAutoCompleteOption[]
      const existing = findInOptions(currentOptions)

      if (existing) {
        refObj.value = existing
      } else {
        const unwatch = watch(
          () => libraryStore[optionsKey] as WbAutoCompleteOption[],
          (newOptions) => {
            const found = findInOptions(newOptions)
            if (found) {
              refObj.value = found
              unwatch()
            }
          },
          { immediate: true }
        )
      }
    },
    { immediate: true }
  )
}

syncFromLibrary(() => payload.division_id, selectedDivision, 'divisionOptions')
syncFromLibrary(() => payload.section_or_unit_id, selectedSectionUnit, 'sectionUnitOptions')

syncFromLibrary(() => payload.program_id, selectedProgram, 'programOptions')
syncFromLibrary(() => payload.office_id, selectedOffice, 'officeOptions')
syncFromLibrary(() => payload.psipop_id, selectedPSIPOP, 'divisionOptions')

/** Watch for Props change **/
watch(
  () => props.itemNumber,
  (newValue) => {
    if (newValue) updatePayloadFromReport(newValue)
    else {
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

/** Watch Status & Position to trigger Item Number generation */
watch(
  [() => payload.employment_status, () => selectedPosition.value],
  async ([newStatus, newPosition], [oldStatus, oldPosition]) => {
    if (!initialized.value) {
      initialized.value = true
      return
    }

    payload.item_classification = generateItemClassification(newStatus)

    if (
      isEditorMode.value &&
      newStatus === oldStatus &&
      newPosition === oldPosition
    ) {
      return
    }

    if (newStatus === 'Permanent') {
      payload.number = null
      isItemNumberManual.value = true
      isItemClassification.value = true
      return
    }

    if (!newStatus || !newPosition) {
      payload.number = null
      isItemNumberManual.value = false
      return
    }

    isGeneratingNumber.value = true

    try {
      await itemNumberStore.fetchLastNumber(newStatus)

      isItemNumberManual.value = false

      payload.number = generateItemNumber(
        newStatus,
        positionCode.value
      )
    } finally {
      isGeneratingNumber.value = false
    }
  }
)

const handlePositionSelection = (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) => {
  const val = Array.isArray(value) ? value[0] : value

  useWbAutoCompleteHandleTrueValue(val, toRef(payload, 'position_id'))

  const selectedId = val && typeof val === 'object' ? (val as WbAutoCompleteOption).value : val

  if (selectedId) {
    const fullRecord = publicPositionStore.positionOptions.find((item) => item.value == selectedId) as
      | (WbAutoCompleteOption & { parenthetical_title?: string; position_level?: string })
      | undefined

    displayParenthetical.value = fullRecord?.parenthetical_title || 'N/A'
    displayPositionLevel.value = fullRecord?.position_level || 'N/A'
  } else {
    displayParenthetical.value = 'N/A'
    displayPositionLevel.value = 'N/A'
  }
}

const handleSalaryGradeSelection = async (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) => {
  const val = Array.isArray(value) ? value[0] : value

  useWbAutoCompleteHandleTrueValue(val, toRef(payload, 'salary_grade_id'))

  const selectedId = val && typeof val === 'object' ? (val as WbAutoCompleteOption).value : val
  if (!selectedId) return

  const fullRecord = salaryGradesStore.salaryGradesOptions.find((item) => item.value == selectedId) as
    | (WbAutoCompleteOption & { tranche?: string; step?: string; amount?: string })
    | undefined
  if (fullRecord) {
    displayTranche.value = String(fullRecord.tranche ?? 'N/A')
    displayStep.value = String(fullRecord.step ?? 'N/A')
    displayAmount.value = String(fullRecord.amount)
  }
}

const handleButtonClick = async () => {
  formIsSubmitting.value = true
  if (route.params.id) await updateButtonSubmission()
  else await saveButtonSubmission()
  formIsSubmitting.value = false
}

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

    const fieldWithDuplicateError = (response.errors || []).find((err) =>
      err.messages?.includes('The number has already been taken.')
    )
    if (fieldWithDuplicateError) {
      manualInvalidFields.value.number = true
      validator.value.number.$errors.push({
        $message: fieldWithDuplicateError.messages[0],
        $params: {},
        $pending: false,
        $invalid: true,
        $uid: 'server-error',
      })
      validator.value.number.$touch()
    }
    formIsSubmitting.value = false
    return
  }

  formIsSubmitting.value = false
  toast.add({ severity: 'success', summary: 'New Item Number', detail: "You've successfully created a Item Number", life: 3000 })
  emit('item-number-created', true)
  setTimeout(async () => {
    await router.push({ name: 'item-numbers' })
  }, 500)
}

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
          <!-- START ORGANIZATION DATA -->
          <span class="mb-4 flex flex-col justify-center space-y-2 font-medium text-primary-700">
            <p class="text-lg italic md:text-xl">Organization Data</p>
          </span>
          <div class="ml-6 mr-6 flex flex-col gap-4 pb-6 md:flex-row">
            <WbAutoComplete
              :useApiFilter="true"
              :apiEndpoint="'/libraries/divisions/search'"
              :suggestions="libraryStore.divisionOptions"
              :loading="libraryStore.divisionOptionsLoading"
              apiOptionLabel="name"
              label="Division"
              placeholder="Type the Division"
              v-model="selectedDivision"
              :id="getId('input-division')"
              optionLabel="label"
              optionValue="value"
              required
              :readonly="pdsStore.isMyPds"
              :class="[
                'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
              ]"
              @on-true-value-computed="
                (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                  useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'division_id'))
              "
              :invalid="validator.division_id.$invalid"
              :invalid-text="validator.division_id.$errors[0]?.$message"
              @blur="validator.division_id.$touch"
              @focusin="validator.division_id.$dirty = false"
              label-class="text-md text-surface-600 dark:lg:text-surface-200"
            >
            </WbAutoComplete>
            <WbAutoComplete
              :useApiFilter="true"
              :apiEndpoint="'/libraries/section-or-units/search'"
              :suggestions="libraryStore.sectionUnitOptions"
              :loading="libraryStore.sectionUnitOptionsLoading"
              apiOptionLabel="name"
              label="Section/Unit"
              placeholder="Type the Section / Unit"
              v-model="selectedSectionUnit"
              :id="getId('input-section-unit')"
              optionLabel="label"
              optionValue="value"
              required
              :readonly="pdsStore.isMyPds"
              :class="[
                'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
              ]"
              @on-true-value-computed="
                (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                  useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'section_or_unit_id'))
              "
              :invalid="validator.section_or_unit_id.$invalid"
              :invalid-text="validator.section_or_unit_id.$errors[0]?.$message"
              @blur="validator.section_or_unit_id.$touch"
              @focusin="validator.section_or_unit_id.$dirty = false"
              label-class="text-md text-surface-600 dark:lg:text-surface-200"
            >
            </WbAutoComplete>
            <WbAutoComplete
              :useApiFilter="true"
              :apiEndpoint="'/libraries/programs/search'"
              :suggestions="libraryStore.programOptions"
              :loading="libraryStore.programOptionsLoading"
              apiOptionLabel="name"
              label="Program"
              placeholder="Type the Program"
              v-model="selectedProgram"
              :id="getId('input-program')"
              optionLabel="label"
              optionValue="value"
              :readonly="pdsStore.isMyPds"
              :class="[
                'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
              ]"
              @on-true-value-computed="
                (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                  useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'program_id'))
              "
              label-class="text-md text-surface-600 dark:lg:text-surface-200"
            >
            </WbAutoComplete>
          </div>
          <div class="ml-6 mr-6 flex flex-col gap-4 pb-6 md:flex-row">
            <div class="flex w-full flex-col">
              <WbAutoComplete
                :useApiFilter="true"
                :apiEndpoint="'/libraries/offices/search'"
                :suggestions="libraryStore.officeOptions"
                :loading="libraryStore.officeOptionsLoading"
                apiOptionLabel="name"
                label="Office"
                placeholder="Type Office"
                v-model="selectedOffice"
                :id="getId('input-office')"
                optionLabel="label"
                optionValue="value"
                required
                :readonly="pdsStore.isMyPds"
                :class="[
                  'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                  pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                ]"
                forceSelection
                @on-true-value-computed="
                  (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                    useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'office_id'))
                "
                :invalid="validator.office_id.$invalid"
                :invalid-text="validator.office_id.$errors[0]?.$message"
                @blur="validator.office_id.$touch"
                @focusin="validator.office_id.$dirty = false"
                label-class="text-md text-surface-600 dark:lg:text-surface-200"
              >
              </WbAutoComplete>
            </div>
            <div class="flex w-full flex-col">
              <WbAutoComplete
                :useApiFilter="true"
                :apiEndpoint="'/libraries/divisions/search'"
                :suggestions="libraryStore.divisionOptions"
                :loading="libraryStore.divisionOptionsLoading"
                apiOptionLabel="name"
                label="Office/Bureau/Service/Program (Plantilla Assignment based on PSIPOP)"
                placeholder="Type the Office/Bureau/Service/Program"
                v-model="selectedPSIPOP"
                :id="getId('input-psipop')"
                optionLabel="label"
                optionValue="value"
                :readonly="pdsStore.isMyPds"
                :class="[
                  'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                  pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                ]"
                forceSelection
                @on-true-value-computed="
                  (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                    useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'psipop_id'))
                "
                label-class="text-md text-surface-600 dark:lg:text-surface-200"
              >
              </WbAutoComplete>
            </div>
          </div>
          <!-- END ORGANIZATION DATA -->

          <!-- START COMPENSATION & EMPLOYMENT DETAILS -->
          <span class="mb-4 flex flex-col justify-center space-y-2 font-medium text-primary-700">
            <p class="text-lg italic md:text-xl">Compensation & Employment Details</p>
          </span>
          <div class="ml-6 mr-6 flex flex-col gap-4 pb-6 md:flex-row">
            <div class="flex w-full flex-col">
              <WbDropdown
                v-model="payload.employment_status"
                :options="employementStatusOptions"
                optionLabel="label"
                optionValue="value"
                label=" Employment Type "
                :disabled="!!$route.params.id"
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
                :apiEndpoint="'/libraries/fund-sources/search'"
                :suggestions="publicFundSourceStore.fundSourceOptions"
                :loading="publicFundSourceStore.fundSourceOptionsIsLoading"
                apiOptionLabel="name"
                label="Fund Source"
                placeholder="Type the Fund Source"
                v-model="selectedFundSource"
                :disabled="!!$route.params.id"
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
          </div>
          <div class="ml-6 mr-6 flex flex-col gap-4 pb-6 md:flex-row">
            <div class="flex w-full flex-col">
              <WbAutoComplete
                :useApiFilter="true"
                :apiEndpoint="'/libraries/salary-grades/search'"
                v-model="selectedSalaryGrade"
                :suggestions="salaryGradesStore.salaryGradesOptions"
                :loading="salaryGradesStore.salaryGradesOptionsLoading"
                apiOptionLabel="salary_grade"
                label="Salary Grade"
                placeholder="Type the Salary Grade with its tranche here"
                optionLabel="label"
                optionValue="value"
                :auto-filter="false"
                required
                @complete="(event: any) => salaryGradesStore.searchSalaryGrade(event.query)"
                @on-true-value-computed="handleSalaryGradeSelection"
                :disabled="!!$route.params.id"
                :id="getId('input-salary-grade')"
                :invalid="validator.salary_grade_id.$invalid"
                :invalid-text="validator.salary_grade_id.$errors[0]?.$message"
                @blur="validator.salary_grade_id.$touch"
                @focusin="validator.salary_grade_id.$dirty = false"
                label-class="text-sm text-surface-600 dark:lg:text-surface-200"
                class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
              />
            </div>
            <div class="flex w-full flex-col">
              <WbInputText v-model="displayTranche" label="Tranche " label-class="text-md text-surface-600" disabled />
            </div>
          </div>
          <div class="ml-6 mr-6 flex flex-col gap-4 pb-6 md:flex-row">
            <div class="flex w-full flex-col">
              <WbInputText v-model="displayStep" label="Step Increment " label-class="text-md text-surface-600" disabled />
            </div>
            <div class="flex w-full flex-col">
              <WbInputText v-model="displayAmount" label="Monthly Salary " label-class="text-md text-surface-600" disabled />
            </div>
          </div>
          <!-- START COMPENSATION & EMPLOYMENT DETAILS -->

          <!-- START POSITION DETAILS -->
          <span class="mb-4 flex flex-col justify-center space-y-2 font-medium text-primary-700">
            <p class="text-lg italic md:text-xl">Position Details</p>
          </span>
          <div class="ml-6 mr-6 flex flex-col gap-4 pb-6 md:flex-row">
            <div class="flex w-full flex-col">
              <WbAutoComplete
                v-model="selectedPosition"
                :suggestions="publicPositionStore.positionOptions"
                :loading="publicPositionStore.positionOptionsIsLoading"
                @complete="publicPositionStore.searchPosition($event.query)"
                label="Position Title"
                placeholder="Type the Position"
                optionLabel="label"
                optionValue="value"
                :forceSelection="true"
                required
                @on-true-value-computed="handlePositionSelection"
                :disabled="!!$route.params.id"
                :id="getId('input-positions')"
                :invalid="validator.position_id.$invalid"
                :invalid-text="validator.position_id.$errors[0]?.$message"
                @blur="validator.position_id.$touch"
                @focusin="validator.position_id.$dirty = false"
                label-class="text-sm text-surface-600 dark:lg:text-surface-200"
                class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
              />
            </div>
            <div class="flex w-full flex-col">
              <div class="flex w-full flex-col">
                <WbInputText
                  v-model="displayParenthetical"
                  label="Parenthetical Position."
                  label-class="text-sm text-surface-600"
                  disabled
                />
              </div>
            </div>
          </div>
          <div class="ml-6 mr-6 flex flex-col gap-4 pb-6 md:flex-row">
            <div class="flex w-full flex-col">
              <WbInputText
                v-model="displayPositionLevel"
                label="Position Level."
                label-class="text-sm text-surface-600"
                disabled
              />
            </div>
            <div class="flex w-full flex-col">
              <WbInputText
                v-model="payload.item_classification"
                label="Classification of Status."
                label-class="text-sm text-surface-600"
                disabled
                v-tooltip.bottom="!payload.employment_status ? 'Please select Employment Status and Position first' : ''"
              />
            </div>
          </div>

          <div class="ml-6 mr-6 flex flex-col gap-4 pb-6 md:flex-row">
            <div class="flex w-full flex-col">
              <WbInputText
                v-model="payload.number"
                label="Item Number"
                :disabled="!!$route.params.id"
                label-class="text-sm text-surface-600"
                :invalid="validator.number.$invalid || manualInvalidFields.number"
                :invalid-text="validator.number.$errors[0]?.$message"
                @blur="validator.number.$touch"
                v-tooltip.bottom="!payload.employment_status ? 'Please select Employment Status and Position first' : ''"
                required
              />
            </div>
            <div class="flex w-full flex-col">
              <WbCalendar
                v-model="payload.date_of_creation"
                label="Date of Creation"
                dateFormat="MM dd, yy"
                :maxDate="new Date()"
                :invalid="validator.date_of_creation.$invalid"
                :invalid-text="validator.date_of_creation.$errors[0]?.$message"
                @blur="validator.date_of_creation.$touch"
                @focusin="validator.date_of_creation.$dirty = false"
                label-class="text-sm text-surface-600 dark:lg:text-surface-200"
                required
              >
              </WbCalendar>
            </div>
          </div>
          <!-- END POSITION DETAILS -->

          <!-- START DESIGNATION AND ASSIGNMENT DETAILS -->
          <span class="mb-4 flex flex-col justify-center space-y-2 font-medium text-primary-700">
            <p class="text-lg italic md:text-xl">Designation and Assignment Details</p>
          </span>
          <div class="ml-6 mr-6 flex flex-col gap-4 pb-6 md:flex-row">
            <div class="flex w-full flex-col">
              <WbInputText
                v-model="payload.designation"
                label="Designation"
                label-class="text-sm text-surface-600"
                :invalid="validator.designation.$invalid"
                :invalid-text="validator.designation.$errors[0]?.$message"
                @blur="validator.designation.$touch"
              />
            </div>
            <div class="flex w-full flex-col">
              <WbCalendar
                v-model="payload.date_of_designation"
                label="Date of Designation"
                label-class="text-sm text-surface-600"
                dateFormat="MM dd, yy"
                :maxDate="new Date()"
              >
              </WbCalendar>
            </div>
            <div class="flex w-full flex-col">
              <WbInputText
                v-model="payload.special_order_number"
                label="Special Order Number (if applicable)"
                label-class="text-sm text-surface-600"
                :invalid="validator.special_order_number.$invalid"
                :invalid-text="validator.special_order_number.$errors[0]?.$message"
                @blur="validator.special_order_number.$touch"
              />
            </div>
          </div>
          <!-- END DESIGNATION AND ASSIGNMENT DETAILS -->

          <!-- START POSITION HISTORY AND VACANCY TRACKING -->
          <span class="mb-4 flex flex-col justify-center space-y-2 font-medium text-primary-700">
            <p class="text-lg italic md:text-xl">Position History and Vacancy Tracking</p>
          </span>
          <div class="ml-6 mr-6 flex flex-col gap-4 pb-6 md:flex-row">
            <div class="flex w-full flex-col">
              <WbInputText v-model="payload.status" label="Status" label-class="text-sm text-surface-600" disabled> </WbInputText>
            </div>
            <div class="flex w-full flex-col">
              <WbInputText
                v-model="payload.mode_of_accession"
                label="Mode of Accession"
                label-class="text-sm text-surface-600"
                :disabled="payload.employment_status !== 'Permanent' && payload.employment_status !== 'Coterminous'"
                v-tooltip.top="'Mode of Accession is for Permanent or Coterminous Employment Status.'"
              >
              </WbInputText>
            </div>
          </div>
          <div class="ml-6 mr-6 flex flex-col gap-4 pb-6 md:flex-row">
            <div class="flex w-full flex-col">
              <WbCalendar
                v-model="payload.date_filled_up"
                label="Date Filled Up"
                label-class="text-sm text-surface-600"
                dateFormat="MM dd, yy"
                :maxDate="new Date()"
              >
              </WbCalendar>
            </div>
            <div class="flex w-full flex-col">
              <WbInputText
                v-model="payload.history_of_position"
                label="History of Position"
                label-class="text-sm text-surface-600"
                :invalid="validator.history_of_position.$invalid"
                :invalid-text="validator.history_of_position.$errors[0]?.$message"
                @blur="validator.history_of_position.$touch"
              >
              </WbInputText>
            </div>
          </div>
          <div class="ml-6 mr-6 flex flex-col gap-4 pb-6 md:flex-row">
            <div class="flex w-full flex-col">
              <WbInputText
                v-model="payload.former_incumbent"
                label="Former Incumbent (if applicable)"
                label-class="text-sm text-surface-600"
                :invalid="validator.former_incumbent.$invalid"
                :invalid-text="validator.former_incumbent.$errors[0]?.$message"
                @blur="validator.former_incumbent.$touch"
              >
              </WbInputText>
            </div>
            <div class="flex w-full flex-col">
              <WbInputText
                v-model="payload.mode_of_separation"
                label="Mode of Separation (if applicable)"
                label-class="text-sm text-surface-600"
                :invalid="validator.mode_of_separation.$invalid"
                :invalid-text="validator.mode_of_separation.$errors[0]?.$message"
                @blur="validator.mode_of_separation.$touch"
              >
              </WbInputText>
            </div>
          </div>
          <div class="ml-6 mr-6 flex flex-col gap-4 pb-6 md:flex-row">
            <div class="flex w-full flex-col">
              <WbCalendar
                v-model="payload.date_of_vacant"
                label="Date Vacant (if applicable)"
                label-class="text-sm text-surface-600"
                dateFormat="MM dd, yy"
                :maxDate="new Date()"
              >
              </WbCalendar>
            </div>
            <div class="flex w-full flex-col">
              <WbInputText
                v-model="payload.remarks_of_vacancy"
                label="Remarks of Vacancy (if applicable)"
                label-class="text-sm text-surface-600"
              >
              </WbInputText>
            </div>
          </div>
          <div class="ml-6 mr-6 flex flex-col gap-4 pb-6 md:flex-row">
            <div class="flex w-full flex-col">
              <WbInputText
                v-model="payload.status_of_vacant_position"
                label="Status of Vacant Position (if applicable)"
                label-class="text-sm text-surface-600"
                :invalid="validator.status_of_vacant_position.$invalid"
                :invalid-text="validator.status_of_vacant_position.$errors[0]?.$message"
                @blur="validator.status_of_vacant_position.$touch"
              >
              </WbInputText>
            </div>
            <div class="flex w-full flex-col">
              <WbInputText
                v-model="payload.direct_contact_exposure_with_client"
                label="Personnel is Direct Contact/Exposure with Client"
                label-class="text-sm text-surface-600"
                :invalid="validator.direct_contact_exposure_with_client.$invalid"
                :invalid-text="validator.direct_contact_exposure_with_client.$errors[0]?.$message"
                @blur="validator.direct_contact_exposure_with_client.$touch"
              >
              </WbInputText>
            </div>
          </div>
          <div class="ml-6 mr-6 flex flex-col gap-4 pb-6 md:flex-row">
            <div class="flex w-full flex-col">
              <WbInputText
                v-model="payload.remarks"
                label="Remarks (if applicable)"
                label-class="text-sm text-surface-600"
              ></WbInputText>
            </div>
          </div>
          <!-- END POSITION HISTORY AND VACANCY TRACKING -->

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
              class="dark:text-secondary-100 mr-6 border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
              text
            >
              <template #icon>
                <i class="pi pi-save mr-2"></i>
              </template>
            </Button>
          </div>
        </template>
      </Card>
    </div>
  </form>
</template>
