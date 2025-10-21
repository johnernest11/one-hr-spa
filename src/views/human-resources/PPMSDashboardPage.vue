<script setup lang="ts">
import { ref, watch, onMounted, type Ref, onBeforeMount } from 'vue'
import Card from 'primevue/card'
import { useGlobalUiStore } from '@/stores/ui.store.ts'
import { sleep, getManilaTodayISO } from '@/utils/helpers.ts'
import { useThemeConfig } from '@/composables/theme.ts'
import { useItemNumberStore } from '@/stores/item-number.store'
import { ItemNumberResponse, PersonnelResponse } from '@/typings/models.types'
import { usePersonnelStore } from '@/stores/personnel.store'
import PPMSDashboardReportsPage from './ppms-dashboard/PPMSDashboardReportsPage.vue'
import DonutChart from '@/components/dashboard/DonutChart.vue'

/** Date + Time Logic **/
const todayISO = ref(new Date().toISOString().slice(0, 10))
const currentDate: Ref<string> = ref('')
const currentTime: Ref<string> = ref('')
const meridiem: Ref<string> = ref('')
const seconds: Ref<string> = ref('')
const intervalId = ref<number | undefined>(undefined)

const updateDateTime = () => {
  const now = new Date()
  const optionsDate = {
    timeZone: 'Asia/Manila',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  } as const
  const optionsTime = {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  } as const

  currentDate.value = now.toLocaleDateString('en-PH', optionsDate)
  const timeString = now.toLocaleTimeString('en-PH', optionsTime)
  const [time, ampm] = timeString.split(/\s+/)
  const [hours, minutes, newSeconds] = time.split(':')

  currentTime.value = `${hours}:${minutes}`
  meridiem.value = ampm
  seconds.value = newSeconds
}

onMounted(() => {
  todayISO.value = getManilaTodayISO()
  updateDateTime()
  intervalId.value = window.setInterval(updateDateTime, 1000)
})

/****************************
  Cards Reports
  *****************************/
const itemNumberStore = useItemNumberStore()
const personnelStore = usePersonnelStore()

const statusSeries = ref<number[]>([])
const totalEmployees = ref(0)
const genderSeries = ref<number[]>([])
const filledSeries = ref<number[]>([])
const paginationLimit = 1000

onBeforeMount(async () => {
  try {
    const itemResponse = await itemNumberStore.fetchItemNumber()
    const employeeResponse = await personnelStore.fetchEmployees(paginationLimit)

    /** Filled & Unfilled positions **/
    if (itemResponse.success && Array.isArray(itemResponse.data)) {
      const itemNumbers = itemResponse.data as ItemNumberResponse[]
      const filled = itemNumbers.filter((i) => i.status === 'Filled').length
      const unfilled = itemNumbers.filter((i) => i.status === 'Unfilled').length
      filledSeries.value = [filled, unfilled]
    }

    /** Employee stats (gender + employment status) **/
    if (employeeResponse.success && Array.isArray(employeeResponse.data)) {
      const personnel = employeeResponse.data as PersonnelResponse[]

      const male = personnel.filter((p) => p.sex?.toLowerCase() === 'male').length
      const female = personnel.filter((p) => p.sex?.toLowerCase() === 'female').length
      genderSeries.value = [male, female]

      const permanent = personnel.filter((p) => p.employee?.item?.employment_status?.toLowerCase() === 'permanent').length
      const coterminous = personnel.filter((p) => p.employee?.item?.employment_status?.toLowerCase() === 'coterminous').length
      const contractual = personnel.filter((p) => p.employee?.item?.employment_status?.toLowerCase() === 'contractual').length
      const cos = personnel.filter((p) => p.employee?.item?.employment_status?.toLowerCase() === 'contract of service').length
      const jo = personnel.filter((p) => p.employee?.item?.employment_status?.toLowerCase() === 'job order').length
      statusSeries.value = [permanent, coterminous, contractual, cos, jo]
      totalEmployees.value = personnel.length
    }
  } catch (error) {
    console.error('Failed to load data:', error)
  }
})

const uiStore = useGlobalUiStore()
const mountCharts = ref(true)
watch(
  () => uiStore.sidebarMinimized,
  async (isMinimized) => {
    if (!isMinimized) {
      mountCharts.value = false
      await sleep(0.2)
      mountCharts.value = true
    }
  }
)

const { selectedTheme } = useThemeConfig()
const chartsInDarkMode = ref(selectedTheme.value?.value === 'dark')
watch(
  () => selectedTheme.value,
  (theme) => {
    chartsInDarkMode.value = theme?.value === 'dark'
  }
)
</script>

<template>
  <!-- Make full dashboard scrollable -->
  <div class="flex h-[100vh] flex-col overflow-hidden">
    <!-- Header (Fixed at top) -->
    <h1
      class="mb-4 mt-2 flex items-center justify-between text-lg font-semibold uppercase text-primary-800 dark:text-surface-400 md:mt-1"
    >
      <span class="text-4xl md:text-xl">HRPPMS DASHBOARD</span>
      <div class="flex items-center space-x-4">
        <div class="flex flex-col items-center">
          <span class="text-6xl md:text-4xl">{{ currentTime }} :{{ seconds }} {{ meridiem }}</span>
          <span class="text-2xl font-bold md:text-sm">{{ currentDate }}</span>
        </div>
      </div>
    </h1>

    <!-- Scrollable content (Cards not removed) -->
    <div v-if="mountCharts" class="flex-1 overflow-y-auto px-2 md:px-0">
      <!-- Cards -->
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <!-- Filled & Unfilled -->
        <div class="flex flex-col items-center justify-center rounded-xl bg-surface-0 p-4 shadow-md dark:bg-surface-700">
          <h2 class="mb-2 text-center text-sm font-semibold text-primary-700 dark:text-primary-100">Item Filled vs Unfilled</h2>
          <div class="h-64 w-full">
            <DonutChart
              v-if="filledSeries.length"
              :key="filledSeries.join('-')"
              :series="filledSeries"
              :labels="['Filled', 'Unfilled']"
              :colors="['#22C55E', '#EF4444']"
              :dark-mode="chartsInDarkMode"
            />
          </div>
        </div>

        <!-- Male & Female -->
        <div class="flex flex-col items-center justify-center rounded-xl bg-surface-0 p-4 shadow-md dark:bg-surface-700">
          <h2 class="mb-2 text-center text-sm font-semibold text-primary-700 dark:text-primary-100">Gender Distribution</h2>
          <DonutChart
            v-if="genderSeries.length"
            :key="genderSeries.join('-')"
            :series="genderSeries"
            :labels="['Male', 'Female']"
            :colors="['#22C55E', '#EF4444']"
            :dark-mode="chartsInDarkMode"
          />
        </div>

        <!-- Total Employees -->
        <div class="flex flex-col items-center justify-center rounded-xl bg-surface-0 p-4 shadow-md dark:bg-surface-700">
          <h2 class="mb-2 text-center text-sm font-semibold text-primary-700 dark:text-primary-100">Total Employees</h2>
          <div class="flex h-56 w-full flex-col items-center justify-center">
            <span class="text-5xl font-bold text-primary-700 dark:text-primary-100 md:text-6xl">{{ totalEmployees }}</span>
            <span class="mt-2 text-sm text-surface-500 dark:text-surface-300">Active Staff</span>
          </div>
        </div>

        <!-- HR Metrics -->
        <!-- HR Metrics -->
        <div class="flex flex-col items-center justify-center rounded-xl bg-surface-0 p-4 shadow-md dark:bg-surface-700">
          <h2 class="mb-2 text-center text-sm font-semibold text-primary-700 dark:text-primary-100">
            Employment Status Distribution
          </h2>

          <DonutChart
            v-if="statusSeries.length"
            :key="statusSeries.join('-')"
            :series="statusSeries"
            :labels="['Permanent', 'Coterminous', 'Contractual', 'Contract of Service', 'Job Order']"
            :colors="['#3b82f6', '#10b981', '#22C55E', '#EF4444', '#8b5cf6']"
            :dark-mode="chartsInDarkMode"
          />
        </div>
      </div>

      <!-- Distribution Reports -->
      <div class="mt-6 flex max-h-96 w-full gap-4">
        <Card class="h-full flex-1 border-none bg-surface-0 shadow-none dark:bg-surface-700" :pt="{ content: 'pt-0 pb-2 px-4' }">
          <template #content>
            <PPMSDashboardReportsPage />
          </template>
        </Card>
      </div>
    </div>
  </div>
</template>
