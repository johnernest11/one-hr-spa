<script setup lang="ts">
import Card from 'primevue/card'
import { useAuthStore } from '@/stores/auth.store.ts'
import { computed, reactive, ref, watchEffect } from 'vue'
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
import { usePersonnelStore } from '@/stores/personnel.store'
import type { QrCodeResponse } from '@/typings/models.types'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const authStore = useAuthStore()
const personnelStore = usePersonnelStore()
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

const employeeIdNumber = computed(() => {
  return payload.employee.id
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

/**************************************
         QR Code Generation Function
*************************************** */
const fetchedQrCode = ref<QrCodeResponse | null>(null)
const canDownload = ref(false)
let qrCodeDisplay: QRCodeStyling | null = null
let qrCodeDownload: QRCodeStyling | null = null

const openQrModal = async (employeeId: number) => {
  showQrModal.value = true
  fetchedQrCode.value = null

  if (!employeeId) {
    toast.add({
      severity: 'error',
      summary: 'Invalid action.',
      detail: 'You have no ID number. Please contact an administrator to fix this.',
      life: 5000,
    })
    console.log('The selected individual has no employee record.')
  } else {
    fetchedQrCode.value = await handleViewQr(employeeId)
  }
}

const handleViewQr = async (employeeId: number): Promise<QrCodeResponse> => {
  qrCodeIsLoading.value = true
  canDownload.value = false

  let response = await personnelStore.fetchQrCode(employeeId)
  
  if (!employeeHasIdNumber(response)) {
    personnelStore.isEmployeesLoading = false
    qrCodeIsLoading.value = false
    return response.data as QrCodeResponse
  }

  if (response.error_message === 'Employee has no QR code yet.' && !response.success) {
    response = await personnelStore.generateQrCode(employeeId)

    if (!employeeHasIdNumber(response)) {
      personnelStore.isEmployeesLoading = false
      qrCodeIsLoading.value = false
      return response.data as QrCodeResponse
    }
  }

  canDownload.value = true
  personnelStore.isEmployeesLoading = false
  qrCodeIsLoading.value = false
  return response.data as QrCodeResponse
}

const employeeHasIdNumber = (response: ApiResponseBody): boolean => {
  if (response.error_message === 'This employee has no ID number.' && !response.success) {
    toast.add({
      severity: 'error',
      summary: 'Cannot generate QR code.',
      detail: response.error_message + ' Kindly contact the administrator for support.',
      life: 5000,
    })
    return false
  }
  return true
}

watchEffect(() => {
  if (!showQrModal.value || !fetchedQrCode.value?.qr_code_value) {
    return
  }

  if (qrContainerRef.value) {
    if (!qrCodeDisplay) {
      qrCodeDisplay = new QRCodeStyling({
        width: 350,
        height: 350,
        type: 'canvas',
        data: fetchedQrCode.value.qr_code_value,
        image: DSWDIcon,
        dotsOptions: { color: '#000000', type: 'square' },
        backgroundOptions: { color: '#FFFFFF' },
        imageOptions: { crossOrigin: 'anonymous', margin: 5 },
        qrOptions: { errorCorrectionLevel: 'H' },
        cornersSquareOptions: { type: 'square', color: '#000000' },
        cornersDotOptions: { type: 'square', color: '#000000' },
      })
      qrCodeDisplay.append(qrContainerRef.value)
    } else {
      qrCodeDisplay.update({ data: fetchedQrCode.value.qr_code_value })
    }
  }

  if (hiddenQrContainerRef.value) {
    if (!qrCodeDownload) {
      qrCodeDownload = new QRCodeStyling({
        width: 500,
        height: 500,
        type: 'canvas',
        data: fetchedQrCode.value.qr_code_value,
        image: DSWDIcon,
        dotsOptions: { color: '#000000', type: 'square' },
        backgroundOptions: { color: '#FFFFFF' },
        imageOptions: { crossOrigin: 'anonymous', margin: 5 },
        qrOptions: { errorCorrectionLevel: 'H' },
        cornersSquareOptions: { type: 'square', color: '#000000' },
        cornersDotOptions: { type: 'square', color: '#000000' },
      })
      qrCodeDownload.append(hiddenQrContainerRef.value)
    } else {
      qrCodeDownload.update({ data: fetchedQrCode.value.qr_code_value })
    }
  }
})

const downloadQrCode = async () => {
  const node = hiddenQrCardRef.value
  const employee = payload.individual

  if (!node || !employee) {
    console.error('Node or employee data missing for QR download.')
    return
  }

  if (!hiddenQrContainerRef.value?.firstChild) {
    console.error('Hidden QR code element not yet rendered.')
    toast.add({
      severity: 'warn',
      summary: 'Render Pending',
      detail: 'QR code not fully generated. Please wait a moment and try again.',
      life: 3000,
    })
    return
  }

  const filename = `${employee.last_name}_QRCard.png`

  try {
    const dataUrl = await domToImage.toPng(node, {
      quality: 0.95,
      bgcolor: 'white',
    })

    const link = document.createElement('a')
    link.download = filename
    link.href = dataUrl
    link.click()

    toast.add({
      severity: 'success',
      summary: 'Download Successful',
      detail: `QR Card downloaded as ${filename}.`,
      life: 3000,
    })
  } catch (error) {
    console.error('Error generating QR card image with dom-to-image:', error)
    toast.add({
      severity: 'error',
      summary: 'Download Failed',
      detail: 'Could not generate the QR image. The image library failed to capture the element.',
      life: 7000,
    })
  }
}

const closeQrModal = () => {
  showQrModal.value = false
  fetchedQrCode.value = null

  if (qrContainerRef.value) {
    qrContainerRef.value.innerHTML = ''
  }
  if (hiddenQrContainerRef.value) {
    hiddenQrContainerRef.value.innerHTML = ''
  }
  qrCodeDisplay = null
  qrCodeDownload = null
}

</script>

<template>
  <div class="mx-auto flex h-full w-full flex-col">
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
                <span v-if="employeeIdNumber" class="mt-0.5 text-xs font-semibold text-primary-600 sm:text-sm">
                  ID No: {{ employeeIdNumber }}
                </span>
                <span class="mt-1 text-xs text-surface-500 sm:text-sm">{{ fullAddress }}</span>
              </div>
            </div>

            <div class="mt-4 md:mt-0">
              <Button
                type="button"
                icon="pi pi-qrcode"
                label="My QR Code"
                outlined
                class="bg-surface-500 px-5 text-sm font-semibold"
                @click="openQrModal(employeeIdNumber)"
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

    <!-- Modal of QR -->
    <template>
      <Dialog v-model:visible="showQrModal" modal :style="{ width: '50vw' }" @hide="closeQrModal">
        <template #header>
          <div class="flex items-center space-x-3 pt-4 sm:px-6 md:px-8">
            <font-awesome-icon icon="qrcode" class="h-6 text-surface-600 sm:h-7 md:h-8" />
            <h1 class="font-base text-2xl text-surface-600 sm:text-xl md:text-2xl">Employee QR Code</h1>
          </div>
        </template>
        <hr />

        <div
          v-if="payload.individual"
          ref="qrCardRef"
          class="mx-auto flex w-full max-w-sm flex-col items-center bg-white p-6 text-center sm:max-w-md"
        >
          <div class="mb-4 flex w-full flex-col items-center">
            <img src="@/assets/image/dswd-logo.png" alt="DSWD Logo" class="object-contain" />
          </div>

          <div class="mb-2 w-full">
            <p class="text-lg font-extrabold uppercase leading-tight text-gray-900 sm:text-xl">
              {{ payload.individual.last_name }}, {{ payload.individual.first_name }}
              {{ payload.individual.middle_name ?? ' ' + '' }}
              {{ payload.individual.ext_name ?? '' }}
            </p>
          </div>
          <div class="mb-4 w-full">
            <p class="mt-1 text-xs font-medium uppercase text-gray-700 sm:text-sm">
              {{ payload.employee?.item?.position?.title || '' }}
            </p>
          </div>

          <div
            v-if="!qrCodeIsLoading"
            ref="qrContainerRef"
            class="flex h-[250px] w-[250px] justify-center bg-white sm:h-[300px] sm:w-[300px] md:h-[350px] md:w-[350px]"
          ></div>

          <div v-else class="my-6 flex justify-center">
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
            <FontAwesomeIcon icon="fa-solid fa-download" class="mr-2" /> Download QR Card
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
          height: 900px;
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

        <div style="margin-bottom: 5px; width: 100%; border: 0 !important; box-shadow: none !important; outline: none !important">
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
              {{ payload.individual.middle_name ?? ' ' + '' }}
              {{ payload.individual.ext_name ?? '' }}
            </p>
          </div>
        </div>

        <div
          style="margin-bottom: 30px; width: 100%; border: 0 !important; box-shadow: none !important; outline: none !important"
        >
          <div style="background-color: white !important; padding: 5px 20px; border: 0 !important">
            <p
              style="
                font-size: 22px;
                font-weight: 500;
                text-transform: uppercase;
                color: #1f2937;
                line-height: 1.2;
                border: 0 !important;
              "
            >
              {{ payload.employee?.item?.position?.title || '' }}
            </p>
          </div>
        </div>

        <div
          v-if="!qrCodeIsLoading"
          ref="hiddenQrContainerRef"
          style="
            display: flex;
            justify-content: center;
            background-color: white;
            width: 500px;
            height: 500px;
            border: 0 !important;
          "
        ></div>
      </div>
    </template>

  </div>
</template>
