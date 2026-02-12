<script setup lang="ts">
import { onMounted, ref, watch, computed, reactive } from 'vue'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import InputGroup from 'primevue/inputgroup'
import Dialog from 'primevue/dialog'
import Paginator, { PageState } from 'primevue/paginator'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import WbAutoComplete from '@/components/webkit/WbAutoComplete.vue'
import { useThemeConfig } from '@/composables/theme.ts'
import { useDailyTimeRecordsStore, ViewWarmBodiesPayload } from '@/stores/daily-time-record.store'
import { useLibrariesStore } from '@/stores/libraries.store'
import type { ApiResponsePagination } from '@/typings/http-resources.types.ts'
import { useToast } from 'primevue/usetoast'
import type { CountWarmBodiesResponse, ViewTimeLogsResponse } from '@/typings/models.types'
import WarmBodiesDonutChart from '@/components/dtr/WarmBodiesDonutChart.vue'
import WarmBodiesBarGraph from '@/components/dtr/WarmBodiesBarGraph.vue'
import type { DonutFormatterOptions } from '@/components/dtr/WarmBodiesDonutChart.vue'

const warmBodiesStore = useDailyTimeRecordsStore()
const libraryStore = useLibrariesStore()
const toast = useToast()

const warmBodiesIsLoading = ref(false)
const showModal = ref(false)
const paginationLimit = 5
const pagination = ref<ApiResponsePagination | null>(null)

const payload = reactive<ViewWarmBodiesPayload>({
  division: null,
  section: null,
})

const loadWarmBodies = async (page = 1) => {
  warmBodiesIsLoading.value = true
  try {
    const response = await warmBodiesStore.fetchTimeLogsForToday(paginationLimit, page, payload.division, payload.section)

    if (response.success) {
      if (response.pagination) pagination.value = response.pagination

      const data = response.data
      if (Array.isArray(data)) {
        warmBodiesStore.viewTimeLogs = data as ViewTimeLogsResponse[]
      } else if (data) {
        warmBodiesStore.viewTimeLogs = [data as ViewTimeLogsResponse]
      } else {
        warmBodiesStore.viewTimeLogs = []
      }
    }
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Cannot load time logs.',
      detail: 'Something went wrong while fetching data.',
      life: 4000,
    })
    console.error('Error loading attendance tracker:', e)
  } finally {
    warmBodiesIsLoading.value = false
  }
}

const handlePaginationPageChange = async (event: PageState) => {
  const nextPage = event.page + 1
  console.log('Changing to page:', nextPage)
  await loadWarmBodies(nextPage)
}

const searchQuery = ref<string | null>(null)
const searchSubmitted = ref(false)
const isSearching = ref(false)
const isMyProfile = ref(true)

const handleSearchTimeLogs = async () => {
  warmBodiesIsLoading.value = true
  searchSubmitted.value = true
  isSearching.value = true

  try {
    if (!searchQuery.value) {
      await loadWarmBodies(1)
      return
    }

    const response = await warmBodiesStore.searchTimeLogs(searchQuery.value, isMyProfile.value, null)
    if (response.success) {
      if (response.pagination) pagination.value = response.pagination
      const data = response.data
      warmBodiesStore.viewTimeLogs = Array.isArray(data) ? (data as ViewTimeLogsResponse[]) : [data as ViewTimeLogsResponse]
    }
  } catch (e) {
    console.error('Error searching time logs:', e)
  } finally {
    warmBodiesIsLoading.value = false
    isSearching.value = false
  }
}

const selectedDivision = ref<{ label: string; value: number } | null>(null)
const selectedSectionUnit = ref<{ label: string; value: number } | null>(null)
const selectedDivisionLabel = ref<string | null>(null)
const selectedSectionLabel = ref<string | null>(null)

const handleFilterWarmBodies = async () => {
  warmBodiesIsLoading.value = true
  searchSubmitted.value = true

  selectedDivisionLabel.value = selectedDivision.value?.label ?? null
  selectedSectionLabel.value = selectedSectionUnit.value?.label ?? null

  try {
    payload.division = selectedDivision.value?.value ?? null
    payload.section = selectedSectionUnit.value?.value ?? null
    await loadWarmBodies(1)
    searchQuery.value = null
  } finally {
    warmBodiesIsLoading.value = false
    showModal.value = false
  }
}

const inCount = ref(0)
const outCount = ref(0)
const rawPerDivisionData = ref<CountWarmBodiesResponse['per_division']>([])
const rawPerSectionData = ref<CountWarmBodiesResponse['per_section']>([])

const handleGraphs = async (): Promise<CountWarmBodiesResponse> => {
  warmBodiesIsLoading.value = true
  try {
    const response = await warmBodiesStore.fetchCountWarmBodies()
    const result = response.data as CountWarmBodiesResponse

    inCount.value = result.in_office ?? 0
    outCount.value = result.out_of_office ?? 0
    rawPerDivisionData.value = result.per_division ?? []
    rawPerSectionData.value = result.per_section ?? []

    return result
  } finally {
    warmBodiesIsLoading.value = false
  }
}

const filteredBarGraphData = computed(() => {
  if (payload.section) {
    return rawPerSectionData.value.filter((sec) => sec.section_id === payload.section)
  }
  if (payload.division) {
    return rawPerDivisionData.value.filter((div) => div.division_id === payload.division)
  }
  return rawPerDivisionData.value
})

const filteredDonutSeries = computed(() => {
  const inTotal = filteredBarGraphData.value.reduce((sum, entry) => sum + entry.in_office, 0)
  const outTotal = filteredBarGraphData.value.reduce((sum, entry) => sum + entry.out_of_office, 0)
  return [inTotal, outTotal]
})

const barCategories = computed(() => {
  return filteredBarGraphData.value.map((entry) => {
    const section = (entry as { section_name?: string; division_name?: string }).section_name
    const division = (entry as { section_name?: string; division_name?: string }).division_name
    return section || division || ''
  }) as string[]
})

const barSeries = computed(() => [
  { name: 'In Office', data: filteredBarGraphData.value.map((e) => e.in_office) },
  { name: 'Out of Office', data: filteredBarGraphData.value.map((e) => e.out_of_office) },
])

const donutValueFormatter = (_: number, opts: DonutFormatterOptions) => String(opts.w.config.series[opts.seriesIndex])

const { selectedTheme } = useThemeConfig()
const chartsInDarkMode = ref(selectedTheme.value?.value === 'dark')

watch(
  () => selectedTheme.value,
  (theme) => (chartsInDarkMode.value = theme?.value === 'dark')
)

onMounted(async () => {
  await loadWarmBodies(1)
  await handleGraphs()
})

const flatViewTimeLogs = computed(() => warmBodiesStore.viewTimeLogs.flat())

const wbDonutChartLabels = ['In Office', 'Out of Office']
const graphColors = ['#22C55E', '#EF4444']
const DateToday = new Date().toLocaleDateString()
</script>

<template>
  <div class="flex h-full w-full flex-col">
    <template v-if="!warmBodiesIsLoading || isSearching">
      <div class="h-full w-full rounded-md bg-surface-0 p-6">
        <div class="flex flex-col font-medium text-primary-700 dark:text-primary-100 md:ml-4 md:mt-2">
          <h1 class="mb-1 text-xl text-surface-700 dark:text-primary-100 md:text-xl lg:text-4xl">Daily Time-in/Time-out</h1>
          <p class="text-base text-surface-500 dark:text-primary-200">{{ DateToday }}</p>
        </div>

        <div
          v-if="(warmBodiesStore.viewTimeLogs && flatViewTimeLogs.length > 0) || searchSubmitted"
          class="mx-auto flex w-full flex-col"
        >
          <div class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="flex h-[40vh] max-h-[450px] min-h-[300px] w-full flex-col rounded-lg bg-white">
              <div class="flex flex-grow flex-col items-center justify-center gap-6 rounded-lg shadow-md md:flex-row md:gap-10">
                <WarmBodiesDonutChart
                  :dark-mode="chartsInDarkMode"
                  :series="filteredDonutSeries"
                  :labels="wbDonutChartLabels"
                  :colors="graphColors"
                  :value-formatter="donutValueFormatter"
                  class="w-full max-w-[450px] sm:w-2/3 md:w-1/2 lg:w-[60%] xl:w-[50%]"
                />
              </div>
            </div>

            <div class="flex h-[40vh] max-h-[450px] min-h-[350px] w-full flex-col rounded-lg bg-white p-4 pb-4 shadow-md">
              <p class="mb-4 text-sm font-semibold uppercase text-surface-600">All</p>
              <div class="flex h-full w-full">
                <WarmBodiesBarGraph
                  :dark-mode="chartsInDarkMode"
                  :categories="barCategories"
                  :series="barSeries"
                  :colors="graphColors"
                  class="h-full w-full"
                />
              </div>
            </div>
          </div>

          <div v-if="searchSubmitted || flatViewTimeLogs.length > 0" class="flex flex-row items-center">
            <div class="mt-8 flex w-full items-center md:w-1/2">
              <InputGroup v-model="searchQuery" class="w-full">
                <InputText
                  v-model="searchQuery"
                  placeholder="Search Name"
                  :disabled="warmBodiesIsLoading"
                  @keyup.enter="handleSearchTimeLogs"
                />
                <Button icon="pi pi-search" @click="handleSearchTimeLogs" />
              </InputGroup>
              <button
                @click="showModal = true"
                class="ml-2 rounded-md bg-white px-2 text-2xl text-primary-500 transition-colors duration-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                <font-awesome-icon :icon="['fas', 'filter']" />
              </button>
            </div>

            <div class="text-m mb-2 ml-4 mt-8 w-1/2 text-surface-500">
              <div v-if="selectedDivisionLabel">
                Filtered by Division:
                <span class="font-semibold text-primary-600">{{ selectedDivisionLabel }}</span>
              </div>
              <div v-if="selectedSectionLabel">
                Filtered by Section:
                <span class="font-semibold text-primary-600">{{ selectedSectionLabel }}</span>
              </div>
              <span v-if="!selectedDivisionLabel && !selectedSectionLabel">Showing all data</span>
            </div>
          </div>
        </div>

        <div class="flex flex-col">
          <div class="w-full">
            <div
              v-if="(warmBodiesStore.viewTimeLogs && flatViewTimeLogs.length > 0) || isSearching"
              class="mx-auto flex h-full w-full flex-col"
            >
              <DataTable :value="flatViewTimeLogs" class="mt-6" dataKey="time_log_id" :loading="warmBodiesIsLoading">
                <Column field="employee" headerClass="w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2">
                  <template #header>
                    <div class="flex flex-col">
                      <span class="text-base text-surface-600">Employee</span>
                      <span class="text-sm font-normal text-surface-500">ID Number</span>
                    </div>
                  </template>

                  <template #body="props">
                    <div class="flex flex-col">
                      <p class="font-semibold uppercase text-surface-600">
                        {{
                          [
                            props.data.last_name + ',',
                            props.data.first_name,
                            props.data.middle_name ? props.data.middle_name[0] + '.' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')
                        }}
                      </p>
                      <p class="text-sm text-surface-500">{{ props.data.id_number || 'N/A' }}</p>
                    </div>
                  </template>
                </Column>

                <Column
                  field="division"
                  header="Division"
                  headerClass="w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
                >
                  <template #body="props">
                    <p class="uppercase text-surface-600">{{ props.data.division_name }}</p>
                  </template>
                </Column>

                <Column
                  field="section"
                  header="Section"
                  headerClass="w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
                >
                  <template #body="props">
                    <p class="uppercase text-surface-600">{{ props.data.section_name }}</p>
                  </template>
                </Column>
              </DataTable>
            </div>

            <div class="mt-6 flex w-full justify-center md:mt-10">
              <Paginator
                v-if="pagination && pagination.total > 0"
                :rows="pagination.per_page"
                :total-records="pagination.total"
                :first="(pagination.current_page - 1) * pagination.per_page"
                template="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
                @page="handlePaginationPageChange"
              />
            </div>
          </div>

          <div
            v-if="searchSubmitted && !warmBodiesIsLoading && !flatViewTimeLogs.length"
            class="flex h-full w-full flex-col items-center justify-center font-menu text-lg dark:text-surface-300"
          >
            <i class="pi pi-exclamation-triangle mb-2 pt-5 text-2xl"></i>
            <p>No matching employees found.</p>
          </div>

          <div
            v-if="!warmBodiesIsLoading && !flatViewTimeLogs.length && !searchSubmitted"
            class="mx-auto flex h-full w-full flex-col"
          >
            <Card class="w-full p-0 shadow-none">
              <div class="flex flex-col items-center">
                <div
                  class="my-6 flex w-full flex-col items-center justify-between gap-4 rounded-lg bg-surface-0 px-6 py-6 dark:bg-surface-800 md:my-4 md:flex-row md:px-4 md:py-4"
                ></div>
                <div class="flex justify-center">
                  <img src="@/assets/image/undraw_warm_bodies.svg" class="w-80 pt-10" />
                </div>
                <h2
                  class="mb-2 mt-4 flex w-full justify-center text-center text-xl font-semibold text-surface-800 dark:text-primary-100 sm:text-2xl"
                >
                  No Active attendance Found
                </h2>
                <h1 class="mb-4 text-center text-base text-surface-600 dark:text-surface-400 sm:text-lg">
                  Employees will appear here once they have scanned in for the day. Try refreshing if you are expecting activity.
                </h1>
              </div>
            </Card>
          </div>
        </div>

        <Dialog
          v-model:visible="showModal"
          :modal="false"
          closable
          :dismissableMask="true"
          :position="'right'"
          :style="{ width: '20vw', maxWidth: '600px', minWidth: '320px' }"
          :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
          :pt="{
            root: {
              class: 'relative w-full h-full flex flex-col bg-surface-0 shadow-lg',
            },
          }"
        >
          <template #header>
            <div class="flex w-full items-center justify-between p-4 pb-0">
              <h1 class="text-xl font-semibold text-surface-600 dark:text-primary-100">
                <font-awesome-icon :icon="['fas', 'bars-staggered']" class="mr-2" />
                Filter and Field Options
              </h1>
            </div>
          </template>

          <div class="flex-1 px-4 pb-24">
            <h2 class="mb-2 mt-4 text-lg font-semibold text-surface-500 dark:text-primary-100">Filters</h2>
            <div class="mb-4">
              <WbAutoComplete
                :useApiFilter="true"
                :apiEndpoint="'/libraries/divisions/search'"
                :suggestions="libraryStore.divisionOptions"
                :loading="libraryStore.divisionOptionsLoading"
                apiOptionLabel="name"
                label="Division"
                placeholder="Type the Division"
                v-model="selectedDivision"
                optionLabel="label"
                optionValue="value"
                label-class="mt-4 text-md text-surface-600 dark:lg:text-surface-200"
                class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                required
              />
              <WbAutoComplete
                :useApiFilter="true"
                :apiEndpoint="'/libraries/section-or-units/search'"
                :suggestions="libraryStore.sectionUnitOptions"
                :loading="libraryStore.sectionUnitOptionsLoading"
                apiOptionLabel="name"
                label="Section/Unit"
                placeholder="Type the Section / Unit"
                v-model="selectedSectionUnit"
                optionLabel="label"
                optionValue="value"
                required
                label-class="mt-4 text-md text-surface-600 dark:lg:text-surface-200"
                class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
              />
            </div>
          </div>

          <div
            class="absolute bottom-0 left-0 right-0 border-t border-surface-300 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900"
          >
            <div class="flex flex-col items-center justify-center gap-2 sm:flex-row">
              <Button
                label="Cancel"
                class="dark:text-secondary-100 w-full border border-surface-400 px-4 py-2 text-surface-500 dark:border-surface-700"
                @click="showModal = false"
                text
              >
                <template #icon>
                  <i class="pi pi-ban mr-2 text-lg"></i>
                </template>
              </Button>
              <Button
                :loading="warmBodiesIsLoading"
                :disabled="warmBodiesIsLoading"
                @click="handleFilterWarmBodies"
                label="Apply"
                class="dark:text-secondary-100 w-full border border-primary-500 px-4 py-3 text-primary-600 dark:border-surface-700"
                text
              >
                <template #icon>
                  <i class="pi pi-check mr-2 text-lg"></i>
                </template>
              </Button>
            </div>
          </div>
        </Dialog>
      </div>
    </template>

    <template v-else-if="warmBodiesIsLoading && !isSearching">
      <div class="bg-surface-2 h-full w-full animate-pulse rounded-md p-6">
        <div class="flex flex-col md:ml-4 md:mt-2">
          <div class="mb-2 h-8 w-1/3 rounded-full bg-surface-300"></div>
          <div class="h-6 w-1/4 rounded-full bg-surface-300"></div>
        </div>

        <div class="my-10 space-y-4">
          <div v-for="i in 5" :key="i" class="h-10 w-full rounded bg-surface-300"></div>
        </div>
      </div>
    </template>
  </div>
</template>
