<script setup lang="ts">
import Card from 'primevue/card'
import { useAuthStore } from '@/stores/auth.store.ts'
import { computed, reactive } from 'vue'
import { useAddressStore } from '@/stores/address.store.ts'
import WbAvatarFileInput from '@/components/webkit/WbAvatarFileInput.vue'
import PersonalInformation from '@/components/profile-page/PersonalInformation.vue'
import { usePdsStore, PersonalDataSheetPayload } from '@/stores/pds.store.ts'
import EmploymentHistory from '@/components/profile-page/EmploymentHistory.vue'

const authStore = useAuthStore()
const pdsStore = usePdsStore()
/** Payload */
const payload = reactive<PersonalDataSheetPayload>({
  ...pdsStore.pdsInfo,
})

// Computed Full Name
const fullName = computed(() => {
  const individual = payload.individual
  return [individual.first_name, individual.middle_name, individual.last_name, individual.ext_name].filter(Boolean).join(' ')
})

/** Initialize Address Options List */
const publicStore = useAddressStore()

const fullAddress = computed(() => {
  const addr = payload.individual_address_init
  const parts: string[] = []

  if (addr.residential_house_block_lot_no) parts.push(addr.residential_house_block_lot_no)
  if (addr.residential_street) parts.push(addr.residential_street)
  if (addr.residential_subdivision_village) parts.push(addr.residential_subdivision_village)

  const barangayLabel = publicStore.barangayOptions.find((b) => b.value === addr.residential_brgy_id)?.label
  const cityLabel = publicStore.cityOptions.find((c) => c.value === addr.residential_citymun_id)?.label
  const provinceLabel = publicStore.provinceOptions.find((p) => p.value === addr.residential_province_id)?.label
  const regionLabel = publicStore.regionOptions.find((r) => r.value === addr.residential_region_id)?.label

  if (barangayLabel) parts.push(barangayLabel)
  if (cityLabel) parts.push(cityLabel)
  if (provinceLabel) parts.push(provinceLabel)
  if (regionLabel) parts.push(regionLabel)

  return parts.join(', ')
})
</script>

<template>
  <div class="mx-auto flex h-[100%] w-full flex-col">
    <Card>
      <template #header>
        <div class="h-2 w-full rounded-t-lg bg-primary-500"></div>
      </template>
      <template #content>
        <div class="flex flex-col px-4">
          <div class="flex flex-col items-center md:flex-row">
            <template v-if="authStore.isAuthenticated">
              <WbAvatarFileInput />
            </template>
            <div class="mt-8 flex flex-col text-center text-lg md:ml-8 md:mt-0 md:text-left lg:text-2xl">
              <span class="font-bold">{{ fullName }}</span>
              <span class="text-xs sm:text-sm">{{ fullAddress }}</span>
            </div>
          </div>
        </div>
      </template>
      <template #footer> </template>
    </Card>
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card class="mt-6">
        <template #content>
          <transition
            enter-active-class="transition duration-500"
            enter-from-class="translate-y-[20%] opacity-0"
            leave-to-class="opacity-0"
          >
            <PersonalInformation />
          </transition>
        </template>
      </Card>
      <Card class="mt-6">
        <template #content>
          <transition
            enter-active-class="transition duration-500"
            enter-from-class="translate-y-[20%] opacity-0"
            leave-to-class="opacity-0"
          >
            <EmploymentHistory />
          </transition>
        </template>
      </Card>
    </div>
  </div>
</template>
