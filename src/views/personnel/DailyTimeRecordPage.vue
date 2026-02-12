<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import { TabGroup, TabList, Tab, TabPanels, TabPanel, TransitionRoot } from '@headlessui/vue'
// Update the path below if your DTRForm.vue is located elsewhere
import DTRForm from '../../components/dtr/DTRForm.vue'
import WarmBodiesList from '../../components/dtr/WarmBodiesList.vue'

const mainDTRSections = ref([
  { name: 'Daily Time Record', component: shallowRef(DTRForm) },
  { name: 'Attendance Tracker', component: shallowRef(WarmBodiesList) },
])

const selectedMainTabIndex = ref(1)

const handleMainTabChange = (index: number) => {
  selectedMainTabIndex.value = index
}
</script>

<template>
  <div class="flex h-full w-full flex-col shadow-md">
    <div class="h-full w-full rounded-md bg-white p-6">
      <div class="mt-6 flex flex-col">
        <div class="w-full">
          <TabGroup :selected-index="selectedMainTabIndex" @change="handleMainTabChange">
            <!-- TabList must be a direct child of TabGroup -->
            <TabList class="flex">
              <Tab v-for="(mainSection, idx) in mainDTRSections" :key="idx" as="template" v-slot="{ selected }">
                <button
                  :class="[
                    'w-full border-b-2 border-solid py-4 text-sm font-medium leading-5 ring-transparent transition-all duration-300 ease-in-out focus:outline-none md:text-base',
                    selected
                      ? 'border-b-2 border-solid border-blue-600 bg-blue-100 text-blue-600'
                      : 'border-gray-300 text-gray-400 hover:bg-white/[0.12]',
                  ]"
                >
                  {{ mainSection.name }}
                </button>
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel
                v-for="(mainSection, idx) in mainDTRSections"
                :key="idx"
                :class="['h-full w-full', 'ring-white/60 focus:outline-none']"
              >
                <TransitionRoot
                  appear
                  :show="true"
                  enter="transition-all ease-in-out duration-500"
                  enterFrom="opacity-0 translate-y-6"
                  enterTo="opacity-100 translate-y-0"
                  leave="transition-all ease-in-out duration-800"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <!-- Dynamically render the component based on the selected tab -->
                  <component :is="mainSection.component" />
                </TransitionRoot>
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </div>
      </div>
    </div>
  </div>
</template>
