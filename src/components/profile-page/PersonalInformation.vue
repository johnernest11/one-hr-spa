<script setup lang="ts">
import { reactive, ref, onBeforeMount, computed } from 'vue'
import { useAddressStore } from '@/stores/address.store.ts'
import { SexTypeOptions } from '@/typings/employee-entry.types'
import { usePdsStore, PersonalDataSheetPayload } from '@/stores/pds.store.ts'
const pdsStore = usePdsStore()
/** Payload */
const payload = reactive<PersonalDataSheetPayload>({
  ...pdsStore.pdsInfo,
})
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

// Computed full home address
const homeAddress = computed(() => {
  const addr = payload.individual_address_init
  return [addr.residential_house_block_lot_no, addr.residential_street, addr.residential_subdivision_village]
    .filter(Boolean)
    .join(', ')
})
</script>

<template>
  <template v-if="!addressesAreLoading">
    <section class="bg-surface-0 p-4">
      <!-- Header -->
      <h2 class="mb-4 text-xl font-bold text-primary-800">Personal Information</h2>

      <form autocomplete="off">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <!-- Email -->
          <div class="flex items-center gap-2">
            <span class="w-24 text-sm font-medium text-surface-600">Email:</span>
            <p class="text-lg text-surface-900">{{ payload.contact_info.email_address }}</p>
          </div>

          <!-- Mobile Number -->
          <div class="flex items-center gap-2">
            <span class="w-24 text-sm font-medium text-surface-600">Mobile No:</span>
            <p class="text-lg text-surface-900">{{ payload.contact_info.mobile_no }}</p>
          </div>

          <!-- Sex -->
          <div class="flex items-center gap-2">
            <span class="w-24 text-sm font-medium text-surface-600">Sex:</span>
            <p class="text-lg text-surface-900">
              {{ SexTypeOptions.find((o) => o.value === payload.individual.sex)?.label || '-' }}
            </p>
          </div>

          <!-- Birthday -->
          <div class="flex items-center gap-2">
            <span class="w-24 text-sm font-medium text-surface-600">Birthday:</span>
            <p class="text-surface-900text-lg">
              {{ payload.individual.birthday ? new Date(payload.individual.birthday).toLocaleDateString() : '-' }}
            </p>
          </div>

          <!-- Region -->
          <div class="flex items-center gap-2">
            <span class="w-24 text-sm font-medium text-surface-600">Region:</span>
            <p class="text-surface-900text-lg">
              {{
                publicStore.regionOptions.find((r) => r.value === payload.individual_address_init.residential_region_id)?.label ||
                '-'
              }}
            </p>
          </div>

          <!-- Province -->
          <div class="flex items-center gap-2">
            <span class="w-24 text-sm font-medium text-surface-600">Province:</span>
            <p class="text-lg text-surface-900">
              {{
                publicStore.provinceOptions.find((p) => p.value === payload.individual_address_init.residential_province_id)
                  ?.label || '-'
              }}
            </p>
          </div>

          <!-- City -->
          <div class="flex items-center gap-2">
            <span class="w-24 text-sm font-medium text-surface-600">City:</span>
            <p class="text-lg text-surface-900">
              {{
                publicStore.cityOptions.find((c) => c.value === payload.individual_address_init.residential_citymun_id)?.label ||
                '-'
              }}
            </p>
          </div>

          <!-- Barangay -->
          <div class="flex items-center gap-2">
            <span class="w-24 text-sm font-medium text-surface-600">Barangay:</span>
            <p class="text-surface-900text-lg">
              {{
                publicStore.barangayOptions.find((b) => b.value === payload.individual_address_init.residential_brgy_id)?.label ||
                '-'
              }}
            </p>
          </div>

          <!-- Home Address -->
          <div class="flex items-center gap-2">
            <span class="w-24 text-sm font-medium text-surface-600 dark:text-gray-300">Address:</span>
            <p class="text-lg text-surface-900">{{ homeAddress }}</p>
          </div>

          <!-- Zip Code -->
          <div class="flex items-center gap-2">
            <span class="w-24 text-sm font-medium text-surface-600 dark:text-gray-300">Zip Code:</span>
            <p class="text-lg text-surface-900">{{ payload.individual_address_init.residential_zip_code }}</p>
          </div>
        </div>
      </form>
    </section>
  </template>
  <template v-else-if="addressesAreLoading">
    <div class="bg-surface-2 h-full w-full animate-pulse rounded-md p-6">
      <!-- --------------------------- Form Fields --------------------------- -->
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <!-- Field 1 -->
        <div class="flex flex-col gap-2">
          <div class="h-4 w-1/4 rounded bg-surface-300"></div>
          <div class="h-10 w-full rounded bg-surface-300"></div>
        </div>
      </div>
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <!-- Field 1 -->
        <div class="flex flex-col gap-2">
          <div class="h-4 w-1/4 rounded bg-surface-300"></div>
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
