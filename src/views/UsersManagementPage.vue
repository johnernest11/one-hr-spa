<script setup lang="ts">
import Paginator, { PageState } from 'primevue/paginator'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
import InputGroup from 'primevue/inputgroup'
import { onBeforeMount, ref, watch } from 'vue'
import { useUsersStore } from '@/stores/users.store.ts'
import { ApiResponsePagination } from '@/typings/http-resources.types.ts'
import UserCard from '@/components/users-management-page/UserCard.vue'
import { useRolesStore } from '@/stores/roles.store.ts'
import { useToast } from 'primevue/usetoast'

/** Initial Users Fetch & Role Options */
const usersStore = useUsersStore()
const usersListIsLoading = ref(false)
const rolesStore = useRolesStore()
const rolesOptionsIsLoading = ref(false)
const paginationLimit = 12
onBeforeMount(async () => {
  usersListIsLoading.value = true
  const response = await usersStore.fetchUsers(roleFilter.value, paginationLimit)
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
  const response = await usersStore.fetchUsers(roleFilter.value, paginationLimit, pageSelected)

  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }

  usersListIsLoading.value = false
}

/** Search and Filters */
const roleFilter = ref<number | null>(null)
const searchQuery = ref<string | null>(null)
watch(
  () => roleFilter.value,
  async () => {
    usersListIsLoading.value = true
    searchQuery.value = null // We clear the search query
    const response = await usersStore.fetchUsers(roleFilter.value, paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    usersListIsLoading.value = false
  }
)

const toast = useToast()
const handleSearchUser = async () => {
  // We do regular fetch if the query is null / empty
  usersListIsLoading.value = true
  if (!searchQuery.value) {
    const response = await usersStore.fetchUsers(roleFilter.value, paginationLimit)
    if (response.success && response.pagination) {
      pagination.value = response.pagination
    }
    return (usersListIsLoading.value = false)
  }

  // Handle the search if the search query
  const response = await usersStore.searchUsers(searchQuery.value)
  if (response.success && response.pagination) {
    pagination.value = response.pagination
    roleFilter.value = null
    toast.add({
      severity: 'success',
      summary: 'Search Users',
      detail: 'Note that role filters are ignored',
      life: 4000,
    })
  }

  usersListIsLoading.value = false
}
</script>

<template>
  <div class="mx-auto flex h-[100%] w-full flex-col">
    <!-- Start Filters & Controls -->
    <div
      class="my-6 flex w-full flex-col items-center justify-between gap-4 rounded-lg bg-surface-0 px-6 py-6 shadow-sm dark:bg-surface-800 md:my-4 md:flex-row md:px-4 md:py-4"
    >
      <!-- Start Create User Button -->
      <div class="flex w-full"></div>
      <!-- End Create User Button -->
      <!-- Start Filter & Search Inputs -->
      <div class="flex w-full flex-col justify-end gap-4 md:flex-row">
        <Dropdown
          v-model="roleFilter"
          :loading="rolesOptionsIsLoading"
          :disabled="rolesOptionsIsLoading"
          :options="rolesStore.roleOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Filter by Role"
          show-clear
          class="md:min-w-52"
        >
          <template #loadingicon>
            <i class="pi pi-spinner mr-2 animate-spin" />
          </template>
        </Dropdown>
        <InputGroup v-model="searchQuery">
          <InputText
            v-model="searchQuery"
            placeholder="Search by name or email"
            class="w-full md:min-w-36"
            :disabled="usersListIsLoading"
            @keyup.enter="handleSearchUser"
          />
          <Button icon="pi pi-search" @click="handleSearchUser" :loading="usersListIsLoading" :disabled="usersListIsLoading" />
        </InputGroup>
      </div>
      <!-- End Filter & Search Inputs -->
    </div>
    <!-- End Filters & Controls -->
    <!-- Start User Cards -->
    <div
      v-if="!usersListIsLoading"
      class="mt-6 grid grid-cols-1 gap-x-4 gap-y-10 rounded-2xl md:mt-8 md:grid-cols-3 lg:grid-cols-4"
    >
      <UserCard
        v-for="user in usersStore.users"
        :key="user.id"
        :user="user"
        :role-filter="roleFilter"
        class="transition-all hover:scale-105 hover:cursor-pointer hover:shadow-xl"
      />
    </div>
    <div
      v-if="usersListIsLoading"
      class="mt-6 grid grid-cols-1 gap-x-4 gap-y-12 rounded-2xl md:mt-8 md:grid-cols-3 lg:grid-cols-4"
    >
      <div
        v-for="i in 4"
        :key="i"
        class="flex min-h-56 animate-pulse flex-col items-center justify-center rounded-lg bg-surface-100 p-1 shadow-md dark:bg-surface-800"
      >
        <i class="pi pi-spinner animate-spin text-lg text-surface-400" />
      </div>
    </div>
    <!-- End User Cards -->
    <!-- Start Pagination -->
    <div class="mt-6 flex w-full justify-center md:mt-10">
      <Paginator
        v-if="pagination && pagination.total > 0"
        :rows="pagination.per_page"
        :total-records="pagination.total"
        template="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
        @page="(event: PageState) => handlePaginationPageChange(event)"
        class="text-xs md:text-sm"
      />
    </div>
    <!-- End Pagination -->
    <!-- Start No Users Message -->
    <div
      v-if="!usersListIsLoading && !pagination?.total"
      class="flex w-fit flex-col items-center self-center font-menu text-lg dark:text-surface-300"
    >
      <i class="pi pi-exclamation-triangle text-2xl"></i>
      <p class="mt-2">No users found</p>
    </div>
    <!-- End No Users Message -->
  </div>
</template>
