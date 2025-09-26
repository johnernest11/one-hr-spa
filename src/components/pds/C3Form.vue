<script setup lang="ts">
import { reactive, ref, onMounted, computed, watch } from 'vue'
import { usePdsStore, PersonalDataSheetPayload } from '@/stores/pds.store.ts'
import { useAuthStore } from '@/stores/auth.store.ts'
import { useRouter } from 'vue-router'
import { useRoute } from 'vue-router'

import useVuelidate from '@vuelidate/core'
import WbInputText from '@/components/webkit/WbInputText.vue'
import WbCalendar from '@/components/webkit/WbCalendar.vue'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'

import { useToast } from 'primevue/usetoast'
import { parseApiResponseError } from '@/utils/error-handle.ts'
import { helpers, maxLength, required } from '@vuelidate/validators'
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/vue'
import { isAfterOrEqualFromDate, usePrependOrAppendOnce, notInFuture } from '@/utils/helpers.js'
import { TransitionRoot } from '@headlessui/vue'
import { PersonnelResponse } from '@/typings/models.types'

const getId = usePrependOrAppendOnce('pds-c3-section-form')
const pdsStore = usePdsStore()
const authStore = useAuthStore()
const toast = useToast()
const router = useRouter()
const route = useRoute()

const maxToasts = 5
const pdsErrors = ref()
const errorMessage = ref()

const isC3Loading = ref(false)
const isPdsError = ref(false)
const formIsSubmitting = ref(false)
const IsBeingUpdated = ref(false)
const isLoading = ref(true)
const currentlyInvolved = ref(false)
const activeToasts = ref<number>(0)

const c1Tabs = ref([
  { name: ' Voluntary Work or Involvement in Civic / Non-Government / People / Voluntary Organization/s', index: 0 },
  { name: ' Learning and Development (L&D) Interventions / Training Programs Attended', index: 1 },
  { name: ' Other Information', index: 2 },
])

/** Payload */
const payload = reactive<PersonalDataSheetPayload>({
  ...pdsStore.pdsInfo,
})

const globalStringMaxLength = import.meta.env.VITE_GLOBAL_STRING_MAX_LENGTH
const globalStringMaxLengthRule = helpers.withMessage(
  `Must not exceed ${globalStringMaxLength} characters`,
  maxLength(globalStringMaxLength)
)

const hasAnyValue = (vm: Record<string, unknown>) => Object.values(vm).some((v) => helpers.req(v))

const formRules = computed(() => ({
  individual_lnd: payload.individual_lnd.map(() => ({
    title: {
      required: helpers.withMessage('Title is required.', required),
      maxLength: globalStringMaxLengthRule,
    },
    from: {
      required: helpers.withMessage('Start date is required.', required),
      isAfterOrEqualTo: helpers.withMessage(
        'Inclusive "From" date must not be after "To" date.',
        (
          val: string | number | Date | null,
          vm: {
            to: string | number | Date | null
          }
        ) => {
          if (!helpers.req(vm.to)) return true

          const from = val ? new Date(val) : null
          const to = vm.to ? new Date(vm.to) : null

          if (!from || !to || isNaN(from.getTime()) || isNaN(to.getTime())) return true

          return from <= to
        }
      ),
      notInFuture: helpers.withMessage('Start date must not be in the future.', notInFuture),
    },
    to: {
      required: helpers.withMessage('Inclusive "To" date is required', (val, vm) => {
        return vm.is_current_work === true ? true : helpers.req(val)
      }),
      isAfterOrEqualFromDate,
      notInFuture: helpers.withMessage('End date must not be in the future.', notInFuture),
    },
    number_of_hours: {
      required: helpers.withMessage('Number of hours is required.', required),
      mustBeInteger: helpers.withMessage('Number of hours must be a whole number.', (val: unknown) => {
        if (val === null || val === '') return true // allow empty (if not required)
        return Number.isInteger(Number(val))
      }),
      maxLength: globalStringMaxLengthRule,
    },
    type: {
      required: helpers.withMessage('Type is required.', required),
      maxLength: globalStringMaxLengthRule,
    },
    conducted_sponsor: {
      required: helpers.withMessage('Conducted Sponsor is required.', required),
      maxLength: globalStringMaxLengthRule,
    },
  })),
  individual_voluntary_work: payload.individual_voluntary_work.map(() => ({
    org_name: {
      required: helpers.withMessage(' Fill up Name of Organization since other information is provided.', (val, vm) =>
        hasAnyValue(vm) ? helpers.req(val) : true
      ),
      maxLength: globalStringMaxLengthRule,
    },
    org_address: {
      required: helpers.withMessage('Fill up Address of Organization since other information is provided.', (val, vm) =>
        hasAnyValue(vm) ? helpers.req(val) : true
      ),
      maxLength: globalStringMaxLengthRule,
    },
    from: {
      isAfterOrEqualTo: helpers.withMessage(
        'Inclusive "From" date must not be after "To" date.',
        (
          val: string | number | Date | null,
          vm: {
            to: string | number | Date | null
            is_current_org: boolean
          }
        ) => {
          if (vm.is_current_org || !helpers.req(vm.to)) return true

          const from = val ? new Date(val) : null
          const to = vm.to ? new Date(vm.to) : null

          if (!from || !to || isNaN(from.getTime()) || isNaN(to.getTime())) return true

          return from <= to
        }
      ),
      notInFuture: helpers.withMessage('End date must not be in the future.', notInFuture),
    },
    to: {
      isAfterOrEqualFromDate,
      notInFuture: helpers.withMessage('End date must not be in the future.', notInFuture),
    },
    number_of_hours: {
      required: helpers.withMessage('Fill up Hours since other info is provided.', (val, vm) =>
        hasAnyValue(vm) ? helpers.req(val) : true
      ),
      maxLength: globalStringMaxLengthRule,
    },
    position_nature_of_work: {
      required: helpers.withMessage('Fill up Position / Nature of Work since other information is provided.', (val, vm) =>
        hasAnyValue(vm) ? helpers.req(val) : true
      ),
      maxLength: globalStringMaxLengthRule,
    },
  })),
  individual_skills_hobby: payload.individual_skills_hobby.map(() => ({
    skill_hobby: {
      maxLength: globalStringMaxLengthRule,
    },
  })),
  individual_recognition: payload.individual_skills_hobby.map(() => ({
    recognition: {
      maxLength: globalStringMaxLengthRule,
    },
  })),
  individual_membership: payload.individual_skills_hobby.map(() => ({
    association_organization: {
      maxLength: globalStringMaxLengthRule,
    },
  })),
}))

watch(currentlyInvolved, (newVal) => {
  payload.individual_voluntary_work.forEach((entry, index) => {
    if (index === 0) {
      // Only first Voluntary Work is current if employed
      entry.is_current_org = newVal ? true : false
      // If currently Voluntary Work, clear the to field
      if (newVal) {
        entry.to = null
      }
    } else {
      entry.is_current_org = false
    }
  })
})

const validator = useVuelidate<PersonalDataSheetPayload>(formRules, payload)

const showToast = (
  severityPararm: 'success' | 'error' | 'info' | 'warn' | 'secondary' | 'contrast' | undefined,
  message: string,
  summaryParam: string
) => {
  if (activeToasts.value < maxToasts) {
    toast.add({
      summary: message,
      detail: summaryParam,
      severity: severityPararm,
      life: 5000,
    })
    activeToasts.value++

    setTimeout(() => {
      activeToasts.value--
    }, 5000)
  }
}

const handleAdditionalVoluntaryWork = () => {
  if (payload.individual_voluntary_work.length < 7) {
    payload.individual_voluntary_work.push({
      id: null,
      is_current_org: false,
      org_name: null,
      org_address: null,
      from: null,
      to: null,
      number_of_hours: null,
      position_nature_of_work: null,
      _delete: null,
    })
  }
}

const handleRemoveVoluntaryWork = (voluntary_work: number) => {
  const idx = voluntary_work - 1
  const voluntaryWork = payload.individual_voluntary_work?.[idx]

  if (voluntaryWork?.id) {
    // mark for backend soft-delete
    payload.individual_voluntary_work[idx] = {
      ...voluntaryWork,
      _delete: true,
    }
  } else {
    // not saved yet → remove completely
    payload.individual_voluntary_work.splice(idx, 1)
  }
}

const handleAdditionalLearningDevelopment = () => {
  if (payload.individual_lnd.length < 21) {
    payload.individual_lnd.push({
      id: null,
      title: null,
      from: null,
      to: null,
      number_of_hours: null,
      type: null,
      conducted_sponsor: null,
      _delete: null,
    })
  }
}

const handleRemoveLearningDevelopment = (learningDevelopmentIndex: number) => {
  const idx = learningDevelopmentIndex - 1
  const learningDev = payload.individual_lnd?.[idx]

  if (learningDev?.id) {
    // mark for backend soft-delete
    payload.individual_lnd[idx] = {
      ...learningDev,
      _delete: true,
    }
  } else {
    // not saved yet → remove completely
    payload.individual_lnd.splice(idx, 1)
  }
}

const handleAdditionalSkillHobbies = () => {
  if (payload.individual_skills_hobby.length < 7) {
    payload.individual_skills_hobby.push({
      id: null,
      skill_hobby: null,
      _delete: null,
    })
  }
}

const handleRemoveSkillHobbies = (skillHobbiesIndex: number) => {
  const idx = skillHobbiesIndex - 1
  const skills_hobby = payload.individual_skills_hobby?.[idx]

  if (skills_hobby?.id) {
    // mark for backend soft-delete
    payload.individual_skills_hobby[idx] = {
      ...skills_hobby,
      _delete: true,
    }
  } else {
    // not saved yet → remove completely
    payload.individual_skills_hobby.splice(idx, 1)
  }
}

const handleAdditionalRecognition = () => {
  if (payload.individual_recognition.length < 7) {
    payload.individual_recognition.push({
      id: null,
      recognition: null,
      _delete: null,
    })
  }
}

const handleRemoveRecognition = (recognitionIndex: number) => {
  const idx = recognitionIndex - 1
  const recognition = payload.individual_recognition?.[idx]

  if (recognition?.id) {
    // mark for backend soft-delete
    payload.individual_recognition[idx] = {
      ...recognition,
      _delete: true,
    }
  } else {
    // not saved yet → remove completely
    payload.individual_recognition.splice(idx, 1)
  }
}

const handleAdditionalMembership = () => {
  if (payload.individual_membership.length < 7) {
    payload.individual_membership.push({
      id: null,
      association_organization: null,
      _delete: null,
    })
  }
}

const handleRemoveMembership = (membershipIndex: number) => {
  const idx = membershipIndex - 1
  const membership = payload.individual_membership?.[idx]

  if (membership?.id) {
    // mark for backend soft-delete
    payload.individual_membership[idx] = {
      ...membership,
      _delete: true,
    }
  } else {
    // not saved yet → remove completely
    payload.individual_membership.splice(idx, 1)
  }
}

// ──────────────────────────────────────────────────────────
//          PDS Details Form - Fetching by ID & Update
// ──────────────────────────────────────────────────────────

type pdsDetailsFormProps = {
  personnelPds?: PersonnelResponse
}
const props = defineProps<pdsDetailsFormProps>()
onMounted(async () => {
  const id = route.params.id as string
  if (id) {
    const response = await pdsStore.fetchPdsById(id)

    if (response && response.success) {
      console.log('Fetched PDS data:', response.data)
      pdsStore.updatePdsFromPersonnel(response.data as PersonnelResponse)
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

const updateC3Form = async () => {
  IsBeingUpdated.value = true
  const id = pdsStore.isMyPds
    ? authStore.authenticatedUser?.user_profile?.individual_basic_detail?.id?.toString() ?? ''
    : (route.params.id as string)

  formIsSubmitting.value = true

  const valid = await validator.value.$validate()
  if (!valid) {
    const hasLearningDevelopmentError = Object.values(validator.value.individual_lnd).some(
      (entry) => (entry as { $error: boolean })?.$error
    )

    let errorTabs = []
    if (hasLearningDevelopmentError) errorTabs.push(' Learning and Development (L&D) Interventions / Training Programs Attended')

    const tabList = errorTabs.join(', ')
    showToast('error', 'Validation Error', `Please check the following tab(s): ${tabList}`)

    isC3Loading.value = false
    return { valid: false, errorTabs: ['C3'] }
  }

  const response = await pdsStore.updatePds(
    { ...payload }, // only payload properties
    id,
    'C3' // pass form_type as a separate argument if your store expects it
  )

  if (response.success === false) {
    const result = parseApiResponseError(response)

    isPdsError.value = true
    errorMessage.value = result?.message
    pdsErrors.value = result?.errors
    showToast('error', 'PDS C3 Error', 'Please see the validation messages')
  } else {
    showToast('success', 'Personal Data Sheet (PDS)', 'PDS has been successfully updated.')
  }

  formIsSubmitting.value = false
}

// ──────────────────────────────────────────────────────────
//          PDS Details Form - Save Handler
// ──────────────────────────────────────────────────────────

const handleSaveC3Form = async () => {
  isC3Loading.value = true

  const valid = await validator.value.$validate()
  if (!valid) {
    const hasLearningDevelopmentError = Object.values(validator.value.individual_lnd).some(
      (entry) => (entry as { $error: boolean })?.$error
    )

    let errorTabs = []
    if (hasLearningDevelopmentError) errorTabs.push(' Learning and Development (L&D) Interventions / Training Programs Attended')

    const tabList = errorTabs.join(', ')
    showToast('error', 'Validation Error', `Please check the following tab(s): ${tabList}`)

    isC3Loading.value = false
    return { valid: false, errorTabs: ['C3'] }
  }

  const response = await pdsStore.savePds(payload)

  if (response.success === false) {
    const result = parseApiResponseError(response)

    isPdsError.value = true
    errorMessage.value = result?.message
    pdsErrors.value = result?.errors
    showToast('error', 'PDS C3 Error', 'Please see the validation messages')
  } else {
    showToast('success', 'PDS', 'PDS has been saved')
    router.push({ name: 'employment' })
  }

  isC3Loading.value = false
}

defineExpose({
  handleSaveC3Form,
  updateC3Form,
})
</script>

<template>
  <template v-if="!isLoading">
    <div class="flex flex-row">
      <form @submit.prevent="" autocomplete="off" class="h-full w-full">
        <div class="w-full">
          <TabGroup>
            <TabList class="flex">
              <Tab v-for="subSection in c1Tabs" as="template" :key="subSection.index" v-slot="{ selected }">
                <button
                  :class="[
                    'w-full border-b-2 border-solid py-4 text-sm font-medium italic leading-5 ring-transparent transition-all duration-300 ease-in-out focus:outline-none md:text-base ',
                    selected
                      ? 'border-b-2 border-solid border-primary-600 bg-primary-100 text-primary-600'
                      : 'border-surface-300 text-surface-400 hover:bg-surface-0/[0.12]',
                  ]"
                >
                  {{ subSection.name }}
                </button>
              </Tab>
            </TabList>

            <TabPanels>
              <!-- START VOLUNTARY WORK SECTION -->
              <TabPanel :class="['my-8 md:mx-12 ', ' ring-surface-0/60 focus:outline-none ']">
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
                    <span class="flex flex-col justify-center space-y-2 font-medium">
                      <p class="text-xl italic text-primary-700 md:text-2xl">
                        VI. Voluntary Work or Involvement in Civic / Non-Government / People / Voluntary Organization/s
                      </p>
                    </span>
                    <div class="col-span-2 my-4 ml-4">
                      <div class="align-items-center flex items-center">
                        <Checkbox
                          v-model="currentlyInvolved"
                          :id="getId('input-currently-involve')"
                          :inputId="getId('input-currently-involve')"
                          name="currentlyInvolved"
                          :binary="true"
                        />
                        <label :for="getId('input-currently-involve')" class="ml-2 text-surface-600">
                          I am currently involve in this organization
                        </label>
                      </div>
                    </div>

                    <template v-for="voluntaryWorkIndex in payload.individual_voluntary_work.length" :key="voluntaryWorkIndex">
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
                        <div v-if="!payload.individual_voluntary_work[voluntaryWorkIndex - 1]?._delete">
                          <div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                              <WbInputText
                                v-model="payload.individual_voluntary_work[voluntaryWorkIndex - 1].org_name"
                                label="Name of Organization"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                :class="[
                                  'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                                  validator.individual_voluntary_work[voluntaryWorkIndex - 1].org_name.$error ? 'mb-0' : 'mb-6',
                                ]"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalidText="
                                  validator.individual_voluntary_work[voluntaryWorkIndex - 1].org_name.$errors[0]?.$message
                                "
                                :invalid="validator.individual_voluntary_work[voluntaryWorkIndex - 1].org_name.$error"
                                @blur="validator.individual_voluntary_work[voluntaryWorkIndex - 1].org_name.$touch()"
                              />
                            </div>
                            <div>
                              <WbInputText
                                v-model="payload.individual_voluntary_work[voluntaryWorkIndex - 1].org_address"
                                label="Address of Organization"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                :class="[
                                  'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                                  validator.individual_voluntary_work[voluntaryWorkIndex - 1].org_address.$error
                                    ? 'mb-0'
                                    : 'mb-6',
                                ]"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalidText="
                                  validator.individual_voluntary_work[voluntaryWorkIndex - 1].org_address.$errors[0]?.$message
                                "
                                :invalid="validator.individual_voluntary_work[voluntaryWorkIndex - 1].org_address.$error"
                                @blur="validator.individual_voluntary_work[voluntaryWorkIndex - 1].org_address.$touch()"
                              />
                            </div>
                          </div>
                          <div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-6">
                            <div>
                              <WbCalendar
                                v-model="payload.individual_voluntary_work[voluntaryWorkIndex - 1].from"
                                label="From"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                :class="[
                                  'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                                  validator.individual_voluntary_work[voluntaryWorkIndex - 1].from.$error ? 'mb-0' : 'mb-6',
                                ]"
                                :dateFormat="'yy-mm-dd'"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalidText="
                                  validator.individual_voluntary_work[voluntaryWorkIndex - 1].from.$errors[0]?.$message
                                "
                                :invalid="validator.individual_voluntary_work[voluntaryWorkIndex - 1].from.$error"
                                @blur="validator.individual_voluntary_work[voluntaryWorkIndex - 1].from.$touch()"
                              />
                            </div>
                            <!-- For the first entry -->
                            <div v-if="voluntaryWorkIndex === 1">
                              <!-- If NOT currently involved, show calendar -->
                              <WbCalendar
                                v-if="!currentlyInvolved"
                                v-model="payload.individual_voluntary_work[voluntaryWorkIndex - 1].to"
                                label="To"
                                :dateFormat="'yy-mm-dd'"
                                class="w-full text-sm"
                                :class="[
                                  'w-full text-sm',
                                  validator.individual_voluntary_work[voluntaryWorkIndex - 1].to.$error ? 'mb-0' : 'mb-6',
                                ]"
                                label-class="text-md text-surface-600 md:text-sm"
                                validation-error-message-class="text-xs text-error-500 font-bold"
                                :invalidText="validator.individual_voluntary_work[voluntaryWorkIndex - 1].to.$errors[0]?.$message"
                                :invalid="validator.individual_voluntary_work[voluntaryWorkIndex - 1].to.$error"
                                @blur="validator.individual_voluntary_work[voluntaryWorkIndex - 1].to.$touch()"
                              />

                              <!-- If currently involved, show "PRESENT" input -->
                              <WbInputText
                                v-else
                                :modelValue="'PRESENT'"
                                label="To"
                                disabled
                                readonly
                                class="w-full text-sm"
                                label-class="text-md text-surface-600 md:text-sm"
                              />
                            </div>

                            <!-- For all entries after the first -->
                            <div v-else>
                              <WbCalendar
                                v-model="payload.individual_voluntary_work[voluntaryWorkIndex - 1].to"
                                label="To"
                                :dateFormat="'yy-mm-dd'"
                                :class="[
                                  'w-full text-sm',
                                  validator.individual_voluntary_work[voluntaryWorkIndex - 1].to.$error ? 'mb-0' : 'mb-6',
                                ]"
                                label-class="text-md text-surface-600 md:text-sm"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalidText="validator.individual_voluntary_work[voluntaryWorkIndex - 1].to.$errors[0]?.$message"
                                :invalid="validator.individual_voluntary_work[voluntaryWorkIndex - 1].to.$error"
                                @blur="validator.individual_voluntary_work[voluntaryWorkIndex - 1].to.$touch()"
                              />
                            </div>

                            <div>
                              <WbInputText
                                v-model="payload.individual_voluntary_work[voluntaryWorkIndex - 1].number_of_hours"
                                label="No of Hours"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                :class="[
                                  'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                                  validator.individual_voluntary_work[voluntaryWorkIndex - 1].number_of_hours.$error
                                    ? 'mb-0'
                                    : 'mb-6',
                                ]"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalidText="
                                  validator.individual_voluntary_work[voluntaryWorkIndex - 1].number_of_hours.$errors[0]?.$message
                                "
                                :invalid="validator.individual_voluntary_work[voluntaryWorkIndex - 1].number_of_hours.$error"
                                @blur="validator.individual_voluntary_work[voluntaryWorkIndex - 1].number_of_hours.$touch()"
                              />
                            </div>
                            <div class="flex items-end gap-2 md:col-span-3">
                              <WbInputText
                                v-model="payload.individual_voluntary_work[voluntaryWorkIndex - 1].position_nature_of_work"
                                label="Position / Nature of Work"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                :class="[
                                  'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                                  validator.individual_voluntary_work[voluntaryWorkIndex - 1].position_nature_of_work.$error
                                    ? 'mb-0'
                                    : 'mb-10',
                                ]"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalidText="
                                  validator.individual_voluntary_work[voluntaryWorkIndex - 1].position_nature_of_work.$errors[0]
                                    ?.$message
                                "
                                :invalid="
                                  validator.individual_voluntary_work[voluntaryWorkIndex - 1].position_nature_of_work.$error
                                "
                                @blur="
                                  validator.individual_voluntary_work[voluntaryWorkIndex - 1].position_nature_of_work.$touch()
                                "
                              />
                              <!-- Delete button aligned right, below label -->
                              <Button
                                v-show="voluntaryWorkIndex > 0"
                                :id="getId(`button-remove-voluntary-work-${voluntaryWorkIndex}`)"
                                icon="pi pi-trash"
                                @click="handleRemoveVoluntaryWork(voluntaryWorkIndex)"
                                v-tooltip.top="'Remove Voluntary Work'"
                                severity="danger"
                                :class="[
                                  'text-lg font-semibold dark:text-primary-100',
                                  validator.individual_voluntary_work[voluntaryWorkIndex - 1].position_nature_of_work.$error
                                    ? 'mb-8'
                                    : 'mb-12',
                                ]"
                                text
                              />
                            </div>
                          </div>
                        </div>
                        <hr />
                      </TransitionRoot>
                    </template>
                    <Button
                      v-if="payload.individual_voluntary_work.length < 7"
                      label="Add additional Voluntary Work field"
                      @click="handleAdditionalVoluntaryWork"
                      size="large"
                      class="dark:text-secondary-100 mt-4 !w-72 border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
                      text
                    >
                      <template #icon>
                        <i class="pi pi-plus mr-2"></i>
                      </template>
                    </Button>
                  </div>

                  <span class="mt-10 flex flex-col justify-center space-y-4 font-medium text-surface-600">
                    <p class="md:text-md text-lg italic">
                      Note: A maximum of seven (7) Voluntary Work entries are allowed in a page, if the number of your Voluntary
                      Works exceeds in the aforementioned limit, it will be in a separate sheet..
                    </p>
                  </span>
                </TransitionRoot>
              </TabPanel>
              <!-- END VOLUNTARY WORK  SECTION -->

              <!-- START LEARNING & DEVELOPMENT -->
              <TabPanel :class="['my-8 md:mx-12 ', ' ring-surface-0/60 focus:outline-none ']">
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
                    <span class="flex flex-col justify-center space-y-2 font-medium text-primary-700">
                      <p class="text-xl italic md:text-2xl">
                        VII. Learning and Development (L&D) Interventions / Training Programs Attended
                      </p>
                    </span>

                    <template v-for="learningDevelopmentIndex in payload.individual_lnd.length" :key="learningDevelopmentIndex">
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
                        <div v-if="!payload.individual_lnd[learningDevelopmentIndex - 1]?._delete">
                          <div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-5">
                            <div class="md:col-span-2">
                              <WbInputText
                                v-model="payload.individual_lnd[learningDevelopmentIndex - 1].title"
                                label="Title of L & D Interventions / Training Programs"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-xs md:mb-1"
                                :class="[
                                  'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                                  validator.individual_lnd[learningDevelopmentIndex - 1].title.$error ? 'mb-0' : 'mb-6',
                                ]"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalidText="validator.individual_lnd[learningDevelopmentIndex - 1].title.$errors[0]?.$message"
                                :invalid="validator.individual_lnd[learningDevelopmentIndex - 1].title.$error"
                                @blur="validator.individual_lnd[learningDevelopmentIndex - 1].title.$touch()"
                                required
                              />
                            </div>

                            <div>
                              <WbCalendar
                                v-model="payload.individual_lnd[learningDevelopmentIndex - 1].from"
                                label="From"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                :class="[
                                  'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                                  validator.individual_lnd[learningDevelopmentIndex - 1].from.$error ? 'mb-0' : 'mb-6',
                                ]"
                                :dateFormat="'yy-mm-dd'"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalidText="validator.individual_lnd[learningDevelopmentIndex - 1].from.$errors[0]?.$message"
                                :invalid="validator.individual_lnd[learningDevelopmentIndex - 1].from.$error"
                                @blur="validator.individual_lnd[learningDevelopmentIndex - 1].from.$touch()"
                                required
                              />
                            </div>

                            <div>
                              <WbCalendar
                                v-model="payload.individual_lnd[learningDevelopmentIndex - 1].to"
                                label="To"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                :class="[
                                  'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                                  validator.individual_lnd[learningDevelopmentIndex - 1].to.$error ? 'mb-0' : 'mb-2',
                                ]"
                                :dateFormat="'yy-mm-dd'"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalidText="validator.individual_lnd[learningDevelopmentIndex - 1].to.$errors[0]?.$message"
                                :invalid="validator.individual_lnd[learningDevelopmentIndex - 1].to.$error"
                                @blur="validator.individual_lnd[learningDevelopmentIndex - 1].to.$touch()"
                                required
                              />
                            </div>

                            <div>
                              <WbInputText
                                v-model="payload.individual_lnd[learningDevelopmentIndex - 1].number_of_hours"
                                label="No of Hours"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                :class="[
                                  'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                                  validator.individual_lnd[learningDevelopmentIndex - 1].number_of_hours.$error ? 'mb-0' : 'mb-6',
                                ]"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalidText="
                                  validator.individual_lnd[learningDevelopmentIndex - 1].number_of_hours.$errors[0]?.$message
                                "
                                :invalid="validator.individual_lnd[learningDevelopmentIndex - 1].number_of_hours.$error"
                                @blur="validator.individual_lnd[learningDevelopmentIndex - 1].number_of_hours.$touch()"
                                required
                              />
                            </div>
                          </div>

                          <div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                            <div>
                              <WbInputText
                                v-model="payload.individual_lnd[learningDevelopmentIndex - 1].type"
                                label="Type of LD"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                :class="[
                                  'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                                  validator.individual_lnd[learningDevelopmentIndex - 1].type.$error ? 'mb-0' : 'mb-2',
                                ]"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalidText="validator.individual_lnd[learningDevelopmentIndex - 1].type.$errors[0]?.$message"
                                :invalid="validator.individual_lnd[learningDevelopmentIndex - 1].type.$error"
                                @blur="validator.individual_lnd[learningDevelopmentIndex - 1].type.$touch()"
                                required
                              />
                            </div>

                            <div class="flex items-end gap-2 md:col-span-3">
                              <!-- WbInputText takes most of the space -->
                              <WbInputText
                                v-model="payload.individual_lnd[learningDevelopmentIndex - 1].conducted_sponsor"
                                label="Conducted / Sponsored By"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                :class="[
                                  'lg:text-md lg:placeholder:text-md flex-1 text-sm placeholder:text-sm',
                                  validator.individual_lnd[learningDevelopmentIndex - 1].conducted_sponsor.$error
                                    ? 'mb-0'
                                    : 'mb-6',
                                ]"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalidText="
                                  validator.individual_lnd[learningDevelopmentIndex - 1].conducted_sponsor.$errors[0]?.$message
                                "
                                :invalid="validator.individual_lnd[learningDevelopmentIndex - 1].conducted_sponsor.$error"
                                @blur="validator.individual_lnd[learningDevelopmentIndex - 1].conducted_sponsor.$touch()"
                                required
                              />
                              <!-- Delete button aligned right, below label -->
                              <Button
                                v-show="learningDevelopmentIndex > 0"
                                :id="getId(`button-remove-learning-development-${learningDevelopmentIndex}`)"
                                icon="pi pi-trash"
                                @click="handleRemoveLearningDevelopment(learningDevelopmentIndex)"
                                v-tooltip.top="'Remove L&D'"
                                severity="danger"
                                :class="[
                                  'text-lg font-semibold dark:text-primary-100',
                                  validator.individual_lnd[learningDevelopmentIndex - 1].conducted_sponsor.$error
                                    ? 'mb-8'
                                    : 'mb-2',
                                ]"
                                text
                              />
                            </div>
                          </div>
                        </div>
                        <hr />
                      </TransitionRoot>
                    </template>

                    <Button
                      v-if="payload.individual_lnd.length < 21"
                      label="Add additional L&D field"
                      @click="handleAdditionalLearningDevelopment"
                      size="large"
                      class="dark:text-secondary-100 mt-4 !w-64 border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
                      text
                    >
                      <template #icon>
                        <i class="pi pi-plus mr-2"></i>
                      </template>
                    </Button>
                  </div>

                  <span class="mt-10 flex flex-col justify-center space-y-4 font-medium text-surface-600">
                    <p class="md:text-md text-lg italic">
                      Note: A maximum of 21 L&D entries are allowed in a page, if the number of your L&D exceeds in the
                      aforementioned limit, it will be in a separate sheet.
                    </p>
                  </span>
                </TransitionRoot>
              </TabPanel>
              <!-- END LEARNING & DEVELOPMENT -->

              <!-- START OTHER INFORMATION -->
              <TabPanel :class="['my-8 md:mx-12 ', ' ring-surface-0/60 focus:outline-none ']">
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
                  <!-- VI. Voluntary Work or Involvement in Civic / Non-Government / People / Voluntary Organization/s -->
                  <div class="flex flex-col gap-4">
                    <span class="flex flex-col justify-center space-y-2 font-medium">
                      <p class="mr-6 text-xl italic text-primary-700 md:text-2xl">VIII. Other Information</p>
                      <p class="text-xl italic text-primary-700 md:text-2xl">Special Skills and Hobbies</p>
                    </span>

                    <template v-for="skillHobbiesIndex in payload.individual_skills_hobby.length" :key="skillHobbiesIndex">
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
                        <div v-if="!payload.individual_skills_hobby[skillHobbiesIndex - 1]?._delete">
                          <div class="mb-4">
                            <div class="flex items-end gap-2 md:col-span-2">
                              <WbInputText
                                v-model="payload.individual_skills_hobby[skillHobbiesIndex - 1].skill_hobby"
                                label="Special Skill / Hobby"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                :class="[
                                  'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                                  validator.individual_skills_hobby[skillHobbiesIndex - 1].skill_hobby.$error ? 'mb-8' : 'mb-2',
                                ]"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalidText="
                                  validator.individual_skills_hobby[skillHobbiesIndex - 1].skill_hobby.$errors[0]?.$message
                                "
                                :invalid="validator.individual_skills_hobby[skillHobbiesIndex - 1].skill_hobby.$error"
                                @blur="validator.individual_skills_hobby[skillHobbiesIndex - 1].skill_hobby.$touch()"
                              />
                              <!-- Delete button aligned right, below label -->
                              <Button
                                v-show="skillHobbiesIndex > 0"
                                :id="getId(`button-remove-skill-hobbies-${skillHobbiesIndex}`)"
                                icon="pi pi-trash"
                                @click="handleRemoveSkillHobbies(skillHobbiesIndex)"
                                v-tooltip.top="'Remove Special Skills and Hobbies'"
                                severity="danger"
                                :class="[
                                  'text-lg font-semibold dark:text-primary-100',
                                  validator.individual_skills_hobby[skillHobbiesIndex - 1].skill_hobby.$error ? 'mb-8' : 'mb-2',
                                ]"
                                text
                              />
                            </div>
                          </div>
                        </div>
                        <hr />
                      </TransitionRoot>
                    </template>
                    <Button
                      v-if="payload.individual_skills_hobby.length < 7"
                      label="Add additional Special Skills and Hobbies field"
                      @click="handleAdditionalSkillHobbies"
                      size="large"
                      class="dark:text-secondary-100 mt-2 border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
                      text
                    >
                      <template #icon>
                        <i class="pi pi-plus mr-2"></i>
                      </template>
                    </Button>
                    <span class="mb-6 mt-2 flex flex-col justify-center space-y-4 font-medium text-surface-600">
                      <p class="md:text-md text-lg italic">
                        Note: A maximum of seven (7) Special Skills and Hobbies entries are allowed in a page, if the number of
                        your Special Skills and Hobbies exceeds in the aforementioned limit, it will be in a separate sheet.
                      </p>
                    </span>
                  </div>

                  <!-- Non-Academic Distinctions / Recognition -->
                  <div class="flex flex-col gap-4">
                    <span class="flex flex-col justify-center space-y-2 font-medium">
                      <p class="text-xl italic text-primary-700 md:text-2xl">Non-Academic Distinctions / Recognition</p>
                    </span>

                    <template v-for="recognitionIndex in payload.individual_recognition.length" :key="recognitionIndex">
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
                        <div v-if="!payload.individual_recognition[recognitionIndex - 1]?._delete">
                          <div class="mb-4">
                            <div class="flex items-end gap-2 md:col-span-2">
                              <WbInputText
                                v-model="payload.individual_recognition[recognitionIndex - 1].recognition"
                                label="Non-Academic Distinction / Recognition"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalidText="
                                  validator.individual_recognition[recognitionIndex - 1].recognition.$errors[0]?.$message
                                "
                                :invalid="validator.individual_recognition[recognitionIndex - 1].recognition.$error"
                                @blur="validator.individual_recognition[recognitionIndex - 1].recognition.$touch()"
                              />
                              <!-- Delete button aligned right, below label -->
                              <Button
                                v-show="recognitionIndex > 0"
                                :id="getId(`button-remove-recognition-${recognitionIndex}`)"
                                icon="pi pi-trash"
                                @click="handleRemoveRecognition(recognitionIndex)"
                                v-tooltip.top="'Remove Non-Academic Distinctions / Recognition'"
                                severity="danger"
                                :class="[
                                  'text-lg font-semibold dark:text-primary-100',
                                  validator.individual_recognition[recognitionIndex - 1].recognition.$error ? 'mb-8' : 'mb-2',
                                ]"
                                text
                              />
                            </div>
                          </div>
                        </div>
                        <hr />
                      </TransitionRoot>
                    </template>
                    <Button
                      v-if="payload.individual_work_experience.length < 7"
                      label="Add additional Non-Academic Distinctions / Recognition field"
                      @click="handleAdditionalRecognition"
                      size="large"
                      class="dark:text-secondary-100 mt-2 border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
                      text
                    >
                      <template #icon>
                        <i class="pi pi-plus mr-2"></i>
                      </template>
                    </Button>
                    <span class="mb-6 mt-2 flex flex-col justify-center space-y-4 font-medium text-surface-600">
                      <p class="md:text-md text-lg italic">
                        Note: A maximum of seven (7) Non-Academic Distinctions / Recognition entries are allowed in a page, if the
                        number of your Non-Academic Distinctions / Recognition exceeds in the aforementioned limit, it will be in
                        a separate sheet.
                      </p>
                    </span>
                  </div>

                  <!-- VIII. Other Information -->
                  <div class="flex flex-col gap-4">
                    <span class="flex flex-col justify-center space-y-2 font-medium">
                      <p class="text-xl italic text-primary-700 md:text-2xl">Membership in Association / Organization</p>
                    </span>

                    <template v-for="membershipIndex in payload.individual_membership.length" :key="membershipIndex">
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
                        <div v-if="!payload.individual_membership[membershipIndex - 1]?._delete">
                          <div class="mb-4">
                            <div class="flex items-end gap-2 md:col-span-2">
                              <WbInputText
                                v-model="payload.individual_membership[membershipIndex - 1].association_organization"
                                label="Association / Organization"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalidText="
                                  validator.individual_membership[membershipIndex - 1].association_organization.$errors[0]
                                    ?.$message
                                "
                                :invalid="validator.individual_membership[membershipIndex - 1].association_organization.$error"
                                @blur="validator.individual_membership[membershipIndex - 1].association_organization.$touch()"
                              />
                              <!-- Delete button aligned right, below label -->
                              <Button
                                v-show="membershipIndex > 0"
                                :id="getId(`button-remove-membership-${membershipIndex}`)"
                                icon="pi pi-trash"
                                @click="handleRemoveMembership(membershipIndex)"
                                v-tooltip.top="'Remove Membership in Association / Organization'"
                                severity="danger"
                                :class="[
                                  'text-lg font-semibold dark:text-primary-100',
                                  validator.individual_membership[membershipIndex - 1].association_organization.$error
                                    ? 'mb-8'
                                    : 'mb-2',
                                ]"
                                text
                              />
                            </div>
                          </div>
                        </div>
                        <hr />
                      </TransitionRoot>
                    </template>
                    <Button
                      v-if="payload.individual_work_experience.length < 28"
                      label="Add additional Membership in Association / Organization field"
                      @click="handleAdditionalMembership"
                      size="large"
                      class="dark:text-secondary-100 mt-4 border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
                      text
                    >
                      <template #icon>
                        <i class="pi pi-plus mr-2"></i>
                      </template>
                    </Button>

                    <span class="mb-6 mt-2 flex flex-col justify-center space-y-4 font-medium text-surface-600">
                      <p class="md:text-md text-lg italic">
                        Note: A maximum of seven (7) Membership in Association / Organization entries are allowed in a page, if
                        the number of your Membership in Association / Organization exceeds in the aforementioned limit, it will
                        be in a separate sheet.
                      </p>
                    </span>
                  </div>
                </TransitionRoot>
              </TabPanel>
              <!-- END OTHER INFORMATION  -->
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
