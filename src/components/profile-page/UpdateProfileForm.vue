<script setup lang="ts">
import { reactive, ref, onBeforeMount, toRef, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store.ts'
import { useAddressStore } from '@/stores/address.store.ts'
import WbInputText from '@/components/webkit/WbInputText.vue'
import WbCalendar from '@/components/webkit/WbCalendar.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import WbInputMask from '@/components/webkit/WbInputMask.vue'
import WbDropdown from '@/components/webkit/WbDropdown.vue'
import WbAutoComplete from '@/components/webkit/WbAutoComplete.vue'
import { SexTypeOptions } from '@/typings/employee-entry.types'
import { WbAutoCompleteOption, WbAutoCompleteOptionTrueValue } from '@/components/webkit/WbAutoComplete.vue'
import { useWbAutoCompleteHandleTrueValue } from '@/composables/wb-ui-components.ts'
import { usePdsStore, PersonalDataSheetPayload } from '@/stores/pds.store.ts'
import { PersonnelResponse } from '@/typings/models.types'
import { storeToRefs } from 'pinia'
import { useFilterByParentId } from '@/composables/address.options.ts'
const authStore = useAuthStore()
const pdsStore = usePdsStore()
const isLoading = ref(true)
/** Payload */
const payload = reactive<PersonalDataSheetPayload>({
  ...pdsStore.pdsInfo,
})

// Fetch PDS data by individual_basic_detail_id
onMounted(async () => {
  const id = authStore.authenticatedUser?.user_profile?.individual_basic_detail_id
  if (id) {
    const response = await pdsStore.fetchPdsById(id)
    if (response?.success) {
      const data = response.data as PersonnelResponse

      // Update reactive payload
      pdsStore.updatePdsFromPersonnel(data)
      Object.assign(payload, pdsStore.pdsInfo)

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
        selectedRegion.value = addressRaw.residential_region_id
          ? publicStore.regionOptions.find((r) => r.value === addressRaw.residential_region_id) ?? null
          : null
        selectedProvince.value = addressRaw.residential_province_id
          ? publicStore.provinceOptions.find((p) => p.value === addressRaw.residential_province_id) ?? null
          : null
        selectedCity.value = addressRaw.residential_citymun_id
          ? publicStore.cityOptions.find((c) => c.value === addressRaw.residential_citymun_id) ?? null
          : null
        selectedBarangay.value = addressRaw.residential_brgy_id
          ? publicStore.barangayOptions.find((b) => b.value === addressRaw.residential_brgy_id) ?? null
          : null
      }
    } else {
      console.warn('Failed to fetch PDS or response unsuccessful.')
    }
  }

  isLoading.value = false
})

/** Address Section **/
/** Address WbAutoComplete Object References */
const selectedRegion = ref<WbAutoCompleteOption | null>(null)
const selectedProvince = ref<WbAutoCompleteOption | null>(null)
const selectedCity = ref<WbAutoCompleteOption | null>(null)
const selectedBarangay = ref<WbAutoCompleteOption | null>(null)

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

// Computed full home address
const homeAddress = computed(() => {
  const addr = payload.individual_address_init
  return [addr.residential_house_block_lot_no, addr.residential_street, addr.residential_subdivision_village]
    .filter(Boolean)
    .join(', ')
})
</script>

<template>
  <form autocomplete="off">
    <div class="flex flex-col gap-4">
      <!-- Start Credentials -->
      <!-- Start Email and Mobile Number -->
      <div class="flex flex-col gap-4 md:flex-row">
        <WbInputText
          v-model="payload.contact_info.email_address"
          label="Email"
          readonly
          class="pointer-events-none cursor-default"
        >
          <template #prepend-icon>
            <i class="pi pi-envelope" />
          </template>
        </WbInputText>
        <WbInputMask
          v-model="payload.contact_info.mobile_no"
          label="Mobile Number"
          mask="+639999999999"
          placeholder="+63 XXX XXX XXXX"
          readonly
          class="pointer-events-none cursor-default"
        >
          <template #prepend-icon>
            <i class="pi pi-phone" />
          </template>
        </WbInputMask>
      </div>
      <!-- End Email and Mobile Number -->
      <!-- End Credentials -->

      <!-- Start Personal Information -->
      <!-- Start First name and Middle name -->
      <div class="flex flex-col gap-4 md:flex-row">
        <WbInputText
          v-model="payload.individual.first_name"
          label="First name"
          readonly
          class="pointer-events-none cursor-default"
        >
          <template #prepend-icon>
            <i class="pi pi-id-card" />
          </template>
        </WbInputText>
        <WbInputText
          v-model="payload.individual.middle_name"
          label="Middle name"
          readonly
          class="pointer-events-none cursor-default"
        >
          <template #prepend-icon>
            <i class="pi pi-id-card" />
          </template>
        </WbInputText>
      </div>
      <!-- End First name and Middle name -->
      <!-- Start Last name and Extension name -->
      <div class="flex flex-col gap-4 md:flex-row">
        <WbInputText v-model="payload.individual.last_name" label="Last name" readonly class="pointer-events-none cursor-default">
          <template #prepend-icon>
            <i class="pi pi-id-card" />
          </template>
        </WbInputText>
        <WbInputText v-model="payload.individual.ext_name" label="Ext. name">
          <template #prepend-icon>
            <i class="pi pi-id-card" />
          </template>
        </WbInputText>
      </div>
      <!-- End Last name and Extension name -->
      <!-- Start Sex and Birthday -->
      <div class="flex flex-col gap-4 md:flex-row">
        <WbDropdown
          v-model="payload.individual.sex"
          :options="SexTypeOptions"
          optionLabel="label"
          optionValue="value"
          label="Sex"
          readonly
          class="pointer-events-none cursor-default select-text"
          label-class="text-md text-surface-600 dark:lg:text-surface-200"
        >
          <template #prepend-icon>
            <FontAwesomeIcon icon="fa-solid fa-mars-and-venus" />
          </template>
        </WbDropdown>
        <WbCalendar
          v-model="payload.individual.birthday"
          dateFormat="MM dd, yy"
          :maxDate="new Date()"
          label="Birthday"
          readonly
          class="pointer-events-none cursor-default select-text"
        >
          <template #prepend-icon>
            <i class="pi pi-gift" />
          </template>
        </WbCalendar>
      </div>
      <!-- End Sex and Birthday -->
      <!-- End Personal Information -->

      <!-- Start Address -->
      <!-- Start Region and Province -->
      <div class="flex flex-col gap-4 md:flex-row">
        <WbAutoComplete
          v-model="selectedRegion"
          :suggestions="publicStore.regionOptions"
          label=" Region "
          readonly
          class="pointer-events-none cursor-default select-text"
          optionLabel="label"
          forceSelection
          @on-true-value-computed="
            (value: WbAutoCompleteOptionTrueValue) =>
              useWbAutoCompleteHandleTrueValue(value, toRef(payload.individual_address_init, 'residential_region_id'))
          "
          :loading="publicStore.regionOptionsIsLoading"
        >
          <template #prepend-icon>
            <i class="pi pi-map" />
          </template>
        </WbAutoComplete>
        <WbAutoComplete
          v-model="selectedProvince"
          :suggestions="filteredProvinceOptionsByRegion"
          readonly
          class="pointer-events-none cursor-default select-text"
          label="Province"
          optionLabel="label"
          forceSelection
          @on-true-value-computed="
            (value: WbAutoCompleteOptionTrueValue) =>
              useWbAutoCompleteHandleTrueValue(value, toRef(payload.individual_address_init, 'residential_province_id'))
          "
          :loading="publicStore.provinceOptionsIsLoading"
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
          readonly
          class="pointer-events-none cursor-default select-text"
          label="City"
          optionLabel="label"
          forceSelection
          @on-true-value-computed="
            (value: WbAutoCompleteOptionTrueValue) =>
              useWbAutoCompleteHandleTrueValue(value, toRef(payload.individual_address_init, 'residential_citymun_id'))
          "
          :loading="publicStore.cityOptionsIsLoading"
        >
          <template #prepend-icon>
            <i class="pi pi-map" />
          </template>
        </WbAutoComplete>
        <WbAutoComplete
          v-model="selectedBarangay"
          :suggestions="filteredBarangayOptionsByCity"
          readonly
          class="pointer-events-none cursor-default select-text"
          label="Barangay"
          optionLabel="label"
          forceSelection
          @on-true-value-computed="
            (value: WbAutoCompleteOptionTrueValue) =>
              useWbAutoCompleteHandleTrueValue(value, toRef(payload.individual_address_init, 'residential_brgy_id'))
          "
          :loading="publicStore.barangayOptionsIsLoading"
        >
          <template #prepend-icon>
            <i class="pi pi-map" />
          </template>
        </WbAutoComplete>
      </div>
      <!-- End City and Barangay -->
      <!-- Start Home Address and Zip Code -->
      <div class="flex flex-col gap-4 md:flex-row">
        <WbInputText v-model="homeAddress" label="Home Address">
          <template #prepend-icon>
            <i class="pi pi-map" />
          </template>
        </WbInputText>
        <WbInputMask v-model="payload.individual_address_init.residential_zip_code" label="Zip Code" mask="9999">
          <template #prepend-icon>
            <i class="pi pi-map" />
          </template>
        </WbInputMask>
      </div>
      <!-- End Home Address and Zip Code -->
    </div>
  </form>
</template>
