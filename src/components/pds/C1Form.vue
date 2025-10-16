<script setup lang="ts">
import Message from 'primevue/message'
import { helpers, maxLength, required, email } from '@vuelidate/validators'
import { digitCountRule, mobilePhoneRule, uniqueUserIdentifierRule } from '@/utils/custom-validations'
import {
  reactive,
  ref,
  onBeforeMount,
  toRef,
  watch,
  computed,
  onMounted,
  onBeforeUnmount,
  nextTick,
  type WatchStopHandle,
} from 'vue'
import { storeToRefs } from 'pinia'
import { useFilterByParentId } from '@/composables/address.options.ts'
import { useAddressStore } from '@/stores/address.store.ts'
import { useLibrariesStore } from '@/stores/libraries.store.ts'
import { useItemNumberStore } from '@/stores/item-number.store.ts'
import { useSalaryGradesStore } from '@/stores/salary-grades.store.ts'
import { usePdsStore, PersonalDataSheetPayload } from '@/stores/pds.store.ts'
import { useAuthStore } from '@/stores/auth.store.ts'
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
import { usePrependOrAppendOnce, isNotMoreThanYearsAgo, isAfterOrEqualFromDate, notInFuture } from '@/utils/helpers.js'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { TransitionRoot } from '@headlessui/vue'
import { IndividualEducBg, ItemNumberResponse, PersonnelResponse, IndividualFamily } from '@/typings/models.types'
import { useRouter } from 'vue-router'
import { useRoute } from 'vue-router'
const getId = usePrependOrAppendOnce('pds-c1-section-form')

const libraryStore = useLibrariesStore()
const itemStore = useItemNumberStore()
const sgStore = useSalaryGradesStore()
const pdsStore = usePdsStore()
const authStore = useAuthStore()
const toast = useToast()
const router = useRouter()
const route = useRoute()

const currentlyEnrolledGraduate = ref(false)
const currentlyEnrolledVocational = ref(false)
const isPositionLoading = ref(false)
const isItemsLoading = ref(false)
const isSalaryGradeLoading = ref(false)
const isSameResidential = ref(false)
const isLoading = ref(true)
const activeToasts = ref<number>(0)
const maxToasts = 5

const selectedItemNo = ref<WbAutoCompleteOption | null>(null)
const selectedSalaryGrade = ref<WbAutoCompleteOption | null>(null)
const selectedOffice = ref<WbAutoCompleteOption | null>(null)
const selectedDivision = ref<WbAutoCompleteOption | null>(null)
const selectedSectionUnit = ref<WbAutoCompleteOption | null>(null)
const selectedCountry = ref<WbAutoCompleteOption[] | null>(null)

const ppmsCanUpdate = computed(() => {
  return authStore.authHasRequiredRole(['hr_pas_admin'])
})

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
onBeforeMount(async () => {
  addressesAreLoading.value = true
  isItemsLoading.value = true
  isSalaryGradeLoading.value = true

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
    sgStore.fetchSalaryGrade(),
  ])

  addressesAreLoading.value = false
  isItemsLoading.value = false
  isSalaryGradeLoading.value = false
})

onMounted(async () => {
  const hasImport = !!pdsStore.importResult

  if (hasImport) {
    // perform import with NO watcher present
    // (do NOT call setupSpouseWatch yet)
    // this is to prevent the bug wherein the spouse data is being overwritten by the watcher
    Object.assign(payload.individual, pdsStore.importResult?.individual ?? {})
    Object.assign(payload.employee, pdsStore.importResult?.employee ?? {})
    Object.assign(payload.individual_address_init, pdsStore.importResult?.individual_address?.[0] ?? {})
    Object.assign(payload.contact_info, pdsStore.importResult?.individual_contact_info?.[0] ?? {})
    Object.assign(payload.educations, pdsStore.importResult?.educations ?? {})

    if (pdsStore.importResult?.individual_family) {
      payload.individual_family_children.length = 0
      pdsStore.importResult?.individual_family.forEach((family) => {
        switch (family.class) {
          case 'Spouse':
            Object.assign(payload.individual_family_spouse, family ?? {})
            break

          case 'Father':
            Object.assign(payload.individual_family_father, family ?? {})
            break

          case 'Mother':
            Object.assign(payload.individual_family_mothers_maiden, family ?? {})
            break

          case 'Children':
            payload.individual_family_children.push(family)
            break
        }
      })
    }

    await nextTick()
    setupSpouseWatch(false)
  } else {
    setupSpouseWatch(true)
  }
})

onBeforeUnmount(() => stopSpouseWatch?.())

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

const isDualCitizen = () => payload.individual.citizenship === 'Dual Citizenship'
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
      maxLength: helpers.withMessage(() => generateMessage('birthday').maxLength, globalStringMaxLengthRule),
      isNotTooOld: helpers.withMessage('Birthdate cannot be more than 130 years ago', isNotMoreThanYearsAgo(130)),
      notInFuture: helpers.withMessage('Birthdate must not be in the future.', notInFuture),
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
      required: helpers.withMessage(() => generateMessage('height').required, required),
      heightFormat: helpers.withMessage(
        'Invalid height format. Please enter a valid height in meters, e.g., 1.56m',
        (value: string | null) => {
          if (!value) return true
          return /^\d{1}(\.\d{1,2})/.test(value)
        }
      ),
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
      notInFuture: helpers.withMessage('Birthdate must not be in the future.', notInFuture),
    },
  })),
  educations: {
    elementary: {
      schools_name: {
        required: helpers.withMessage(() => generateMessage('elementary_school_name').required, required),
        maxLength: globalStringMaxLengthRule,
      },
      education_description: {
        required: helpers.withMessage(() => generateMessage('elementary_basic_education_degree_course').required, required),
        maxLength: globalStringMaxLengthRule,
      },
      period_of_attendance_from: {
        required: helpers.withMessage(() => generateMessage('elementary_from').required, required),
        isAfterOrEqualTo: helpers.withMessage(
          'Inclusive "From" date must not be after "To" date.',
          (
            val: string | number | Date | null,
            vm: {
              period_of_attendance_to: string | number | Date | null
            }
          ) => {
            if (!helpers.req(vm.period_of_attendance_to)) return true

            const from = val ? new Date(val) : null
            const to = vm.period_of_attendance_to ? new Date(vm.period_of_attendance_to) : null

            if (!from || !to || isNaN(from.getTime()) || isNaN(to.getTime())) return true

            return from <= to
          }
        ),
        notInFuture: helpers.withMessage('Date must not be in the future.', notInFuture),
      },
      period_of_attendance_to: {
        required: helpers.withMessage(() => generateMessage('elementary_to').required, required),
        isAfterOrEqualFromDate,
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
    high_school: {
      schools_name: {
        required: helpers.withMessage(() => generateMessage('high_school_name').required, required),
        maxLength: globalStringMaxLengthRule,
      },
      education_description: {
        required: helpers.withMessage(() => generateMessage('high_school_basic_education_degree_course').required, required),
        maxLength: globalStringMaxLengthRule,
      },
      period_of_attendance_from: {
        required: helpers.withMessage(() => generateMessage('high_school_from').required, required),
        isAfterOrEqualTo: helpers.withMessage(
          'Inclusive "From" date must not be after "To" date.',
          (
            val: string | number | Date | null,
            vm: {
              period_of_attendance_to: string | number | Date | null
            }
          ) => {
            if (!helpers.req(vm.period_of_attendance_to)) return true

            const from = val ? new Date(val) : null
            const to = vm.period_of_attendance_to ? new Date(vm.period_of_attendance_to) : null

            if (!from || !to || isNaN(from.getTime()) || isNaN(to.getTime())) return true

            return from <= to
          }
        ),
        notInFuture: helpers.withMessage('Date must not be in the future.', notInFuture),
      },
      period_of_attendance_to: {
        required: helpers.withMessage(() => generateMessage('high_school_to').required, required),
        isAfterOrEqualFromDate,
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
          (
            val: string | number | Date | null,
            vm: {
              period_of_attendance_to: string | number | Date | null
            }
          ) => {
            if (!helpers.req(vm.period_of_attendance_to)) return true

            const from = val ? new Date(val) : null
            const to = vm.period_of_attendance_to ? new Date(vm.period_of_attendance_to) : null

            if (!from || !to || isNaN(from.getTime()) || isNaN(to.getTime())) return true

            return from <= to
          }
        ),
        notInFuture: helpers.withMessage('Date must not be in the future.', notInFuture),
      },
      period_of_attendance_to: {
        maxLength: helpers.withMessage(() => generateMessage('elementary_to').maxLength, globalStringMaxLengthRule),
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
          (
            val: string | number | Date | null,
            vm: {
              period_of_attendance_to: string | number | Date | null
            }
          ) => {
            if (!helpers.req(vm.period_of_attendance_to)) return true

            const from = val ? new Date(val) : null
            const to = vm.period_of_attendance_to ? new Date(vm.period_of_attendance_to) : null

            if (!from || !to || isNaN(from.getTime()) || isNaN(to.getTime())) return true

            return from <= to
          }
        ),
        notInFuture: helpers.withMessage('Date must not be in the future.', notInFuture),
      },
      period_of_attendance_to: {
        required: helpers.withMessage(() => generateMessage('college_to').required, required),
        isAfterOrEqualFromDate,
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
          (
            val: string | number | Date | null,
            vm: {
              period_of_attendance_to: string | number | Date | null
            }
          ) => {
            if (!helpers.req(vm.period_of_attendance_to)) return true

            const from = val ? new Date(val) : null
            const to = vm.period_of_attendance_to ? new Date(vm.period_of_attendance_to) : null

            if (!from || !to || isNaN(from.getTime()) || isNaN(to.getTime())) return true

            return from <= to
          }
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

const validator = useVuelidate<PersonalDataSheetPayload>(formRules, payload)
// Watcher if Permanent Resident is same as Residential
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

// Watcher to auto-check if both addresses are identical ---
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

watch(
  () => payload.individual.sex,
  (newSex) => {
    if (newSex === 'female') {
      payload.individual.ext_name = null
    }
  }
)

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
    }
  },
  { immediate: true }
)

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
    if (newBday) {
      const date = new Date(newBday)
      const mm = String(date.getMonth() + 1).padStart(2, '0')
      const dd = String(date.getDate()).padStart(2, '0')
      const yyyy = date.getFullYear()

      payload.individual.birthday = `${yyyy}-${mm}-${dd}`
    }
  }
)

watch(
  () => payload.individual_family_children.map((c) => c.date_of_birth),
  (newDates) => {
    newDates.forEach((bday, index) => {
      if (bday) {
        const date = new Date(bday)
        const mm = String(date.getMonth() + 1).padStart(2, '0')
        const dd = String(date.getDate()).padStart(2, '0')
        const yyyy = date.getFullYear()

        payload.individual_family_children[index].date_of_birth = `${yyyy}-${mm}-${dd}`
      }
    })
  }
)

const isSingle = computed(() => payload.individual.civil_status === 'Single')

const propPosition = async () => {
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

let stopSpouseWatch: WatchStopHandle | null = null

const setupSpouseWatch = (immediate: boolean) => {
  stopSpouseWatch?.()

  stopSpouseWatch = watch(
    () => payload.individual.civil_status,
    (newStatus) => {
      const spouse = payload.individual_family_spouse

      const fill = (v: string) => {
        spouse.first_name = v
        spouse.middle_name = v
        spouse.last_name = v
        spouse.ext_name = null
        spouse.occupation = v
        spouse.employers_business_name = v
        spouse.business_address = v
        spouse.telephone_no = null
      }

      if (newStatus === 'Single') fill('N/A')
      else fill('')
    },
    { immediate }
  )
}

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
    payload.employee.id_number = newAgencyNo ?? null
  },
  { immediate: true }
)

watch(
  () => payload.employee.item_id,
  async (newId) => {
    isItemsLoading.value = true
    if (!newId) {
      selectedItemNo.value = null
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

watch(
  () => payload.employee.salary_grade_id,
  (newSelected) => {
    isSalaryGradeLoading.value = true
    if (!newSelected) {
      selectedSalaryGrade.value = null
      return
    }

    const selectedId = typeof newSelected === 'object' && newSelected !== null ? newSelected.id : newSelected

    const existing = sgStore.salaryGradesOptions.find((opt) => Number(opt.value) === Number(selectedId))

    if (existing) {
      selectedSalaryGrade.value = existing
    } else {
      const unwatch = watch(
        () => sgStore.salaryGradesOptions,
        (options) => {
          const found = options.find((opt) => Number(opt.value) === Number(selectedId))
          if (found) {
            selectedSalaryGrade.value = found
            unwatch()
          }
        },
        { immediate: true }
      )
    }

    isSalaryGradeLoading.value = false
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

watch(
  () => payload.educations.graduate.is_current_enrolled,
  (newVal) => {
    if (newVal) {
      currentlyEnrolledGraduate.value = newVal
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

watch(
  () => payload.educations.vocational.is_current_enrolled,
  (newVal) => {
    if (newVal) {
      currentlyEnrolledVocational.value = newVal
    }
  }
)

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
    }, 10000)
  }
}

const handleAdditionalChild = () => {
  payload.individual_family_children?.push({
    id: null,
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
    _delete: false,
  })
}

const handleRemoveChild = (childIndex: number) => {
  const idx = childIndex - 1
  const family_children = payload.individual_family_children?.[idx]

  if (family_children?.id) {
    payload.individual_family_children[idx] = {
      ...family_children,
      _delete: true,
    }
  } else {
    payload.individual_family_children.splice(idx, 1)
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
  const id = (route.params.id as string) || authStore.authenticatedUser?.user_profile?.individual_basic_detail_id
  if (id) {
    const response = await pdsStore.fetchPdsById(id)

    if (response && response.success) {
      console.log('Fetched PDS data:', response.data)
      console.log('Spouse payload:', payload.individual_family_spouse)
      const data = response.data as PersonnelResponse
      pdsStore.updatePdsFromPersonnel(data)

      /** --------------------
       * Handle Educations
       * ------------------- */
      const educationsRaw = data.individual_educational_background
      const educationsArray: IndividualEducBg[] = Array.isArray(educationsRaw)
        ? educationsRaw
        : educationsRaw
          ? [educationsRaw] // wrap single object in array
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

      /** --------------------
       * Handle Family
       * ------------------- */
      const familyRaw = data.individual_family
      const familyArray: IndividualFamily[] = Array.isArray(familyRaw)
        ? familyRaw
        : familyRaw
          ? [familyRaw] // wrap single object in array
          : []

      familyArray.forEach((fam) => {
        switch (fam.class) {
          case 'Spouse':
            Object.assign(payload.individual_family_spouse, fam)
            break
          case 'Father':
            Object.assign(payload.individual_family_father, fam)
            break
          case 'Mother':
            Object.assign(payload.individual_family_mothers_maiden, fam)
            break
        }
      })
      payload.individual_family_children = familyArray
        .filter((fam) => fam.class === 'Children')
        .map((child) => ({
          ...child,
          _delete: null,
        }))

      /** -----------------------
       * Contact & Handle Address
       * ------------------------ */
      const contactRaw = data.individual_contact_info
      payload.individual_contact_info = Array.isArray(contactRaw)
        ? reactive([...contactRaw])
        : contactRaw
          ? reactive([contactRaw])
          : reactive([])
      const addressRaw = data.individual_address

      if (addressRaw) {
        // --- Residential ---
        selectedResidentialRegion.value = addressRaw.residential_region_id
          ? publicStore.regionOptions.find((r) => r.value === addressRaw.residential_region_id) ?? null
          : null
        selectedResidentialProvince.value = addressRaw.residential_province_id
          ? publicStore.provinceOptions.find((p) => p.value === addressRaw.residential_province_id) ?? null
          : null
        selectedResidentialCity.value = addressRaw.residential_citymun_id
          ? publicStore.cityOptions.find((c) => c.value === addressRaw.residential_citymun_id) ?? null
          : null
        selectedResidentialBarangay.value = addressRaw.residential_brgy_id
          ? publicStore.barangayOptions.find((b) => b.value === addressRaw.residential_brgy_id) ?? null
          : null

        // --- Permanent ---
        selectedPermanentRegion.value = addressRaw.permanent_region_id
          ? publicStore.regionOptions.find((r) => r.value === addressRaw.permanent_region_id) ?? null
          : null
        selectedPermanentProvince.value = addressRaw.permanent_province_id
          ? publicStore.provinceOptions.find((p) => p.value === addressRaw.permanent_province_id) ?? null
          : null
        selectedPermanentCity.value = addressRaw.permanent_citymun_id
          ? publicStore.cityOptions.find((c) => c.value === addressRaw.permanent_citymun_id) ?? null
          : null
        selectedPermanentBarangay.value = addressRaw.permanent_brgy_id
          ? publicStore.barangayOptions.find((b) => b.value === addressRaw.permanent_brgy_id) ?? null
          : null
      }

      /** --------------------
       * Handle Voluntary Work
       * ------------------- */
      const voluntaryRaw = data.individual_voluntary_work
      payload.individual_voluntary_work = Array.isArray(voluntaryRaw)
        ? reactive([...voluntaryRaw])
        : voluntaryRaw
          ? reactive([voluntaryRaw])
          : reactive([])

      /** --------------------
       * Handle L&D
       * ------------------- */
      const lndRaw = data.individual_lnd
      payload.individual_lnd = Array.isArray(lndRaw) ? reactive([...lndRaw]) : lndRaw ? reactive([lndRaw]) : reactive([])
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

const updateC1Form = async () => {
  IsBeingUpdated.value = true
  const id = pdsStore.isMyPds
    ? authStore.authenticatedUser?.user_profile?.individual_basic_detail?.id?.toString() ?? 0
    : (route.params.id as string)

  formIsSubmitting.value = true

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
    if (hasEmployeeError) errorFields.push('C1 - Employee')
    if (hasIndividualError) errorFields.push('C1 - Individual')
    if (hasContactInfoError) errorFields.push('C1 - Contact Info')
    if (hasAddressError) errorFields.push('C1 - Address')
    if (hasSpouseError) errorFields.push('C1 - Spouse')
    if (hasFatherError) errorFields.push('C1 - Father')
    if (hasMotherError) errorFields.push('C1 - Mother')
    if (hasChildError) errorFields.push('C1 - Child')
    if (hasEducationError) errorFields.push('C1 - Education')

    const sectionDescriptions: Record<string, string> = {
      'C1 - Employee': 'C1 - Personal Information - Employee Section',
      'C1 - Individual': 'C1 - Personal Information - Individual Section',
      'C1 - Contact Info': 'C1 - Contact Details - Individual Section',
      'C1 - Address': 'C1 - Address Details - Individual Section',
      'C1 - Spouse': 'C1 - Family Background - Spouse Section',
      'C1 - Father': 'C1 - Family Background - Father Section',
      'C1 - Mother': 'C1 - Family Background - Mother Section',
      'C1 - Child': 'C1 - Family Background - Child Section',
      'C1 - Education': 'C1 - Educational Background Section',
    }

    if (errorFields.length > 0) {
      errorFields.forEach((field) => {
        const message = sectionDescriptions[field] ?? field
        showToast('error', 'Validation Error - Please check the following', message)
      })

      isC1Loading.value = false
      return { valid: false, errorTabs: ['C1'] }
    }
  }

  const familyArray = [
    payload.individual_family_spouse,
    payload.individual_family_father,
    payload.individual_family_mothers_maiden,
    ...(payload.individual_family_children || []),
  ].filter((fam) => fam && (fam.first_name || fam.last_name))

  const educationsArray = [
    payload.educations.elementary,
    payload.educations.high_school,
    payload.educations.vocational,
    payload.educations.college,
    payload.educations.graduate,
  ].filter((edu) => edu.schools_name || edu.education_description)

  const requestPayload = {
    ...payload,
    individual_educational_background: educationsArray,
    individual_family: familyArray,
  }

  const response = await pdsStore.updatePds(requestPayload, id, 'C1')

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
    if (hasEmployeeError) errorFields.push('C1 - Employee')
    if (hasIndividualError) errorFields.push('C1 - Individual')
    if (hasContactInfoError) errorFields.push('C1 - Contact Info')
    if (hasAddressError) errorFields.push('C1 - Address')
    if (hasSpouseError) errorFields.push('C1 - Spouse')
    if (hasFatherError) errorFields.push('C1 - Father')
    if (hasMotherError) errorFields.push('C1 - Mother')
    if (hasChildError) errorFields.push('C1 - Child')
    if (hasEducationError) errorFields.push('C1 - Education')

    const sectionDescriptions: Record<string, string> = {
      'C1 - Employee': 'C1 - Personal Information - Employee Section',
      'C1 - Individual': 'C1 - Personal Information - Individual Section',
      'C1 - Contact Info': 'C1 - Contact Details - Individual Section',
      'C1 - Address': 'C1 - Address Details - Individual Section',
      'C1 - Spouse': 'C1 - Family Background - Spouse Section',
      'C1 - Father': 'C1 - Family Background - Father Section',
      'C1 - Mother': 'C1 - Family Background - Mother Section',
      'C1 - Child': 'C1 - Family Background - Child Section',
      'C1 - Education': 'C1 - Educational Background Section',
    }

    if (errorFields.length > 0) {
      errorFields.forEach((field) => {
        const message = sectionDescriptions[field] ?? field
        showToast('error', 'Validation Error - Please check the following', message)
      })

      isC1Loading.value = false
      return { valid: false, errorTabs: ['C1'] }
    }
  }

  /** Propagate indiividual family to required payload */
  let families = [{ ...payload.individual_family_father }, { ...payload.individual_family_mothers_maiden }]

  if (
    typeof payload.individual_family_spouse.last_name?.trim() !== 'undefined' ||
    payload.individual_family_spouse.last_name !== null
  ) {
    families.concat({ ...payload.individual_family_spouse })
  }

  if (
    typeof payload.individual_family_children[0]?.last_name?.trim() !== 'undefined' ||
    payload.individual_family_children[0]?.last_name !== null
  ) {
    families.push(...payload.individual_family_children)
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

  if (payload.employee.item?.number) {
    await itemStore.updateItemStatus(payload.employee.item?.number)
  }

  const response = await pdsStore.savePds(payload)

  if (!response.success) {
    const result = parseApiResponseError(response)

    isPdsError.value = true
    errorMessage.value = result?.message
    pdsErrors.value = result?.errors
    showToast('error', 'PDS Error', 'Pease see the validation messages')
  } else {
    showToast('success', 'Personal Data Sheet (PDS)', 'PDS has been successfully uploaded.')
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
  <template v-if="!isLoading">
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
                          :apiFilters="{ status: 'Unfilled' }"
                          :suggestions="itemStore.itemNumbersSuggestions"
                          :loading="isItemsLoading"
                          @item-select="propPosition"
                          apiOptionLabel="number"
                          label="Item Number"
                          placeholder="Type the item number"
                          v-model="selectedItemNo"
                          :id="getId('input-item-no')"
                          optionLabel="label"
                          optionValue="value"
                          required
                          :readonly="pdsStore.isMyPds || ppmsCanUpdate"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds || ppmsCanUpdate ? 'pointer-events-none cursor-default select-text' : '',
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
                          v-if="!pdsStore.isMyPds && !ppmsCanUpdate"
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
                        :loading="isSalaryGradeLoading"
                        apiOptionLabel="salary_grade"
                        label="Salary Grade"
                        placeholder="Type Salary Grade with its tranche here"
                        v-model="selectedSalaryGrade"
                        :id="getId('input-salary-grade')"
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
                            useWbAutoCompleteHandleTrueValue(value, toRef(payload.employee, 'salary_grade_id'))
                        "
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
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
                          :readonly="pdsStore.isMyPds"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                          ]"
                          forceSelection
                          @on-true-value-computed="
                            (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                              useWbAutoCompleteHandleTrueValue(value, toRef(payload.employee, 'office_id'))
                          "
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
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
                          :readonly="pdsStore.isMyPds"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                          ]"
                          @on-true-value-computed="
                            (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                              useWbAutoCompleteHandleTrueValue(value, toRef(payload.employee, 'division_id'))
                          "
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
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
                          :readonly="pdsStore.isMyPds"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                          ]"
                          @on-true-value-computed="
                            (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                              useWbAutoCompleteHandleTrueValue(value, toRef(payload.employee, 'section_or_unit_id'))
                          "
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
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
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        :readonly="pdsStore.isMyPds"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
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
                        :readonly="pdsStore.isMyPds"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
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
                        :readonly="pdsStore.isMyPds"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
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
                        :disabled="pdsStore.isMyPds || payload.individual.sex === 'female'"
                        label="Extension Name"
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        :class="[
                          'lg:text-md lg:placeholder:text-md text-sm placeholder:text-sm',
                          payload.individual.sex === 'female' ? 'cursor-not-allowed bg-surface-200' : 'bg-surface-0',
                          pdsStore.isMyPds ? 'cursor-not-allowed bg-surface-200' : '',
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
                        :readonly="pdsStore.isMyPds"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
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

                      <WbInputText
                        v-model="payload.individual.place_of_birth"
                        label="Place of Birth"
                        required
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :readonly="pdsStore.isMyPds"
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
                        :readonly="pdsStore.isMyPds"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
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
                              :disabled="pdsStore.isMyPds"
                            />
                            <label :for="getId('input-citizenship-fil')" class="ml-2 cursor-pointer">Filipino</label>
                          </div>
                          <div class="flex items-center">
                            <RadioButton
                              v-model="payload.individual.citizenship"
                              :id="getId('input-citizenship-dual')"
                              name="citizenship"
                              value="Dual Citizenship"
                              :disabled="pdsStore.isMyPds"
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
                        :readonly="pdsStore.isMyPds"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
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
                          :readonly="pdsStore.isMyPds"
                          class="flex-1"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
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
                          :readonly="pdsStore.isMyPds"
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
                            pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                          ]"
                          :invalid="validator.individual.country_id.$invalid"
                          :invalid-text="validator.individual.country_id.$errors[0]?.$message"
                          @blur="validator.individual.country_id.$touch"
                        />
                      </div>
                      <WbInputText
                        v-model="payload.individual.height"
                        label="Height (m)"
                        placeholder="Height in meters"
                        suffix="m"
                        required
                        :readonly="pdsStore.isMyPds"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :invalid="validator.individual.height.$invalid"
                        :invalid-text="validator.individual.height.$errors[0]?.$message"
                        @blur="validator.individual.height.$touch"
                      >
                        <template #prepend-icon>
                          <FontAwesomeIcon icon="fa-solid fa-ruler-vertical" />
                        </template>
                      </WbInputText>

                      <WbDropdown
                        v-model="payload.individual.blood_type"
                        required
                        :options="bloodTypeOptions"
                        optionLabel="label"
                        optionValue="value"
                        label="Blood Type"
                        :readonly="pdsStore.isMyPds"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
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
                        :readonly="pdsStore.isMyPds"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
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
                        :readonly="pdsStore.isMyPds"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
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
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :readonly="pdsStore.isMyPds"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
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
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :readonly="pdsStore.isMyPds"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
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
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :readonly="pdsStore.isMyPds"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
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
                        :readonly="pdsStore.isMyPds"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
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
                        :readonly="pdsStore.isMyPds"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
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
                      <WbInputMask
                        v-model="payload.contact_info.tel_no"
                        label="Telephone Number"
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        mask="(999) 999-9999"
                        placeholder="(072) 687-8000"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :readonly="pdsStore.isMyPds"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
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
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :readonly="pdsStore.isMyPds"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
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
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :readonly="pdsStore.isMyPds"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
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
                          :readonly="pdsStore.isMyPds"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
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
                          :suggestions="filteredProvinceOptionsByRegion"
                          label=" Province "
                          :readonly="pdsStore.isMyPds"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
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
                          :suggestions="filteredCityOptionsByProvince"
                          label=" City / Municipality "
                          :readonly="pdsStore.isMyPds"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
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
                          :suggestions="filteredBarangayOptionsByCity"
                          label=" Barangay "
                          :readonly="pdsStore.isMyPds"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
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
                          :readonly="pdsStore.isMyPds"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
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
                          :readonly="pdsStore.isMyPds"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
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
                          :readonly="pdsStore.isMyPds"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
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
                          :readonly="pdsStore.isMyPds"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
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
                              :disabled="pdsStore.isMyPds"
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
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          optionLabel="label"
                          :readonly="pdsStore.isMyPds || isSameResidential"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds || isSameResidential ? 'pointer-events-none cursor-default select-text' : '',
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
                          :suggestions="filteredProvinceOptionsByRegion"
                          label=" Province "
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          optionLabel="label"
                          :readonly="pdsStore.isMyPds || isSameResidential"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds || isSameResidential ? 'pointer-events-none cursor-default select-text' : '',
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
                          :suggestions="filteredCityOptionsByProvince"
                          label=" City / Municipality "
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          optionLabel="label"
                          :readonly="pdsStore.isMyPds || isSameResidential"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds || isSameResidential ? 'pointer-events-none cursor-default select-text' : '',
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
                          :suggestions="filteredBarangayOptionsByCity"
                          label=" Barangay "
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          optionLabel="label"
                          :readonly="pdsStore.isMyPds || isSameResidential"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds || isSameResidential ? 'pointer-events-none cursor-default select-text' : '',
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
                          :readonly="pdsStore.isMyPds || isSameResidential"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds || isSameResidential ? 'pointer-events-none cursor-default select-text' : '',
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
                          :readonly="pdsStore.isMyPds || isSameResidential"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds || isSameResidential ? 'pointer-events-none cursor-default select-text' : '',
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
                          :readonly="pdsStore.isMyPds || isSameResidential"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds || isSameResidential ? 'pointer-events-none cursor-default select-text' : '',
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
                          :readonly="pdsStore.isMyPds || isSameResidential"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds || isSameResidential ? 'pointer-events-none cursor-default select-text' : '',
                          ]"
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
                        :readonly="pdsStore.isMyPds || isSingle"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :invalid="validator.individual_family_spouse.last_name.$invalid"
                        :invalid-text="validator.individual_family_spouse.last_name.$errors[0]?.$message"
                        @blur="validator.individual_family_spouse.last_name.$touch"
                      />

                      <WbInputText
                        v-model="payload.individual_family_spouse.first_name"
                        label="First Name"
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        :readonly="pdsStore.isMyPds || isSingle"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :invalid="validator.individual_family_spouse.first_name.$invalid"
                        :invalid-text="validator.individual_family_spouse.first_name.$errors[0]?.$message"
                        @blur="validator.individual_family_spouse.first_name.$touch"
                      />

                      <WbInputText
                        v-model="payload.individual_family_spouse.middle_name"
                        label="Middle Name"
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        :readonly="pdsStore.isMyPds || isSingle"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
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
                        :readonly="pdsStore.isMyPds || isSingle"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
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
                        :readonly="pdsStore.isMyPds || isSingle"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :invalid="validator.individual_family_spouse.occupation.$invalid"
                        :invalid-text="validator.individual_family_spouse.occupation.$errors[0]?.$message"
                        @blur="validator.individual_family_spouse.occupation.$touch"
                      />

                      <WbInputText
                        v-model="payload.individual_family_spouse.employers_business_name"
                        label="Employer/Business Name"
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        :readonly="pdsStore.isMyPds || isSingle"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :invalid="validator.individual_family_spouse.employers_business_name.$invalid"
                        :invalid-text="validator.individual_family_spouse.employers_business_name.$errors[0]?.$message"
                        @blur="validator.individual_family_spouse.employers_business_name.$touch"
                      />

                      <WbInputText
                        v-model="payload.individual_family_spouse.business_address"
                        label="Business Address"
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        :readonly="pdsStore.isMyPds || isSingle"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :invalid="validator.individual_family_spouse.business_address.$invalid"
                        :invalid-text="validator.individual_family_spouse.business_address.$errors[0]?.$message"
                        @blur="validator.individual_family_spouse.business_address.$touch"
                      />

                      <WbInputMask
                        v-model="payload.individual_family_spouse.telephone_no"
                        label="Telephone No"
                        mask="(999) 999-9999"
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        :readonly="pdsStore.isMyPds || isSingle"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
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
                        :readonly="pdsStore.isMyPds"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        required
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :invalid="validator.individual_family_father.last_name.$invalid"
                        :invalid-text="validator.individual_family_father.last_name.$errors[0]?.$message"
                        @blur="validator.individual_family_father.last_name.$touch"
                      />

                      <WbInputText
                        v-model="payload.individual_family_father.first_name"
                        label="First Name"
                        :readonly="pdsStore.isMyPds"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        required
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :invalid="validator.individual_family_father.first_name.$invalid"
                        :invalid-text="validator.individual_family_father.first_name.$errors[0]?.$message"
                        @blur="validator.individual_family_father.first_name.$touch"
                      />

                      <WbInputText
                        v-model="payload.individual_family_father.middle_name"
                        label="Middle Name"
                        :readonly="pdsStore.isMyPds"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
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
                        :readonly="pdsStore.isMyPds"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
                        label="Extension Name"
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
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
                        :readonly="pdsStore.isMyPds"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        required
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :invalid="validator.individual_family_mothers_maiden.last_name.$invalid"
                        :invalid-text="validator.individual_family_mothers_maiden.last_name.$errors[0]?.$message"
                        @blur="validator.individual_family_mothers_maiden.last_name.$touch"
                      />

                      <WbInputText
                        v-model="payload.individual_family_mothers_maiden.first_name"
                        label="First Name"
                        :readonly="pdsStore.isMyPds"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        required
                        validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                        :invalid="validator.individual_family_mothers_maiden.first_name.$invalid"
                        :invalid-text="validator.individual_family_mothers_maiden.first_name.$errors[0]?.$message"
                        @blur="validator.individual_family_mothers_maiden.first_name.$touch"
                      />

                      <WbInputText
                        v-model="payload.individual_family_mothers_maiden.middle_name"
                        label="Middle Name"
                        :readonly="pdsStore.isMyPds"
                        :class="[
                          'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                          pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                        ]"
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
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
                        <div v-if="!payload.individual_family_children[childIdx - 1]?._delete">
                          <div class="flex flex-col items-center gap-x-12 gap-y-4 md:flex-row">
                            <WbInputText
                              v-model="payload.individual_family_children[childIdx - 1].last_name"
                              label="Surname"
                              :readonly="pdsStore.isMyPds"
                              :class="[
                                'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                              ]"
                              label-class="text-md text-surface-600 dark:lg:text-surface-200"
                              validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                              :invalid="validator.individual_family_children?.[childIdx - 1]?.last_name?.$error"
                              :invalid-text="
                                validator.individual_family_children?.[childIdx - 1]?.last_name?.$errors[0]?.$message
                              "
                              @blur="validator.individual_family_children?.[childIdx - 1]?.last_name?.$touch()"
                            />

                            <WbInputText
                              v-model="payload.individual_family_children[childIdx - 1].first_name"
                              label="First Name"
                              :readonly="pdsStore.isMyPds"
                              :class="[
                                'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                              ]"
                              label-class="text-md text-surface-600 dark:lg:text-surface-200"
                              validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                              :invalid="validator.individual_family_children?.[childIdx - 1]?.first_name?.$error"
                              :invalid-text="
                                validator.individual_family_children?.[childIdx - 1]?.first_name?.$errors[0]?.$message
                              "
                              @blur="validator.individual_family_children?.[childIdx - 1]?.first_name?.$touch()"
                            />

                            <WbInputText
                              v-model="payload.individual_family_children[childIdx - 1].middle_name"
                              label="Middle Name"
                              :readonly="pdsStore.isMyPds"
                              :class="[
                                'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                              ]"
                              label-class="text-md text-surface-600 dark:lg:text-surface-200"
                              validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                              :invalid="validator.individual_family_children?.[childIdx - 1]?.middle_name?.$error"
                              :invalid-text="
                                validator.individual_family_children?.[childIdx - 1]?.middle_name?.$errors[0]?.$message
                              "
                              @blur="validator.individual_family_children?.[childIdx - 1]?.middle_name?.$touch()"
                            />

                            <WbDropdown
                              v-model="payload.individual_family_children[childIdx - 1].ext_name"
                              optionLabel="label"
                              optionValue="value"
                              :readonly="pdsStore.isMyPds"
                              :class="[
                                'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                              ]"
                              :options="ExtensionTypeOptions"
                              label="Extension Name"
                              label-class="text-md text-surface-600 dark:lg:text-surface-200"
                              validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                            />

                            <WbCalendar
                              v-model="payload.individual_family_children[childIdx - 1].date_of_birth"
                              dateFormat="mm/dd/yy"
                              :maxDate="new Date()"
                              label="Date of Birth"
                              :readonly="pdsStore.isMyPds"
                              label-class="text-md text-surface-600 dark:lg:text-surface-200"
                              :class="[
                                'text-lg font-semibold dark:text-primary-100',
                                validator.individual_family_children[childIdx - 1].date_of_birth.$error ? 'mb-0' : 'mb-2',
                              ]"
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
                              v-if="!pdsStore.isMyPds"
                              v-show="childIdx > 0"
                              :id="getId(`button-remove-child-${childIdx}`)"
                              icon="pi pi-trash"
                              @click="handleRemoveChild(childIdx)"
                              v-tooltip.top="'Remove Child'"
                              severity="danger"
                              class="mt-8 text-lg font-semibold dark:text-primary-100"
                              :class="[
                                'text-lg font-semibold dark:text-primary-100',
                                validator.individual_family_children[childIdx - 1].date_of_birth.$error ? 'mb-6' : 'mb-2',
                              ]"
                              text
                            />
                          </div>
                        </div>
                      </TransitionRoot>
                    </template>

                    <Button
                      v-if="!pdsStore.isMyPds"
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
                          :readonly="pdsStore.isMyPds"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                          ]"
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :invalid="validator.educations.elementary.schools_name.$invalid"
                          :invalid-text="validator.educations.elementary.schools_name.$errors[0]?.$message"
                          @blur="validator.educations.elementary.schools_name.$touch"
                        />

                        <WbInputText
                          v-model="payload.educations.elementary.education_description"
                          required
                          label="Basic Education / Degree / Course "
                          :readonly="pdsStore.isMyPds"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                          ]"
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
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
                            :readonly="pdsStore.isMyPds"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                            ]"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200"
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
                            :readonly="pdsStore.isMyPds"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                            ]"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200"
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
                            :readonly="pdsStore.isMyPds"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                            ]"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200"
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
                            :readonly="pdsStore.isMyPds"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                            ]"
                            label="Year Graduated"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200"
                            validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                            :invalid="validator.educations.elementary.year_graduated.$invalid"
                            :invalid-text="validator.educations.elementary.year_graduated.$errors[0]?.$message"
                            @blur="validator.educations.elementary.year_graduated.$touch"
                          />

                          <WbInputText
                            v-model="payload.educations.elementary.scholarship_academic_honors_received"
                            label="Scholarship / Academic Honors Received "
                            :readonly="pdsStore.isMyPds"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                            ]"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200"
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
                          :readonly="pdsStore.isMyPds"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                          ]"
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :invalid="validator.educations.high_school.schools_name.$invalid"
                          :invalid-text="validator.educations.high_school.schools_name.$errors[0]?.$message"
                          @blur="validator.educations.high_school.schools_name.$touch"
                        />

                        <WbInputText
                          v-model="payload.educations.high_school.education_description"
                          required
                          label="Basic Education / Degree / Course "
                          :readonly="pdsStore.isMyPds"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                          ]"
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
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
                            :readonly="pdsStore.isMyPds"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                            ]"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200"
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
                            :readonly="pdsStore.isMyPds"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                            ]"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200"
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
                            :readonly="pdsStore.isMyPds"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                            ]"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200"
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
                            :readonly="pdsStore.isMyPds"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                            ]"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200"
                            validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                            :invalid="validator.educations.high_school.year_graduated.$invalid"
                            :invalid-text="validator.educations.high_school.year_graduated.$errors[0]?.$message"
                            @blur="validator.educations.high_school.year_graduated.$touch"
                          />

                          <WbInputText
                            v-model="payload.educations.high_school.scholarship_academic_honors_received"
                            label="Scholarship / Academic Honors Received "
                            :readonly="pdsStore.isMyPds"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                            ]"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200"
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
                    <div v-if="!currentlyEnrolledGraduate && !pdsStore.isMyPds" class="col-span-2 my-4 ml-4">
                      <div class="align-items-center flex items-center">
                        <Checkbox
                          :readonly="pdsStore.isMyPds"
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
                          :readonly="pdsStore.isMyPds"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
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
                          :readonly="pdsStore.isMyPds"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
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
                            :readonly="pdsStore.isMyPds"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
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
                            :readonly="pdsStore.isMyPds"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
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
                            :readonly="currentlyEnrolledVocational || pdsStore.isMyPds"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
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
                            :readonly="currentlyEnrolledVocational || pdsStore.isMyPds"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
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
                            :readonly="currentlyEnrolledVocational || pdsStore.isMyPds"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
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
                          :readonly="pdsStore.isMyPds"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
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
                          :readonly="pdsStore.isMyPds"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
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
                            :readonly="pdsStore.isMyPds"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
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
                            :readonly="pdsStore.isMyPds"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
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
                            :readonly="pdsStore.isMyPds"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
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
                            :readonly="pdsStore.isMyPds"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
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
                            :readonly="pdsStore.isMyPds"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                            ]"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200"
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
                    <div v-if="!currentlyEnrolledVocational && !pdsStore.isMyPds" class="col-span-2 my-4 ml-4">
                      <div class="align-items-center flex items-center">
                        <Checkbox
                          :disabled="pdsStore.isMyPds"
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
                          :readonly="pdsStore.isMyPds"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                          ]"
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :invalid="validator.educations.graduate.schools_name.$invalid"
                          :invalid-text="validator.educations.graduate.schools_name.$errors[0]?.$message"
                          @blur="validator.educations.graduate.schools_name.$touch"
                        />

                        <WbInputText
                          v-model="payload.educations.graduate.education_description"
                          label="Basic Education / Degree / Course "
                          :readonly="pdsStore.isMyPds"
                          :class="[
                            'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                            pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                          ]"
                          label-class="text-md text-surface-600 dark:lg:text-surface-200"
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
                            :readonly="pdsStore.isMyPds"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                            ]"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200"
                            validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                            :view="'year'"
                            :dateFormat="'yy'"
                            placeholder="1970"
                            :invalid="validator.educations.graduate.period_of_attendance_from.$invalid"
                            :invalid-text="validator.educations.graduate.period_of_attendance_from.$errors[0]?.$message"
                            @blur="validator.educations.graduate.period_of_attendance_from.$touch"
                          />

                          <WbCalendar
                            v-if="!currentlyEnrolledGraduate"
                            v-model="payload.educations.graduate.period_of_attendance_to"
                            label="To "
                            :readonly="pdsStore.isMyPds"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                            ]"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200"
                            validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                            :view="'year'"
                            :dateFormat="'yy'"
                            placeholder="1970"
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
                            :readonly="pdsStore.isMyPds"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                            ]"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200"
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
                            placeholder="1970"
                            :readonly="currentlyEnrolledGraduate || pdsStore.isMyPds"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                            ]"
                            validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                            :invalid="validator.educations.graduate.year_graduated.$invalid"
                            :invalid-text="validator.educations.graduate.year_graduated.$errors[0]?.$message"
                            @blur="validator.educations.graduate.year_graduated.$touch"
                          />

                          <WbInputText
                            v-model="payload.educations.graduate.scholarship_academic_honors_received"
                            label="Scholarship / Academic Honors Received "
                            label-class="text-md text-surface-600 dark:lg:text-surface-200"
                            :readonly="currentlyEnrolledGraduate || pdsStore.isMyPds"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                            ]"
                            validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                            :invalid="validator.educations.graduate.scholarship_academic_honors_received.$invalid"
                            :invalid-text="
                              validator.educations.graduate.scholarship_academic_honors_received.$errors[0]?.$message
                            "
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
