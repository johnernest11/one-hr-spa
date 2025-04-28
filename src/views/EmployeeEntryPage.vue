<script setup lang="ts">
import Card from 'primevue/card'
import { onBeforeMount, ref } from 'vue'
import { useProfileStore } from '@/stores/profile.store.ts'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import CreateEmployeeC1Form from '@/components/employee-entry/CreateEmployeeC1Form.vue'

const activeIndex = ref(0) // Main tab index
const activeSubIndex = ref(0) // Sub-tab index (resets when switching main tabs)

const tabs = ref([{ name: 'C1', component: CreateEmployeeC1Form }])

const subTabs = ref([
  [
    { name: 'Personal Information', index: 0 },
    { name: 'Family Background', index: 1 },
    { name: 'Educational Background', index: 2 },
  ],
  [
    { name: 'Civil Service Eligibility', index: 0 },
    { name: 'Work Experience', index: 1 },
  ],
  [
    { name: 'Voluntary Work', index: 0 },
    { name: 'Learning & Development', index: 1 },
    { name: 'Other Information', index: 2 },
  ],
  [{ name: 'Other Information Cont.', index: 0 }],
])

const profileStore = useProfileStore()

onBeforeMount(async () => {
  await profileStore.fetchProfile()
})

// Reset sub-tab when changing main tabs
const switchTab = (index: number) => {
  activeIndex.value = index
  activeSubIndex.value = 0 // Reset to first sub-tab
  console.log('Tab switched to:', index, 'Sub-tab reset to:', 0)
}
</script>

<template>
  <div class="mx-auto flex h-[100%] w-full flex-col bg-surface-100">
    <div class="container mx-auto p-4">
      <Card>
        <template #content>
          <div class="flex w-full flex-col items-start md:flex-row">
            <h2 class="mb-2 ml-4 text-3xl font-semibold text-primary-800 dark:text-primary-100 md:ml-4">
              <font-awesome-icon :icon="['fas', 'users']" /> Employee Creation
            </h2>
          </div>
          <br />

          <div class="flex flex-col px-4 py-4">
            <div class="mt-6 flex flex-col">
              <div class="relative">
                <div class="flex border-b border-surface-300">
                  <span
                    v-for="(tab, index) in tabs"
                    :key="tab.name"
                    :class="[
                      'flex-grow cursor-pointer py-2 text-center',
                      activeIndex === index ? 'font-semibold text-primary-400' : 'text-surface-600',
                    ]"
                    @click="switchTab(index)"
                  >
                    {{ tab.name }}
                  </span>
                </div>
              </div>

              <div v-if="activeIndex < 4 && subTabs[activeIndex]" class="mt-2 flex justify-center">
                <div class="flex w-full border-b border-surface-300">
                  <span
                    v-for="(subTab, index) in subTabs[activeIndex]"
                    :key="subTab.name"
                    :class="[
                      'flex-grow cursor-pointer py-2 text-center',
                      activeSubIndex === index ? 'font-semibold text-primary-400' : 'italic text-surface-600',
                    ]"
                    @click="activeSubIndex = index"
                  >
                    {{ subTab.name }}
                  </span>
                </div>
              </div>

              <div class="p-4">
                <div v-if="subTabs[activeIndex] && subTabs[activeIndex][activeSubIndex]">
                  <component :is="tabs[activeIndex]?.component" :activeSubTab="activeSubIndex" />
                </div>

                <div v-else>
                  <component :is="tabs[activeIndex]?.component" />
                </div>
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>
