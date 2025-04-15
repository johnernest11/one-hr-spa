<script setup lang="ts">
import { reactive, ref, onBeforeMount, toRef, toRefs } from 'vue'
import { PersonalDataSheetPayload } from '@/stores/personal-data-sheet.store.ts'
import { storeToRefs } from 'pinia'
import { useFilterByParentId, useClearSelectedAddressIfNotInParentList } from '@/composables/address.options.ts'
import { useAuthStore } from '@/stores/auth.store.ts'
import { useAddressStore } from '@/stores/address.store.ts'
import useVuelidate from '@vuelidate/core'
import WbInputText from '@/components/webkit/WbInputText.vue'
import WbCalendar from '@/components/webkit/WbCalendar.vue'
import WbDropdown from '@/components/webkit/WbDropdown.vue'
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
/** Payload */
const authStore = useAuthStore()
const auntenticatedUser = authStore.authenticatedUser?.user_profile
const authPersonnelDataSheet = authStore.authenticatedUser?.user_profile?.personnel_data_sheet
const authPersonnelAdresses = authStore.authenticatedUser?.user_profile?.personnel_data_sheet?.personnel_addresses
const authPersonnelFamily = authStore.authenticatedUser?.user_profile?.personnel_data_sheet?.personnel_family
const authPersonnelEducation = authStore.authenticatedUser?.user_profile?.personnel_data_sheet?.personnel_educational_background
const payload = reactive<PersonalDataSheetPayload>({
  /** User Profile  */
  last_name: auntenticatedUser?.last_name || '',
  first_name: auntenticatedUser?.first_name || '',
  middle_name: auntenticatedUser?.middle_name || '',
  ext_name: auntenticatedUser?.ext_name || '',
  birthday: auntenticatedUser?.birthday || '',
  sex: auntenticatedUser?.sex || null,
  /** Personnel Data Sheet  */
  place_of_birth: authPersonnelDataSheet?.place_of_birth || '',
  civil_status: authPersonnelDataSheet?.civil_status || null,
  height: authPersonnelDataSheet?.height || '',
  weight: authPersonnelDataSheet?.weight || '',
  blood_type: authPersonnelDataSheet?.blood_type || null,
  gsis_no: authPersonnelDataSheet?.pag_ibig_no || '',
  philhealth_no: authPersonnelDataSheet?.philhealth_no || '',
  pag_ibig_no: authPersonnelDataSheet?.sss_no || '',
  sss_no: authPersonnelDataSheet?.sss_no || '',
  tin_no: authPersonnelDataSheet?.tin_no || '',
  agency_employee_no: authPersonnelDataSheet?.agency_employee_no || '',
  citizenship: authPersonnelDataSheet?.citizenship || '',
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
  await Promise.allSettled([
    publicStore.fetchRegions(),
    publicStore.fetchProvinces(),
    publicStore.fetchCities(),
    publicStore.fetchBarangays(),
  ])

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
</script>

<template>
  <form @submit.prevent autocomplete="off">
    <div v-if="activeSubTab === 0">
      <!--Start of TAB 0-->
      <h2 class="mb-2 text-2xl font-semibold italic text-primary-800 dark:text-primary-400">I. Personal Information</h2>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-4 md:flex-row">
          <div class="flex w-full flex-col">
            <label for="period" class="mb-2 text-xs text-surface-600"> Item No. <span class="text-error-500">*</span> </label>
            <InputMask
              v-model="payload.tin_no"
              mask="999-999-999"
              placeholder="XXX-XXX-XXX"
              :invalid="validator.tin_no.$invalid"
              :invalid-text="validator.tin_no.$errors[0]?.$message"
              @blur="validator.tin_no.$touch"
              fluid
              class="h-12 rounded border px-4 py-6"
            >
            </InputMask>
          </div>
        </div>
        <div class="flex flex-col gap-4 md:flex-row">
          <div class="flex w-full flex-col">
            <label for="period" class="mb-2 text-xs text-surface-600"> Position <span class="text-error-500">*</span> </label>
            <InputMask
              v-model="payload.tin_no"
              mask="999-999-999"
              placeholder="XXX-XXX-XXX"
              :invalid="validator.tin_no.$invalid"
              :invalid-text="validator.tin_no.$errors[0]?.$message"
              @blur="validator.tin_no.$touch"
              fluid
              class="h-12 rounded border px-4 py-6"
            >
            </InputMask>
          </div>
        </div>
        <div class="flex flex-col gap-4 md:flex-row">
          <div class="flex w-full flex-col">
            <label for="period" class="mb-2 text-xs text-surface-600"> Salary Grade <span class="text-error-500">*</span> </label>
            <InputMask
              v-model="payload.tin_no"
              mask="999-999-999"
              placeholder="XXX-XXX-XXX"
              :invalid="validator.tin_no.$invalid"
              :invalid-text="validator.tin_no.$errors[0]?.$message"
              @blur="validator.tin_no.$touch"
              fluid
              class="h-12 rounded border px-4 py-6"
            >
            </InputMask>
          </div>
        </div>
        <div class="flex flex-col gap-4 md:flex-row">
          <div class="flex w-full flex-col">
            <label for="period" class="mb-2 text-xs text-surface-600"> Office <span class="text-error-500">*</span> </label>
            <InputMask
              v-model="payload.tin_no"
              mask="999-999-999"
              placeholder="XXX-XXX-XXX"
              :invalid="validator.tin_no.$invalid"
              :invalid-text="validator.tin_no.$errors[0]?.$message"
              @blur="validator.tin_no.$touch"
              fluid
              class="h-12 rounded border px-4 py-6"
            >
            </InputMask>
          </div>
          <div class="flex w-full flex-col">
            <label for="period" class="mb-2 text-xs text-surface-600"> Division <span class="text-error-500">*</span> </label>
            <InputMask
              v-model="payload.tin_no"
              mask="999-999-999"
              placeholder="XXX-XXX-XXX"
              :invalid="validator.tin_no.$invalid"
              :invalid-text="validator.tin_no.$errors[0]?.$message"
              @blur="validator.tin_no.$touch"
              fluid
              class="h-12 rounded border px-4 py-6"
            >
            </InputMask>
          </div>
          <div class="flex w-full flex-col">
            <label for="period" class="mb-2 text-xs text-surface-600"> Section/Unit <span class="text-error-500">*</span> </label>
            <InputMask
              v-model="payload.tin_no"
              mask="999-999-999"
              placeholder="XXX-XXX-XXX"
              :invalid="validator.tin_no.$invalid"
              :invalid-text="validator.tin_no.$errors[0]?.$message"
              @blur="validator.tin_no.$touch"
              fluid
              class="h-12 rounded border px-4 py-6"
            >
            </InputMask>
          </div>
        </div>
        <div class="flex flex-col gap-4 md:flex-row">
          <div class="flex w-full flex-col">
            <WbInputText
              v-model="payload.last_name"
              label="Surname "
              label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
              :invalid="validator.last_name.$invalid"
              :invalid-text="validator.last_name.$errors[0]?.$message"
              @blur="validator.last_name.$touch"
            >
            </WbInputText>
          </div>
          <div class="flex w-full flex-col">
            <WbInputText
              v-model="payload.first_name"
              label="First Name "
              label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
              :invalid="validator.first_name.$invalid"
              :invalid-text="validator.first_name.$errors[0]?.$message"
              @blur="validator.first_name.$touch"
            >
            </WbInputText>
          </div>
        </div>
        <div class="flex flex-col gap-4 md:flex-row">
          <div class="flex w-full flex-col">
            <WbDropdown
              label="Extension Name"
              label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
              v-model="payload.middle_name"
              :options="ExtensionTypeOptions"
              :invalid="validator.middle_name.$invalid"
              :invalid-text="validator.middle_name.$errors[0]?.$message"
              @blur="validator.middle_name.$touch"
              optionLabel="label"
              optionValue="value"
            >
            </WbDropdown>
          </div>
        </div>
        <div class="flex flex-col gap-4 md:flex-row">
          <div class="flex w-full flex-col">
            <WbCalendar
              v-model="payload.birthday"
              label="Birthday "
              label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
              dateFormat="MM dd, yy"
              :maxDate="new Date()"
            >
            </WbCalendar>
          </div>
          <div class="flex w-full flex-col">
            <WbInputText
              v-model="payload.ext_name"
              label="Extension Name"
              label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
              :invalid="validator.ext_name.$invalid"
              :invalid-text="validator.ext_name.$errors[0]?.$message"
              @blur="validator.ext_name.$touch"
            >
            </WbInputText>
          </div>
        </div>
        <div class="flex flex-col gap-4 md:flex-row">
          <div class="flex w-full flex-col">
            <WbDropdown
              v-model="payload.sex"
              label="Sex "
              label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
              :options="SexTypeOptions"
              optionLabel="label"
              optionValue="value"
            >
            </WbDropdown>
          </div>
          <div class="flex w-full flex-col">
            <div class="flex flex-col gap-4">
              <label for="period" class="mb-0 text-xs text-surface-600">
                Citizenship <span class="text-error-500">*</span>
              </label>
              <div class="flex items-center gap-4">
                <RadioButton
                  type="radio"
                  id="citizenshipFilipino"
                  name="citizenship"
                  value="Filipino"
                  v-model="payload.citizenship"
                  class="h-5 w-5 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label for="citizenshipFilipino">Filipino</label>
                <RadioButton
                  type="radio"
                  id="citizenshipDual"
                  name="citizenship"
                  value="Other Citizenship"
                  v-model="payload.citizenship"
                  class="h-5 w-5 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label for="citizenshipDual">Dual Citizenship</label>
              </div>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-12 flex-col gap-4 md:flex-row">
          <div class="col-span-6 flex w-full flex-col">
            <WbInputText
              v-model="payload.civil_status"
              label="Civil Status "
              label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
              :invalid="validator.civil_status.$invalid"
              :invalid-text="validator.civil_status.$errors[0]?.$message"
              @blur="validator.civil_status.$touch"
            >
            </WbInputText>
          </div>
          <div v-if="payload.citizenship === ''" class="col-span-6 flex w-full flex-col">
            <WbDropdown
              label="Filipino by "
              label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
              :options="FilipinobyTypeOptions"
              optionLabel="label"
              optionValue="value"
            >
            </WbDropdown>
          </div>
          <div v-else-if="payload.citizenship === 'Filipino'" class="col-span-6 flex w-full flex-col">
            <WbDropdown
              label="Filipino by "
              label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
              :options="FilipinobyTypeOptions"
              optionLabel="label"
              optionValue="value"
            >
            </WbDropdown>
          </div>
          <div v-else-if="payload.citizenship === 'Other Citizenship'" class="col-span-6 flex w-full flex-col">
            <WbDropdown
              label=" Other Citizenship "
              label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
              :options="CountryTypeOptions"
              optionLabel="label"
              optionValue="value"
            >
            </WbDropdown>
          </div>
        </div>
        <div class="flex flex-col gap-4 md:flex-row">
          <div class="flex w-full flex-col">
            <WbInputText
              v-model="payload.height"
              label=" Height (m) "
              label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
              :invalid="validator.height.$invalid"
              :invalid-text="validator.height.$errors[0]?.$message"
              @blur="validator.height.$touch"
            >
            </WbInputText>
          </div>
          <div class="flex w-full flex-col">
            <WbDropdown
              v-model="payload.blood_type"
              label=" Blood Type "
              label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
              :options="bloodTypeOptions"
              :invalid="validator.blood_type.$invalid"
              :invalid-text="validator.blood_type.$errors[0]?.$message"
              @blur="validator.blood_type.$touch"
              optionLabel="label"
              optionValue="value"
            >
            </WbDropdown>
          </div>
        </div>
        <div class="flex flex-col gap-4 md:flex-row">
          <div class="flex w-full flex-col">
            <WbInputText
              v-model="payload.weight"
              label=" Weight (kg) "
              label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
              :invalid="validator.weight.$invalid"
              :invalid-text="validator.weight.$errors[0]?.$message"
              @blur="validator.weight.$touch"
            >
            </WbInputText>
          </div>
          <div class="flex w-full flex-col">
            <label for="period" class="mb-2 text-xs text-surface-600"> GSIS ID No <span class="text-error-500">*</span> </label>
            <InputMask
              v-model="payload.gsis_no"
              mask="9999999999"
              placeholder="XXXXXXXXXX"
              :invalid="validator.gsis_no.$invalid"
              :invalid-text="validator.gsis_no.$errors[0]?.$message"
              @blur="validator.gsis_no.$touch"
              fluid
              class="h-12 rounded border px-4 py-6"
            >
            </InputMask>
          </div>
        </div>
        <div class="flex flex-col gap-4 md:flex-row">
          <div class="flex w-full flex-col">
            <label for="period" class="mb-2 text-xs text-surface-600">
              PAG-IBIG ID No <span class="text-error-500">*</span>
            </label>
            <InputMask
              v-model="payload.pag_ibig_no"
              mask="9999-9999-9999"
              placeholder="XXXX-XXXX-XXXX"
              :invalid="validator.pag_ibig_no.$invalid"
              :invalid-text="validator.pag_ibig_no.$errors[0]?.$message"
              @blur="validator.pag_ibig_no.$touch"
              fluid
              class="h-12 rounded border px-4 py-6"
            >
            </InputMask>
          </div>
          <div class="flex w-full flex-col">
            <label for="period" class="mb-2 text-xs text-surface-600">
              PHILHEALTH No <span class="text-error-500">*</span>
            </label>
            <InputMask
              v-model="payload.philhealth_no"
              mask="99-9999999999"
              placeholder="XX-XXXXXXXXXX"
              :invalid="validator.philhealth_no.$invalid"
              :invalid-text="validator.philhealth_no.$errors[0]?.$message"
              @blur="validator.philhealth_no.$touch"
              fluid
              class="h-12 rounded border px-4 py-6"
            >
            </InputMask>
          </div>
        </div>
        <div class="flex flex-col gap-4 md:flex-row">
          <div class="flex w-full flex-col">
            <label for="period" class="mb-2 text-xs text-surface-600"> TIN <span class="text-error-500">*</span> </label>
            <InputMask
              v-model="payload.tin_no"
              mask="999-999-999"
              placeholder="XXX-XXX-XXX"
              :invalid="validator.tin_no.$invalid"
              :invalid-text="validator.tin_no.$errors[0]?.$message"
              @blur="validator.tin_no.$touch"
              fluid
              class="h-12 rounded border px-4 py-6"
            >
            </InputMask>
          </div>
          <div class="flex w-full flex-col">
            <label for="period" class="mb-2 text-xs text-surface-600"> SSS No <span class="text-error-500">*</span> </label>
            <InputMask
              v-model="payload.sss_no"
              mask="99-99999999"
              placeholder="XX-XXXXXXXX"
              :invalid="validator.sss_no.$invalid"
              :invalid-text="validator.sss_no.$errors[0]?.$message"
              @blur="validator.sss_no.$touch"
              fluid
              class="h-12 rounded border px-4 py-6"
            >
            </InputMask>
          </div>
        </div>
        <div class="flex flex-col gap-4 md:flex-row">
          <div class="flex w-full flex-col">
            <label for="period" class="mb-2 text-xs text-surface-600"> Mobile No <span class="text-error-500">*</span> </label>
            <InputMask
              v-model="payload.mobile_no"
              mask="9999 9999 999"
              placeholder="XXXX XXX-XXX"
              :invalid="validator.mobile_no.$invalid"
              :invalid-text="validator.mobile_no.$errors[0]?.$message"
              @blur="validator.mobile_no.$touch"
              fluid
              class="h-12 rounded border px-4 py-6"
            >
            </InputMask>
          </div>
          <div class="flex w-full flex-col">
            <label for="period" class="mb-2 text-xs text-surface-600"> Telephone No <span class="text-error-500">*</span> </label>
            <InputMask
              v-model="payload.tel_no"
              mask="999 999 9999"
              placeholder="XXX XXX XXXX"
              :invalid="validator.tel_no.$invalid"
              :invalid-text="validator.tel_no.$errors[0]?.$message"
              @blur="validator.tel_no.$touch"
              fluid
              class="h-12 rounded border px-4 py-6"
            >
            </InputMask>
          </div>
        </div>
        <div class="flex flex-col gap-4 pb-6 md:flex-row">
          <div class="flex w-full flex-col">
            <WbInputText
              v-model="payload.agency_employee_no"
              label=" Agency Employee No "
              label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
              :invalid="validator.agency_employee_no.$invalid"
              :invalid-text="validator.agency_employee_no.$errors[0]?.$message"
              @blur="validator.agency_employee_no.$touch"
            >
            </WbInputText>
          </div>
          <div class="flex w-full flex-col">
            <WbInputText
              v-model="payload.email_address"
              label="  Email Address (if any) "
              label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
              :invalid="validator.email_address.$invalid"
              :invalid-text="validator.email_address.$errors[0]?.$message"
              @blur="validator.email_address.$touch"
            >
            </WbInputText>
          </div>
        </div>
      </div>

      <h2 class="text-2xl font-semibold italic text-primary-800 dark:text-primary-400">Address Information</h2>
      <h2 class="pb-6 text-xl font-medium italic text-primary-800 dark:text-primary-400">Residential Address</h2>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-4 md:flex-row">
          <div class="flex w-full flex-col">
            <WbAutoComplete
              v-model="selectedResidentialProvince"
              :suggestions="filteredProvinceOptionsByRegion"
              label=" Province "
              label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
              optionLabel="label"
              :placeholder="'Select or Type your Province'"
              forceSelection
              @on-true-value-computed="
                (value: WbAutoCompleteOptionTrueValue) =>
                  useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'residential_province_id'))
              "
              :loading="publicStore.provinceOptionsIsLoading"
              dropdown
              dropdownClass="bg-transparent"
            >
            </WbAutoComplete>
          </div>
          <div class="flex w-full flex-col">
            <WbAutoComplete
              v-model="selectedResidentialCity"
              :suggestions="filteredCityOptionsByProvince"
              label=" City/Municipality "
              label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
              optionLabel="label"
              :placeholder="'Select or Type your City/Municipality'"
              forceSelection
              @on-true-value-computed="
                (value: WbAutoCompleteOptionTrueValue) =>
                  useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'residential_citynum_id'))
              "
              :loading="publicStore.cityOptionsIsLoading"
              :virtualScrollerOptions="{ itemSize: 38 }"
              dropdown
              dropdownClass="bg-transparent"
            >
            </WbAutoComplete>
          </div>
        </div>
        <div class="flex flex-col gap-4 md:flex-row">
          <div class="flex w-full flex-col">
            <WbAutoComplete
              v-model="selectedResidentialBarangay"
              :suggestions="filteredBarangayOptionsByCity"
              label=" Barangay "
              label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
              optionLabel="label"
              :placeholder="'Select  your Barangay'"
              forceSelection
              @on-true-value-computed="
                (value: WbAutoCompleteOptionTrueValue) =>
                  useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'residential_brgy_id'))
              "
              :loading="publicStore.barangayOptionsIsLoading"
              :virtualScrollerOptions="{ itemSize: 38 }"
              dropdown
              dropdownClass="bg-transparent"
            >
            </WbAutoComplete>
          </div>
          <div class="flex w-full flex-col">
            <label for="period" class="mb-0 text-xs text-surface-600">
              Subdivision/Village <span class="text-error-500">*</span>
            </label>
            <WbInputText label="" value="N/A"> </WbInputText>
          </div>
        </div>
        <div class="flex flex-col gap-4 md:flex-row">
          <div class="flex w-full flex-col">
            <label for="period" class="mb-0 text-xs text-surface-600">
              Subdivision/Village <span class="text-error-500">*</span>
            </label>
            <WbInputText label="" value="N/A"> </WbInputText>
          </div>
        </div>
        <div class="flex flex-col gap-4 md:flex-row">
          <div class="flex w-full flex-col">
            <label for="period" class="mb-0 text-xs text-surface-600"> Street <span class="text-error-500">*</span> </label>
            <WbInputText label="" value="N/A"> </WbInputText>
          </div>
          <div class="flex w-full flex-col">
            <label for="period" class="mb-0 text-xs text-surface-600">
              House / Block / Lot No <span class="text-error-500">*</span>
            </label>
            <WbInputText label="" value="N/A"> </WbInputText>
          </div>
        </div>
        <div class="flex flex-col gap-4 pb-6 md:flex-row">
          <div class="flex w-full flex-col">
            <label for="period" class="mb-0 text-xs text-surface-600"> Zip Code <span class="text-error-500">*</span> </label>
            <WbInputText label="" value="N/A"> </WbInputText>
          </div>
        </div>
      </div>
      <!--End of Residential Information-->

      <!--Start of Permanent Information-->
      <h2 class="pb-2 text-xl font-medium italic text-primary-800 dark:text-primary-400">Permanent Address</h2>
      <div class="mPermanent Adb-4 flex items-center">
        <input
          type="checkbox"
          v-model="payload.first_name"
          class="h-4 w-4 rounded border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-blue-600"
        />
        <label for="same_AsResidential" class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
          >My permanent address is the same with residential address</label
        >
      </div>
      <div class="flex flex-col gap-4 pb-6">
        <div class="flex flex-col gap-4 md:flex-row">
          <div class="flex w-full flex-col">
            <label for="period" class="mb-0 text-xs text-surface-600"> Province <span class="text-error-500">*</span> </label>
            <WbAutoComplete
              v-model="selectedResidentialProvince"
              :suggestions="filteredProvinceOptionsByRegion"
              label=""
              optionLabel="label"
              :placeholder="'Select or Type your Province'"
              forceSelection
              @on-true-value-computed="
                (value: WbAutoCompleteOptionTrueValue) =>
                  useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'permanent_province_id'))
              "
              :loading="publicStore.provinceOptionsIsLoading"
              dropdown
              dropdownClass="bg-transparent"
            >
            </WbAutoComplete>
          </div>
          <div class="flex w-full flex-col">
            <label for="period" class="mb-0 text-xs text-surface-600">
              City/Municipality <span class="text-error-500">*</span>
            </label>
            <WbAutoComplete
              v-model="selectedResidentialCity"
              :suggestions="filteredCityOptionsByProvince"
              label=""
              optionLabel="label"
              :placeholder="'Select or Type your City/Municipality'"
              forceSelection
              @on-true-value-computed="
                (value: WbAutoCompleteOptionTrueValue) =>
                  useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'permanent_citynum_id'))
              "
              :loading="publicStore.cityOptionsIsLoading"
              :virtualScrollerOptions="{ itemSize: 38 }"
              dropdown
              dropdownClass="bg-transparent"
            >
            </WbAutoComplete>
          </div>
        </div>
        <div class="flex flex-col gap-4 md:flex-row">
          <div class="flex w-full flex-col">
            <label for="period" class="mb-0 text-xs text-surface-600"> Barangay <span class="text-error-500">*</span> </label>
            <WbAutoComplete
              v-model="selectedResidentialBarangay"
              :suggestions="filteredBarangayOptionsByCity"
              label=""
              optionLabel="label"
              :placeholder="'Type your Barangay'"
              forceSelection
              @on-true-value-computed="
                (value: WbAutoCompleteOptionTrueValue) =>
                  useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'permanent_brgy_id'))
              "
              :loading="publicStore.barangayOptionsIsLoading"
              :virtualScrollerOptions="{ itemSize: 38 }"
            >
            </WbAutoComplete>
          </div>
          <div class="flex w-full flex-col">
            <label for="period" class="mb-0 text-xs text-surface-600">
              Subdivision/Village <span class="text-error-500">*</span>
            </label>
            <WbInputText label="" value="N/A"> </WbInputText>
          </div>
        </div>
        <div class="flex flex-col gap-4 md:flex-row">
          <div class="flex w-full flex-col">
            <label for="period" class="mb-0 text-xs text-surface-600"> Street <span class="text-error-500">*</span> </label>
            <WbInputText label="" value="N/A"> </WbInputText>
          </div>
          <div class="flex w-full flex-col">
            <label for="period" class="mb-0 text-xs text-surface-600">
              House / Block / Lot No <span class="text-error-500">*</span>
            </label>
            <WbInputText label="" value="N/A"> </WbInputText>
          </div>
        </div>
        <div class="flex flex-col gap-4 md:flex-row">
          <div class="flex w-full flex-col">
            <label for="period" class="mb-0 text-xs text-surface-600"> Zip Code <span class="text-error-500">*</span> </label>
            <WbInputText label="" value="N/A"> </WbInputText>
          </div>
        </div>
        <!--End of Address Information-->
      </div>
      <!--End of Permanent Information-->
    </div>
    <!--End of TAB 0-->

    <div v-if="activeSubTab === 1">
      <!--Start of TAB 1 -->
      <!--Start of Family Background-->
      <h2 class="text-2xl font-semibold italic text-primary-800 dark:text-primary-400">II. Family Background</h2>
      <!--Start of Spouse Fields-->
      <div class="flex flex-col gap-4">
        <h2 class="text-xl font-medium italic text-primary-800 dark:text-primary-400">Spouse</h2>
        <div class="flex flex-col gap-4">
          <div class="grid grid-cols-12 flex-col gap-4 md:flex-row">
            <div class="col-span-12 flex w-full flex-col md:col-span-4">
              <WbInputText
                v-model="payload.family_last_name"
                label=" Surname "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.family_last_name.$invalid"
                :invalid-text="validator.family_last_name.$errors[0]?.$message"
                @blur="validator.family_last_name.$touch"
              >
              </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col md:col-span-3">
              <WbInputText
                v-model="payload.family_first_name"
                label=" First Name "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.family_first_name.$invalid"
                :invalid-text="validator.family_first_name.$errors[0]?.$message"
                @blur="validator.family_first_name.$touch"
              >
              </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col md:col-span-3">
              <WbInputText
                v-model="payload.family_middle_name"
                label=" Middle Name "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.family_middle_name.$invalid"
                :invalid-text="validator.family_middle_name.$errors[0]?.$message"
                @blur="validator.family_middle_name.$touch"
              >
              </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col md:col-span-2">
              <WbDropdown
                v-model="payload.family_ext_name"
                label=" Name Ext "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :options="ExtensionTypeOptions"
                :invalid="validator.family_ext_name.$invalid"
                :invalid-text="validator.family_ext_name.$errors[0]?.$message"
                optionLabel="label"
                optionValue="value"
              ></WbDropdown>
            </div>
          </div>
          <div class="grid grid-cols-12 flex-col gap-4 md:flex-row">
            <div class="col-span-12 flex w-full flex-col md:col-span-3">
              <WbInputText
                v-model="payload.family_occupation"
                label=" Occupation "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.occupation.$invalid"
                :invalid-text="validator.occupation.$errors[0]?.$message"
                @blur="validator.occupation.$touch"
              >
              </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col md:col-span-3">
              <WbInputText
                v-model="payload.family_employers_business_name"
                label=" Employee / Business Name "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.employers_business_name.$invalid"
                :invalid-text="validator.employers_business_name.$errors[0]?.$message"
                @blur="validator.employers_business_name.$touch"
              >
              </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col md:col-span-3">
              <WbInputText
                v-model="payload.family_business_address"
                label="  Business Address "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.business_address.$invalid"
                :invalid-text="validator.business_address.$errors[0]?.$message"
                @blur="validator.business_address.$touch"
              >
              </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col pb-6 md:col-span-3">
              <label for="period" class="mb-0 pb-2 text-xs text-surface-600">
                Telephone No. <span class="text-error-500">*</span>
              </label>
              <InputMask
                v-model="payload.family_telephone_no"
                label="  Telephone No "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                mask="999 999 9999"
                placeholder="XXX XXX XXXX"
                :invalid="validator.family_telephone_no.$invalid"
                :invalid-text="validator.family_telephone_no.$errors[0]?.$message"
                @blur="validator.family_telephone_no.$touch"
                fluid
                class="h-12 rounded border px-4 py-6"
              ></InputMask>
            </div>
          </div>
        </div>
        <!--End of Spouse Fields-->
        <!--Start of Father Fields-->
        <h2 class="text-xl font-medium italic text-primary-800 dark:text-primary-400">Father</h2>
        <div class="flex flex-col gap-4">
          <div class="grid grid-cols-12 flex-col gap-4 md:flex-row">
            <div class="col-span-12 flex w-full flex-col md:col-span-4">
              <WbInputText
                v-model="payload.family_last_name"
                label=" Surname "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.family_last_name.$invalid"
                :invalid-text="validator.family_last_name.$errors[0]?.$message"
                @blur="validator.family_last_name.$touch"
              >
              </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col md:col-span-3">
              <WbInputText
                v-model="payload.family_first_name"
                label=" First Name "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.family_first_name.$invalid"
                :invalid-text="validator.family_first_name.$errors[0]?.$message"
                @blur="validator.family_last_name.$touch"
              >
              </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col md:col-span-3">
              <WbInputText
                v-model="payload.family_middle_name"
                label=" Middle Name "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.family_middle_name.$invalid"
                :invalid-text="validator.family_middle_name.$errors[0]?.$message"
                @blur="validator.family_middle_name.$touch"
              >
              </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col md:col-span-2">
              <WbDropdown
                v-model="payload.family_ext_name"
                label=" Name Ext "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :options="ExtensionTypeOptions"
                optionLabel="label"
                optionValue="value"
              ></WbDropdown>
            </div>
          </div>
        </div>
        <!--End of Father Fields-->
        <!--Start of Mother's Maiden Name Fields-->
        <h2 class="text-xl font-medium italic text-primary-800 dark:text-primary-400">Mother's Maiden Name</h2>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-4 md:flex-row">
            <div class="flex w-full flex-col">
              <WbInputText
                v-model="payload.family_last_name"
                label="Surname "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.family_last_name.$invalid"
                :invalid-text="validator.family_last_name.$errors[0]?.$message"
                @blur="validator.family_last_name.$touch"
              >
              </WbInputText>
            </div>
            <div class="flex w-full flex-col">
              <WbInputText
                v-model="payload.family_first_name"
                label=" First Name "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.family_first_name.$invalid"
                :invalid-text="validator.family_first_name.$errors[0]?.$message"
                @blur="validator.family_first_name.$touch"
              >
              </WbInputText>
            </div>
            <div class="flex w-full flex-col">
              <WbInputText
                v-model="payload.family_middle_name"
                label=" Middle Name "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.family_middle_name.$invalid"
                :invalid-text="validator.family_middle_name.$errors[0]?.$message"
                @blur="validator.family_middle_name.$touch"
              >
              </WbInputText>
            </div>
          </div>
        </div>
        <!--End of Mother's Maiden Name Fields-->
        <!--Start of Children Fields-->
        <h2 class="text-xl font-medium italic text-primary-800 dark:text-primary-400">Children</h2>
        <div class="flex flex-col gap-4 pb-6">
          <div
            v-for="(newpersonnelfamily, index) in newpersonnelfamilies"
            :key="index"
            class="relative grid grid-cols-12 flex-col gap-4 md:flex-row"
          >
            <div class="col-span-12 flex w-full flex-col md:col-span-3">
              <WbInputText
                v-model="newpersonnelfamily.family_last_name"
                label=" Middle Name "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.family_last_name.$invalid"
                :invalid-text="validator.family_last_name.$errors[0]?.$message"
                @blur="validator.family_last_name.$touch"
              >
              </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col md:col-span-3">
              <WbInputText
                v-model="newpersonnelfamily.family_first_name"
                label=" Middle Name "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.family_first_name.$invalid"
                :invalid-text="validator.family_first_name.$errors[0]?.$message"
                @blur="validator.family_first_name.$touch"
              >
              </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col md:col-span-2">
              <WbInputText
                v-model="newpersonnelfamily.family_middle_name"
                label=" Middle Name "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.family_middle_name.$invalid"
                :invalid-text="validator.family_middle_name.$errors[0]?.$message"
                @blur="validator.family_middle_name.$touch"
              >
              </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col md:col-span-2">
              <WbDropdown
                v-model="newpersonnelfamily.family_extension_name"
                label=" Name Ext "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :options="ExtensionTypeOptions"
                value="N/A"
                placeholder="N/A"
                optionLabel="label"
                optionValue="value"
              ></WbDropdown>
            </div>
            <div class="col-span-12 flex w-full flex-col md:col-span-2">
              <WbInputText
                v-model="newpersonnelfamily.family_date_of_birth"
                label=" Date of Birth "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.family_date_of_birth.$invalid"
                :invalid-text="validator.family_date_of_birth.$errors[0]?.$message"
                @blur="validator.family_date_of_birth.$touch"
              >
              </WbInputText>
            </div>
            <div class="absolute right-0 top-6 mt-2 md:mt-0">
              <Button
                icon="pi pi-trash"
                severity="danger"
                rounded
                @click="removePersonnelFamily(index)"
                v-if="newpersonnelfamilies.length > 1"
                class="mt-2"
              />
            </div>
            <Divider layout="horizontal" class="mt-4 md:hidden" v-if="index < newpersonnelfamilies.length - 1" />
          </div>
          <div class="flex flex-col gap-2">
            <div class="flex w-full">
              <hr />
              <Button
                icon="pi pi-plus"
                label="Add additional child field"
                @click="addAdditionalPersonnelFamily"
                class="dark:text-secondary-100 border border-primary-600 text-sm text-primary-600 dark:border-surface-600 lg:text-primary-600 dark:lg:text-surface-400"
                text
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    <!--end of TAB 1 -->

    <div v-if="activeSubTab === 2">
      <!--Start of TAB 2 -->
      <!--Start of Educational Background-->
      <h2 class="text-2xl font-semibold italic text-primary-800 dark:text-primary-400">III. Educational Background</h2>
      <!--Start of Elementary Fields-->
      <div class="flex flex-col gap-4">
        <h2 class="text-xl font-medium italic text-primary-800 dark:text-primary-400">Elementary</h2>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-4 md:flex-row">
            <div class="flex w-full flex-col">
              <label for="period" class="mb-0 text-xs text-surface-600">
                Name of School <span class="text-error-500">*</span>
              </label>
              <WbInputText label="" value="N/A"> </WbInputText>
            </div>
            <div class="flex w-full flex-col">
              <label for="period" class="mb-0 text-xs text-surface-600">
                Basic Education / Degree / Course<span class="text-error-500">*</span>
              </label>
              <WbInputText label="" value="N/A"> </WbInputText>
            </div>
          </div>
          <div class="grid grid-cols-12 flex-col gap-4 md:flex-row">
            <div class="col-span-12 flex w-full flex-col md:col-span-1">
              <label for="period" class="mb-0 whitespace-nowrap text-xs text-surface-600">
                From <span class="text-error-500">*</span>
              </label>
              <WbInputText label="" value="N/A"> </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col md:col-span-1">
              <label for="period" class="mb-0 whitespace-nowrap text-xs text-surface-600">
                To <span class="text-error-500">*</span>
              </label>
              <WbInputText label="" value="N/A"> </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col md:col-span-4">
              <label for="period" class="mb-0 whitespace-nowrap text-xs text-surface-600">
                Highest Level/ Units Earned <span class="text-error-500">*</span>
              </label>
              <WbInputText label="" value="N/A"> </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col md:col-span-2">
              <label for="period" class="mb-0 whitespace-nowrap text-xs text-surface-600">
                Year Graduated <span class="text-error-500">*</span>
              </label>
              <WbInputText label="" value="N/A"> </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col pb-6 md:col-span-4">
              <label for="period" class="mb-0 whitespace-nowrap text-xs text-surface-600">
                Scholarship / Academic Honors Received<span class="text-error-500">*</span>
              </label>
              <WbInputText label="" value="N/A"> </WbInputText>
            </div>
          </div>
        </div>
        <!--End of Elementary Fields-->
        <!--Start of Secondary Fields-->
        <h2 class="text-xl font-medium italic text-primary-800 dark:text-primary-400">Secondary</h2>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-4 md:flex-row">
              <div class="flex w-full flex-col">
                <WbInputText
                  v-model="payload.schools_name"
                  label=" Name of School  "
                  label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                  :invalid="validator.schools_name.$invalid"
                  :invalid-text="validator.schools_name.$errors[0]?.$message"
                  @blur="validator.schools_name.$touch"
                >
                </WbInputText>
              </div>
              <div class="flex w-full flex-col">
                <WbInputText
                  v-model="payload.level"
                  label=" Basic Education / Degree / Course "
                  label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                  :invalid="validator.level.$invalid"
                  :invalid-text="validator.level.$errors[0]?.$message"
                  @blur="validator.level.$touch"
                >
                </WbInputText>
              </div>
            </div>
          </div>
          <div class="grid grid-cols-12 flex-col gap-4 md:flex-row">
            <div class="col-span-12 flex w-full flex-col md:col-span-1">
              <WbInputText
                v-model="payload.period_of_attendance_from"
                label=" From "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.period_of_attendance_from.$invalid"
                :invalid-text="validator.period_of_attendance_from.$errors[0]?.$message"
                @blur="validator.period_of_attendance_from.$touch"
              >
              </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col md:col-span-1">
              <WbInputText
                v-model="payload.period_of_attendance_to"
                label=" To "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.period_of_attendance_to.$invalid"
                :invalid-text="validator.period_of_attendance_to.$errors[0]?.$message"
                @blur="validator.period_of_attendance_to.$touch"
              >
              </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col md:col-span-4">
              <WbInputText
                v-model="payload.highest_level_units_earned"
                label=" Highest Level/ Units Earned "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.highest_level_units_earned.$invalid"
                :invalid-text="validator.highest_level_units_earned.$errors[0]?.$message"
                @blur="validator.highest_level_units_earned.$touch"
              >
              </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col md:col-span-2">
              <WbInputText
                v-model="payload.year_graduated"
                label=" Year Graduated "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.year_graduated.$invalid"
                :invalid-text="validator.year_graduated.$errors[0]?.$message"
                @blur="validator.year_graduated.$touch"
              >
              </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col pb-6 md:col-span-4">
              <WbInputText
                v-model="payload.scholarship_academic_honors_received"
                label=" Scholarship / Academic Honors Received "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.scholarship_academic_honors_received.$invalid"
                :invalid-text="validator.scholarship_academic_honors_received.$errors[0]?.$message"
                @blur="validator.scholarship_academic_honors_received.$touch"
              >
              </WbInputText>
            </div>
          </div>
        </div>
        <!--End of Secondary Fields-->
        <!--Start of Vocational / Trade Course Fields-->
        <h2 class="text-xl font-medium italic text-primary-800 dark:text-primary-400">Vocational / Trade Course</h2>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-4 md:flex-row">
              <div class="flex w-full flex-col">
                <WbInputText
                  v-model="payload.schools_name"
                  label=" Name of School  "
                  label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                  :invalid="validator.schools_name.$invalid"
                  :invalid-text="validator.schools_name.$errors[0]?.$message"
                  @blur="validator.schools_name.$touch"
                >
                </WbInputText>
              </div>
              <div class="flex w-full flex-col">
                <WbInputText
                  v-model="payload.level"
                  label=" Basic Education / Degree / Course "
                  label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                  :invalid="validator.level.$invalid"
                  :invalid-text="validator.level.$errors[0]?.$message"
                  @blur="validator.level.$touch"
                >
                </WbInputText>
              </div>
            </div>
          </div>
          <div class="grid grid-cols-12 flex-col gap-4 md:flex-row">
            <div class="col-span-12 flex w-full flex-col md:col-span-1">
              <WbInputText
                v-model="payload.period_of_attendance_from"
                label=" From "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.period_of_attendance_from.$invalid"
                :invalid-text="validator.period_of_attendance_from.$errors[0]?.$message"
                @blur="validator.period_of_attendance_from.$touch"
              >
              </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col md:col-span-1">
              <WbInputText
                v-model="payload.period_of_attendance_to"
                label=" To "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.period_of_attendance_to.$invalid"
                :invalid-text="validator.period_of_attendance_to.$errors[0]?.$message"
                @blur="validator.period_of_attendance_to.$touch"
              >
              </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col md:col-span-4">
              <WbInputText
                v-model="payload.highest_level_units_earned"
                label=" Highest Level/ Units Earned "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.highest_level_units_earned.$invalid"
                :invalid-text="validator.highest_level_units_earned.$errors[0]?.$message"
                @blur="validator.highest_level_units_earned.$touch"
              >
              </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col md:col-span-2">
              <WbInputText
                v-model="payload.year_graduated"
                label=" Year Graduated "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.year_graduated.$invalid"
                :invalid-text="validator.year_graduated.$errors[0]?.$message"
                @blur="validator.year_graduated.$touch"
              >
              </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col pb-6 md:col-span-4">
              <WbInputText
                v-model="payload.scholarship_academic_honors_received"
                label=" Scholarship / Academic Honors Received "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.scholarship_academic_honors_received.$invalid"
                :invalid-text="validator.scholarship_academic_honors_received.$errors[0]?.$message"
                @blur="validator.scholarship_academic_honors_received.$touch"
              >
              </WbInputText>
            </div>
          </div>
        </div>
        <!--End of Vocational / Trade Course Fields-->
        <!--Start of College Fields-->
        <h2 class="text-xl font-medium italic text-primary-800 dark:text-primary-400">College</h2>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-4 md:flex-row">
            <div class="flex w-full flex-col">
              <WbInputText
                v-model="payload.schools_name"
                label=" Name of School  "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.schools_name.$invalid"
                :invalid-text="validator.schools_name.$errors[0]?.$message"
                @blur="validator.schools_name.$touch"
              >
              </WbInputText>
            </div>
            <div class="flex w-full flex-col">
              <WbInputText
                v-model="payload.level"
                label=" Basic Education / Degree / Course "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.level.$invalid"
                :invalid-text="validator.level.$errors[0]?.$message"
                @blur="validator.level.$touch"
              >
              </WbInputText>
            </div>
          </div>
          <div class="grid grid-cols-12 flex-col gap-4 md:flex-row">
            <div class="col-span-12 flex w-full flex-col md:col-span-1">
              <WbInputText
                v-model="payload.period_of_attendance_from"
                label=" From "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.period_of_attendance_from.$invalid"
                :invalid-text="validator.period_of_attendance_from.$errors[0]?.$message"
                @blur="validator.period_of_attendance_from.$touch"
              >
              </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col md:col-span-1">
              <WbInputText
                v-model="payload.period_of_attendance_to"
                label=" To "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.period_of_attendance_to.$invalid"
                :invalid-text="validator.period_of_attendance_to.$errors[0]?.$message"
                @blur="validator.period_of_attendance_to.$touch"
              >
              </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col md:col-span-4">
              <WbInputText
                v-model="payload.highest_level_units_earned"
                label=" Highest Level/ Units Earned "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.highest_level_units_earned.$invalid"
                :invalid-text="validator.highest_level_units_earned.$errors[0]?.$message"
                @blur="validator.highest_level_units_earned.$touch"
              >
              </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col md:col-span-2">
              <WbInputText
                v-model="payload.year_graduated"
                label=" Year Graduated "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.year_graduated.$invalid"
                :invalid-text="validator.year_graduated.$errors[0]?.$message"
                @blur="validator.year_graduated.$touch"
              >
              </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col pb-6 md:col-span-4">
              <WbInputText
                v-model="payload.scholarship_academic_honors_received"
                label=" Scholarship / Academic Honors Received "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.scholarship_academic_honors_received.$invalid"
                :invalid-text="validator.scholarship_academic_honors_received.$errors[0]?.$message"
                @blur="validator.scholarship_academic_honors_received.$touch"
              >
              </WbInputText>
            </div>
          </div>
        </div>
        <!--End of College Fields-->
        <!--Start of Graduate Studies Fields-->
        <h2 class="text-xl font-medium italic text-primary-800 dark:text-primary-400">Graduate Studies</h2>
        <div
          v-for="(newpersonneleducationbackground, index) in newpersonneleducationbackgrounds"
          :key="index"
          class="flex flex-col gap-4"
        >
          <div class="flex flex-col gap-4 md:flex-row">
            <div class="flex w-full flex-col">
              <WbInputText
                v-model="payload.schools_name"
                label=" Name of School  "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.schools_name.$invalid"
                :invalid-text="validator.schools_name.$errors[0]?.$message"
                @blur="validator.schools_name.$touch"
              >
              </WbInputText>
            </div>
            <div class="flex w-full flex-col">
              <WbInputText
                v-model="payload.level"
                label=" Basic Education / Degree / Course "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.level.$invalid"
                :invalid-text="validator.level.$errors[0]?.$message"
                @blur="validator.level.$touch"
              >
              </WbInputText>
            </div>
          </div>
          <div class="grid grid-cols-12 flex-col gap-4 md:flex-row">
            <div class="col-span-12 flex w-full flex-col md:col-span-1">
              <WbInputText
                v-model="payload.period_of_attendance_from"
                label=" From "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.period_of_attendance_from.$invalid"
                :invalid-text="validator.period_of_attendance_from.$errors[0]?.$message"
                @blur="validator.period_of_attendance_from.$touch"
              >
              </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col md:col-span-1">
              <WbInputText
                v-model="newpersonneleducationbackground.period_of_attendance_to"
                label=" To "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.period_of_attendance_to.$invalid"
                :invalid-text="validator.period_of_attendance_to.$errors[0]?.$message"
                @blur="validator.period_of_attendance_to.$touch"
              >
              </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col md:col-span-4">
              <WbInputText
                v-model="newpersonneleducationbackground.highest_level_units_earned"
                label=" Highest Level/ Units Earned "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.highest_level_units_earned.$invalid"
                :invalid-text="validator.highest_level_units_earned.$errors[0]?.$message"
                @blur="validator.highest_level_units_earned.$touch"
              >
              </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col md:col-span-2">
              <WbInputText
                v-model="newpersonneleducationbackground.year_graduated"
                label=" Year Graduated "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.year_graduated.$invalid"
                :invalid-text="validator.year_graduated.$errors[0]?.$message"
                @blur="validator.year_graduated.$touch"
              >
              </WbInputText>
            </div>
            <div class="col-span-12 flex w-full flex-col pb-6 md:col-span-4">
              <WbInputText
                v-model="newpersonneleducationbackground.scholarship_academic_honors_received"
                label=" Scholarship / Academic Honors Received "
                label-class="mb-0 text-xs text-surface-600 red-aesterisk-label"
                :invalid="validator.scholarship_academic_honors_received.$invalid"
                :invalid-text="validator.scholarship_academic_honors_received.$errors[0]?.$message"
                @blur="validator.scholarship_academic_honors_received.$touch"
              >
              </WbInputText>
            </div>
            <div class="absolute right-0 top-2 md:top-2">
              <Button
                icon="pi pi-trash"
                severity="danger"
                rounded
                @click="removePersonnelEducationalBackground(index)"
                v-if="newpersonneleducationbackgrounds.length > 1"
                class="mt-2"
              />
            </div>
            <Divider layout="horizontal" class="mt-4 md:hidden" v-if="index < newpersonneleducationbackgrounds.length - 1" />
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <div class="flex w-full">
            <Button
              icon="pi pi-plus"
              label="Add additional education field"
              @click="addAdditionalPersonnelEducationBackground"
              class="dark:text-secondary-100 border border-primary-600 text-sm text-primary-600 dark:border-surface-600 lg:text-primary-600 dark:lg:text-surface-400"
              text
            />
          </div>
          <Divider />
        </div>
      </div>
    </div>
    <!--end of TAB 2 -->
  </form>
</template>
