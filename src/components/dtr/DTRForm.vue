<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { DailyTimeRecordResponse } from '@/typings/models.types.ts'
import { useDailyTimeRecordsStore } from '@/stores/daily-time-record.store'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { formatDTRTime, getDTRDayOfWeek, getFormattedDTRDate, resolveDTRSlots } from '@/utils/helpers'
import WbCalendar from '@/components/webkit/WbCalendar.vue'
import WbInputText from '@/components/webkit/WbInputText.vue'
import WbTextArea from '@/components/webkit/WbTextArea.vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
const dailyTimeRecordsStore = useDailyTimeRecordsStore()
const isLoading = ref(true)
const selectedTimeLogId = ref<number[]>([])
const allDailyTimeRecordsData = ref<DailyTimeRecordResponse[]>([])
const fromDate = ref<Date | null>(null)
const toDate = ref<Date | null>(null)
const remarksMap = ref<Record<string, string>>({})
const activeIndices = ref<number[]>([])
const toggleAccordion = (index: number) => {
  if (activeIndices.value.includes(index)) {
    activeIndices.value = activeIndices.value.filter((i) => i !== index)
  } else {
    activeIndices.value.push(index)
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
  const response = await dailyTimeRecordsStore.fetchDailyTimeRecords()
  if (response && response.success && Array.isArray(response.data)) {
    allDailyTimeRecordsData.value = response.data
  }
  isLoading.value = false
})
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
  const arr: { is_missing: string; date: Date; row: DailyTimeRecordResponse | null }[] = []

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
  <div class="flex h-full w-full flex-col shadow-md">
    <Card class="h-full">
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
            v-model="fromDate"
            dateFormat="yy-mm-dd"
            :maxDate="new Date()"
            required
            label="From"
            label-class="text-md text-surface-600 dark:lg:text-surface-200"
          />
          <WbCalendar
            v-model="toDate"
            dateFormat="yy-mm-dd"
            :maxDate="new Date()"
            required
            label="To"
            label-class="text-md text-surface-600 dark:lg:text-surface-200"
          />
        </div>

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
          class="grid grid-cols-1 gap-y-2 border-b border-surface-300 px-4 py-2 md:grid-cols-9 md:gap-2 md:px-24"
        >
          <div>
            <p class="text-xs font-semibold text-surface-500 md:hidden">Date</p>
            <!-- Show badge if multiple logs -->
            <span
              v-if="item.row && (item.row.warm_bodies?.length ?? 0) >= 5"
              class="text-warm-900 rounded bg-yellow-200 px-2 py-1 text-xs"
            >
              Multiple time log
            </span>
            <p
              class="text-base text-surface-600"
              :class="{
                'cursor-pointer': item.row && (item.row.warm_bodies?.length ?? 0) >= 5,
                'text-error-900': item.row && (item.row.warm_bodies?.length ?? 0) >= 5,
              }"
              @click="
                () => {
                  if (item.row && (item.row.warm_bodies?.length ?? 0) >= 4) {
                    toggleAccordion(index)
                  }
                }
              "
            >
              {{ getFormattedDTRDate(item.date.toISOString()) }}
            </p>

            <!-- Show details if active -->
            <div v-if="item.row && (item.row.warm_bodies?.length ?? 0) >= 5 && activeIndices.includes(index)">
              <!-- Your detailed info here instead of inside an Accordion -->
              <div class="relative w-full p-2">
                <!-- Detailed info: list of warm_bodies logs -->
                <div class="relative w-full p-2">
                  <!-- List of warm_bodies logs -->
                  <div class="mt-2">
                    <div
                      v-for="(log, logIDx) in item.row.warm_bodies"
                      :key="log.id"
                      class="mb-1 flex cursor-pointer flex-row items-center gap-2"
                      :class="{
                        '!bg-surface-0 !text-black': isRequestSelected(log.id),
                      }"
                      @click="selectRequest(log.id)"
                    >
                      <span class="mb-2 text-xs font-semibold text-surface-500">#{{ logIDx + 1 }}. </span>
                      <p v-if="true" class="absolute right-2 mb-2 text-base !text-surface-600 sm:right-2">
                        {{ formatDTRTime(log.timestamp) }}
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
            <p v-if="item.row && resolveDTRSlots(item.row.warm_bodies ?? []).in1" class="text-base text-surface-600">
              {{ item.row ? formatDTRTime(resolveDTRSlots(item.row.warm_bodies ?? []).in1) : '' }}
            </p>
            <WbInputText
              v-else-if="item.row && item.row.warm_bodies?.length && !resolveDTRSlots(item.row.warm_bodies).in1"
              label=""
              v-model="remarksMap[`out2-${item.date.toISOString()}`]"
              placeholder="Missing"
              class="h-8 md:h-8 md:w-24"
            />
          </div>

          <!-- OUT 1 -->
          <div>
            <p class="text-xs font-semibold text-surface-500 md:hidden">OUT 1</p>
            <p v-if="item.row && resolveDTRSlots(item.row.warm_bodies ?? []).out1" class="text-base text-surface-600">
              {{ item.row ? formatDTRTime(resolveDTRSlots(item.row.warm_bodies ?? []).out1) : '' }}
            </p>
            <WbInputText
              v-else-if="item.row && item.row.warm_bodies?.length && !resolveDTRSlots(item.row.warm_bodies).out1"
              label=""
              v-model="remarksMap[`out2-${item.date.toISOString()}`]"
              placeholder="Missing"
              class="h-8 md:h-8 md:w-24"
            />
          </div>

          <!-- IN 2 -->
          <div>
            <p class="text-xs font-semibold text-surface-500 md:hidden">IN 2</p>
            <p v-if="item.row && resolveDTRSlots(item.row.warm_bodies ?? []).in2" class="text-base text-surface-600">
              {{ item.row ? formatDTRTime(resolveDTRSlots(item.row.warm_bodies ?? []).in2) : '' }}
            </p>
            <WbInputText
              v-else-if="item.row && item.row.warm_bodies?.length && !resolveDTRSlots(item.row.warm_bodies).in2"
              label=""
              v-model="remarksMap[`out2-${item.date.toISOString()}`]"
              placeholder="Missing"
              class="h-8 md:h-8 md:w-24"
            />
          </div>

          <!-- OUT 2 -->
          <div>
            <p class="text-xs font-semibold text-surface-500 md:hidden">OUT 2</p>
            <p v-if="item.row && resolveDTRSlots(item.row.warm_bodies ?? []).out2" class="text-base text-surface-600">
              {{ formatDTRTime(resolveDTRSlots(item.row.warm_bodies ?? []).out2) }}
            </p>
            <WbInputText
              v-else-if="item.row && item.row.warm_bodies?.length && !resolveDTRSlots(item.row.warm_bodies).out2"
              label=""
              v-model="remarksMap[`out2-${item.date.toISOString()}`]"
              placeholder="Enter PM OUT"
              class="h-8 md:h-8 md:w-24"
            />
          </div>

          <!-- UT, OT, Remarks -->
          <div>
            <p class="text-xs font-semibold text-surface-500 md:hidden">UT</p>
            <p class="text-base text-surface-600">
              {{ item.row?.ut ?? '' }}
            </p>
          </div>
          <div>
            <p class="text-xs font-semibold text-surface-500 md:hidden">OT</p>
            <p class="text-base text-surface-600">
              {{ item.row?.ot ?? '' }}
            </p>
          </div>
          <div>
            <p class="text-xs font-semibold text-surface-500 md:hidden">Remarks</p>
            <WbTextArea
              v-model="item.is_missing"
              v-if="item.row && (item.row.warm_bodies?.length ?? 0) <= 4 && resolveDTRSlots(item.row.warm_bodies ?? [])"
              label=""
              class="h-8 md:h-8 md:w-48"
              placeholder="Enter remarks"
            />
          </div>
        </div>

        <div v-if="!isLoading && !dailyTimeRecordsStore.dailyTimeRecords.length" class="mx-auto flex h-full w-full flex-col">
          <Card class="w-full p-0 shadow-none">
            <template #content>
              <div class="flex flex-col items-center">
                <div
                  class="my-6 flex w-full flex-col items-center justify-between gap-4 rounded-lg bg-surface-0 px-6 py-6 dark:bg-surface-800 md:my-4 md:flex-row md:px-4 md:py-4"
                ></div>
                <div class="flex justify-center">
                  <img src="@/assets/image/undraw_terms.svg" class="w-80 pt-24" />
                </div>
                <h2
                  class="mb-2 mt-4 flex w-full justify-center text-center text-xl font-semibold text-surface-800 dark:text-primary-100 sm:text-2xl"
                >
                  You have no Compensatory Overtime Credits
                </h2>
                <h1 class="mb-4 text-center text-base text-surface-600 dark:text-surface-400 sm:text-lg">
                  Compensatory Overtime Credits created by PAS HR shall appear here.
                </h1>
                <div class="mt-4 flex w-full justify-center"></div>
              </div>
            </template>
          </Card>
        </div>
        <hr />
      </template>
    </Card>
  </div>
</template>
