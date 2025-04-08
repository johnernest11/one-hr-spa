<script setup lang="ts">
import WbInputText from '@/components/webkit/WbInputText.vue'
import WbAutoComplete, { WbAutoCompleteOption, WbAutoCompleteOptionTrueValue } from '@/components/webkit/WbAutoComplete.vue'
import WbInputMask from '@/components/webkit/WbInputMask.vue'
import { onBeforeMount, reactive, ref, toRef, toRefs } from 'vue'
import useVuelidate from '@vuelidate/core'
import { helpers, maxLength } from '@vuelidate/validators'
import { digitCountRule } from '@/utils/custom-validations.ts'
import Button from 'primevue/button'
import { useAddressStore } from '@/stores/address.store.ts'
import { useClearSelectedAddressIfNotInParentList, useFilterByParentId } from '@/composables/address.options.ts'
import { storeToRefs } from 'pinia'
import { RegistrationAddressPayload, useFormsStore } from '@/stores/forms.store.ts'
import { useAuthStore } from '@/stores/auth.store.ts'
import { useRouter } from 'vue-router'
import { useWbAutoCompleteHandleTrueValue } from '@/composables/wb-ui-components.ts'

/** Payload */
const formStore = useFormsStore()
const payload = reactive<RegistrationAddressPayload>({
  home_address: formStore.registrationInfo.address?.home_address || null,
  barangay_id: formStore.registrationInfo.address?.barangay_id || null,
  city_id: formStore.registrationInfo.address?.city_id || null,
  region_id: formStore.registrationInfo.address?.region_id || null,
  province_id: formStore.registrationInfo.address?.province_id || null,
  postal_code: formStore.registrationInfo.address?.postal_code || null,
})

/** Emits */
const emit = defineEmits<{ (e: 'previousButtonClicked', value: boolean): void }>()

/** Initialize Address Options List */
const publicStore = useAddressStore()
onBeforeMount(async () => {
  await Promise.allSettled([
    publicStore.fetchRegions(),
    publicStore.fetchProvinces(),
    publicStore.fetchCities(),
    publicStore.fetchBarangays(),
  ])
})

/** Address WbAutoComplete Object References */
const selectedRegion = ref<WbAutoCompleteOption | null>(null)
const selectedProvince = ref<WbAutoCompleteOption | null>(null)
const selectedCity = ref<WbAutoCompleteOption | null>(null)
const selectedBarangay = ref<WbAutoCompleteOption | null>(null)

/** We only display a list based on parent address */
const { provinceOptions, cityOptions, barangayOptions } = storeToRefs(publicStore)
const filteredProvinceOptionsByRegion = useFilterByParentId(toRef(payload, 'region_id'), provinceOptions)
const filteredCityOptionsByProvince = useFilterByParentId(toRef(payload, 'province_id'), cityOptions)
const filteredBarangayOptionsByCity = useFilterByParentId(toRef(payload, 'city_id'), barangayOptions)

/** We set the `selected<Address>` and `payload.<address>_id` to null if the parent is changed */
useClearSelectedAddressIfNotInParentList(
  toRefs(payload),
  selectedProvince,
  selectedCity,
  selectedBarangay,
  filteredProvinceOptionsByRegion,
  filteredCityOptionsByProvince,
  filteredBarangayOptionsByCity
)

/** Form Validation */
const globalStringMaxLength = import.meta.env.VITE_GLOBAL_STRING_MAX_LENGTH
const globalStringMaxLengthRule = helpers.withMessage(
  `Must not exceed ${globalStringMaxLength} characters`,
  maxLength(globalStringMaxLength)
)
const formRules = {
  $lazy: true,
  home_address: {
    maxLength: globalStringMaxLengthRule,
  },
  postal_code: {
    digitCount: helpers.withMessage('Enter your 4-digit zip code', digitCountRule(4)),
  },
}

const validator = useVuelidate<RegistrationAddressPayload>(formRules, payload)

/** Handle Form Submission */
const authStore = useAuthStore()
const router = useRouter()
const formIsSubmitting = ref(false)
const handleFormSubmission = async () => {
  // We save the address info in the central store first
  const valid = await validator.value.$validate()
  if (!valid) return false

  formStore.saveRegistrationAddressSection(payload)

  formIsSubmitting.value = true
  // We now make the API call to submit the credentials, personal info, and address
  const responseData = await authStore.register(formStore.registrationInfo)
  if (!responseData.success) {
    return (formIsSubmitting.value = false)
  }

  formIsSubmitting.value = false
  formStore.resetRegistrationInfo()
  await router.replace({ name: 'dashboard' })
}
</script>
<template>
  <div class="flex flex-col gap-4">
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
        label-class="text-xs text-surface-0 lg:text-surface-800 dark:lg:text-surface-200"
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
        label-class="text-xs text-surface-0 lg:text-surface-800 dark:lg:text-surface-200"
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
        label-class="text-xs text-surface-0 lg:text-surface-800 dark:lg:text-surface-200"
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
        label-class="text-xs text-surface-0 lg:text-surface-800 dark:lg:text-surface-200"
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
        label-class="text-xs text-surface-0 lg:text-surface-800 dark:lg:text-surface-200"
        validation-error-message-class="text-xs text-error-300 font-bold lg:font-normal lg:text-error-500 dark:lg:text-error-300"
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
        label-class="text-xs text-surface-0 lg:text-surface-800 dark:lg:text-surface-200"
        validation-error-message-class="text-xs text-error-300 font-bold lg:font-normal lg:text-error-500 dark:lg:text-error-300"
      >
        <template #prepend-icon>
          <i class="pi pi-map" />
        </template>
      </WbInputMask>
    </div>
    <!-- End Home Address and Zip Code -->
    <!-- Start Action Buttons -->
    <div class="mt-4 flex justify-between">
      <Button
        @click="emit('previousButtonClicked', true)"
        label="Back"
        size="large"
        severity="secondary"
        class="px-10"
        :disabled="formIsSubmitting"
      >
        <template #icon>
          <i class="pi pi-arrow-left mr-2"></i>
        </template>
      </Button>
      <Button
        @click="handleFormSubmission"
        label="Save"
        size="large"
        class="px-10"
        :loading="formIsSubmitting"
        :disabled="formIsSubmitting"
      >
        <template #icon>
          <i class="pi pi-save mr-2"></i>
        </template>
      </Button>
    </div>
    <!-- End Action Buttons -->
  </div>
</template>
