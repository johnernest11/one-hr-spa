<script setup lang="ts">
import { onMounted, ref, watch, computed } from 'vue'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import InputGroup from 'primevue/inputgroup'
import Paginator, { PageState } from 'primevue/paginator'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useDailyTimeRecordsStore } from '@/stores/daily-time-record.store'
import { ApiResponsePagination } from '@/typings/http-resources.types.ts'
import { DateToday } from '@/utils/helpers.ts'
import { useToast } from 'primevue/usetoast'
const warmBodiesStore = useDailyTimeRecordsStore()
const warmBodiesIsLoading = ref(false)
const paginationLimit = 5
const columnWidths = ['w-80', 'w-80', 'w-80', 'w-80']
const toast = useToast()

onMounted(async () => {
  warmBodiesIsLoading.value = true
  try {
    const response = await warmBodiesStore.fetchTimeLogsForToday()
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Cannot view time logs.',
      detail: 'Something went wrong.',
      life: 5000,
    })
    console.log('Encountered error while attempting to fetch time logs. ', e)
  } finally {
    warmBodiesIsLoading.value = false
  }
})

const flatViewTimeLogs = computed(() => warmBodiesStore.viewTimeLogs.flat())

const pagination = ref<ApiResponsePagination | null>(null)
const handlePaginationPageChange = async (event: PageState) => {
  const pageSelected = event.page + 1
  warmBodiesIsLoading.value = true
  const response = await warmBodiesStore.fetchTimeLogsForToday(paginationLimit, pageSelected)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  warmBodiesIsLoading.value = false
}

const roleFilter = ref<number | null>(null)
const searchQuery = ref<string | null>(null)
const isSearching = ref(false)
watch(
  () => roleFilter.value,
  async () => {
    warmBodiesIsLoading.value = true
    searchQuery.value = null
    isSearching.value = false
    const response = await warmBodiesStore.fetchTimeLogsForToday()
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    warmBodiesIsLoading.value = false
  }
)
const searchSubmitted = ref(false)
const isMyProfile = ref(true)
const handleSearchTimeLogs = async () => {
  warmBodiesIsLoading.value = true
  searchSubmitted.value = true

  if (!searchQuery.value) {
    const response = await warmBodiesStore.fetchTimeLogsForToday()
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    warmBodiesIsLoading.value = false
    return
  }

  const response = await warmBodiesStore.searchTimeLogs(searchQuery.value, isMyProfile.value, null)
  if (response.success && response.pagination) {
    pagination.value = response.pagination

    searchQuery.value = null
  }
  warmBodiesIsLoading.value = false
}
</script>
<template>
  <div class="flex h-full w-full flex-col">
    <template v-if="!warmBodiesIsLoading">
      <div class="h-full w-full rounded-md bg-surface-0 p-6">
        <div class="flex flex-col font-medium text-primary-700 dark:text-primary-100 md:ml-4 md:mt-2">
          <h1 class="mb-1 text-xl text-surface-700 dark:text-primary-100 md:text-xl lg:text-4xl">
            <font-awesome-icon :icon="['fas', 'users-rectangle']" class="mr-2 text-4xl" />
            Warm Bodies
          </h1>
          <p class="text-base text-surface-500 dark:text-primary-200">
            {{ DateToday }}
          </p>
        </div>

        <div v-if="!warmBodiesIsLoading && (searchSubmitted || flatViewTimeLogs.length > 0)" class="mt-8 flex w-full md:w-auto">
          <InputGroup v-model="searchQuery" class="w-full">
            <InputText
              v-model="searchQuery"
              placeholder="Search Name"
              class="w-full"
              :disabled="warmBodiesIsLoading"
              @keyup.enter="handleSearchTimeLogs"
            />
            <Button icon="pi pi-search" @click="handleSearchTimeLogs" />
          </InputGroup>
        </div>

        <div class="lex flex-col">
          <div class="w-full">
            <div v-if="warmBodiesStore.viewTimeLogs && flatViewTimeLogs.length > 0" class="mx-auto flex h-full w-full flex-col">
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
                      <p class="text-sm text-surface-500">
                        {{ props.data.id_number || 'N/A' }}
                      </p>
                    </div>
                  </template>
                </Column>

                <Column
                  field="division"
                  header="Division"
                  headerClass=" w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
                >
                  <template #body="props">
                    <p class="uppercase text-surface-600">
                      {{ props.data.division_name }}
                    </p>
                  </template>
                </Column>
                <Column
                  field="section"
                  header="Section"
                  headerClass=" w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
                >
                  <template #body="props">
                    <p class="uppercase text-surface-600">
                      {{ props.data.section_name }}
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
                class="text-s md:text-sm"
                :pt="{ pageButton: {} }"
                :first="(pagination.current_page - 1) * pagination.per_page"
                @page="handlePaginationPageChange"
              />
            </div>
          </div>
          <div
            v-if="searchSubmitted && !warmBodiesIsLoading && !flatViewTimeLogs.length"
            class="flex h-full w-full flex-col items-center justify-center font-menu text-lg dark:text-surface-300"
          >
            <i class="pi pi-exclamation-triangle mb-2 pt-5 text-2xl"></i>
            <p>That Person is Not Here Right Now</p>
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
                  No Active Warm Bodies Found
                </h2>
                <h1 class="mb-4 text-center text-base text-surface-600 dark:text-surface-400 sm:text-lg">
                  Employees will appear here once they have scanned in for the day. Try refreshing if you are expecting activity.
                </h1>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="bg-surface-2 h-full w-full animate-pulse rounded-md p-6">
        <div class="text-primary-702 flex flex-col font-medium dark:text-primary-100 md:ml-4 md:mt-2">
          <div class="mb-2 h-6 w-1/3 rounded-full bg-surface-300"></div>
          <div class="h-4 w-1/4 rounded-full bg-surface-300"></div>
        </div>

        <div class="mt-10 w-full">
          <div class="flex w-full items-center gap-4">
            <div class="h-10 flex-grow rounded bg-surface-300"></div>
            <div class="h-10 w-12 rounded bg-surface-300"></div>
          </div>
        </div>

        <table class="w-full">
          <thead class="bg-surface-0">
            <tr class="border-[1px] border-surface-300">
              <td v-for="(width, index) in columnWidths" :key="'header-' + index">
                <div class="mx-4 mt-4 h-2.5 rounded-full bg-surface-300" :class="width + ' mb-4'"></div>
              </td>
            </tr>
          </thead>
          <tbody class="bg-surface-100">
            <tr v-for="row in 5" :key="'row-' + row" class="border-[1px] border-t-0 border-surface-300">
              <td v-for="(width, index) in columnWidths" :key="'row-' + row + '-col-' + index">
                <div class="mx-4 mt-4 h-2.5 rounded-full bg-surface-300" :class="width + ' mb-4'"></div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
