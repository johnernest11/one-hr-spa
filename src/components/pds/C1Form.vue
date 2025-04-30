<script setup lang="ts">
import { reactive, ref, onBeforeMount, toRef, toRefs } from 'vue'
import { PersonalDataSheetPayload } from '@/stores/personal-data-sheet.store.ts'
import { storeToRefs } from 'pinia'
import { useFilterByParentId, useClearSelectedAddressIfNotInParentList } from '@/composables/address.options.ts'
import { useAuthStore } from '@/stores/auth.store.ts'
import { useAddressStore } from '@/stores/address.store.ts'
import { useLibrariesStore } from '@/stores/libraries.store.ts'
import useVuelidate from '@vuelidate/core'
import WbInputText from '@/components/webkit/WbInputText.vue'
import WbCalendar from '@/components/webkit/WbCalendar.vue'
import WbDropdown from '@/components/webkit/WbDropdown.vue'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import InputMask from 'primevue/inputmask'
import RadioButton from 'primevue/radiobutton'
import WbAutoComplete from '@/components/webkit/WbAutoComplete.vue'
import { WbAutoCompleteOption, WbAutoCompleteOptionTrueValue } from '@/components/webkit/WbAutoComplete.vue'
import { useWbAutoCompleteHandleTrueValue } from '@/composables/wb-ui-components.ts'
import { EmployeeEntryC1FormRules } from '@/utils/employee-entry-validations.ts'
import {
  bloodTypeOptions,
  SexTypeOptions,
  ExtensionTypeOptions,
  FilipinobyTypeOptions,
  CountryTypeOptions,
} from '@/typings/employee-entry.types'
import Divider from 'primevue/divider'
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/vue'
import { PersonnelEmployee } from '@/typings/models.types.ts'
import { usePrependOrAppendOnce } from '@/utils/helpers.js'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { TransitionRoot } from '@headlessui/vue'

const getId = usePrependOrAppendOnce('pds-c1-section-form')

/** Payload */
const authStore = useAuthStore()
const libraryStore = useLibrariesStore()

const auntenticatedUser = authStore.authenticatedUser?.user_profile
const authPersonnelDataSheet = authStore.authenticatedUser?.user_profile?.personnel_data_sheet
const authPersonnelAdresses = authStore.authenticatedUser?.user_profile?.personnel_data_sheet?.personnel_addresses
const authPersonnelFamily = authStore.authenticatedUser?.user_profile?.personnel_data_sheet?.personnel_family
const authPersonnelEducation = authStore.authenticatedUser?.user_profile?.personnel_data_sheet?.personnel_educational_background

const selectedItemNo = ref<WbAutoCompleteOption[] | null>(null)
const selectedSalaryGrade = ref<WbAutoCompleteOption[] | null>(null)
const selectedOffice = ref<WbAutoCompleteOption[] | null>(null)
const selectedDivision = ref<WbAutoCompleteOption[] | null>(null)
const selectedSectionUnit = ref<WbAutoCompleteOption[] | null>(null)

const payload = reactive<PersonalDataSheetPayload>({
  /** User Profile  */
  last_name: null,
  first_name: null,
  middle_name: null,
  ext_name: null,
  birthday: null,
  sex: null,
  /** Personnel Data Sheet  */
  place_of_birth: null,
  civil_status: authPersonnelDataSheet?.civil_status || null,
  height: null,
  weight: null,
  blood_type: authPersonnelDataSheet?.blood_type || null,
  gsis_no: authPersonnelDataSheet?.pag_ibig_no || '',
  philhealth_no: authPersonnelDataSheet?.philhealth_no || '',
  pag_ibig_no: authPersonnelDataSheet?.sss_no || '',
  sss_no: authPersonnelDataSheet?.sss_no || '',
  tin_no: authPersonnelDataSheet?.tin_no || '',
  agency_employee_no: authPersonnelDataSheet?.agency_employee_no || '',
  citizenship: authPersonnelDataSheet?.citizenship || '',
  citizenship_acquisition: null,
  citizenship_country: authPersonnelDataSheet?.citizenship_country || '',
  /** Personnel Data Sheet  */
  tel_no: authPersonnelDataSheet?.personnel_contact_info?.tel_no || '',
  mobile_no: authPersonnelDataSheet?.personnel_contact_info?.mobile_no || '',
  email_address: authPersonnelDataSheet?.personnel_contact_info?.email_address || '',
  /** Personnel Address  */
  residential_house_block_lot_no: authPersonnelAdresses?.residential_house_block_lot_no || '',
  residential_street: authPersonnelAdresses?.residential_street || '',
  residential_subdivision_village: authPersonnelAdresses?.residential_subdivision_village || '',
  residential_brgy_id: authPersonnelAdresses?.barangay?.id || '',
  residential_citynum_id: authPersonnelAdresses?.city?.id || '',
  residential_province_id: authPersonnelAdresses?.province?.id || '',
  residential_region_id: authPersonnelAdresses?.region?.id || '',
  residential_zip_code: authPersonnelAdresses?.residential_zip_code || '',
  permanent_house_block_lot_no: authPersonnelAdresses?.permanent_house_block_lot_no || '',
  permanent_street: authPersonnelAdresses?.permanent_street || '',
  permanent_subdivision_village: authPersonnelAdresses?.permanent_subdivision_village || '',
  permanent_brgy_id: authPersonnelAdresses?.barangay?.id || '',
  permanent_citynum_id: authPersonnelAdresses?.city?.id || '',
  permanent_province_id: authPersonnelAdresses?.province?.id || '',
  permanent_region_id: authPersonnelAdresses?.region?.id || '',
  permanent_zip_code: authPersonnelAdresses?.permanent_zip_code || '',
  /** Personnel Family  */
  family_first_name: authPersonnelFamily?.family_first_name || '',
  family_middle_name: authPersonnelFamily?.family_middle_name || '',
  family_last_name: authPersonnelFamily?.family_last_name || '',
  family_ext_name: authPersonnelFamily?.family_ext_name || '',
  family_occupation: authPersonnelFamily?.family_occupation || '',
  family_employers_business_name: authPersonnelFamily?.family_employers_business_name || '',
  family_business_address: authPersonnelFamily?.family_business_address || '',
  family_telephone_no: authPersonnelFamily?.family_telephone_no || '',
  family_date_of_birth: authPersonnelFamily?.family_date_of_birth || '',
  family_class: authPersonnelFamily?.family_class || null,
  /** Personnel Educational Background  */
  schools_name: authPersonnelEducation?.schools_name || '',
  level: authPersonnelEducation?.level || null,
  period_of_attendance_from: authPersonnelEducation?.period_of_attendance_from || '',
  period_of_attendance_to: authPersonnelEducation?.period_of_attendance_to || '',
  highest_level_units_earned: authPersonnelEducation?.highest_level_units_earned || '',
  year_graduated: authPersonnelEducation?.year_graduated || '',
  scholarship_academic_honors_received: authPersonnelEducation?.scholarship_academic_honors_received || '',
  employee: <PersonnelEmployee>{} || null,
})

/** Address Section **/
/** Address WbAutoComplete Object References */
const selectedResidentialRegion = ref<WbAutoCompleteOption | null>(null)
const selectedResidentialProvince = ref<WbAutoCompleteOption | null>(null)
const selectedResidentialCity = ref<WbAutoCompleteOption | null>(null)
const selectedResidentialBarangay = ref<WbAutoCompleteOption | null>(null)

/** Initialize Address Options List */
const publicStore = useAddressStore()
const addressesAreLoading = ref(false)
onBeforeMount(async () => {
  addressesAreLoading.value = true
  // await Promise.allSettled([
  //   publicStore.fetchRegions(),
  //   publicStore.fetchProvinces(),
  //   publicStore.fetchCities(),
  //   publicStore.fetchBarangays(),
  // ])

  // Set the initial value of the selected addresses
  selectedResidentialRegion.value = publicStore.regionOptions.find((r) => r.value === authPersonnelAdresses?.region?.id) || null
  selectedResidentialProvince.value =
    publicStore.provinceOptions.find((p) => p.value === authPersonnelAdresses?.province?.id) || null
  selectedResidentialCity.value = publicStore.cityOptions.find((c) => c.value === authPersonnelAdresses?.city?.id) || null
  selectedResidentialBarangay.value =
    publicStore.barangayOptions.find((b) => b.value === authPersonnelAdresses?.barangay?.id) || null

  addressesAreLoading.value = false
})

/** We only display a list based on parent address */
const { provinceOptions, cityOptions, barangayOptions } = storeToRefs(publicStore)
const filteredProvinceOptionsByRegion = useFilterByParentId(toRef(payload, 'residential_region_id'), provinceOptions)
const filteredCityOptionsByProvince = useFilterByParentId(toRef(payload, 'residential_province_id'), cityOptions)
const filteredBarangayOptionsByCity = useFilterByParentId(toRef(payload, 'residential_citynum_id'), barangayOptions)

/** We set the `selected<Address>` and `payload.<address>_id` to null if the parent is changed */
useClearSelectedAddressIfNotInParentList(
  toRefs(payload),
  selectedResidentialProvince,
  selectedResidentialCity,
  selectedResidentialBarangay,
  filteredProvinceOptionsByRegion,
  filteredCityOptionsByProvince,
  filteredBarangayOptionsByCity
)

/** Array to store the new childrens Field entries */
const newpersonnelfamilies = ref([
  {
    family_last_name: null,
    family_first_name: null,
    family_middle_name: null,
    family_extension_name: null,
    family_date_of_birth: null,
  },
])

/** Function to add a new childrens Field entry */
const addAdditionalPersonnelFamily = (newFields = {}) => {
  const defaultPersonnelFamily = {
    family_last_name: null,
    family_first_name: null,
    family_middle_name: null,
    family_extension_name: null,
    family_date_of_birth: null,
  }

  const newpersonnelfamilyField = { ...defaultPersonnelFamily, ...newFields }
  newpersonnelfamilies.value.push(newpersonnelfamilyField)
}

/** Function to remove childrens Field  entry */
const removePersonnelFamily = (index: number) => {
  if (index >= 0 && index < newpersonnelfamilies.value.length) {
    newpersonnelfamilies.value.splice(index, 1)
  }
}

/** Array to store the new Educational Background Field entries */
const newpersonneleducationbackgrounds = ref([
  {
    schools_name: null,
    level: null,
    period_of_attendance_from: null,
    period_of_attendance_to: null,
    highest_level_units_earned: null,
    year_graduated: null,
    scholarship_academic_honors_received: null,
  },
])

/** Function to add a new childrens Field entry */
const addAdditionalPersonnelEducationBackground = (newFields = {}) => {
  const defaultPersonnelEducationField = {
    schools_name: null,
    level: null,
    period_of_attendance_from: null,
    period_of_attendance_to: null,
    highest_level_units_earned: null,
    year_graduated: null,
    scholarship_academic_honors_received: null,
  }

  const newpersonneleducationField = { ...defaultPersonnelEducationField, ...newFields }
  newpersonneleducationbackgrounds.value.push(newpersonneleducationField)
}

/** Function to remove childrens Field  entry */
const removePersonnelEducationalBackground = (index: number) => {
  if (index >= 0 && index < newpersonneleducationbackgrounds.value.length) {
    newpersonneleducationbackgrounds.value.splice(index, 1)
  }
}

const validator = useVuelidate<Partial<PersonalDataSheetPayload>>(EmployeeEntryC1FormRules, payload)

defineProps({
  activeSubTab: {
    type: Number,
    default: undefined,
  },
})

const c1Tabs = ref([
  { name: 'Personal Information', index: 0 },
  { name: 'Family Background', index: 1 },
  { name: 'Educational Background', index: 2 },
])
</script>

<template>
  <div class="flex flex-row">
    <form @submit.prevent autocomplete="off" class="h-full w-full">
      <div class="w-full">
        <TabGroup>
          <TabList class="flex">
            <Tab v-for="subSection in c1Tabs" as="template" :key="subSection" v-slot="{ selected }">
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
                  <!-- START ITEM NUMBER Fields as HR PPMS -->
                  <template v-if="true">
                    <div class="flex flex-row items-center justify-center gap-4">
                      <WbAutoComplete
                        :useApiFilter="true"
                        :apiEndpoint="'/items/search'"
                        :suggestions="libraryStore.officeOptions"
                        apiOptionLabel="item_number"
                        label="Item Number"
                        placeholder="Type the item number"
                        v-model="selectedItemNo"
                        :id="getId('input-item-no')"
                        optionLabel="label"
                        optionValue="value"
                        required
                        @on-true-value-computed="
                          (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                            useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'references'))
                        "
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                        validation-error-message-class="text-xs text-error-300 font-bold lg:font-normal dark:lg:text-error-300"
                      >
                      </WbAutoComplete>
                      <RouterLink :to="{ name: 'support', state: { from: 'recruitment' } }" v-tooltip.top="'Add Item Number'">
                        <FontAwesomeIcon icon="fa-solid fa-plus" class="mt-8 text-3xl font-bold text-primary-500" />
                      </RouterLink>
                    </div>

                    <WbInputText
                      :id="getId('input-item-position')"
                      label="Position"
                      :required="true"
                      readonly
                      placeholder="Position will be auto populated upon item number selection"
                      class="lg:text-md lg:placeholder:text-md cursor-not-allowed bg-surface-200 text-sm placeholder:text-sm read-only:cursor-not-allowed disabled:cursor-not-allowed"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      validation-error-message-class="text-xs text-error-300 font-bold lg:font-normal dark:lg:text-error-300"
                    />

                    <WbAutoComplete
                      :useApiFilter="true"
                      :apiEndpoint="'/salary-grades/search'"
                      :suggestions="libraryStore.officeOptions"
                      apiOptionLabel="salary_grade"
                      label="Salary Grade"
                      placeholder="Type Salary Grade with its tranche here"
                      v-model="selectedSalaryGrade"
                      :id="getId('input-salary-grade')"
                      optionLabel="label"
                      optionValue="value"
                      required
                      @on-true-value-computed="
                        (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                          useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'references'))
                      "
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-300 font-bold lg:font-normal dark:lg:text-error-300"
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
                        forceSelection
                        @on-true-value-computed="
                          (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                            useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'employee.office_id'))
                        "
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                        validation-error-message-class="text-xs text-error-300 font-bold lg:font-normal dark:lg:text-error-300"
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
                        @on-true-value-computed="
                          (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                            useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'employee.division_id'))
                        "
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                        validation-error-message-class="text-xs text-error-300 font-bold lg:font-normal dark:lg:text-error-300"
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
                        @on-true-value-computed="
                          (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                            useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'employee.section_unit'))
                        "
                        label-class="text-md text-surface-600 dark:lg:text-surface-200"
                        class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                        validation-error-message-class="text-xs text-error-300 font-bold lg:font-normal dark:lg:text-error-300"
                      >
                      </WbAutoComplete>
                    </div>
                  </template>
                  <!-- END ITEM NUMBER Fields as HR PPMS -->

                  <div class="mt-6 grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-2">
                    <WbInputText
                      v-model="payload.last_name"
                      label="Surname"
                      required
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-300 font-bold lg:font-normal dark:lg:text-error-300"
                      :invalid="validator.last_name.$invalid"
                      :invalid-text="validator.last_name.$errors[0]?.$message"
                      @blur="validator.last_name.$touch"
                    >
                    </WbInputText>

                    <WbInputText
                      v-model="payload.first_name"
                      label="First Name"
                      required
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-300 font-bold lg:font-normal dark:lg:text-error-300"
                      :invalid="validator.first_name.$invalid"
                      :invalid-text="validator.first_name.$errors[0]?.$message"
                      @blur="validator.first_name.$touch"
                    >
                    </WbInputText>
                    <WbInputText
                      v-model="payload.middle_name"
                      label="Middle Name"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-300 font-bold lg:font-normal dark:lg:text-error-300"
                      :invalid="validator.middle_name.$invalid"
                      :invalid-text="validator.middle_name.$errors[0]?.$message"
                      @blur="validator.middle_name.$touch"
                    >
                    </WbInputText>
                    <WbDropdown
                      v-model="payload.ext_name"
                      optionLabel="label"
                      optionValue="value"
                      :options="libraryStore.extNameOptions"
                      label="Extension Name"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-300 font-bold lg:font-normal dark:lg:text-error-300"
                      :invalid="validator.ext_name.$invalid"
                      :invalid-text="validator.ext_name.$errors[0]?.$message"
                      @blur="validator.ext_name.$touch"
                    >
                    </WbDropdown>

                    <WbCalendar
                      v-model="payload.birthday"
                      dateFormat="MM dd, yy"
                      :maxDate="new Date()"
                      label="Date of Birth"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                    >
                      <template #prepend-icon>
                        <i class="pi pi-gift" />
                      </template>
                    </WbCalendar>

                    <WbInputText
                      v-model="payload.place_of_birth"
                      label="Place of Birth"
                      required
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                      validation-error-message-class="text-xs text-error-300 font-bold lg:font-normal dark:lg:text-error-300"
                      :invalid="validator.place_of_birth.$invalid"
                      :invalid-text="validator.place_of_birth.$errors[0]?.$message"
                      @blur="validator.place_of_birth.$touch"
                    >
                    </WbInputText>

                    <WbDropdown
                      v-model="payload.sex"
                      required
                      :options="libraryStore.sexOptions"
                      optionLabel="label"
                      optionValue="value"
                      label="Sex"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      :invalid="validator.sex.$invalid"
                      :invalid-text="validator.sex.$errors[0]?.$message"
                      @blur="validator.sex.$touch"
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
                          <RadioButton v-model="payload.citizenship" inputId="ingredient1" name="citizenship" value="Filipino" />
                          <label for="ingredient1" class="ml-2 cursor-pointer">Filipino</label>
                        </div>
                        <div class="flex items-center">
                          <RadioButton
                            v-model="payload.citizenship"
                            inputId="ingredient2"
                            name="citizenship"
                            value="Dual Citizenship"
                          />
                          <label for="ingredient2" class="ml-2 cursor-pointer">Dual Citizen</label>
                        </div>
                      </div>
                    </div>

                    <WbDropdown
                      v-model="payload.civil_status"
                      required
                      :options="libraryStore.civilStatusOptions"
                      optionLabel="label"
                      optionValue="value"
                      label="Civil Status"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      :invalid="validator.civil_status.$invalid"
                      :invalid-text="validator.civil_status.$errors[0]?.$message"
                      @blur="validator.civil_status.$touch"
                    >
                      <template #prepend-icon>
                        <FontAwesomeIcon icon="fa-solid fa-people-arrows" />
                      </template>
                    </WbDropdown>

                    <WbDropdown
                      v-model="payload.citizenship_acquisition"
                      required
                      :options="libraryStore.citizenshipAcquisitionOptions"
                      optionLabel="label"
                      optionValue="value"
                      label="Filipino by"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      :invalid="validator.citizenship_acquisition.$invalid"
                      :invalid-text="validator.citizenship_acquisition.$errors[0]?.$message"
                      @blur="validator.citizenship_acquisition.$touch"
                    >
                      <template #prepend-icon>
                        <FontAwesomeIcon icon="fa-solid fa-house-flag" />
                      </template>
                    </WbDropdown>
                    <InputNumber
                      placeholder="Height in meters"
                      required
                      label="Height (m)"
                      v-model="payload.height"
                      suffix=" m"
                    />
                    <WbDropdown
                      v-model="payload.blood_type"
                      required
                      :options="libraryStore.bloodTypeOptions"
                      optionLabel="label"
                      optionValue="value"
                      label="Blood Type"
                      label-class="text-md text-surface-600 dark:lg:text-surface-200"
                      :invalid="validator.blood_type.$invalid"
                      :invalid-text="validator.blood_type.$errors[0]?.$message"
                      @blur="validator.blood_type.$touch"
                    >
                      <template #prepend-icon>
                        <FontAwesomeIcon icon="fa-solid fa-droplet" />
                      </template>
                    </WbDropdown>

                    <InputNumber
                      placeholder="Weight in kilos"
                      required
                      label="Weight (kg)"
                      v-model="payload.height"
                      suffix=" kg"
                    />
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
