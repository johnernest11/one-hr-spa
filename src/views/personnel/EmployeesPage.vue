<script setup lang="ts">
import { onBeforeMount, ref } from 'vue'
import { useEmployeeEntryStore } from '@/stores/employee-entry.store.ts'
import { TransitionRoot } from '@headlessui/vue'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { sleep } from '@/utils/helpers.ts'

const personnelStore = useEmployeeEntryStore()

const columnWidths = ['w-32', 'w-24', 'w-64', 'w-24', 'w-40', 'w-32', 'w-48']
const menu = ref()
const items = ref([
  {
    items: [
      {
        label: 'via Manual Input',
        to: 'create-personnel',
        command: () => {
          personnelStore.pdsMode = 'via Manual Input'
        },
      },
      {
        label: 'via PDS Importation',
        to: 'dashboard' /** abang */,
        command: () => {
          personnelStore.pdsMode = 'via PDS Import'
        },
      },
    ],
  },
])

const toggleAddingList = (event: Event) => {
  menu.value.toggle(event)
}

onBeforeMount(async () => {
  await sleep(2)
  personnelStore.isEmployeesLoading = false
})
</script>

<template>
  <div class="mx-auto flex h-full w-full flex-col">
    <div
      :class="['h-full w-full rounded-md bg-surface-0', personnelStore.isEmployeesLoading ? '' : 'flex flex-col justify-center']"
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

                <div class="mt-4">
                  <Button size="large" outlined severity="info" class="rounded-sm" @click="toggleAddingList">
                    <template #icon>
                      <FontAwesomeIcon icon="fa-solid fa-plus" class="mr-1.5 h-4 w-4" />
                      <span class="lg:text-md text-sm">New Employee</span>
                    </template>
                  </Button>
                  <Menu ref="menu" id="overlay_menu" :model="items" :popup="true">
                    <template #item="{ item, props }">
                      <RouterLink :to="{ name: item.to }" v-bind="props.action">
                        <span class="ml-2">{{ item.label }}</span>
                      </RouterLink>
                    </template>
                  </Menu>
                </div>
              </div>
            </div>
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
