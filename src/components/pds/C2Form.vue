<script setup lang="ts">
import { reactive, ref, computed, onMounted, watch, toRef, nextTick } from 'vue'
import { usePdsStore, PersonalDataSheetPayload } from '@/stores/pds.store.ts'
import { useSalaryGradesStore } from '@/stores/salary-grades.store.ts'
import { isGovServiceYesNoOptions, EmploymentStatusOptions } from '@/typings/employee-entry.types'
import { useRouter } from 'vue-router'
import { useRoute } from 'vue-router'

import useVuelidate from '@vuelidate/core'
import WbInputText from '@/components/webkit/WbInputText.vue'
import WbCalendar from '@/components/webkit/WbCalendar.vue'
import WbDropdown from '@/components/webkit/WbDropdown.vue'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import WbAutoComplete from '@/components/webkit/WbAutoComplete.vue'
import { WbAutoCompleteOption, WbAutoCompleteOptionTrueValue } from '@/components/webkit/WbAutoComplete.vue'
import { useWbAutoCompleteHandleTrueValue } from '@/composables/wb-ui-components.ts'

import { useToast } from 'primevue/usetoast'
import { parseApiResponseError } from '@/utils/error-handle.ts'
import { helpers, maxLength, required, numeric } from '@vuelidate/validators'
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/vue'
import { isAfterOrEqualFromDate, usePrependOrAppendOnce } from '@/utils/helpers.js'
import { TransitionRoot } from '@headlessui/vue'
import { PersonnelResponse } from '@/typings/models.types'

const getId = usePrependOrAppendOnce('pds-c2-section-form')
const sgStore = useSalaryGradesStore()
const pdsStore = usePdsStore()
const toast = useToast()
const router = useRouter()
const route = useRoute()

const maxToasts = 5
const MAX_ENTRIES_PER_TAB = 28
const pdsErrors = ref()
const errorMessage = ref()
const workExperienceIndex = ref(1)

const isC2Loading = ref(false)
const isPdsError = ref(false)
const isCurrentlyEmployed = ref(false)
const formIsSubmitting = ref(false)
const IsBeingUpdated = ref(false)
const extraWorkExperienceTabVisible = ref(false)
const isLoading = ref(true)
const isImporting = ref(false)

const activeTab = ref(0)
const activeToasts = ref<number>(0)
const useCustomSalaryGrade = ref<boolean[]>([])
const today = new Date()
const selectedWorkExperienceSG = ref<(WbAutoCompleteOption | null)[]>([])

const c1Tabs = ref([
  { name: 'Civil Service Eligibility', index: 0 },
  { name: 'Work Experience', index: 1 },
])

// Handle Import
onMounted(async () => {
  const hasImport = !!pdsStore.importResult

  if (hasImport) {
    isImporting.value = true
    console.log('Importing C2...')

    Object.assign(payload.individual_eligibility, pdsStore.importResult?.individual_eligibility ?? {})
    Object.assign(payload.individual_work_experience, pdsStore.importResult?.individual_work_experience ?? {})
  }

  await nextTick()
  isImporting.value = false
  console.log('Importing C2 done!')
})

onMounted(() => {
  useCustomSalaryGrade.value = payload.individual_work_experience.map(
    (we) => !!we.custom_salary_grade // true if custom_salary_grade exists
  )
})

/** Payload */
const payload = reactive<PersonalDataSheetPayload>({
  ...pdsStore.pdsInfo,
})

const globalStringMaxLength = import.meta.env.VITE_GLOBAL_STRING_MAX_LENGTH
const globalStringMaxLengthRule = helpers.withMessage(
  `Must not exceed ${globalStringMaxLength} characters`,
  maxLength(globalStringMaxLength)
)
const formRules = computed(() => ({
  individual_eligibility: payload.individual_eligibility.map(() => ({
    date_of_examination_conferment: {
      isAfterOrEqualFromDate: helpers.withMessage('Date must be today or earlier.', (val: string | Date | null) => {
        if (!val) return true
        const selectedDate = new Date(val)
        return selectedDate <= today
      }),
    },
    license_date_of_validity: {
      isAfterOrEqualFromDate: helpers.withMessage(
        'License Date of Validity should not be earlier than the Date of Examination Conferment',
        (val: string | number | Date | null, vm: Record<string, unknown>) => {
          const fromVal = vm.date_of_examination_conferment as string | number | Date | null
          if (!val || !fromVal) return true

          const licenseDate = new Date(val)
          const examDate = new Date(fromVal)

          return isNaN(licenseDate.getTime()) || isNaN(examDate.getTime()) || licenseDate >= examDate
        }
      ),
      maxLength: globalStringMaxLengthRule,
    },
    rating: {
      mustBeNumber: helpers.withMessage('Rating must be a number', (val: unknown) => {
        if (val === null || val === '') return true // allow empty
        return !isNaN(Number(val))
      }),
    },
  })),
  individual_work_experience: payload.individual_work_experience.map(() => ({
    inclusive_date_from: {
      required: helpers.withMessage('Start date is required.', required),
      isAfterOrEqualTo: helpers.withMessage(
        'Inclusive "From" date must not be after "To" date.',
        (
          val: string | number | Date | null,
          vm: {
            inclusive_date_to: string | number | Date | null
            is_current_work: boolean
          }
        ) => {
          if (vm.is_current_work || !helpers.req(vm.inclusive_date_to)) return true

          const from = val ? new Date(val) : null
          const to = vm.inclusive_date_to ? new Date(vm.inclusive_date_to) : null

          if (!from || !to || isNaN(from.getTime()) || isNaN(to.getTime())) return true

          return from <= to
        }
      ),
    },
    inclusive_date_to: {
      required: helpers.withMessage('Inclusive "To" date is required', (val, vm) => {
        return vm.is_current_work === true ? true : helpers.req(val)
      }),
      isAfterOrEqualFromDate,
    },
    position_title: {
      required: helpers.withMessage('Position title is required.', required),
      maxLength: globalStringMaxLengthRule,
    },
    department_agency_office_company: {
      required: helpers.withMessage('Department/Agency is required.', required),
      maxLength: globalStringMaxLengthRule,
    },
    monthly_salary: {
      required: helpers.withMessage('Monthly salary is required.', required),
      numeric: helpers.withMessage('Monthly salary must be a number.', numeric),
    },
    salary_grade_id: {
      required: helpers.withMessage('Salary grade ID is required .', (val, vm) => {
        const hasCustom = helpers.req(vm.custom_salary_grade)
        return hasCustom ? true : helpers.req(val)
      }),
      maxLength: globalStringMaxLengthRule,
    },
    custom_salary_grade: {
      required: helpers.withMessage('Custom salary grade is required.', (val, vm) => {
        const hasSalaryGrade = helpers.req(vm.salary_grade_id)
        return hasSalaryGrade ? true : helpers.req(val)
      }),
      maxLength: globalStringMaxLengthRule,
      matchesFormat: helpers.withMessage('Custom salary grade format must be like "01-1".', (val, vm) => {
        const hasSalaryGrade = helpers.req(vm.salary_grade_id)
        if (hasSalaryGrade || !val) return true // skip if other SG is used or empty
        return /^[0-9]{2}-[0-9]{1}$/.test(String(val))
      }),
    },
    status_of_appointment: {
      required: helpers.withMessage('Status of appointment is required.', required),
    },
    is_gov_service: {
      required: helpers.withMessage('Please indicate if this is government service.', required),
    },
  })),
}))

watch(isCurrentlyEmployed, (newVal) => {
  payload.individual_work_experience.forEach((entry, index) => {
    if (index === 0) {
      // Only first work experience is current if employed
      entry.is_current_work = newVal ? true : false
      // If currently employed, clear the inclusive_date_to field
      if (newVal) {
        entry.inclusive_date_to = null
      }
    } else {
      entry.is_current_work = false
    }
  })
})

watch(useCustomSalaryGrade, (newVal) => {
  payload.individual_work_experience.forEach((entry) => {
    if (newVal) {
      // Using custom salary grade, so clear salary_grade_id
      entry.salary_grade_id = null
    } else {
      // Using system-defined salary grade, so clear custom_salary_grade
      entry.custom_salary_grade = null
    }
    // Clear monthly_salary only for new entries (no id)
    if (!entry.id && !entry.salary_grade_id && !entry.custom_salary_grade) {
      entry.monthly_salary = null
    }
  })
})

watch(
  () => payload.individual_work_experience[workExperienceIndex.value - 1]?.salary_grade_id,
  (newSelectedItem) => {
    const idx = workExperienceIndex.value - 1
    if (idx < 0 || !payload.individual_work_experience[idx]) return // guard

    if (!newSelectedItem) {
      selectedWorkExperienceSG.value[idx] = null
      return
    }

    // Normalize ID if newSelectedItem could be an object
    const selectedId =
      typeof newSelectedItem === 'object' && newSelectedItem !== null ? (newSelectedItem as { id: number }).id : newSelectedItem

    // Search store options
    const existing = sgStore.salaryGradesOptions.find((opt) => opt.value === selectedId)
    if (existing) {
      selectedWorkExperienceSG.value[idx] = existing
    } else {
      // Watch for async-loaded options if not yet available
      const unwatch = watch(
        () => sgStore.salaryGradesOptions,
        (options) => {
          const found = options.find((opt) => opt.value === selectedId)
          if (found) {
            selectedWorkExperienceSG.value[idx] = found
            unwatch() // stop watching after found
          }
        },
        { immediate: true }
      )
    }
  },
  { immediate: true }
)

const validator = useVuelidate<PersonalDataSheetPayload>(formRules, payload)

const showToast = (
  severityPararm: 'success' | 'error' | 'info' | 'warn' | 'secondary' | 'contrast' | undefined,
  message: string,
  summaryParam: string
) => {
  if (activeToasts.value < maxToasts) {
    toast.add({
      summary: message,
      detail: summaryParam,
      severity: severityPararm,
      life: 5000,
    })
    activeToasts.value++

    setTimeout(() => {
      activeToasts.value--
    }, 5000)
  }
}

const handleAdditionalEligibility = () => {
  if (payload.individual_eligibility.length < 7) {
    payload.individual_eligibility.push({
      id: null,
      eligibility: null,
      rating: null,
      date_of_examination_conferment: null,
      place_of_examination: null,
      license_number: null,
      license_date_of_validity: null,
      _delete: null,
    })
  }
}

const handleRemoveEligibility = (eligibilityIndex: number) => {
  const idx = eligibilityIndex - 1
  const eligibility = payload.individual_eligibility?.[idx]

  if (eligibility?.id) {
    // mark for backend soft-delete
    payload.individual_eligibility[idx] = {
      ...eligibility,
      _delete: true,
    }
  } else {
    // not saved yet → remove completely
    payload.individual_eligibility.splice(idx, 1)
  }
}

const handleAdditionalWorkExperience = () => {
  const length = payload.individual_work_experience.length

  if (length > MAX_ENTRIES_PER_TAB) {
    extraWorkExperienceTabVisible.value = true
    activeTab.value = 2 // switch to Continued tab
  }
  // Add a new entry
  payload.individual_work_experience.push({
    id: null,
    is_current_work: false,
    inclusive_date_from: null,
    inclusive_date_to: null,
    position_title: null,
    department_agency_office_company: null,
    monthly_salary: null,
    salary_grade_id: null,
    salary_grade: null,
    custom_salary_grade: null,
    status_of_appointment: null,
    is_gov_service: false,
    _delete: null,
  })
  useCustomSalaryGrade.value.push(false)
  selectedWorkExperienceSG.value.push(null)
}

watch(
  () => payload.individual_work_experience.length,
  (length) => {
    extraWorkExperienceTabVisible.value = length > MAX_ENTRIES_PER_TAB
  }
)

const handleRemoveWorkExperience = (workExperienceIndex: number) => {
  const idx = workExperienceIndex - 1
  const workExperience = payload.individual_work_experience?.[idx]

  if (workExperience?.id) {
    // mark for backend soft-delete
    payload.individual_work_experience[idx] = {
      ...workExperience,
      _delete: true,
    }
  } else {
    // not saved yet → remove completely
    payload.individual_work_experience.splice(idx, 1)
  }
}

// ──────────────────────────────────────────────────────────
//          PDS Details Form - Fetching by ID & Update
// ──────────────────────────────────────────────────────────
type pdsDetailsFormProps = {
  personnelPds?: PersonnelResponse
}
const props = defineProps<pdsDetailsFormProps>()
onMounted(async () => {
  const id = route.params.id as string
  if (id) {
    const response = await pdsStore.fetchPdsById(id)

    if (response && response.success) {
      console.log('Fetched PDS data:', response.data)
      pdsStore.updatePdsFromPersonnel(response.data as PersonnelResponse)
    } else {
      console.warn('Failed to fetch PDS by ID or response unsuccessful.')
    }
  }

  isLoading.value = false
})

watch(
  () => props.personnelPds,
  (newPersonnel) => {
    if (newPersonnel) {
      pdsStore.updatePdsFromPersonnel(newPersonnel)
    } else {
      for (const key in payload.individual) {
        payload.individual[key as keyof typeof payload.individual] = null
      }
    }
  },
  { immediate: true }
)

const updateC2Form = async () => {
  IsBeingUpdated.value = true
  isC2Loading.value = true
  formIsSubmitting.value = true

  const id = route.params.id as string
  if (!id) {
    showToast('error', 'PDS Error', 'No ID found for updating.')
    IsBeingUpdated.value = false
    isC2Loading.value = false
    formIsSubmitting.value = false
    return { valid: false, errorTabs: ['C2'] }
  }

  const valid = await validator.value.$validate()
  if (!valid) {
    const hasEligibilityError = Object.values(validator.value.individual_eligibility ?? {}).some(
      (entry) => (entry as { $error: boolean })?.$error
    )

    const hasWorkExperienceError = Object.values(validator.value.individual_work_experience ?? {}).some(
      (entry) => (entry as { $error: boolean })?.$error
    )

    const errorTabs: string[] = []
    if (hasEligibilityError) errorTabs.push('Civil Service Eligibility')
    if (hasWorkExperienceError) errorTabs.push('Work Experience')

    const tabList = errorTabs.join(', ')
    showToast('error', 'Validation Error', `Please check the following tab(s): ${tabList}`)

    IsBeingUpdated.value = false
    isC2Loading.value = false
    formIsSubmitting.value = false

    return { valid: false, errorTabs: ['C2'] }
  }

  const response = await pdsStore.updatePds({ ...payload }, id, 'C2')

  if (!response.success) {
    const result = parseApiResponseError(response)

    isPdsError.value = true
    errorMessage.value = result?.message
    pdsErrors.value = result?.errors
    showToast('error', 'PDS C2 Error', 'Please see the validation messages')
  } else {
    showToast('success', 'PDS', 'PDS has been saved')
  }

  IsBeingUpdated.value = false
  isC2Loading.value = false
  formIsSubmitting.value = false
}

// ──────────────────────────────────────────────────────────
//          PDS Details Form - Save Handler
// ──────────────────────────────────────────────────────────

const handleSaveC2Form = async () => {
  isC2Loading.value = true

  const valid = await validator.value.$validate()
  if (!valid) {
    const hasEligibilityError = Object.values(validator.value.individual_eligibility).some(
      (entry) => (entry as { $error: boolean })?.$error
    )

    const hasWorkExperienceError = Object.values(validator.value.individual_work_experience).some(
      (entry) => (entry as { $error: boolean })?.$error
    )

    let errorTabs = []
    if (hasEligibilityError) errorTabs.push('Civil Service Eligibility')
    if (hasWorkExperienceError) errorTabs.push('Work Experience')

    const tabList = errorTabs.join(', ')
    showToast('error', 'Validation Error', `Please check the following tab(s): ${tabList}`)

    isC2Loading.value = false
    return { valid: false, errorTabs: ['C2'] }
  }

  const response = await pdsStore.savePds(payload)

  if (response.success === false) {
    const result = parseApiResponseError(response)

    isPdsError.value = true
    errorMessage.value = result?.message
    pdsErrors.value = result?.errors
    showToast('error', 'PDS C2 Error', 'PLease see the validation messages')
  } else {
    showToast('success', 'PDS', 'PDS has been saved')
    router.push({ name: 'employment' })
  }

  isC2Loading.value = false
}

defineExpose({
  handleSaveC2Form,
  updateC2Form,
})
</script>
<template>
  <template v-if="!isLoading && !isImporting">
    <div class="flex flex-row">
      <form @submit.prevent="" autocomplete="off" class="h-full w-full">
        <div class="w-full">
          <TabGroup>
            <TabList class="flex">
              <Tab v-for="subSection in c1Tabs" as="template" :key="subSection.index" v-slot="{ selected }">
                <button
                  :class="[
                    'w-full border-b-2 border-solid py-4 text-sm font-medium italic leading-5 ring-transparent transition-all duration-300 ease-in-out focus:outline-none md:text-base ',
                    selected
                      ? 'border-b-2 border-solid border-primary-600 bg-primary-100 text-primary-600'
                      : 'border-surface-300 text-surface-400 hover:bg-surface-0/[0.12]',
                  ]"
                >
                  {{ subSection.name }}
                </button>
              </Tab>
              <Tab v-if="extraWorkExperienceTabVisible" as="template" :key="'extra-tab'" v-slot="{ selected }">
                <button
                  :class="[
                    'w-full border-b-2 border-solid py-4 text-sm font-medium italic leading-5 ring-transparent transition-all duration-300 ease-in-out focus:outline-none md:text-base ',
                    selected
                      ? 'border-b-2 border-solid border-primary-600 bg-primary-100 text-primary-600'
                      : 'border-surface-300 text-surface-400 hover:bg-surface-0/[0.12]',
                  ]"
                >
                  Work Experience (Continued)
                </button>
              </Tab>
            </TabList>

            <TabPanels>
              <!-- START CIVIL SERVICE ELIGIBILITY SECTION -->
              <TabPanel :class="['my-8 md:mx-12 ', ' ring-surface-0/60 focus:outline-none ']">
                <TransitionRoot
                  appear
                  :show="true"
                  enter="transition-all ease-in-out duration-500 "
                  enterFrom="opacity-0 translate-y-6"
                  enterTo="opacity-100 translate-y-0"
                  leave="transition-all ease-in-out duration-800"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div class="flex flex-col gap-4">
                    <span class="flex flex-col justify-center space-y-2 font-medium text-primary-700">
                      <p class="text-xl italic md:text-2xl">IV. Civil Service Eligibility</p>
                    </span>

                    <template v-for="eligibilityIndex in payload.individual_eligibility.length" :key="eligibilityIndex">
                      <TransitionRoot
                        appear
                        :show="true"
                        enter="transition-all ease-in-out duration-500 "
                        enterFrom="opacity-0 translate-y-6"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition-all ease-in-out duration-800"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                      >
                        <div v-if="!payload.individual_eligibility[eligibilityIndex - 1]?._delete">
                          <div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                            <div class="md:col-span-2">
                              <WbInputText
                                v-model="payload.individual_eligibility[eligibilityIndex - 1].eligibility"
                                label="Eligibility"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                              />
                            </div>

                            <div>
                              <WbInputText
                                v-model="payload.individual_eligibility[eligibilityIndex - 1].rating"
                                label="Rating"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalid="validator.individual_eligibility[eligibilityIndex - 1].rating.$error"
                                :invalidText="validator.individual_eligibility[eligibilityIndex - 1].rating.$errors[0]?.$message"
                                @blur="validator.individual_eligibility[eligibilityIndex - 1].rating.$touch()"
                              />
                            </div>

                            <div>
                              <WbCalendar
                                v-model="payload.individual_eligibility[eligibilityIndex - 1].date_of_examination_conferment"
                                label="Date of Exam / Conferment"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                                :dateFormat="'yy-mm-dd'"
                                :invalid="
                                  validator.individual_eligibility[eligibilityIndex - 1].date_of_examination_conferment.$error
                                "
                                :invalidText="
                                  validator.individual_eligibility[eligibilityIndex - 1].date_of_examination_conferment.$errors[0]
                                    ?.$message
                                "
                                @blur="
                                  validator.individual_eligibility[eligibilityIndex - 1].date_of_examination_conferment.$touch()
                                "
                              />
                            </div>
                          </div>

                          <div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                            <div class="md:col-span-2">
                              <WbInputText
                                v-model="payload.individual_eligibility[eligibilityIndex - 1].place_of_examination"
                                label="Place of Examination"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                              />
                            </div>

                            <div>
                              <WbInputText
                                v-model="payload.individual_eligibility[eligibilityIndex - 1].license_number"
                                label="License Number"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                              />
                            </div>

                            <div class="flex items-end gap-2">
                              <!-- WbInputText takes most of the space -->
                              <WbCalendar
                                v-model="payload.individual_eligibility[eligibilityIndex - 1].license_date_of_validity"
                                label="License Validity"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                :dateFormat="'yy-mm-dd'"
                                class="lg:text-md lg:placeholder:text-md flex-1 text-sm placeholder:text-sm"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalidText="
                                  validator.individual_eligibility[eligibilityIndex - 1].license_date_of_validity.$errors[0]
                                    ?.$message
                                "
                                :invalid="validator.individual_eligibility[eligibilityIndex - 1].license_date_of_validity.$error"
                                @blur="validator.individual_eligibility[eligibilityIndex - 1].license_date_of_validity.$touch()"
                              />
                              <!-- Delete button aligned right, below label -->
                              <Button
                                v-show="eligibilityIndex > 0"
                                :id="getId(`button-remove-eligibility-${eligibilityIndex}`)"
                                icon="pi pi-trash"
                                @click="handleRemoveEligibility(eligibilityIndex)"
                                v-tooltip.top="'Remove Eligibility'"
                                severity="danger"
                                class="mb-2 text-lg font-semibold dark:text-primary-100"
                                text
                              />
                            </div>
                          </div>
                        </div>
                        <hr />
                      </TransitionRoot>
                    </template>

                    <Button
                      v-if="payload.individual_eligibility.length < 7"
                      label="Add additional Eligibility field"
                      @click="handleAdditionalEligibility"
                      size="large"
                      class="dark:text-secondary-100 mt-4 !w-64 border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
                      text
                    >
                      <template #icon>
                        <i class="pi pi-plus mr-2"></i>
                      </template>
                    </Button>
                  </div>

                  <span class="mt-10 flex flex-col justify-center space-y-4 font-medium text-surface-600">
                    <p class="md:text-md text-lg italic">
                      Note: A maximum of seven (7) Civil Service Eligibility entries are allowed in a page, if the number of your
                      civil service eligibilities exceeds in the aforementioned limit, it will be in a separate sheet.
                    </p>
                  </span>
                </TransitionRoot>
              </TabPanel>
              <!-- END CIVIL SERVICE ELIGIBILITY SECTION -->

              <!-- START WORK EXPERIENCE -->
              <TabPanel v-model:activeIndex="activeTab" :class="['my-8 md:mx-12 ', ' ring-surface-0/60 focus:outline-none ']">
                <TransitionRoot
                  appear
                  :show="true"
                  enter="transition-all ease-in-out duration-500 "
                  enterFrom="opacity-0 translate-y-6"
                  enterTo="opacity-100 translate-y-0"
                  leave="transition-all ease-in-out duration-800"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div class="flex flex-col gap-4">
                    <span class="flex flex-col justify-center space-y-2 font-medium">
                      <p class="text-xl italic text-primary-700 md:text-2xl">V. Work Experience</p>
                      <p class="md:text-md text-lg italic text-surface-600">
                        (Include private employment. Start from your recent work) Description of duties should be indicated in the
                        attached Work Experience sheet.
                      </p>
                    </span>
                    <div class="col-span-2 my-4 ml-4">
                      <div class="align-items-center flex items-center">
                        <Checkbox
                          v-model="isCurrentlyEmployed"
                          :id="getId('input-currently-working')"
                          :inputId="getId('input-currently-working')"
                          name="currentlyEmployed"
                          :binary="true"
                        />
                        <label :for="getId('input-currently-working')" class="ml-2 text-surface-600">
                          I am currently working in this role
                        </label>
                      </div>
                    </div>

                    <template v-for="workExperienceIndex in payload.individual_work_experience.length" :key="workExperienceIndex">
                      <TransitionRoot
                        appear
                        :show="true"
                        enter="transition-all ease-in-out duration-500 "
                        enterFrom="opacity-0 translate-y-6"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition-all ease-in-out duration-800"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                      >
                        <div v-if="!payload.individual_work_experience[workExperienceIndex - 1]?._delete">
                          <div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-6">
                            <div>
                              <WbCalendar
                                v-model="payload.individual_work_experience[workExperienceIndex - 1].inclusive_date_from"
                                label="From"
                                required
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                                :dateFormat="'yy-mm-dd'"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalidText="
                                  validator.individual_work_experience[workExperienceIndex - 1].inclusive_date_from.$errors[0]
                                    ?.$message
                                "
                                :invalid="
                                  validator.individual_work_experience[workExperienceIndex - 1].inclusive_date_from.$error
                                "
                                @blur="validator.individual_work_experience[workExperienceIndex - 1].inclusive_date_from.$touch()"
                              />
                            </div>
                            <!-- For the first entry -->
                            <div v-if="workExperienceIndex === 0">
                              <!-- If NOT currently employed, show calendar -->
                              <WbCalendar
                                v-if="!isCurrentlyEmployed"
                                v-model="payload.individual_work_experience[workExperienceIndex - 1].inclusive_date_to"
                                label="To"
                                :dateFormat="'yy-mm-dd'"
                                class="w-full text-sm"
                                label-class="text-md text-surface-600 md:text-sm"
                                validation-error-message-class="text-xs text-error-500 font-bold"
                                :invalidText="
                                  validator.individual_work_experience[workExperienceIndex - 1].inclusive_date_to.$errors[0]
                                    ?.$message
                                "
                                :invalid="validator.individual_work_experience[workExperienceIndex - 1].inclusive_date_to.$error"
                                @blur="validator.individual_work_experience[workExperienceIndex - 1].inclusive_date_to.$touch()"
                                required
                              />

                              <!-- If currently employed, show "PRESENT" input -->
                              <WbInputText
                                v-else
                                :modelValue="'PRESENT'"
                                label="To"
                                disabled
                                readonly
                                class="w-full text-sm"
                                label-class="text-md text-surface-600 md:text-sm"
                                required
                              />
                            </div>

                            <!-- For all entries after the first -->
                            <div v-else>
                              <WbCalendar
                                v-model="payload.individual_work_experience[workExperienceIndex - 1].inclusive_date_to"
                                label="To"
                                :dateFormat="'yy-mm-dd'"
                                class="w-full text-sm"
                                label-class="text-md text-surface-600 md:text-sm"
                                validation-error-message-class="text-xs text-error-500 font-bold"
                                :invalidText="
                                  validator.individual_work_experience[workExperienceIndex - 1].inclusive_date_to.$errors[0]
                                    ?.$message
                                "
                                :invalid="validator.individual_work_experience[workExperienceIndex - 1].inclusive_date_to.$error"
                                @blur="validator.individual_work_experience[workExperienceIndex - 1].inclusive_date_to.$touch()"
                                required
                              />
                            </div>

                            <div class="md:col-span-2">
                              <WbInputText
                                v-model="payload.individual_work_experience[workExperienceIndex - 1].position_title"
                                label="Position Title"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalidText="
                                  validator.individual_work_experience[workExperienceIndex - 1].position_title.$errors[0]
                                    ?.$message
                                "
                                :invalid="validator.individual_work_experience[workExperienceIndex - 1].position_title.$error"
                                @blur="validator.individual_work_experience[workExperienceIndex - 1].position_title.$touch()"
                                required
                              />
                            </div>
                            <div class="md:col-span-2">
                              <WbInputText
                                v-model="
                                  payload.individual_work_experience[workExperienceIndex - 1].department_agency_office_company
                                "
                                label="Department/Agency/Company"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalidText="
                                  validator.individual_work_experience[workExperienceIndex - 1].department_agency_office_company
                                    .$errors[0]?.$message
                                "
                                :invalid="
                                  validator.individual_work_experience[workExperienceIndex - 1].department_agency_office_company
                                    .$error
                                "
                                @blur="
                                  validator.individual_work_experience[
                                    workExperienceIndex
                                  ].department_agency_office_company.$touch()
                                "
                                required
                              />
                            </div>
                          </div>
                          <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
                            <div>
                              <WbInputText
                                v-model="payload.individual_work_experience[workExperienceIndex - 1].monthly_salary"
                                label="Monthly Salary"
                                required
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalidText="
                                  validator.individual_work_experience[workExperienceIndex - 1].monthly_salary.$errors[0]
                                    ?.$message
                                "
                                :invalid="validator.individual_work_experience[workExperienceIndex - 1].monthly_salary.$error"
                                @blur="validator.individual_work_experience[workExperienceIndex - 1].monthly_salary.$touch()"
                              />
                            </div>
                            <div>
                              <!-- WbAutoComplete shown only when NOT using custom SG -->
                              <WbAutoComplete
                                v-if="!useCustomSalaryGrade[workExperienceIndex - 1]"
                                :useApiFilter="true"
                                :apiEndpoint="'libraries/salary-grades/search'"
                                :suggestions="sgStore.salaryGradesOptions"
                                apiOptionLabel="work_experience_salary_grade"
                                label="Salary Grade"
                                placeholder="Type Salary Grade with its tranche here"
                                v-model="selectedWorkExperienceSG[workExperienceIndex - 1]"
                                :id="getId('input-salary-grade')"
                                optionLabel="label"
                                optionValue="value"
                                required
                                @on-true-value-computed="
                                  (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                                    useWbAutoCompleteHandleTrueValue(
                                      value,
                                      toRef(payload.individual_work_experience[workExperienceIndex - 1], 'salary_grade_id')
                                    )
                                "
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalidText="
                                  validator.individual_work_experience[workExperienceIndex - 1].salary_grade_id.$errors[0]
                                    ?.$message
                                "
                                :invalid="validator.individual_work_experience[workExperienceIndex - 1].salary_grade_id.$error"
                                @blur="validator.individual_work_experience[workExperienceIndex - 1].salary_grade_id.$touch()"
                              />

                              <!-- WbInputText shown only when using custom SG -->
                              <WbInputText
                                v-else
                                v-model="payload.individual_work_experience[workExperienceIndex - 1].custom_salary_grade"
                                label="Salary Grade"
                                required
                                placeholder="e.g 01-0 ,01-1 ,02-0"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalidText="
                                  validator.individual_work_experience[workExperienceIndex - 1].custom_salary_grade.$errors[0]
                                    ?.$message
                                "
                                :invalid="
                                  validator.individual_work_experience[workExperienceIndex - 1].custom_salary_grade.$error
                                "
                                @blur="validator.individual_work_experience[workExperienceIndex - 1].custom_salary_grade.$touch()"
                              />
                              <!-- Toggle Link -->
                              <p
                                class="mb-2 ml-2 cursor-pointer text-sm text-primary-500 hover:underline md:text-xs"
                                @click="
                                  useCustomSalaryGrade[workExperienceIndex - 1] = !useCustomSalaryGrade[workExperienceIndex - 1]
                                "
                              >
                                {{
                                  useCustomSalaryGrade[workExperienceIndex - 1]
                                    ? 'Use Salary Grade from list'
                                    : 'Use custom salary grade'
                                }}
                              </p>
                            </div>

                            <div>
                              <WbDropdown
                                v-model="payload.individual_work_experience[workExperienceIndex - 1].status_of_appointment"
                                optionLabel="label"
                                optionValue="value"
                                :options="EmploymentStatusOptions"
                                required
                                label="Status of Appointment"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalidText="
                                  validator.individual_work_experience[workExperienceIndex - 1].status_of_appointment.$errors[0]
                                    ?.$message
                                "
                                :invalid="
                                  validator.individual_work_experience[workExperienceIndex - 1].status_of_appointment.$error
                                "
                                @blur="
                                  validator.individual_work_experience[workExperienceIndex - 1].status_of_appointment.$touch()
                                "
                              >
                              </WbDropdown>
                            </div>
                            <div class="mb-12 flex items-end gap-2">
                              <!-- WbInputText takes most of the space -->
                              <WbDropdown
                                v-model="payload.individual_work_experience[workExperienceIndex - 1].is_gov_service"
                                optionLabel="label"
                                optionValue="value"
                                :options="isGovServiceYesNoOptions"
                                required
                                label="Gov’t Service"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalidText="
                                  validator.individual_work_experience[workExperienceIndex - 1].is_gov_service.$errors[0]
                                    ?.$message
                                "
                                :invalid="validator.individual_work_experience[workExperienceIndex - 1].is_gov_service.$error"
                                @blur="validator.individual_work_experience[workExperienceIndex - 1].is_gov_service.$touch()"
                              >
                              </WbDropdown>

                              <!-- Delete button aligned right, below label -->
                              <Button
                                v-show="workExperienceIndex > 0"
                                :id="getId(`button-remove-work-experience-${workExperienceIndex}`)"
                                icon="pi pi-trash"
                                @click="handleRemoveWorkExperience(workExperienceIndex)"
                                v-tooltip.top="'Remove Work Experience'"
                                severity="danger"
                                class="mb-2 text-lg font-semibold dark:text-primary-100 md:mb-2"
                                text
                              />
                            </div>
                          </div>
                        </div>
                        <hr />
                      </TransitionRoot>
                    </template>
                    <Button
                      v-if="!extraWorkExperienceTabVisible"
                      label="Add additional Work Experience field"
                      @click="handleAdditionalWorkExperience"
                      size="large"
                      class="dark:text-secondary-100 mt-4 !w-72 border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
                      text
                    >
                      <template #icon>
                        <i class="pi pi-plus mr-2"></i>
                      </template>
                    </Button>
                  </div>

                  <span class="mt-10 flex flex-col justify-center space-y-4 font-medium text-surface-600">
                    <p class="md:text-md text-lg italic">
                      Note: A maximum of 28 Work Experience entries are allowed in a page, if the number of your work experience
                      exceeds in the aforementioned limit, it will be in a separate sheet.
                    </p>
                  </span>
                </TransitionRoot>
              </TabPanel>

              <TabPanel
                v-if="extraWorkExperienceTabVisible"
                :class="['my-8 md:mx-12 ', ' ring-surface-0/60 focus:outline-none ']"
              >
                <TransitionRoot
                  appear
                  :show="true"
                  enter="transition-all ease-in-out duration-500 "
                  enterFrom="opacity-0 translate-y-6"
                  enterTo="opacity-100 translate-y-0"
                  leave="transition-all ease-in-out duration-800"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div class="flex flex-col gap-4">
                    <span class="flex flex-col justify-center space-y-2 font-medium">
                      <p class="text-xl italic text-primary-700 md:text-2xl">V. Work Experience (Continued)</p>
                      <p class="md:text-md text-lg italic text-surface-600">
                        (Include private employment. Start from your recent work) Description of duties should be indicated in the
                        attached Work Experience sheet.
                      </p>
                    </span>
                    <template
                      v-for="(work, i) in payload.individual_work_experience.slice(MAX_ENTRIES_PER_TAB)"
                      :key="i + MAX_ENTRIES_PER_TAB"
                    >
                      <TransitionRoot
                        appear
                        :show="true"
                        enter="transition-all ease-in-out duration-500"
                        enterFrom="opacity-0 translate-y-6"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition-all ease-in-out duration-800"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                      >
                        <div v-if="!payload.individual_work_experience[workExperienceIndex - 1]?._delete">
                          <div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-6">
                            <div>
                              <WbCalendar
                                v-model="payload.individual_work_experience[workExperienceIndex - 1].inclusive_date_from"
                                label="From"
                                required
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                                :dateFormat="'yy-mm-dd'"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalidText="
                                  validator.individual_work_experience[i + MAX_ENTRIES_PER_TAB].inclusive_date_from.$errors[0]
                                    ?.$message
                                "
                                :invalid="
                                  validator.individual_work_experience[i + MAX_ENTRIES_PER_TAB].inclusive_date_from.$error
                                "
                                @blur="validator.individual_work_experience[i + MAX_ENTRIES_PER_TAB].inclusive_date_from.$touch()"
                              />
                            </div>
                            <div>
                              <WbCalendar
                                v-model="payload.individual_work_experience[workExperienceIndex - 1].inclusive_date_to"
                                label="To"
                                :dateFormat="'yy-mm-dd'"
                                class="w-full text-sm"
                                label-class="text-md text-surface-600 md:text-sm"
                                validation-error-message-class="text-xs text-error-500 font-bold"
                                :invalidText="
                                  validator.individual_work_experience[i + MAX_ENTRIES_PER_TAB].inclusive_date_to.$errors[0]
                                    ?.$message
                                "
                                :invalid="validator.individual_work_experience[i + MAX_ENTRIES_PER_TAB].inclusive_date_to.$error"
                                @blur="validator.individual_work_experience[i + MAX_ENTRIES_PER_TAB].inclusive_date_to.$touch()"
                                required
                              />
                            </div>
                            <div class="md:col-span-2">
                              <WbInputText
                                v-model="payload.individual_work_experience[workExperienceIndex - 1].position_title"
                                label="Position Title"
                                required
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                class="w-full text-sm"
                                :invalidText="
                                  validator.individual_work_experience[i + MAX_ENTRIES_PER_TAB].position_title.$errors[0]
                                    ?.$message
                                "
                                :invalid="validator.individual_work_experience[i + MAX_ENTRIES_PER_TAB].position_title.$error"
                                @blur="validator.individual_work_experience[i + MAX_ENTRIES_PER_TAB].position_title.$touch()"
                              />
                            </div>
                            <div class="md:col-span-2">
                              <WbInputText
                                v-model="
                                  payload.individual_work_experience[workExperienceIndex - 1].department_agency_office_company
                                "
                                label="Department/Agency/Company"
                                required
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                class="w-full text-sm"
                                :invalidText="
                                  validator.individual_work_experience[i + MAX_ENTRIES_PER_TAB].department_agency_office_company
                                    .$errors[0]?.$message
                                "
                                :invalid="
                                  validator.individual_work_experience[i + MAX_ENTRIES_PER_TAB].department_agency_office_company
                                    .$error
                                "
                                @blur="
                                  validator.individual_work_experience[
                                    i + MAX_ENTRIES_PER_TAB
                                  ].department_agency_office_company.$touch()
                                "
                              />
                            </div>
                          </div>

                          <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
                            <div>
                              <WbInputText
                                v-model="payload.individual_work_experience[workExperienceIndex - 1].monthly_salary"
                                label="Monthly Salary"
                                required
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                class="w-full text-sm"
                                :invalidText="
                                  validator.individual_work_experience[i + MAX_ENTRIES_PER_TAB].monthly_salary.$errors[0]
                                    ?.$message
                                "
                                :invalid="validator.individual_work_experience[i + MAX_ENTRIES_PER_TAB].monthly_salary.$error"
                                @blur="validator.individual_work_experience[i + MAX_ENTRIES_PER_TAB].monthly_salary.$touch()"
                              />
                            </div>

                            <div>
                              <WbAutoComplete
                                v-if="!useCustomSalaryGrade[i + MAX_ENTRIES_PER_TAB]"
                                :useApiFilter="true"
                                :apiEndpoint="'libraries/salary-grades/search'"
                                :suggestions="sgStore.salaryGradesOptions"
                                apiOptionLabel="work_experience_salary_grade"
                                label="Salary Grade"
                                placeholder="Type Salary Grade with its tranche here"
                                v-model="selectedWorkExperienceSG[i + MAX_ENTRIES_PER_TAB]"
                                :id="getId('input-salary-grade')"
                                optionLabel="label"
                                optionValue="value"
                                required
                                @on-true-value-computed="
                                  (value) => useWbAutoCompleteHandleTrueValue(value, toRef(work, 'salary_grade_id'))
                                "
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                class="w-full text-sm"
                                :invalidText="
                                  validator.individual_work_experience[i + MAX_ENTRIES_PER_TAB].salary_grade_id.$errors[0]
                                    ?.$message
                                "
                                :invalid="validator.individual_work_experience[i + MAX_ENTRIES_PER_TAB].salary_grade_id.$error"
                                @blur="validator.individual_work_experience[i + MAX_ENTRIES_PER_TAB].salary_grade_id.$touch()"
                              />

                              <WbInputText
                                v-else
                                v-model="payload.individual_work_experience[workExperienceIndex - 1].custom_salary_grade"
                                label="Salary Grade"
                                required
                                placeholder="e.g 01-0 ,01-1 ,02-0"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                class="w-full text-sm"
                                :invalidText="
                                  validator.individual_work_experience[i + MAX_ENTRIES_PER_TAB].custom_salary_grade.$errors[0]
                                    ?.$message
                                "
                                :invalid="
                                  validator.individual_work_experience[i + MAX_ENTRIES_PER_TAB].custom_salary_grade.$error
                                "
                                @blur="validator.individual_work_experience[i + MAX_ENTRIES_PER_TAB].custom_salary_grade.$touch()"
                              />
                              <p
                                class="mb-2 ml-2 cursor-pointer text-sm text-primary-500 hover:underline md:text-xs"
                                @click="
                                  useCustomSalaryGrade[i + MAX_ENTRIES_PER_TAB] = !useCustomSalaryGrade[i + MAX_ENTRIES_PER_TAB]
                                "
                              >
                                {{
                                  useCustomSalaryGrade[i + MAX_ENTRIES_PER_TAB]
                                    ? 'Use Salary Grade from list'
                                    : 'Use custom salary grade'
                                }}
                              </p>
                            </div>

                            <div>
                              <WbDropdown
                                v-model="payload.individual_work_experience[workExperienceIndex - 1].status_of_appointment"
                                :options="EmploymentStatusOptions"
                                optionLabel="label"
                                optionValue="value"
                                required
                                label="Status of Appointment"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                class="w-full text-sm"
                                :invalidText="
                                  validator.individual_work_experience[i + MAX_ENTRIES_PER_TAB].status_of_appointment.$errors[0]
                                    ?.$message
                                "
                                :invalid="
                                  validator.individual_work_experience[i + MAX_ENTRIES_PER_TAB].status_of_appointment.$error
                                "
                                @blur="
                                  validator.individual_work_experience[i + MAX_ENTRIES_PER_TAB].status_of_appointment.$touch()
                                "
                              />
                            </div>

                            <div class="mb-12 flex items-end gap-2">
                              <WbDropdown
                                v-model="payload.individual_work_experience[workExperienceIndex - 1].is_gov_service"
                                :options="isGovServiceYesNoOptions"
                                optionLabel="label"
                                optionValue="value"
                                required
                                label="Gov’t Service"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                class="w-full text-sm"
                                :invalidText="
                                  validator.individual_work_experience[i + MAX_ENTRIES_PER_TAB].is_gov_service.$errors[0]
                                    ?.$message
                                "
                                :invalid="validator.individual_work_experience[i + MAX_ENTRIES_PER_TAB].is_gov_service.$error"
                                @blur="validator.individual_work_experience[i + MAX_ENTRIES_PER_TAB].is_gov_service.$touch()"
                              />

                              <Button
                                icon="pi pi-trash"
                                @click="handleRemoveWorkExperience(i + MAX_ENTRIES_PER_TAB)"
                                v-tooltip.top="'Remove Work Experience'"
                                severity="danger"
                                class="mb-2 text-lg font-semibold dark:text-primary-100 md:mb-2"
                                text
                              />
                            </div>
                          </div>
                        </div>
                        <hr />
                      </TransitionRoot>
                    </template>
                    <Button
                      v-if="payload.individual_work_experience.length"
                      label="Add additional Work Experience field"
                      @click="handleAdditionalWorkExperience"
                      size="large"
                      class="dark:text-secondary-100 mt-4 !w-72 border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
                      text
                    >
                      <template #icon>
                        <i class="pi pi-plus mr-2"></i>
                      </template>
                    </Button>
                  </div>

                  <span class="mt-10 flex flex-col justify-center space-y-4 font-medium text-surface-600">
                    <p class="md:text-md text-lg italic">
                      Note: A maximum of 28 Work Experience entries are allowed in a page, if the number of your work experience
                      exceeds in the aforementioned limit, it will be in a separate sheet.
                    </p>
                  </span>
                </TransitionRoot>
              </TabPanel>

              <!-- END WORK EXPERIENCE -->
            </TabPanels>
          </TabGroup>
        </div>
      </form>
    </div>
  </template>
  <template v-else-if="isLoading || isImporting">
    <div class="bg-surface-2 h-full w-full animate-pulse rounded-md p-6">
      <!-- --------------------------- Form Title --------------------------- -->
      <div class="mb-6">
        <div class="h-8 w-1/3 rounded-full bg-surface-300"></div>
        <div class="mt-2 h-6 w-1/4 rounded-full bg-surface-300"></div>
      </div>

      <!-- --------------------------- Form Fields --------------------------- -->
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <!-- Field 1 -->
        <div class="flex flex-col gap-2">
          <div class="h-4 w-1/4 rounded bg-surface-300"></div>
          <div class="h-10 w-full rounded bg-surface-300"></div>
        </div>

        <!-- Field 2 -->
        <div class="flex flex-col gap-2">
          <div class="h-4 w-1/3 rounded bg-surface-300"></div>
          <div class="h-10 w-full rounded bg-surface-300"></div>
        </div>

        <!-- Field 3 -->
        <div class="flex flex-col gap-2">
          <div class="h-4 w-1/5 rounded bg-surface-300"></div>
          <div class="h-10 w-full rounded bg-surface-300"></div>
        </div>

        <!-- Field 4 -->
        <div class="flex flex-col gap-2">
          <div class="h-4 w-1/3 rounded bg-surface-300"></div>
          <div class="h-10 w-full rounded bg-surface-300"></div>
        </div>
      </div>
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <!-- Field 1 -->
        <div class="flex flex-col gap-2">
          <div class="h-4 w-1/4 rounded bg-surface-300"></div>
          <div class="h-10 w-full rounded bg-surface-300"></div>
        </div>

        <!-- Field 2 -->
        <div class="flex flex-col gap-2">
          <div class="h-4 w-1/3 rounded bg-surface-300"></div>
          <div class="h-10 w-full rounded bg-surface-300"></div>
        </div>

        <!-- Field 3 -->
        <div class="flex flex-col gap-2">
          <div class="h-4 w-1/5 rounded bg-surface-300"></div>
          <div class="h-10 w-full rounded bg-surface-300"></div>
        </div>

        <!-- Field 4 -->
        <div class="flex flex-col gap-2">
          <div class="h-4 w-1/3 rounded bg-surface-300"></div>
          <div class="h-10 w-full rounded bg-surface-300"></div>
        </div>
      </div>

      <!-- --------------------------- Textarea --------------------------- -->
      <div class="mt-6 flex flex-col gap-2">
        <div class="h-4 w-1/6 rounded bg-surface-300"></div>
        <div class="h-24 w-full rounded bg-surface-300"></div>
      </div>
    </div>
  </template>
</template>
