<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useStorage } from '@vueuse/core'
import { QrcodeStream, DetectedBarcode } from 'vue-qrcode-reader'
import { useDailyLogsStore } from '@/stores/daily-logs.store'
import { useLibrariesStore } from '@/stores/libraries.store'
import { useAuthStore } from '@/stores/auth.store'
import { useRoute } from 'vue-router'
import Dialog from 'primevue/dialog'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { getManilaTodayISO, formatTime } from '@/utils/helpers.ts'
import dswdLogoMark from '@/assets/image/DSWD logo_Mark.png'
import WbAutoComplete from '@/components/webkit/WbAutoComplete.vue'
import { WbAutoCompleteOption } from '@/components/webkit/WbAutoComplete.vue'

interface Log {
  id: string
  employee_id: string
  timestamp: string
  is_in: boolean
  name: string
  position: string
  office: string
  photo_url: string
  captured_image: string | null
  daily_time_record?: {
    employee?: {
      id_number?: string
      individual_basic_detail?: {
        first_name?: string
        last_name?: string
      }
      item?: { position?: { title?: string } }
    }
  }
}

interface BackendLog {
  id: number | string
  employee_id?: string
  date: string
  scanned_time: string
  is_in: boolean
  office_id?: string | number
  captured_photo_url?: string | null
  captured_image_url?: string | null
  position?: string
  daily_time_record_id?: string | number
  daily_time_record?: {
    employee?: {
      id_number?: string
      individual_basic_detail?: { first_name?: string; last_name?: string }
      item?: { position?: { title?: string } }
      user_profile?: { profile_picture_url?: string }
    }
  }
}

const currentDate = ref('')
const currentTime = ref('')
const meridiem = ref('')
const seconds = ref('')
const showModal = ref(false)
const showOfficeSelectionModal = ref(true)
const dailyLogsStore = useDailyLogsStore()
const authStore = useAuthStore()
const route = useRoute()
const librariesStore = useLibrariesStore()
const todayISO = ref('')
const cameraError = ref<string | null>(null)
const isMobile = ref(false)
const MODAL_DISPLAY_DURATION_MS = 10000
const scanTimeoutId = ref<number | undefined>(undefined)
const intervalId = ref<number | undefined>(undefined)
const qrStreamRef = ref<InstanceType<typeof QrcodeStream> | null>(null)
const selectedOffice = ref<WbAutoCompleteOption | undefined>(undefined)
const recentLogs = ref<Log[]>([])
const isScannerResetting = ref(false)
const scannedEmployee = computed(() => dailyLogsStore.currentScannedEmployee as Log | null | undefined)

const paintOutline = (detectedCodes: DetectedBarcode[], ctx: CanvasRenderingContext2D) => {
  for (const detectedCode of detectedCodes) {
    const [firstPoint, ...otherPoints] = detectedCode.cornerPoints
    ctx.strokeStyle = 'red'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(firstPoint.x, firstPoint.y)
    for (const { x, y } of otherPoints) ctx.lineTo(x, y)
    ctx.closePath()
    ctx.stroke()
  }
}

const startTimeLogs = async () => {
  if (selectedOffice.value) dailyLogsStore.setOffice(selectedOffice.value)
  showOfficeSelectionModal.value = false
  const today = getManilaTodayISO()
  await dailyLogsStore.fetchWarmBodySummary(today)
  await updateDailyLogsState(today)
}

const updateDailyLogsState = async (date: string) => {
  await dailyLogsStore.fetchDailyLogs(date)
  const currentOfficeId = dailyLogsStore.timelogOfficeId
  if (!currentOfficeId) return

  const backendLogs: BackendLog[] = dailyLogsStore.getTodayWarmBodies(date) || []

  const filteredLogs: Log[] = backendLogs
    .filter((log) => String(log.office_id) === String(currentOfficeId))
    .map((log) => {
      const employee = log.daily_time_record?.employee
      const empDetails = employee?.individual_basic_detail
      const captured = log.captured_image_url ?? log.captured_photo_url ?? null

      return {
        id: String(log.id ?? ''),
        employee_id: String(employee?.id_number ?? 'N/A'),
        timestamp: `${log.date}T${log.scanned_time}`,
        is_in: log.is_in ?? false,
        name: `${empDetails?.first_name ?? ''} ${empDetails?.last_name ?? ''}`.trim() || 'N/A',
        position: employee?.item?.position?.title ?? 'N/A',
        office:
          librariesStore.officeOptions.find((o: WbAutoCompleteOption) => String(o.value) === String(currentOfficeId))?.label ||
          'N/A',
        captured_image: captured,
        photo_url: captured || dswdLogoMark,
      }
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10)

  recentLogs.value = filteredLogs

  if (recentLogs.value.length > 0) {
    dailyLogsStore.currentScannedEmployee = recentLogs.value[0] as any
  }
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
  await librariesStore.fetchOffices()

  if (dailyLogsStore.timelogOfficeId) {
    const matchedOffice = librariesStore.officeOptions.find(
      (o: WbAutoCompleteOption) => String(o.value) === String(dailyLogsStore.timelogOfficeId)
    )

    selectedOffice.value = matchedOffice ?? undefined

    if (selectedOffice.value) {
      showOfficeSelectionModal.value = false
    } else {
      showOfficeSelectionModal.value = true
    }
  } else {
    showOfficeSelectionModal.value = true
  }

  const today = getManilaTodayISO()
  todayISO.value = today
  updateDateTime()

  intervalId.value = window.setInterval(updateDateTime, 1000)
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
  await dailyLogsStore.fetchWarmBodySummary(today)
  await updateDailyLogsState(today)
})

watch(
  () => route.name,
  (newName) => {
    const expiration = useStorage('auth-token-expiration', null)
    const userRoles = authStore.authRoles
    if (newName === 'time-logs' && expiration.value && userRoles.includes('time_logger')) {
      authStore.clearScheduledRefresh()
      authStore.scheduleTokenRefresh(new Date(expiration.value))
    } else {
      authStore.clearScheduledRefresh()
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  if (intervalId.value) clearInterval(intervalId.value)
  window.removeEventListener('resize', checkScreenSize)
  if (scanTimeoutId.value) clearTimeout(scanTimeoutId.value)
})

const onDetect = (detectedCodes: DetectedBarcode[]) => {
  if (!detectedCodes.length) return
  const decodedString = detectedCodes[0].rawValue

  if (showModal.value) {
    showModal.value = false
    dailyLogsStore.clearScannedEmployee()
  }

  if (isScannerResetting.value) return
  isScannerResetting.value = true

  onDecode(decodedString)

  setTimeout(() => {
    isScannerResetting.value = false
  })
}

const capturePhoto = async (): Promise<{ file: File; previewUrl: string } | null> => {
  const videoElement = qrStreamRef.value?.$el.querySelector('video') as HTMLVideoElement | null
  if (!videoElement || videoElement.readyState < 2) return null
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  canvas.width = videoElement.videoWidth
  canvas.height = videoElement.videoHeight
  ctx.save()
  ctx.scale(-1, 1)
  ctx.drawImage(videoElement, -canvas.width, 0, canvas.width, canvas.height)
  ctx.restore()

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return resolve(null)
        const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' })
        const previewUrl = URL.createObjectURL(file)
        resolve({ file, previewUrl })
        canvas.remove()
      },
      'image/jpeg',
      0.95
    )
  })
}

const onDecode = async (result: string) => {
  dailyLogsStore.clearScannedEmployee()
  const captured = await capturePhoto()

  try {
    const formData = new FormData()
    formData.append('scanned_qr', result)
    if (captured?.file) formData.append('captured_image', captured.file)

    const officeId = Number(localStorage.getItem('timelog_office_id') || dailyLogsStore.timelogOfficeId || 0)
    formData.append('office_id', officeId.toString())

    const response = await dailyLogsStore.logEmployeeTime(formData)

    if (!response?.success) {
      dailyLogsStore.lastLogMessage = response?.message || 'Failed to log time.'
      showModal.value = true
      return
    }

    const today = getManilaTodayISO()
    await Promise.all([dailyLogsStore.fetchWarmBodySummary(today), updateDailyLogsState(today)])

    const officeLabel = librariesStore.officeOptions.find((o: WbAutoCompleteOption) => o.value === officeId)?.label || 'N/A'

    const data = response.data as {
      id: string | number
      date: string
      scanned_time: string
      is_in: boolean
      daily_time_record?: {
        employee?: {
          id_number?: string
          individual_basic_detail?: { first_name?: string; last_name?: string }
          item?: { position?: { title?: string } }
          user_profile?: { profile_picture_url?: string }
        }
      }
      captured_image_url?: string
      daily_time_record_id?: string | number
    }

    const newLog: Log = {
      id: String(data.id ?? ''),
      employee_id: String(data.daily_time_record?.employee?.id_number ?? data.daily_time_record_id ?? ''),
      timestamp: `${data.date}T${data.scanned_time}`,
      is_in: data.is_in ?? false,
      name:
        `${data.daily_time_record?.employee?.individual_basic_detail?.first_name ?? ''} ${data.daily_time_record?.employee?.individual_basic_detail?.last_name ?? ''}`.trim() ||
        'N/A',
      position: data.daily_time_record?.employee?.item?.position?.title ?? 'N/A',
      office: officeLabel,
      captured_image: data.captured_image_url ?? captured?.previewUrl ?? null,
      photo_url: (data.captured_image_url ?? captured?.previewUrl) || dswdLogoMark,
    }

    recentLogs.value = [newLog, ...recentLogs.value.filter((l) => l.office === officeLabel)]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)

    dailyLogsStore.currentScannedEmployee = newLog
    showModal.value = true

    setTimeout(() => {
      showModal.value = false
      dailyLogsStore.clearScannedEmployee()
    }, MODAL_DISPLAY_DURATION_MS)
  } catch (error) {
    console.error(error)
    dailyLogsStore.lastLogMessage = 'Network or server error.'
    showModal.value = true
  }
}

const onInit = (promise: Promise<void>) => {
  promise
    .then(() => (cameraError.value = null))
    .catch((err) => {
      const errorMap: Record<string, string> = {
        NotAllowedError: 'Camera access denied.',
        NotFoundError: 'No camera found.',
        NotReadableError: 'Camera in use.',
        OverconstrainedError: 'Unsupported camera constraints.',
        StreamApiNotSupportedError: 'Browser does not support camera API.',
      }
      cameraError.value = errorMap[err.name] || 'Unknown camera error.'
    })
}

const onCameraError = (error: unknown) => {
  cameraError.value = error instanceof Error ? error.message : 'Camera stream error.'
}

const countInToday = computed(() => dailyLogsStore.warmBodySummary?.in_office ?? 0)
const countOutToday = computed(() => dailyLogsStore.warmBodySummary?.out_of_office ?? 0)

const checkScreenSize = () => (isMobile.value = window.innerWidth <= 575)
const dialogDynamicStyle = computed(() =>
  isMobile.value ? { width: '100vw', height: '100vh', maxWidth: 'unset', maxHeight: 'unset' } : { width: '25vw' }
)

const dialogDynamicPosition = computed(() => (isMobile.value ? 'center' : 'right'))

const dynamicSuccessMessage = computed(() =>
  dailyLogsStore.currentScannedEmployee
    ? dailyLogsStore.currentScannedEmployee.is_in
      ? 'Timed In!'
      : 'Timed Out!'
    : dailyLogsStore.lastLogMessage || 'Processing...'
)

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
            <table class="w-3/4 text-center">
              <tbody>
                <tr v-for="entry in latestWarmBodyLogs" :key="entry.id">
                  <td class="p-2">
                    <img :src="entry.captured_image ?? ''" alt="Captured Photo" class="aspect-[2270/2479] border object-cover" />
                  </td>

                  <td class="p-2">
                    <p class="text-xl">{{ entry.employee_id }} - {{ formatTime(entry.timestamp) }}</p>
                  </td>

                  <td class="p-2">
                    <span
                      class="rounded-full px-3 py-1 text-xl font-bold"
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
          <div class="relative flex h-full max-h-[80vh] w-full items-center justify-center overflow-hidden">
            <qrcode-stream
              ref="qrStreamRef"
              @detect="onDetect"
              :constraints="{ facingMode: 'user' }"
              :formats="['qr_code']"
              :track="paintOutline"
              @init="onInit"
              @camera-error="onCameraError"
              :paused="isScannerResetting"
              class="qr-stream h-full w-full object-cover"
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
                :src="scannedEmployee?.photo_url || dswdLogoMark"
                alt="Employee Profile Photo"
                class="aspect-[2270/2479] h-auto max-w-full rounded-lg shadow"
                @error="(e) => ((e.target as HTMLImageElement).src = dswdLogoMark)"
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
                  {{ dailyLogsStore.currentScannedEmployee?.employee_id || 'N/A' }}
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

<style scoped>
::v-deep(.qr-stream video),
::v-deep(.qr-stream canvas) {
  transform: rotateY(180deg);
  transform-origin: center center;
}
</style>
