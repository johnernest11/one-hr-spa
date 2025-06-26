<script setup lang="ts">
import { onBeforeMount, ref, watch } from 'vue'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import InputGroup from 'primevue/inputgroup'
import Paginator, { PageState } from 'primevue/paginator'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useDailyTimeRecordsStore } from '@/stores/daily-time-record.store'
import { ApiResponsePagination } from '@/typings/http-resources.types.ts'
import { formatDTRTime, DateToday } from '@/utils/helpers.ts'
const warmBodiesStore = useDailyTimeRecordsStore()
const warmBodiesIsLoading = ref(false)
const paginationLimit = 5

onBeforeMount(async () => {
  warmBodiesIsLoading.value = true
  const response = await warmBodiesStore.fetchDailyTimeRecords(paginationLimit)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  warmBodiesIsLoading.value = false
})

const pagination = ref<ApiResponsePagination | null>(null)
const handlePaginationPageChange = async (event: PageState) => {
  const pageSelected = event.page + 1
  warmBodiesIsLoading.value = true
  const response = await warmBodiesStore.fetchDailyTimeRecords(paginationLimit, pageSelected)
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
    const response = await warmBodiesStore.fetchDailyTimeRecords(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    warmBodiesIsLoading.value = false
  }
)
const searchSubmitted = ref(false)
const handleSearchLocatorSlip = async () => {
  warmBodiesIsLoading.value = true
  searchSubmitted.value = true

  if (!searchQuery.value) {
    const response = await warmBodiesStore.fetchDailyTimeRecords(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    warmBodiesIsLoading.value = false
    return
  }

  const response = await warmBodiesStore.searchDailyTimeRecords(searchQuery.value)
  if (response.success && response.pagination) {
    pagination.value = response.pagination

    searchQuery.value = null
  }
  warmBodiesIsLoading.value = false
}
</script>
<template>
  <div class="flex h-full w-full flex-col shadow-md">
    <div class="h-full w-full rounded-md bg-surface-0 p-6">
      <div class="flex flex-col font-medium text-primary-700 dark:text-primary-100 md:ml-4 md:mt-2">
        <h1 class="mb-1 text-xl text-surface-700 dark:text-primary-100 md:text-xl lg:text-4xl">
          <font-awesome-icon :icon="['fas', 'users-rectangle']" class="mr-2 text-2xl" />
          Warm Bodies
        </h1>
        <p class="text-base text-surface-500 dark:text-primary-200">
          {{ DateToday }}
        </p>
      </div>

      <div class="mt-8 flex w-full md:w-auto">
        <InputGroup v-model="searchQuery" class="w-full">
          <InputText
            v-model="searchQuery"
            placeholder="Search Name"
            class="w-full"
            :disabled="warmBodiesIsLoading"
            @keyup.enter="handleSearchLocatorSlip"
          />
          <Button icon="pi pi-search" @click="handleSearchLocatorSlip" />
        </InputGroup>
      </div>

      <div class="lex flex-col">
        <div class="w-full">
          <div class="mx-auto flex h-full w-full flex-col">
            <DataTable :value="warmBodiesStore.dailyTimeRecords" class="mt-6" dataKey="id">
              <Column field="period" headerClass="w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2">
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
                          props.data.warm_bodies?.[0]?.employee_id?.individual_basic_detail_id?.first_name,
                          props.data.warm_bodies?.[0]?.employee_id?.individual_basic_detail_id?.middle_name,
                          props.data.warm_bodies?.[0]?.employee_id?.individual_basic_detail_id?.last_name,
                        ]
                          .filter(Boolean)
                          .join(' ')
                      }}
                    </p>
                    <p class="text-sm text-surface-500">
                      {{ props.data.warm_bodies?.[0]?.employee_id?.id_number || 'N/A' }}
                    </p>
                  </div>
                </template>
              </Column>

              <Column
                field="edited_at"
                header="Division"
                headerClass=" w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="uppercase text-surface-600">
                    {{ props.data.warm_bodies?.[0]?.employee_id?.division_id?.name }}
                  </p>
                </template>
              </Column>
              <Column
                field="edited_at"
                header="Section"
                headerClass=" w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="uppercase text-surface-600">
                    {{ props.data.warm_bodies?.[0]?.employee_id?.section_or_unit_id?.name }}
                  </p>
                </template>
              </Column>
              <Column
                field="edited_at"
                header="Time-in"
                headerClass=" w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
                <template #body="props">
                  <p class="uppercase text-surface-600">
                    {{
                      formatDTRTime(
                        [...(props.data.warm_bodies || [])]
                          .filter((wb) => wb.is_in)
                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.timestamp
                      )
                    }}
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
        <div
          v-if="searchSubmitted && !warmBodiesIsLoading && !warmBodiesStore.dailyTimeRecords.length"
          class="flex h-full w-full flex-col items-center justify-center font-menu text-lg dark:text-surface-300"
        >
          <i class="pi pi-exclamation-triangle mb-2 text-2xl"></i>
          <p>No Warm Bodiess found</p>
        </div>
        <div
          v-if="!warmBodiesIsLoading && !warmBodiesStore.dailyTimeRecords.length && !searchSubmitted"
          class="mx-auto flex h-full w-full flex-col"
        >
          <Card class="w-full p-0 shadow-none">
            <template #content>
              <div class="flex flex-col items-center">
                <div
                  class="my-6 flex w-full flex-col items-center justify-between gap-4 rounded-lg bg-surface-0 px-6 py-6 dark:bg-surface-800 md:my-4 md:flex-row md:px-4 md:py-4"
                ></div>
                <div class="flex justify-center">
                  <img src="@/assets/image/undraw_payments.svg" class="w-96 pt-44" />
                </div>
                <h2
                  class="mb-2 mt-4 flex w-full justify-center text-center text-xl font-semibold text-surface-800 dark:text-primary-100 sm:text-2xl"
                >
                  No Warm Bodies available
                </h2>
                <h1 class="mb-4 text-center text-base text-surface-600 dark:text-surface-400 sm:text-lg">
                  Warm Bodies shall appear here.
                </h1>
              </div>
            </template>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>
