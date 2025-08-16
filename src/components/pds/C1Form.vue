<script setup lang="ts">
import Message from 'primevue/message'
import { helpers, maxLength, required, email } from '@vuelidate/validators'
import { digitCountRule, mobilePhoneRule, uniqueUserIdentifierRule } from '@/utils/custom-validations'
import { reactive, ref, onBeforeMount, toRef, watch, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useFilterByParentId } from '@/composables/address.options.ts'
import { useAddressStore } from '@/stores/address.store.ts'
import { useLibrariesStore } from '@/stores/libraries.store.ts'
import { useItemNumberStore } from '@/stores/item-number.store.ts'
import { useSalaryGradesStore } from '@/stores/salary-grades.store.ts'
import { useProfileStore } from '@/stores/profile.store.ts'
import { usePdsStore, PersonalDataSheetPayload } from '@/stores/pds.store.ts'
import { useToast } from 'primevue/usetoast'
import { parseApiResponseError } from '@/utils/error-handle.ts'

import useVuelidate from '@vuelidate/core'
import WbInputText from '@/components/webkit/WbInputText.vue'
import WbInputNumber from '@/components/webkit/WbInputNumber.vue'
import WbCalendar from '@/components/webkit/WbCalendar.vue'
import WbDropdown from '@/components/webkit/WbDropdown.vue'
import WbInputMask from '@/components/webkit/WbInputMask.vue'
import Checkbox from 'primevue/checkbox'
import Button from 'primevue/button'

import RadioButton from 'primevue/radiobutton'
import WbAutoComplete from '@/components/webkit/WbAutoComplete.vue'
import { WbAutoCompleteOption, WbAutoCompleteOptionTrueValue } from '@/components/webkit/WbAutoComplete.vue'
import { useWbAutoCompleteHandleTrueValue } from '@/composables/wb-ui-components.ts'
import { bloodTypeOptions, SexTypeOptions, ExtensionTypeOptions } from '@/typings/employee-entry.types'
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/vue'
import { usePrependOrAppendOnce, isNotMoreThanYearsAgo } from '@/utils/helpers.js'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { TransitionRoot } from '@headlessui/vue'
import { ItemNumberResponse, PersonnelResponse } from '@/typings/models.types'
import { useRouter } from 'vue-router'
import { useRoute } from 'vue-router'
const getId = usePrependOrAppendOnce('pds-c1-section-form')

const libraryStore = useLibrariesStore()
const itemStore = useItemNumberStore()
const sgStore = useSalaryGradesStore()
const pdsStore = usePdsStore()
const toast = useToast()
const router = useRouter()
const route = useRoute()
const isMyPds = route.name === 'my-pds'

const currentlyEnrolledGraduate = ref(false)
const currentlyEnrolledVocational = ref(false)
const isPositionLoading = ref(false)
const isSameResidential = ref(false)
const isLoading = ref(true)
const activeToasts = ref<number>(0)
const maxToasts = 5

const selectedItemNo = ref<WbAutoCompleteOption | null>(null)
const selectedSalaryGrade = ref<WbAutoCompleteOption | null>(null)
const selectedOffice = ref<WbAutoCompleteOption | null>(null)
const selectedDivision = ref<WbAutoCompleteOption | null>(null)
const selectedSectionUnit = ref<WbAutoCompleteOption | null>(null)

/** Payload */
const payload = reactive<PersonalDataSheetPayload>({
  ...pdsStore.pdsInfo,
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
const isC1Loading = ref(false)
const errorDetails = ref<string[]>([])
const formIsSubmitting = ref(false)
const showErrorAlert = ref(false)
const IsBeingUpdated = ref(false)
const pdsErrors = ref()
const isPdsError = ref(false)
const errorMessage = ref()
const profileStore = useProfileStore()

onBeforeMount(async () => {
  addressesAreLoading.value = true
  await Promise.allSettled([
    profileStore.fetchProfile(),
    publicStore.fetchRegions(),
    publicStore.fetchProvinces(),
    publicStore.fetchCities(),
    publicStore.fetchBarangays(),
    libraryStore.fetchOffices(),
    libraryStore.fetchDivisions(),
    libraryStore.fetchSectionUnits(),
    libraryStore.fetchItems(),
    sgStore.fetchSalaryGrade(),
  ])

  addressesAreLoading.value = false
})

const { provinceOptions, cityOptions, barangayOptions } = storeToRefs(publicStore)
const filteredProvinceOptionsByRegion = useFilterByParentId(
  toRef(payload.individual_address_init, 'residential_region_id'),
  provinceOptions
)
const filteredCityOptionsByProvince = useFilterByParentId(
  toRef(payload.individual_address_init, 'residential_province_id'),
  cityOptions
)
const filteredBarangayOptionsByCity = useFilterByParentId(
  toRef(payload.individual_address_init, 'residential_citymun_id'),
  barangayOptions
)

const generateMessage = (fieldName: string): { required: string; maxLength: string } => ({
  required: `Please enter your ${fieldName.replace(/_/g, ' ')}`,
  maxLength: `${fieldName.replace(/_/g, ' ')} cannot exceed the maximum length`,
})

const globalStringMaxLength = import.meta.env.VITE_GLOBAL_STRING_MAX_LENGTH
const globalStringMaxLengthRule = helpers.withMessage(
  `Must not exceed ${globalStringMaxLength} characters`,
  maxLength(globalStringMaxLength)
)

const formRules = computed(() => ({
  $lazy: true,
  /** User Profile */
  employee: {
    item_id: {
      required: helpers.withMessage('Please choose the Item Number of this employee', required),
    },
    salary_grade_id: {
      required: helpers.withMessage('Please choose the salary grade for this item', required),
    },
    office_id: {
      required: helpers.withMessage('Please choose the office of the item', required),
    },
    division_id: {
      required: helpers.withMessage('Please choose the division of the item', required),
    },
    section_or_unit_id: {
      required: helpers.withMessage('Please choose the section/unit of the item', required),
    },
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
      date: helpers.withMessage('Invalid date format, please use YYYY-MM-DD', required),
      isNotTooOld: helpers.withMessage('Birthdate cannot be more than 130 years ago', isNotMoreThanYearsAgo(130)),
    },
    sex: {
      in: helpers.withMessage('Select a valid sex option: male or female', required),
    },
    /** Personnel Data Sheet */
    place_of_birth: {
      required: helpers.withMessage(() => generateMessage('place_of_birth').required, required),
      maxLength: helpers.withMessage(() => generateMessage('place_of_birth').maxLength, globalStringMaxLengthRule),
    },
    civil_status: {
      in: helpers.withMessage('Select a valid civil status from the list', required),
    },
    height: {
      maxLength: helpers.withMessage(() => generateMessage('height').maxLength, globalStringMaxLengthRule),
      regex: helpers.withMessage('Invalid height format. Please enter a valid height.', required),
    },
    weight: {
      maxLength: helpers.withMessage(() => generateMessage('weight').maxLength, globalStringMaxLengthRule),
      regex: helpers.withMessage('Invalid weight format. Please enter a valid weight.', required),
    },
    blood_type: {
      in: helpers.withMessage('Select a valid blood type from the list', required),
    },
    gsis_no: {
      maxLength: helpers.withMessage(() => generateMessage('gsis_no').maxLength, globalStringMaxLengthRule),
    },
    philhealth_no: {
      required: helpers.withMessage(() => generateMessage('philhealth_number').required, required),
      maxLength: helpers.withMessage(() => generateMessage('philhealth_no').maxLength, globalStringMaxLengthRule),
    },
    pag_ibig_no: {
      required: helpers.withMessage(() => generateMessage('pagibig').required, required),
      maxLength: helpers.withMessage(() => generateMessage('pag_ibig_no').maxLength, globalStringMaxLengthRule),
    },
    sss_no: {
      required: helpers.withMessage(() => generateMessage('sss_no').required, required),
      maxLength: helpers.withMessage(() => generateMessage('sss_no').maxLength, globalStringMaxLengthRule),
    },
    tin: {
      required: helpers.withMessage(() => generateMessage('tin').required, required),
      maxLength: helpers.withMessage(() => generateMessage('tin_no').maxLength, globalStringMaxLengthRule),
    },
    citizenship: {
      maxLength: helpers.withMessage(() => generateMessage('citizenship').maxLength, globalStringMaxLengthRule),
    },

    citizenship_acquisition: {
      required: helpers.withMessage(() => generateMessage('filipino_by').required, required),
      maxLength: helpers.withMessage(() => generateMessage('citizenship_acquisition').maxLength, globalStringMaxLengthRule),
    },
  },
  /** Personnel Contact Info */
  contact_info: {
    tel_no: {
      maxLength: helpers.withMessage(() => generateMessage('tin_no').maxLength, globalStringMaxLengthRule),
    },
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

  individual_family_spouse: {
    last_name: {
      maxLength: helpers.withMessage(() => generateMessage('spouse_last_name').maxLength, globalStringMaxLengthRule),
    },
    first_name: {
      maxLength: helpers.withMessage(() => generateMessage('spouse_first_name').maxLength, globalStringMaxLengthRule),
    },
    middle_name: {
      maxLength: helpers.withMessage(() => generateMessage('spouse_middle_name').maxLength, globalStringMaxLengthRule),
    },
    ext_name: {
      maxLength: helpers.withMessage(() => generateMessage('spouse_ext_name').maxLength, globalStringMaxLengthRule),
    },
    occupation: {
      maxLength: helpers.withMessage(() => generateMessage('spouse_occupation').maxLength, globalStringMaxLengthRule),
    },
    employers_business_name: {
      maxLength: helpers.withMessage(() => generateMessage('spouse_business_name').maxLength, globalStringMaxLengthRule),
    },
    business_address: {
      maxLength: helpers.withMessage(() => generateMessage('spouse_business_address').maxLength, globalStringMaxLengthRule),
    },
    telephone_no: {
      maxLength: helpers.withMessage(() => generateMessage('spouse_telephone_no').maxLength, globalStringMaxLengthRule),
    },
  },
  individual_family_father: {
    last_name: {
      required: helpers.withMessage(() => generateMessage('father_last_name').required, required),
      maxLength: helpers.withMessage(() => generateMessage('father_last_name').maxLength, globalStringMaxLengthRule),
    },
    first_name: {
      required: helpers.withMessage(() => generateMessage('father_first_name').required, required),
      maxLength: helpers.withMessage(() => generateMessage('father_first_name').maxLength, globalStringMaxLengthRule),
    },
    middle_name: {
      maxLength: helpers.withMessage(() => generateMessage('father_middle_name').maxLength, globalStringMaxLengthRule),
    },
    ext_name: {
      maxLength: helpers.withMessage(() => generateMessage('father_ext_name').maxLength, globalStringMaxLengthRule),
    },
  },
  individual_family_mothers_maiden: {
    last_name: {
      required: helpers.withMessage(() => generateMessage('mother_last_name').required, required),
      maxLength: helpers.withMessage(() => generateMessage('mother_last_name').maxLength, globalStringMaxLengthRule),
    },
    first_name: {
      required: helpers.withMessage(() => generateMessage('mother_first_name').required, required),
      maxLength: helpers.withMessage(() => generateMessage('mother_first_name').maxLength, globalStringMaxLengthRule),
    },
    middle_name: {
      maxLength: helpers.withMessage(() => generateMessage('mother_middle_name').maxLength, globalStringMaxLengthRule),
    },
    ext_name: {
      maxLength: helpers.withMessage(() => generateMessage('mother_ext_name').maxLength, globalStringMaxLengthRule),
    },
  },
  individual_family_children: payload.individual_family_children.map(() => ({
    last_name: {
      maxLength: helpers.withMessage(() => generateMessage('child_last_name').maxLength, globalStringMaxLengthRule),
    },
    first_name: {
      maxLength: helpers.withMessage(() => generateMessage('child_first_name').maxLength, globalStringMaxLengthRule),
    },
    middle_name: {
      maxLength: helpers.withMessage(() => generateMessage('child_middle_name').maxLength, globalStringMaxLengthRule),
    },
    ext_name: {
      maxLength: helpers.withMessage(() => generateMessage('child_ext_name').maxLength, globalStringMaxLengthRule),
    },
    date_of_birth: {
      maxLength: helpers.withMessage(() => generateMessage('child_date_of_birth').maxLength, globalStringMaxLengthRule),
      isNotTooOld: helpers.withMessage('Birthdate cannot be more than 130 years ago', isNotMoreThanYearsAgo(130)),
    },
  })),
  educations: {
    elementary: {
      schools_name: {
        required: helpers.withMessage(() => generateMessage('elementary_school_name').required, required),
        maxLength: helpers.withMessage(() => generateMessage('elementary_school_name').maxLength, globalStringMaxLengthRule),
      },
      education_description: {
        required: helpers.withMessage(() => generateMessage('elementary_basic_education_degree_course').required, required),
        maxLength: helpers.withMessage(
          () => generateMessage('elementary_basic_education_degree_course').maxLength,
          globalStringMaxLengthRule
        ),
      },
      period_of_attendance_from: {
        required: helpers.withMessage(() => generateMessage('elementary_from').required, required),
        maxLength: helpers.withMessage(() => generateMessage('elementary_from').maxLength, globalStringMaxLengthRule),
      },
      period_of_attendance_to: {
        required: helpers.withMessage(() => generateMessage('elementary_to').required, required),
        maxLength: helpers.withMessage(() => generateMessage('elementary_to').maxLength, globalStringMaxLengthRule),
      },
      highest_level_units_earned: {
        maxLength: helpers.withMessage(() => generateMessage('highest_level_units_earned').maxLength, globalStringMaxLengthRule),
      },
      year_graduated: {
        required: helpers.withMessage(() => generateMessage('year_graduated').required, required),
        maxLength: helpers.withMessage(() => generateMessage('year_graduated').maxLength, globalStringMaxLengthRule),
      },
      scholarship_academic_honors_received: {
        maxLength: helpers.withMessage(() => generateMessage('year_graduated').maxLength, globalStringMaxLengthRule),
      },
    },
    high_school: {
      schools_name: {
        required: helpers.withMessage(() => generateMessage('high_school_name').required, required),
        maxLength: helpers.withMessage(() => generateMessage('high_school_name').maxLength, globalStringMaxLengthRule),
      },
      education_description: {
        required: helpers.withMessage(() => generateMessage('high_school_basic_education_degree_course').required, required),
        maxLength: helpers.withMessage(
          () => generateMessage('high_school_basic_education_degree_course').maxLength,
          globalStringMaxLengthRule
        ),
      },
      period_of_attendance_from: {
        required: helpers.withMessage(() => generateMessage('high_school_from').required, required),
        maxLength: helpers.withMessage(() => generateMessage('high_school_from').maxLength, globalStringMaxLengthRule),
      },
      period_of_attendance_to: {
        required: helpers.withMessage(() => generateMessage('high_school_to').required, required),
        maxLength: helpers.withMessage(() => generateMessage('schools_name_to').maxLength, globalStringMaxLengthRule),
      },
      highest_level_units_earned: {
        maxLength: helpers.withMessage(() => generateMessage('highest_level_units_earned').maxLength, globalStringMaxLengthRule),
      },
      year_graduated: {
        required: helpers.withMessage(() => generateMessage('year_graduated').required, required),
        maxLength: helpers.withMessage(() => generateMessage('year_graduated').maxLength, globalStringMaxLengthRule),
      },
      scholarship_academic_honors_received: {
        maxLength: helpers.withMessage(() => generateMessage('year_graduated').maxLength, globalStringMaxLengthRule),
      },
    },
    vocational: {
      schools_name: {
        maxLength: helpers.withMessage(() => generateMessage('elementary_school_name').maxLength, globalStringMaxLengthRule),
      },
      education_description: {
        maxLength: helpers.withMessage(
          () => generateMessage('elementary_basic_education_degree_course').maxLength,
          globalStringMaxLengthRule
        ),
      },
      period_of_attendance_from: {
        maxLength: helpers.withMessage(() => generateMessage('elementary_from').maxLength, globalStringMaxLengthRule),
      },
      period_of_attendance_to: {
        maxLength: helpers.withMessage(() => generateMessage('elementary_to').maxLength, globalStringMaxLengthRule),
      },
      highest_level_units_earned: {
        maxLength: helpers.withMessage(() => generateMessage('highest_level_units_earned').maxLength, globalStringMaxLengthRule),
      },
      year_graduated: {
        maxLength: helpers.withMessage(() => generateMessage('year_graduated').maxLength, globalStringMaxLengthRule),
      },
      scholarship_academic_honors_received: {
        maxLength: helpers.withMessage(() => generateMessage('year_graduated').maxLength, globalStringMaxLengthRule),
      },
    },
    college: {
      schools_name: {
        required: helpers.withMessage(() => generateMessage('college_name').required, required),
        maxLength: helpers.withMessage(() => generateMessage('college_name').maxLength, globalStringMaxLengthRule),
      },
      education_description: {
        required: helpers.withMessage(() => generateMessage('college_basic_education_degree_course').required, required),
        maxLength: helpers.withMessage(
          () => generateMessage('college_basic_education_degree_course').maxLength,
          globalStringMaxLengthRule
        ),
      },
      period_of_attendance_from: {
        required: helpers.withMessage(() => generateMessage('college_from').required, required),
        maxLength: helpers.withMessage(() => generateMessage('college_from').maxLength, globalStringMaxLengthRule),
      },
      period_of_attendance_to: {
        required: helpers.withMessage(() => generateMessage('college_to').required, required),
        maxLength: helpers.withMessage(() => generateMessage('college_to').maxLength, globalStringMaxLengthRule),
      },
      highest_level_units_earned: {
        maxLength: helpers.withMessage(() => generateMessage('highest_level_units_earned').maxLength, globalStringMaxLengthRule),
      },
      year_graduated: {
        required: helpers.withMessage(() => generateMessage('year_graduated').required, required),
        maxLength: helpers.withMessage(() => generateMessage('year_graduated').maxLength, globalStringMaxLengthRule),
      },
      scholarship_academic_honors_received: {
        maxLength: helpers.withMessage(() => generateMessage('year_graduated').maxLength, globalStringMaxLengthRule),
      },
    },
    graduate: {
      schools_name: {
        maxLength: helpers.withMessage(() => generateMessage('graduate_school_name').maxLength, globalStringMaxLengthRule),
      },
      education_description: {
        maxLength: helpers.withMessage(
          () => generateMessage('graduate_basic_education_degree_course').maxLength,
          globalStringMaxLengthRule
        ),
      },
      period_of_attendance_from: {
        maxLength: helpers.withMessage(() => generateMessage('graduate_from').maxLength, globalStringMaxLengthRule),
      },
      period_of_attendance_to: {
        maxLength: helpers.withMessage(() => generateMessage('graduate_to').maxLength, globalStringMaxLengthRule),
      },
      highest_level_units_earned: {
        maxLength: helpers.withMessage(() => generateMessage('highest_level_units_earned').maxLength, globalStringMaxLengthRule),
      },
      year_graduated: {
        maxLength: helpers.withMessage(() => generateMessage('year_graduated').maxLength, globalStringMaxLengthRule),
      },
      scholarship_academic_honors_received: {
        maxLength: helpers.withMessage(() => generateMessage('year_graduated').maxLength, globalStringMaxLengthRule),
      },
    },
  },
}))

const validator = useVuelidate<PersonalDataSheetPayload>(formRules, payload)

// defineProps({
//   activeSubTab: {
//     type: Number,
//     default: undefined,
//   },
// })

watch(isSameResidential, (newVal) => {
  if (newVal === true) {
    selectedPermanentRegion.value = selectedResidentialRegion.value
    selectedPermanentProvince.value = selectedResidentialProvince.value
    selectedPermanentCity.value = selectedResidentialCity.value
    selectedPermanentBarangay.value = selectedResidentialBarangay.value
    payload.individual_address_init.permanent_house_block_lot_no = payload.individual_address_init.residential_house_block_lot_no
    payload.individual_address_init.permanent_street = payload.individual_address_init.residential_street
    payload.individual_address_init.permanent_subdivision_village =
      payload.individual_address_init.residential_subdivision_village
    payload.individual_address_init.permanent_zip_code = payload.individual_address_init.residential_zip_code
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

watch(
  () => payload.individual_address_init.residential_region_id,
  (newSelectedItem) => {
    if (!newSelectedItem) {
      selectedResidentialRegion.value = null
      return
    }
  }
)

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

watch(
  () => payload.individual.birthday,
  (newBday) => {
    if (newBday !== null) {
      const dateBday = new Date(newBday).toLocaleDateString('default', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Manila',
      })

      const formatBday = dateBday.split('/')
      payload.individual.birthday = `${formatBday[2]}-${formatBday[0]}-${formatBday[1]}`
    }
  }
)

const isSingle = computed(() => payload.individual.civil_status === 'Single')

const propPosition = async () => {
  // Wait for the payload to be ready
  if (!payload?.employee?.item_id) return

  isPositionLoading.value = true

  try {
    const itemResp = await itemStore.fetchItemNumberById(payload.employee.item_id)

    if (itemResp?.success && itemResp.data) {
      const itemRespData = itemResp.data as ItemNumberResponse
      payload.employee.position = itemRespData.position?.title ?? null
    } else {
      payload.employee.position = null
    }
  } catch (error) {
    console.error('[propPosition] Failed to fetch item:', error)
    payload.employee.position = null
  } finally {
    isPositionLoading.value = false
  }
}

watch(
  () => payload.employee.item_id,
  (newId) => {
    if (newId) propPosition()
  },
  { immediate: true }
)

watch(
  () => payload.individual.civil_status,
  (newStatus) => {
    const spouse = payload.individual_family_spouse

    if (newStatus === 'Single') {
      spouse.first_name = 'N/A'
      spouse.middle_name = 'N/A'
      spouse.last_name = 'N/A'
      spouse.ext_name = 'N/A'
      spouse.occupation = 'N/A'
      spouse.employers_business_name = 'N/A'
      spouse.business_address = 'N/A'
      spouse.telephone_no = 'N/A'
    } else {
      spouse.first_name = ''
      spouse.middle_name = ''
      spouse.last_name = ''
      spouse.ext_name = ''
      spouse.occupation = ''
      spouse.employers_business_name = ''
      spouse.business_address = ''
      spouse.telephone_no = ''
    }
  },
  { immediate: true }
)

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

watch(
  () => selectedPermanentProvince.value,
  (newSelectedItem) => {
    if (!newSelectedItem) {
      selectedPermanentRegion.value = null
      payload.individual_address_init.permanent_province_id = null
    } else {
      payload.individual_address_init.permanent_province_id = newSelectedItem.value
    }
  }
)

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

watch(
  () => selectedPermanentCity.value,
  (newSelectedItem) => {
    if (!newSelectedItem) {
      selectedPermanentRegion.value = null
      payload.individual_address_init.permanent_citymun_id = null
    } else {
      payload.individual_address_init.permanent_citymun_id = newSelectedItem.value
    }
  }
)

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

watch(
  () => selectedPermanentBarangay.value,
  (newSelectedItem) => {
    if (!newSelectedItem) {
      selectedPermanentRegion.value = null
      payload.individual_address_init.permanent_brgy_id = null
    } else {
      payload.individual_address_init.permanent_brgy_id = newSelectedItem.value
    }
  }
)

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

watch(
  () => payload.employee.agency_employee_no,
  (newAgencyNo) => {
    payload.employee.id_number = newAgencyNo || null
  }
)

watch(
  () => payload.employee.item_id,
  (newId) => {
    if (!newId) {
      selectedItemNo.value = null
      return
    }

    const existing = libraryStore.itemsOptions.find((opt) => opt.value === newId)

    if (existing) {
      selectedItemNo.value = existing
      propPosition()
    } else {
      const unwatch = watch(
        () => libraryStore.itemsOptions,
        (options) => {
          const found = options.find((opt) => opt.value === newId)
          if (found) {
            selectedItemNo.value = found
            propPosition()
            unwatch()
          }
        },
        { immediate: true }
      )
    }
  },
  { immediate: true }
)

watch(
  () => payload.employee.salary_grade_id,
  (newSelected) => {
    if (!newSelected) {
      selectedSalaryGrade.value = null
      return
    }

    const selectedId = typeof newSelected === 'object' && newSelected !== null ? newSelected.id : newSelected

    const existing = sgStore.salaryGradesOptions.find((opt) => opt.value === selectedId)

    if (existing) {
      selectedSalaryGrade.value = existing
    } else {
      const unwatch = watch(
        () => sgStore.salaryGradesOptions,
        (options) => {
          const found = options.find((opt) => opt.value === selectedId)
          if (found) {
            selectedSalaryGrade.value = found
            unwatch()
          }
        },
        { immediate: true }
      )
    }
  },
  { immediate: true }
)

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

watch(
  () => payload.employee.division_id,
  (newSelectedId) => {
    if (!newSelectedId) {
      selectedDivision.value = null
      return
    }

    const existing = libraryStore.divisionOptions.find((opt) => opt.value === newSelectedId)
    if (existing) {
      selectedDivision.value = existing
    } else {
      const unwatch = watch(
        () => libraryStore.divisionOptions,
        (options) => {
          const found = options.find((opt) => opt.value === newSelectedId)
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

watch(
  () => payload.educations.elementary.period_of_attendance_to,
  (newVal) => {
    if (newVal) {
      payload.educations.elementary.year_graduated = newVal
    }
  }
)

watch(
  () => payload.educations.high_school.period_of_attendance_to,
  (newVal) => {
    if (newVal) {
      payload.educations.high_school.year_graduated = newVal
    }
  }
)

watch(currentlyEnrolledGraduate, (newVal) => {
  if (newVal) {
    currentlyEnrolledVocational.value = false
    payload.educations.vocational.is_current_enrolled = false
  }

  payload.educations.graduate.is_current_enrolled = newVal
  if (newVal) payload.educations.graduate.period_of_attendance_to = null
})

watch(currentlyEnrolledVocational, (newVal) => {
  if (newVal) {
    currentlyEnrolledGraduate.value = false
    payload.educations.graduate.is_current_enrolled = false
  }

  payload.educations.vocational.is_current_enrolled = newVal
  if (newVal) payload.educations.vocational.period_of_attendance_to = null
})

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
    }, 5000)
  }
}

const handleAdditionalChild = () => {
  payload.individual_family_children?.push({
    first_name: null,
    last_name: null,
    middle_name: null,
    ext_name: null,
    occupation: null,
    employers_business_name: null,
    business_address: null,
    telephone_no: null,
    class: 'Children',
    date_of_birth: null,
  })
}

const handleRemoveChild = (childIndex: number) => {
  payload.individual_family_children?.splice(childIndex, 1)
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
      console.log('Fetched PDS data:', response.data) // ✅ Console log added
      pdsStore.updatePdsFromPersonnel(response.data as PersonnelResponse)
    } else {
      console.warn('Failed to fetch PDS by ID or response unsuccessful.')
    }
  }

  isLoading.value = false
})

watch(
  () => props.personnelPds, // assumes props.personnel is of type PersonnelEmployeeResponse | null
  (newPersonnel) => {
    if (newPersonnel) {
      pdsStore.updatePdsFromPersonnel(newPersonnel)
    } else {
      for (const key in payload.individual) {
        payload.individual[key as keyof typeof payload.individual] = null
        payload.contact_info[key as keyof typeof payload.contact_info] = null
        payload.individual_address_init[key as keyof typeof payload.individual_address_init] = null
      }
    }
  },
  { immediate: true }
)

const updateC1Form = async () => {
  IsBeingUpdated.value = true
  const id = route.params.id as string

  formIsSubmitting.value = true
  const response = await pdsStore.updatePds(
    { ...payload }, // only payload properties
    id,
    'C1' // pass form_type as a separate argument if your store expects it
  )

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
}

// ──────────────────────────────────────────────────────────
//          PDS Details Form - Save Handler
// ──────────────────────────────────────────────────────────
const handleSaveC1Form = async () => {
  isC1Loading.value = true
  const valid = await validator.value.$validate()
  if (!valid) {
    const hasEmployeeError = validator.value.employee?.$error
    const hasIndividualError = validator.value.individual?.$error
    const hasContactInfoError = validator.value.contact_info?.$error
    const hasAddressError = validator.value.individual_address_init?.$error
    const hasSpouseError = validator.value.individual_family_spouse?.$error
    const hasFatherError = validator.value.individual_family_father?.$error
    const hasMotherError = validator.value.individual_family_mothers_maiden?.$error
    const hasChildError = validator.value.individual_family_child?.$error
    const hasEducationError = validator.value.educations?.$error

    const errorFields: string[] = []
    if (hasEmployeeError) errorFields.push('Employee')
    if (hasIndividualError) errorFields.push('Individual')
    if (hasContactInfoError) errorFields.push('Contact Info')
    if (hasAddressError) errorFields.push('Address')
    if (hasSpouseError) errorFields.push('Spouse')
    if (hasFatherError) errorFields.push('Father')
    if (hasMotherError) errorFields.push('Mother')
    if (hasChildError) errorFields.push('Child')
    if (hasEducationError) errorFields.push('Education')

    const tabList = errorFields.join(', ')
    showToast('error', 'Validation Error', `Please check the following section(s): ${tabList}`)

    isC1Loading.value = false
    return { valid: false, errorTabs: ['C1'] }
  }

  /** Propagate indiividual family to required payload */
  const families = [{ ...payload.individual_family_father }, { ...payload.individual_family_mothers_maiden }]

  if (
    typeof payload.individual_family_spouse.last_name?.trim() !== 'undefined' ||
    payload.individual_family_spouse.last_name !== null
  ) {
    families.concat({ ...payload.individual_family_spouse })
  }

  if (
    typeof payload.individual_family_children[0].last_name?.trim() !== 'undefined' ||
    payload.individual_family_children[0].last_name !== null
  ) {
    payload.individual_family = families.concat(payload.individual_family_children)
  }
  payload.individual_family = families

  /** propagate individual address to match payload */
  payload.individual_address = [{ ...payload.individual_address_init }]

  /** propagate individual contact */
  payload.individual_contact_info = [{ ...payload.contact_info }]

  /** propagae educ background */
  payload.individual_educational_background = [
    { ...payload.educations.elementary },
    { ...payload.educations.high_school },
    { ...payload.educations.college },
  ]
  if (payload.educations.vocational.schools_name !== null) {
    payload.individual_educational_background.push({ ...payload.educations.vocational })
  }
  if (payload.educations.vocational.schools_name !== null) {
    payload.individual_educational_background.push({ ...payload.educations.graduate })
  }

  console.log(validator.value)
  if (!valid) return (isC1Loading.value = false)

  const response = await pdsStore.savePds(payload)

  if (response.success === false) {
    const result = parseApiResponseError(response)

    isPdsError.value = true
    errorMessage.value = result?.message
    pdsErrors.value = result?.errors
    showToast('error', 'PDS Error', 'Pease see the validation messages')
  } else {
    showToast('success', 'PDS', 'PDS has been saved')
    router.push({ name: 'employment' })
  }

  isC1Loading.value = false
}

const c1Tabs = ref([
  { name: 'Personal Information', index: 0 },
  { name: 'Family Background', index: 1 },
  { name: 'Educational Background', index: 2 },
])

defineExpose({
  handleSaveC1Form,
  updateC1Form,
})
</script>

<template>
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
                    : 'border-surface-300 text-surface-400 hover:bg-white/[0.12]',
                ]"
              >
                {{ subSection.name }}
              </button>
            </Tab>
          </TabList>

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
                      <Message v-if="isPdsError" :closable="false" severity="error" class="h-96 space-y-4 overflow-y-auto">
                        <span>{{ errorMessage }}</span>
                        <div class="text-md flex flex-col space-y-2">
                          <div v-for="error in pdsErrors" :key="error.field" class="mt-0.5">{{ '- ' + error }}</div>
                        </div>
                      </Message>
                    </transition>
                  </div>

                  <!-- START ITEM NUMBER Fields as HR PPMS -->
                  <template v-if="true">
                    <div class="flex flex-row items-center justify-center gap-4">
                      <WbAutoComplete
                        :useApiFilter="true"
                        :apiEndpoint="'/items/search'"
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
                        :disabled="isMyPds"
                        @on-true-value-computed="
                          (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                            useWbAutoCompleteHandleTrueValue(value, toRef(payload.employee, 'item_id'))
                        "
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :invalid="validator.employee.item_id.$invalid"
                        :invalid-text="validator.employee.item_id.$errors[0]?.$message"
                        @blur="validator.employee.item_id.$touch"
                        @focusin="validator.employee.item_id.$dirty = false"
                      >
                      </WbAutoComplete>

                      <RouterLink
                        v-if="!isMyPds"
                        :to="{ name: 'support', state: { from: 'recruitment' } }"
                        v-tooltip.top="'Add Item Number'"
                      >
                        <FontAwesomeIcon icon="fa-solid fa-plus" class="mt-8 text-3xl font-bold text-primary-500" />
                      </RouterLink>
                    </div>

                    <WbInputText
                      v-model="payload.employee.position"
                      :id="getId('input-item-position')"
                      label="Position"
                      :loading="isPositionLoading"
                      readonly
                      placeholder="Position will be auto populated upon item number selection"
                      class="lg:text-md lg:placeholder:text-md cursor-not-allowed bg-surface-200 text-sm placeholder:text-sm read-only:cursor-not-allowed disabled:cursor-not-allowed"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                    />

                    <WbAutoComplete
                      :useApiFilter="true"
                      :apiEndpoint="'libraries/salary-grades/search'"
                      :suggestions="sgStore.salaryGradesOptions"
                      apiOptionLabel="salary_grade"
                      label="Salary Grade"
                      placeholder="Type Salary Grade with its tranche here"
                      v-model="selectedSalaryGrade"
                      :id="getId('input-salary-grade')"
                      optionLabel="label"
                      optionValue="value"
                      required
                      :disabled="isMyPds"
                      @on-true-value-computed="
                        (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                          useWbAutoCompleteHandleTrueValue(value, toRef(payload.employee, 'salary_grade_id'))
                      "
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :invalid="validator.employee.salary_grade_id.$invalid"
                      :invalid-text="validator.employee.salary_grade_id.$errors[0]?.$message"
                      @blur="validator.employee.salary_grade_id.$touch"
                      @focusin="validator.employee.salary_grade_id.$dirty = false"
                    >
                    </WbAutoComplete>

                    <div class="flex flex-col gap-2 md:flex-row md:gap-4">
                      <WbAutoComplete
                        :useApiFilter="true"
                        :apiEndpoint="'/libraries/offices/search'"
                        :suggestions="libraryStore.officeOptions"
                        :loading="libraryStore.officeOptionsLoading"
                        apiOptionLabel="name"
                        label="Office"
                        placeholder="Type the Employee's Office to search and select"
                        v-model="selectedOffice"
                        :id="getId('input-office')"
                        optionLabel="label"
                        optionValue="value"
                        required
                        :disabled="isMyPds"
                        forceSelection
                        @on-true-value-computed="
                          (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                            useWbAutoCompleteHandleTrueValue(value, toRef(payload.employee, 'office_id'))
                        "
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :invalid="validator.employee.office_id.$invalid"
                        :invalid-text="validator.employee.office_id.$errors[0]?.$message"
                        @blur="validator.employee.office_id.$touch"
                        @focusin="validator.employee.office_id.$dirty = false"
                      >
                      </WbAutoComplete>
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
                        :disabled="isMyPds"
                        @on-true-value-computed="
                          (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                            useWbAutoCompleteHandleTrueValue(value, toRef(payload.employee, 'division_id'))
                        "
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :invalid="validator.employee.division_id.$invalid"
                        :invalid-text="validator.employee.division_id.$errors[0]?.$message"
                        @blur="validator.employee.division_id.$touch"
                        @focusin="validator.employee.division_id.$dirty = false"
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
                        :disabled="isMyPds"
                        @on-true-value-computed="
                          (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                            useWbAutoCompleteHandleTrueValue(value, toRef(payload.employee, 'section_or_unit_id'))
                        "
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :invalid="validator.employee.section_or_unit_id.$invalid"
                        :invalid-text="validator.employee.section_or_unit_id.$errors[0]?.$message"
                        @blur="validator.employee.section_or_unit_id.$touch"
                        @focusin="validator.employee.section_or_unit_id.$dirty = false"
                      >
                      </WbAutoComplete>
                    </div>
                  </template>
                  <!-- END ITEM NUMBER Fields as HR PPMS -->

                  <!-- START PERSONAL INFO -->
                  <div class="mt-6 grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-2">
                    <WbInputText
                      v-model="payload.individual.last_name"
                      label="Surname"
                      required
                      :disabled="isMyPds"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
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
                      :disabled="isMyPds"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :invalid="validator.individual.first_name.$invalid"
                      :invalid-text="validator.individual.first_name.$errors[0]?.$message"
                      @blur="validator.individual.first_name.$touch"
                    >
                    </WbInputText>
                    <WbInputText
                      v-model="payload.individual.middle_name"
                      label="Middle Name"
                      :disabled="isMyPds"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
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
                      :disabled="isMyPds"
                      label="Extension Name"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :invalid="validator.individual.ext_name.$invalid"
                      :invalid-text="validator.individual.ext_name.$errors[0]?.$message"
                      @blur="validator.individual.ext_name.$touch"
                    >
                    </WbDropdown>

                    <WbCalendar
                      v-model="payload.individual.birthday"
                      dateFormat="yy-mm-dd"
                      :maxDate="new Date()"
                      required
                      :disabled="isMyPds"
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

                    <WbInputText
                      v-model="payload.individual.place_of_birth"
                      label="Place of Birth"
                      required
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :disabled="isMyPds"
                      :invalid="validator.individual.place_of_birth.$invalid"
                      :invalid-text="validator.individual.place_of_birth.$errors[0]?.$message"
                      @blur="validator.individual.place_of_birth.$touch"
                    >
                    </WbInputText>

                    <WbDropdown
                      v-model="payload.individual.sex"
                      required
                      :options="SexTypeOptions"
                      optionLabel="label"
                      optionValue="value"
                      label="Sex"
                      :disabled="isMyPds"
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
                            :disabled="isMyPds"
                          />
                          <label :for="getId('input-citizenship-fil')" class="ml-2 cursor-pointer">Filipino</label>
                        </div>
                        <div class="flex items-center">
                          <RadioButton
                            v-model="payload.individual.citizenship"
                            :id="getId('input-citizenship-dual')"
                            name="citizenship"
                            value="Dual Citizenship"
                            :disabled="isMyPds"
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
                      :disabled="isMyPds"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      :invalid="validator.individual.civil_status.$invalid"
                      :invalid-text="validator.individual.civil_status.$errors[0]?.$message"
                      @blur="validator.individual.civil_status.$touch"
                    >
                      <template #prepend-icon>
                        <FontAwesomeIcon icon="fa-solid fa-people-arrows" />
                      </template>
                    </WbDropdown>

                    <WbDropdown
                      v-model="payload.individual.citizenship_acquisition"
                      required
                      :options="libraryStore.citizenshipAcquisitionOptions"
                      optionLabel="label"
                      optionValue="value"
                      label="Filipino by"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      :disabled="isMyPds"
                      :invalid="validator.individual.citizenship_acquisition.$invalid"
                      :invalid-text="validator.individual.citizenship_acquisition.$errors[0]?.$message"
                      @blur="validator.individual.citizenship_acquisition.$touch"
                    >
                      <template #prepend-icon>
                        <FontAwesomeIcon icon="fa-solid fa-house-flag" />
                      </template>
                    </WbDropdown>
                    <WbInputNumber
                      v-model="payload.individual.height"
                      label="Height (m)"
                      placeholder="Height in meters"
                      suffix=" m"
                      required
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :invalid="validator.individual.height.$invalid"
                      :invalid-text="validator.individual.height.$errors[0]?.$message"
                      @blur="validator.individual.height.$touch"
                    >
                      <template #prepend-icon>
                        <FontAwesomeIcon icon="fa-solid fa-ruler-vertical" />
                      </template>
                    </WbInputNumber>

                    <WbDropdown
                      v-model="payload.individual.blood_type"
                      required
                      :options="bloodTypeOptions"
                      optionLabel="label"
                      optionValue="value"
                      label="Blood Type"
                      :disabled="isMyPds"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      :invalid="validator.individual.blood_type.$invalid"
                      :invalid-text="validator.individual.blood_type.$errors[0]?.$message"
                      @blur="validator.individual.blood_type.$touch"
                    >
                      <template #prepend-icon>
                        <FontAwesomeIcon icon="fa-solid fa-droplet" />
                      </template>
                    </WbDropdown>

                    <WbInputNumber
                      v-model="payload.individual.weight"
                      label="Weight (kg)"
                      placeholder="Weight in kilos"
                      suffix=" kg"
                      required
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :invalid="validator.individual.weight.$invalid"
                      :invalid-text="validator.individual.weight.$errors[0]?.$message"
                      @blur="validator.individual.weight.$touch"
                    >
                      <template #prepend-icon>
                        <FontAwesomeIcon icon="fa-solid fa-weight-scale" />
                      </template>
                    </WbInputNumber>

                    <WbInputText
                      v-model="payload.individual.gsis_no"
                      label="GSIS ID No."
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      :disabled="isMyPds"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :invalid="validator.individual.gsis_no.$invalid"
                      :invalid-text="validator.individual.gsis_no.$errors[0]?.$message"
                      @blur="validator.individual.gsis_no.$touch"
                    >
                    </WbInputText>

                    <WbInputText
                      v-model="payload.individual.pag_ibig_no"
                      label="PAG-IBIG ID No."
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :disabled="isMyPds"
                      :invalid="validator.individual.pag_ibig_no.$invalid"
                      :invalid-text="validator.individual.pag_ibig_no.$errors[0]?.$message"
                      @blur="validator.individual.pag_ibig_no.$touch"
                    >
                    </WbInputText>
                    <WbInputText
                      v-model="payload.individual.philhealth_no"
                      required
                      label="PHILHEALTH No."
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :disabled="isMyPds"
                      :invalid="validator.individual.philhealth_no.$invalid"
                      :invalid-text="validator.individual.philhealth_no.$errors[0]?.$message"
                      @blur="validator.individual.philhealth_no.$touch"
                    >
                    </WbInputText>
                    <WbInputText
                      v-model="payload.individual.tin"
                      required
                      label="TIN"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :disabled="isMyPds"
                      :invalid="validator.individual.tin.$invalid"
                      :invalid-text="validator.individual.tin.$errors[0]?.$message"
                      @blur="validator.individual.tin.$touch"
                    >
                    </WbInputText>
                    <WbInputText
                      v-model="payload.individual.sss_no"
                      label="SSS No."
                      required
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :disabled="isMyPds"
                      :invalid="validator.individual.sss_no.$invalid"
                      :invalid-text="validator.individual.sss_no.$errors[0]?.$message"
                      @blur="validator.individual.sss_no.$touch"
                    >
                    </WbInputText>
                    <WbInputMask
                      v-model="payload.contact_info.mobile_no"
                      required
                      label="Mobile Number"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      mask="+639999999999"
                      placeholder="+63 XXX XXX XXXX"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :disabled="isMyPds"
                      :invalid="validator.contact_info.mobile_no.$invalid"
                      :invalid-text="validator.contact_info.mobile_no.$errors[0]?.$message"
                      @blur="validator.contact_info.mobile_no.$touch"
                      @focusin="validator.contact_info.mobile_no.$dirty = false"
                    >
                      <template #prepend-icon>
                        <FontAwesomeIcon icon="fa-solid fa-mobile" />
                      </template>
                    </WbInputMask>
                    <WbInputMask
                      v-model="payload.contact_info.tel_no"
                      label="Telephone Number"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      mask="(999) 999-9999"
                      placeholder="(072) 687-8000"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :disabled="isMyPds"
                      :invalid="validator.contact_info.tel_no.$invalid"
                      :invalid-text="validator.contact_info.tel_no.$errors[0]?.$message"
                      @blur="validator.contact_info.tel_no.$touch"
                      @focusin="validator.contact_info.tel_no.$dirty = false"
                    >
                      <template #prepend-icon>
                        <FontAwesomeIcon icon="fa-solid fa-phone" />
                      </template>
                    </WbInputMask>
                    <WbInputText
                      v-model="payload.employee.agency_employee_no"
                      required
                      label="Agency Employee No."
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :disabled="isMyPds"
                      :invalid="validator.employee.agency_employee_no.$invalid"
                      :invalid-text="validator.employee.agency_employee_no.$errors[0]?.$message"
                      @blur="validator.employee.agency_employee_no.$touch"
                    >
                    </WbInputText>
                    <WbInputText
                      v-model="payload.contact_info.email_address"
                      required
                      label="Email Address"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :disabled="isMyPds"
                      :invalid="validator.contact_info.email_address.$invalid"
                      :invalid-text="validator.contact_info.email_address.$errors[0]?.$message"
                      @blur="validator.contact_info.email_address.$touch"
                    >
                      <template #prepend-icon>
                        <FontAwesomeIcon icon="fa-solid fa-square-envelope" />
                      </template>
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
                        required
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
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
                        :suggestions="filteredProvinceOptionsByRegion"
                        label=" Province "
                        required
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
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
                        :suggestions="filteredCityOptionsByProvince"
                        label=" City / Municipality "
                        required
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
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
                        :suggestions="filteredBarangayOptionsByCity"
                        label=" Barangay "
                        required
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        optionLabel="label"
                        :placeholder="'Select your Barangay'"
                        forceSelection
                        @on-true-value-computed="
                          (value: WbAutoCompleteOptionTrueValue) =>
                            useWbAutoCompleteHandleTrueValue(value, toRef(payload.individual_address_init, 'residential_brgy_id'))
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
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :invalid="validator.individual_address_init.residential_subdivision_village.$invalid"
                        :invalid-text="validator.individual_address_init.residential_subdivision_village.$errors[0]?.$message"
                        @blur="validator.individual_address_init.residential_subdivision_village.$touch"
                      >
                      </WbInputText>
                      <WbInputText
                        v-model="payload.individual_address_init.residential_street"
                        label="Street"
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :invalid="validator.individual_address_init.residential_street.$invalid"
                        :invalid-text="validator.individual_address_init.residential_street.$errors[0]?.$message"
                        @blur="validator.individual_address_init.residential_street.$touch"
                      >
                      </WbInputText>
                      <WbInputText
                        v-model="payload.individual_address_init.residential_house_block_lot_no"
                        label="House / Block / Lot No."
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :invalid="validator.individual_address_init.residential_house_block_lot_no.$invalid"
                        :invalid-text="validator.individual_address_init.residential_house_block_lot_no.$errors[0]?.$message"
                        @blur="validator.individual_address_init.residential_house_block_lot_no.$touch"
                      >
                      </WbInputText>
                      <WbInputText
                        v-model="payload.individual_address_init.residential_zip_code"
                        required
                        label="ZIP Code"
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
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
                      </div>
                      <WbAutoComplete
                        v-model="selectedPermanentRegion"
                        :suggestions="publicStore.regionOptions"
                        label=" Region "
                        required
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        optionLabel="label"
                        :disabled="isSameResidential"
                        :placeholder="'Select or Type your Region'"
                        forceSelection
                        @on-true-value-computed="
                          (value: WbAutoCompleteOptionTrueValue) =>
                            useWbAutoCompleteHandleTrueValue(value, toRef(payload.individual_address_init, 'permanent_region_id'))
                        "
                        :loading="publicStore.regionOptionsIsLoading"
                        dropdown
                        dropdownClass="bg-transparent"
                      >
                      </WbAutoComplete>
                      <WbAutoComplete
                        v-model="selectedPermanentProvince"
                        :suggestions="filteredProvinceOptionsByRegion"
                        label=" Province "
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        optionLabel="label"
                        :disabled="isSameResidential"
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
                        :suggestions="filteredCityOptionsByProvince"
                        label=" City / Municipality "
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        optionLabel="label"
                        :disabled="isSameResidential"
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
                        :suggestions="filteredBarangayOptionsByCity"
                        label=" Barangay "
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        optionLabel="label"
                        :disabled="isSameResidential"
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
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :disabled="isSameResidential"
                        :invalid="validator.individual_address_init.permanent_subdivision_village.$invalid"
                        :invalid-text="validator.individual_address_init.permanent_subdivision_village.$errors[0]?.$message"
                        @blur="validator.individual_address_init.permanent_subdivision_village.$touch"
                      >
                      </WbInputText>
                      <WbInputText
                        v-model="payload.individual_address_init.permanent_street"
                        label="Street"
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :disabled="isSameResidential"
                        :invalid="validator.individual_address_init.permanent_street.$invalid"
                        :invalid-text="validator.individual_address_init.permanent_street.$errors[0]?.$message"
                        @blur="validator.individual_address_init.permanent_street.$touch"
                      >
                      </WbInputText>
                      <WbInputText
                        v-model="payload.individual_address_init.permanent_house_block_lot_no"
                        label="House / Block / Lot No."
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :disabled="isSameResidential"
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
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :disabled="isSameResidential"
                        :invalid="validator.individual_address_init.permanent_zip_code.$invalid"
                        :invalid-text="validator.individual_address_init.permanent_zip_code.$errors[0]?.$message"
                        @blur="validator.individual_address_init.permanent_zip_code.$touch"
                      >
                      </WbInputText>
                    </div>
                  </div>
                  <!-- END PERMANENT ADDRESS -->
                </div>
              </TransitionRoot>
            </TabPanel>
            <!-- END PERSONAL INFO SECTION -->

            <!-- START FAMILY BACKGROUND -->
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
                  <span class="flex flex-col justify-center space-y-2 font-medium text-primary-700">
                    <p class="text-lg italic md:text-xl">Spouse</p>
                  </span>
                  <div class="flex flex-col gap-x-12 gap-y-4 md:flex-row">
                    <WbInputText
                      v-model="payload.individual_family_spouse.last_name"
                      label="Surname"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      :disabled="isSingle"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :invalid="validator.individual_family_spouse.last_name.$invalid"
                      :invalid-text="validator.individual_family_spouse.last_name.$errors[0]?.$message"
                      @blur="validator.individual_family_spouse.last_name.$touch"
                    />

                    <WbInputText
                      v-model="payload.individual_family_spouse.first_name"
                      label="First Name"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      :disabled="isSingle"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :invalid="validator.individual_family_spouse.first_name.$invalid"
                      :invalid-text="validator.individual_family_spouse.first_name.$errors[0]?.$message"
                      @blur="validator.individual_family_spouse.first_name.$touch"
                    />

                    <WbInputText
                      v-model="payload.individual_family_spouse.middle_name"
                      label="Middle Name"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      :disabled="isSingle"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :invalid="validator.individual_family_spouse.middle_name.$invalid"
                      :invalid-text="validator.individual_family_spouse.middle_name.$errors[0]?.$message"
                      @blur="validator.individual_family_spouse.middle_name.$touch"
                    />
                    <WbDropdown
                      v-model="payload.individual_family_spouse.ext_name"
                      optionLabel="label"
                      optionValue="value"
                      :options="ExtensionTypeOptions"
                      label="Extension Name"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      :disabled="isSingle"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :invalid="validator.individual_family_spouse.ext_name.$invalid"
                      :invalid-text="validator.individual_family_spouse.ext_name.$errors[0]?.$message"
                      @blur="validator.individual_family_spouse.ext_name.$touch"
                    />
                  </div>
                  <div class="flex flex-col gap-x-12 gap-y-4 md:flex-row">
                    <WbInputText
                      v-model="payload.individual_family_spouse.occupation"
                      label="Occupation"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      :disabled="isSingle"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :invalid="validator.individual_family_spouse.occupation.$invalid"
                      :invalid-text="validator.individual_family_spouse.occupation.$errors[0]?.$message"
                      @blur="validator.individual_family_spouse.occupation.$touch"
                    />

                    <WbInputText
                      v-model="payload.individual_family_spouse.employers_business_name"
                      label="Employer/Business Name"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      :disabled="isSingle"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :invalid="validator.individual_family_spouse.employers_business_name.$invalid"
                      :invalid-text="validator.individual_family_spouse.employers_business_name.$errors[0]?.$message"
                      @blur="validator.individual_family_spouse.employers_business_name.$touch"
                    />

                    <WbInputText
                      v-model="payload.individual_family_spouse.business_address"
                      label="Business Address"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      :disabled="isSingle"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :invalid="validator.individual_family_spouse.business_address.$invalid"
                      :invalid-text="validator.individual_family_spouse.business_address.$errors[0]?.$message"
                      @blur="validator.individual_family_spouse.business_address.$touch"
                    />

                    <WbInputText
                      v-model="payload.individual_family_spouse.telephone_no"
                      label="Telephone No"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      :disabled="isSingle"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :invalid="validator.individual_family_spouse.telephone_no.$invalid"
                      :invalid-text="validator.individual_family_spouse.telephone_no.$errors[0]?.$message"
                      @blur="validator.individual_family_spouse.telephone_no.$touch"
                    />
                  </div>
                  <span class="mt-2 flex flex-col justify-center space-y-2 font-medium text-primary-700">
                    <p class="text-lg italic md:text-xl">Father</p>
                  </span>
                  <div class="flex flex-col gap-x-12 gap-y-4 md:flex-row">
                    <WbInputText
                      v-model="payload.individual_family_father.last_name"
                      label="Surname"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      required
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :invalid="validator.individual_family_father.last_name.$invalid"
                      :invalid-text="validator.individual_family_father.last_name.$errors[0]?.$message"
                      @blur="validator.individual_family_father.last_name.$touch"
                    />

                    <WbInputText
                      v-model="payload.individual_family_father.first_name"
                      label="First Name"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      required
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :invalid="validator.individual_family_father.first_name.$invalid"
                      :invalid-text="validator.individual_family_father.first_name.$errors[0]?.$message"
                      @blur="validator.individual_family_father.first_name.$touch"
                    />

                    <WbInputText
                      v-model="payload.individual_family_father.middle_name"
                      label="Middle Name"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :invalid="validator.individual_family_father.middle_name.$invalid"
                      :invalid-text="validator.individual_family_father.middle_name.$errors[0]?.$message"
                      @blur="validator.individual_family_father.middle_name.$touch"
                    />

                    <WbDropdown
                      v-model="payload.individual_family_father.ext_name"
                      optionLabel="label"
                      optionValue="value"
                      :options="ExtensionTypeOptions"
                      label="Extension Name"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :invalid="validator.individual_family_father.ext_name.$invalid"
                      :invalid-text="validator.individual_family_father.ext_name.$errors[0]?.$message"
                      @blur="validator.individual_family_father.ext_name.$touch"
                    />
                  </div>

                  <span class="mt-2 flex flex-col justify-center space-y-2 font-medium text-primary-700">
                    <p class="text-lg italic md:text-xl">Mother's Maiden Name</p>
                  </span>
                  <div class="flex flex-col gap-x-12 gap-y-4 md:flex-row">
                    <WbInputText
                      v-model="payload.individual_family_mothers_maiden.last_name"
                      label="Surname"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      required
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :invalid="validator.individual_family_mothers_maiden.last_name.$invalid"
                      :invalid-text="validator.individual_family_mothers_maiden.last_name.$errors[0]?.$message"
                      @blur="validator.individual_family_mothers_maiden.last_name.$touch"
                    />

                    <WbInputText
                      v-model="payload.individual_family_mothers_maiden.first_name"
                      label="First Name"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      required
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :invalid="validator.individual_family_mothers_maiden.first_name.$invalid"
                      :invalid-text="validator.individual_family_mothers_maiden.first_name.$errors[0]?.$message"
                      @blur="validator.individual_family_mothers_maiden.first_name.$touch"
                    />

                    <WbInputText
                      v-model="payload.individual_family_mothers_maiden.middle_name"
                      label="Middle Name"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                      :invalid="validator.individual_family_mothers_maiden.middle_name.$invalid"
                      :invalid-text="validator.individual_family_mothers_maiden.middle_name.$errors[0]?.$message"
                      @blur="validator.individual_family_mothers_maiden.middle_name.$touch"
                    />
                  </div>

                  <span class="mt-2 flex flex-col justify-center font-medium text-primary-700">
                    <p class="text-lg italic md:text-xl">Children</p>
                  </span>

                  <template v-for="childIdx in payload.individual_family_children.length" :key="childIdx">
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
                      <div class="flex flex-col items-center gap-x-12 gap-y-4 md:flex-row">
                        <WbInputText
                          v-model="payload.individual_family_children[childIdx - 1].last_name"
                          label="Surname"
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :invalid="validator.individual_family_children?.[childIdx - 1]?.last_name?.$error"
                          :invalid-text="validator.individual_family_children?.[childIdx - 1]?.last_name?.$errors[0]?.$message"
                          @blur="validator.individual_family_children?.[childIdx - 1]?.last_name?.$touch()"
                        />

                        <WbInputText
                          v-model="payload.individual_family_children[childIdx - 1].first_name"
                          label="First Name"
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :invalid="validator.individual_family_children?.[childIdx - 1]?.first_name?.$error"
                          :invalid-text="validator.individual_family_children?.[childIdx - 1]?.first_name?.$errors[0]?.$message"
                          @blur="validator.individual_family_children?.[childIdx - 1]?.first_name?.$touch()"
                        />

                        <WbInputText
                          v-model="payload.individual_family_children[childIdx - 1].middle_name"
                          label="Middle Name"
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :invalid="validator.individual_family_children?.[childIdx - 1]?.middle_name?.$error"
                          :invalid-text="validator.individual_family_children?.[childIdx - 1]?.middle_name?.$errors[0]?.$message"
                          @blur="validator.individual_family_children?.[childIdx - 1]?.middle_name?.$touch()"
                        />

                        <WbDropdown
                          v-model="payload.individual_family_children[childIdx - 1].ext_name"
                          optionLabel="label"
                          optionValue="value"
                          :options="ExtensionTypeOptions"
                          label="Extension Name"
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        />

                        <WbCalendar
                          v-model="payload.individual_family_children[childIdx - 1].date_of_birth"
                          dateFormat="MM dd, yy"
                          :maxDate="new Date()"
                          label="Date of Birth"
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          :invalid="validator.individual_family_children?.[childIdx - 1]?.date_of_birth?.$error"
                          :invalid-text="
                            validator.individual_family_children?.[childIdx - 1]?.date_of_birth?.$errors[0]?.$message
                          "
                          @blur="validator.individual_family_children?.[childIdx - 1]?.date_of_birth?.$touch()"
                        >
                          <template #prepend-icon>
                            <i class="pi pi-gift" />
                          </template>
                        </WbCalendar>

                        <Button
                          v-show="childIdx > 0"
                          :id="getId(`button-remove-child-${childIdx - 1}`)"
                          icon="pi pi-trash"
                          @click="handleRemoveChild(childIdx - 1)"
                          v-tooltip.top="'Remove Child'"
                          severity="danger"
                          class="mt-8 text-lg font-semibold dark:text-primary-100"
                          text
                        />
                      </div>
                    </TransitionRoot>
                  </template>

                  <Button
                    label="Add additional child field"
                    @click="handleAdditionalChild"
                    size="large"
                    class="dark:text-secondary-100 mt-4 !w-64 border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
                    text
                  >
                    <template #icon>
                      <i class="pi pi-plus mr-2"></i>
                    </template>
                  </Button>
                </div>
              </TransitionRoot>
            </TabPanel>
            <!-- END FAMILY BACKGROUND -->

            <!-- START EDUCATIONAL BACKGROUND -->
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
                  <!-- START ELEM -->
                  <span class="flex flex-col justify-center space-y-2 font-medium text-primary-700">
                    <p class="text-lg italic md:text-xl">Elementary</p>
                  </span>
                  <div class="flex flex-col gap-x-12 gap-y-4">
                    <div class="flex w-full flex-col gap-x-12 gap-y-4 md:flex-row">
                      <WbInputText
                        v-model="payload.educations.elementary.schools_name"
                        required
                        label="Name of School"
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :invalid="validator.educations.elementary.schools_name.$invalid"
                        :invalid-text="validator.educations.elementary.schools_name.$errors[0]?.$message"
                        @blur="validator.educations.elementary.schools_name.$touch"
                      />

                      <WbInputText
                        v-model="payload.educations.elementary.education_description"
                        required
                        label="Basic Education / Degree / Course "
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :invalid="validator.educations.elementary.education_description.$invalid"
                        :invalid-text="validator.educations.elementary.education_description.$errors[0]?.$message"
                        @blur="validator.educations.elementary.education_description.$touch"
                      />
                    </div>

                    <div class="bg-light-black-600 flex w-full flex-col gap-x-12 gap-y-4 md:flex-row">
                      <div class="flex w-full flex-col gap-x-6 gap-y-4 md:flex-row">
                        <WbCalendar
                          v-model="payload.educations.elementary.period_of_attendance_from"
                          required
                          label="From"
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          class="lg:text-md w-full text-sm placeholder:text-sm"
                          :view="'year'"
                          :dateFormat="'yy'"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :invalid="validator.educations.elementary.period_of_attendance_from.$invalid"
                          :invalid-text="validator.educations.elementary.period_of_attendance_from.$errors[0]?.$message"
                          @blur="validator.educations.elementary.period_of_attendance_from.$touch"
                        />

                        <WbCalendar
                          v-model="payload.educations.elementary.period_of_attendance_to"
                          required
                          label="To"
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          class="lg:text-md w-full text-sm placeholder:text-sm"
                          :view="'year'"
                          :dateFormat="'yy'"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :invalid="validator.educations.elementary.period_of_attendance_to.$invalid"
                          :invalid-text="validator.educations.elementary.period_of_attendance_to.$errors[0]?.$message"
                          @blur="validator.educations.elementary.period_of_attendance_to.$touch"
                        />

                        <WbInputText
                          v-model="payload.educations.elementary.highest_level_units_earned"
                          label="Highest Level / Units Earned "
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :invalid="validator.educations.elementary.highest_level_units_earned.$invalid"
                          :invalid-text="validator.educations.elementary.highest_level_units_earned.$errors[0]?.$message"
                          @blur="validator.educations.elementary.highest_level_units_earned.$touch"
                        />
                      </div>

                      <div class="flex w-full flex-col gap-x-6 gap-y-4 md:flex-row">
                        <WbCalendar
                          v-model="payload.educations.elementary.year_graduated"
                          required
                          :view="'year'"
                          :dateFormat="'yy'"
                          disabled
                          label="Year Graduated"
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :invalid="validator.educations.elementary.year_graduated.$invalid"
                          :invalid-text="validator.educations.elementary.year_graduated.$errors[0]?.$message"
                          @blur="validator.educations.elementary.year_graduated.$touch"
                        />

                        <WbInputText
                          v-model="payload.educations.elementary.scholarship_academic_honors_received"
                          label="Scholarship / Academic Honors Received "
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :invalid="validator.educations.elementary.scholarship_academic_honors_received.$invalid"
                          :invalid-text="
                            validator.educations.elementary.scholarship_academic_honors_received.$errors[0]?.$message
                          "
                          @blur="validator.educations.elementary.scholarship_academic_honors_received.$touch"
                        />
                      </div>
                    </div>
                  </div>
                  <!-- END ELEM -->

                  <!-- START SECONDARY -->
                  <span class="mt-4 flex flex-col justify-center space-y-2 font-medium text-primary-700">
                    <p class="text-lg italic md:text-xl">Secondary</p>
                  </span>
                  <div class="flex flex-col gap-x-12 gap-y-4">
                    <div class="flex w-full flex-col gap-x-12 gap-y-4 md:flex-row">
                      <WbInputText
                        v-model="payload.educations.high_school.schools_name"
                        required
                        label="Name of School"
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :invalid="validator.educations.high_school.schools_name.$invalid"
                        :invalid-text="validator.educations.high_school.schools_name.$errors[0]?.$message"
                        @blur="validator.educations.high_school.schools_name.$touch"
                      />

                      <WbInputText
                        v-model="payload.educations.high_school.education_description"
                        required
                        label="Basic Education / Degree / Course "
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :invalid="validator.educations.high_school.education_description.$invalid"
                        :invalid-text="validator.educations.high_school.education_description.$errors[0]?.$message"
                        @blur="validator.educations.high_school.education_description.$touch"
                      />
                    </div>

                    <div class="bg-light-black-600 flex w-full flex-col gap-x-12 gap-y-4 md:flex-row">
                      <div class="flex w-full flex-col gap-x-6 gap-y-4 md:flex-row">
                        <WbCalendar
                          v-model="payload.educations.high_school.period_of_attendance_from"
                          required
                          label="From"
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          :view="'year'"
                          :dateFormat="'yy'"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :invalid="validator.educations.high_school.period_of_attendance_from.$invalid"
                          :invalid-text="validator.educations.high_school.period_of_attendance_from.$errors[0]?.$message"
                          @blur="validator.educations.high_school.period_of_attendance_from.$touch"
                        />

                        <WbCalendar
                          v-model="payload.educations.high_school.period_of_attendance_to"
                          required
                          label="To "
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          :view="'year'"
                          :dateFormat="'yy'"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :invalid="validator.educations.high_school.period_of_attendance_to.$invalid"
                          :invalid-text="validator.educations.high_school.period_of_attendance_to.$errors[0]?.$message"
                          @blur="validator.educations.high_school.period_of_attendance_to.$touch"
                        />

                        <WbInputText
                          v-model="payload.educations.high_school.highest_level_units_earned"
                          label="Highest Level / Units Earned "
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :invalid="validator.educations.high_school.highest_level_units_earned.$invalid"
                          :invalid-text="validator.educations.high_school.highest_level_units_earned.$errors[0]?.$message"
                          @blur="validator.educations.high_school.highest_level_units_earned.$touch"
                        />
                      </div>

                      <div class="flex w-full flex-col gap-x-6 gap-y-4 md:flex-row">
                        <WbCalendar
                          v-model="payload.educations.high_school.year_graduated"
                          required
                          :view="'year'"
                          :dateFormat="'yy'"
                          label="Year Graduated"
                          disabled
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :invalid="validator.educations.high_school.year_graduated.$invalid"
                          :invalid-text="validator.educations.high_school.year_graduated.$errors[0]?.$message"
                          @blur="validator.educations.high_school.year_graduated.$touch"
                        />

                        <WbInputText
                          v-model="payload.educations.high_school.scholarship_academic_honors_received"
                          label="Scholarship / Academic Honors Received "
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :invalid="validator.educations.high_school.scholarship_academic_honors_received.$invalid"
                          :invalid-text="
                            validator.educations.high_school.scholarship_academic_honors_received.$errors[0]?.$message
                          "
                          @blur="validator.educations.high_school.scholarship_academic_honors_received.$touch"
                        />
                      </div>
                    </div>
                  </div>
                  <!-- END SECONDARY -->

                  <!-- START VOCATINOAL -->
                  <span class="mt-4 flex flex-col justify-center space-y-2 font-medium text-primary-700">
                    <p class="text-lg italic md:text-xl">Vocational / Trade Course</p>
                  </span>
                  <div v-if="!currentlyEnrolledGraduate" class="col-span-2 my-4 ml-4">
                    <div class="align-items-center flex items-center">
                      <Checkbox
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
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :invalid="validator.educations.vocational.schools_name.$invalid"
                        :invalid-text="validator.educations.vocational.schools_name.$errors[0]?.$message"
                        @blur="validator.educations.vocational.schools_name.$touch"
                      />

                      <WbInputText
                        v-model="payload.educations.vocational.education_description"
                        label="Basic Education / Degree / Course "
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
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
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :view="'year'"
                          :dateFormat="'yy'"
                          :invalid="validator.educations.vocational.period_of_attendance_from.$invalid"
                          :invalid-text="validator.educations.vocational.period_of_attendance_from.$errors[0]?.$message"
                          @blur="validator.educations.vocational.period_of_attendance_from.$touch"
                        />

                        <WbCalendar
                          v-if="!currentlyEnrolledVocational"
                          v-model="payload.educations.vocational.period_of_attendance_to"
                          label="To "
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :view="'year'"
                          :dateFormat="'yy'"
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
                          :disabled="currentlyEnrolledVocational"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
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
                          :disabled="currentlyEnrolledVocational"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :invalid="validator.educations.vocational.year_graduated.$invalid"
                          :invalid-text="validator.educations.vocational.year_graduated.$errors[0]?.$message"
                          @blur="validator.educations.vocational.year_graduated.$touch"
                        />

                        <WbInputText
                          v-model="payload.educations.vocational.scholarship_academic_honors_received"
                          label="Scholarship / Academic Honors Received "
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          :disabled="currentlyEnrolledVocational"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
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
                  <!-- END VOCATINOAL -->

                  <!-- START COLLEGE -->
                  <span class="mt-4 flex flex-col justify-center space-y-2 font-medium text-primary-700">
                    <p class="text-lg italic md:text-xl">College</p>
                  </span>
                  <div class="flex flex-col gap-x-12 gap-y-4">
                    <div class="flex w-full flex-col gap-x-12 gap-y-4 md:flex-row">
                      <WbInputText
                        v-model="payload.educations.college.schools_name"
                        required
                        label="Name of School"
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :invalid="validator.educations.college.schools_name.$invalid"
                        :invalid-text="validator.educations.college.schools_name.$errors[0]?.$message"
                        @blur="validator.educations.college.schools_name.$touch"
                      />

                      <WbInputText
                        v-model="payload.educations.college.education_description"
                        required
                        label="Basic Education / Degree / Course "
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
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
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
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
                          :view="'year'"
                          :dateFormat="'yy'"
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :invalid="validator.educations.college.period_of_attendance_to.$invalid"
                          :invalid-text="validator.educations.college.period_of_attendance_to.$errors[0]?.$message"
                          @blur="validator.educations.college.period_of_attendance_to.$touch"
                        />

                        <WbInputText
                          v-model="payload.educations.college.highest_level_units_earned"
                          label="Highest Level / Units Earned "
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
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
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          :view="'year'"
                          :dateFormat="'yy'"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :invalid="validator.educations.college.year_graduated.$invalid"
                          :invalid-text="validator.educations.college.year_graduated.$errors[0]?.$message"
                          @blur="validator.educations.college.year_graduated.$touch"
                        />

                        <WbInputText
                          v-model="payload.educations.college.scholarship_academic_honors_received"
                          label="Scholarship / Academic Honors Received "
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :invalid="validator.educations.college.scholarship_academic_honors_received.$invalid"
                          :invalid-text="validator.educations.college.scholarship_academic_honors_received.$errors[0]?.$message"
                          @blur="validator.educations.college.scholarship_academic_honors_received.$touch"
                        />
                      </div>
                    </div>
                  </div>
                  <!-- END COLLEGE -->

                  <!-- START GRADUATE -->
                  <span class="mt-4 flex flex-col justify-center space-y-2 font-medium text-primary-700">
                    <p class="text-lg italic md:text-xl">Graduate Studies</p>
                  </span>
                  <div v-if="!currentlyEnrolledVocational" class="col-span-2 my-4 ml-4">
                    <div class="align-items-center flex items-center">
                      <Checkbox
                        v-model="currentlyEnrolledGraduate"
                        :id="getId('input-currently-enrolled-graduate')"
                        name="currentlyEnrolledGraduate"
                        :binary="true"
                      />
                      <label :for="getId('input-currently-enrolled-graduate')" class="ml-2 text-surface-600">
                        I am currently Enrolled in this School
                      </label>
                    </div>
                  </div>
                  <div class="flex flex-col gap-x-12 gap-y-4">
                    <div class="flex w-full flex-col gap-x-12 gap-y-4 md:flex-row">
                      <WbInputText
                        v-model="payload.educations.graduate.schools_name"
                        label="Name of School"
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :invalid="validator.educations.graduate.schools_name.$invalid"
                        :invalid-text="validator.educations.graduate.schools_name.$errors[0]?.$message"
                        @blur="validator.educations.graduate.schools_name.$touch"
                      />

                      <WbInputText
                        v-model="payload.educations.graduate.education_description"
                        label="Basic Education / Degree / Course "
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :invalid="validator.educations.graduate.education_description.$invalid"
                        :invalid-text="validator.educations.graduate.education_description.$errors[0]?.$message"
                        @blur="validator.educations.graduate.education_description.$touch"
                      />
                    </div>

                    <div class="bg-light-black-600 flex w-full flex-col gap-x-12 gap-y-4 md:flex-row">
                      <div class="flex w-full flex-col gap-x-6 gap-y-4 md:flex-row">
                        <WbCalendar
                          v-model="payload.educations.graduate.period_of_attendance_from"
                          label="From"
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :view="'year'"
                          :dateFormat="'yy'"
                          :invalid="validator.educations.graduate.period_of_attendance_from.$invalid"
                          :invalid-text="validator.educations.graduate.period_of_attendance_from.$errors[0]?.$message"
                          @blur="validator.educations.graduate.period_of_attendance_from.$touch"
                        />

                        <WbCalendar
                          v-if="!currentlyEnrolledGraduate"
                          v-model="payload.educations.graduate.period_of_attendance_to"
                          label="To "
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :view="'year'"
                          :dateFormat="'yy'"
                          :invalid="validator.educations.graduate.period_of_attendance_to.$invalid"
                          :invalid-text="validator.educations.graduate.period_of_attendance_to.$errors[0]?.$message"
                          @blur="validator.educations.graduate.period_of_attendance_to.$touch"
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
                          v-model="payload.educations.graduate.highest_level_units_earned"
                          label="Highest Level / Units Earned "
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :invalid="validator.educations.graduate.highest_level_units_earned.$invalid"
                          :invalid-text="validator.educations.graduate.highest_level_units_earned.$errors[0]?.$message"
                          @blur="validator.educations.graduate.highest_level_units_earned.$touch"
                        />
                      </div>

                      <div class="flex w-full flex-col gap-x-6 gap-y-4 md:flex-row">
                        <WbCalendar
                          v-model="payload.educations.graduate.year_graduated"
                          label="Year Graduated"
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          :view="'year'"
                          :dateFormat="'yy'"
                          :disabled="currentlyEnrolledGraduate"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :invalid="validator.educations.graduate.year_graduated.$invalid"
                          :invalid-text="validator.educations.graduate.year_graduated.$errors[0]?.$message"
                          @blur="validator.educations.graduate.year_graduated.$touch"
                        />

                        <WbInputText
                          v-model="payload.educations.graduate.scholarship_academic_honors_received"
                          label="Scholarship / Academic Honors Received "
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          :disabled="currentlyEnrolledGraduate"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :invalid="validator.educations.graduate.scholarship_academic_honors_received.$invalid"
                          :invalid-text="validator.educations.graduate.scholarship_academic_honors_received.$errors[0]?.$message"
                          @blur="validator.educations.graduate.scholarship_academic_honors_received.$touch"
                        />
                      </div>
                    </div>
                  </div>
                  <!-- END GRADUATE -->
                </div>
              </TransitionRoot>
            </TabPanel>
            <!-- END EDUCATIONAL BACKGROUND -->
          </TabPanels>
        </TabGroup>
      </div>
    </form>
  </div>
</template>
