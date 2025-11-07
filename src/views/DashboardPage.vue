<script setup lang="ts">
import { computed, ref, watch, onMounted, type Ref, reactive, onBeforeMount } from 'vue'
import Card from 'primevue/card'
import Chip from 'primevue/chip'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { useGlobalUiStore } from '@/stores/ui.store.ts'
import { getLongMonthAndYear, sleep } from '@/utils/helpers.ts'
import { useThemeConfig } from '@/composables/theme.ts'
import { getManilaTodayISO } from '@/utils/helpers.ts'
import { CalendarDay, ViewDailyTimeRecordResponse } from '@/typings/models.types.ts'
import { useDailyTimeRecordsStore } from '@/stores/daily-time-record.store'
import {
  resolveDTRSlots,
  formatDTRTime,
  toTimestamp,
  normalizeDateTimestamp,
  computeUT,
  computeOT,
  computeWorkedHours,
  isWeekend,
} from '@/utils/dtr-helpers'
import { useAuthStore } from '@/stores/auth.store.ts'
import { ApiResponsePagination } from '@/typings/http-resources.types.ts'
import Paginator, { PageState } from 'primevue/paginator'
import { useAccomplishmentReportStore } from '@/stores/personnel-accomplishment-report.store'
import { useLocatorSlipStore } from '@/stores/locator-slip.store'
import WbCalendar from '@/components/webkit/WbCalendar.vue'
import HappyBirthdayGreetingPage from './misc/HappyBirthdayGreetingPage.vue'
const authStore = useAuthStore()
const accomplishmentReportStore = useAccomplishmentReportStore()
const locatorSlipsStore = useLocatorSlipStore()

/**
 *
 * Card for Current Date & Time
 *
 */
const todayISO = ref(new Date().toISOString().slice(0, 10))
const currentDate: Ref<string> = ref('')
const currentTime: Ref<string> = ref('')
const meridiem: Ref<string> = ref('')
const seconds: Ref<string> = ref('')
const intervalId = ref<number | undefined>(undefined)

const updateDateTime = () => {
  const now = new Date()
  const optionsDate = { timeZone: 'Asia/Manila', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' } as const
  const optionsTime = { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true } as const

  currentDate.value = now.toLocaleDateString('en-PH', optionsDate)
  const timeString = now.toLocaleTimeString('en-PH', optionsTime)
  const [time, ampm] = timeString.split(/\s+/)
  const [hours, minutes, newSeconds] = time.split(':')

  currentTime.value = `${hours}:${minutes}`
  meridiem.value = ampm
  seconds.value = newSeconds
}

/**
 *
 * Card for Today`s Time In & Out
 *
 */
const dailyTimeRecordsStore = useDailyTimeRecordsStore()
const allDailyTimeRecordsData = ref<ViewDailyTimeRecordResponse[]>([])
const remarksMap = reactive<Record<string, string | number>>({})
const today = new Date()
const initialYear = today.getFullYear()
const initialMonth = today.getMonth() // 0-based: Jan = 0, Dec = 11
const monthDate = ref<Date>(new Date(initialYear, initialMonth))

/*** Fetch Daily Time Records for the selected month ***/
const normalizeTimeKey = (dtrTimeLogs: string, date: Date | string | null) =>
  `${dtrTimeLogs}-${date ? new Date(date).toISOString().slice(0, 10) : 'no-date'}`
const fetchTodayDTR = async () => {
  const response = await dailyTimeRecordsStore.fetchDailyTimeRecordsByMonth(monthDate.value)
  if (response && response.success && Array.isArray(response.data)) {
    allDailyTimeRecordsData.value = dailyTimeRecordsStore.viewDailyTimeRecords

    allDailyTimeRecordsData.value.forEach((dtr) => {
      if (dtr.date && dtr.time_log) {
        const dtrTimeLogs = resolveDTRSlots(dtr.time_log)
        Object.entries(dtrTimeLogs).forEach(([slot, value]) => {
          const key = normalizeTimeKey(slot, dtr.date)
          if (!(key in remarksMap)) {
            if (value && typeof value === 'object' && 'date' in value && 'scanned_time' in value) {
              remarksMap[key] = formatDTRTime(toTimestamp(value.date, value.scanned_time))
            }
          }
        })
      }
    })
  }
}
/*** Computed helpers for selected month/year ***/
const selectedYear = computed(() => monthDate.value.getFullYear())
const selectedMonth = computed(() => monthDate.value.getMonth())
const selectedMonthName = computed(() => monthDate.value.toLocaleString('default', { month: 'long' }))
const fromDate = ref<Date | null>(null)
const toDate = ref<Date | null>(null)

/*** Main computed calendarDays list ***/
const calendarDays = computed<CalendarDay[]>(() => {
  if (!allDailyTimeRecordsData.value) return []

  const year = selectedYear.value
  const month = selectedMonth.value
  const today = new Date()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Filter DTRs for the selected month and year
  const filteredDtrData = allDailyTimeRecordsData.value.filter((record) => {
    const recordDate = new Date(record.date)
    return recordDate.getFullYear() === year && recordDate.getMonth() === month
  })

  const days: CalendarDay[] = []

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    const dtr = filteredDtrData.find((record) => new Date(record.date).getDate() === d)
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    const isPresent = dtr && dtr.time_log && dtr.time_log.length > 0
    const isFuture = year === today.getFullYear() && month === today.getMonth() && date > today

    days.push({
      date,
      day: d,
      timeLog: dtr?.time_log || null,
      status: isFuture ? undefined : isPresent ? 'Present' : isWeekend ? 'Weekend' : 'Absent',
      isWeekend,
      dayOfWeek: date.getDay(),
      dtrRecord: dtr ?? null,
    })
  }

  // Align first day of the week
  const firstDay = new Date(year, month, 1).getDay()
  const emptySlots = (firstDay + 6) % 7
  for (let i = 0; i < emptySlots; i++) {
    days.unshift({ empty: true })
  }

  return days
})
/*** Initialize Today`s DTR Time Logs data. ***/
const todayDTR = computed(() => {
  const today = new Date()
  const ts = normalizeDateTimestamp(today)!

  const filtered = allDailyTimeRecordsData.value.filter((r) => {
    const rTs = normalizeDateTimestamp(r.date)!
    if (fromDate.value && rTs < normalizeDateTimestamp(fromDate.value)!) return false
    if (toDate.value && rTs > normalizeDateTimestamp(toDate.value)!) return false
    return true
  })

  const row = filtered.find((r) => normalizeDateTimestamp(r.date) === ts) ?? null
  const is_missing = row ? '' : 'Missing'

  return { date: today, row, is_missing }
})

const computeUTValue = (item: { is_missing: string; date: Date; row: ViewDailyTimeRecordResponse | null }) => {
  if (!item.row) return '-'
  return computeUT(computeWorkedHours(item.row.time_log ?? []), isWeekend(item.row.date))
}

const computeOTValue = (item: { is_missing: string; date: Date; row: ViewDailyTimeRecordResponse | null }) => {
  if (!item.row) return '-'
  return computeOT(computeWorkedHours(item.row.time_log ?? []), isWeekend(item.row.date))
}

/*** Initialize DTR data for current month. ***/
onMounted(async () => {
  // Initialize today's date and start live clock
  const today = getManilaTodayISO()
  todayISO.value = today
  updateDateTime()
  intervalId.value = window.setInterval(updateDateTime, 1000)

  // Fetch today's DTR
  await fetchTodayDTR()
})

// Always show the logged-in user's name in the profile button
const fullName = computed(() => {
  const user = authStore.authenticatedUser?.user_profile?.individual_basic_detail
  if (!user) return ''
  const initials = [user.first_name, user.middle_name, user.last_name, user.ext_name].filter(Boolean).join(' ')

  return initials
})

/** Computed Birthday */
const isMyBirthday = computed(() => {
  const dateStr = authStore.authenticatedUser?.user_profile?.individual_basic_detail?.birthday
  if (!dateStr) return false // return boolean, not string

  const date = new Date(dateStr)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const birthMonthDay = `${month}-${day}`

  const today = new Date()
  const todayMonthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return birthMonthDay === todayMonthDay
})

/** Computed property to get greeting based on time */
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good Morning!'
  if (hour >= 12 && hour < 17) return 'Good Afternoon!'
  if (hour >= 17 && hour < 21) return 'Good Evening!'
  return 'Good Night'
})

/** We Force Update the page to eliminate the delay when hiding the sidebar in desktop view*/
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

/** Handle Dark Mode */
const { selectedTheme } = useThemeConfig()
const chartsInDarkMode = ref(selectedTheme.value?.value === 'dark')
watch(
  () => selectedTheme.value,
  (theme) => {
    if (theme?.value === 'dark') {
      return (chartsInDarkMode.value = true)
    }

    chartsInDarkMode.value = false
  }
)

/**
 *
 * Cards for Accomplishment Report.
 *
 */
const accomplishmentReportIsLoading = ref(false)
const paginationLimit = 5
const pagination = ref<ApiResponsePagination | null>(null)

const fetchAccomplishmentsBasedOnContext = async (page = 1) => {
  accomplishmentReportIsLoading.value = true
  const response = await accomplishmentReportStore.fetchAccomplishment(paginationLimit, page)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  accomplishmentReportIsLoading.value = false
}

const handlePaginationPageChange = async (event: PageState) => {
  await fetchAccomplishmentsBasedOnContext(event.page + 1)
}

const locatorSlipsIsLoading = ref(false)
const fetchData = async () => {
  locatorSlipsIsLoading.value = true

  const response = await locatorSlipsStore.fetchLocatorSlip(paginationLimit)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }

  locatorSlipsIsLoading.value = false
}

/**
 * This hook runs before the component is mounted.
 */
onBeforeMount(async () => {
  await fetchData()

  accomplishmentReportIsLoading.value = true
  const response = await accomplishmentReportStore.fetchAccomplishment(paginationLimit)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  accomplishmentReportIsLoading.value = false

  await fetchAccomplishmentsBasedOnContext()
})
</script>

<template>
  <div v-if="mountCharts" class="mx-auto h-[100%] w-[100%] px-2 md:px-0">
    <!-- Start Dashboard DTR -->
    <h1
      class="mb-4 mt-2 flex items-center justify-between text-lg font-semibold uppercase text-primary-800 dark:text-surface-400 md:mt-1"
    >
      <!-- Right: Birthday Greeting + Full Name -->
      <HappyBirthdayGreetingPage :birthday="isMyBirthday ?? ''" />
      <span v-if="!isMyBirthday" class="text-4xl md:text-xl">{{ greeting }} {{ fullName }}</span>

      <span v-else class="mt-2 animate-bounce text-2xl text-primary-900 dark:text-primary-400">
        🎉 Happy Birthday, {{ fullName }}! 🎂
      </span>
      <!-- Left: Current Time -->
      <div class="flex items-center space-x-4">
        <!-- Time Clock -->
        <div class="flex flex-col items-center">
          <span class="text-6xl md:text-4xl">{{ currentTime }} :{{ seconds }} {{ meridiem }}</span>
          <span class="text-2xl font-bold md:text-sm">{{ currentDate }}</span>
        </div>
      </div>
    </h1>

    <!-- Start Monthly Attandence Calendar -->
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card class="col-span-2 h-full pt-0" :pt="{ content: 'pt-0 pb-2 px-4' }">
        <template #content>
          <div class="w-full text-left">
            <!-- Month Name -->
            <!-- Month Name -->
            <div class="mb-2 flex items-center justify-between">
              <!-- Left side: text -->
              <div class="text-2xl text-primary-700">Attendance for {{ selectedMonthName }} {{ selectedYear }}</div>

              <!-- Right side: calendar -->
              <div class="text-2xl text-primary-700">
                <WbCalendar
                  v-model="monthDate"
                  dateFormat="MM yy"
                  :maxDate="new Date()"
                  view="month"
                  label="Filter Month"
                  showIcon
                  iconClass="!text-3xl !p-3 !text-primary-700 hover:!text-primary-900"
                  class="w-2 border-0 bg-transparent p-0"
                />
              </div>
            </div>

            <!-- Weekday headers -->
            <div class="grid grid-cols-7 gap-2 text-center font-semibold text-surface-700">
              <div v-for="wd in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']" :key="wd">{{ wd }}</div>
            </div>

            <!-- Calendar days -->
            <div class="mt-2 grid grid-cols-7 gap-2">
              <div
                v-for="day in calendarDays"
                :key="day.date?.toISOString() || Math.random()"
                class="flex flex-col items-center rounded-md border p-2"
                :class="{
                  'bg-success-100': day.status === 'Present',
                  'bg-error-100': day.status === 'Absent',
                  'bg-warn-100': day.status === 'Weekend',
                  'bg-primary-100': day.status === undefined,
                  invisible: day.empty,
                }"
              >
                <span class="text-sm font-semibold text-surface-700">{{ day.day }}</span>
                <span class="text-xs font-medium">{{ day.status }}</span>
                <template v-if="day.timeLog">
                  <span class="text-xs text-surface-600">
                    {{
                      (() => {
                        const slots = resolveDTRSlots(day.timeLog)
                        if (slots.in1 && slots.out2) {
                          return `${formatDTRTime(toTimestamp(slots.in1.date, slots.in1.scanned_time))} - ${formatDTRTime(toTimestamp(slots.out2.date, slots.out2.scanned_time))}`
                        }
                        return ''
                      })()
                    }}
                  </span>
                </template>
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- Start Today`s Time Log -->
      <Card class="h-full pt-0" :pt="{ content: 'pt-0 pb-2 px-4' }">
        <template #content>
          <div class="w-full p-2 text-left">
            <div class="mb-4 text-2xl text-primary-700">Today's Time Log</div>

            <div class="flex flex-col gap-4 px-4 py-4">
              <!-- AM IN -->
              <div class="flex w-full justify-between border-b pb-2">
                <p class="text-xl font-semibold text-primary-800">AM IN:</p>
                <p v-if="todayDTR.row && resolveDTRSlots(todayDTR.row.time_log ?? []).in1" class="text-3xl text-surface-600">
                  {{
                    formatDTRTime(
                      toTimestamp(
                        resolveDTRSlots(todayDTR.row.time_log ?? []).in1!.date,
                        resolveDTRSlots(todayDTR.row.time_log ?? []).in1!.scanned_time
                      )
                    )
                  }}
                </p>
              </div>

              <!-- AM OUT -->
              <div class="flex w-full justify-between border-b pb-2">
                <p class="text-xl font-semibold text-primary-800">AM OUT:</p>
                <p v-if="todayDTR.row && resolveDTRSlots(todayDTR.row.time_log ?? []).out1" class="text-3xl text-surface-600">
                  {{
                    formatDTRTime(
                      toTimestamp(
                        resolveDTRSlots(todayDTR.row.time_log ?? []).out1!.date,
                        resolveDTRSlots(todayDTR.row.time_log ?? []).out1!.scanned_time
                      )
                    )
                  }}
                </p>
              </div>

              <!-- PM IN -->
              <div class="flex w-full justify-between border-b pb-2">
                <p class="text-xl font-semibold text-primary-800">PM IN:</p>
                <p v-if="todayDTR.row && resolveDTRSlots(todayDTR.row.time_log ?? []).in2" class="text-3xl text-surface-600">
                  {{
                    formatDTRTime(
                      toTimestamp(
                        resolveDTRSlots(todayDTR.row.time_log ?? []).in2!.date,
                        resolveDTRSlots(todayDTR.row.time_log ?? []).in2!.scanned_time
                      )
                    )
                  }}
                </p>
              </div>

              <!-- PM OUT -->
              <div class="flex w-full justify-between border-b pb-2">
                <p class="text-xl font-semibold text-primary-800">PM OUT:</p>

                <p v-if="todayDTR.row && resolveDTRSlots(todayDTR.row.time_log ?? []).out2" class="text-3xl text-surface-600">
                  {{
                    formatDTRTime(
                      toTimestamp(
                        resolveDTRSlots(todayDTR.row.time_log ?? []).out2!.date,
                        resolveDTRSlots(todayDTR.row.time_log ?? []).out2!.scanned_time
                      )
                    )
                  }}
                </p>
              </div>

              <!-- Undertime -->
              <div class="flex w-full justify-between border-b pb-2">
                <span class="text-xl font-semibold text-primary-800">UT:</span>
                <span class="text-3xl text-error-600">{{ computeUTValue(todayDTR) }}</span>
              </div>

              <!-- Overtime -->
              <div class="flex w-full justify-between border-b pb-2">
                <span class="text-xl font-semibold text-primary-800">OT:</span>
                <span class="text-3xl text-success-600">{{ computeOTValue(todayDTR) }}</span>
              </div>
            </div>
          </div>
        </template>
      </Card>
      <!-- End Today`s Time Log -->
    </div>
    <!-- End Monthly Attandence Calendar -->

    <!-- Start Dashboard Report -->
    <div class="mt-4 flex max-h-96 w-full gap-4">
      <!-- Start Accomplishment Report -->
      <Card class="h-full flex-1" :pt="{ content: 'pt-0 pb-2 px-4' }">
        <template #content>
          <div>
            <div class="h-full w-full rounded-md bg-surface-0 p-2">
              <!-- Router Link -->
              <RouterLink
                :to="{ name: 'accomplishment-reports' }"
                class="mb-2 mr-4 cursor-pointer whitespace-nowrap text-xl text-surface-600 hover:text-primary-700 hover:underline dark:text-primary-100 md:text-xl lg:text-4xl"
              >
                Accomplishment Reports
              </RouterLink>

              <!-- End Filter Create & Search Accomplishment Report Button -->
              <!-- Start Data Table (Conditional Rendering) -->
              <div class="mt-6 flex flex-col">
                <!-- Show Table if tableData has items -->
                <div
                  v-if="accomplishmentReportStore.accomplishment && accomplishmentReportStore.accomplishment.length > 0"
                  class="mx-auto flex h-full w-full flex-col"
                >
                  <DataTable
                    :value="accomplishmentReportStore.accomplishment"
                    :loading="accomplishmentReportIsLoading"
                    class="mt-6"
                    dataKey="id"
                  >
                    <Column
                      field="period"
                      header="Accomplishment Period"
                      headerClass="w-64 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
                    >
                      <template #body="props">
                        <p class="font-semibold uppercase text-surface-600">{{ props.data.period }}</p>
                      </template>
                    </Column>
                    <Column
                      field="status"
                      header="Status"
                      headerClass="w-64 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
                    >
                      <template #body="props">
                        <template v-if="props.data.status === 'draft'">
                          <Chip
                            label="Draft"
                            class="flex items-center justify-center !bg-surface-500 px-4 py-1 font-semibold !text-surface-0"
                          >
                          </Chip>
                        </template>
                        <template v-else-if="props.data.status === 'done'">
                          <Chip
                            label="For Review"
                            class="flex items-center justify-center !bg-success-800 px-4 py-1 font-semibold !text-surface-0"
                          />
                        </template>
                        <template v-else-if="props.data.status === 'for revision'">
                          <Chip
                            label="For Revision"
                            class="flex items-center justify-center !bg-warn-800 px-4 py-1 font-semibold !text-surface-0"
                          />
                        </template>
                        <template v-else-if="props.data.status === 'approved'">
                          <Chip
                            label="Approved"
                            class="flex items-center justify-center !bg-info-800 px-4 py-1 font-semibold !text-surface-0"
                          />
                        </template>
                      </template>
                    </Column>
                  </DataTable>
                  <!-- Start Pagination -->
                  <div class="mt-6 flex w-full justify-center md:mt-10">
                    <Paginator
                      v-if="pagination && pagination.total > 0"
                      :rows="pagination.per_page"
                      :total-records="pagination.total"
                      template="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
                      currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
                      @page="(event: PageState) => handlePaginationPageChange(event)"
                      class="text-s md:text-sm"
                      :pt="{ pageButton: {} }"
                    />
                  </div>
                  <!-- End Pagination -->
                </div>
              </div>
            </div>
          </div>
        </template>
      </Card>
      <!-- End Accomplishment Report -->
      <!-- Start Locator Slip -->
      <Card class="h-full flex-1" :pt="{ content: 'pt-0 pb-2 px-4' }">
        <template #content>
          <div class="h-full w-full rounded-md bg-surface-0 p-2">
            <!-- Router Link -->
            <RouterLink
              :to="{ name: 'my-locator-slips' }"
              class="mb-2 mr-4 cursor-pointer whitespace-nowrap text-xl text-surface-600 hover:text-primary-700 hover:underline dark:text-primary-100 md:text-xl lg:text-4xl"
            >
              Locator Slip
            </RouterLink>
            <!-- Start Data Table (Conditional Rendering) -->
            <div class="mt-6 flex flex-col">
              <div
                v-if="locatorSlipsStore.locatorSlip && locatorSlipsStore.locatorSlip.length > 0 && !locatorSlipsIsLoading"
                class="mx-auto flex h-full w-full flex-col"
              >
                <DataTable :value="locatorSlipsStore.locatorSlip" :loading="locatorSlipsIsLoading" class="mt-6" dataKey="id">
                  <Column
                    field="form_type"
                    header="Locator Slip"
                    headerClass="w-1/3 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
                  >
                    <template #body="props">
                      <p class="font-semibold uppercase text-surface-600">
                        Locator Slip Form
                        {{ props.data.form_type }}
                      </p>
                      <p v-if="props.data.form_type === 'c'" class="font-semibold uppercase text-success-600">
                        LS No: {{ props.data.locator_slip_no }}
                      </p>
                    </template>
                  </Column>
                  <Column
                    field="period"
                    header="Period"
                    headerClass=" w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
                  >
                    <template #body="props">
                      <p class="uppercase text-surface-600">
                        {{ props.data.period }}
                        {{ getLongMonthAndYear(props.data.date) }}
                      </p>
                    </template>
                  </Column>
                </DataTable>
              </div>

              <div class="mt-6 flex w-full justify-center md:mt-10">
                <Paginator
                  v-if="pagination && pagination.total > 0"
                  :rows="pagination.per_page"
                  :total-records="pagination.total"
                  template="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
                  currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
                  @page="(event: PageState) => handlePaginationPageChange(event)"
                  class="text-s md:text-sm"
                  :pt="{ pageButton: {} }"
                />
              </div>
            </div>
          </div>
        </template>
      </Card>
      <!-- End Locator Slip -->
    </div>
    <!-- End Dashboard Report -->
  </div>
</template>
