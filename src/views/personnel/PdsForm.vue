<script setup lang="ts">
import { onBeforeMount, ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
// import { useRouter } from 'vue-router'

import { usePdsStore } from '@/stores/pds.store'

import C1Form from '@/components/pds/C1Form.vue'
import C2Form from '@/components/pds/C2Form.vue'
import C3Form from '@/components/pds/C3Form.vue'
import C4Form from '@/components/pds/C4Form.vue'

import { lcFirst } from '@/utils/helpers.ts'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/vue'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
const toast = useToast()
const route = useRoute()
// const router = useRouter()

const isMyPds = route.name === 'my-pds'
const isEditMode = computed(() => !!route.params.id)
const pdsStore = usePdsStore()
const isSubmitting = ref(false)
const isImporting = ref(false)

const c1FormRef = ref()
const c2FormRef = ref()
const c3FormRef = ref()
const c4FormRef = ref()

const c1Key = ref(0)
const c2Key = ref(0)
const c3Key = ref(0)
const c4Key = ref(0)

/**************************************************
              Refresh/Reload the Tab
************************************************* */
const refreshTabs = () => {
  c1Key.value++
  c2Key.value++
  c3Key.value++
  c4Key.value++
}

watch(
  () => route.fullPath,
  () => {
    refreshTabs()
  }
)

onBeforeMount(async () => {
  isImporting.value = false
  if (route.query.mode === 'via-manual-input') {
    pdsStore.pdsMode = route.query.mode.replace(/-/g, ' ').replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase())
  }
  if (route.query.mode === 'via-pds-importation') {
    isImporting.value = true
    pdsStore.pdsMode = route.query.mode.replace(/-/g, ' ').replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase())
  }
})

/**************************************************
        Handle Store Creation C1-C4
************************************************* */
const handleSubmit = async () => {
  isSubmitting.value = true
  try {
    // Validate all forms first (before saving anything)
    const validations = await Promise.all(
      [
        c1FormRef.value?.validateForm?.(),
        c2FormRef.value?.validateForm?.(),
        c3FormRef.value?.validateForm?.(),
        c4FormRef.value?.validateForm?.(),
      ].filter(Boolean)
    )

    const hasInvalid = validations.some((r) => r?.valid === false)
    if (hasInvalid) {
      return
    }

    // Proceed only if all forms are valid
    await Promise.all(
      [
        c1FormRef.value?.handleSaveC1Form?.(),
        c2FormRef.value?.handleSaveC2Form?.(),
        c3FormRef.value?.handleSaveC3Form?.(),
        c4FormRef.value?.handleSaveC4Form?.(),
      ].filter(Boolean)
    )

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'All forms have passed validation and were updated successfully.',
      life: 3000,
    })
  } finally {
    isSubmitting.value = false
  }
}
/**************************************************
            Handle Update C1-C4
************************************************* */
const handleUpdate = async () => {
  isSubmitting.value = true
  try {
    // Validate all forms before proceeding
    const validations = await Promise.all(
      [
        c1FormRef.value?.validateForm?.(),
        c2FormRef.value?.validateForm?.(),
        c3FormRef.value?.validateForm?.(),
        c4FormRef.value?.validateForm?.(),
      ].filter(Boolean)
    )

    const hasValidationError = validations.some((r) => r?.valid === false)
    if (hasValidationError) {
      toast.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please check all tabs and fix validation errors before submitting.',
        life: 4000,
      })
      return
    }

    // Proceed with updates after successful validation
    await Promise.all(
      [
        c1FormRef.value?.updateC1Form?.(),
        c2FormRef.value?.updateC2Form?.(),
        c3FormRef.value?.updateC3Form?.(),
        c4FormRef.value?.updateC4Form?.(),
      ].filter(Boolean)
    )

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'All forms have passed validation and were updated successfully.',
      life: 3000,
    })
    refreshTabs()
  } finally {
    isSubmitting.value = false
  }
}

/**************************************************
      Handle Export/Generate PDS PDF
************************************************* */
const exportToPDF = async (employeeId: string) => {
  toast.add({
    severity: 'info',
    summary: 'Exporting...',
    detail: 'Exporting PDS...',
    life: 5000,
  })

  try {
    const reportResponse = await pdsStore.generatePersonalDataSheet(employeeId)

    if (!reportResponse.data.value) {
      throw new Error('No data received from the server')
    }

    const blob = new Blob([reportResponse.data.value], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url

    // Proper fallback for filename
    const fileName = reportResponse.fileNameHeader?.value || 'CS Form No. 212, Revised 2025 - Personal Data Sheet.pdf'

    a.download = fileName
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    toast.add({
      severity: 'success',
      summary: 'PDS Exported',
      detail: `The PDS for employee ${employeeId} was successfully exported.`,
      life: 5000,
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Export Failed',
      detail: `Failed to export PDS: ${(error as Error).message}`,
      life: 5000,
    })
    console.error('Export error:', error)
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
            <p v-if="isImporting" class="text-lg md:text-xl lg:text-2xl">Reviewing Imported Information</p>
            <p v-if="!isEditMode" class="text-surface-500">{{ lcFirst(pdsStore.pdsMode) }}</p>
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
              :loading="isSubmitting"
              :disabled="isSubmitting"
              type="button"
              size="large"
              class="dark:text-secondary-100 mt-4 w-full border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
              text
            >
              <template #icon>
                <i class="pi pi-save mr-2"></i>
              </template>
            </Button>
            <div class="flex w-full flex-col gap-4 md:w-auto md:flex-row md:justify-end">
              <Button
                label="Export DTR"
                @click="exportToPDF(route.params.id as string)"
                :loading="isSubmitting"
                :disabled="isSubmitting"
                class="border border-primary-400 text-base text-primary-500 dark:border-primary-700 dark:text-primary-100 lg:text-primary-500 dark:lg:text-primary-400"
                text
              >
                <template #icon>
                  <i class="pi pi-file-pdf mr-2"></i>
                </template>
              </Button>
            </div>

            <!-- Show Update button only if id exists -->
            <Button
              v-if="!isMyPds && isEditMode"
              label="Update PDS"
              @click.prevent="handleUpdate"
              :loading="isSubmitting"
              :disabled="isSubmitting"
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
              <TabPanel :key="c1Key" :static="true" v-slot="{ selected }">
                <div v-show="selected"><C1Form ref="c1FormRef" /></div>
              </TabPanel>
              <TabPanel :key="c2Key" :static="true" v-slot="{ selected }">
                <div v-show="selected"><C2Form ref="c2FormRef" /></div>
              </TabPanel>
              <TabPanel :key="c3Key" :static="true" v-slot="{ selected }">
                <div v-show="selected"><C3Form ref="c3FormRef" /></div>
              </TabPanel>
              <TabPanel :key="c4Key" :static="true" v-slot="{ selected }">
                <div v-show="selected"><C4Form ref="c4FormRef" /></div>
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </div>
      </div>
    </div>
  </div>
</template>
