<script setup lang="ts">
import { ref, Ref, onMounted, onUnmounted, computed } from 'vue'
import { QrcodeStream, DetectedBarcode } from 'vue-qrcode-reader'
import { useDailyLogsStore } from '@/stores/daily-logs.store'
import { useLibrariesStore } from '@/stores/libraries.store'
import Dialog from 'primevue/dialog'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { getManilaTodayISO, formatTime } from '@/utils/helpers.ts'
import dswdLogoMark from '@/assets/image/DSWD logo_Mark.png'
import WbAutoComplete from '@/components/webkit/WbAutoComplete.vue'
import { WbAutoCompleteOption } from '@/components/webkit/WbAutoComplete.vue'

const currentDate: Ref<string> = ref('')
const currentTime: Ref<string> = ref('')
const meridiem: Ref<string> = ref('')
const seconds: Ref<string> = ref('')
const showModal: Ref<boolean> = ref(false)
const showOfficeSelectionModal: Ref<boolean> = ref(true)
const dailyLogsStore = useDailyLogsStore()
const librariesStore = useLibrariesStore()
const todayISO = ref('')
const errorMessage = ref<string | null>(null)
const cameraError = ref<string | null>(null)
const isMobile = ref(false)

const MODAL_DISPLAY_DURATION_MS = 10000
const isProcessingScan = ref(false)

const scanTimeoutId = ref<number | undefined>(undefined)
const intervalId = ref<number | undefined>(undefined)

const qrStreamRef = ref<InstanceType<typeof QrcodeStream> | null>(null)

const selectedOffice = ref<WbAutoCompleteOption | null | undefined>(null)

const recentLogs = ref<string[]>([])

const startTimeLogs = () => {
  if (selectedOffice.value) {
    localStorage.setItem('timelogOfficeId', selectedOffice.value.value as string)
    showOfficeSelectionModal.value = false
  }
}

const updateDailyLogsState = async (date: string) => {
  await dailyLogsStore.fetchDailyLogs(date)
  recentLogs.value = dailyLogsStore.getTodayWarmBodies(date).slice(0, 10)
}

const updateDateTime = () => {
  const now = new Date()
  const optionsDate = { timeZone: 'Asia/Manila', weekday: 'long', month: 'long', day: 'numeric' } as const
  const optionsTime = { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true } as const

  currentDate.value = now.toLocaleDateString('en-PH', optionsDate)
  const timeString = now.toLocaleTimeString('en-PH', optionsTime)
  const [time, ampm] = timeString.split(/\s+/)
  const [hours, minutes, newSeconds] = time.split(':')

  currentTime.value = `${hours}:${minutes}`
  meridiem.value = ampm
  seconds.value = newSeconds

  const newTodayISO = getManilaTodayISO()
  if (newTodayISO !== todayISO.value) {
    todayISO.value = newTodayISO
    void dailyLogsStore.fetchWarmBodySummary(todayISO.value)
    void updateDailyLogsState(todayISO.value)
  }
}

onMounted(async () => {
  const storedOfficeId = localStorage.getItem('timelogOfficeId')
  if (storedOfficeId) {
    showOfficeSelectionModal.value = false
    selectedOffice.value = librariesStore.officeOptions.find((office) => office.value === storedOfficeId)
  } else {
    showOfficeSelectionModal.value = true
  }

  const today = getManilaTodayISO()
  todayISO.value = today
  updateDateTime()
  intervalId.value = window.setInterval(updateDateTime, 1000)
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
})

onUnmounted(() => {
  if (intervalId.value) clearInterval(intervalId.value)
  window.removeEventListener('resize', checkScreenSize)
  if (scanTimeoutId.value) clearTimeout(scanTimeoutId.value)
})

const onDetect = (detectedCodes: DetectedBarcode[]) => {
  if (detectedCodes.length > 0 && !isProcessingScan.value) {
    const firstCode = detectedCodes[0]
    const decodedString = firstCode.rawValue
    isProcessingScan.value = true
    onDecode(decodedString)
  }
}

const capturePhoto = () => {
  if (!qrStreamRef.value) return null
  const videoElement = qrStreamRef.value.$el.querySelector('video')
  if (!videoElement) return null
  const canvas = document.createElement('canvas')
  canvas.width = videoElement.videoWidth
  canvas.height = videoElement.videoHeight
  const context = canvas.getContext('2d')
  if (context) {
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.8)
  }
  return null
}

const onDecode = async (result: string) => {
  if (scanTimeoutId.value) {
    clearTimeout(scanTimeoutId.value)
    scanTimeoutId.value = undefined
  }
  if (showModal.value) handleCloseDialog()

  dailyLogsStore.clearScannedEmployee()
  errorMessage.value = null

  const capturedImage = capturePhoto()

  if (!result || result.trim() === '') {
    dailyLogsStore.lastLogMessage = 'Empty QR code scanned. Please try again.'
    showModal.value = true
    isProcessingScan.value = false
    scanTimeoutId.value = setTimeout(() => handleCloseDialog(), MODAL_DISPLAY_DURATION_MS) as unknown as number
    return
  }

  try {
    const response = await dailyLogsStore.logEmployeeTime(result, capturedImage)

    if (response?.data?.log) {
      const newLog = response.data.log

      if (!newLog.captured_image && capturedImage) {
        newLog.captured_image = capturedImage
      }

      recentLogs.value.unshift(newLog)
      recentLogs.value = recentLogs.value.slice(0, 10)

      showModal.value = true
    } else {
      dailyLogsStore.lastLogMessage = 'QR Code not recognized. Please try again.'
      showModal.value = true
    }
  } catch (err) {
    dailyLogsStore.lastLogMessage = 'An error occurred while logging. Please try again.'
    showModal.value = true
  }
}

const onInit = (promise: Promise<void>) => {
  promise
    .then(() => (cameraError.value = null))
    .catch((err) => {
      if (err.name === 'NotAllowedError') cameraError.value = 'Camera access denied. Please grant permission.'
      else if (err.name === 'NotFoundError') cameraError.value = 'No camera found. Please ensure a camera is connected.'
      else if (err.name === 'NotReadableError') cameraError.value = 'Camera is in use or not accessible.'
      else if (err.name === 'OverconstrainedError') cameraError.value = 'Camera does not support requested constraints.'
      else if (err.name === 'StreamApiNotSupportedError') cameraError.value = 'Browser does not support camera API.'
      else cameraError.value = 'An unknown camera error occurred.'
    })
}

const onCameraError = (error: unknown) => {
  if (error instanceof Error) cameraError.value = `Camera stream error: ${error.message}`
  else cameraError.value = 'An unexpected camera stream error occurred.'
}

const countInToday = computed(() => dailyLogsStore.warmBodySummary?.in_office || 0)
const countOutToday = computed(() => dailyLogsStore.warmBodySummary?.out_of_office || 0)

const checkScreenSize = () => (isMobile.value = window.innerWidth <= 575)

const dialogDynamicStyle = computed(() =>
  isMobile.value ? { width: '100vw', height: '100vh', maxWidth: 'unset', maxHeight: 'unset' } : { width: '25vw' }
)

const dialogDynamicPosition = computed(() => (isMobile.value ? 'center' : 'right'))

const dynamicSuccessMessage = computed(() => {
  if (dailyLogsStore.currentScannedEmployee) {
    return dailyLogsStore.currentScannedEmployee.is_in ? 'Timed In!' : 'Timed Out!'
  }
  if (dailyLogsStore.lastLogMessage) return dailyLogsStore.lastLogMessage
  return 'Processing...'
})

const handleCloseDialog = () => {
  showModal.value = false
  errorMessage.value = null
  dailyLogsStore.clearScannedEmployee()
}

const latestWarmBodyLogs = computed(() => recentLogs.value)
</script>

<template>
  <div>
    <Dialog
      v-if="showOfficeSelectionModal"
      v-model:visible="showOfficeSelectionModal"
      :modal="true"
      :closable="false"
      :style="{ width: '30vw' }"
      :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
    >
      <template #header>
        <div class="flex items-center space-x-3 pt-4 sm:px-6 md:px-8">
          <font-awesome-icon :icon="['fas', 'map-location-dot']" class="h-6 text-surface-600 sm:h-7 md:h-8" />
          <h1 class="text-2xl font-semibold text-surface-600 sm:text-xl md:text-2xl">Select official station</h1>
        </div>
      </template>
      <hr />

      <div class="flex flex-col space-y-6 p-8 text-center">
        <p class="text-lg text-surface-600">Select the official station of this Time Log to proceed</p>
        <div class="w-full items-center">
          <WbAutoComplete
            :suggestions="librariesStore.officeOptions"
            :loading="librariesStore.officeOptionsLoading"
            placeholder="Type to select from the list of official stations to proceed"
            v-model="selectedOffice"
            label=""
            optionLabel="label"
            optionValue="value"
            forceSelection
          />
        </div>

        <div class="flex w-full justify-end">
          <button
            @click="startTimeLogs"
            :disabled="!selectedOffice || librariesStore.officeOptionsLoading"
            class="transform rounded-lg px-8 py-3 font-semibold text-primary-600 shadow-md duration-300 hover:scale-105"
            :class="{
              'border border-primary-500 bg-white hover:bg-primary-700 hover:text-white': selectedOffice,
              'cursor-not-allowed bg-gray-400 text-white': !selectedOffice,
            }"
          >
            <span v-if="librariesStore.officeOptionsLoading" class="flex items-center justify-center space-x-2">
              <span class="pi pi-spin pi-spinner"></span>
              <span>Loading...</span>
            </span>
            <span v-else>Proceed to Time Log</span>
          </button>
        </div>
      </div>
    </Dialog>

    <div v-if="!showOfficeSelectionModal" class="flex h-screen w-screen flex-col-reverse overflow-hidden md:flex-row">
      <div class="flex w-full flex-col overflow-hidden bg-primary-500 p-4 text-white md:w-1/4">
        <div class="mb-8 flex items-center space-x-2">
          <img src="@/assets/image/fo-bp.png" alt="DSWD Logo" class="h-16" />
        </div>
        <h2 class="mb-4 text-center text-2xl font-semibold md:text-3xl">WARM BODIES</h2>
        <div class="mb-4 grid grid-cols-2 gap-4 text-center text-lg md:text-2xl">
          <div>
            <p>IN</p>
            <p>{{ countInToday }}</p>
          </div>
          <div>
            <p>OUT</p>
            <p>{{ countOutToday }}</p>
          </div>
        </div>
        <div class="scrollbar-hide flex flex-1 justify-center overflow-y-auto font-mono text-sm md:text-base">
          <template v-if="latestWarmBodyLogs.length">
            <table class="w-1/2 text-center">
              <tbody>
                <tr v-for="entry in latestWarmBodyLogs" :key="entry.id">
                  <td class="p-2">
                    <img
                      v-if="entry.captured_image || entry.photo_url"
                      :src="entry.captured_image || entry.photo_url"
                      alt="Captured"
                      class="h-14 w-14 rounded-md object-cover"
                    />
                  </td>

                  <td class="p-2">
                    <p class="text-xs">{{ entry.employee_id }} - {{ formatTime(entry.timestamp) }}</p>
                  </td>

                  <td class="p-2">
                    <span
                      class="rounded-full px-3 py-1 text-xs font-bold"
                      :class="entry.is_in ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'"
                    >
                      {{ entry.is_in ? 'IN' : 'OUT' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </template>

          <p v-else class="text-center text-gray-400">No logs found for today.</p>
        </div>
      </div>

      <div class="flex w-full flex-col items-center space-y-4 overflow-y-hidden bg-primary-100 p-4 md:w-3/4">
        <div class="w-full text-left">
          <div class="text-2xl text-surface-500">{{ currentDate }}</div>
          <div class="text-8xl font-bold text-surface-500">
            {{ currentTime }}<span class="text-2xl">:{{ seconds }}s</span> <span class="text-lg md:text-2xl">{{ meridiem }}</span>
          </div>
        </div>

        <div class="flex w-full flex-1 items-center justify-center">
          <div
            class="relative flex h-full max-h-[80vh] w-full items-center justify-center overflow-hidden rounded-lg bg-black shadow"
          >
            <qrcode-stream
              ref="qrStreamRef"
              @detect="onDetect"
              :constraints="{ facingMode: 'environment' }"
              @init="onInit"
              @camera-error="onCameraError"
              :paused="false"
              class="h-full w-full object-cover"
            />

            <img
              src="@/assets/image/scanning.gif"
              alt="Scanning Animation"
              class="pointer-events-none absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </div>
      </div>

      <Dialog
        v-model:visible="showModal"
        :modal="false"
        :closable="true"
        :dismissableMask="true"
        :position="dialogDynamicPosition"
        :style="dialogDynamicStyle"
        :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
        :pt="{
          root: 'flex flex-col h-full bg-white shadow-lg p-4 md:p-12',
          header: 'hidden',
          content:
            'flex-grow flex flex-col items-center justify-start space-y-6 md:space-y-12 text-center h-full overflow-y-auto',
        }"
      >
        <template v-if="dailyLogsStore.lastLogMessage && !dailyLogsStore.currentScannedEmployee">
          <div class="flex items-center justify-center text-4xl font-semibold text-error-600 md:text-4xl">
            <FontAwesomeIcon icon="fas fa-circle-xmark" class="mr-4 md:mr-6" />Error!
          </div>
          <p class="text-center text-xl font-medium text-surface-800 md:text-3xl">
            {{ dailyLogsStore.lastLogMessage }}
          </p>
        </template>

        <template v-else-if="dailyLogsStore.currentScannedEmployee">
          <div class="custom-scrollbar flex h-full w-full flex-grow flex-col items-center justify-start overflow-y-auto">
            <hr class="mb-6 border-t border-surface-300" />

            <div class="flex items-center text-4xl font-semibold text-success-600 md:text-4xl">
              <FontAwesomeIcon :icon="['fas', 'circle-check']" class="mr-4 md:mr-6" />
              {{ dynamicSuccessMessage }}
            </div>

            <div class="mb-4 flex justify-center">
              <img
                :src="dailyLogsStore.currentScannedEmployee?.photo_url || dswdLogoMark"
                alt="Employee Profile Photo"
                class="h-auto max-w-full rounded-lg shadow"
                style="aspect-ratio: 2270 / 2479"
              />
            </div>

            <div class="w-full space-y-4 px-4 text-left md:space-y-8 md:pl-0 md:pr-0">
              <div>
                <span class="mb-2 block text-xl font-semibold uppercase text-surface-500 md:mb-4 md:text-xl">Name:</span>
                <p class="text-2xl font-bold text-surface-800 md:text-2xl">
                  {{ dailyLogsStore.currentScannedEmployee?.name || 'N/A' }}
                </p>
              </div>

              <div>
                <span class="mb-2 block text-xl font-semibold uppercase text-surface-500 md:mb-4 md:text-xl">ID Number:</span>
                <p class="font-mono text-2xl text-primary-700 md:text-2xl">
                  {{ dailyLogsStore.currentScannedEmployee?.id || 'N/A' }}
                </p>
              </div>

              <div>
                <span class="mb-2 block text-xl font-semibold uppercase text-surface-500 md:mb-4 md:text-xl">Position:</span>
                <p class="text-2xl font-bold text-surface-800 md:text-2xl">
                  {{ dailyLogsStore.currentScannedEmployee?.position || 'N/A' }}
                </p>
              </div>
            </div>
          </div>
        </template>
      </Dialog>
    </div>
  </div>
</template>
