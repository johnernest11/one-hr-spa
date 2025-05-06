<script setup lang="ts">
import { onBeforeMount, ref, watch } from 'vue'
import Button from 'primevue/button'
import Chip from 'primevue/chip'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import InputGroup from 'primevue/inputgroup'
import Paginator, { PageState } from 'primevue/paginator'
import { ApiResponsePagination } from '@/typings/http-resources.types.ts'
import { ItemNumberResponse } from '@/typings/models.types.ts'
import { useItemNumberStore } from '@/stores/item-number.store'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useRouter } from 'vue-router'

const router = useRouter()
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

const itemNumberStore = useItemNumberStore()

const itemNumberIsLoading = ref(false)
const paginationLimit = 5
onBeforeMount(async () => {
  itemNumberIsLoading.value = true
  const response = await itemNumberStore.fetchItemNumber(paginationLimit)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  itemNumberIsLoading.value = false
})

const pagination = ref<ApiResponsePagination | null>(null)
const handlePaginationPageChange = async (event: PageState) => {
  const pageSelected = event.page + 1
  itemNumberIsLoading.value = true
  const response = await itemNumberStore.fetchItemNumber(paginationLimit, pageSelected)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  itemNumberIsLoading.value = false
}

const roleFilter = ref<number | null>(null)
const searchQuery = ref<string | null>(null)
const isSearching = ref(false)
watch(
  () => roleFilter.value,
  async () => {
    itemNumberIsLoading.value = true
    searchQuery.value = null
    isSearching.value = false
    const response = await itemNumberStore.fetchItemNumber(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    itemNumberIsLoading.value = false
  }
)
const searchSubmitted = ref(false)
const handleSearchItemNumber = async () => {
  itemNumberIsLoading.value = true
  searchSubmitted.value = true

  if (!searchQuery.value) {
    const response = await itemNumberStore.fetchItemNumber(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    itemNumberIsLoading.value = false
    return
  }

  const response = await itemNumberStore.searchItemNumber(searchQuery.value)
  if (response.success && response.pagination) {
    pagination.value = response.pagination

    searchQuery.value = null
  }
  itemNumberIsLoading.value = false
}

const navigateToCreate = () => {
  router.push({ name: 'item-numbers/store' })
}
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      console.error('Invalid date string:', dateString)
      return 'Invalid Date'
    }
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
    const formattedDate = date.toLocaleDateString(undefined, options)
    return formattedDate.replace(/^(\w+)\s(\d+),\s(\d+)$/, '$2 $1 $3')
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Invalid Date'
  }
}
</script>
<template>
  <div class="mx-auto flex h-full w-full flex-col pl-4 pt-8">
    <Card class="h-full">
      <template #content>
        <div>
          <div class="mx-auto flex h-full w-full flex-col">
            <div
              class="flex w-full items-center justify-end gap-4"
              v-if="!itemNumberIsLoading && (searchSubmitted || itemNumberStore.ItemNumberArray.length > 0)"
            >
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
                    @click="$router.push({ name: 'sign-up' })"
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
              v-if="itemNumberStore.ItemNumberArray && itemNumberStore.ItemNumberArray.length > 0"
              class="mx-auto flex h-full w-full flex-col"
            >
              <DataTable :value="itemNumberStore.ItemNumberArray" class="mt-6" dataKey="id">
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
                        class="flex items-center justify-center bg-error-700 px-4 py-1 font-semibold text-surface-0"
                      >
                      </Chip>
                    </template>
                    <template v-else-if="props.data.status === 'Filled'">
                      <Chip
                        label="Filled"
                        class="flex items-center justify-center bg-success-700 px-4 py-1 font-semibold text-surface-0"
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
                :pt="{
                  pageButton: ({ context }) => ({
                    class: [
                      'rounded-md', // Tailwind: Basic rounded corners
                      {
                        'bg-primary-500 text-surface-50': context.active, // Tailwind: Blue background and white text for active
                      },
                      'transition-colors', // Tailwind: Smooth color transitions
                      'duration-200',
                      'ease-in-out',
                      'px-5', // Tailwind: Horizontal padding
                      'py-3', // Tailwind: Vertical padding
                    ],
                  }),
                }"
              />
            </div>
          </div>
          <div
            v-if="searchSubmitted && !itemNumberIsLoading && !itemNumberStore.ItemNumberArray.length"
            class="flex h-full w-full flex-col items-center justify-center font-menu text-lg dark:text-surface-300"
          >
            <i class="pi pi-exclamation-triangle mb-2 text-2xl"></i>
            <p>No items found</p>
          </div>
          <div
            v-if="!itemNumberIsLoading && !itemNumberStore.ItemNumberArray.length && !searchSubmitted"
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
  </div>
</template>
