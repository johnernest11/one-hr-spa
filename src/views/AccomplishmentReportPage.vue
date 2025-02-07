<script setup lang="ts">
import Paginator, { PageState } from 'primevue/paginator'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputGroup from 'primevue/inputgroup'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { onBeforeMount, ref, watch } from 'vue'
import { useUsersStore } from '@/stores/users.store.ts'
import { ApiResponsePagination } from '@/typings/http-resources.types.ts'
import { useRolesStore } from '@/stores/roles.store.ts'

/** Initial Users Accomplishment Fetch & Role Options */
const accomplishmentStore = useUsersStore()
const usersListIsLoading = ref(false)
const rolesStore = useRolesStore()
const rolesOptionsIsLoading = ref(false)
const paginationLimit = 10
onBeforeMount(async () => {
  usersListIsLoading.value = true
  const response = await accomplishmentStore.fetchUsers(searchQuery.value, paginationLimit)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  usersListIsLoading.value = false

  rolesOptionsIsLoading.value = true
  await rolesStore.fetchRoles()
  rolesOptionsIsLoading.value = false
})

/** Pagination */
const pagination = ref<ApiResponsePagination | null>(null)
const handlePaginationPageChange = async (event: PageState) => {
  const pageSelected = event.page + 1 // The page state object starts at 0

  usersListIsLoading.value = true
  const response = await accomplishmentStore.fetchUsers(searchQuery.value, paginationLimit, pageSelected)

  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }

  usersListIsLoading.value = false
}
/** End of Pagination */

/** Search and Filters */
const roleFilter = ref<number | null>(null)
const searchQuery = ref<string | null>(null)
watch(
  () => roleFilter.value,
  async () => {
    usersListIsLoading.value = true
    searchQuery.value = null // We clear the search query
    const response = await accomplishmentStore.fetchUsers(paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    usersListIsLoading.value = false
  }
)

const handleSearchUser = async () => {
  // We do regular fetch if the query is null / empty
  usersListIsLoading.value = true
  if (!searchQuery.value) {
    const response = await accomplishmentStore.fetchUsers(searchQuery.value, paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    return (usersListIsLoading.value = false)
  }

  // Handle the search if the search query
  const response = await accomplishmentStore.fetchUsers(searchQuery.value)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
    searchQuery.value = null
  }

  usersListIsLoading.value = false
}
</script>

<template>
  <div class="mx-auto flex h-[100%] w-full flex-col">
    <!-- Start Filters & Controls -->
    <Card class="h-full">
      <template #content>
        <div
          class="my-6 flex w-full flex-col items-center justify-between gap-4 rounded-lg bg-surface-0 px-6 py-6 dark:bg-surface-800 md:my-4 md:flex-row md:px-4 md:py-4"
        >
          <!-- Start Create User Button -->
          <!-- Start Create User Button -->
          <h2 class="mb-2 mr-4 whitespace-nowrap text-xl font-semibold text-gray-800 dark:text-white sm:text-2xl md:text-xl">
            Accomplishment Reports
          </h2>
          <div class="flex w-full items-center justify-end gap-4">
            <div class="gap-4 whitespace-nowrap md:w-auto">
              <Button
                icon="pi pi-filter-fill"
                v-tooltip.top="'Filter Accomplishments'"
                severity="info"
                size="large"
                class="mr-2 border border-blue-400 text-lg font-semibold text-primary-400 dark:text-primary-100 sm:text-primary-400 md:text-primary-400 lg:text-primary-400 dark:lg:text-primary-400"
                text
                @click="$router.push({ name: 'sign-up' })"
              />

              <Button
                icon="pi pi-plus"
                v-tooltip.top="'Create Accomplishments'"
                severity="info"
                size="large"
                class="border border-blue-400 text-lg font-semibold text-primary-400 dark:text-primary-100 sm:text-primary-400 md:text-primary-400 lg:text-primary-400 dark:lg:text-primary-400"
                text
                @click="$router.push({ name: 'create-accomplishment-report' })"
              />
            </div>

            <div class="flex w-full md:w-auto lg:w-1/3">
              <InputGroup v-model="searchQuery" class="w-full">
                <InputText
                  v-model="searchQuery"
                  placeholder="Search via Period or Accomplishment"
                  class="w-full"
                  :disabled="usersListIsLoading"
                  @keyup.enter="handleSearchUser"
                />
                <Button
                  icon="pi pi-search"
                  @click="handleSearchUser"
                  :loading="usersListIsLoading"
                  :disabled="usersListIsLoading"
                />
              </InputGroup>
            </div>
          </div>
        </div>
        <!-- End Filters & Controls -->
        <!-- Start Data Table -->
        <div v-if="!usersListIsLoading && pagination?.total" class="mx-auto flex h-[100%] w-full flex-col">
          <div class="mx-auto flex h-[100%] w-full flex-col">
            <div class="flex flex-col md:flex-row"></div>
            <DataTable :value="accomplishmentStore.users" class="mt-6" dataKey="id">
              <Column
                field="Code"
                header="Accomplishment Period"
                headerStyle="width: 500px; background-color: #E9ECEF; opacity: 0.7; font-weight: bold;"
              >
                <template #body="props">
                  <p class="font-semibold uppercase text-surface-600">
                    {{ props.data.email }}
                  </p>
                </template>
              </Column>
              <Column
                field="Name"
                header="Last Edited"
                headerStyle=" width: 400px; background-color: #E9ECEF; opacity: 0.7; font-weight: bold;"
              >
                <template #body="props">
                  <p class="uppercase text-surface-600">
                    {{ props.data.user_profile.first_name }}
                  </p>
                </template>
              </Column>
              <Column
                field="Parent Code"
                header="Status"
                headerStyle="width: 400px; background-color: #E9ECEF; opacity: 0.7; font-weight: bold;"
              >
                <template #body="props">
                  <span> {{ props.data.role }}</span>
                </template>
              </Column>
              <Column field="action" header="Actions" headerStyle="background-color: #E9ECEF; opacity: 0.7; font-weight: bold; ">
                <template #body="props">
                  <div class="gap-4 whitespace-nowrap md:w-auto">
                    <Button
                      :user="props.data"
                      icon="pi pi-eye"
                      v-tooltip.top="'View Accomplishments'"
                      severity="info"
                      class="border-none text-lg font-semibold text-primary-900 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
                      text
                      @click="$router.push({ name: 'sign-up' })"
                    />
                    <Button
                      :user="props.data"
                      icon="pi pi-file-word"
                      v-tooltip.top="'Export to MS Word'"
                      severity="info"
                      class="border-none text-lg font-semibold text-primary-900 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
                      text
                      @click="$router.push({ name: 'sign-up' })"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
          </div>
        </div>
        <!-- End Data Table -->
        <!-- Start No Users Message -->
        <div v-if="!usersListIsLoading && !pagination?.total" class="mx-auto flex h-[100%] w-full flex-col">
          <Card class="w-full p-0 shadow-none">
            <template #content>
              <div class="flex flex-col items-center sm:flex-col md:flex-col">
                <div><img src="@/assets/image/AR.png" width="500" class="mx-auto my-1" /></div>
                <h2 class="mb-2 mt-4 flex w-full justify-center text-xl font-semibold text-gray-800 dark:text-white sm:text-2xl">
                  You have no accomplishments
                </h2>
                <h1 class="mb-4 text-base text-gray-600 dark:text-gray-400 sm:text-lg">
                  Accomplishment Reports created by you shall appear here.
                </h1>
                <div class="mt-4 flex w-full justify-center">
                  <Button
                    label="New Accomplishment Report"
                    severity="primary"
                    outlined
                    @click="$router.push({ name: 'create-accomplishment-report' })"
                    class="border border-blue-400 text-lg font-semibold text-primary-400 dark:text-primary-100 sm:text-primary-400 md:text-primary-400 lg:text-primary-400 dark:lg:text-primary-400"
                  >
                    <template #icon>
                      <i class="pi pi-plus mr-2" />
                    </template>
                  </Button>
                </div>
              </div>
            </template>
          </Card>
        </div>
        <!-- End No Users Message -->
        <!-- Start Loading State -->
        <div v-if="usersListIsLoading" class="flex min-h-56 animate-pulse flex-col items-center justify-center">
          <i class="pi pi-spinner animate-spin text-xl text-surface-400" />
        </div>
        <!-- End Loading State -->
        <!-- Start Pagination -->
        <div class="mt-6 flex w-full justify-center md:mt-10">
          <Paginator
            v-if="pagination && pagination.total > 0"
            :rows="pagination.per_page"
            :total-records="pagination.total"
            template="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
            @page="(event: PageState) => handlePaginationPageChange(event)"
            class="bg-gray-900 text-xs md:text-sm"
          >
          </Paginator>
        </div>
        <!-- End Pagination -->
      </template>
    </Card>
  </div>
</template>
