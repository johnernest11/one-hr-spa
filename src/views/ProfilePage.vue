<script setup lang="ts">
import Card from 'primevue/card'
import { useAuthStore } from '@/stores/auth.store.ts'
import { computed, reactive, ref } from 'vue'
import { useAddressStore } from '@/stores/address.store.ts'
import WbAvatarFileInput from '@/components/webkit/WbAvatarFileInput.vue'
import PersonalInformation from '@/components/profile-page/PersonalInformation.vue'
import { usePdsStore, PersonalDataSheetPayload } from '@/stores/pds.store.ts'
import EmploymentHistory from '@/components/profile-page/EmploymentHistory.vue'
import QRCodeStyling from 'qr-code-styling'
import * as domToImage from 'dom-to-image-more'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import DSWDIcon from '@/assets/image/hrcares-icon.png'

const authStore = useAuthStore()
const pdsStore = usePdsStore()
const toast = useToast()

/** Payload */
const payload = reactive<PersonalDataSheetPayload>({
  ...pdsStore.pdsInfo,
})

// Computed Full Name (Standard Header Banner View)
const fullName = computed(() => {
  const individual = payload.individual
  return [individual.first_name, individual.middle_name, individual.last_name, individual.ext_name].filter(Boolean).join(' ')
})

// Computed Display ID Tracker Number (Falls back elegantly to ID if agency no is absent)
const employeeIdNumber = computed(() => {
  return payload.individual?.agency_employee_no || ''
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

const showQrModal = ref(false)
const qrContainerRef = ref<HTMLElement | null>(null)
const hiddenQrCardRef = ref<HTMLElement | null>(null)
const hiddenQrContainerRef = ref<HTMLElement | null>(null)

const qrCodeIsLoading = ref(false)
const canDownload = computed(() => !!employeeIdNumber.value)

const qrCodeDisplay = ref<QRCodeStyling | null>(null)
const qrCodeDownload = ref<QRCodeStyling | null>(null)

const qrConfig = (size: number, data: string) => ({
  width: size,
  height: size,
  data: data,
  image: DSWDIcon,
  dotsOptions: { color: '#000000', type: 'square' as const },
  backgroundOptions: { color: '#FFFFFF' },
  imageOptions: { crossOrigin: 'anonymous', margin: 4, imageSize: 0.4 },
  qrOptions: { errorCorrectionLevel: 'H' as const },
  cornersSquareOptions: { type: 'square' as const, color: '#000000' },
  cornersDotOptions: { type: 'square' as const, color: '#000000' },
})

const qrCodeValue = computed(() => {
  return employeeIdNumber.value ? `EMPLOYEE_ID:${employeeIdNumber.value}` : ''
})

const generateQrOnDemand = () => {
  if (!qrCodeValue.value) return

  qrCodeIsLoading.value = true

  setTimeout(() => {
    if (qrContainerRef.value) {
      qrContainerRef.value.innerHTML = ''
      qrCodeDisplay.value = new QRCodeStyling(qrConfig(350, qrCodeValue.value))
      qrCodeDisplay.value.append(qrContainerRef.value)
    }

    if (hiddenQrContainerRef.value) {
      hiddenQrContainerRef.value.innerHTML = ''
      qrCodeDownload.value = new QRCodeStyling(qrConfig(500, qrCodeValue.value))
      qrCodeDownload.value.append(hiddenQrContainerRef.value)
    }

    qrCodeIsLoading.value = false
  }, 100)
}

const downloadQrCode = async () => {
  if (!qrCodeValue.value) return

  const node = hiddenQrCardRef.value
  if (!node) return
  const lastName = payload.individual?.last_name || 'Employee'
  const filename = `${lastName}_Official_QR.png`

  try {
    const dataUrl = await domToImage.toPng(node, {
      quality: 1,
      bgcolor: '#ffffff',
      width: 650,
      height: 950,
    })
    const link = document.createElement('a')
    link.download = filename
    link.href = dataUrl
    link.click()

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'QR Card downloaded successfully.',
      life: 3000,
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Export Failed',
      detail: 'Unable to save high-resolution card layout.',
      life: 3000,
    })
  }
}
</script>

<template>
  <div class="mx-auto flex h-[100%] w-full flex-col">
    <Card>
      <template #header>
        <div class="h-2 w-full rounded-t-lg bg-primary-500"></div>
      </template>
      <template #content>
        <div class="flex flex-col px-4">
          <div class="flex w-full flex-col items-center justify-between gap-6 md:flex-row">
            <div class="flex flex-col items-center md:flex-row">
              <template v-if="authStore.isAuthenticated">
                <WbAvatarFileInput />
              </template>
              <div class="mt-8 flex flex-col text-center text-lg md:ml-8 md:mt-0 md:text-left lg:text-2xl">
                <span class="font-bold text-surface-900">{{ fullName }}</span>
                <span v-if="employeeIdNumber" class="mt-0.5 text-xs font-semibold text-primary-600 sm:text-sm"
                  >ID No: {{ employeeIdNumber }}</span
                >
                <span class="mt-1 text-xs text-surface-500 sm:text-sm">{{ fullAddress }}</span>
              </div>
            </div>

            <div class="mt-4 md:mt-0">
              <Button
                type="button"
                icon="pi pi-qrcode"
                label="My QR Code"
                raised
                class="px-5 text-sm font-semibold"
                @click="showQrModal = true"
              />
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

    <Dialog
      v-model:visible="showQrModal"
      modal
      header="Employee ID Card"
      :style="{ width: '450px' }"
      class="qr-dialog"
      @show="generateQrOnDemand"
    >
      <div
        v-if="payload.individual"
        ref="qrCardRef"
        class="mx-auto flex w-full max-w-sm flex-col items-center bg-surface-0 p-6 text-center sm:max-w-md"
      >
        <div class="mb-4 flex w-full flex-col items-center">
          <img src="@/assets/image/dswd-logo.png" alt="DSWD Logo" class="object-contain" />
        </div>

        <div class="mb-1 w-full">
          <p class="text-lg font-extrabold uppercase leading-tight text-surface-900 sm:text-xl">
            {{ payload.individual.last_name }}, {{ payload.individual.first_name }}
            {{ payload.individual.middle_name ? payload.individual.middle_name + ' ' : '' }}
            {{ payload.individual.ext_name ? payload.individual.ext_name : '' }}
          </p>
        </div>

        <div class="mb-1 w-full" v-if="employeeIdNumber">
          <p class="text-sm font-bold uppercase tracking-wider text-primary-600">ID: {{ employeeIdNumber }}</p>
        </div>

        <div class="mb-4 w-full">
          <p class="mt-1 text-xs font-medium uppercase text-surface-600 sm:text-sm">
            {{ payload.employee?.item?.position?.title || '' }}
          </p>
        </div>

        <div
          ref="qrContainerRef"
          :class="[
            'h-[250px] w-[250px] justify-center bg-white sm:h-[300px] sm:w-[300px] md:h-[350px] md:w-[350px]',
            qrCodeIsLoading ? 'hidden' : 'flex',
          ]"
        ></div>

        <div class="my-6 flex justify-center" v-if="qrCodeIsLoading">
          <i class="pi pi-spinner animate-spin text-2xl text-surface-400" />
        </div>
      </div>

      <div class="mx-auto mt-6 w-full max-w-xs" v-if="canDownload && !qrCodeIsLoading">
        <Button
          @click="downloadQrCode"
          severity="primary"
          type="button"
          size="large"
          outlined
          :disabled="!canDownload"
          class="w-full border-2 border-primary-500 font-semibold text-primary-500 transition-colors hover:bg-primary-50"
          label="Download QR Code"
          icon="pi pi-download"
        />
      </div>
    </Dialog>

    <div
      v-if="payload.individual"
      ref="hiddenQrCardRef"
      class="absolute left-[-9999px] box-border flex h-[950px] w-[650px] flex-col items-center !border-0 bg-surface-0 p-10 text-center !shadow-none !outline-none"
    >
      <div class="mb-[30px] flex w-full justify-center !border-0 !shadow-none !outline-none">
        <img
          src="@/assets/image/dswd-logo.png"
          alt="DSWD Logo"
          class="h-auto w-[412.5px] !border-0 object-contain !shadow-none"
        />
      </div>

      <div class="mb-[2px] w-full !border-0 !shadow-none !outline-none">
        <div class="!border-0 bg-surface-0 p-[5px_20px]">
          <p class="!border-0 text-[32px] font-black uppercase leading-[1.2] text-surface-900">
            {{ payload.individual.last_name }}, {{ payload.individual.first_name }}
            {{ payload.individual.middle_name ? payload.individual.middle_name + ' ' : '' }}
            {{ payload.individual.ext_name ? payload.individual.ext_name : '' }}
          </p>
        </div>
      </div>

      <div v-if="employeeIdNumber" class="mb-5 w-full !border-0 !shadow-none !outline-none">
        <div class="!border-0 bg-surface-0 p-[2px_20px]">
          <p class="!border-0 text-[20px] font-bold uppercase tracking-wide text-primary-600">ID: {{ employeeIdNumber }}</p>
        </div>
      </div>

      <div class="mb-[25px] w-full !border-0 !shadow-none !outline-none">
        <div class="!border-0 bg-surface-0 p-[5px_20px]">
          <p class="text-[22px] font-medium uppercase leading-[1.2] text-surface-600">
            {{ payload.employee?.item?.position?.title || '' }}
          </p>
        </div>
      </div>

      <div
        ref="hiddenQrContainerRef"
        :class="[qrCodeIsLoading ? 'hidden' : 'flex', 'h-[500px] w-[500px] justify-center !border-0 bg-white']"
      ></div>
    </div>
  </div>
</template>
