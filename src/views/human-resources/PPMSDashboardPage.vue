<script setup lang="ts">
import { ref, reactive, toRef, computed } from 'vue'
import Dialog from 'primevue/dialog'
import VueApexCharts from 'vue3-apexcharts'
import Button from 'primevue/button'
import WbAutoComplete, { WbAutoCompleteOptionTrueValue } from '@/components/webkit/WbAutoComplete.vue'
import { useWbAutoCompleteHandleTrueValue } from '@/composables/wb-ui-components.ts'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useLibrariesStore } from '@/stores/libraries.store'

const libraryStore = useLibrariesStore()

const showSidebar = ref(false)
const payload = reactive({ division: null, section: null })
const selectedDivision = ref<string | null>(null)
const selectedSectionUnit = ref<string | null>(null)
const selectedDivisionLabel = ref<string | null>(null)
const selectedSectionLabel = ref<string | null>(null)

const employees = ref<string[]>([])

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

const selectedYear = ref<number | null>(currentYear)
const selectedMonth = ref<number | null>(currentMonth)

const yearOptions = computed(() => {
  return Array.from({ length: 6 }, (_, i) => currentYear - i)
})

const monthOptions = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

const filteredEmployees = computed(() => {
  let data = employees.value

  if (selectedDivisionLabel.value) {
    data = data.filter((e) => e.division === selectedDivisionLabel.value)
  }

  if (selectedSectionLabel.value) {
    data = data.filter((e) => e.section === selectedSectionLabel.value)
  }

  if (selectedYear.value) {
    data = data.filter((e) => e.year === selectedYear.value)
  }

  if (selectedMonth.value) {
    data = data.filter((e) => e.month === selectedMonth.value)
  }

  return data
})

const totalMale = computed(() => filteredEmployees.value.reduce((sum, e) => sum + e.male, 0))
const totalFemale = computed(() => filteredEmployees.value.reduce((sum, e) => sum + e.female, 0))
const totalFilled = computed(() => filteredEmployees.value.reduce((sum, e) => sum + (e.filledTotal || 0), 0))
const totalUnfilled = computed(() => filteredEmployees.value.reduce((sum, e) => sum + (e.unfilled || 0), 0))
const totalPositions = computed(() => filteredEmployees.value.reduce((sum, e) => sum + (e.totalPositions || 0), 0))

const employmentChartSeries = computed(() => [
  { name: 'Male', data: filteredEmployees.value.map((d) => d.male) },
  { name: 'Female', data: filteredEmployees.value.map((d) => d.female) },
])

const employmentChartOptions = computed(() => ({
  chart: { type: 'bar', stacked: true },
  plotOptions: { bar: { horizontal: false, columnWidth: '55%', endingShape: 'rounded' } },
  dataLabels: { enabled: true },
  stroke: { show: true, width: 2, colors: ['transparent'] },
  xaxis: { categories: filteredEmployees.value.map((d) => d.status) },
  yaxis: { title: { text: 'Number of Employees' } },
  fill: { opacity: 1 },
  legend: { position: 'top' },
  colors: ['#3B82F6', '#F472B6'],
}))

const genderChartSeries = computed(() => [totalMale.value, totalFemale.value])
const genderChartOptions = {
  chart: { type: 'donut' },
  labels: ['Male', 'Female'],
  colors: ['#3B82F6', '#F472B6'],
  legend: { position: 'bottom' },
}

const handleFilterEmployees = () => {
  selectedDivisionLabel.value = selectedDivision.value ? selectedDivision.value.label : null
  selectedSectionLabel.value = selectedSectionUnit.value ? selectedSectionUnit.value.label : null
  showSidebar.value = false
}

function getId(id: string) {
  return id
}
</script>

<template>
  <div class="h-full w-full rounded-md bg-surface-0 p-6">
    <div class="p-6">
      <div class="mb-6 flex items-center justify-between">
        <h1 class="mb-2 mr-4 whitespace-nowrap text-xl text-surface-600 dark:text-primary-100 md:text-xl lg:text-4xl">
          PPMS Dashboard
        </h1>
        <div class="flex items-center gap-2 p-2">
          <Button
            label="Filter"
            @click="showSidebar = true"
            :loading="isSubmitting"
            :disabled="isSubmitting"
            type="button"
            size="large"
            class="dark:text-secondary-100 mt-4 w-full border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
            text
          >
            <template #icon>
              <font-awesome-icon :icon="['fas', 'filter']" class="mr-2" />
            </template>
          </Button>
        </div>
      </div>

      <!-- Counters -->
      <div class="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div class="rounded-xl bg-white p-4 text-center shadow">
          <h2 class="text-lg font-semibold text-gray-600">Filled Positions</h2>
          <p class="text-2xl font-bold text-green-600">{{ totalFilled }}</p>
        </div>

        <div class="rounded-xl bg-white p-4 text-center shadow">
          <h2 class="text-lg font-semibold text-gray-600">Unfilled Positions</h2>
          <p class="text-2xl font-bold text-red-600">{{ totalUnfilled }}</p>
        </div>

        <div class="rounded-xl bg-white p-4 text-center shadow">
          <h2 class="text-lg font-semibold text-gray-600">Total Positions</h2>
          <p class="text-2xl font-bold text-blue-600">{{ totalPositions }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div class="rounded-xl bg-white p-4 shadow">
          <h2 class="mb-4 text-lg font-semibold">Number of SDOs</h2>
          <VueApexCharts type="donut" height="300" :options="genderChartOptions" :series="genderChartSeries" />
        </div>

        <div class="rounded-xl bg-white p-4 shadow">
          <h2 class="mb-4 text-lg font-semibold">Distribution of Staff Per Position Level</h2>
          <VueApexCharts type="bar" height="350" :options="employmentChartOptions" :series="employmentChartSeries" />
        </div>
      </div>

      <Dialog
        v-model:visible="showSidebar"
        :modal="false"
        closable
        :dismissableMask="false"
        :position="'right'"
        :style="{ width: '25vw', maxWidth: '450px', minWidth: '320px' }"
        :breakpoints="{ '1199px': '50vw', '575px': '90vw' }"
        :pt="{
          root: {
            class: 'relative w-full h-full flex flex-col bg-white shadow-lg',
          },
        }"
      >
        <template #header>
          <div class="flex w-full items-center justify-between p-4 pb-0">
            <h1 class="text-xl font-semibold text-surface-600">
              <font-awesome-icon :icon="['fas', 'bars-staggered']" class="mr-2" />
              Filter and Field Options
            </h1>
          </div>
        </template>

        <div class="flex-1 px-4 pb-24">
          <h2 class="mb-2 mt-4 text-lg font-semibold text-surface-500">Filters</h2>

          <div class="mt-4">
            <label class="text-md mb-2 block text-surface-600">Year</label>
            <select v-model="selectedYear" class="w-full rounded border p-2">
              <option :value="null">All Years</option>
              <option v-for="y in yearOptions" :key="y" :value="y">
                {{ y }}
              </option>
            </select>
          </div>

          <div class="mt-4">
            <label class="text-md mb-2 block text-surface-600">Month</label>
            <select v-model="selectedMonth" class="w-full rounded border p-2">
              <option :value="null">All Months</option>
              <option v-for="m in monthOptions" :key="m.value" :value="m.value">
                {{ m.label }}
              </option>
            </select>
          </div>

          <div class="mt-4">
            <WbAutoComplete
              :useApiFilter="true"
              :apiEndpoint="'/libraries/divisions/search'"
              :suggestions="libraryStore.divisionOptions"
              :loading="libraryStore.divisionOptionsLoading"
              apiOptionLabel="name"
              label="Division"
              placeholder="Type the Division"
              v-model="selectedDivision"
              :id="getId('input-division')"
              optionLabel="label"
              optionValue="value"
              required
              @on-true-value-computed="
                (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) => {
                  useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'division'))
                }
              "
              class="w-full text-sm"
            />
          </div>
          <div class="mt-4">
            <WbAutoComplete
              :useApiFilter="true"
              :apiEndpoint="'/libraries/section-or-units/search'"
              :suggestions="libraryStore.sectionUnitOptions"
              :loading="libraryStore.sectionUnitOptionsLoading"
              apiOptionLabel="name"
              label="Section/Unit"
              placeholder="Type the Section / Unit"
              v-model="selectedSectionUnit"
              :id="getId('input-section-unit')"
              optionLabel="label"
              optionValue="value"
              required
              @on-true-value-computed="
                (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                  useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'section'))
              "
              class="w-full text-sm"
            />
          </div>
        </div>

        <div class="absolute bottom-0 left-0 right-0 border-t border-surface-300 bg-surface-0 px-4 py-3">
          <div class="flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Button
              label="Cancel"
              class="w-full border border-surface-400 px-4 py-2 text-surface-500"
              @click="showSidebar = false"
              text
            />
            <Button
              label="Apply"
              class="w-full border border-primary-500 px-4 py-3 text-primary-600"
              @click="handleFilterEmployees"
            >
              <template #icon>
                <font-awesome-icon :icon="['fas', 'check']" class="mr-2 text-lg" />
              </template>
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  </div>
</template>
