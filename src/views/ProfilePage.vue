<script setup lang="ts">
import Card from 'primevue/card'
import { useAuthStore } from '@/stores/auth.store.ts'
import { computed, reactive, ref } from 'vue'
import { useAddressStore } from '@/stores/address.store.ts'
import WbAvatarFileInput from '@/components/webkit/WbAvatarFileInput.vue'
import PersonalInformation from '@/components/profile-page/PersonalInformation.vue'
import { usePdsStore, PersonalDataSheetPayload } from '@/stores/pds.store.ts'
import EmploymentHistory from '@/components/profile-page/EmploymentHistory.vue'

// QR & High-Resolution Export Engine Dependencies
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

/** QR Modal Layout State Management */
const showQrModal = ref(false)
const qrContainerRef = ref<HTMLElement | null>(null)
const hiddenQrCardRef = ref<HTMLElement | null>(null)
const hiddenQrContainerRef = ref<HTMLElement | null>(null)

const qrCodeIsLoading = ref(false)
const canDownload = computed(() => !!employeeIdNumber.value)

let qrCodeDisplay: QRCodeStyling | null = null
let qrCodeDownload: QRCodeStyling | null = null

/** QR Config Factory */
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

/** Dynamic QR Value Generation Tracking Target */
const qrCodeValue = computed(() => {
  return employeeIdNumber.value ? `EMPLOYEE_ID:${employeeIdNumber.value}` : ''
})

/** Specialized on-demand canvas injection engine triggered when Dialog opens */
const generateQrOnDemand = () => {
  if (!qrCodeValue.value) return

  qrCodeIsLoading.value = true

  // Short timeout provides essential execution delay for PrimeVue to finish mounting the DOM content
  setTimeout(() => {
    // 1. Compile and mount standard display canvas
    if (qrContainerRef.value) {
      qrContainerRef.value.innerHTML = ''
      qrCodeDisplay = new QRCodeStyling(qrConfig(350, qrCodeValue.value))
      qrCodeDisplay.append(qrContainerRef.value)
    }

    // 2. Compile and mount high-definition export canvas
    if (hiddenQrContainerRef.value) {
      hiddenQrContainerRef.value.innerHTML = ''
      qrCodeDownload = new QRCodeStyling(qrConfig(500, qrCodeValue.value))
      qrCodeDownload.append(hiddenQrContainerRef.value)
    }

    qrCodeIsLoading.value = false
  }, 100)
}

/** Handles clean capture array generation via dom-to-image matrix */
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
      height: 950, // Expanded slightly to prevent text clipping from ID number injection
    })
    const link = document.createElement('a')
    link.download = filename
    link.href = dataUrl
    link.click()
    toast.add({ severity: 'success', summary: 'Success', detail: 'QR Card downloaded successfully.', life: 3000 })
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Export Failed', detail: 'Unable to save high-resolution card layout.', life: 3000 })
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
                <span class="font-bold">{{ fullName }}</span>
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
                label="MY QR CODE"
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
        class="mx-auto flex w-full max-w-sm flex-col items-center bg-white p-6 text-center sm:max-w-md"
      >
        <div class="mb-4 flex w-full flex-col items-center">
          <img src="@/assets/image/dswd-logo.png" alt="DSWD Logo" class="object-contain" />
        </div>

        <div class="mb-1 w-full">
          <p class="text-lg font-extrabold uppercase leading-tight text-gray-900 sm:text-xl">
            {{ payload.individual.last_name }}, {{ payload.individual.first_name }}
            {{ payload.individual.middle_name ? payload.individual.middle_name + ' ' : '' }}
            {{ payload.individual.ext_name ? payload.individual.ext_name : '' }}
          </p>
        </div>

        <div class="mb-1 w-full" v-if="employeeIdNumber">
          <p class="text-sm font-bold uppercase tracking-wider text-primary-600">ID: {{ employeeIdNumber }}</p>
        </div>

        <div class="mb-4 w-full">
          <p class="mt-1 text-xs font-medium uppercase text-gray-700 sm:text-sm">
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
          severity="info"
          type="button"
          size="large"
          :disabled="!canDownload"
          class="w-full border-2 border-primary-500 text-base font-semibold transition-colors hover:bg-primary-50"
          text
        >
          <i class="pi pi-download mr-2"></i> Download QR Card
        </Button>
      </div>
    </Dialog>

    <div
      v-if="payload.individual"
      ref="hiddenQrCardRef"
      style="
        position: absolute;
        left: -9999px;
        width: 650px;
        height: 950px;
        background-color: white;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 40px;
        box-sizing: border-box;
        border: 0 !important;
        box-shadow: none !important;
        outline: none !important;
      "
    >
      <div
        style="
          margin-bottom: 30px;
          width: 100%;
          display: flex;
          justify-content: center;
          border: 0 !important;
          box-shadow: none !important;
          outline: none !important;
        "
      >
        <img
          src="@/assets/image/dswd-logo.png"
          alt="DSWD Logo"
          style="width: 412.5px; height: auto; object-fit: contain; border: 0 !important; box-shadow: none !important"
        />
      </div>

      <div style="margin-bottom: 2px; width: 100%; border: 0 !important; box-shadow: none !important; outline: none !important">
        <div style="background-color: white !important; padding: 5px 20px; border: 0 !important">
          <p
            style="
              font-size: 32px;
              font-weight: 900;
              text-transform: uppercase;
              color: #1f2937;
              line-height: 1.2;
              border: 0 !important;
            "
          >
            {{ payload.individual.last_name }}, {{ payload.individual.first_name }}
            {{ payload.individual.middle_name ? payload.individual.middle_name + ' ' : '' }}
            {{ payload.individual.ext_name ? payload.individual.ext_name : '' }}
          </p>
        </div>
      </div>

      <div
        v-if="employeeIdNumber"
        style="margin-bottom: 5px; width: 100%; border: 0 !important; box-shadow: none !important; outline: none !important"
      >
        <div style="background-color: white !important; padding: 2px 20px; border: 0 !important">
          <p
            style="
              font-size: 20px;
              font-weight: 700;
              text-transform: uppercase;
              color: #3b82f6;
              letter-spacing: 0.05em;
              border: 0 !important;
            "
          >
            ID: {{ employeeIdNumber }}
          </p>
        </div>
      </div>

      <div style="margin-bottom: 25px; width: 100%; border: 0 !important; box-shadow: none !important; outline: none !important">
        <div style="background-color: white !important; padding: 5px 20px; border: 0 !important">
          <p
            style="
              font-size: 22px;
              font-weight: 500;
              text-transform: uppercase;
              color: #4b5563;
              line-height: 1.2;
              border: 0 !important;
            "
          >
            {{ payload.employee?.item?.position?.title || '' }}
          </p>
        </div>
      </div>

      <div
        ref="hiddenQrContainerRef"
        :style="{
          display: qrCodeIsLoading ? 'none' : 'flex',
          justifyContent: 'center',
          backgroundColor: 'white',
          width: '500px',
          height: '500px',
          border: '0 !important',
        }"
      ></div>
    </div>
  </div>
</template>
