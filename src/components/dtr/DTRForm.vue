<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { ViewDailyTimeRecordResponse } from '@/typings/models.types.ts'
import { useDailyTimeRecordsStore } from '@/stores/daily-time-record.store'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import WbCalendar from '@/components/webkit/WbCalendar.vue'
import WbInputText from '@/components/webkit/WbInputText.vue'
import WbTextArea from '@/components/webkit/WbTextArea.vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import { useToast } from 'primevue/usetoast'
import {
  formatDTRTime,
  getDTRDayOfWeek,
  getFormattedDTRDate,
  toTimestamp,
  computeOT,
  computeUT,
  computeWorkedHours,
  isWeekend,
  resolveDTRSlots,
} from '@/utils/dtr-helpers'
const dailyTimeRecordsStore = useDailyTimeRecordsStore()
const toast = useToast()
const isLoading = ref(true)
const selectedTimeLogId = ref<number[]>([])
const allDailyTimeRecordsData = ref<ViewDailyTimeRecordResponse[]>([])
const fromDate = ref<Date | null>(null)
const toDate = ref<Date | null>(null)
const monthDate = ref<Date>(new Date())
const remarksMap = ref<Record<string, string>>({})
const activeIndices = ref<number[]>([])
const toggleAccordion = (index: number) => {
  if (activeIndices.value.includes(index)) {
    activeIndices.value = activeIndices.value.filter((i) => i !== index)
  } else {
    activeIndices.value.push(index)
  }
}

const onAccordionClick = (item: { is_missing: string; date: Date; row: ViewDailyTimeRecordResponse | null }, index: number) => {
  const slots = resolveDTRSlots(item.row?.time_log ?? [])
  const hasMissing = Object.values(slots).some((value) => value === '')
  const hasEnoughEntries = (item.row?.time_log?.length ?? 0) >= 4

  if (!hasMissing && hasEnoughEntries) {
    toggleAccordion(index)
  }
}

// Add selectRequest function to handle log selection
const selectRequest = (id: number) => {
  if (selectedTimeLogId.value.includes(id)) {
    selectedTimeLogId.value = selectedTimeLogId.value.filter((logId) => logId !== id)
  } else {
    selectedTimeLogId.value.push(id)
  }
}

// Dummy implementation for isRequestSelected; update logic as needed

const isRequestSelected = (id: number): boolean => selectedTimeLogId.value.includes(id)
onMounted(async () => {
  await handleViewDtr()
  isLoading.value = false
})

const handleViewDtr = async () => {
  try {
    const response = await dailyTimeRecordsStore.fetchDailyTimeRecordsByMonth(monthDate.value)
    if (response && response.success && Array.isArray(response.data)) {
      allDailyTimeRecordsData.value = dailyTimeRecordsStore.viewDailyTimeRecords
    }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    toast.add({
      severity: 'error',
      summary: 'Cannot view daily time records.',
      detail: errorMessage + ' Please contact an administrator to fix this.',
      life: 5000,
    })
    console.log('Encountered error while attempting to fetch time logs. ', e)
  }
}

// Define month/year props with defaults
const props = withDefaults(
  defineProps<{
    year?: number
    month?: number
  }>(),
  {
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  }
)
const filterYear = ref(props.year!)
const filterMonth = ref(props.month!)

watch([fromDate, toDate], ([from, to]) => {
  // Prefer the 'from' date to set the calendar's month view
  const refDate = from || to
  if (refDate) {
    filterYear.value = refDate.getFullYear()
    filterMonth.value = refDate.getMonth()
  } else {
    filterYear.value = props.year!
    filterMonth.value = props.month!
  }
})

watch(
  () => monthDate.value,
  async (newValue) => {
    console.log('month and date', monthDate)
    // Prefer the 'from' date to set the calendar's month view
    if (newValue) {
      filterYear.value = newValue.getFullYear()
      filterMonth.value = newValue.getMonth()
      isLoading.value = true
      await handleViewDtr()
      isLoading.value = false
    } else {
      filterYear.value = props.year!
      filterMonth.value = props.month!
    }
  }
)

const minMaxTs = computed<{ min: number; max: number } | null>(() => {
  const tsList = filteredDTRs.value.map((r) => normalizeDateTimestamp(r.date)!).sort((a, b) => a - b)
  return tsList.length ? { min: tsList[0], max: tsList[tsList.length - 1] } : null
})

const normalizeDateTimestamp = (d: string | Date | null): number | null => {
  if (!d) return null
  const dt = new Date(d)
  dt.setHours(0, 0, 0, 0)
  return dt.getTime()
}

const filteredDTRs = computed(() => {
  const fromTs = normalizeDateTimestamp(fromDate.value)
  const toTs = normalizeDateTimestamp(toDate.value)

  return allDailyTimeRecordsData.value.filter((r) => {
    const rTs = normalizeDateTimestamp(r.date)!
    if (fromTs !== null && rTs < fromTs) return false
    if (toTs !== null && rTs > toTs) return false
    return true
  })
})

const daysInMonth = computed(() => new Date(filterYear.value, filterMonth.value + 1, 0).getDate())

const monthDates = computed(() => {
  const range = minMaxTs.value
  const daysTotal = daysInMonth.value
  const arr: { is_missing: string; date: Date; row: ViewDailyTimeRecordResponse | null }[] = []

  for (let d = 1; d <= daysTotal; d++) {
    const dt = new Date(filterYear.value, filterMonth.value, d)
    const ts = normalizeDateTimestamp(dt)!

    const inRange = range ? ts >= range.min && ts <= range.max : true

    const row = inRange ? filteredDTRs.value.find((r) => normalizeDateTimestamp(r.date) === ts) ?? null : null
    const is_missing = row ? '' : 'Missing'

    arr.push({ is_missing, date: dt, row })
  }

  return arr
})
</script>

<template>
  <div class="flex h-full w-full flex-col">
    <Card class="h-full shadow-none">
      <template #content>
        <div class="flex w-full flex-col items-start md:flex-row">
          <Button
            icon="pi pi-angle-left"
            severity="secondary"
            aria-label="Bookmark"
            rounded
            @click="$router.go(-1)"
            size="small"
            class="mb-2 ml-4 md:mb-0 md:ml-0"
          />
          <h2 class="mb-2 ml-4 text-3xl text-surface-600 dark:text-primary-100 md:ml-4">
            <font-awesome-icon :icon="['fas', 'calendar']" class="h-5 text-surface-600 sm:h-6 md:h-7" />
            My Daily Time Record (DTR)
          </h2>
        </div>

        <!-- Button Actions Section -->
        <div class="flex flex-col gap-2 px-4 md:flex-row md:items-center md:justify-between">
          <!-- Placeholder for filters or extra info -->
          <div class="w-full md:w-2/3 lg:w-1/2"></div>

          <!-- Export & Navigation Buttons -->
          <div class="flex w-full flex-col gap-4 md:w-auto md:flex-row md:justify-end">
            <RouterLink :to="{ name: 'my-dtrs/list' }" class="w-full md:w-auto">
              <Button
                label="Show All DTRs"
                class="dark:text-secondary-100 w-full border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
                text
              >
                <template #icon>
                  <i class="pi pi-file-word mr-2"></i>
                </template>
              </Button>
            </RouterLink>
          </div>
        </div>
        <br />
        <div class="mb-12 grid grid-cols-1 gap-x-12 gap-y-4 px-4 md:grid-cols-2">
          <WbCalendar
            v-model="monthDate"
            dateFormat="MM yy"
            :maxDate="new Date()"
            required
            label="Month"
            label-class="text-md text-surface-600 dark:lg:text-surface-200"
            view="month"
          />
        </div>

        <div id="dtr_table" class="relative">
          <!-- Spinner -->
          <div v-if="isLoading" class="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm">
            <span class="h-8 w-8 animate-spin rounded-full border-4 border-surface-600 border-t-transparent"></span>
          </div>
          <div v-else-if="!isLoading">
            <!-- Header: visible only on md and up -->
            <div class="hidden grid-cols-5 gap-2 border-b-2 bg-surface-100 px-4 py-4 md:grid md:px-24">
              <div class="text-center text-sm font-semibold text-surface-500">WORKING</div>
              <div class="text-center text-sm font-semibold text-surface-500">AM</div>
              <div class="text-center text-sm font-semibold text-surface-500">PM</div>
              <div class="text-center text-sm font-semibold text-surface-500">HOURS</div>
              <div class="text-center text-sm font-semibold text-surface-500">REMARKS</div>
            </div>
            <div class="hidden grid-cols-9 gap-2 border-b-2 bg-surface-100 px-4 py-4 md:grid md:px-24">
              <div class="text-start text-sm font-semibold text-surface-500">Date</div>
              <div class="text-start text-sm font-semibold text-surface-500">Days</div>
              <div class="text-start text-sm font-semibold text-surface-500">IN 1</div>
              <div class="text-start text-sm font-semibold text-surface-500">OUT 1</div>
              <div class="text-start text-sm font-semibold text-surface-500">IN 2</div>
              <div class="text-start text-sm font-semibold text-surface-500">OUT 2</div>
              <div class="text-start text-sm font-semibold text-surface-500">UT</div>
              <div class="text-start text-sm font-semibold text-surface-500">OT</div>
              <div class="text-start text-sm font-semibold text-surface-500"></div>
            </div>

            <!-- Data row -->
            <div
              v-for="(item, index) in monthDates"
              :key="item.date.getTime()"
              class="grid grid-cols-1 items-center gap-y-2 border-b border-surface-300 px-4 py-2 md:grid-cols-9 md:gap-2 md:px-24"
            >
              <div>
                <p class="text-xs font-semibold text-surface-500 md:hidden">Date</p>
                <!-- Show badge if there's missing entries -->
                <span
                  v-if="item.row && Object.values(resolveDTRSlots(item.row?.time_log ?? [])).some((value) => value === '')"
                  class="text-warm-900 rounded bg-yellow-200 px-2 py-1 text-xs"
                >
                  Missing entries
                </span>

                <!-- Date text -->
                <p
                  class="text-base text-surface-600"
                  :class="{
                    'cursor-pointer text-error-900':
                      item.row && Object.values(resolveDTRSlots(item.row?.time_log ?? [])).some((value) => value === ''),
                  }"
                  @click="onAccordionClick(item, index)"
                >
                  {{ getFormattedDTRDate(item.date.toISOString()) }}
                </p>

                <!-- Show details if active -->
                <div v-if="item.row && activeIndices.includes(index)">
                  <!-- Detailed info: list of time logs -->
                  <div class="relative w-full p-2">
                    <div class="relative w-full p-2">
                      <div class="mt-2">
                        <div
                          v-for="(log, logIDx) in item.row?.time_log"
                          :key="log.id"
                          class="mb-1 flex cursor-pointer flex-row items-center gap-2"
                          :class="{ '!bg-surface-0 !text-black': isRequestSelected(log.id) }"
                          @click="selectRequest(log.id)"
                        >
                          <span class="mb-2 text-xs font-semibold text-surface-500">#{{ logIDx + 1 }}.</span>
                          <p class="absolute right-2 mb-2 text-base !text-surface-600 sm:right-2">
                            {{ formatDTRTime(toTimestamp(log.date, log.scanned_time)) }}
                            <font-awesome-icon
                              :icon="isRequestSelected(log.id) ? ['fas', 'check-square'] : ['fas', 'square-full']"
                              :class="{
                                'text-primary-600': isRequestSelected(log.id),
                                'border border-surface-300 text-base text-gray-50': !isRequestSelected(log.id),
                              }"
                            />
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <p class="text-xs font-semibold text-surface-500 md:hidden">Day</p>
                <p class="text-base text-surface-600">{{ getDTRDayOfWeek(item.date.toISOString()) }}</p>
              </div>

              <!-- IN 1 -->
              <div>
                <p class="text-xs font-semibold text-surface-500 md:hidden">IN 1</p>
                <p v-if="item.row && resolveDTRSlots(item.row.time_log ?? []).in1" class="text-base text-surface-600">
                  {{ item.row ? formatDTRTime(resolveDTRSlots(item.row.time_log ?? []).in1) : '' }}
                </p>
                <WbInputText
                  v-else-if="item.row && item.row.time_log?.length && !resolveDTRSlots(item.row.time_log).in1"
                  label=""
                  v-model="remarksMap[`out2-${item.date.toISOString()}`]"
                  placeholder="Missing"
                  class="h-8 md:h-8 md:w-24"
                />
              </div>

              <!-- OUT 1 -->
              <div>
                <p class="text-xs font-semibold text-surface-500 md:hidden">OUT 1</p>
                <p v-if="item.row && resolveDTRSlots(item.row.time_log ?? []).out1" class="text-base text-surface-600">
                  {{ item.row ? formatDTRTime(resolveDTRSlots(item.row.time_log ?? []).out1) : '' }}
                </p>
                <WbInputText
                  v-else-if="item.row && item.row.time_log?.length && !resolveDTRSlots(item.row.time_log).out1"
                  label=""
                  v-model="remarksMap[`out2-${item.date.toISOString()}`]"
                  placeholder="Missing"
                  class="h-8 md:h-8 md:w-24"
                />
              </div>

              <!-- IN 2 -->
              <div>
                <p class="text-xs font-semibold text-surface-500 md:hidden">IN 2</p>
                <p v-if="item.row && resolveDTRSlots(item.row.time_log ?? []).in2" class="text-base text-surface-600">
                  {{ item.row ? formatDTRTime(resolveDTRSlots(item.row.time_log ?? []).in2) : '' }}
                </p>
                <WbInputText
                  v-else-if="item.row && item.row.time_log?.length && !resolveDTRSlots(item.row.time_log).in2"
                  label=""
                  v-model="remarksMap[`out2-${item.date.toISOString()}`]"
                  placeholder="Missing"
                  class="h-8 md:h-8 md:w-24"
                />
              </div>

              <!-- OUT 2 -->
              <div>
                <p class="text-xs font-semibold text-surface-500 md:hidden">OUT 2</p>
                <p v-if="item.row && resolveDTRSlots(item.row.time_log ?? []).out2" class="text-base text-surface-600">
                  {{ formatDTRTime(resolveDTRSlots(item.row.time_log ?? []).out2) }}
                </p>
                <WbInputText
                  v-else-if="item.row && item.row.time_log?.length && !resolveDTRSlots(item.row.time_log).out2"
                  label=""
                  v-model="remarksMap[`out2-${item.date.toISOString()}`]"
                  placeholder="Missing"
                  class="h-8 md:h-8 md:w-24"
                />
              </div>

              <!-- UT, OT, Remarks -->
              <div>
                <p class="text-xs font-semibold text-surface-500 md:hidden">UT</p>
                <p class="text-base text-surface-600">
                  {{ item.row ? computeUT(computeWorkedHours(item.row.time_log ?? []), isWeekend(item.row.date)) : '' }}
                </p>
              </div>

              <div>
                <p class="text-xs font-semibold text-surface-500 md:hidden">OT</p>
                <p class="text-base text-surface-600">
                  {{ item.row ? computeOT(computeWorkedHours(item.row.time_log ?? []), isWeekend(item.row.date)) : '' }}
                </p>
              </div>
              <div>
                <p class="text-xs font-semibold text-surface-500 md:hidden">Remarks</p>
                <WbTextArea
                  v-model="item.is_missing"
                  v-if="item.row && (item.row.time_log?.length ?? 0) <= 4 && resolveDTRSlots(item.row.time_log ?? [])"
                  label=""
                  class="h-8 md:h-8 md:w-48"
                  placeholder="Enter remarks"
                />
              </div>
            </div>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>
