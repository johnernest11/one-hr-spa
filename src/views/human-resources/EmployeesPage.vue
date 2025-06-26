<script setup lang="ts">
import { onBeforeMount, ref, computed } from 'vue'
import { TransitionRoot } from '@headlessui/vue'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import InputGroup from 'primevue/inputgroup'
import InputText from 'primevue/inputtext'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import { ApiResponsePagination } from '@/typings/http-resources.types.ts'
import { useAuthStore } from '@/stores/auth.store.ts'
import { usePersonnelStore } from '@/stores/personnel.store'
import { sleep } from '@/utils/helpers'
const personnelStore = usePersonnelStore()

const columnWidths = ['w-32', 'w-24', 'w-64', 'w-24', 'w-40', 'w-32', 'w-48']
const searchQuery = ref('')
const menu = ref()
const items = ref([
  {
    items: [
      {
        label: 'via Manual Input',
        mode: 'via-manual-input',
        to: 'create-personnel',
      },
      {
        label: 'via PDS Importation',
        mode: 'via-pds-importation',
        to: 'dashboard' /** abang */,
      },
    ],
  },
])
const pagination = ref<ApiResponsePagination | null>(null)

onBeforeMount(async () => {
  await sleep(1)
  const response = await personnelStore.fetchEmployees()
  if (response.success && response.pagination) {
    pagination.value = response.pagination
  }
  personnelStore.isEmployeesLoading = false
})
const authStore = useAuthStore()

const canCreateNewEmployee = computed(() => {
  return authStore.authHasRequiredRole(['hr_ppms_admin', 'admin', 'super_user'])
})

const toggleAddingList = (event: Event) => {
  menu.value.toggle(event)
}

const handleSearchEmployee = () => {
  console.log(123)
}
</script>

<template>
  <div class="mx-auto flex h-full w-full flex-col">
    <div
      :class="[
        'h-full w-full rounded-md bg-surface-0 ',
        personnelStore.isEmployeesLoading ? '' : 'flex flex-col p-6',
        personnelStore.employees.length === 0 ? 'justify-center' : '',
      ]"
    >
      <template v-if="!personnelStore.isEmployeesLoading">
        <template v-if="personnelStore.employees.length === 0">
          <TransitionRoot
            appear
            :show="true"
            enter="transition-all ease-in-out duration-500 delay-[250ms]"
            enterFrom="opacity-0 translate-y-6"
            enterTo="opacity-100 translate-y-0"
            leave="transition-all ease-in-out duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div class="flex h-full flex-col items-center justify-center p-4 text-center lg:p-0">
              <div class="flex h-full flex-col items-center justify-center">
                <img src="@/assets/image/no-employees.svg" class="h-56 w-auto" />
                <h1 class="text-xl font-bold text-surface-600 lg:text-2xl">No Employees</h1>
                <p class="text-md text-surface-600 lg:text-lg">List of employees shall appear here.</p>

                <div v-if="canCreateNewEmployee" class="mt-4">
                  <Button size="large" outlined severity="info" class="rounded-sm" @click="toggleAddingList">
                    <template #icon>
                      <FontAwesomeIcon icon="fa-solid fa-plus" class="mr-1.5 h-4 w-4" />
                      <span class="lg:text-md text-sm">New Employee</span>
                    </template>
                  </Button>
                  <Menu ref="menu" id="overlay_menu" :model="items" :popup="true">
                    <template #item="{ item }">
                      <RouterLink :to="{ name: item.to, query: { mode: item.mode } }">
                        <span class="ml-2">{{ item.label }}</span>
                      </RouterLink>
                    </template>
                  </Menu>
                </div>
              </div>
            </div>
          </TransitionRoot>
        </template>
        <template v-else>
          <TransitionRoot
            appear
            :show="true"
            enter="transition-all ease-in-out duration-500 delay-[250ms]"
            enterFrom="opacity-0 translate-y-6"
            enterTo="opacity-100 translate-y-0"
            leave="transition-all ease-in-out duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div
              class="flex flex-row items-center space-x-4 font-medium text-primary-700 dark:text-primary-100 md:ml-4 md:mt-2 md:flex-row"
            >
              <FontAwesomeIcon :icon="['fas', 'users']" class="text-2xl md:text-4xl" />
              <span class="flex flex-col justify-center">
                <p class="text-xl md:text-3xl">Employees</p>
              </span>

              <div class="flex w-full items-center justify-end gap-4">
                <div class="flex space-x-2 whitespace-nowrap md:w-auto">
                  <Button
                    icon="pi pi-filter-fill"
                    v-tooltip.top="'Filter Item'"
                    severity="info"
                    size="large"
                    class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100"
                    text
                  />
                  <Button
                    icon="pi pi-plus"
                    v-tooltip.top="'New Employee'"
                    severity="info"
                    size="large"
                    class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100"
                    text
                    @click="toggleAddingList"
                  />
                  <Menu ref="menu" id="overlay_menu" :model="items" :popup="true">
                    <template #item="{ item }">
                      <RouterLink :to="{ name: item.to, query: { mode: item.mode } }">
                        <span class="ml-2">{{ item.label }}</span>
                      </RouterLink>
                    </template>
                  </Menu>
                </div>
                <div class="flex w-full md:w-auto lg:w-1/2">
                  <InputGroup v-model="searchQuery" class="w-full">
                    <InputText
                      v-model="searchQuery"
                      placeholder="Search Item Number"
                      class="w-full"
                      :disabled="personnelStore.isEmployeesLoading"
                      @keyup.enter="handleSearchEmployee"
                    />
                    <Button icon="pi pi-search" @click="handleSearchEmployee" />
                  </InputGroup>
                </div>
              </div>
            </div>
            <DataTable :value="personnelStore.employees" stripedRows class="mt-24" dataKey="id">
              <Column headerClass="w-64 bg-surface-100 border-surface-300 opacity-70 font-bold py-2">
                <template #header>
                  <div>
                    Name <br />
                    Item Number
                  </div>
                </template>
                <template #body="props">
                  <p class="font-semibold uppercase text-surface-500">
                    {{ props.data.first_name }} {{ props.data.middle_name ?? null }} {{ props.data.last_name }}
                    {{ props.data.ext_name ?? null }}
                  </p>
                  <p class="font-semibold uppercase text-surface-500">
                    {{ props.data.employee.item.number }}
                  </p>
                </template>
              </Column>
              <Column
                field="employee.item.position.title"
                header="Position / Designation"
                headerClass=" w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              >
              </Column>
              <Column
                field="individual_contact_info.email_address"
                header="Email Address"
                headerClass="w-64 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
              ></Column>
              <Column field="action" header="Actions" headerClass="w-64 bg-surface-100 opacity-70 font-bold py-2">
                <template #body="">
                  <div class="flex gap-4 whitespace-nowrap md:w-auto">
                    <Button
                      icon="pi pi-eye"
                      v-tooltip.top="'View Employee'"
                      severity="info"
                      class="border-none text-lg font-semibold text-primary-600 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
                      text
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
          </TransitionRoot>
        </template>
      </template>
      <template v-else>
        <div class="w-full">
          <div class="overflow-auto">
            <div role="table" class="animate-pulse">
              <table class="w-full">
                <thead class="bg-surface-0">
                  <tr class="border-[1px] border-surface-300">
                    <td v-for="(width, index) in columnWidths" :key="'header-' + index">
                      <div class="mx-4 mt-4 h-2.5 rounded-full bg-surface-300" :class="width + ' mb-4'"></div>
                    </td>
                  </tr>
                </thead>
                <tbody class="bg-surface-100">
                  <tr v-for="row in 15" :key="'row-' + row" class="border-[1px] border-t-0 border-surface-300">
                    <td v-for="(width, index) in columnWidths" :key="'row-' + row + '-col-' + index">
                      <div class="mx-4 mt-4 h-2.5 rounded-full bg-surface-300" :class="width + ' mb-4'"></div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
