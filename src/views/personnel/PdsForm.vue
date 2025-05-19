<script setup lang="ts">
import { onBeforeMount, onMounted, ref, shallowRef } from 'vue'
import { useProfileStore } from '@/stores/profile.store.ts'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/vue'
import { TransitionRoot } from '@headlessui/vue'
import C1Form from '@/components/pds/C1Form.vue'
import { useRoute } from 'vue-router'
import { lcFirst } from '@/utils/helpers.ts'

const route = useRoute()

import { useEmployeeEntryStore } from '@/stores/employee-entry.store.ts'

const personnelStore = useEmployeeEntryStore()

const pdsSections = ref([
  { name: 'C1', component: shallowRef(C1Form) },
  { name: 'C2', component: shallowRef(C1Form) },
  { name: 'C3', component: shallowRef(C1Form) },
  { name: 'C4', component: shallowRef(C1Form) },
])

const profileStore = useProfileStore()

onBeforeMount(async () => {
  await profileStore.fetchProfile()

  if (route.query.mode === 'via-manual-input') {
    personnelStore.pdsMode = route.query.mode.replace(/-/g, ' ').replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase())
  }
})

</script>

<template>
  <div class="flex h-full w-full flex-col shadow-md">
    <div class="h-full w-full rounded-md bg-surface-0 p-6">
      <div
        class="flex flex-row items-center space-x-4 font-medium text-primary-700 dark:text-primary-100 md:ml-4 md:mt-2 md:flex-row"
      >
        <FontAwesomeIcon :icon="['fas', 'users']" class="text-2xl md:text-4xl" />
        <span class="flex flex-col justify-center">
          <p class="text-xl md:text-3xl">Personal Data Sheet</p>
          <p class="text-surface-500">{{ lcFirst(personnelStore.pdsMode) }}</p>
        </span>
      </div>

      <div class="mt-6 flex flex-col">
        <div class="w-full">
          <TabGroup>
            <TabList class="flex">
              <Tab v-for="pdsPage in pdsSections" as="template" :key="pdsPage.name" v-slot="{ selected }">
                <button
                  :class="[
                    'w-full  border-b-2 border-solid py-4 text-sm font-medium leading-5 ring-transparent transition-all duration-300 ease-in-out focus:outline-none md:text-base ',
                    selected
                      ? 'border-b-2 border-solid border-primary-600 bg-primary-100 text-primary-600'
                      : 'border-surface-300 text-surface-400 hover:bg-white/[0.12]',
                  ]"
                >
                  {{ pdsPage.name }}
                </button>
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel
                v-for="(pdsPage, idx) in pdsSections"
                :key="idx"
                :class="['h-full w-full', 'r ring-white/60 focus:outline-none ']"
              >
                <TransitionRoot
                  appear
                  :show="true"
                  enter="transition-all ease-in-out duration-500 "
                  enterFrom="opacity-0 translate-y-6"
                  enterTo="opacity-100 translate-y-0"
                  leave="transition-all ease-in-out duration-800"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <component :is="pdsPage.component" :activeSubTab="0" />
                </TransitionRoot>
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </div>
      </div>
    </div>
  </div>
</template>
