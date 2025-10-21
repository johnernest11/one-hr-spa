<script setup lang="ts">
import { ref } from 'vue'

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/vue'
import DistributionSocialWorkerPage from './DistributionSocialWorkerPage.vue'
import DistributionStaffPositionLevelPage from './DistributionStaffPositionLevelPage.vue'
import DistributionFilledPositionClusterPage from './DistributionFilledPositionClusterPage.vue'
import DistributionManagementLevelPage from './DistributionManagementLevelPage.vue'

const distributionSocialWorker = ref()
const distributionFilledPositionCluster = ref()
const distributionStaffPositionLevel = ref()
const distributionManagementLevel = ref()
</script>

<template>
  <div class="flex h-full w-full flex-col">
    <div class="h-full w-full rounded-md bg-surface-0 p-6">
      <div
        class="flex flex-row items-center justify-between space-x-4 font-medium text-primary-700 dark:text-primary-100 md:ml-4 md:mt-2"
      >
        <!-- Icon + Text -->
        <div class="flex flex-row items-center space-x-4">
          <FontAwesomeIcon :icon="['fas', 'users']" class="text-2xl md:text-4xl" />
          <span class="flex flex-col justify-center">
            <p class="text-xl md:text-3xl">Staffs Distribution</p>
          </span>
        </div>
      </div>

      <div class="mt-6 flex flex-col">
        <div class="w-full">
          <TabGroup>
            <TabList class="flex">
              <Tab v-slot="{ selected }" as="template">
                <button
                  :class="[
                    'w-full border-b-2 border-solid py-2 text-sm font-medium leading-5 ring-transparent transition-all duration-300 ease-in-out focus:outline-none md:text-base',
                    selected
                      ? 'border-b-2 border-solid border-primary-600 bg-primary-100 text-primary-600'
                      : 'border-surface-300 text-surface-400 hover:bg-surface-0/[0.12]',
                  ]"
                >
                  Social Worker
                </button>
              </Tab>
              <Tab v-slot="{ selected }" as="template">
                <button
                  :class="[
                    'w-full border-b-2 border-solid py-4 text-sm font-medium leading-5 ring-transparent transition-all duration-300 ease-in-out focus:outline-none md:text-base',
                    selected
                      ? 'border-b-2 border-solid border-primary-600 bg-primary-100 text-primary-600'
                      : 'border-surface-300 text-surface-400 hover:bg-surface-0/[0.12]',
                  ]"
                >
                  Filled Position per Cluster
                </button>
              </Tab>
              <Tab v-slot="{ selected }" as="template">
                <button
                  :class="[
                    'w-full border-b-2 border-solid py-4 text-sm font-medium leading-5 ring-transparent transition-all duration-300 ease-in-out focus:outline-none md:text-base',
                    selected
                      ? 'border-b-2 border-solid border-primary-600 bg-primary-100 text-primary-600'
                      : 'border-surface-300 text-surface-400 hover:bg-surface-0/[0.12]',
                  ]"
                >
                  Staff Per Position Level
                </button>
              </Tab>
              <Tab v-slot="{ selected }" as="template">
                <button
                  :class="[
                    'w-full border-b-2 border-solid py-4 text-sm font-medium leading-5 ring-transparent transition-all duration-300 ease-in-out focus:outline-none md:text-base',
                    selected
                      ? 'border-b-2 border-solid border-primary-600 bg-primary-100 text-primary-600'
                      : 'border-surface-300 text-surface-400 hover:bg-surface-0/[0.12]',
                  ]"
                >
                  Management Level
                </button>
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel :static="true" v-slot="{ selected }">
                <div v-show="selected"><DistributionSocialWorkerPage ref="distributionSocialWorker" /></div>
              </TabPanel>
              <TabPanel :static="true" v-slot="{ selected }">
                <div v-show="selected"><DistributionFilledPositionClusterPage ref="distributionFilledPositionCluster" /></div>
              </TabPanel>
              <TabPanel :static="true" v-slot="{ selected }">
                <div v-show="selected"><DistributionStaffPositionLevelPage ref="distributionStaffPositionLevel" /></div>
              </TabPanel>
              <TabPanel :static="true" v-slot="{ selected }">
                <div v-show="selected"><DistributionManagementLevelPage ref="distributionManagementLevel" /></div>
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </div>
      </div>
    </div>
  </div>
</template>
