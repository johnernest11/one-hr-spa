<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { usePersonnelStore } from '@/stores/personnel.store'
import QRCodeStyling from 'qr-code-styling'
import * as domToImage from 'dom-to-image-more'
import { useToast } from 'primevue/usetoast'
import DSWDLogo from '@/assets/image/dswd-logo.png'
import DSWDIcon from '@/assets/image/hrcares-icon.png'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'

interface QrData {
  qr_code_value: string
}

interface ApiResponse<T> {
  data: T
  error_message?: string
}

interface Employee {
  id: number | string
  id_number: string
  item?: {
    position?: {
      title: string
    }
  }
}

interface UserProfile {
  id: string | number
  email: string
  name: string
  user_profile?: {
    first_name: string
    last_name: string
  }
  employee?: Employee
}

const authStore = useAuthStore()
const personnelStore = usePersonnelStore()
const toast = useToast()
const showQrModal = ref(false)
const qrCodeIsLoading = ref(false)
const fetchedQrCode = ref<QrData | null>(null)
const selectedEmployeeForQr = ref<UserProfile | null>(null)
const qrContainerRef = ref<HTMLElement | null>(null)
const hiddenQrCardRef = ref<HTMLElement | null>(null)
const hiddenQrContainerRef = ref<HTMLElement | null>(null)

let qrCodeDisplay: QRCodeStyling | null = null
let qrCodeDownload: QRCodeStyling | null = null

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

const openQrModal = async (individual: any) => {
  const user = individual as UserProfile
  if (!user || !user.employee?.id) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Employee data not found.', life: 3000 })
    return
  }

  selectedEmployeeForQr.value = user
  showQrModal.value = true
  fetchedQrCode.value = null
  qrCodeIsLoading.value = true

  try {
    const empId = Number(user.employee.id)
    const response = (await personnelStore.fetchQrCode(empId)) as ApiResponse<QrData>

    let finalData = response.data

    if (response.error_message === 'Employee has no QR code yet.') {
      const genResponse = (await personnelStore.generateQrCode(empId)) as ApiResponse<QrData>
      finalData = genResponse.data
    }

    fetchedQrCode.value = finalData
  } catch (error) {
    toast.add({ severity: 'error', summary: 'System Error', detail: 'QR Fetch failed.', life: 3000 })
    showQrModal.value = false
  } finally {
    qrCodeIsLoading.value = false
  }
}

watchEffect(() => {
  if (!showQrModal.value || !fetchedQrCode.value?.qr_code_value) return

  if (qrContainerRef.value) {
    qrContainerRef.value.innerHTML = ''
    qrCodeDisplay = new QRCodeStyling(qrConfig(280, fetchedQrCode.value.qr_code_value))
    qrCodeDisplay.append(qrContainerRef.value)
  }

  if (hiddenQrContainerRef.value) {
    hiddenQrContainerRef.value.innerHTML = ''
    qrCodeDownload = new QRCodeStyling(qrConfig(500, fetchedQrCode.value.qr_code_value))
    qrCodeDownload.append(hiddenQrContainerRef.value)
  }
})

const downloadQrCode = async () => {
  const node = hiddenQrCardRef.value
  if (!node || !selectedEmployeeForQr.value) return
  const lastName = selectedEmployeeForQr.value.user_profile?.last_name || 'Employee'
  const filename = `${lastName}_Official_QR.png`

  try {
    const dataUrl = await domToImage.toPng(node, {
      quality: 1,
      bgcolor: '#ffffff',
      width: 600,
      height: 900,
    })
    const link = document.createElement('a')
    link.download = filename
    link.href = dataUrl
    link.click()
    toast.add({ severity: 'success', summary: 'Success', detail: 'QR Card saved.', life: 3000 })
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Export Failed', detail: 'Unable to save image.', life: 3000 })
  }
}
</script>

<template>
  <div class="flex h-full w-full flex-col overflow-hidden rounded-lg border bg-surface-50 shadow-sm">
    <div class="border-b bg-surface-0 p-6 text-left">
      <h1 class="text-2xl font-bold text-surface-900 lg:text-3xl">Personnel QR Code</h1>
      <p class="mt-1 text-sm text-surface-500">Official identification and tracking</p>
    </div>

    <div class="flex flex-1 flex-col items-center justify-center bg-white p-12 text-center">
      <div class="mb-6 rounded-full border border-primary-100 bg-primary-50 p-8 shadow-sm">
        <i class="pi pi-id-card text-6xl text-primary-500"></i>
      </div>
      <h2 class="mb-2 text-2xl font-bold text-surface-700">My Official QR</h2>
      <p class="mb-8 max-w-sm text-surface-500">Access your official DSWD identification for daily time recording.</p>

      <Button
        icon="pi pi-qrcode"
        label="VIEW MY QR CODE"
        class="p-button-lg px-8"
        raised
        @click="openQrModal(authStore.authenticatedUser)"
      />
    </div>

    <Dialog v-model:visible="showQrModal" modal header="Employee ID Card" :style="{ width: '420px' }" class="qr-dialog">
      <div class="flex flex-col items-center p-2 text-center">
        <div v-if="qrCodeIsLoading" class="py-12"><i class="pi pi-spin pi-spinner text-4xl text-primary-500"></i></div>

        <template v-else>
          <img :src="DSWDLogo" class="mb-6" style="width: 320px; height: auto" />

          <div class="mb-6 px-2">
            <h3 class="text-2xl font-black uppercase leading-none text-surface-900">
              {{ selectedEmployeeForQr?.user_profile?.first_name }}
              {{ selectedEmployeeForQr?.user_profile?.last_name }}
            </h3>
            <p class="mt-2 text-sm font-bold uppercase text-primary-600">
              {{ selectedEmployeeForQr?.employee?.item?.position?.title || 'Personnel' }}
            </p>
            <span class="mt-1 block font-mono text-xs text-surface-400">
              ID No: {{ selectedEmployeeForQr?.employee?.id_number }}
            </span>
          </div>

          <div ref="qrContainerRef" class="mb-8 rounded-lg border border-surface-200 bg-white p-3"></div>

          <div class="flex w-full gap-3">
            <Button label="Download" icon="pi pi-download" severity="success" class="flex-1" @click="downloadQrCode" />
            <Button label="Close" severity="secondary" outlined class="flex-1" @click="showQrModal = false" />
          </div>
        </template>
      </div>

      <div style="position: absolute; left: -9999px; top: -9999px">
        <div ref="hiddenQrCardRef" class="flex flex-col items-center bg-white" style="width: 600px; height: 900px; padding: 60px">
          <div
            class="mb-12 flex w-full flex-col items-center border-b-8 border-blue-900 pb-8"
            style="border-bottom-color: #1e3a8a"
          >
            <img :src="DSWDLogo" style="width: 400px; margin-bottom: 30px" />
            <h1
              style="
                font-size: 2.8rem;
                font-weight: 900;
                color: #111827;
                text-transform: uppercase;
                margin: 0;
                line-height: 1.1;
                text-align: center;
              "
            >
              {{ selectedEmployeeForQr?.user_profile?.first_name }}<br />{{ selectedEmployeeForQr?.user_profile?.last_name }}
            </h1>
            <p style="font-size: 1.3rem; color: #374151; font-weight: 800; margin-top: 15px; text-transform: uppercase">
              {{ selectedEmployeeForQr?.employee?.item?.position?.title }}
            </p>
            <p style="font-size: 1.1rem; color: #6b7280; font-weight: 600; margin-top: 5px">
              ID NO: {{ selectedEmployeeForQr?.employee?.id_number }}
            </p>
          </div>
          <div ref="hiddenQrContainerRef"></div>
          <div class="mt-auto w-full text-center">
            <p style="font-size: 1.2rem; font-weight: 900; color: #9ca3af; letter-spacing: 8px; text-transform: uppercase">
              DSWD HR CARES
            </p>
          </div>
        </div>
      </div>
    </Dialog>
  </div>
</template>
