<script setup lang="ts">
import { onBeforeMount, ref, computed } from 'vue'
import { useProfileStore } from '@/stores/profile.store.ts'
import { useRoute } from 'vue-router'
import { usePdsStore } from '@/stores/pds.store'

import C1Form from '@/components/pds/C1Form.vue'
import C2Form from '@/components/pds/C2Form.vue'
import C3Form from '@/components/pds/C3Form.vue'
import C4Form from '@/components/pds/C4Form.vue'

import { lcFirst } from '@/utils/helpers.ts'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/vue'
import { TransitionRoot } from '@headlessui/vue'
import Button from 'primevue/button'

const route = useRoute()
const isMyPds = route.name === 'my-pds'
const isEditMode = computed(() => !!route.params.id)
const pdsStore = usePdsStore()
const profileStore = useProfileStore()
const isC1Loading = ref(false)

const c1FormRef = ref()
const c2FormRef = ref()
const c3FormRef = ref()
const c4FormRef = ref()

onBeforeMount(async () => {
  await profileStore.fetchProfile()
  if (route.query.mode === 'via-manual-input') {
    pdsStore.pdsMode = route.query.mode.replace(/-/g, ' ').replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase())
  }
})

const isSubmitting = ref(false)

const handleSubmit = async () => {
  isSubmitting.value = true

  try {
    const resultC1 = await c1FormRef.value?.handleSaveC1Form?.()
    if (resultC1?.valid === false) return

    const resultC2 = await c2FormRef.value?.handleSaveC2Form?.()
    if (resultC2?.valid === false) return

    const resultC3 = await c3FormRef.value?.handleSaveC3Form?.()
    if (resultC3?.valid === false) return

    const resultC4 = await c4FormRef.value?.handleSaveC4Form?.()
    if (resultC4?.valid === false) return

    window.location.reload()
  } finally {
    isSubmitting.value = false
  }
}

const handleUpdate = async () => {
  isSubmitting.value = true

  try {
    const promises = [
      // c1FormRef.value?.updateC1Form?.(),
      c2FormRef.value?.updateC2Form?.(),
      c3FormRef.value?.updateC3Form?.(),
      c4FormRef.value?.updateC4Form?.(),
    ].filter(Boolean)

    const results = await Promise.all(promises)

    for (const result of results) {
      if (result?.valid === false) return
    }

    // window.location.reload()
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="flex h-full w-full flex-col shadow-md">
    <div class="h-full w-full rounded-md bg-surface-0 p-6">
      <div
        class="flex flex-row items-center justify-between space-x-4 font-medium text-primary-700 dark:text-primary-100 md:ml-4 md:mt-2"
      >
        <!-- Icon + Text -->
        <div class="flex flex-row items-center space-x-4">
          <FontAwesomeIcon :icon="['fas', 'users']" class="text-2xl md:text-4xl" />
          <span class="flex flex-col justify-center">
            <p class="text-xl md:text-3xl">Personal Data Sheet</p>
            <p class="text-surface-500">{{ lcFirst(pdsStore.pdsMode) }}</p>
          </span>
        </div>

        <!-- Button aligned right -->
        <div class="ml-auto">
          <div>
            <!-- Show Save button only if NO id -->
            <Button
              v-if="!isMyPds && !isEditMode"
              label="Save PDS"
              @click.prevent="handleSubmit"
              :loading="isC1Loading"
              type="button"
              size="large"
              class="dark:text-secondary-100 mt-4 w-full border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
              text
            >
              <template #icon>
                <i class="pi pi-save mr-2"></i>
              </template>
            </Button>

            <!-- Show Update button only if id exists -->
            <Button
              v-if="!isMyPds && isEditMode"
              label="Update PDS"
              @click.prevent="handleUpdate"
              :loading="isC1Loading"
              type="button"
              size="large"
              class="dark:text-secondary-100 mt-4 w-full border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
              text
            >
              <template #icon>
                <i class="pi pi-save mr-2"></i>
              </template>
            </Button>
          </div>
        </div>
      </div>

      <div class="mt-6 flex flex-col">
        <div class="w-full">
          <TabGroup>
            <TabList class="flex">
              <Tab v-slot="{ selected }" as="template">
                <button
                  :class="[
                    'w-full border-b-2 border-solid py-4 text-sm font-medium leading-5 ring-transparent transition-all duration-300 ease-in-out focus:outline-none md:text-base',
                    selected
                      ? 'border-b-2 border-solid border-primary-600 bg-primary-100 text-primary-600'
                      : 'border-surface-300 text-surface-400 hover:bg-surface-0/[0.12]',
                  ]"
                >
                  C1
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
                  C2
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
                  C3
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
                  C4
                </button>
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel>
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
                  <C1Form ref="c1FormRef" :activeSubTab="0" />
                </TransitionRoot>
              </TabPanel>
              <TabPanel>
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
                  <C2Form ref="c2FormRef" :activeSubTab="0" />
                </TransitionRoot>
              </TabPanel>
              <TabPanel>
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
                  <C3Form ref="c3FormRef" :activeSubTab="0" />
                </TransitionRoot>
              </TabPanel>
              <TabPanel>
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
                  <C4Form ref="c4FormRef" :activeSubTab="0" />
                </TransitionRoot>
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </div>
      </div>
    </div>
  </div>
</template>
