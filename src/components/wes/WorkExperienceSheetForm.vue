<script setup lang="ts">
import { reactive, ref, onMounted, watch, computed } from 'vue'
import { usePdsStore, PersonalDataSheetPayload } from '@/stores/pds.store.ts'
import { useAuthStore } from '@/stores/auth.store.ts'
import { useRoute } from 'vue-router'
import WbInputText from '@/components/webkit/WbInputText.vue'
import WbTextArea from '../webkit/WbTextArea.vue'
import Button from 'primevue/button'
import { parseApiResponseError } from '@/utils/error-handle.ts'
import { TabGroup, TabPanels, TabPanel } from '@headlessui/vue'
import { formatWesDuration } from '@/utils/helpers.js'
import { TransitionRoot } from '@headlessui/vue'
import { PersonnelResponse } from '@/typings/models.types'
import { useToast } from 'primevue/usetoast'
const pdsStore = usePdsStore()
const authStore = useAuthStore()
const route = useRoute()
const pdsErrors = ref()
const toast = useToast()
const errorMessage = ref()
const isWESError = ref(false)
const IsBeingUpdated = ref(false)
const isExporting = ref(false)
const isLoading = ref(true)
const activeTab = ref(0)
const isMyPds = computed(() => route.path.startsWith('/my-pds'))
/** Payload */
const payload = reactive<PersonalDataSheetPayload>({
  ...pdsStore.pdsInfo,
})

// Add selectedEmployeeId for export
const selectedEmployeeId = computed(() => {
  return isMyPds.value
    ? authStore.authenticatedUser?.user_profile?.individual_basic_detail?.id?.toString() ?? ''
    : (route.params.id as string) ?? ''
})

/**************************************************
     PDS Details Form - Fetching by ID & Update
***************************************************/
type pdsDetailsFormProps = {
  personnelPds?: PersonnelResponse
}
const props = defineProps<pdsDetailsFormProps>()
onMounted(async () => {
  const id = (route.params.id as string) || authStore.authenticatedUser?.user_profile?.individual_basic_detail_id || null

  if (id) {
    const response = await pdsStore.fetchPdsById(id)

    if (response && response.success) {
      console.log('Fetched PDS data:', response.data)
      const data = response.data as PersonnelResponse
      pdsStore.updatePdsFromPersonnel(data)

      /** --------------------
       * Handle Work Experience
       * ------------------- */
      const workRaw = data.individual_work_experience
      payload.individual_work_experience = Array.isArray(workRaw)
        ? reactive([...workRaw])
        : workRaw
          ? reactive([workRaw])
          : reactive([])
    } else {
      console.warn('Failed to fetch PDS by ID or response unsuccessful.')
    }
  }
  isLoading.value = false
})

watch(
  () => props.personnelPds,
  (newPersonnel) => {
    if (newPersonnel) {
      pdsStore.updatePdsFromPersonnel(newPersonnel)
    } else {
      for (const key in payload.individual) {
        payload.individual[key as keyof typeof payload.individual] = null
      }
    }
  },
  { immediate: true }
)

/**************************************************
             PDS WES - UPDATE SERVICE 
***************************************************/
const updateWES = async () => {
  IsBeingUpdated.value = true

  try {
    const id = isMyPds.value
      ? authStore.authenticatedUser?.user_profile?.individual_basic_detail?.id?.toString()
      : (route.params.id as string)

    if (!id) {
      IsBeingUpdated.value = false
      return { valid: false }
    }

    const response = await pdsStore.updatePds({ ...payload }, id, 'C2')

    if (!response.success) {
      const result = parseApiResponseError(response)
      if (result) {
        isWESError.value = true
        errorMessage.value = result.message
        pdsErrors.value = result.errors
      }
      IsBeingUpdated.value = false
      return { valid: false }
    }

    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: 'Work Experience Sheet updated successfully.',
      life: 3000,
    })

    IsBeingUpdated.value = false
    return { valid: true }
  } finally {
    IsBeingUpdated.value = false
  }
}

/**************************************************
      Handle Export/Generate WES
************************************************* */
const exportToFile = async (employeeId: string) => {
  isExporting.value = true
  try {
    toast.add({
      severity: 'info',
      summary: 'Exporting...',
      detail: `Exporting Work Experience Sheet for employee ID ${employeeId}...`,
      life: 5000,
    })
    const reportResponse = await pdsStore.generateWorkExperienceSheet(employeeId)

    const blob = reportResponse.data.value

    if (blob) {
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${reportResponse.fileNameHeader.value}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.add({
        severity: 'success',
        summary: 'Work Experience Sheet Exported',
        detail: `The Work Experience Sheet for employee ID ${employeeId} was successfully exported.`,
        life: 5000,
      })
    }
  } finally {
    isExporting.value = false
  }
}
</script>
<template>
  <template v-if="!isLoading">
    <div class="flex flex-row">
      <form @submit.prevent="" autocomplete="off" class="h-full w-full">
        <div class="w-full">
          <TabGroup>
            <TabPanels>
              <!-- START WORK EXPERIENCE -->
              <TabPanel v-model:activeIndex="activeTab" :class="['my-8 md:mx-12 ', ' ring-surface-0/60 focus:outline-none ']">
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
                  <div class="flex flex-col gap-4">
                    <div
                      class="text-susrface-700 flex items-center justify-between space-x-4 font-medium dark:text-surface-100 md:ml-4 md:mt-2 md:flex-row"
                    >
                      <h1
                        class="mb-2 mr-4 whitespace-nowrap text-xl text-surface-700 dark:text-primary-100 md:text-xl lg:text-3xl"
                      >
                        My Work Experience Sheet
                      </h1>
                      <!-- Button aligned to the end -->
                      <div class="flex w-full flex-col gap-4 md:w-auto md:flex-row md:justify-end">
                        <!-- Show Save button only if NO id -->
                        <div>
                          <Button
                            v-if="isMyPds"
                            @click.prevent="updateWES"
                            :loading="IsBeingUpdated"
                            :disabled="IsBeingUpdated || isExporting"
                            label="Update WES"
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
                        <div class="flex w-full flex-col gap-4 md:w-auto md:flex-row md:justify-end">
                          <Button
                            label="Export WES"
                            @click="exportToFile(selectedEmployeeId)"
                            :loading="isExporting"
                            :disabled="isExporting || IsBeingUpdated"
                            size="large"
                            class="dark:text-secondary-100 mt-4 w-full border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
                            text
                          >
                            <template #icon>
                              <i class="pi pi-file-pdf mr-2"></i>
                            </template>
                          </Button>
                        </div>

                        <div></div>
                      </div>
                    </div>
                    <div
                      class="flex flex-row items-center space-x-4 font-medium text-primary-900 dark:text-primary-100 md:flex-row"
                    >
                      <span class="flex flex-col justify-center pr-8">
                        <p class="text-xl italic md:text-3xl">Instructions:</p>
                      </span>
                    </div>
                    <div
                      class="flex flex-row items-center space-x-4 font-medium text-surface-700 dark:text-primary-100 md:ml-4 md:mt-2 md:flex-row"
                    >
                      <span class="flex flex-col justify-center pl-36">
                        <p class="text-md italic md:text-lg">
                          1. Include only the work experiences relevant to the position being applied to.
                        </p>
                        <p class="text-md italic md:text-lg">
                          2. The duration should include start and finish dates, if known, month in abbreviated form, if known,
                          and year in full. For the
                        </p>
                        <p class="text-md italic md:text-lg">
                          current position, use the word Present, e.g., 1998-Present. Work experience should be listed from most
                          recent first.
                        </p>
                      </span>
                    </div>

                    <template v-for="workExperienceIndex in payload.individual_work_experience.length" :key="workExperienceIndex">
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
                        <div v-if="!payload.individual_work_experience[workExperienceIndex - 1]?._delete">
                          <div
                            class="mb-4 flex flex-row items-center space-x-4 font-medium text-primary-900 dark:text-primary-100 md:mt-2 md:flex-row"
                          >
                            <span class="flex flex-col justify-center">
                              <p class="text-xl italic md:text-2xl">
                                {{ payload.individual_work_experience[workExperienceIndex - 1].position_title }} in
                                {{ payload.individual_work_experience[workExperienceIndex - 1].department_agency_office_company }}
                              </p>
                            </span>
                          </div>

                          <!-- Duration -->
                          <div class="mb-4 grid grid-cols-1 gap-4">
                            <WbInputText
                              :value="
                                formatWesDuration(
                                  payload.individual_work_experience[workExperienceIndex - 1].inclusive_date_from,
                                  payload.individual_work_experience[workExperienceIndex - 1].inclusive_date_to,
                                  payload.individual_work_experience[workExperienceIndex - 1].is_current_work
                                )
                              "
                              label="Duration"
                              :readonly="!pdsStore.isMyPds && pdsStore.isMyPds"
                              :class="[
                                'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                !pdsStore.isMyPds || pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                              ]"
                              label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                            />
                          </div>

                          <!-- Position -->
                          <div class="mb-4 grid grid-cols-1 gap-4">
                            <WbInputText
                              v-model="payload.individual_work_experience[workExperienceIndex - 1].position_title"
                              label="Position"
                              :readonly="!pdsStore.isMyPds && pdsStore.isMyPds"
                              :class="[
                                'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                !pdsStore.isMyPds || pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                              ]"
                              label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                            />
                          </div>

                          <!-- Name of Office/Unit -->
                          <div class="mb-4 grid grid-cols-1 gap-4">
                            <WbInputText
                              v-model="payload.individual_work_experience[workExperienceIndex - 1].office_unit"
                              label="Name of Office/Unit"
                              :readonly="!pdsStore.isMyPds"
                              :class="[
                                'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                !pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                              ]"
                              label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                            />
                          </div>

                          <!-- Immediate Supervisor -->
                          <div class="mb-4 grid grid-cols-1 gap-4">
                            <WbInputText
                              v-model="payload.individual_work_experience[workExperienceIndex - 1].immediate_supervisor"
                              label="Immediate Supervisor"
                              :readonly="!pdsStore.isMyPds"
                              :class="[
                                'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                !pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                              ]"
                              label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                            />
                          </div>

                          <!-- Name of Agency/Organization and Location -->
                          <div class="mb-4 grid grid-cols-1 gap-4">
                            <!-- WbInputText takes most of the space -->
                            <WbInputText
                              v-model="
                                payload.individual_work_experience[workExperienceIndex - 1].department_agency_office_company
                              "
                              label="Name of Agency/Organization and Location"
                              readonly
                              :class="[
                                'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                !pdsStore.isMyPds || pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                              ]"
                              label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                            />
                          </div>

                          <!-- List of Accomplishments and Contributions (if any) -->
                          <div class="mb-4 grid grid-cols-1 gap-4">
                            <!-- WbInputText takes most of the space -->
                            <WbTextArea
                              v-model="payload.individual_work_experience[workExperienceIndex - 1].significant_accomplishments"
                              label="List of Accomplishments and Contributions (if any)"
                              :readonly="!pdsStore.isMyPds"
                              :class="[
                                'lg:text-md lg:placeholder:text-md w-full border-y-2 bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                !pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                              ]"
                              label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                            />
                          </div>
                          <!-- Summary of Actual Duties -->
                          <div class="mb-4 grid grid-cols-1 gap-4">
                            <!-- WbInputText takes most of the space -->
                            <WbTextArea
                              v-model="payload.individual_work_experience[workExperienceIndex - 1].summary_of_actual_duties"
                              label="Summary of Actual Duties"
                              :readonly="!pdsStore.isMyPds"
                              :class="[
                                'lg:text-md lg:placeholder:text-md w-full bg-transparent text-sm text-surface-900 placeholder:text-sm dark:text-surface-200',
                                !pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                              ]"
                              label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                            />
                          </div>
                        </div>
                        <hr />
                      </TransitionRoot>
                    </template>
                  </div>
                </TransitionRoot>
              </TabPanel>

              <!-- END WORK EXPERIENCE -->
            </TabPanels>
          </TabGroup>
        </div>
      </form>
    </div>
  </template>
  <template v-else-if="isLoading">
    <div class="bg-surface-2 h-full w-full animate-pulse rounded-md p-6">
      <!-- --------------------------- Form Title --------------------------- -->
      <div class="mb-6">
        <div class="h-8 w-1/3 rounded-full bg-surface-300"></div>
        <div class="mt-2 h-6 w-1/4 rounded-full bg-surface-300"></div>
      </div>

      <!-- --------------------------- Form Fields --------------------------- -->
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <!-- Field 1 -->
        <div class="flex flex-col gap-2">
          <div class="h-4 w-1/4 rounded bg-surface-300"></div>
          <div class="h-10 w-full rounded bg-surface-300"></div>
        </div>

        <!-- Field 2 -->
        <div class="flex flex-col gap-2">
          <div class="h-4 w-1/3 rounded bg-surface-300"></div>
          <div class="h-10 w-full rounded bg-surface-300"></div>
        </div>

        <!-- Field 3 -->
        <div class="flex flex-col gap-2">
          <div class="h-4 w-1/5 rounded bg-surface-300"></div>
          <div class="h-10 w-full rounded bg-surface-300"></div>
        </div>

        <!-- Field 4 -->
        <div class="flex flex-col gap-2">
          <div class="h-4 w-1/3 rounded bg-surface-300"></div>
          <div class="h-10 w-full rounded bg-surface-300"></div>
        </div>
      </div>
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <!-- Field 1 -->
        <div class="flex flex-col gap-2">
          <div class="h-4 w-1/4 rounded bg-surface-300"></div>
          <div class="h-10 w-full rounded bg-surface-300"></div>
        </div>

        <!-- Field 2 -->
        <div class="flex flex-col gap-2">
          <div class="h-4 w-1/3 rounded bg-surface-300"></div>
          <div class="h-10 w-full rounded bg-surface-300"></div>
        </div>

        <!-- Field 3 -->
        <div class="flex flex-col gap-2">
          <div class="h-4 w-1/5 rounded bg-surface-300"></div>
          <div class="h-10 w-full rounded bg-surface-300"></div>
        </div>

        <!-- Field 4 -->
        <div class="flex flex-col gap-2">
          <div class="h-4 w-1/3 rounded bg-surface-300"></div>
          <div class="h-10 w-full rounded bg-surface-300"></div>
        </div>
      </div>

      <!-- --------------------------- Textarea --------------------------- -->
      <div class="mt-6 flex flex-col gap-2">
        <div class="h-4 w-1/6 rounded bg-surface-300"></div>
        <div class="h-24 w-full rounded bg-surface-300"></div>
      </div>
    </div>
  </template>
</template>
