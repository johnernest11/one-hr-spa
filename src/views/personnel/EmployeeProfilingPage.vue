<script setup lang="ts">
/** =====================================================
 *  IMPORTS
 * ===================================================== */
import { onBeforeMount, ref, computed, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'

import { usePdsStore } from '@/stores/pds.store'
import EmployeeProfilingForm from '@/components/pds/EmployeeProfilingForm.vue'

import { lcFirst } from '@/utils/helpers.ts'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/vue'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'

/** =====================================================
 *  INITIALIZATION
 * ===================================================== */
const toast = useToast()
const route = useRoute()
const pdsStore = usePdsStore()

/** =====================================================
 *  COMPUTED STATES
 * ===================================================== */
/** Check if route is for "My Employee Profile" */
const isMyPds = computed(() => route.path.startsWith('/my-employee-profile'))

/** Check if component is in edit mode */
const isEditMode = computed(() => !!route.params.id)

/** =====================================================
 *  REACTIVE STATES
 * ===================================================== */
const isSubmitting = ref(false) /** Submit/Update loading state */
const tabsLoading = ref(true) /** Tab loading state */
const buttonsVisible = ref(false) /** Controls button visibility */
const selectedTab = ref(0) /** Active tab index */

/** =====================================================
 *  FORM REFERENCES
 * ===================================================== */
const employeeProfileFormRef = ref()

/** =====================================================
 *  COMPONENT KEYS (FOR TAB RELOAD)
 * ===================================================== */
const employeeProfileKey = ref(0)

/** =====================================================
 *  TAB REFRESH FUNCTION
 * ===================================================== */
/** Forces tab components to reload by updating keys. Also handles temporary loading UI.*/
const refreshTabs = async () => {
  tabsLoading.value = true
  buttonsVisible.value = false

  employeeProfileKey.value++

  await nextTick()

  buttonsVisible.value = true
  tabsLoading.value = false
}

/** =====================================================
 *  WATCHERS
 * ===================================================== */
/** Re-run tab refresh whenever route changes*/
watch(
  () => route.fullPath,
  () => {
    refreshTabs()
  }
)

/** =====================================================
 *  LIFECYCLE HOOKS
 * ===================================================== */
/** Initialize component before mounting */
onBeforeMount(async () => {
  await refreshTabs()

  /** Handle query mode: manual input */
  if (route.query.mode === 'via-manual-input') {
    pdsStore.pdsMode = route.query.mode.replace(/-/g, ' ').replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase())
  }

  /** Handle query mode: PDS importation */
  if (route.query.mode === 'via-pds-importation') {
    pdsStore.pdsMode = route.query.mode.replace(/-/g, ' ').replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase())
  }
})

/** =====================================================
 *  FORM SUBMISSION (CREATE)
 * ===================================================== */
/**  Validates all forms and saves data if valid */
const handleSubmit = async () => {
  isSubmitting.value = true

  try {
    /** Run validations for all forms */
    const validations = await Promise.all([employeeProfileFormRef.value?.validateForm?.()].filter(Boolean))

    /** Check if any validation failed */
    const hasInvalid = validations.some((r) => r?.valid === false)
    if (hasInvalid) return

    /** Save all forms */
    await Promise.all([employeeProfileFormRef.value?.handleSaveC1Form?.()].filter(Boolean))

    /** Success notification */
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

/** =====================================================
 *  FORM UPDATE
 * ===================================================== */
/** Validates all forms and updates data if valid  */
const handleUpdate = async () => {
  isSubmitting.value = true

  try {
    /** Validate all forms */
    const validations = await Promise.all([employeeProfileFormRef.value?.validateForm?.()].filter(Boolean))

    /** Check for validation errors */
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

    /** Update all forms */
    await Promise.all([employeeProfileFormRef.value?.updateC1Form?.()].filter(Boolean))

    /** Success notification */
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'All forms have passed validation and were updated successfully.',
      life: 3000,
    })

    /** Refresh tabs after update */
    refreshTabs()
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
            <p class="text-xl md:text-3xl">Employee Profile</p>
            <p v-if="!isEditMode" class="text-surface-500">{{ lcFirst(pdsStore.pdsMode) }}</p>
          </span>
        </div>

        <!-- Button aligned right -->
        <div class="ml-auto flex flex-row items-center gap-4" v-if="buttonsVisible">
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
          <TabGroup :selectedIndex="selectedTab" @change="selectedTab = $event">
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
                  Profile
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
                  Item
                </button>
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel :key="employeeProfileKey" :static="true" v-slot="{ selected }">
                <div v-if="selected"><EmployeeProfilingForm ref="employeeProfileFormRef" /></div>
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </div>
      </div>
    </div>
  </div>
</template>
