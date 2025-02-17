<script setup lang="ts">
import { computed, onBeforeMount, reactive, ref, toRef, toRefs } from 'vue'
import { UserPayload, useUsersStore } from '@/stores/users.store.ts'
import useVuelidate from '@vuelidate/core'
import { email, helpers, maxLength, minLength, required, sameAs } from '@vuelidate/validators'
import { digitCountRule, mobilePhoneRule, passwordRule, uniqueUserIdentifierRule } from '@/utils/custom-validations.ts'
import { useToast } from 'primevue/usetoast'
import { parseApiResponseError } from '@/utils/error-handle.ts'
import WbAutoComplete, { WbAutoCompleteOption, WbAutoCompleteOptionTrueValue } from '@/components/webkit/WbAutoComplete.vue'
import { useAddressStore } from '@/stores/address.store.ts'
import { storeToRefs } from 'pinia'
import { useClearSelectedAddressIfNotInParentList, useFilterByParentId } from '@/composables/address.options.ts'
import WbInputText from '@/components/webkit/WbInputText.vue'
import WbInputMask from '@/components/webkit/WbInputMask.vue'
import WbDropdown from '@/components/webkit/WbDropdown.vue'
import WbCalendar from '@/components/webkit/WbCalendar.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useWbAutoCompleteHandleTrueValue } from '@/composables/wb-ui-components.ts'
import Button from 'primevue/button'
import WbPassword from '@/components/webkit/WbPassword.vue'
import Divider from 'primevue/divider'
import Message from 'primevue/message'
import WbMultiSelect from '@/components/webkit/WbMultiSelect.vue'
import { useRolesStore } from '@/stores/roles.store.ts'
import { AuthRole } from '@/typings/auth.types.ts'

/** Props */
const props = withDefaults(defineProps<{ currentRoleFilter: number | string | null }>(), {
  currentRoleFilter: null,
})

/** Payload */
const payload = reactive<Partial<UserPayload>>({
  email: '',
  mobile_number: null,
  first_name: '',
  last_name: '',
  middle_name: null,
  ext_name: null,
  birthday: null,
  sex: null,
  home_address: null,
  city_id: null,
  province_id: null,
  region_id: null,
  postal_code: null,
  barangay_id: null,
  roles: [],
})

/** Gender Options */
const genderOptions = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
]

/** Roles Options */
const rolesStore = useRolesStore()
const rolesOptionsIsLoading = ref(false)
const rolesOptions = computed(() => {
  // Admins should not be able to select the Super User option
  return rolesStore.roleOptions.filter((r) => r.name !== AuthRole.SUPER_USER.toString())
})
onBeforeMount(async () => {
  rolesOptionsIsLoading.value = true
  await rolesStore.fetchRoles()
  rolesOptionsIsLoading.value = false
})

/** Address Section */
// Address WbAutoComplete Object References */
const selectedRegion = ref<WbAutoCompleteOption | null>(null)
const selectedProvince = ref<WbAutoCompleteOption | null>(null)
const selectedCity = ref<WbAutoCompleteOption | null>(null)
const selectedBarangay = ref<WbAutoCompleteOption | null>(null)

// Initialize Address Options List
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

  addressesAreLoading.value = false
})

// We only display a list based on parent address
const { provinceOptions, cityOptions, barangayOptions } = storeToRefs(publicStore)
const filteredProvinceOptionsByRegion = useFilterByParentId(toRef(payload, 'region_id', null), provinceOptions)
const filteredCityOptionsByProvince = useFilterByParentId(toRef(payload, 'province_id', null), cityOptions)
const filteredBarangayOptionsByCity = useFilterByParentId(toRef(payload, 'city_id', null), barangayOptions)

// We set the `selected<Address>` and `payload.<address>_id` to null if the parent is changed
useClearSelectedAddressIfNotInParentList(
  toRefs(payload),
  selectedProvince,
  selectedCity,
  selectedBarangay,
  filteredProvinceOptionsByRegion,
  filteredCityOptionsByProvince,
  filteredBarangayOptionsByCity
)

/** Validation */
const globalStringMaxLength = import.meta.env.VITE_GLOBAL_STRING_MAX_LENGTH
const globalStringMaxLengthRule = helpers.withMessage(
  `Must not exceed ${globalStringMaxLength} characters`,
  maxLength(globalStringMaxLength)
)
const formRules = {
  $lazy: true,
  email: {
    required: helpers.withMessage('The email address is required', required),
    email: helpers.withMessage('Email format is invalid', email),
    unique: helpers.withAsync(helpers.withMessage('This email is already taken', uniqueUserIdentifierRule('email'))),
  },
  mobile_number: {
    mobile_number: helpers.withMessage('Must be a valid PH mobile number', mobilePhoneRule()),
    // unique: helpers.withAsync(
    //   helpers.withMessage('This username is already taken', uniqueUserIdentifierRules('username'))
    // ),
  },
  first_name: {
    required: helpers.withMessage('First name is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
  },
  last_name: {
    required: helpers.withMessage('Last name is required', required),
    maxLength: globalStringMaxLengthRule,
  },
  middle_name: {
    maxLength: globalStringMaxLengthRule,
  },
  ext_name: {
    maxLength: globalStringMaxLengthRule,
  },
  home_address: {
    maxLength: globalStringMaxLengthRule,
  },
  postal_code: {
    digitCount: helpers.withMessage('Enter your 4-digit zip code', digitCountRule(4)),
  },
  roles: {
    required: helpers.withMessage('A user must have a role selected', required),
  },
  password: {
    required: helpers.withMessage('Please enter their password', required),
    minLength: helpers.withMessage('Must be at least 8 characters long', minLength(8)),
    maxLength: helpers.withMessage('Must be a maximum of 50 characters', maxLength(50)),
    password: helpers.withMessage('Must include at least one number, and one uppercase and lowercase letter', passwordRule()),
  },
  password_confirmation: {
    required: helpers.withMessage('Please confirm their password', required),
    sameAsPassword: helpers.withMessage('Must match the password field', sameAs(computed(() => payload.password))),
  },
}

/** Handle Form Submission */
const validator = useVuelidate<Partial<UserPayload>>(formRules, payload)
const formIsSubmitting = ref(false)
const showErrorAlert = ref(false)
const errorMessage = ref<string | null>(null)
const errorDetails = ref<string[]>([])
const userStore = useUsersStore()
const toast = useToast()

/** Emits */
const emit = defineEmits<{
  (e: 'user-created', value: boolean): void
}>()

/** Form Submission */
const handleFormSubmission = async () => {
  const valid = await validator.value.$validate()
  if (!valid) {
    document.getElementsByClassName('create-user-creds-section')[0]?.scrollIntoView({ behavior: 'smooth' })
    toast.add({
      severity: 'error',
      summary: 'Create User',
      detail: 'Please see the validation messages',
      life: 5000,
    })
    return
  }

  formIsSubmitting.value = true
  const response = await userStore.createUser(payload, props.currentRoleFilter)
  // Handle the API error
  if (!response.success) {
    const result = parseApiResponseError(response)
    if (!result) return (formIsSubmitting.value = false)

    showErrorAlert.value = true
    errorMessage.value = result.message
    errorDetails.value = result.errors

    formIsSubmitting.value = false
    return document.getElementsByClassName('create-user-creds-section')[0]?.scrollIntoView({ behavior: 'smooth' })
  }

  formIsSubmitting.value = false
  toast.add({
    severity: 'success',
    summary: 'Create User',
    detail: "You've successfully created a user",
    life: 5000,
  })

  emit('user-created', true)
}
</script>

<template>
  <form autocomplete="off" @submit.prevent>
    <div class="flex w-full flex-col gap-4 pb-4">
      <!-- Start Alert Message -->
      <transition enter-active-class="transition duration-200" enter-from-class="scale-50 opacity-0" leave-to-class="opacity-0">
        <Message v-if="showErrorAlert" :closable="false" severity="error" class="mb-2">
          <span>{{ errorMessage }}</span>
          <div class="flex flex-col text-xs">
            <div v-for="error in errorDetails" :key="error" class="mt-0.5">{{ '- ' + error }}</div>
          </div>
        </Message>
      </transition>
      <!-- End Alert Message -->

      <!-- Start Credentials -->
      <p class="create-user-creds-section text-xs font-medium uppercase">Credentials</p>
      <!-- Start Email and Mobile Number -->
      <div class="flex flex-col gap-4 md:flex-row">
        <WbInputText
          v-model="payload.email"
          label="Email *"
          :invalid="validator.email.$invalid"
          :invalid-text="validator.email.$errors[0]?.$message"
          @blur="validator.email.$touch"
          @focusin="validator.email.$dirty = false"
        >
          <template #prepend-icon>
            <i class="pi pi-envelope" />
          </template>
        </WbInputText>
        <WbInputMask
          v-model="payload.mobile_number"
          label="Mobile Number"
          mask="+639999999999"
          placeholder="+63 XXX XXX XXXX"
          :invalid="validator.mobile_number.$invalid"
          :invalid-text="validator.mobile_number.$errors[0]?.$message"
          @blur="validator.mobile_number.$touch"
          @focusin="validator.mobile_number.$dirty = false"
        >
          <template #prepend-icon>
            <i class="pi pi-phone" />
          </template>
        </WbInputMask>
      </div>
      <!-- End Email and Mobile Number -->
      <!-- Start Password and Password Confirmation -->
      <div class="flex flex-col gap-4 md:flex-row">
        <WbPassword
          v-model="payload.password"
          label="Password *"
          toggleMask
          :invalid="validator.password.$invalid"
          :invalid-text="validator.password.$errors[0]?.$message"
          @blur="validator.password.$touch"
          @focusin="validator.password.$dirty = false"
        >
          <template #prepend-icon>
            <i class="pi pi-lock" />
          </template>
          <template #footer-panel>
            <Divider />
            <p class="mb-2 font-bold">Requirements</p>
            <ul class="ml-2 pl-2 font-normal">
              <li class="mb-1">At least one lowercase</li>
              <li class="mb-1">At least one uppercase</li>
              <li class="mb-1">At least one numeric</li>
              <li class="mb-1">Minimum 8 characters</li>
            </ul>
          </template>
        </WbPassword>
        <WbPassword
          v-model="payload.password_confirmation"
          label="Confirm Password *"
          :feedback="false"
          toggleMask
          :invalid="validator.password_confirmation.$invalid"
          :invalid-text="validator.password_confirmation.$errors[0]?.$message"
          @blur="validator.password_confirmation.$touch"
        >
          <template #prepend-icon>
            <i class="pi pi-lock" />
          </template>
        </WbPassword>
      </div>
      <!-- End Password and Password Confirmation -->
      <!-- Start Roles Select -->
      <div class="flex w-full flex-col md:w-[49%] md:flex-row">
        <WbMultiSelect
          v-model="payload.roles"
          :options="rolesOptions"
          label="Roles"
          placeholder="-- Select Roles --"
          optionLabel="label"
          optionValue="value"
          optionDisabled="disabled"
          :loading="rolesOptionsIsLoading"
          :disabled="rolesOptionsIsLoading"
          display="chip"
          class="text-xs"
          :invalid="validator.roles.$invalid"
          :invalid-text="validator.roles.$errors[0]?.$message"
          @blur="validator.roles.$touch"
          @focusin="validator.roles.$dirty = false"
        />
      </div>
      <!-- End Roles Selection -->
      <!-- End Credentials -->

      <!-- Start Personal Information -->
      <p class="mt-4 text-xs font-medium uppercase md:mt-6">Basic Information</p>
      <!-- Start First name and Middle name -->
      <div class="flex flex-col gap-4 md:flex-row">
        <WbInputText
          v-model="payload.first_name"
          label="First name *"
          :invalid="validator.first_name.$invalid"
          :invalid-text="validator.first_name.$errors[0]?.$message"
          @blur="validator.first_name.$touch"
        >
          <template #prepend-icon>
            <i class="pi pi-id-card" />
          </template>
        </WbInputText>
        <WbInputText
          v-model="payload.middle_name"
          label="Middle name"
          :invalid="validator.middle_name.$invalid"
          :invalid-text="validator.middle_name.$errors[0]?.$message"
          @blur="validator.middle_name.$touch"
        >
          <template #prepend-icon>
            <i class="pi pi-id-card" />
          </template>
        </WbInputText>
      </div>
      <!-- End First name and Middle name -->
      <!-- Start Last name and Extension name -->
      <div class="flex flex-col gap-4 md:flex-row">
        <WbInputText
          v-model="payload.last_name"
          label="Last name *"
          :invalid="validator.last_name.$invalid"
          :invalid-text="validator.last_name.$errors[0]?.$message"
          @blur="validator.last_name.$touch"
        >
          <template #prepend-icon>
            <i class="pi pi-id-card" />
          </template>
        </WbInputText>
        <WbInputText
          v-model="payload.ext_name"
          label="Ext. name"
          :invalid="validator.ext_name.$invalid"
          :invalid-text="validator.ext_name.$errors[0]?.$message"
          @blur="validator.ext_name.$touch"
        >
          <template #prepend-icon>
            <i class="pi pi-id-card" />
          </template>
        </WbInputText>
      </div>
      <!-- End Last name and Extension name -->
      <!-- Start Sex and Birthday -->
      <div class="flex flex-col gap-4 md:flex-row">
        <WbDropdown v-model="payload.sex" :options="genderOptions" optionLabel="label" optionValue="value" label="Sex">
          <template #prepend-icon>
            <FontAwesomeIcon icon="fa-solid fa-mars-and-venus" />
          </template>
        </WbDropdown>
        <WbCalendar v-model="payload.birthday" dateFormat="MM dd, yy" :maxDate="new Date()" label="Birthday">
          <template #prepend-icon>
            <i class="pi pi-gift" />
          </template>
        </WbCalendar>
      </div>
      <!-- End Sex and Birthday -->
      <!-- End Personal Information -->

      <!-- Start Address -->
      <p class="mt-4 text-xs font-medium uppercase md:mt-6">Address</p>
      <!-- Start Region and Province -->
      <div class="flex flex-col gap-4 md:flex-row">
        <WbAutoComplete
          v-model="selectedRegion"
          :suggestions="publicStore.regionOptions"
          label="Region"
          optionLabel="label"
          forceSelection
          @on-true-value-computed="
            (value: WbAutoCompleteOptionTrueValue) => useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'region_id'))
          "
          :loading="publicStore.regionOptionsIsLoading"
          :disabled="publicStore.regionOptionsIsLoading"
        >
          <template #prepend-icon>
            <i class="pi pi-map" />
          </template>
        </WbAutoComplete>
        <WbAutoComplete
          v-model="selectedProvince"
          :suggestions="filteredProvinceOptionsByRegion"
          label="Province"
          optionLabel="label"
          forceSelection
          @on-true-value-computed="
            (value: WbAutoCompleteOptionTrueValue) => useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'province_id'))
          "
          :loading="publicStore.provinceOptionsIsLoading"
          :disabled="publicStore.provinceOptionsIsLoading"
        >
          <template #prepend-icon>
            <i class="pi pi-map" />
          </template>
        </WbAutoComplete>
      </div>
      <!-- End Region and Province -->
      <!-- Start City and Barangay -->
      <div class="flex flex-col gap-4 md:flex-row">
        <WbAutoComplete
          v-model="selectedCity"
          :suggestions="filteredCityOptionsByProvince"
          label="City"
          optionLabel="label"
          forceSelection
          @on-true-value-computed="
            (value: WbAutoCompleteOptionTrueValue) => useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'city_id'))
          "
          :loading="publicStore.cityOptionsIsLoading"
          :disabled="publicStore.cityOptionsIsLoading"
          :virtualScrollerOptions="{ itemSize: 38 }"
        >
          <template #prepend-icon>
            <i class="pi pi-map" />
          </template>
        </WbAutoComplete>
        <WbAutoComplete
          v-model="selectedBarangay"
          :suggestions="filteredBarangayOptionsByCity"
          label="Barangay"
          optionLabel="label"
          forceSelection
          @on-true-value-computed="
            (value: WbAutoCompleteOptionTrueValue) => useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'barangay_id'))
          "
          :loading="publicStore.barangayOptionsIsLoading"
          :disabled="publicStore.barangayOptionsIsLoading"
          :virtualScrollerOptions="{ itemSize: 38 }"
        >
          <template #prepend-icon>
            <i class="pi pi-map" />
          </template>
        </WbAutoComplete>
      </div>
      <!-- End City and Barangay -->
      <!-- Start Home Address and Zip Code -->
      <div class="flex flex-col gap-4 md:flex-row">
        <WbInputText
          v-model="payload.home_address"
          label="Home Address"
          :invalid="validator.home_address.$invalid"
          :invalid-text="validator.home_address.$errors[0]?.$message"
          @blur="validator.home_address.$touch"
        >
          <template #prepend-icon>
            <i class="pi pi-map" />
          </template>
        </WbInputText>
        <WbInputMask
          v-model="payload.postal_code"
          label="Zip Code"
          mask="9999"
          :invalid="validator.postal_code.$invalid"
          :invalid-text="validator.postal_code.$errors[0]?.$message"
          @blur="validator.postal_code.$touch"
        >
          <template #prepend-icon>
            <i class="pi pi-map" />
          </template>
        </WbInputMask>
      </div>
      <!-- End Home Address and Zip Code -->
      <!-- End Address -->

      <!-- Start Action Buttons -->
      <div class="mt-2 flex justify-end">
        <Button
          @click="handleFormSubmission"
          label="Save"
          :loading="formIsSubmitting"
          :disabled="formIsSubmitting || addressesAreLoading"
        >
          <template #icon>
            <i class="pi pi-save mr-2"></i>
          </template>
        </Button>
      </div>
      <!-- End Action Buttons -->
    </div>
  </form>
</template>
