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
import { useItemNumberStore } from '@/stores/item-number.store.ts'

/** VALIDATION  */
import useVuelidate from '@vuelidate/core'
import { helpers, required, maxLength, email } from '@vuelidate/validators'
import { digitCountRule, mobilePhoneRule, uniqueUserIdentifierRule } from '@/utils/custom-validations'
import { lcFirst } from '@/utils/helpers.ts'

/** COMPOSABLES / UTILITIES */
import { useFilterByParentId } from '@/composables/address.options.ts'
import { useWbAutoCompleteHandleTrueValue } from '@/composables/wb-ui-components.ts'
import { usePrependOrAppendOnce, isNotMoreThanYearsAgo, notInFuture } from '@/utils/helpers.js'
import { parseApiResponseError } from '@/utils/error-handle.ts'

/** TYPES / INTERFACES*/
import { PersonnelResponse, ItemNumberResponse } from '@/typings/models.types'
import {
  SexTypeOptions,
  ExtensionTypeOptions,
  EducationTypeOptions,
  EligibilityTypeOptions,
} from '@/typings/employee-entry.types'
import { WbAutoCompleteOption, WbAutoCompleteOptionTrueValue } from '@/components/webkit/WbAutoComplete.vue'

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
import Card from 'primevue/card'
import { useToast } from 'primevue/usetoast'

/** Headless UI */
import { TabGroup, TabPanels, TabPanel, TransitionRoot } from '@headlessui/vue'

/** Icons */
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const getId = usePrependOrAppendOnce('profiling-section-form')

const libraryStore = useLibrariesStore()
const profilingStore = useProfilingStore()
const authStore = useAuthStore()
const itemStore = useItemNumberStore()

const toast = useToast()
const router = useRouter()
const route = useRoute()

const isSameResidential = ref(false)
const isItemsLoading = ref(false)
const isPositionLoading = ref(false)
const isLoading = ref(true)

const selectedItemNo = ref<WbAutoCompleteOption | null>(null)
const selectedOffice = ref<WbAutoCompleteOption | null>(null)
const selectedDivision = ref<WbAutoCompleteOption | null>(null)
const selectedSectionUnit = ref<WbAutoCompleteOption | null>(null)
const selectedCountry = ref<WbAutoCompleteOption | null>(null)
const isEditMode = computed(() => !!route.params.id)
const isPasAccount = computed(() => {
  return authStore.authenticatedUser?.roles?.some((r) => r.name === 'hr_pas_admin')
})
const ppmsCanUpdate = computed(() => {
  return authStore.authHasRequiredRole(['hr_pas_admin'])
})

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

/**  ══════════════════════════════════════════════════════
      FORM RULES / VALIDATIONS
    ══════════════════════════════════════════════════════ */

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

const hasAnyValue = (vm: Record<string, unknown>) => Object.values(vm).some((v) => helpers.req(v))

/** Generate validation messages for form fields */
const formRules = computed(() => ({
  $lazy: true,
  /** Personnel Information */
  employee: {
    agency_employee_no: {
      required: helpers.withMessage('Agency Employee No is required', required),
      maxLength: helpers.withMessage(() => generateMessage('agency_employee_no').maxLength, globalStringMaxLengthRule),
    },
    item_id: {
      required: helpers.withMessage(() => generateMessage('item_no').required, required),
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
    permanent_brgy_id: {
      required: helpers.withMessage(() => generateMessage('permanent_brgy').required, required),
    },
    permanent_citymun_id: {
      required: helpers.withMessage(() => generateMessage('permanent_citynum').required, required),
    },
    permanent_province_id: {
      required: helpers.withMessage(() => generateMessage('permanent_province').required, required),
    },
    permanent_region_id: {
      required: helpers.withMessage(() => generateMessage('permanent_region').required, required),
    },
    permanent_zip_code: {
      required: helpers.withMessage(() => generateMessage('permanent_zip_code').required, required),
      digitCount: helpers.withMessage('Enter a 5-digit zip code', digitCountRule(4)),
    },
  },

  individual_educational_background: payload.individual_educational_background.map((item) => ({
    education_description: {
      required: helpers.withMessage(
        'Basic Education / Degree / Course is required',
        (val) => (item._delete ? true : !!val) // Use the 'item' reference directly
      ),
    },
    level: {
      required: helpers.withMessage('Level of Education is required', (val) => (item._delete ? true : !!val)),
    },
  })),

  individual_work_experience: payload.individual_work_experience.map(() => ({
    inclusive_date_from: {
      required: helpers.withMessage('Date of Original Appointment  is required.', (val, vm) =>
        hasAnyValue(vm) ? helpers.req(val) : true
      ),
      maxLength: globalStringMaxLengthRule,
    },
  })),
}))

const validator = useVuelidate<EmployeeProfilingPayload>(formRules, payload)

/**
 * Reset the entire Profiling payload to default empty values when manual input mode is detected
 */
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
      item_id: '',
      employment_status_id: '',
      salary_grade_id: null,
      position: '',
      parenthetical_position: '',
      agency_employee_no: '',
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

    individual_eligibility: [
      {
        id: null,
        eligibility: '',
        rating: '',
        date_of_examination_conferment: '',
        place_of_examination: '',
        license_number: '',
        license_date_of_validity: '',
        _delete: null,
      },
    ],

    individual_educational_background: [
      {
        id: null,
        schools_name: '',
        education_description: '',
        level: '',
        period_of_attendance_from: '',
        period_of_attendance_to: null,
        highest_level_units_earned: '',
        year_graduated: null,
        scholarship_academic_honers_recieved: '',
        _delete: null,
      },
    ],

    individual_work_experience: [
      {
        id: null,
        is_current_work: false,
        inclusive_date_from: '',
        inclusive_date_to: '',
        position_title: '',
        department_agency_office_company: '',
        monthly_salary: '',
        salary_grade_id: null,
        salary_grade: null,
        custom_salary_grade: '',
        status_of_appointment: null,
        is_gov_service: false,
        immediate_supervisor: '',
        office_unit: '',
        significant_accomplishments: '',
        summary_of_actual_duties: '',
        _delete: null,
      },
    ],

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

  // We are programmatically forcing these values to clear
  payload.employee.position = ''
  payload.employee.parenthetical_position = ''
  selectedItemNo.value = null
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

/**══════════════════════════════════════════════════════
    PROFILING DETAILS FORM - FETCH EXISTING PROFILING BY ID & UPDATE PAYLOAD
   ══════════════════════════════════════════════════════*/
type profilingDetailsFormProps = {
  personnelProfiling?: PersonnelResponse
}
const props = defineProps<profilingDetailsFormProps>()
onMounted(async () => {
  /********* 1. Pre-requisite Data *********/
  if (!libraryStore.countryOptions.length) {
    await libraryStore.fetchCountry?.()
  }

  /********* 2. Route Context *********/
  const isEditor = route.path.includes('/recruitment/editor')
  const hasNoIdParam = !route.params.id

  /********* 3. Handle Clean Reset (Recruitment Editor New Entry) *********/
  if (isEditor && hasNoIdParam) {
    resetProfilingPayload()
    isLoading.value = false
    return
  }

  /********* 4. Fetch Existing Profiling (Editor Edit or My Profile) *********/
  isLoading.value = true

  // If no ID in URL, fallback to the logged-in user's profile ID
  const id = (route.params.id as string) || authStore.authenticatedUser?.user_profile?.individual_basic_detail_id

  if (id) {
    const response = await profilingStore.fetchProfilingById(id)

    if (response && response.success) {
      const data = response.data as PersonnelResponse

      // Update the global store state
      profilingStore.updateProfilingFromPersonnel(data)

      // Sync local dropdown refs with the fetched data
      syncLocalUIRefs(data)
    } else {
      console.warn('Profile fetch failed or returned unsuccessful status.')
    }
  }

  isLoading.value = false
})

/**
 * Helper function to synchronize local reactive refs (dropdowns/calendars)
 * with the fetched personnel data.
 */
const syncLocalUIRefs = (data: PersonnelResponse) => {
  /********* Citizenship & Country *********/
  selectedCountry.value = libraryStore.countryOptions.find((r) => r.value === data.country_id) ?? null
  payload.individual.country_id = data.country_id

  /********* Education Information *********/
  payload.individual_educational_background = Array.isArray(data.individual_educational_background)
    ? [...data.individual_educational_background]
    : data.individual_educational_background
      ? [data.individual_educational_background]
      : []

  /********* Eligibility Information *********/
  payload.individual_eligibility = Array.isArray(data.individual_eligibility)
    ? [...data.individual_eligibility]
    : data.individual_eligibility
      ? [data.individual_eligibility]
      : []

  /********* Work Experience Information *********/
  payload.individual_work_experience = Array.isArray(data.individual_work_experience)
    ? [...data.individual_work_experience]
    : data.individual_work_experience
      ? [data.individual_work_experience]
      : []

  /********* Contact Information *********/
  payload.individual_contact_info = Array.isArray(data.individual_contact_info)
    ? [...data.individual_contact_info]
    : data.individual_contact_info
      ? [data.individual_contact_info]
      : []

  /********* Question  Information *********/
  payload.individual_question = Array.isArray(data.individual_question)
    ? JSON.parse(JSON.stringify(data.individual_question))
    : data.individual_question
      ? [JSON.parse(JSON.stringify(data.individual_question))]
      : [
        {
          id: null,
          q34_a: false,
          q34_b: false,
          q34_details: null,
          q35_a: false,
          q35_a_details: null,
          q35_b: false,
          q35_b_date_filed: null,
          q35_b_status: null,
          q36: false,
          q36_details: null,
          q37: false,
          q37_details: null,
          q38_a: false,
          q38_a_details: null,
          q38_b: false,
          q38_b_details: null,
          q39: false,
          country_id: null,
          q40_a_indigenous_group: false,
          q40_a_details: null,
          q40_b_pwd: false,
          q40_b_details: null,
          q40_c_solo_parent: false,
          q40_c_details: null,
        },
      ]

  /********* Address Mapping *********/
  const addressRaw = data.individual_address
  if (addressRaw) {
    // Residential Address Dropdowns
    selectedResidentialRegion.value = publicStore.regionOptions.find((r) => r.value === addressRaw.residential_region_id) ?? null
    selectedResidentialProvince.value =
      publicStore.provinceOptions.find((p) => p.value === addressRaw.residential_province_id) ?? null
    selectedResidentialCity.value = publicStore.cityOptions.find((c) => c.value === addressRaw.residential_citymun_id) ?? null
    selectedResidentialBarangay.value =
      publicStore.barangayOptions.find((b) => b.value === addressRaw.residential_brgy_id) ?? null

    // Permanent Address Dropdowns
    selectedPermanentRegion.value = publicStore.regionOptions.find((r) => r.value === addressRaw.permanent_region_id) ?? null
    selectedPermanentProvince.value =
      publicStore.provinceOptions.find((p) => p.value === addressRaw.permanent_province_id) ?? null
    selectedPermanentCity.value = publicStore.cityOptions.find((c) => c.value === addressRaw.permanent_citymun_id) ?? null
    selectedPermanentBarangay.value = publicStore.barangayOptions.find((b) => b.value === addressRaw.permanent_brgy_id) ?? null
  }
}

/**═══════════════════════════════════════════
     WATCHERS FOR ITEM & POSITION MANAGEMENT
 ═══════════════════════════════════════════*/
/**
 * Updates the employee's position and parenthetical titles based on the current item_id.
 */
const propPosition = async () => {
  if (!payload.employee.item_id) {
    payload.employee.position = ''
    payload.employee.parenthetical_position = ''
    return
  }
  if (!payload?.employee?.item_id) return

  isPositionLoading.value = true

  try {
    const itemResp = await itemStore.fetchItemNumberById(payload.employee.item_id)

    if (itemResp?.success && itemResp.data) {
      const itemRespData = itemResp.data as ItemNumberResponse
      payload.employee.position = itemRespData.position?.title ?? ''
      payload.employee.parenthetical_position = String(itemRespData.position?.parenthetical_title ?? '')
    } else {
      payload.employee.position = ''
      payload.employee.parenthetical_position = ''
    }
  } catch (error) {
    console.error('[propPosition] Failed to fetch item:', error)
    payload.employee.position = ''
    payload.employee.parenthetical_position = ''
  } finally {
    isPositionLoading.value = false
  }
}

/**
 * Watch employee object is replaced or deeply modified,
 */
watch(
  () => payload.employee,
  (emp) => {
    if (emp?.item_id) {
      propPosition()
    }
  },
  { immediate: true, deep: true }
)

/**
 * Watch Handles the logic of finding/fetching the specific item associated with the employee.
 */
watch(
  () => payload.employee.item_id,
  async (newId) => {
    isItemsLoading.value = true
    if (!newId) {
      selectedItemNo.value = null
      payload.employee.position = ''
      payload.employee.parenthetical_position = ''

      isItemsLoading.value = false // Don't forget to stop loading
      return
    }

    const existing = libraryStore.itemsOptions.find((opt) => Number(opt.value) === Number(newId))

    if (existing) {
      selectedItemNo.value = existing
      propPosition()
    } else {
      const response = await itemStore.fetchItemNumberById(Number(newId))

      if (response && response.success) {
        const itemResponse = response.data as ItemNumberResponse
        const foundItem = {
          value: itemResponse.id,
          label: itemResponse.number,
        }

        libraryStore.itemsOptions.push(foundItem)

        selectedItemNo.value = foundItem
        propPosition()
      } else {
        selectedItemNo.value = null
      }
    }

    isItemsLoading.value = false
  },
  { immediate: true }
)

// ═══════════════════════════════════════════
//      WATCHERS FOR PERSONAL INFORMATION
// ═══════════════════════════════════════════

/**
 * Update Profiling  data when personnelProfiling prop changes
 */
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

/**
 *  Clear ext_name on female selection
 */
watch(
  () => payload.individual.sex,
  (newSex) => {
    if (newSex === 'female') {
      payload.individual.ext_name = null
    }
  }
)

/**
 * Reset citizenship fields based on selection
 */
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

/**
 * Format birthday to YYYY-MM-DD
 */
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

/**
 * Watcher Show the Country ID Label
 */
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

/**
 * Calculate age based on birthdate
 */
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

/**═══════════════════════════════════════════
     WATCHERS FOR ADDRESS INFORMATION
 ═══════════════════════════════════════════*/
const isResidentialComplete = ref(false)
/**
 * Watcher if Permanent Resident is same as Residential
 * */
watch(isSameResidential, (newVal) => {
  if (newVal === true) {
    const residential = payload.individual_address_init

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

/**
 * Check if residential matches permanent address
 */
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

/**
 * Check if residential fields are complete
 */
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

/**
 * Sync region with store options
 */
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

/**
 * Clear region selection on ID removal
 */
watch(
  () => payload.individual_address_init.residential_region_id,
  (newSelectedItem) => {
    if (!newSelectedItem) {
      selectedResidentialRegion.value = null
      return
    }
  }
)

/**
 * Sync province with store options
 */
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

/**
 * Sync province selection with payload
 */
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

/**
 * Sync city with store options
 * */
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

/**
 * Sync city selection with payload
 */
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

/**
 * Sync barangay with store options
 * */
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

/**
 * Sync barangay selection with payload
 * */
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

/**
 * Sync permanent region with store options
 */
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

/**
 * Sync permanent region selection with payload
 */
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

/**
 * Sync permanent province with store options
 */
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

/**
 * Sync permanent province selection with payload
 */
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

/**
 * Sync permanent city with store options
 */
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

/**
 * Sync permanent city selection with payload
 */
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

/**
 * Sync permanent barangay with store options
 */
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

/**
 * Sync permanent barangay selection with payload
 */
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

/**
 * Sync agency employee number with ID number field
 */
watch(
  () => payload.employee.agency_employee_no,
  (newAgencyNo) => {
    payload.employee.id_number = newAgencyNo ?? null
  },
  { immediate: true }
)

/**
 * Sync office selection with dropdown options
 */
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

/**
 * Sync division selection with dropdown options
 */
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

/**
 * Sync section/unit selection with dropdown options
 */
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

/**
 * Display a toast notification with rate limiting
 * @param severityPararm - Toast severity level (success, error, info, warn, etc.)
 * @param message - Main message to display
 * @param summaryParam - Detailed summary text
 */

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
    payload.individual_eligibility[idx] = {
      ...eligibility,
      _delete: true,
    }
  } else {
    if (payload.individual_eligibility.length === 1) {
      payload.individual_eligibility[idx] = {
        id: null,
        eligibility: null,
        rating: null,
        date_of_examination_conferment: null,
        place_of_examination: null,
        license_number: null,
        license_date_of_validity: null,
        _delete: null,
      }
    } else {
      payload.individual_eligibility.splice(idx, 1)
    }
  }
}

const handleAdditionalEducation = () => {
  if (payload.individual_educational_background.length < 7) {
    payload.individual_educational_background.push({
      id: null,
      schools_name: '',
      education_description: '',
      level: null,
      period_of_attendance_from: '',
      period_of_attendance_to: null,
      highest_level_units_earned: '',
      year_graduated: null,
      is_current_enrolled: false,
      scholarship_academic_honors_received: '',
      _delete: null,
    })
  }
}

const handleRemoveEducation = (educationalIndex: number) => {
  const idx = educationalIndex - 1
  const educational = payload.individual_educational_background?.[idx]

  if (educational?.id) {
    payload.individual_educational_background[idx] = {
      ...educational,
      _delete: true,
    }
  } else {
    if (payload.individual_educational_background.length === 1) {
      payload.individual_educational_background[idx] = {
        id: null,
        schools_name: '',
        education_description: '',
        level: null,
        period_of_attendance_from: '',
        period_of_attendance_to: null,
        highest_level_units_earned: '',
        year_graduated: null,
        is_current_enrolled: false,
        scholarship_academic_honors_received: '',
        _delete: null,
      }
    } else {
      payload.individual_educational_background.splice(idx, 1)
    }
  }
}

const previousItemNumber = ref<string | null>(null)

watch(selectedItemNo, async (newValueFilled, oldValueUnfilled) => {
  if (oldValueUnfilled && oldValueUnfilled !== newValueFilled) {
    await itemStore.updateItemStatus(oldValueUnfilled.toString())
  }
  if (newValueFilled) {
    await itemStore.updateItemStatus(newValueFilled.toString())
  }
  previousItemNumber.value = newValueFilled?.toString() ?? null
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
    const hasEducationError = validator.value.individual_address_init?.$error
    const hasEmployementError = validator.value.individual_work_experience?.$error

    const errorFields: string[] = []
    if (hasEmployeeError) errorFields.push('Employee Id')
    if (hasIndividualError) errorFields.push('Personal Identification')
    if (hasContactInfoError) errorFields.push('Contact Information')
    if (hasAddressError) errorFields.push('Address Information')
    if (hasEducationError) errorFields.push('Education Attainment')
    if (hasEmployementError) errorFields.push('Employement Details')

    const sectionDescriptions: Record<string, string> = {
      'Employee Id': 'Employee Id Field',
      'Personal Identification': 'Personal Identification Section',
      'Contact Information': 'Contact Information Section',
      'Address Information': 'Address Information Section',
      'Educational Attainment': 'Educational Attainment Section',
      'Employement Details': 'Employement Details Section',
    }

    if (errorFields.length > 0) {
      errorFields.forEach((field) => {
        const message = sectionDescriptions[field] ?? field
        toast.add({
          severity: 'error',
          summary: 'Validation Error - Please check the following',
          detail: message,
          life: 4000,
        })
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
  formIsSubmitting.value = true

  const id = profilingStore.isMyProfile
    ? authStore.authenticatedUser?.user_profile?.individual_basic_detail?.id?.toString() ?? 0
    : (route.params.id as string)

  if (!(await validateForm()).valid) return (formIsSubmitting.value = false)

  // Mapping Organizational Defaults directly
  if (payload.employee) {
    payload.employee.salary_grade_id ||= 1
    payload.employee.office_id ||= 1
    payload.employee.division_id ||= 1
    payload.employee.section_or_unit_id ||= 1
  }

  const requestPayload = {
    ...payload,
    individual_contact_info: [{ ...payload.contact_info }],
    individual_address: [{ ...payload.individual_address_init }],
  }

  // Execute dual update in parallel
  const [resC1, resC2] = await Promise.all([
    profilingStore.updateProfiling(requestPayload, id, 'C1'),
    profilingStore.updateProfiling(requestPayload, id, 'C2'),
  ])

  // Process Results
  const success = resC1.success && resC2.success

  if (success) {
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Employee profile was successfully updated',
      life: 2000,
    })
  } else {
    const result = parseApiResponseError(!resC1.success ? resC1 : resC2)
    showErrorAlert.value = true
    errorMessage.value = result?.message || 'Failed to update profile.'
  }

  formIsSubmitting.value = false
  IsBeingUpdated.value = false
}

/**************************************************
            PROFILING - STORE SERVICE 
***************************************************/
const handleSaveProfilingForm = async () => {
  isProfilingLoading.value = true

  if (!(await validateForm()).valid) {
    return (isProfilingLoading.value = false)
  }

  // Prepare Payload Structure
  payload.individual_address = [{ ...payload.individual_address_init }]
  payload.individual_contact_info = [{ ...payload.contact_info }]

  // Normalize Questionnaire (Defaults to false/empty strings)
  const q = payload.individual_question?.[0]
  if (q) {
    q.q34_a = q.q34_a ?? false
    q.q35_a = q.q35_a ?? false
    if (q.q34_a) q.q34_details ??= ''
    if (q.q35_a) q.q35_a_details ??= ''
  }

  // Apply Organizational & Gov ID Defaults
  const defaults = { salary_grade_id: 1, office_id: 1, division_id: 1, section_or_unit_id: 1 }

  if (payload.employee) {
    Object.assign(payload.employee, { ...defaults, ...payload.employee })
  }

  if (payload.individual) {
    const govKeys = ['philhealth_no', 'gsis_no', 'pag_ibig_no', 'sss_no'] as const
    govKeys.forEach((key) => (payload.individual![key] ??= ''))
  }

  // External Store Updates & API Call
  if (payload.employee?.item?.number) {
    await itemStore.updateItemStatus(payload.employee.item.number)
  }

  const response = await profilingStore.saveProfiling(payload)

  // Response Handling
  if (!response?.success) {
    const result = parseApiResponseError(response)
    isProfilingError.value = true
    errorMessage.value = result?.message
    profilingErrors.value = result?.errors
    return (isProfilingLoading.value = false)
  }

  // Success State
  isProfilingLoading.value = false
  toast.add({
    severity: 'success',
    summary: 'Success',
    detail: 'Employee profile was successfully saved',
    life: 2000,
  })
  router.push({ name: 'employment' })
}
</script>
<template>
  <template v-if="!isLoading">
    <div class="flex flex-row" :key="route.fullPath">
      <form @submit.prevent="" autocomplete="off" class="h-full w-full">
        <div class="w-full">
          <Card class="h-full">
            <template #content>
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
                        <div class="mb-4 flex flex-row items-center">
                          <FontAwesomeIcon :icon="['fas', 'users']" class="text-2xl text-primary-700 md:text-4xl" />
                          <span class="flex flex-col justify-center">
                            <p class="text-xl text-primary-700 md:text-3xl">Employee Profile</p>
                            <p v-if="!isEditMode" class="text-surface-500">
                              {{ lcFirst(String(profilingStore.isMyProfile)) }}
                            </p>
                          </span>
                        </div>

                        <!-- START ITEM & POSITION MANAGEMENT -->
                        <span class="flex flex-col justify-center space-y-2 font-medium text-primary-700">
                          <p class="text-lg italic md:text-xl">Item & Position Management</p>
                        </span>
                        <div class="ml-6 mr-6 mt-2">
                          <div class="flex items-start gap-2">
                            <WbAutoComplete
                              class="flex-1"
                              :useApiFilter="true"
                              :apiEndpoint="'/items/search'"
                              :apiFilters="{ status: 'Unfilled' }"
                              :suggestions="itemStore.itemNumbersSuggestions"
                              @item-select="propPosition"
                              apiOptionLabel="number"
                              label="Item Number"
                              placeholder="Type the item number"
                              v-model="selectedItemNo"
                              :id="getId('input-item-no')"
                              optionLabel="label"
                              optionValue="value"
                              required
                              :readonly="profilingStore.isMyProfile || isPasAccount"
                              :class="[
                                'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                profilingStore.isMyProfile || isPasAccount
                                  ? 'pointer-events-none cursor-default select-text'
                                  : '',
                              ]"
                              @on-true-value-computed="
                                (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                                  useWbAutoCompleteHandleTrueValue(value, toRef(payload.employee, 'item_id'))
                              "
                              label-class="text-md text-surface-600 dark:lg:text-surface-200"
                              validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                              :invalid="validator.employee.item_id.$invalid"
                              :invalid-text="validator.employee.item_id.$errors[0]?.$message"
                              @blur="validator.employee.item_id.$touch"
                              @focusin="validator.employee.item_id.$dirty = false"
                            >
                            </WbAutoComplete>

                            <RouterLink
                              v-if="!profilingStore.isMyProfile && !ppmsCanUpdate"
                              :to="{ name: 'support', state: { from: 'recruitment' } }"
                              v-tooltip.top="'Add Item Number'"
                              class="mt-8"
                            >
                              <FontAwesomeIcon icon="fa-solid fa-plus" class="text-3xl font-bold text-primary-500" />
                            </RouterLink>
                          </div>
                        </div>
                        <div class="mb-4 ml-6 mr-6 mt-2 grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-2">
                          <WbInputText
                            v-model="payload.employee.position"
                            :id="getId('input-item-position')"
                            label="Position Title"
                            :loading="isPositionLoading"
                            readonly
                            placeholder="Position will be auto populated upon item number selection"
                            class="lg:text-md lg:placeholder:text-md cursor-not-allowed bg-surface-200 text-sm placeholder:text-sm read-only:cursor-not-allowed disabled:cursor-not-allowed"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200"
                            validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          />

                          <WbInputText
                            v-model="payload.employee.parenthetical_position"
                            :id="getId('input-item-parenthetical_title')"
                            label="Parenthetical Title"
                            :loading="isPositionLoading"
                            readonly
                            placeholder="Parenthetical Title will be auto populated upon item number selection"
                            class="lg:text-md lg:placeholder:text-md cursor-not-allowed bg-surface-200 text-sm placeholder:text-sm read-only:cursor-not-allowed disabled:cursor-not-allowed"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200"
                            validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          />
                        </div>
                        <!-- END PERSONAL INFO -->

                        <!-- START PERSONAL IDENTIFICATION -->
                        <span class="flex flex-col justify-center space-y-2 font-medium text-primary-700">
                          <p class="text-lg italic md:text-xl">Personal Identification</p>
                        </span>
                        <div class="ml-6 mr-6 mt-2 grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-2">
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
                            readonly
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
                            v-model="payload.individual.gsis_no"
                            label="GSIS No."
                            label-class="text-md text-surface-600 dark:lg:text-surface-200"
                            :readonly="profilingStore.isMyProfile"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                              profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                            ]"
                          >
                          </WbInputText>

                          <WbInputText
                            v-model="payload.individual.pag_ibig_no"
                            label="PAG-IBIG ID No."
                            label-class="text-md text-surface-600 dark:lg:text-surface-200"
                            validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                            :readonly="profilingStore.isMyProfile"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                              profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                            ]"
                          >
                          </WbInputText>
                          <WbInputText
                            v-model="payload.individual.philhealth_no"
                            label="PHILHEALTH No."
                            label-class="text-md text-surface-600 dark:lg:text-surface-200"
                            validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                            :readonly="profilingStore.isMyProfile"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                              profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                            ]"
                          >
                          </WbInputText>
                          <WbInputText
                            v-model="payload.individual.sss_no"
                            label="SSS No."
                            label-class="text-md text-surface-600 dark:lg:text-surface-200"
                            :readonly="profilingStore.isMyProfile"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                              profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                            ]"
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

                        <!-- START CONTACT INFORMATION -->
                        <div class="mt-2">
                          <span class="flex flex-col justify-center space-y-2 font-medium text-primary-700">
                            <p class="text-lg italic md:text-xl">Contact Information</p>
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
                              :invalid="validator.individual_address_init.permanent_region_id.$invalid"
                              :invalid-text="validator.individual_address_init.permanent_region_id.$errors[0]?.$message"
                              @blur="validator.individual_address_init.permanent_region_id.$touch"
                              @focusin="validator.individual_address_init.permanent_region_id.$dirty = false"
                            >
                            </WbAutoComplete>
                            <WbAutoComplete
                              v-model="selectedPermanentProvince"
                              :suggestions="filteredPermanentProvinceOptionsByRegion"
                              label=" Province "
                              label-class="text-md text-surface-600 dark:lg:text-surface-200"
                              validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                              optionLabel="label"
                              required
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
                              :invalid="validator.individual_address_init.permanent_province_id.$invalid"
                              :invalid-text="validator.individual_address_init.permanent_province_id.$errors[0]?.$message"
                              @blur="validator.individual_address_init.permanent_province_id.$touch"
                              @focusin="validator.individual_address_init.permanent_province_id.$dirty = false"
                            >
                            </WbAutoComplete>
                            <WbAutoComplete
                              v-model="selectedPermanentCity"
                              :suggestions="filteredPermanentCityOptionsByProvince"
                              label=" City / Municipality "
                              label-class="text-md text-surface-600 dark:lg:text-surface-200"
                              validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                              optionLabel="label"
                              required
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
                              :invalid="validator.individual_address_init.permanent_citymun_id.$invalid"
                              :invalid-text="validator.individual_address_init.permanent_citymun_id.$errors[0]?.$message"
                              @blur="validator.individual_address_init.permanent_citymun_id.$touch"
                              @focusin="validator.individual_address_init.permanent_citymun_id.$dirty = false"
                            >
                            </WbAutoComplete>
                            <WbAutoComplete
                              v-model="selectedPermanentBarangay"
                              :suggestions="filteredPermanentBarangayOptionsByCity"
                              label=" Barangay "
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
                              :placeholder="'Select your Barangay'"
                              forceSelection
                              @on-true-value-computed="
                                (value: WbAutoCompleteOptionTrueValue) =>
                                  useWbAutoCompleteHandleTrueValue(
                                    value,
                                    toRef(payload.individual_address_init, 'permanent_brgy_id')
                                  )
                              "
                              :loading="publicStore.barangayOptionsIsLoading"
                              :virtualScrollerOptions="{ itemSize: 38 }"
                              dropdown
                              dropdownClass="bg-transparent"
                              :invalid="validator.individual_address_init.permanent_brgy_id.$invalid"
                              :invalid-text="validator.individual_address_init.permanent_brgy_id.$errors[0]?.$message"
                              @blur="validator.individual_address_init.permanent_brgy_id.$touch"
                              @focusin="validator.individual_address_init.permanent_brgy_id.$dirty = false"
                            >
                            </WbAutoComplete>
                            <WbInputText
                              v-model="payload.individual_address_init.permanent_subdivision_village"
                              label="Subdivision / Village"
                              label-class="text-md text-surface-600 dark:lg:text-surface-200"
                              :readonly="profilingStore.isMyProfile || isSameResidential"
                              :class="[
                                'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                profilingStore.isMyProfile || isSameResidential
                                  ? 'pointer-events-none cursor-default select-text'
                                  : '',
                              ]"
                            >
                            </WbInputText>
                            <WbInputText
                              v-model="payload.individual_address_init.permanent_street"
                              label="Street"
                              label-class="text-md text-surface-600 dark:lg:text-surface-200"
                              :readonly="profilingStore.isMyProfile || isSameResidential"
                              :class="[
                                'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                profilingStore.isMyProfile || isSameResidential
                                  ? 'pointer-events-none cursor-default select-text'
                                  : '',
                              ]"
                            >
                            </WbInputText>
                            <WbInputText
                              v-model="payload.individual_address_init.permanent_house_block_lot_no"
                              label="House / Block / Lot No."
                              label-class="text-md text-surface-600 dark:lg:text-surface-200"
                              :readonly="profilingStore.isMyProfile || isSameResidential"
                              :class="[
                                'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                profilingStore.isMyProfile || isSameResidential
                                  ? 'pointer-events-none cursor-default select-text'
                                  : '',
                              ]"
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

                        <!-- START ELIGIBILITY INFORMATION -->
                        <div class="mt-2">
                          <span class="mb-4 flex flex-col justify-center space-y-2 font-medium text-primary-700">
                            <p class="text-lg italic md:text-xl">Eligibility Information</p>
                          </span>
                          <div class="grid grid-cols-1 md:grid-cols-1">
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
                                  <div class="mb-4 ml-4 grid grid-cols-1 items-start gap-12 md:grid-cols-12">
                                    <div :class="['col-span-12', 'md:col-span-6']">
                                      <WbInputText
                                        v-model="payload.individual_eligibility[eligibilityIndex - 1].eligibility"
                                        label="Eligibility"
                                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                                        :readonly="profilingStore.isMyProfile"
                                      />
                                    </div>

                                    <div :class="['col-span-12', eligibilityIndex === 1 ? 'md:col-span-6' : 'md:col-span-5']">
                                      <WbDropdown
                                        v-model="payload.individual_eligibility[eligibilityIndex - 1].place_of_examination"
                                        label="Eligibility Level"
                                        optionLabel="label"
                                        optionValue="value"
                                        :options="EligibilityTypeOptions"
                                        :disabled="profilingStore.isMyProfile"
                                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                                      ></WbDropdown>
                                    </div>

                                    <div
                                      v-if="eligibilityIndex > 1"
                                      class="col-span-12 flex items-center justify-center pt-8 md:col-span-1"
                                    >
                                      <Button
                                        v-if="!profilingStore.isMyProfile"
                                        icon="pi pi-trash"
                                        severity="danger"
                                        text
                                        rounded
                                        @click="handleRemoveEligibility(eligibilityIndex)"
                                        class="hover:bg-red-50"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </TransitionRoot>
                            </template>

                            <Button
                              v-if="payload.individual_eligibility.length < 7 && !profilingStore.isMyProfile"
                              :disabled="profilingStore.isMyProfile"
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
                        </div>
                        <!-- END ELIGIBILITY INFORMATION -->

                        <!-- START EDUCATION INFORMATION -->
                        <div class="mt-2">
                          <span class="mb-4 flex flex-col justify-center space-y-2 font-medium text-primary-700">
                            <p class="text-lg italic md:text-xl">Educational Attainment</p>
                          </span>

                          <template
                            v-for="educationalIndex in payload.individual_educational_background.length"
                            :key="educationalIndex"
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
                              <div v-if="!payload.individual_educational_background[educationalIndex - 1]?._delete">
                                <div class="mb-4 ml-4 grid grid-cols-1 items-start gap-12 md:grid-cols-12">
                                  <div :class="['col-span-12', 'md:col-span-6']">
                                    <WbInputText
                                      v-model="
                                        payload.individual_educational_background[educationalIndex - 1].education_description
                                      "
                                      label="Basic Education / Degree / Course"
                                      required
                                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                                      :readonly="profilingStore.isMyProfile"
                                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                      :invalid="
                                        validator.individual_educational_background[educationalIndex - 1].education_description
                                          .$invalid
                                      "
                                      :invalid-text="
                                        validator.individual_educational_background[educationalIndex - 1].education_description
                                          .$errors[0]?.$message
                                      "
                                      @blur="
                                        validator.individual_educational_background[educationalIndex - 1].education_description
                                          .$touch
                                      "
                                    />
                                  </div>

                                  <div :class="['col-span-12', educationalIndex === 1 ? 'md:col-span-6' : 'md:col-span-5']">
                                    <WbDropdown
                                      v-model="payload.individual_educational_background[educationalIndex - 1].level"
                                      optionLabel="label"
                                      optionValue="value"
                                      required
                                      :options="EducationTypeOptions"
                                      :disabled="profilingStore.isMyProfile"
                                      label="Education Level"
                                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                      :invalid="validator.individual_educational_background[educationalIndex - 1].level.$invalid"
                                      :invalid-text="
                                        validator.individual_educational_background[educationalIndex - 1].level.$errors[0]
                                          ?.$message
                                      "
                                      @blur="validator.individual_educational_background[educationalIndex - 1].level.$touch"
                                    ></WbDropdown>
                                  </div>

                                  <div
                                    v-if="educationalIndex > 1"
                                    class="col-span-12 flex items-center justify-center pt-8 md:col-span-1"
                                  >
                                    <Button
                                      v-if="!profilingStore.isMyProfile"
                                      icon="pi pi-trash"
                                      severity="danger"
                                      text
                                      rounded
                                      @click="handleRemoveEducation(educationalIndex)"
                                      class="hover:bg-red-50"
                                    />
                                  </div>
                                </div>
                              </div>
                            </TransitionRoot>
                          </template>

                          <Button
                            v-if="payload.individual_eligibility.length < 7 && !profilingStore.isMyProfile"
                            :disabled="profilingStore.isMyProfile"
                            label="Add additional Education field"
                            @click="handleAdditionalEducation"
                            size="large"
                            class="dark:text-secondary-100 mt-4 !w-64 border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
                            text
                          >
                            <template #icon>
                              <i class="pi pi-plus mr-2"></i>
                            </template>
                          </Button>
                        </div>
                        <!-- END EDUCATION INFORMATION -->

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
                                    v-model="payload.individual_question[0].q34_a"
                                    :id="getId('input-question-34a-yes')"
                                    :readonly="profilingStore.isMyProfile"
                                    name="q34_a"
                                    :value="true"
                                    :class="[
                                      'scale-150 transform',
                                      profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                                    ]"
                                  />
                                  <label :for="getId('input-question-34a-yes')" class="ml-2 cursor-pointer">Yes</label>
                                </div>
                                <div class="flex items-center">
                                  <RadioButton
                                    v-model="payload.individual_question[0].q34_a"
                                    :id="getId('input-question-34a-no')"
                                    :readonly="profilingStore.isMyProfile"
                                    name="q34_a"
                                    :value="false"
                                    :class="[
                                      'scale-150 transform',
                                      profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                                    ]"
                                  />
                                  <label :for="getId('input-question-34a-no')" class="ml-2 cursor-pointer">No</label>
                                </div>
                              </div>
                            </div>
                            <div class="flex flex-col gap-2 p-4">
                              <p class="text-base font-medium text-surface-600">Senior Citizen</p>

                              <div class="flex flex-row items-center justify-center gap-12 p-4 md:justify-start md:p-2">
                                <div class="flex items-center">
                                  <RadioButton
                                    v-model="payload.individual_question[0].q35_a"
                                    :id="getId('input-question-35a-yes')"
                                    :readonly="profilingStore.isMyProfile"
                                    name="q35_a"
                                    :value="true"
                                    :class="[
                                      'scale-150 transform',
                                      profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                                    ]"
                                  />
                                  <label :for="getId('input-question-34a-yes')" class="ml-2 cursor-pointer">Yes</label>
                                </div>
                                <div class="flex items-center">
                                  <RadioButton
                                    v-model="payload.individual_question[0].q35_a"
                                    :id="getId('input-question-35a-no')"
                                    :readonly="profilingStore.isMyProfile"
                                    name="q35_a"
                                    :value="false"
                                    :class="[
                                      'scale-150 transform',
                                      profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                                    ]"
                                  />
                                  <label :for="getId('input-question-35a-no')" class="ml-2 cursor-pointer">No</label>
                                </div>
                              </div>
                            </div>
                            <div class="flex flex-col gap-2 p-4">
                              <p class="text-base font-medium text-surface-600">Person with Disability</p>

                              <div class="flex flex-row items-center justify-center gap-12 p-4 md:justify-start md:p-2">
                                <div class="flex items-center">
                                  <RadioButton
                                    v-model="payload.individual_question[0].q36"
                                    :id="getId('input-question-36-yes')"
                                    :readonly="profilingStore.isMyProfile"
                                    name="q36"
                                    :value="true"
                                    :class="[
                                      'scale-150 transform',
                                      profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                                    ]"
                                  />
                                  <label :for="getId('input-question-36-yes')" class="ml-2 cursor-pointer">Yes</label>
                                </div>
                                <div class="flex items-center">
                                  <RadioButton
                                    v-model="payload.individual_question[0].q36"
                                    :id="getId('input-question-36-no')"
                                    :readonly="profilingStore.isMyProfile"
                                    name="q36"
                                    :value="false"
                                    :class="[
                                      'scale-150 transform',
                                      profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                                    ]"
                                  />
                                  <label :for="getId('input-question-36-no')" class="ml-2 cursor-pointer">No</label>
                                </div>
                              </div>
                              <!-- Conditional input shown only if any answer is "Yes" -->
                              <div
                                v-if="payload.individual_question[0].q36 === true"
                                class="mb-2 flex items-start gap-2 md:col-span-4"
                              >
                                <WbInputText
                                  v-model="payload.individual_question[0].q36_details"
                                  label="If YES, Type of Disability"
                                  :readonly="profilingStore.isMyProfile"
                                  label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                  :class="[
                                    'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                                    profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                                  ]"
                                  required
                                />
                              </div>
                            </div>
                            <div class="flex flex-col gap-2 p-4">
                              <p class="text-base font-medium text-surface-600">Member of Indigenous Group</p>

                              <div class="flex flex-row items-center justify-center gap-12 p-4 md:justify-start md:p-2">
                                <div class="flex items-center">
                                  <RadioButton
                                    v-model="payload.individual_question[0].q37"
                                    :id="getId('input-question-37-yes')"
                                    :readonly="profilingStore.isMyProfile"
                                    name="q37"
                                    :value="true"
                                    :class="[
                                      'scale-150 transform',
                                      profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                                    ]"
                                  />
                                  <label :for="getId('input-question-37-yes')" class="ml-2 cursor-pointer">Yes</label>
                                </div>
                                <div class="flex items-center">
                                  <RadioButton
                                    v-model="payload.individual_question[0].q37"
                                    :id="getId('input-question-37-no')"
                                    :readonly="profilingStore.isMyProfile"
                                    name="q37"
                                    :value="false"
                                    :class="[
                                      'scale-150 transform',
                                      profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                                    ]"
                                  />
                                  <label :for="getId('input-question-37-no')" class="ml-2 cursor-pointer">No</label>
                                </div>
                              </div>
                              <!-- Conditional input shown only if any answer is "Yes" -->
                              <div
                                v-if="payload.individual_question[0].q37 === true"
                                class="mb-2 flex items-start gap-2 md:col-span-4"
                              >
                                <WbInputText
                                  v-model="payload.individual_question[0].q37_details"
                                  label="If YES, Type of IG"
                                  :readonly="profilingStore.isMyProfile"
                                  label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                  :class="[
                                    'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                                    profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                                  ]"
                                  required
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <!-- END SECTORAL AFFILIATIONS -->

                        <!-- START EMPLOYEMENT DETAILS -->
                        <div class="mt-2">
                          <span class="mb-4 flex flex-col justify-center space-y-2 font-medium text-primary-700">
                            <p class="text-lg italic md:text-xl">Employement Details</p>
                          </span>
                          <div v-if="!payload.individual_work_experience[0]?._delete">
                            <div class="mb-4 ml-4 grid grid-cols-1 items-start gap-4 md:grid-cols-12">
                              <div :class="['col-span-12', 'md:col-span-4']">
                                <WbCalendar
                                  v-model="payload.individual_work_experience[0].inclusive_date_from"
                                  :readonly="profilingStore.isMyProfile"
                                  :class="[
                                    'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                    profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                                  ]"
                                  label="Date of Original Appointment"
                                  required
                                  :invalid="validator.individual_work_experience[0].inclusive_date_from.$invalid"
                                  :invalid-text="validator.individual_work_experience[0].inclusive_date_from.$errors[0]?.$message"
                                  @blur="validator.individual_work_experience[0].inclusive_date_from.$touch"
                                ></WbCalendar>
                              </div>

                              <div :class="['col-span-12', 'md:col-span-4']">
                                <WbCalendar
                                  v-model="payload.individual_work_experience[0].position_title"
                                  :readonly="profilingStore.isMyProfile"
                                  :class="[
                                    'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                    profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                                  ]"
                                  label="Date of Last Promotion"
                                >
                                  <template #prepend-icon>
                                    <i class="pi pi-gift" />
                                  </template>
                                </WbCalendar>
                              </div>
                              <div
                                v-if="payload.individual_work_experience && payload.individual_work_experience[0]"
                                :class="['col-span-12', 'md:col-span-4']"
                              >
                                <WbCalendar
                                  v-model="payload.individual_work_experience[0].inclusive_date_to"
                                  :readonly="profilingStore.isMyProfile"
                                  :class="[
                                    'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                    profilingStore.isMyProfile ? 'pointer-events-none cursor-default select-text' : '',
                                  ]"
                                  label="Entry Date (First Day in Service)"
                                >
                                  <template #prepend-icon>
                                    <i class="pi pi-gift" />
                                  </template>
                                </WbCalendar>
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- END EMPLOYEMENT DETAILS -->
                        <div class="ml-auto flex flex-row items-center gap-4">
                          <div>
                            <!-- Show Save button only if NO id -->
                            <Button
                              v-if="!profilingStore.isMyProfile && !route.params.id"
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
                              v-if="!profilingStore.isMyProfile && route.params.id"
                              label="Update"
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
            </template>
          </Card>
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
