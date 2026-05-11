<script setup lang="ts">
import { onBeforeMount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ItemNumberResponse } from '@/typings/models.types.ts'
import { useItemNumberStore } from '@/stores/item-number.store'

import Button from 'primevue/button'
import Chip from 'primevue/chip'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import WbDropdown from '@/components/webkit/WbDropdown.vue'
import InputText from 'primevue/inputtext'
import InputGroup from 'primevue/inputgroup'

import Paginator, { PageState } from 'primevue/paginator'
import { ApiResponsePagination } from '@/typings/http-resources.types.ts'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { formatDate } from '@/utils/helpers.ts'

const itemNumberStore = useItemNumberStore()
const router = useRouter()

const showModal = ref(false)
const itemNumberIsLoading = ref(false)
const searchSubmitted = ref(false)
const paginationLimit = 5

const searchQuery = ref<string | null>(null)
const selectedStatus = ref<string | null>(null)
const pagination = ref<ApiResponsePagination | null>(null)

onBeforeMount(async () => {
  itemNumberIsLoading.value = true
  const response = await itemNumberStore.fetchItemNumber(paginationLimit)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  itemNumberIsLoading.value = false
})

const navigateToDetails = (itemNumber: ItemNumberResponse) => {
  if (!itemNumber || !itemNumber.id) {
    console.error('Cannot navigate to details: Item Number or ID is undefined', itemNumber)
    return
  }
  router.push({
    name: 'item-numbers/editor',
    params: {
      id: itemNumber.id,
    },
  })
}

const navigateToCreate = () => {
  router.push({ name: 'item-numbers/store' })
}

const statusOptions = ref([
  { label: 'Unfilled', value: 'Unfilled' },
  { label: 'Filled', value: 'Filled' },
])

/************* Pagination Function *************/
const handlePaginationPageChange = async (event: PageState) => {
  const pageSelected = event.page + 1
  itemNumberIsLoading.value = true
  let response
  if (searchSubmitted.value && lastSearchQuery.value) {
    response = await itemNumberStore.searchItemNumber(lastSearchQuery.value, paginationLimit, pageSelected)
  } else if (lastFilterValue.value) {
    response = await itemNumberStore.filterItemNumber(lastFilterValue.value, paginationLimit, pageSelected)
  } else {
    response = await itemNumberStore.fetchItemNumber(paginationLimit, pageSelected)
  }
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  itemNumberIsLoading.value = false
}

/************* Filter Filter *************/
const lastFilterValue = ref<string | null>(null)

const handleFilterItemNumber = async () => {
  itemNumberIsLoading.value = true
  searchSubmitted.value = true
  lastFilterValue.value = selectedStatus.value

  const response = await itemNumberStore.filterItemNumber(selectedStatus.value, paginationLimit, 1)

  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }

  itemNumberIsLoading.value = false
  showModal.value = false
}

/************* Search Filter *************/
const lastSearchQuery = ref<string | null>(null)

const handleSearchItemNumber = async () => {
  itemNumberIsLoading.value = true
  searchSubmitted.value = true

  if (!searchQuery.value) {
    const response = await itemNumberStore.fetchItemNumber(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    lastSearchQuery.value = null
    itemNumberIsLoading.value = false
    return
  }
  lastSearchQuery.value = searchQuery.value

  const response = await itemNumberStore.searchItemNumber(searchQuery.value, paginationLimit, 1)

  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }

  itemNumberIsLoading.value = false
}
</script>
<template>
  <div class="mx-auto flex h-full w-full flex-col pl-4 pt-8">
    <Card class="h-full">
      <template #content>
        <div>
          <div class="mx-auto flex h-full w-full flex-col">
            <div class="flex w-full items-center justify-end gap-4">
              <div
                class="my-6 flex w-full flex-col items-center justify-between gap-4 rounded-lg bg-surface-0 px-6 py-6 dark:bg-surface-800 md:my-4 md:flex-row md:px-4 md:py-4"
              >
                <h1
                  class="mb-2 mr-4 whitespace-nowrap text-xl font-semibold text-primary-800 dark:text-primary-100 md:text-xl lg:text-4xl"
                >
                  <font-awesome-icon :icon="['fas', 'sitemap']" />
                  Item Numbers
                </h1>
              </div>
              <div class="flex w-full items-center justify-end gap-4">
                <div class="flex space-x-2 whitespace-nowrap md:w-auto">
                  <Button
                    icon="pi pi-filter-fill"
                    v-tooltip.top="'Filter Item'"
                    severity="info"
                    size="large"
                    class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100"
                    text
                    @click="showModal = true"
                  />
                  <Button
                    icon="pi pi-plus"
                    v-tooltip.top="'Create Item Number'"
                    severity="info"
                    size="large"
                    class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100"
                    text
                    @click="navigateToCreate"
                  />
                </div>
                <div class="flex w-full md:w-auto lg:w-1/2">
                  <InputGroup v-model="searchQuery" class="w-full">
                    <InputText
                      v-model="searchQuery"
                      placeholder="Search Item Number"
                      class="w-full"
                      :disabled="itemNumberIsLoading"
                      @keyup.enter="handleSearchItemNumber"
                    />
                    <Button icon="pi pi-search" @click="handleSearchItemNumber" />
                  </InputGroup>
                </div>
              </div>
            </div>
            <div
              v-if="itemNumberStore.itemNumbers && itemNumberStore.itemNumbers.length > 0"
              class="mx-auto flex h-full w-full flex-col"
            >
              <DataTable :value="itemNumberStore.itemNumbers" class="mt-6" dataKey="id" :loading="itemNumberIsLoading">
                <Column
                  field="period"
                  header="Item Numbers"
                  headerClass="w-64 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
                >
                  <template #body="props">
                    <p class="font-semibold uppercase text-surface-600">{{ props.data.number }}</p>
                  </template>
                </Column>
                <Column
                  field="edited_at"
                  header="Date Created"
                  headerClass=" w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
                >
                  <template #body="props">
                    <p class="uppercase text-surface-600">{{ formatDate(props.data.date_of_creation) }}</p>
                  </template>
                </Column>
                <Column
                  field="status"
                  header="Status"
                  headerClass="w-64 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
                >
                  <template #body="props">
                    <template v-if="props.data.status === 'Unfilled'">
                      <Chip
                        label="Unfilled"
                        class="flex items-center justify-center !bg-error-700 px-4 py-1 font-semibold !text-surface-0"
                      >
                      </Chip>
                    </template>
                    <template v-else-if="props.data.status === 'Filled'">
                      <Chip
                        label="Filled"
                        class="flex items-center justify-center !bg-primary-700 px-4 py-1 font-semibold !text-surface-0"
                      />
                    </template>
                  </template>
                </Column>
                <Column field="action" header="Actions" headerClass="w-64 bg-surface-100 opacity-70 font-bold py-2">
                  <template #body="props">
                    <div class="flex gap-4 whitespace-nowrap md:w-auto">
                      <Button
                        icon="pi pi-eye"
                        v-tooltip.top="'View Item Number'"
                        severity="info"
                        class="border-none text-lg font-semibold text-primary-600 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
                        text
                        @click="navigateToDetails(props.data)"
                      />
                    </div>
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
            v-if="searchSubmitted && !itemNumberIsLoading && !itemNumberStore.itemNumbers.length"
            class="flex h-full w-full flex-col items-center justify-center font-menu text-lg dark:text-surface-300"
          >
            <i class="pi pi-exclamation-triangle mb-2 text-2xl"></i>
            <p class="text-center">
              Oops! We couldn’t find any items matching your search. <br />
              Try adjusting your keywords.
            </p>
          </div>
          <div
            v-if="!itemNumberIsLoading && !itemNumberStore.itemNumbers.length && !searchSubmitted"
            class="mx-auto flex h-full w-full flex-col"
          >
            <Card class="w-full p-0 shadow-none">
              <template #content>
                <div class="flex flex-col items-center sm:flex-col md:flex-col">
                  <div
                    class="my-6 flex w-full flex-col items-center justify-between gap-4 rounded-lg bg-surface-0 px-6 py-6 dark:bg-surface-800 md:my-4 md:flex-row md:px-4 md:py-4"
                  ></div>
                  <div class="flex justify-center">
                    <img src="@/assets/image/undraw_site-stats.svg" class="w-96 pt-12" />
                  </div>
                  <h2
                    class="mb-2 mt-4 flex w-full justify-center text-xl font-semibold text-surface-800 dark:text-primary-100 sm:text-2xl"
                  >
                    No Item Number
                  </h2>
                  <h1 class="mb-4 text-base text-surface-600 dark:text-surface-400 sm:text-lg">
                    List of Item Number shall appear here
                  </h1>
                  <div class="mt-4 flex w-full justify-center">
                    <Button
                      icon="pi pi-plus"
                      label="New Item Number"
                      severity="info"
                      size="large"
                      class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100 sm:text-primary-400 md:text-primary-400 lg:text-primary-400 dark:lg:text-primary-400"
                      text
                      @click="navigateToCreate"
                    />
                  </div>
                </div>
              </template>
            </Card>
          </div>
        </div>
      </template>
    </Card>
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
          class: 'relative w-full h-full flex flex-col bg-white shadow-lg',
        },
      }"
    >
      <!-- Header -->
      <template #header>
        <div class="flex w-full items-center justify-between p-4 pb-0">
          <h1 class="text-xl font-semibold text-surface-600 dark:text-primary-100">
            <font-awesome-icon :icon="['fas', 'bars-staggered']" class="mr-2" />
            Filter and Field Options
          </h1>
        </div>
      </template>
      <!-- Scrollable Content (space reserved for footer height) -->
      <div class="flex-1 overflow-auto px-4 pb-24">
        <h2 class="mb-2 mt-4 text-sm font-medium text-surface-500 dark:text-primary-100">Filters</h2>
        <div class="mb-4">
          <WbDropdown
            v-model="selectedStatus"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            label="Status"
            placeholder="Select Status"
            label-class="text-sm text-start text-surface-600"
          />
        </div>
      </div>
      <!-- Fixed Footer (inside dialog container) -->
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
            :loading="itemNumberIsLoading"
            :disabled="itemNumberIsLoading"
            @click="handleFilterItemNumber"
            label="Apply"
            class="dark:text-secondary-100 w-full border border-primary-500 px-4 py-3 text-primary-600 dark:border-surface-700"
            text
          >
            <template #icon>
              <font-awesome-icon :icon="['fas', 'check']" class="mr-2 text-lg" />
            </template>
          </Button>
        </div>
      </div>
    </Dialog>
  </div>
</template>
