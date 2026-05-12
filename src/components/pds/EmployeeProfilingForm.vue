<script setup lang="ts">
/** Vue Core */
import { reactive, ref, computed, watch, toRef, onMounted, onBeforeMount } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/** STATE MANAGEMENT (PINIA) */
import { storeToRefs } from 'pinia'
import { useProfilingStore, EmployeeProfilingPayload } from '@/stores/employee-profiling.store.ts'
import { useAuthStore } from '@/stores/auth.store.ts'
import { useAddressStore } from '@/stores/address.store.ts'
import { useLibrariesStore } from '@/stores/libraries.store.ts'

/** VALIDATION  */
import useVuelidate from '@vuelidate/core'
import { helpers, required, maxLength, email } from '@vuelidate/validators'
import { digitCountRule, mobilePhoneRule, uniqueUserIdentifierRule } from '@/utils/custom-validations'

/** COMPOSABLES / UTILITIES */
import { useFilterByParentId } from '@/composables/address.options.ts'
import { useWbAutoCompleteHandleTrueValue } from '@/composables/wb-ui-components.ts'
import { usePrependOrAppendOnce, isNotMoreThanYearsAgo, isAfterOrEqualFromDate, notInFuture } from '@/utils/helpers.js'
import { parseApiResponseError } from '@/utils/error-handle.ts'

/** TYPES / INTERFACES*/
import { IndividualEducBg, PersonnelResponse } from '@/typings/models.types'
import { SexTypeOptions, ExtensionTypeOptions } from '@/typings/employee-entry.types'
import { WbAutoCompleteOption, WbAutoCompleteOptionTrueValue } from '@/components/webkit/WbAutoComplete.vue'
import { isBeforeOrEqualTo } from '@/utils/employee-profiling-helpers.ts'

/** UI COMPONENTS*/
import WbInputText from '@/components/webkit/WbInputText.vue'
import WbCalendar from '@/components/webkit/WbCalendar.vue'
import WbDropdown from '@/components/webkit/WbDropdown.vue'
import WbInputMask from '@/components/webkit/WbInputMask.vue'
import WbAutoComplete from '@/components/webkit/WbAutoComplete.vue'
import Message from 'primevue/message'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import RadioButton from 'primevue/radiobutton'
import { useToast } from 'primevue/usetoast'

/** Headless UI */
import { TabGroup, TabPanels, TabPanel, TransitionRoot } from '@headlessui/vue'

/** Icons */
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const getId = usePrependOrAppendOnce('profiling-section-form')

const libraryStore = useLibrariesStore()
const profilingStore = useProfilingStore()
const authStore = useAuthStore()

const toast = useToast()
const router = useRouter()
const route = useRoute()

const currentlyEnrolledGraduate = ref(false)
const currentlyEnrolledVocational = ref(false)
const isSameResidential = ref(false)
const isLoading = ref(true)
const activeToasts = ref<number>(0)
const maxToasts = 5

const selectedOffice = ref<WbAutoCompleteOption | null>(null)
const selectedDivision = ref<WbAutoCompleteOption | null>(null)
const selectedSectionUnit = ref<WbAutoCompleteOption | null>(null)
const selectedCountry = ref<WbAutoCompleteOption | null>(null)

/** Payload */
const payload = reactive<EmployeeProfilingPayload>({
  ...profilingStore.ProfilingInfo,
})

/** Address Section **/
/** Address WbAutoComplete Object References */
const selectedResidentialRegion = ref<WbAutoCompleteOption | null>(null)
const selectedResidentialProvince = ref<WbAutoCompleteOption | null>(null)
const selectedResidentialCity = ref<WbAutoCompleteOption | null>(null)
const selectedResidentialBarangay = ref<WbAutoCompleteOption | null>(null)

/** Address WbAutoComplete Object References */
const selectedPermanentRegion = ref<WbAutoCompleteOption | null>(null)
const selectedPermanentProvince = ref<WbAutoCompleteOption | null>(null)
const selectedPermanentCity = ref<WbAutoCompleteOption | null>(null)
const selectedPermanentBarangay = ref<WbAutoCompleteOption | null>(null)

/** Initialize Address Options List */
const publicStore = useAddressStore()
const addressesAreLoading = ref(false)
const isProfilingLoading = ref(false)
const errorDetails = ref<string[]>([])
const formIsSubmitting = ref(false)
const showErrorAlert = ref(false)
const IsBeingUpdated = ref(false)
const profilingErrors = ref()
const isProfilingError = ref(false)
const errorMessage = ref()
onBeforeMount(async () => {
  addressesAreLoading.value = true

  // Load dropdowns and other reference data
  await Promise.allSettled([
    publicStore.fetchRegions(),
    publicStore.fetchProvinces(),
    publicStore.fetchCities(),
    publicStore.fetchBarangays(),
    libraryStore.fetchOffices(),
    libraryStore.fetchDivisions(),
    libraryStore.fetchSectionUnits(),
    libraryStore.fetchItems(),
  ])

  addressesAreLoading.value = false
})

const { provinceOptions, cityOptions, barangayOptions } = storeToRefs(publicStore)
const filteredResidentialProvinceOptionsByRegion = useFilterByParentId(
  toRef(payload.individual_address_init, 'residential_region_id'),
  provinceOptions
)
const filteredResidentialCityOptionsByProvince = useFilterByParentId(
  toRef(payload.individual_address_init, 'residential_province_id'),
  cityOptions
)
const filteredResidentialBarangayOptionsByCity = useFilterByParentId(
  toRef(payload.individual_address_init, 'residential_citymun_id'),
  barangayOptions
)

// PERMANENT ADDRESS FILTERS
const filteredPermanentProvinceOptionsByRegion = useFilterByParentId(
  toRef(payload.individual_address_init, 'permanent_region_id'),
  provinceOptions
)

const filteredPermanentCityOptionsByProvince = useFilterByParentId(
  toRef(payload.individual_address_init, 'permanent_province_id'),
  cityOptions
)

const filteredPermanentBarangayOptionsByCity = useFilterByParentId(
  toRef(payload.individual_address_init, 'permanent_citymun_id'),
  barangayOptions
)

// ═══════════════════════════════════════════
//            FORM RULES / VALIDATIONS
// ═══════════════════════════════════════════

/** Generate validation messages for form fields */
const generateMessage = (fieldName: string): { required: string; maxLength: string } => ({
  required: `Please enter your ${fieldName.replace(/_/g, ' ')}`,
  maxLength: `${fieldName.replace(/_/g, ' ')} cannot exceed the maximum length`,
})

/** Check if individual has dual citizenship */
const isDualCitizen = () => payload.individual.citizenship === 'Dual Citizenship'

/** Get global string max length from environment variables */
const globalStringMaxLength = import.meta.env.VITE_GLOBAL_STRING_MAX_LENGTH

/** Create validation rule for global max length constraint */
const globalStringMaxLengthRule = helpers.withMessage(
  `Must not exceed ${globalStringMaxLength} characters`,
  maxLength(globalStringMaxLength)
)

/** Generate validation messages for form fields */
const formRules = computed(() => ({
  $lazy: true,
  /** Personnel Information */
  employee: {
    agency_employee_no: {
      required: helpers.withMessage('agency employee no is required', required),
      maxLength: helpers.withMessage(() => generateMessage('agency_employee_no').maxLength, globalStringMaxLengthRule),
    },
  },
  individual: {
    first_name: {
      required: helpers.withMessage(() => generateMessage('first_name').required, required),
      maxLength: helpers.withMessage(() => generateMessage('first_name').maxLength, globalStringMaxLengthRule),
    },
    last_name: {
      required: helpers.withMessage(() => generateMessage('last_name').required, required),
      maxLength: helpers.withMessage(() => generateMessage('last_name').maxLength, globalStringMaxLengthRule),
    },
    middle_name: {
      maxLength: helpers.withMessage(() => generateMessage('middle_name').maxLength, globalStringMaxLengthRule),
    },
    ext_name: {
      maxLength: helpers.withMessage(() => generateMessage('ext_name').maxLength, globalStringMaxLengthRule),
    },
    birthday: {
      required: helpers.withMessage(() => generateMessage('birthday').required, required),
      maxLength: helpers.withMessage(() => generateMessage('birthday').maxLength, globalStringMaxLengthRule),
      isNotTooOld: helpers.withMessage('Birthdate cannot be more than 130 years ago', isNotMoreThanYearsAgo(130)),
      notInFuture: helpers.withMessage('Birthdate must not be in the future.', notInFuture),
    },
    sex: {
      in: helpers.withMessage('Select a valid sex option: male or female', required),
    },
    civil_status: {
      in: helpers.withMessage('Select a valid civil status from the list', required),
    },
    tin: {
      required: helpers.withMessage(() => generateMessage('tin').required, required),
      maxLength: helpers.withMessage(() => generateMessage('tin_no').maxLength, globalStringMaxLengthRule),
    },
    citizenship: {
      maxLength: helpers.withMessage(() => generateMessage('citizenship').maxLength, globalStringMaxLengthRule),
    },
    citizenship_acquisition: {
      required: helpers.withMessage(
        () => generateMessage('filipino_by').required,
        helpers.withMessage('requiredIfDual', (value: string) => !isDualCitizen() || (value !== null && value !== ''))
      ),
      maxLength: helpers.withMessage(() => generateMessage('citizenship_acquisition').maxLength, globalStringMaxLengthRule),
    },
    country_id: {
      required: helpers.withMessage(
        () => generateMessage('country').required,
        (value: number | null) => !isDualCitizen() || value !== null
      ),
    },
  },
  /** Personnel Contact Info */
  contact_info: {
    mobile_no: {
      required: helpers.withMessage(() => generateMessage('mobile_no').required, required),
      mobile_no: helpers.withMessage('Must be a valid PH mobile number', mobilePhoneRule()),
      unique: helpers.withAsync(
        helpers.withMessage('This mobile number is already taken', uniqueUserIdentifierRule('mobile_number'))
      ),
    },
    email_address: {
      required: helpers.withMessage('Please enter your email address', required),
      email: helpers.withMessage('Email format is invalid', email),
      unique: helpers.withAsync(helpers.withMessage('This email is already taken', uniqueUserIdentifierRule('email'))),
      maxLength: helpers.withMessage(() => generateMessage('email_address').maxLength, globalStringMaxLengthRule),
    },
  },
  /** Personnel Addresses */
  individual_address_init: {
    residential_house_block_lot_no: {
      maxLength: helpers.withMessage(
        () => generateMessage('residential_house_block_lot_no').maxLength,
        globalStringMaxLengthRule
      ),
    },
    residential_street: {
      maxLength: helpers.withMessage(() => generateMessage('residential_street').maxLength, globalStringMaxLengthRule),
    },
    residential_subdivision_village: {
      maxLength: helpers.withMessage(
        () => generateMessage('residential_subdivision_village').maxLength,
        globalStringMaxLengthRule
      ),
    },
    residential_brgy_id: {
      required: helpers.withMessage(() => generateMessage('residential_brgy').required, required),
    },
    residential_citymun_id: {
      required: helpers.withMessage(() => generateMessage('residential_citynum').required, required),
    },
    residential_province_id: {
      required: helpers.withMessage(() => generateMessage('residential_province').required, required),
    },
    residential_region_id: {
      required: helpers.withMessage(() => generateMessage('residential_region').required, required),
    },
    residential_zip_code: {
      required: helpers.withMessage(() => generateMessage('residential_zip_code').required, required),
      digitCount: helpers.withMessage('Enter a 5-digit zip code', digitCountRule(4)),
    },
    permanent_house_block_lot_no: {
      maxLength: helpers.withMessage(() => generateMessage('permanent_house_block_lot_no').maxLength, globalStringMaxLengthRule),
    },
    permanent_street: {
      maxLength: helpers.withMessage(() => generateMessage('permanent_street').maxLength, globalStringMaxLengthRule),
    },
    permanent_subdivision_village: {
      maxLength: helpers.withMessage(() => generateMessage('permanent_subdivision_village').maxLength, globalStringMaxLengthRule),
    },
    permanent_brgy_id: {
      required: helpers.withMessage(() => generateMessage('permanent_brgy_id').required, required),
    },
    permanent_citymun_id: {
      required: helpers.withMessage(() => generateMessage('permanent_citynum_id').required, required),
    },
    permanent_province_id: {
      required: helpers.withMessage(() => generateMessage('permanent_province_id').required, required),
    },
    permanent_region_id: {
      required: helpers.withMessage(() => generateMessage('permanent_region_id').required, required),
    },
    permanent_zip_code: {
      required: helpers.withMessage(() => generateMessage('permanent_zip_code').required, required),
      digitCount: helpers.withMessage('Enter a 5-digit zip code', digitCountRule(4)),
    },
  },
  /** Personnel Education */
  educations: {
    vocational: {
      schools_name: {
        maxLength: globalStringMaxLengthRule,
      },
      education_description: {
        maxLength: globalStringMaxLengthRule,
      },
      period_of_attendance_from: {
        maxLength: helpers.withMessage(() => generateMessage('elementary_from').maxLength, globalStringMaxLengthRule),
        isAfterOrEqualTo: helpers.withMessage(
          'Inclusive "From" date must not be after "To" date.',
          isBeforeOrEqualTo('period_of_attendance_to')
        ),
        notInFuture: helpers.withMessage('Date must not be in the future.', notInFuture),
      },
      period_of_attendance_to: {
        maxLength: helpers.withMessage(() => generateMessage('elementary_to').maxLength, globalStringMaxLengthRule),
        isAfterOrEqualTo: helpers.withMessage(
          'Inclusive "From" date must not be after "To" date.',
          isBeforeOrEqualTo('period_of_attendance_to')
        ),
        notInFuture: helpers.withMessage('Date must not be in the future.', notInFuture),
      },
      highest_level_units_earned: {
        maxLength: globalStringMaxLengthRule,
      },
      year_graduated: {
        maxLength: helpers.withMessage(() => generateMessage('year_graduated').maxLength, globalStringMaxLengthRule),
      },
      scholarship_academic_honors_received: {
        maxLength: globalStringMaxLengthRule,
      },
    },
    college: {
      schools_name: {
        required: helpers.withMessage(() => generateMessage('college_name').required, required),
        maxLength: globalStringMaxLengthRule,
      },
      education_description: {
        required: helpers.withMessage(() => generateMessage('college_basic_education_degree_course').required, required),
        maxLength: globalStringMaxLengthRule,
      },
      period_of_attendance_from: {
        required: helpers.withMessage(() => generateMessage('college_from').required, required),
        isAfterOrEqualTo: helpers.withMessage(
          'Inclusive "From" date must not be after "To" date.',
          isBeforeOrEqualTo('period_of_attendance_to')
        ),
        notInFuture: helpers.withMessage('Date must not be in the future.', notInFuture),
      },
      period_of_attendance_to: {
        required: helpers.withMessage(() => generateMessage('college_to').required, required),
        isAfterOrEqualTo: helpers.withMessage(
          'Inclusive "From" date must not be after "To" date.',
          isBeforeOrEqualTo('period_of_attendance_to')
        ),
        notInFuture: helpers.withMessage('Date must not be in the future.', notInFuture),
      },
      highest_level_units_earned: {
        maxLength: globalStringMaxLengthRule,
      },
      year_graduated: {
        required: helpers.withMessage(() => generateMessage('year_graduated').required, required),
      },
      scholarship_academic_honors_received: {
        maxLength: globalStringMaxLengthRule,
      },
    },
    graduate: {
      schools_name: {
        maxLength: globalStringMaxLengthRule,
      },
      education_description: {
        maxLength: globalStringMaxLengthRule,
      },
      period_of_attendance_from: {
        maxLength: helpers.withMessage(() => generateMessage('graduate_from').maxLength, globalStringMaxLengthRule),
        isAfterOrEqualTo: helpers.withMessage(
          'Inclusive "From" date must not be after "To" date.',
          isBeforeOrEqualTo('period_of_attendance_to')
        ),
        notInFuture: helpers.withMessage('Date must not be in the future.', notInFuture),
      },
      period_of_attendance_to: {
        maxLength: helpers.withMessage(() => generateMessage('graduate_to').maxLength, globalStringMaxLengthRule),
        isAfterOrEqualFromDate,
        notInFuture: helpers.withMessage('Date must not be in the future.', notInFuture),
      },
      highest_level_units_earned: {
        maxLength: globalStringMaxLengthRule,
      },
      year_graduated: {
        maxLength: helpers.withMessage(() => generateMessage('year_graduated').maxLength, globalStringMaxLengthRule),
      },
      scholarship_academic_honors_received: {
        maxLength: globalStringMaxLengthRule,
      },
    },
  },
}))

// ═══════════════════════════════════════════
//      WATCHERS FOR PERSONAL INFORMATION
// ═══════════════════════════════════════════

/** Clear ext_name on female selection */
watch(
  () => payload.individual.sex,
  (newSex) => {
    if (newSex === 'female') {
      payload.individual.ext_name = null
    }
  }
)

/** Reset citizenship fields based on selection */
watch(
  () => payload.individual.citizenship,
  (newValue) => {
    if (newValue === 'Filipino') {
      payload.individual.citizenship_acquisition = ''
      payload.individual.country_id = null
      selectedCountry.value = null
      payload.individual.citizenship_acquisition = ''
    } else if (newValue === 'Dual Citizenship') {
      payload.individual.citizenship_acquisition = ''
      selectedCountry.value = null
    }
  },
  { immediate: true }
)

// ═══════════════════════════════════════════
//      WATCHERS FOR RESIDENTIAL ADDRESS
// ═══════════════════════════════════════════

/** Watcher if Permanent Resident is same as Residential */
const validator = useVuelidate<EmployeeProfilingPayload>(formRules, payload)
watch(isSameResidential, (newVal) => {
  const v = validator.value
  if (newVal === true) {
    const residential = payload.individual_address_init

    // Trigger validation for all residential fields
    v.individual_address_init.residential_house_block_lot_no.$touch()
    v.individual_address_init.residential_street.$touch()
    v.individual_address_init.residential_subdivision_village.$touch()
    v.individual_address_init.residential_zip_code.$touch()
    v.individual_address_init.residential_brgy_id.$touch()
    v.individual_address_init.residential_citymun_id.$touch()
    v.individual_address_init.residential_province_id.$touch()
    v.individual_address_init.residential_region_id.$touch()

    selectedPermanentRegion.value = selectedResidentialRegion.value
    selectedPermanentProvince.value = selectedResidentialProvince.value
    selectedPermanentCity.value = selectedResidentialCity.value
    selectedPermanentBarangay.value = selectedResidentialBarangay.value
    payload.individual_address_init.permanent_house_block_lot_no = residential.residential_house_block_lot_no
    payload.individual_address_init.permanent_street = residential.residential_street
    payload.individual_address_init.permanent_subdivision_village = residential.residential_subdivision_village
    payload.individual_address_init.permanent_zip_code = residential.residential_zip_code
  } else {
    selectedPermanentRegion.value = null
    selectedPermanentProvince.value = null
    selectedPermanentCity.value = null
    selectedPermanentBarangay.value = null
    payload.individual_address_init.permanent_house_block_lot_no = null
    payload.individual_address_init.permanent_street = null
    payload.individual_address_init.permanent_subdivision_village = null
    payload.individual_address_init.permanent_zip_code = null
  }
})

/** Check if residential matches permanent address */
watch(
  () => payload.individual_address_init,
  (addr) => {
    const sameAddress =
      addr.residential_house_block_lot_no === addr.permanent_house_block_lot_no &&
      addr.residential_street === addr.permanent_street &&
      addr.residential_subdivision_village === addr.permanent_subdivision_village &&
      addr.residential_zip_code === addr.permanent_zip_code &&
      addr.residential_region_id === addr.permanent_region_id &&
      addr.residential_province_id === addr.permanent_province_id &&
      addr.residential_citymun_id === addr.permanent_citymun_id &&
      addr.residential_brgy_id === addr.permanent_brgy_id

    isSameResidential.value = sameAddress
  },
  { deep: true, immediate: true }
)

/** Check if residential fields are complete */
const isResidentialComplete = ref(false)
watch(
  () => payload.individual_address_init,
  (res) => {
    if (!res) return

    isResidentialComplete.value = Boolean(
      res.residential_brgy_id &&
        res.residential_citymun_id &&
        res.residential_province_id &&
        res.residential_region_id &&
        res.residential_zip_code
    )
  },
  { deep: true, immediate: true }
)

/** Sync region with store options */
watch(
  () => publicStore.regionOptions,
  (options) => {
    if (!selectedResidentialRegion.value && payload.individual_address_init.residential_region_id) {
      selectedResidentialRegion.value =
        options.find((opt) => opt.value === payload.individual_address_init.residential_region_id) ?? null
    }
  },
  { immediate: true }
)

/** Clear region selection on ID removal */
watch(
  () => payload.individual_address_init.residential_region_id,
  (newSelectedItem) => {
    if (!newSelectedItem) {
      selectedResidentialRegion.value = null
      return
    }
  }
)

/** Sync province with store options */
watch(
  () => publicStore.provinceOptions,
  (options) => {
    if (!selectedResidentialProvince.value && payload.individual_address_init.residential_province_id) {
      selectedResidentialProvince.value =
        options.find((opt) => opt.value === payload.individual_address_init.residential_province_id) ?? null
    }
  },
  { immediate: true }
)

/** Sync province selection with payload */
watch(
  () => selectedResidentialProvince.value,
  (newSelectedItem) => {
    if (!newSelectedItem) {
      selectedResidentialProvince.value = null
      payload.individual_address_init.residential_province_id = null
    } else {
      payload.individual_address_init.residential_province_id = newSelectedItem.value
    }
  }
)

/** Sync city with store options */
watch(
  () => publicStore.cityOptions,
  (options) => {
    if (!selectedResidentialCity.value && payload.individual_address_init.residential_citymun_id) {
      selectedResidentialCity.value =
        options.find((opt) => opt.value === payload.individual_address_init.residential_citymun_id) ?? null
    }
  },
  { immediate: true }
)

/** Sync city selection with payload */
watch(
  () => selectedResidentialCity.value,
  (newSelectedItem) => {
    if (!newSelectedItem) {
      selectedResidentialCity.value = null
      payload.individual_address_init.residential_citymun_id = null
    } else {
      payload.individual_address_init.residential_citymun_id = newSelectedItem.value
    }
  }
)

/** Sync barangay with store options */
watch(
  () => publicStore.barangayOptions,
  (options) => {
    if (!selectedResidentialBarangay.value && payload.individual_address_init.residential_brgy_id) {
      selectedResidentialBarangay.value =
        options.find((opt) => opt.value === payload.individual_address_init.residential_brgy_id) ?? null
    }
  },
  { immediate: true }
)

/** Sync barangay selection with payload */
watch(
  () => selectedResidentialBarangay.value,
  (newSelectedItem) => {
    if (!newSelectedItem) {
      selectedResidentialBarangay.value = null
      payload.individual_address_init.residential_brgy_id = null
    } else {
      payload.individual_address_init.residential_brgy_id = newSelectedItem.value
    }
  }
)

/** Format birthday to YYYY-MM-DD */
watch(
  () => payload.individual.birthday,
  (newBday) => {
    if (newBday) {
      const date = new Date(newBday)
      const mm = String(date.getMonth() + 1).padStart(2, '0')
      const dd = String(date.getDate()).padStart(2, '0')
      const yyyy = date.getFullYear()

      payload.individual.birthday = `${yyyy}-${mm}-${dd}`
    }
  }
)

// ═══════════════════════════════════════════
//      WATCHERS FOR PERMANENT ADDRESS
// ═══════════════════════════════════════════

/** Sync permanent region with store options */
watch(
  () => publicStore.regionOptions,
  (options) => {
    if (!selectedPermanentRegion.value && payload.individual_address_init.permanent_region_id) {
      selectedPermanentRegion.value =
        options.find((opt) => opt.value === payload.individual_address_init.permanent_region_id) ?? null
    }
  },
  { immediate: true }
)

/** Sync permanent region selection with payload */
watch(
  () => selectedPermanentRegion.value,
  (newSelectedItem) => {
    if (!newSelectedItem) {
      selectedPermanentRegion.value = null
      payload.individual_address_init.permanent_region_id = null
    } else {
      payload.individual_address_init.permanent_region_id = newSelectedItem.value
    }
  }
)

/** Sync permanent province with store options */
watch(
  () => publicStore.provinceOptions,
  (options) => {
    if (!selectedPermanentProvince.value && payload.individual_address_init.permanent_province_id) {
      selectedPermanentProvince.value =
        options.find((opt) => opt.value === payload.individual_address_init.permanent_province_id) ?? null
    }
  },
  { immediate: true }
)

/** Sync permanent province selection with payload */
watch(
  () => selectedPermanentProvince.value,
  (newSelectedItem) => {
    if (!newSelectedItem) {
      selectedPermanentProvince.value = null
      payload.individual_address_init.permanent_province_id = null
    } else {
      payload.individual_address_init.permanent_province_id = newSelectedItem.value
    }
  }
)

/** Sync permanent city with store options */
watch(
  () => publicStore.cityOptions,
  (options) => {
    if (!selectedPermanentCity.value && payload.individual_address_init.permanent_citymun_id) {
      selectedPermanentCity.value =
        options.find((opt) => opt.value === payload.individual_address_init.permanent_citymun_id) ?? null
    }
  },
  { immediate: true }
)

/** Sync permanent city selection with payload */
watch(
  () => selectedPermanentCity.value,
  (newSelectedItem) => {
    if (!newSelectedItem) {
      selectedPermanentCity.value = null
      payload.individual_address_init.permanent_citymun_id = null
    } else {
      payload.individual_address_init.permanent_citymun_id = newSelectedItem.value
    }
  }
)

/** Sync permanent barangay with store options */
watch(
  () => publicStore.barangayOptions,
  (options) => {
    if (!selectedPermanentBarangay.value && payload.individual_address_init.permanent_brgy_id) {
      selectedPermanentBarangay.value =
        options.find((opt) => opt.value === payload.individual_address_init.permanent_brgy_id) ?? null
    }
  },
  { immediate: true }
)

/** Sync permanent barangay selection with payload */
watch(
  () => selectedPermanentBarangay.value,
  (newSelectedItem) => {
    if (!newSelectedItem) {
      selectedPermanentBarangay.value = null
      payload.individual_address_init.permanent_brgy_id = null
    } else {
      payload.individual_address_init.permanent_brgy_id = newSelectedItem.value
    }
  }
)

/** Sync agency employee number with ID number field */
watch(
  () => payload.employee.agency_employee_no,
  (newAgencyNo) => {
    payload.employee.id_number = newAgencyNo ?? null
  },
  { immediate: true }
)

/** Sync office selection with dropdown options */
watch(
  () => payload.employee.office_id,
  (newSelectedOffice) => {
    if (!newSelectedOffice) {
      selectedOffice.value = null
      return
    }

    const existing = libraryStore.officeOptions.find((opt) => Number(opt.value) === Number(newSelectedOffice))

    if (existing) {
      selectedOffice.value = existing
    } else {
      const unwatch = watch(
        () => libraryStore.officeOptions,
        (options) => {
          const found = options.find((opt) => Number(opt.value) === Number(newSelectedOffice))
          if (found) {
            selectedOffice.value = found
            unwatch()
          }
        },
        { immediate: true }
      )
    }
  },
  { immediate: true }
)

/** Sync division selection with dropdown options */
watch(
  () => payload.employee.division_id,
  (newSelectedId) => {
    if (!newSelectedId) {
      selectedDivision.value = null
      return
    }

    const existing = libraryStore.divisionOptions.find((opt) => Number(opt.value) === Number(newSelectedId))
    if (existing) {
      selectedDivision.value = existing
    } else {
      const unwatch = watch(
        () => libraryStore.divisionOptions,
        (options) => {
          const found = options.find((opt) => Number(opt.value) === Number(newSelectedId))
          if (found) {
            selectedDivision.value = found
            unwatch()
          }
        },
        { immediate: true }
      )
    }
  },
  { immediate: true }
)

/** Sync section/unit selection with dropdown options */
watch(
  () => payload.employee.section_or_unit_id,
  (newSelectedSection) => {
    if (!newSelectedSection) {
      selectedSectionUnit.value = null
      return
    }

    const existing = libraryStore.sectionUnitOptions.find((opt) => Number(opt.value) === Number(newSelectedSection))

    if (existing) {
      selectedSectionUnit.value = existing
    } else {
      const unwatch = watch(
        () => libraryStore.sectionUnitOptions,
        (options) => {
          const found = options.find((opt) => Number(opt.value) === Number(newSelectedSection))
          if (found) {
            selectedSectionUnit.value = found
            unwatch()
          }
        },
        { immediate: true }
      )
    }
  },
  { immediate: true }
)

/** Auto-fill elementary graduation year with attendance end date */
watch(
  () => payload.educations.graduate.is_current_enrolled,
  (newVal) => {
    if (newVal) {
      currentlyEnrolledGraduate.value = newVal
    }
  }
)

/** Handle mutual exclusivity between graduate and vocational enrollment */
watch(currentlyEnrolledGraduate, (newVal) => {
  if (newVal) {
    currentlyEnrolledVocational.value = false
    payload.educations.vocational.is_current_enrolled = false
  }

  payload.educations.graduate.is_current_enrolled = newVal
  if (newVal) payload.educations.graduate.period_of_attendance_to = null
})

/** Sync vocational enrollment status with local state */
watch(
  () => payload.educations.vocational.is_current_enrolled,
  (newVal) => {
    if (newVal) {
      currentlyEnrolledVocational.value = newVal
    }
  }
)

/** Handle mutual exclusivity between vocational and graduate enrollment */
watch(currentlyEnrolledVocational, (newVal) => {
  if (newVal) {
    currentlyEnrolledGraduate.value = false
    payload.educations.graduate.is_current_enrolled = false
  }

  payload.educations.vocational.is_current_enrolled = newVal
  if (newVal) payload.educations.vocational.period_of_attendance_to = null
})

/**
 * Display a toast notification with rate limiting
 * @param severityPararm - Toast severity level (success, error, info, warn, etc.)
 * @param message - Main message to display
 * @param summaryParam - Detailed summary text
 */

// ══════════════════════════════════════════════════════
//      DISPLAY TOAST NOTIFICATION WITH RATE LIMITING
// ══════════════════════════════════════════════════════
const showToast = (
  severityPararm: 'success' | 'error' | 'info' | 'warn' | 'secondary' | 'contrast' | undefined,
  message: string,
  summaryParam: string
) => {
  if (activeToasts.value < maxToasts) {
    document.getElementsByClassName('views-create-document-page')[0]?.scrollIntoView({ behavior: 'smooth' })
    toast.add({
      summary: message,
      detail: summaryParam,
      severity: severityPararm,
      life: 5000,
    })
    activeToasts.value++

    setTimeout(() => {
      activeToasts.value--
    }, 10000)
  }
}

/** Reset the entire Profiling payload to default empty values when manual input mode is detected */
const resetProfilingPayload = () => {
  Object.assign(payload, {
    individual: {
      id: null,
      firstname: '',
      middlename: '',
      lastname: '',
      name_extension: '',
      birthdate: '',
      birthplace: '',
      sex: '',
      civil_status: '',
      height: '',
      weight: '',
      blood_type: '',
      gsis_id_no: '',
      pagibig_id_no: '',
      philhealth_no: '',
      sss_no: '',
      tin_no: '',
      citizenship: '',
      citizenship_by: '',
      dual_country: '',
      country_id: null,
    },

    employee: {
      id: null,
      position_id: null,
      employment_status_id: null,
      salary_grade_id: null,
      position: '',
      agency_employee_no: null,
    },

    educations: {
      elementary: {
        id: null,
        level: 'Elementary',
        name_of_school: '',
        basic_edu_degree_course: '',
        period_from: '',
        period_to: '',
        highest_level_units_earned: '',
        year_graduated: '',
        scholarship_academic_honors: '',
      },
      high_school: {
        id: null,
        level: 'Secondary',
        name_of_school: '',
        basic_edu_degree_course: '',
        period_from: '',
        period_to: '',
        highest_level_units_earned: '',
        year_graduated: '',
        scholarship_academic_honors: '',
      },
      vocational: {
        id: null,
        level: 'Vocational',
        name_of_school: '',
        basic_edu_degree_course: '',
        period_from: '',
        period_to: '',
        highest_level_units_earned: '',
        year_graduated: '',
        scholarship_academic_honors: '',
      },
      college: {
        id: null,
        level: 'College',
        name_of_school: '',
        basic_edu_degree_course: '',
        period_from: '',
        period_to: '',
        highest_level_units_earned: '',
        year_graduated: '',
        scholarship_academic_honors: '',
      },
      graduate: {
        id: null,
        level: 'Graduate',
        name_of_school: '',
        basic_edu_degree_course: '',
        period_from: '',
        period_to: '',
        highest_level_units_earned: '',
        year_graduated: '',
        scholarship_academic_honors: '',
      },
    },

    /** Force empty arrays so Vue detects change */
    contact_info: [
      {
        id: null,
        tel_no: null,
        mobile_no: null,
        email_address: null,
      },
    ],
    individual_family_children: [],

    individual_family_spouse: {
      id: null,
      class: 'Spouse',
      lastname: '',
      firstname: '',
      middlename: '',
      occupation: '',
      employer_business_name: '',
      business_address: '',
      telephone_no: '',
      _delete: null,
    },

    individual_family_father: {
      id: null,
      class: 'Father',
      lastname: '',
      firstname: '',
      middlename: '',
      _delete: null,
    },

    individual_family_mothers_maiden: {
      id: null,
      class: 'Mother',
      lastname: '',
      firstname: '',
      middlename: '',
      _delete: null,
    },

    individual_address_init: {
      id: null,
      residential_house_block_lot_no: null,
      residential_street: null,
      residential_subdivision_village: null,
      residential_brgy_id: null,
      residential_citymun_id: null,
      residential_province_id: null,
      residential_region_id: null,
      residential_zip_code: null,
      permanent_house_block_lot_no: null,
      permanent_street: null,
      permanent_subdivision_village: null,
      permanent_brgy_id: null,
      permanent_citymun_id: null,
      permanent_province_id: null,
      permanent_region_id: null,
      permanent_zip_code: null,
    },
  })

  /** Reset dropdown selections */
  selectedResidentialRegion.value = null
  selectedResidentialProvince.value = null
  selectedResidentialCity.value = null
  selectedResidentialBarangay.value = null
  selectedPermanentRegion.value = null
  selectedPermanentProvince.value = null
  selectedPermanentCity.value = null
  selectedPermanentBarangay.value = null
}

// ══════════════════════════════════════════════════════
//     PROFILING DETAILS FORM - FETCH EXISTING PROFILING BY ID & UPDATE PAYLOAD
// ══════════════════════════════════════════════════════
type profilingDetailsFormProps = {
  personnelProfiling?: PersonnelResponse
}
const formKey = ref(0)
const props = defineProps<profilingDetailsFormProps>()
onMounted(async () => {
  /********* Ensure Country Options are Loaded *********/
  if (!libraryStore.countryOptions.length) {
    console.log('→ Fetching country options before mounting...')
    await libraryStore.fetchCountry?.()
  }
  /*********Manual Input Mode*********/
  if (route.query.mode === 'via-manual-input') {
    console.info('Manual input detected on mount → resetting payload.')
    resetProfilingPayload()
    formKey.value++
    isLoading.value = false
    return
  }

  /*********Fetch Existing Profiling*********/
  isLoading.value = true
  const id = (route.params.id as string) || authStore.authenticatedUser?.user_profile?.individual_basic_detail_id
  const routeIsImport = route.query.mode === 'via-pds-importation'

  if (id && !routeIsImport) {
    const response = await profilingStore.fetchProfilingById(id)

    if (response && response.success) {
      const data = response.data as PersonnelResponse
      profilingStore.updateProfilingFromPersonnel(data)

      /*********Handle Citizenship Country Id*********/
      selectedCountry.value = libraryStore.countryOptions.find((r) => r.value === data.country_id) ?? null
      payload.individual.country_id = data.country_id
      console.log('→ Selected Country (after fetch):', selectedCountry.value)

      /*********Handle Educations*********/
      const educationsRaw = data.individual_educational_background
      const educationsArray: IndividualEducBg[] = Array.isArray(educationsRaw)
        ? educationsRaw
        : educationsRaw
          ? [educationsRaw]
          : []

      educationsArray.forEach((edu) => {
        switch (edu.level) {
          case 'Elementary':
            Object.assign(payload.educations.elementary, edu)
            break
          case 'Secondary':
            Object.assign(payload.educations.high_school, edu)
            break
          case 'Vocational':
            Object.assign(payload.educations.vocational, edu)
            break
          case 'College':
            Object.assign(payload.educations.college, edu)
            break
          case 'Graduate':
            Object.assign(payload.educations.graduate, edu)
            break
        }
      })

      /*********Contact & Address*********/
      payload.individual_contact_info = Array.isArray(data.individual_contact_info)
        ? [...data.individual_contact_info]
        : data.individual_contact_info
          ? [data.individual_contact_info]
          : []

      const addressRaw = data.individual_address
      if (addressRaw) {
        // Residential
        selectedResidentialRegion.value =
          publicStore.regionOptions.find((r) => r.value === addressRaw.residential_region_id) ?? null

        selectedResidentialProvince.value =
          publicStore.provinceOptions.find((p) => p.value === addressRaw.residential_province_id) ?? null
        selectedResidentialCity.value = publicStore.cityOptions.find((c) => c.value === addressRaw.residential_citymun_id) ?? null
        selectedResidentialBarangay.value =
          publicStore.barangayOptions.find((b) => b.value === addressRaw.residential_brgy_id) ?? null

        // Permanent
        selectedPermanentRegion.value = publicStore.regionOptions.find((r) => r.value === addressRaw.permanent_region_id) ?? null
        selectedPermanentProvince.value =
          publicStore.provinceOptions.find((p) => p.value === addressRaw.permanent_province_id) ?? null
        selectedPermanentCity.value = publicStore.cityOptions.find((c) => c.value === addressRaw.permanent_citymun_id) ?? null
        selectedPermanentBarangay.value =
          publicStore.barangayOptions.find((b) => b.value === addressRaw.permanent_brgy_id) ?? null
      }
    } else {
      console.warn('Failed to fetch Profiling by ID or response unsuccessful.')
    }
  }

  isLoading.value = false
})

/** Update Profiling  data when personnelProfiling prop changes */
watch(
  () => props.personnelProfiling,
  (newPersonnel) => {
    if (newPersonnel) {
      profilingStore.updateProfilingFromPersonnel(newPersonnel)
    } else {
      for (const key in payload.individual) {
        payload.individual[key as keyof typeof payload.individual] = null
      }
    }
  },
  { immediate: true }
)

/** Watcher Show the Country ID Label */
watch(
  () => payload.individual.country_id,
  async (newVal) => {
    if (newVal) {
      if (!libraryStore.countryOptions.length) {
        await libraryStore.fetchCountry?.()
      }

      const found = libraryStore.countryOptions.find((opt) => opt.value === newVal)
      selectedCountry.value = found || null
    } else {
      selectedCountry.value = null
    }
  },
  { immediate: true }
)

/** Calculate age based on birthdate */
const computeAge = computed(() => {
  const birthDate = payload.individual.birthday
  if (!birthDate) return ''

  const today = new Date()
  const birth = new Date(birthDate)

  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  // Adjust if the birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return age >= 0 ? age.toString() : '0'
})

/**************************************************
      Validations of C1 with Toast Message
***************************************************/
const validateForm = async () => {
  const valid = await validator.value.$validate()
  if (!valid) {
    const hasEmployeeError = validator.value.employee?.$error
    const hasIndividualError = validator.value.individual?.$error
    const hasContactInfoError = validator.value.contact_info?.$error
    const hasAddressError = validator.value.individual_address_init?.$error
    const hasEducationError = validator.value.educations?.$error

    const errorFields: string[] = []
    if (hasEmployeeError) errorFields.push('Employee Id')
    if (hasIndividualError) errorFields.push('Personal Identification')
    if (hasContactInfoError) errorFields.push('Contact Information')
    if (hasAddressError) errorFields.push('Address Information')
    if (hasEducationError) errorFields.push('Education Information')

    const sectionDescriptions: Record<string, string> = {
      'Employee Id': 'Employee Id Field',
      'Personal Identification': 'Personal Identification Section',
      'Contact Information': 'Contact Information Section',
      'Address Information': 'Address Information Section',
      'Education Information': 'Education Information Section',
    }

    if (errorFields.length > 0) {
      errorFields.forEach((field) => {
        const message = sectionDescriptions[field] ?? field
        showToast('error', 'Validation Error - Please check the following', message)
      })

      isProfilingLoading.value = false
      return { valid: false, errorTabs: ['C1'] }
    }
  }
  return { valid: true }
}

/**************************************************
             PROFILING - UPDATE SERVICE 
***************************************************/
const updateProfilingForm = async () => {
  IsBeingUpdated.value = true
  const id = profilingStore.isMyProfile
    ? authStore.authenticatedUser?.user_profile?.individual_basic_detail?.id?.toString() ?? 0
    : (route.params.id as string)

  formIsSubmitting.value = true

  /**Validation  */
  const validation = await validateForm()

  if (!validation.valid) {
    isProfilingLoading.value = false
    return
  }

  const educationsArray = [
    payload.educations.elementary,
    payload.educations.high_school,
    payload.educations.vocational,
    payload.educations.college,
    payload.educations.graduate,
  ].filter((edu) => edu.schools_name || edu.education_description)

  const requestPayload = {
    ...payload,
    individual_contact_info: [
      {
        id: payload.contact_info.id ?? null,
        tel_no: payload.contact_info.tel_no,
        mobile_no: payload.contact_info.mobile_no,
        email_address: payload.contact_info.email_address,
      },
    ],
    individual_address: [
      {
        id: payload.individual_address_init.id ?? null,
        residential_house_block_lot_no: payload.individual_address_init.residential_house_block_lot_no,
        residential_street: payload.individual_address_init.residential_street,
        residential_subdivision_village: payload.individual_address_init.residential_subdivision_village,
        residential_brgy_id: payload.individual_address_init.residential_brgy_id,
        residential_citymun_id: payload.individual_address_init.residential_citymun_id,
        residential_province_id: payload.individual_address_init.residential_province_id,
        residential_region_id: payload.individual_address_init.residential_region_id,
        residential_zip_code: payload.individual_address_init.residential_zip_code,
        permanent_house_block_lot_no: payload.individual_address_init.permanent_house_block_lot_no,
        permanent_street: payload.individual_address_init.permanent_street,
        permanent_subdivision_village: payload.individual_address_init.permanent_subdivision_village,
        permanent_brgy_id: payload.individual_address_init.permanent_brgy_id,
        permanent_citymun_id: payload.individual_address_init.permanent_citymun_id,
        permanent_province_id: payload.individual_address_init.permanent_province_id,
        permanent_region_id: payload.individual_address_init.permanent_region_id,
        permanent_zip_code: payload.individual_address_init.permanent_zip_code,
      },
    ],
    individual_educational_background: educationsArray,
  }

  const response = await profilingStore.updateProfiling(requestPayload, id, 'C1')

  if (!response.success) {
    const result = parseApiResponseError(response)
    if (!result) {
      formIsSubmitting.value = false
      return
    }

    showErrorAlert.value = true
    errorMessage.value = result.message
    errorDetails.value = result.errors
    IsBeingUpdated.value = false
    return { valid: false, errorTabs: ['C1'] }
  }
}
/**************************************************
            PROFILING - STORE SERVICE 
***************************************************/
const handleSaveProfilingForm = async () => {
  isProfilingLoading.value = true

  /**Validation  */
  const validation = await validateForm()

  if (!validation.valid) {
    isProfilingLoading.value = false
    return
  }

  /** Payload*/
  payload.individual_address = [{ ...payload.individual_address_init }]
  payload.individual_contact_info = [{ ...payload.contact_info }]

  payload.individual_educational_background = [
    { ...payload.educations.elementary },
    { ...payload.educations.high_school },
    { ...payload.educations.college },
  ]

  if (payload.educations.vocational.schools_name !== null) {
    payload.individual_educational_background.push({ ...payload.educations.vocational })
  }

  if (payload.educations.graduate.schools_name !== null) {
    payload.individual_educational_background.push({ ...payload.educations.graduate })
  }

  /** API Call*/
  const response = await profilingStore.saveProfiling(payload)

  if (!response?.success) {
    const result = parseApiResponseError(response)

    isProfilingError.value = true
    errorMessage.value = result?.message
    profilingErrors.value = result?.errors

    isProfilingLoading.value = false
    return
  }

  isProfilingLoading.value = false
  router.push({ name: 'employment' })
}

defineExpose({
  updateProfilingForm,
  validateForm,
})
</script>
<template>
  <template v-if="!isLoading">
    <div class="flex flex-row">
      <form @submit.prevent="" autocomplete="off" class="h-full w-full">
        <div class="w-full">
          <TabGroup>
            <TabPanels>
              <!-- START PERSONAL INFO SECTION -->
              <TabPanel :class="['my-8 md:mx-12 ', ' ring-white/60 focus:outline-none ']">
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
                    <div class=" ">
                      <transition
                        enter-active-class="transition duration-200"
                        enter-from-class="scale-50 opacity-0"
                        leave-to-class="opacity-0 "
                      >
                        <Message
                          v-if="isProfilingError"
                          :closable="false"
                          severity="error"
                          class="h-96 space-y-4 overflow-y-auto"
                        >
                          <span>{{ errorMessage }}</span>
                          <div class="text-md flex flex-col space-y-2">
                            <div v-for="error in profilingErrors" :key="error.field" class="mt-0.5">{{ '- ' + error }}</div>
                          </div>
                        </Message>
                      </transition>
                    </div>

                    <!-- START PERSONAL IDENTIFICATION -->
                    <span class="flex flex-col justify-center space-y-2 font-medium text-primary-700">
                      <p class="text-lg italic md:text-xl">Personal Identification</p>
                    </span>
                    <div class="mt-2 grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-2">
                      <WbInputText
                        v-model="payload.individual.last_name"
                        label="Last Name"
                        required
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        :readonly="profilingStore.isMyProfile"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :invalid="validator.individual.last_name.$invalid"
                        :invalid-text="validator.individual.last_name.$errors[0]?.$message"
                        @blur="validator.individual.last_name.$touch"
                      >
                      </WbInputText>

                      <WbInputText
                        v-model="payload.individual.first_name"
                        label="First Name"
                        required
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        :readonly="profilingStore.isMyProfile"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :invalid="validator.individual.first_name.$invalid"
                        :invalid-text="validator.individual.first_name.$errors[0]?.$message"
                        @blur="validator.individual.first_name.$touch"
                      >
                      </WbInputText>
                      <WbInputText
                        v-model="payload.individual.middle_name"
                        label="Middle Name"
                        :readonly="profilingStore.isMyProfile"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :invalid="validator.individual.middle_name.$invalid"
                        :invalid-text="validator.individual.middle_name.$errors[0]?.$message"
                        @blur="validator.individual.middle_name.$touch"
                      >
                      </WbInputText>
                      <WbDropdown
                        v-model="payload.individual.ext_name"
                        optionLabel="label"
                        optionValue="value"
                        :options="ExtensionTypeOptions"
                        :disabled="profilingStore.isMyProfile || payload.individual.sex === 'female'"
                        label="Extension Name"
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        :class="[
                          'lg:text-md lg:placeholder:text-md text-sm placeholder:text-sm',
                          payload.individual.sex === 'female' ? 'cursor-not-allowed bg-surface-200' : 'bg-surface-0',
                          profilingStore.isMyProfile ? 'cursor-not-allowed bg-surface-200' : '',
                        ]"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :invalid="validator.individual.ext_name.$invalid"
                        :invalid-text="validator.individual.ext_name.$errors[0]?.$message"
                        @blur="validator.individual.ext_name.$touch"
                      >
                      </WbDropdown>
                      <WbCalendar
                        v-model="payload.individual.birthday"
                        required
                        :readonly="profilingStore.isMyProfile"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
                        label="Date of Birth"
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        :invalid="validator.individual.birthday.$invalid"
                        :invalid-text="validator.individual.birthday.$errors[0]?.$message"
                        @blur="validator.individual.birthday.$touch"
                      >
                        <template #prepend-icon>
                          <i class="pi pi-gift" />
                        </template>
                      </WbCalendar>
                      <!-- Auto Compute Age -->
                      <WbInputText
                        v-model="computeAge"
                        label="Age"
                        required
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
                      >
                      </WbInputText>
                      <!-- Auto Compute Age -->
                      <WbDropdown
                        v-model="payload.individual.sex"
                        required
                        :options="SexTypeOptions"
                        optionLabel="label"
                        optionValue="value"
                        label="Sex"
                        :readonly="profilingStore.isMyProfile"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        :invalid="validator.individual.sex.$invalid"
                        :invalid-text="validator.individual.sex.$errors[0]?.$message"
                        @blur="validator.individual.sex.$touch"
                      >
                        <template #prepend-icon>
                          <FontAwesomeIcon icon="fa-solid fa-mars-and-venus" />
                        </template>
                      </WbDropdown>

                      <div class="flex flex-col gap-4">
                        <div class="flex flex-row space-x-2">
                          <h3 class="text-md text-surface-600 dark:lg:text-surface-200">Citizenship</h3>
                          <span class="text-red-500">*</span>
                        </div>
                        <div class="flex flex-row items-center justify-center gap-12 p-4 md:justify-start md:p-2">
                          <div class="flex items-center">
                            <RadioButton
                              v-model="payload.individual.citizenship"
                              :id="getId('input-citizenship-fil')"
                              name="citizenship"
                              value="Filipino"
                              :disabled="profilingStore.isMyProfile"
                            />
                            <label :for="getId('input-citizenship-fil')" class="ml-2 cursor-pointer">Filipino</label>
                          </div>
                          <div class="flex items-center">
                            <RadioButton
                              v-model="payload.individual.citizenship"
                              :id="getId('input-citizenship-dual')"
                              name="citizenship"
                              value="Dual Citizenship"
                              :disabled="profilingStore.isMyProfile"
                            />
                            <label :for="getId('input-citizenship-dual')" class="ml-2 cursor-pointer">Dual Citizen</label>
                          </div>
                        </div>
                      </div>

                      <WbDropdown
                        v-model="payload.individual.civil_status"
                        required
                        :options="libraryStore.civilStatusOptions"
                        optionLabel="label"
                        optionValue="value"
                        label="Civil Status"
                        :readonly="profilingStore.isMyProfile"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        :invalid="validator.individual.civil_status.$invalid"
                        :invalid-text="validator.individual.civil_status.$errors[0]?.$message"
                        @blur="validator.individual.civil_status.$touch"
                      >
                        <template #prepend-icon>
                          <FontAwesomeIcon icon="fa-solid fa-people-arrows" />
                        </template>
                      </WbDropdown>
                      <div
                        v-if="payload.individual.citizenship === 'Dual Citizenship'"
                        class="flex flex-col gap-4 md:flex-row md:gap-6"
                      >
                        <!-- Citizen Type by dropdown -->
                        <WbDropdown
                          v-model="payload.individual.citizenship_acquisition"
                          required
                          :options="libraryStore.citizenshipAcquisitionOptions"
                          optionLabel="label"
                          optionValue="value"
                          label="Dual Citizen by"
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          :readonly="profilingStore.isMyProfile"
                          class="flex-1"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                          ]"
                          :invalid="validator.individual.citizenship_acquisition.$invalid"
                          :invalid-text="validator.individual.citizenship_acquisition.$errors[0]?.$message"
                          @blur="validator.individual.citizenship_acquisition.$touch"
                        >
                          <template #prepend-icon>
                            <FontAwesomeIcon icon="fa-solid fa-house-flag" />
                          </template>
                        </WbDropdown>

                        <!-- If Dual Citizen, give details (country) -->
                        <WbAutoComplete
                          :useApiFilter="true"
                          :apiEndpoint="'/libraries/countries/search'"
                          :suggestions="libraryStore.countryOptions"
                          :loading="libraryStore.countryOptionsLoading"
                          apiOptionLabel="country_code"
                          label="If Dual Citizen, Please indicate country:"
                          :readonly="profilingStore.isMyProfile"
                          placeholder="Type the Country"
                          v-model="selectedCountry"
                          :id="getId('input-country')"
                          optionLabel="label"
                          optionValue="value"
                          required
                          forceSelection
                          @on-true-value-computed="
                            (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                              useWbAutoCompleteHandleTrueValue(value, toRef(payload.individual, 'country_id'))
                          "
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          class="flex-1"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                            profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                          ]"
                          :invalid="validator.individual.country_id.$invalid"
                          :invalid-text="validator.individual.country_id.$errors[0]?.$message"
                          @blur="validator.individual.country_id.$touch"
                        />
                      </div>

                      <WbInputText
                        v-model="payload.individual.tin"
                        required
                        label="TIN"
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :readonly="profilingStore.isMyProfile"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
                        :invalid="validator.individual.tin.$invalid"
                        :invalid-text="validator.individual.tin.$errors[0]?.$message"
                        @blur="validator.individual.tin.$touch"
                      >
                      </WbInputText>
                      <WbInputText
                        v-model="payload.employee.agency_employee_no"
                        required
                        label="Agency Employee No."
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :readonly="profilingStore.isMyProfile"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
                        :invalid="validator.employee.agency_employee_no.$invalid"
                        :invalid-text="validator.employee.agency_employee_no.$errors[0]?.$message"
                        @blur="validator.employee.agency_employee_no.$touch"
                      >
                      </WbInputText>
                    </div>
                    <!-- END PERSONAL INFO -->

                    <!-- START RESIDENTIAL ADDRESS -->
                    <div class="mt-2">
                      <span class="flex flex-col justify-center space-y-2 font-medium text-primary-700">
                        <p class="text-lg italic md:text-xl">Address Information</p>
                        <p class="ml-4 text-lg italic md:text-xl">Residential Address</p>
                      </span>

                      <div class="ml-4 mt-4 grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-2">
                        <WbAutoComplete
                          v-model="selectedResidentialRegion"
                          :suggestions="publicStore.regionOptions"
                          label=" Region "
                          :readonly="profilingStore.isMyProfile"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                          ]"
                          required
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          optionLabel="label"
                          :placeholder="'Select or Type your Region'"
                          forceSelection
                          @on-true-value-computed="
                            (value: WbAutoCompleteOptionTrueValue) =>
                              useWbAutoCompleteHandleTrueValue(
                                value,
                                toRef(payload.individual_address_init, 'residential_region_id')
                              )
                          "
                          :loading="publicStore.regionOptionsIsLoading"
                          dropdown
                          dropdownClass="bg-transparent"
                          :invalid="validator.individual_address_init.residential_region_id.$invalid"
                          :invalid-text="validator.individual_address_init.residential_region_id.$errors[0]?.$message"
                          @blur="validator.individual_address_init.residential_region_id.$touch"
                          @focusin="validator.individual_address_init.residential_region_id.$dirty = false"
                        >
                        </WbAutoComplete>

                        <WbAutoComplete
                          v-model="selectedResidentialProvince"
                          :suggestions="filteredResidentialProvinceOptionsByRegion"
                          label=" Province "
                          :readonly="profilingStore.isMyProfile"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                          ]"
                          required
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          optionLabel="label"
                          :placeholder="'Select or Type your Province'"
                          forceSelection
                          @on-true-value-computed="
                            (value: WbAutoCompleteOptionTrueValue) =>
                              useWbAutoCompleteHandleTrueValue(
                                value,
                                toRef(payload.individual_address_init, 'residential_province_id')
                              )
                          "
                          :loading="publicStore.provinceOptionsIsLoading"
                          dropdown
                          dropdownClass="bg-transparent"
                          :invalid="validator.individual_address_init.residential_province_id.$invalid"
                          :invalid-text="validator.individual_address_init.residential_province_id.$errors[0]?.$message"
                          @blur="validator.individual_address_init.residential_province_id.$touch"
                          @focusin="validator.individual_address_init.residential_province_id.$dirty = false"
                        >
                        </WbAutoComplete>
                        <WbAutoComplete
                          v-model="selectedResidentialCity"
                          :suggestions="filteredResidentialCityOptionsByProvince"
                          label=" City / Municipality "
                          :readonly="profilingStore.isMyProfile"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                          ]"
                          required
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          optionLabel="label"
                          :placeholder="'Select or Type your City/Municipality'"
                          forceSelection
                          @on-true-value-computed="
                            (value: WbAutoCompleteOptionTrueValue) =>
                              useWbAutoCompleteHandleTrueValue(
                                value,
                                toRef(payload.individual_address_init, 'residential_citymun_id')
                              )
                          "
                          :loading="publicStore.cityOptionsIsLoading"
                          :virtualScrollerOptions="{ itemSize: 38 }"
                          dropdown
                          dropdownClass="bg-transparent"
                          :invalid="validator.individual_address_init.residential_citymun_id.$invalid"
                          :invalid-text="validator.individual_address_init.residential_citymun_id.$errors[0]?.$message"
                          @blur="validator.individual_address_init.residential_citymun_id.$touch"
                          @focusin="validator.individual_address_init.residential_citymun_id.$dirty = false"
                        >
                        </WbAutoComplete>
                        <WbAutoComplete
                          v-model="selectedResidentialBarangay"
                          :suggestions="filteredResidentialBarangayOptionsByCity"
                          label=" Barangay "
                          :readonly="profilingStore.isMyProfile"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                          ]"
                          required
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          optionLabel="label"
                          :placeholder="'Select your Barangay'"
                          forceSelection
                          @on-true-value-computed="
                            (value: WbAutoCompleteOptionTrueValue) =>
                              useWbAutoCompleteHandleTrueValue(
                                value,
                                toRef(payload.individual_address_init, 'residential_brgy_id')
                              )
                          "
                          :loading="publicStore.barangayOptionsIsLoading"
                          :virtualScrollerOptions="{ itemSize: 38 }"
                          dropdown
                          dropdownClass="bg-transparent"
                          :invalid="validator.individual_address_init.residential_brgy_id.$invalid"
                          :invalid-text="validator.individual_address_init.residential_brgy_id.$errors[0]?.$message"
                          @blur="validator.individual_address_init.residential_brgy_id.$touch"
                          @focusin="validator.individual_address_init.residential_brgy_id.$dirty = false"
                        >
                        </WbAutoComplete>
                        <WbInputText
                          v-model="payload.individual_address_init.residential_subdivision_village"
                          label="Subdivision / Village"
                          :readonly="profilingStore.isMyProfile"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                          ]"
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :invalid="validator.individual_address_init.residential_subdivision_village.$invalid"
                          :invalid-text="validator.individual_address_init.residential_subdivision_village.$errors[0]?.$message"
                          @blur="validator.individual_address_init.residential_subdivision_village.$touch"
                        >
                        </WbInputText>
                        <WbInputText
                          v-model="payload.individual_address_init.residential_street"
                          label="Street"
                          :readonly="profilingStore.isMyProfile"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                          ]"
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :invalid="validator.individual_address_init.residential_street.$invalid"
                          :invalid-text="validator.individual_address_init.residential_street.$errors[0]?.$message"
                          @blur="validator.individual_address_init.residential_street.$touch"
                        >
                        </WbInputText>
                        <WbInputText
                          v-model="payload.individual_address_init.residential_house_block_lot_no"
                          label="House / Block / Lot No."
                          :readonly="profilingStore.isMyProfile"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                          ]"
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :invalid="validator.individual_address_init.residential_house_block_lot_no.$invalid"
                          :invalid-text="validator.individual_address_init.residential_house_block_lot_no.$errors[0]?.$message"
                          @blur="validator.individual_address_init.residential_house_block_lot_no.$touch"
                        >
                        </WbInputText>
                        <WbInputText
                          v-model="payload.individual_address_init.residential_zip_code"
                          required
                          :readonly="profilingStore.isMyProfile"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                          ]"
                          label="ZIP Code"
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :invalid="validator.individual_address_init.residential_zip_code.$invalid"
                          :invalid-text="validator.individual_address_init.residential_zip_code.$errors[0]?.$message"
                          @blur="validator.individual_address_init.residential_zip_code.$touch"
                        >
                        </WbInputText>
                      </div>
                    </div>
                    <!-- END RESIDENTIAL ADDRESS -->

                    <!-- START PERMANENT ADDRESS -->
                    <div class="mt-2">
                      <span class="flex flex-col justify-center space-y-2 font-medium text-primary-700">
                        <p class="ml-4 text-lg italic md:text-xl">Permanent Address</p>
                      </span>

                      <div class="ml-4 mt-4 grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-2">
                        <div class="col-span-2 my-4 ml-4">
                          <div class="align-items-center flex items-center">
                            <Checkbox
                              :disabled="profilingStore.isMyProfile || !isResidentialComplete"
                              v-model="isSameResidential"
                              :id="getId('input-same-residential')"
                              :inputId="getId('input-same-residential')"
                              name="sameResidential"
                              :binary="true"
                            />
                            <label :for="getId('input-same-residential')" class="ml-2 text-surface-600">
                              My permanent address is the same with residential address
                            </label>
                          </div>
                          <small v-if="!isResidentialComplete" class="ml-6 text-error-500">
                            Please complete your residential address before enabling this option.
                          </small>
                        </div>
                        <WbAutoComplete
                          v-model="selectedPermanentRegion"
                          :suggestions="publicStore.regionOptions"
                          label=" Region "
                          required
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          optionLabel="label"
                          :readonly="profilingStore.isMyProfile || isSameResidential"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            profilingStore.isMyProfile || isSameResidential
                              ? 'pointer-events-none cursor-default select-text'
                              : '',
                          ]"
                          :placeholder="'Select or Type your Region'"
                          forceSelection
                          @on-true-value-computed="
                            (value: WbAutoCompleteOptionTrueValue) =>
                              useWbAutoCompleteHandleTrueValue(
                                value,
                                toRef(payload.individual_address_init, 'permanent_region_id')
                              )
                          "
                          :loading="publicStore.regionOptionsIsLoading"
                          dropdown
                          dropdownClass="bg-transparent"
                        >
                        </WbAutoComplete>
                        <WbAutoComplete
                          v-model="selectedPermanentProvince"
                          :suggestions="filteredPermanentProvinceOptionsByRegion"
                          label=" Province "
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          optionLabel="label"
                          :readonly="profilingStore.isMyProfile || isSameResidential"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            profilingStore.isMyProfile || isSameResidential
                              ? 'pointer-events-none cursor-default select-text'
                              : '',
                          ]"
                          :placeholder="'Select or Type your Province'"
                          forceSelection
                          @on-true-value-computed="
                            (value: WbAutoCompleteOptionTrueValue) =>
                              useWbAutoCompleteHandleTrueValue(
                                value,
                                toRef(payload.individual_address_init, 'permanent_province_id')
                              )
                          "
                          :loading="publicStore.provinceOptionsIsLoading"
                          dropdown
                          dropdownClass="bg-transparent"
                        >
                        </WbAutoComplete>
                        <WbAutoComplete
                          v-model="selectedPermanentCity"
                          :suggestions="filteredPermanentCityOptionsByProvince"
                          label=" City / Municipality "
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          optionLabel="label"
                          :readonly="profilingStore.isMyProfile || isSameResidential"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            profilingStore.isMyProfile || isSameResidential
                              ? 'pointer-events-none cursor-default select-text'
                              : '',
                          ]"
                          :placeholder="'Select or Type your City/Municipality'"
                          forceSelection
                          @on-true-value-computed="
                            (value: WbAutoCompleteOptionTrueValue) =>
                              useWbAutoCompleteHandleTrueValue(
                                value,
                                toRef(payload.individual_address_init, 'permanent_citymun_id')
                              )
                          "
                          :loading="publicStore.cityOptionsIsLoading"
                          :virtualScrollerOptions="{ itemSize: 38 }"
                          dropdown
                          dropdownClass="bg-transparent"
                        >
                        </WbAutoComplete>
                        <WbAutoComplete
                          v-model="selectedPermanentBarangay"
                          :suggestions="filteredPermanentBarangayOptionsByCity"
                          label=" Barangay "
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          optionLabel="label"
                          :readonly="profilingStore.isMyProfile || isSameResidential"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            profilingStore.isMyProfile || isSameResidential
                              ? 'pointer-events-none cursor-default select-text'
                              : '',
                          ]"
                          :placeholder="'Select your Barangay'"
                          forceSelection
                          @on-true-value-computed="
                            (value: WbAutoCompleteOptionTrueValue) =>
                              useWbAutoCompleteHandleTrueValue(value, toRef(payload.individual_address_init, 'permanent_brgy_id'))
                          "
                          :loading="publicStore.barangayOptionsIsLoading"
                          :virtualScrollerOptions="{ itemSize: 38 }"
                          dropdown
                          dropdownClass="bg-transparent"
                        >
                        </WbAutoComplete>
                        <WbInputText
                          v-model="payload.individual_address_init.permanent_subdivision_village"
                          label="Subdivision / Village"
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :readonly="profilingStore.isMyProfile || isSameResidential"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            profilingStore.isMyProfile || isSameResidential
                              ? 'pointer-events-none cursor-default select-text'
                              : '',
                          ]"
                          :invalid="validator.individual_address_init.permanent_subdivision_village.$invalid"
                          :invalid-text="validator.individual_address_init.permanent_subdivision_village.$errors[0]?.$message"
                          @blur="validator.individual_address_init.permanent_subdivision_village.$touch"
                        >
                        </WbInputText>
                        <WbInputText
                          v-model="payload.individual_address_init.permanent_street"
                          label="Street"
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :readonly="profilingStore.isMyProfile || isSameResidential"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            profilingStore.isMyProfile || isSameResidential
                              ? 'pointer-events-none cursor-default select-text'
                              : '',
                          ]"
                          :invalid="validator.individual_address_init.permanent_street.$invalid"
                          :invalid-text="validator.individual_address_init.permanent_street.$errors[0]?.$message"
                          @blur="validator.individual_address_init.permanent_street.$touch"
                        >
                        </WbInputText>
                        <WbInputText
                          v-model="payload.individual_address_init.permanent_house_block_lot_no"
                          label="House / Block / Lot No."
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :readonly="profilingStore.isMyProfile || isSameResidential"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            profilingStore.isMyProfile || isSameResidential
                              ? 'pointer-events-none cursor-default select-text'
                              : '',
                          ]"
                          :invalid="validator.individual_address_init.permanent_house_block_lot_no.$invalid"
                          :invalid-text="validator.individual_address_init.permanent_house_block_lot_no.$errors[0]?.$message"
                          @blur="validator.individual_address_init.permanent_house_block_lot_no.$touch"
                        >
                        </WbInputText>
                        <WbInputText
                          v-model="payload.individual_address_init.permanent_zip_code"
                          required
                          label="ZIP Code"
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :readonly="profilingStore.isMyProfile || isSameResidential"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            profilingStore.isMyProfile || isSameResidential
                              ? 'pointer-events-none cursor-default select-text'
                              : '',
                          ]"
                          :invalid="validator.individual_address_init.permanent_zip_code.$invalid"
                          :invalid-text="validator.individual_address_init.permanent_zip_code.$errors[0]?.$message"
                          @blur="validator.individual_address_init.permanent_zip_code.$touch"
                        >
                        </WbInputText>
                      </div>
                    </div>
                    <!-- END PERMANENT ADDRESS -->

                    <!-- START CONTACT INFORMATION -->
                    <div class="mt-2">
                      <span class="flex flex-col justify-center space-y-2 font-medium text-primary-700">
                        <p class="ml-4 text-lg italic md:text-xl">Contact Information</p>
                      </span>

                      <div class="ml-4 mt-4 grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-2">
                        <WbInputMask
                          v-model="payload.contact_info.mobile_no"
                          required
                          label="Mobile Number"
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          mask="+639999999999"
                          placeholder="+63 XXX XXX XXXX"
                          :readonly="profilingStore.isMyProfile"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                          ]"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :invalid="validator.contact_info.mobile_no.$invalid"
                          :invalid-text="validator.contact_info.mobile_no.$errors[0]?.$message"
                          @blur="validator.contact_info.mobile_no.$touch"
                          @focusin="validator.contact_info.mobile_no.$dirty = false"
                        >
                          <template #prepend-icon>
                            <FontAwesomeIcon icon="fa-solid fa-mobile" />
                          </template>
                        </WbInputMask>

                        <WbInputText
                          v-model="payload.contact_info.email_address"
                          required
                          label="Email Address"
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :readonly="profilingStore.isMyProfile"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                          ]"
                          :invalid="validator.contact_info.email_address.$invalid"
                          :invalid-text="validator.contact_info.email_address.$errors[0]?.$message"
                          @blur="validator.contact_info.email_address.$touch"
                        >
                          <template #prepend-icon>
                            <FontAwesomeIcon icon="fa-solid fa-square-envelope" />
                          </template>
                        </WbInputText>
                      </div>
                    </div>
                    <!-- END CONTACT INFORMATION -->

                    <!-- START SECTORAL AFFILIATIONS -->
                    <div class="mt-2">
                      <span class="flex flex-col justify-center space-y-2 font-medium text-primary-700">
                        <p class="ml-4 text-lg italic md:text-xl">Sectoral Affiliations</p>
                      </span>

                      <div class="ml-4 mt-4 grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-2">
                        <div class="flex flex-col gap-2 p-4">
                          <p class="text-base font-medium text-surface-600">Solo Parent</p>

                          <div class="flex flex-row items-center gap-24">
                            <div class="flex items-center">
                              <RadioButton
                                :id="getId('input-question-q40_c_solo_parent-yes')"
                                :readonly="profilingStore.isMyProfile"
                                name="q40_c_solo_parent"
                                :value="true"
                                :class="[
                                  ' ml-12 scale-150 transform',
                                  profilingStore.isMyProfile ? 'pointer-events-none cursor-default' : '',
                                ]"
                              />
                              <label
                                :for="getId('input-question-q40_c_solo_parent-yes')"
                                class="ml-3 cursor-pointer text-surface-600"
                                >Yes</label
                              >
                            </div>

                            <div class="flex items-center">
                              <RadioButton
                                :id="getId('input-question-q40_c_solo_parent-no')"
                                :readonly="profilingStore.isMyProfile"
                                name="q40_c_solo_parent"
                                :value="false"
                                :class="[
                                  ' ml-24 scale-150 transform',
                                  profilingStore.isMyProfile ? 'pointer-events-none cursor-default' : '',
                                ]"
                              />
                              <label
                                :for="getId('input-question-q40_c_solo_parent-no')"
                                class="ml-4 cursor-pointer text-surface-600"
                                >No</label
                              >
                            </div>
                          </div>
                        </div>
                        <div class="flex flex-col gap-2 p-4">
                          <p class="text-base font-medium text-surface-600">Senior Citizen</p>

                          <div class="flex flex-row items-center gap-24">
                            <div class="flex items-center">
                              <RadioButton
                                :id="getId('input-question-q40_c_solo_parent-yes')"
                                :readonly="profilingStore.isMyProfile"
                                name="q40_c_solo_parent"
                                :value="true"
                                :class="[
                                  ' ml-12 scale-150 transform',
                                  profilingStore.isMyProfile ? 'pointer-events-none cursor-default' : '',
                                ]"
                              />
                              <label
                                :for="getId('input-question-q40_c_solo_parent-yes')"
                                class="ml-3 cursor-pointer text-surface-600"
                                >Yes</label
                              >
                            </div>

                            <div class="flex items-center">
                              <RadioButton
                                :id="getId('input-question-q40_c_solo_parent-no')"
                                :readonly="profilingStore.isMyProfile"
                                name="q40_c_solo_parent"
                                :value="false"
                                :class="[
                                  ' ml-24 scale-150 transform',
                                  profilingStore.isMyProfile ? 'pointer-events-none cursor-default' : '',
                                ]"
                              />
                              <label
                                :for="getId('input-question-q40_c_solo_parent-no')"
                                class="ml-4 cursor-pointer text-surface-600"
                                >No</label
                              >
                            </div>
                          </div>
                        </div>
                        <div class="flex flex-col gap-2 p-4">
                          <p class="text-base font-medium text-surface-600">Person with Disability</p>

                          <div class="flex flex-row items-center gap-24">
                            <div class="flex items-center">
                              <RadioButton
                                :id="getId('input-question-q40_c_solo_parent-yes')"
                                :readonly="profilingStore.isMyProfile"
                                name="q40_c_solo_parent"
                                :value="true"
                                :class="[
                                  ' ml-12 scale-150 transform',
                                  profilingStore.isMyProfile ? 'pointer-events-none cursor-default' : '',
                                ]"
                              />
                              <label
                                :for="getId('input-question-q40_c_solo_parent-yes')"
                                class="ml-3 cursor-pointer text-surface-600"
                                >Yes</label
                              >
                            </div>

                            <div class="flex items-center">
                              <RadioButton
                                :id="getId('input-question-q40_c_solo_parent-no')"
                                :readonly="profilingStore.isMyProfile"
                                name="q40_c_solo_parent"
                                :value="false"
                                :class="[
                                  ' ml-24 scale-150 transform',
                                  profilingStore.isMyProfile ? 'pointer-events-none cursor-default' : '',
                                ]"
                              />
                              <label
                                :for="getId('input-question-q40_c_solo_parent-no')"
                                class="ml-4 cursor-pointer text-surface-600"
                                >No</label
                              >
                            </div>
                          </div>
                        </div>
                        <div class="flex flex-col gap-2 p-4">
                          <p class="text-base font-medium text-surface-600">Member of Indigenous Group</p>

                          <div class="flex flex-row items-center gap-24">
                            <div class="flex items-center">
                              <RadioButton
                                :id="getId('input-question-q40_c_solo_parent-yes')"
                                :readonly="profilingStore.isMyProfile"
                                name="q40_c_solo_parent"
                                :value="true"
                                :class="[
                                  ' ml-12 scale-150 transform',
                                  profilingStore.isMyProfile ? 'pointer-events-none cursor-default' : '',
                                ]"
                              />
                              <label
                                :for="getId('input-question-q40_c_solo_parent-yes')"
                                class="ml-3 cursor-pointer text-surface-600"
                                >Yes</label
                              >
                            </div>

                            <div class="flex items-center">
                              <RadioButton
                                :id="getId('input-question-q40_c_solo_parent-no')"
                                :readonly="profilingStore.isMyProfile"
                                name="q40_c_solo_parent"
                                :value="false"
                                :class="[
                                  ' ml-24 scale-150 transform',
                                  profilingStore.isMyProfile ? 'pointer-events-none cursor-default' : '',
                                ]"
                              />
                              <label
                                :for="getId('input-question-q40_c_solo_parent-no')"
                                class="ml-4 cursor-pointer text-surface-600"
                                >No</label
                              >
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <!-- END SECTORAL AFFILIATIONS -->

                    <!-- START EDUCATION INFORMATION -->
                    <div class="mt-2">
                      <span class="flex flex-col justify-center space-y-2 font-medium text-primary-700">
                        <p class="ml-4 text-lg italic md:text-xl">Education Information</p>
                      </span>
                      <div class="ml-4 mt-4 grid grid-cols-1 gap-x-12 gap-y-4">
                        <!-- START VOCATINOAL -->
                        <span class="mt-4 flex flex-col justify-center space-y-2 font-medium text-primary-700">
                          <p class="text-lg italic md:text-xl">Vocational / Trade Course</p>
                        </span>
                        <div v-if="!currentlyEnrolledGraduate && !profilingStore.isMyProfile" class="col-span-2 my-4 ml-4">
                          <div class="align-items-center flex items-center">
                            <Checkbox
                              :readonly="profilingStore.isMyProfile"
                              v-model="currentlyEnrolledVocational"
                              :id="getId('input-currently-enrolled-vocational')"
                              name="currentlyEnrolledVocational"
                              :binary="true"
                            />
                            <label :for="getId('input-currently-enrolled-vocational')" class="ml-2 text-surface-600">
                              I am currently Enrolled in this School
                            </label>
                          </div>
                        </div>
                        <div class="flex flex-col gap-x-12 gap-y-4">
                          <div class="flex w-full flex-col gap-x-12 gap-y-4 md:flex-row">
                            <WbInputText
                              v-model="payload.educations.vocational.schools_name"
                              label="Name of School"
                              :readonly="profilingStore.isMyProfile"
                              :class="[
                                'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                              ]"
                              label-class="text-md text-surface-600 dark:lg:text-surface-200"
                              validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                              :invalid="validator.educations.vocational.schools_name.$invalid"
                              :invalid-text="validator.educations.vocational.schools_name.$errors[0]?.$message"
                              @blur="validator.educations.vocational.schools_name.$touch"
                            />

                            <WbInputText
                              v-model="payload.educations.vocational.education_description"
                              label="Basic Education / Degree / Course "
                              :readonly="profilingStore.isMyProfile"
                              :class="[
                                'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                              ]"
                              label-class="text-md text-surface-600 dark:lg:text-surface-200"
                              validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                              :invalid="validator.educations.vocational.education_description.$invalid"
                              :invalid-text="validator.educations.vocational.education_description.$errors[0]?.$message"
                              @blur="validator.educations.vocational.education_description.$touch"
                            />
                          </div>

                          <div class="bg-light-black-600 flex w-full flex-col gap-x-12 gap-y-4 md:flex-row">
                            <div class="flex w-full flex-col gap-x-6 gap-y-4 md:flex-row">
                              <WbCalendar
                                v-model="payload.educations.vocational.period_of_attendance_from"
                                label="From"
                                :readonly="profilingStore.isMyProfile"
                                :class="[
                                  'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                  profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :view="'year'"
                                :dateFormat="'yy'"
                                placeholder="1970"
                                :invalid="validator.educations.vocational.period_of_attendance_from.$invalid"
                                :invalid-text="validator.educations.vocational.period_of_attendance_from.$errors[0]?.$message"
                                @blur="validator.educations.vocational.period_of_attendance_from.$touch"
                              />

                              <WbCalendar
                                v-if="!currentlyEnrolledVocational"
                                v-model="payload.educations.vocational.period_of_attendance_to"
                                label="To "
                                :readonly="profilingStore.isMyProfile"
                                :class="[
                                  'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                  profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :view="'year'"
                                :dateFormat="'yy'"
                                placeholder="1970"
                                :invalid="validator.educations.vocational.period_of_attendance_to.$invalid"
                                :invalid-text="validator.educations.vocational.period_of_attendance_to.$errors[0]?.$message"
                                @blur="validator.educations.vocational.period_of_attendance_to.$touch"
                              />

                              <WbInputText
                                v-else
                                :modelValue="'PRESENT'"
                                label="To"
                                disabled
                                readonly
                                class="w-full text-sm"
                                label-class="text-md mb-1 text-surface-600 md:text-sm"
                              />

                              <WbInputText
                                v-model="payload.educations.vocational.highest_level_units_earned"
                                label="Highest Level / Units Earned "
                                label-class="text-md text-surface-600 dark:lg:text-surface-200"
                                :readonly="currentlyEnrolledVocational || profilingStore.isMyProfile"
                                :class="[
                                  'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                  profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalid="validator.educations.vocational.highest_level_units_earned.$invalid"
                                :invalid-text="validator.educations.vocational.highest_level_units_earned.$errors[0]?.$message"
                                @blur="validator.educations.vocational.highest_level_units_earned.$touch"
                              />
                            </div>

                            <div class="flex w-full flex-col gap-x-6 gap-y-4 md:flex-row">
                              <WbCalendar
                                v-model="payload.educations.vocational.year_graduated"
                                label="Year Graduated"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200"
                                :view="'year'"
                                :dateFormat="'yy'"
                                :readonly="currentlyEnrolledVocational || profilingStore.isMyProfile"
                                :class="[
                                  'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                  profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                                placeholder="1970"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalid="validator.educations.vocational.year_graduated.$invalid"
                                :invalid-text="validator.educations.vocational.year_graduated.$errors[0]?.$message"
                                @blur="validator.educations.vocational.year_graduated.$touch"
                              />

                              <WbInputText
                                v-model="payload.educations.vocational.scholarship_academic_honors_received"
                                label="Scholarship / Academic Honors Received "
                                label-class="text-md text-surface-600 dark:lg:text-surface-200"
                                :readonly="currentlyEnrolledVocational || profilingStore.isMyProfile"
                                :class="[
                                  'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                  profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalid="validator.educations.vocational.scholarship_academic_honors_received.$invalid"
                                :invalid-text="
                                  validator.educations.vocational.scholarship_academic_honors_received.$errors[0]?.$message
                                "
                                @blur="validator.educations.vocational.scholarship_academic_honors_received.$touch"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <!-- END VOCATINOAL -->

                      <!-- START COLLEGE -->

                      <div class="ml-4 mt-4 grid grid-cols-1 gap-x-12 gap-y-4">
                        <span class="mt-4 flex flex-col justify-center space-y-2 font-medium text-primary-700">
                          <p class="text-lg italic md:text-xl">College</p>
                        </span>
                        <div class="flex flex-col gap-x-12 gap-y-4">
                          <div class="flex w-full flex-col gap-x-12 gap-y-4 md:flex-row">
                            <WbInputText
                              v-model="payload.educations.college.schools_name"
                              required
                              label="Name of School"
                              :readonly="profilingStore.isMyProfile"
                              :class="[
                                'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                              ]"
                              label-class="text-md text-surface-600 dark:lg:text-surface-200"
                              validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                              :invalid="validator.educations.college.schools_name.$invalid"
                              :invalid-text="validator.educations.college.schools_name.$errors[0]?.$message"
                              @blur="validator.educations.college.schools_name.$touch"
                            />

                            <WbInputText
                              v-model="payload.educations.college.education_description"
                              required
                              label="Basic Education / Degree / Course "
                              :readonly="profilingStore.isMyProfile"
                              :class="[
                                'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                              ]"
                              label-class="text-md text-surface-600 dark:lg:text-surface-200"
                              validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                              :invalid="validator.educations.college.education_description.$invalid"
                              :invalid-text="validator.educations.college.education_description.$errors[0]?.$message"
                              @blur="validator.educations.college.education_description.$touch"
                            />
                          </div>

                          <div class="bg-light-black-600 flex w-full flex-col gap-x-12 gap-y-4 md:flex-row">
                            <div class="flex w-full flex-col gap-x-6 gap-y-4 md:flex-row">
                              <WbCalendar
                                v-model="payload.educations.college.period_of_attendance_from"
                                required
                                label="From"
                                :readonly="profilingStore.isMyProfile"
                                :class="[
                                  'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                  profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :view="'year'"
                                :dateFormat="'yy'"
                                :invalid="validator.educations.college.period_of_attendance_from.$invalid"
                                :invalid-text="validator.educations.college.period_of_attendance_from.$errors[0]?.$message"
                                @blur="validator.educations.college.period_of_attendance_from.$touch"
                              />

                              <WbCalendar
                                v-model="payload.educations.college.period_of_attendance_to"
                                required
                                label="To "
                                :readonly="profilingStore.isMyProfile"
                                :class="[
                                  'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                  profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                                :view="'year'"
                                :dateFormat="'yy'"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalid="validator.educations.college.period_of_attendance_to.$invalid"
                                :invalid-text="validator.educations.college.period_of_attendance_to.$errors[0]?.$message"
                                @blur="validator.educations.college.period_of_attendance_to.$touch"
                              />

                              <WbInputText
                                v-model="payload.educations.college.highest_level_units_earned"
                                label="Highest Level / Units Earned "
                                :readonly="profilingStore.isMyProfile"
                                :class="[
                                  'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                  profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalid="validator.educations.college.highest_level_units_earned.$invalid"
                                :invalid-text="validator.educations.college.highest_level_units_earned.$errors[0]?.$message"
                                @blur="validator.educations.college.highest_level_units_earned.$touch"
                              />
                            </div>

                            <div class="flex w-full flex-col gap-x-6 gap-y-4 md:flex-row">
                              <WbCalendar
                                v-model="payload.educations.college.year_graduated"
                                required
                                label="Year Graduated"
                                :readonly="profilingStore.isMyProfile"
                                :class="[
                                  'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                  profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200"
                                :view="'year'"
                                :dateFormat="'yy'"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalid="validator.educations.college.year_graduated.$invalid"
                                :invalid-text="validator.educations.college.year_graduated.$errors[0]?.$message"
                                @blur="validator.educations.college.year_graduated.$touch"
                              />

                              <WbInputText
                                v-model="payload.educations.college.scholarship_academic_honors_received"
                                label="Scholarship / Academic Honors Received "
                                :readonly="profilingStore.isMyProfile"
                                :class="[
                                  'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                  profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalid="validator.educations.college.scholarship_academic_honors_received.$invalid"
                                :invalid-text="
                                  validator.educations.college.scholarship_academic_honors_received.$errors[0]?.$message
                                "
                                @blur="validator.educations.college.scholarship_academic_honors_received.$touch"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <!-- END COLLEGE -->
                    </div>
                    <!-- END EDUCATION INFORMATION -->
                    <div class="ml-auto flex flex-row items-center gap-4">
                      <div>
                        <!-- Show Save button only if NO id -->
                        <Button
                          v-if="!profilingStore.isMyProfile"
                          label="Save"
                          @click="handleSaveProfilingForm"
                          :loading="formIsSubmitting"
                          :disabled="formIsSubmitting"
                          size="large"
                          class="dark:text-secondary-100 mt-4 w-full border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
                          text
                        >
                          <template #icon>
                            <i class="pi pi-save mr-2"></i>
                          </template>
                        </Button>
                        <!-- Show Update button only if id exists -->
                        <Button
                          v-if="!profilingStore.isMyProfile"
                          label="Update PDS"
                          @click="updateProfilingForm"
                          :loading="formIsSubmitting"
                          :disabled="formIsSubmitting"
                          type="button"
                          size="large"
                          class="dark:text-secondary-100 mt-4 w-full border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
                          text
                        >
                          <template #icon>
                            <i class="pi pi-save mr-2"></i>
                          </template>
                        </Button>
                      </div>
                    </div>
                  </div>
                </TransitionRoot>
              </TabPanel>
              <!-- END PERSONAL INFO SECTION -->
            </TabPanels>
          </TabGroup>
        </div>
      </form>
    </div>
  </template>
  <template v-else-if="isLoading">
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
