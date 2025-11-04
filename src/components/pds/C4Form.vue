<script setup lang="ts">
import { reactive, ref, computed, onMounted, toRef, watch } from 'vue'
import { usePdsStore, PersonalDataSheetPayload } from '@/stores/pds.store.ts'
import { useAuthStore } from '@/stores/auth.store.ts'
import { useLibrariesStore } from '@/stores/libraries.store.ts'
import { useRoute } from 'vue-router'
import { IndividualQuestion } from '@/typings/models.types.ts'

import useVuelidate from '@vuelidate/core'
import WbInputText from '@/components/webkit/WbInputText.vue'
import WbCalendar from '@/components/webkit/WbCalendar.vue'
import WbAutoComplete from '@/components/webkit/WbAutoComplete.vue'
import Button from 'primevue/button'
import RadioButton from 'primevue/radiobutton'
import { WbAutoCompleteOption, WbAutoCompleteOptionTrueValue } from '@/components/webkit/WbAutoComplete.vue'
import { useWbAutoCompleteHandleTrueValue } from '@/composables/wb-ui-components.ts'

import { useToast } from 'primevue/usetoast'
import { parseApiResponseError } from '@/utils/error-handle.ts'
import { helpers, required, maxLength } from '@vuelidate/validators'
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/vue'
import { mobilePhoneRule } from '@/utils/custom-validations'
import { usePrependOrAppendOnce, notInFuture } from '@/utils/helpers.js'
import { TransitionRoot } from '@headlessui/vue'
import { PersonnelResponse } from '@/typings/models.types'

const getId = usePrependOrAppendOnce('pds-c3-section-form')
const pdsStore = usePdsStore()
const libraryStore = useLibrariesStore()
const authStore = useAuthStore()
const toast = useToast()
const route = useRoute()

const formIsSubmitting = ref(false)
const maxToasts = 5
const pdsErrors = ref()
const errorMessage = ref()
const showErrorAlert = ref(false)
const IsBeingUpdated = ref(false)
const isLoading = ref(true)
const errorDetails = ref<string[]>([])

const isC4Loading = ref(false)
const isMyPds = route.name === 'my-pds'
const isPdsError = ref(false)
const activeToasts = ref<number>(0)
const selectedCountry = ref<WbAutoCompleteOption | null>(null)

const c4Tabs = ref([
  { name: ' Other Information Continued', index: 0 },
  { name: ' References & Gov` Issued ID', index: 1 },
])

/** Payload */
const payload = reactive<PersonalDataSheetPayload>({
  ...pdsStore.pdsInfo,
})

if (!payload.individual_question || !payload.individual_question.length) {
  payload.individual_question = [
    {
      id: null,
      q34_a: false,
      q34_b: false,
      q34_details: null,
      q35_a: false,
      q35_a_details: null,
      q35_b: false,
      q35_b_date_filed: null,
      q35_b_status: null,
      q36: false,
      q36_details: null,
      q37: false,
      q37_details: null,
      q38_a: false,
      q38_a_details: null,
      q38_b: false,
      q38_b_details: null,
      q39: false,
      country_id: null,
      q40_a_indigenous_group: false,
      q40_a_details: null,
      q40_b_pwd: false,
      q40_b_details: null,
      q40_c_solo_parent: false,
      q40_c_details: null,
    },
  ]
}

const conditionalRequiredIfTrue = (fields: keyof IndividualQuestion | (keyof IndividualQuestion)[]) =>
  helpers.withMessage('Please provide details if you answered YES.', (val: unknown, vm: IndividualQuestion) => {
    const fieldList = Array.isArray(fields) ? fields : [fields]
    return fieldList.some((field) => vm[field] === true) ? helpers.req(val) : true
  })

const uniqueField = <T extends Record<string, unknown>>(references: T[], field: keyof T, message: string) =>
  helpers.withMessage(message, (value: unknown) => {
    if (!value) return true // let required handle empty
    const values = references.map((ref) => ref[field])
    const count = values.filter((v) => v === value).length
    return count <= 1
  })

const globalStringMaxLength = import.meta.env.VITE_GLOBAL_STRING_MAX_LENGTH
const globalStringMaxLengthRule = helpers.withMessage(
  `Must not exceed ${globalStringMaxLength} characters`,
  maxLength(globalStringMaxLength)
)

const formRules = computed(() => ({
  individual_question: payload.individual_question.map(() => ({
    q34_details: {
      required: conditionalRequiredIfTrue(['q34_a', 'q34_b']),
      maxLength: globalStringMaxLengthRule,
    },
    q35_a_details: {
      required: conditionalRequiredIfTrue('q35_a'),
      maxLength: globalStringMaxLengthRule,
    },
    q35_b_date_filed: {
      required: conditionalRequiredIfTrue('q35_b'),
      notInFuture: helpers.withMessage('Start date must not be in the future.', notInFuture),
    },
    q35_b_status: {
      required: conditionalRequiredIfTrue('q35_b'),
      maxLength: globalStringMaxLengthRule,
    },
    q36_details: {
      required: conditionalRequiredIfTrue('q36'),
      maxLength: globalStringMaxLengthRule,
    },
    q37_details: {
      required: conditionalRequiredIfTrue('q37'),
      maxLength: globalStringMaxLengthRule,
    },
    q38_a_details: {
      required: conditionalRequiredIfTrue('q38_a'),
      maxLength: globalStringMaxLengthRule,
    },
    q38_b_details: {
      required: conditionalRequiredIfTrue('q38_b'),
      maxLength: globalStringMaxLengthRule,
    },
    country_id: {
      required: conditionalRequiredIfTrue('q39'),
      maxLength: globalStringMaxLengthRule,
    },
    q40_a_details: {
      required: conditionalRequiredIfTrue('q40_a_indigenous_group'),
      maxLength: globalStringMaxLengthRule,
    },
    q40_b_details: {
      required: conditionalRequiredIfTrue('q40_b_pwd'),
      maxLength: globalStringMaxLengthRule,
    },
    q40_c_details: {
      required: conditionalRequiredIfTrue('q40_c_solo_parent'),
      maxLength: globalStringMaxLengthRule,
    },
  })),
  individual_reference: payload.individual_reference.map(() => ({
    name: {
      required: helpers.withMessage('Name is required.', required),
      maxLength: globalStringMaxLengthRule,
      unique: uniqueField(payload.individual_reference, 'name', 'Character references name already exists.'),
    },
    address: {
      required: helpers.withMessage('Address is required.', required),
      maxLength: globalStringMaxLengthRule,
    },
    tel_no: {
      required: helpers.withMessage('Tel No. Sponsor is required.', required),
      tel_no: helpers.withMessage('Must be a valid PH mobile number', mobilePhoneRule()),
      unique: uniqueField(payload.individual_reference, 'tel_no', 'Character references tel no already provided/exists.'),
    },
  })),
  individual_government_id: {
    gov_issued_id: {
      required: helpers.withMessage('Government Id is required.', required),
      maxLength: globalStringMaxLengthRule,
    },
    gov_id_no: { required: helpers.withMessage('ID No is required.', required), maxLength: globalStringMaxLengthRule },
    gov_issuance: {
      required: helpers.withMessage('Date/Place of Issuance is required.', required),
      maxLength: globalStringMaxLengthRule,
    },
  },
}))
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
    }, 10000)
  }
}

const handleAdditionalReference = () => {
  if (payload.individual_reference.filter((ref) => !ref._delete).length < 3) {
    payload.individual_reference.push({
      id: null,
      name: '',
      address: '',
      tel_no: '',
      _delete: false,
    })
  }
}

const handleRemoveReference = (referenceIndex: number) => {
  const idx = referenceIndex - 1
  const reference = payload.individual_reference?.[idx]

  if (reference?.id) {
    payload.individual_reference[idx] = {
      ...reference,
      _delete: true,
    }
  } else {
    if (payload.individual_reference.length === 1) {
      payload.individual_reference[idx] = {
        id: null,
        name: null,
        address: null,
        tel_no: null,
        _delete: null,
      }
    } else {
      payload.individual_reference.splice(idx, 1)
    }
  }
}

/***Clear the payload to default when manual input mode is detected***/
const formKey = ref(0)
const resetPdsPayload = () => {
  // Government ID
  payload.individual_government_id.id = null
  payload.individual_government_id.gov_issued_id = ''
  payload.individual_government_id.gov_id_no = ''
  payload.individual_government_id.gov_issuance = ''

  // Questions
  payload.individual_question.splice(0, payload.individual_question.length, {
    id: null,
    q34_a: false,
    q34_b: false,
    q34_details: null,
    q35_a: false,
    q35_a_details: null,
    q35_b: false,
    q35_b_date_filed: null,
    q35_b_status: null,
    q36: false,
    q36_details: null,
    q37: false,
    q37_details: null,
    q38_a: false,
    q38_a_details: null,
    q38_b: false,
    q38_b_details: null,
    q39: false,
    country_id: null,
    q40_a_indigenous_group: false,
    q40_a_details: null,
    q40_b_pwd: false,
    q40_b_details: null,
    q40_c_solo_parent: false,
    q40_c_details: null,
  })

  // References
  payload.individual_reference.splice(0, payload.individual_reference.length, {
    id: null,
    name: '',
    address: '',
    tel_no: '',
    _delete: null,
  })
}

/**************************************************
     PDS Details Form - Fetching by ID & Update
************************************************* */
onMounted(async () => {
  /*********Manual Input Mode*********/
  if (route.query.mode === 'via-manual-input') {
    console.info('Manual input detected on mount → resetting payload.')
    resetPdsPayload()
    formKey.value++
    isLoading.value = false
    return
  }

  /*********Fetch Existing PDS*********/
  const id = route.params.id as string
  if (!id) {
    console.log('No ID in route, skipping fetch.')
    isLoading.value = false
    return
  }

  const response = await pdsStore.fetchPdsById(id)
  if (!response?.success) {
    console.warn('Failed to fetch PDS by ID or response unsuccessful.')
    isLoading.value = false
    return
  }

  console.log('Fetched PDS data:', response.data)
  const data = response.data as PersonnelResponse
  pdsStore.updatePdsFromPersonnel(data)

  // -------------------------
  // Government ID
  // -------------------------
  payload.individual_government_id = data.individual_government_id
    ? Array.isArray(data.individual_government_id)
      ? data.individual_government_id.length
        ? { ...data.individual_government_id[0] }
        : { id: null, gov_issued_id: '', gov_id_no: '', gov_issuance: '' }
      : { ...data.individual_government_id }
    : { id: null, gov_issued_id: '', gov_id_no: '', gov_issuance: '' }

  // -------------------------
  // Questions
  // -------------------------
  payload.individual_question = Array.isArray(data.individual_question)
    ? JSON.parse(JSON.stringify(data.individual_question))
    : data.individual_question
      ? [JSON.parse(JSON.stringify(data.individual_question))]
      : [
          {
            id: null,
            q34_a: false,
            q34_b: false,
            q34_details: null,
            q35_a: false,
            q35_a_details: null,
            q35_b: false,
            q35_b_date_filed: null,
            q35_b_status: null,
            q36: false,
            q36_details: null,
            q37: false,
            q37_details: null,
            q38_a: false,
            q38_a_details: null,
            q38_b: false,
            q38_b_details: null,
            q39: false,
            country_id: null,
            q40_a_indigenous_group: false,
            q40_a_details: null,
            q40_b_pwd: false,
            q40_b_details: null,
            q40_c_solo_parent: false,
            q40_c_details: null,
          },
        ]

  // -------------------------
  // References
  // -------------------------
  payload.individual_reference = Array.isArray(data.individual_reference)
    ? data.individual_reference.length
      ? JSON.parse(JSON.stringify(data.individual_reference))
      : [{ id: null, name: '', address: '', tel_no: '', _delete: null }]
    : [{ id: null, name: '', address: '', tel_no: '', _delete: null }]

  isLoading.value = false
})

/***************************************************
     Watcher Show the Country ID Label
****************************************************/
watch(
  () => payload.individual_question[0].country_id,
  async (newVal) => {
    if (newVal) {
      if (!libraryStore.countryOptions.length) {
        await libraryStore.fetchCountry?.()
      }

      const found = libraryStore.countryOptions.find((opt) => opt.value === newVal)
      selectedCountry.value = found || null
    } else {
      selectedCountry.value = null
    }
  },
  { immediate: true }
)

/***************************************************
     Watcher Clear field when radio set to "No"
****************************************************/
const allQuestionsFlags = computed(() => {
  const q = payload.individual_question?.[0]
  return [
    q?.q34_a ?? null,
    q?.q34_b ?? null,
    q?.q35_a ?? null,
    q?.q35_b ?? null,
    q?.q36 ?? null,
    q?.q37 ?? null,
    q?.q38_a ?? null,
    q?.q38_b ?? null,
    q?.q39 ?? null,
    q?.q40_a_indigenous_group ?? null,
    q?.q40_b_pwd ?? null,
    q?.q40_c_solo_parent ?? null,
  ]
})

watch(
  allQuestionsFlags,
  (newFlags) => {
    const q = payload.individual_question?.[0]
    if (!q) return // safety guard — nothing to clear yet

    if (newFlags[0] === false || newFlags[1] === false) q.q34_details = null
    if (newFlags[2] === false) q.q35_a_details = null
    if (newFlags[3] === false) {
      q.q35_b_date_filed = null
      q.q35_b_status = null
    }
    if (newFlags[4] === false) q.q36_details = null
    if (newFlags[5] === false) q.q37_details = null
    if (newFlags[6] === false) q.q38_a_details = null
    if (newFlags[7] === false) q.q38_b_details = null
    if (newFlags[8] === false) q.country_id = null
    if (newFlags[9] === false) q.q40_a_details = null
    if (newFlags[10] === false) q.q40_b_details = null
    if (newFlags[11] === false) q.q40_c_details = null
  },
  { deep: true }
)

/**************************************************
      Validations of C4 with Toast Message
***************************************************/
const validateForm = async () => {
  const valid = await validator.value.$validate()
  if (!valid) {
    const hasIndividualQuestionError = Object.values(validator.value.individual_question).some(
      (entry) => (entry as { $error: boolean })?.$error
    )

    const hasIndividualReferenceError = Object.values(validator.value.individual_reference).some(
      (entry) => (entry as { $error: boolean })?.$error
    )

    const hasIndividualGovermentIdError = Object.values(validator.value.individual_government_id).some(
      (entry) => (entry as { $error: boolean })?.$error
    )

    const errorTabs: string[] = []
    if (hasIndividualQuestionError) errorTabs.push('C4 - Other Information Continued')
    if (hasIndividualReferenceError) errorTabs.push('C4 - References')
    if (hasIndividualGovermentIdError) errorTabs.push('C4 - Gov`t Issued ID')

    const sectionDescriptions: Record<string, string> = {
      'C4 - Other Information Continued': 'C4 - Other Information Continued',
      'C4 - References': 'C4 - References',
      'C4 - Gov`t Issued ID': 'C4 - Gov`t Issued ID',
    }

    errorTabs.forEach((field) => {
      const message = sectionDescriptions[field] ?? field
      showToast('error', 'Validation Error - Please check the following', message)
    })

    isC4Loading.value = false
    return { valid: false, errorTabs: ['C4'] }
  }
  return { valid: true }
}
/**************************************************
             PDS C4 - UPDATE SERVICE 
***************************************************/
const updateC4Form = async () => {
  IsBeingUpdated.value = true
  const id = isMyPds
    ? authStore.authenticatedUser?.user_profile?.individual_basic_detail?.id?.toString() ?? 0
    : (route.params.id as string)

  if (!id) {
    IsBeingUpdated.value = false
    isC4Loading.value = false
    formIsSubmitting.value = false
    return { valid: false, errorTabs: ['C4'] }
  }

  const response = await pdsStore.updatePds({ ...payload }, id, 'C4')

  if (!response.success) {
    const result = parseApiResponseError(response)
    if (!result) {
      formIsSubmitting.value = false
      return
    }
    showErrorAlert.value = true
    errorMessage.value = result.message
    errorDetails.value = result.errors
    IsBeingUpdated.value = false
    return { valid: false, errorTabs: ['C4'] }
  }
}
/**************************************************
            PDS C4 - STORE SERVICE 
***************************************************/
const handleSaveC4Form = async () => {
  isC4Loading.value = true

  const response = await pdsStore.savePds(payload)
  if (!response.success) {
    const result = parseApiResponseError(response)

    isPdsError.value = true
    errorMessage.value = result?.message
    pdsErrors.value = result?.errors
    return { valid: false, errorTabs: ['C4'] }
  }
}

defineExpose({
  handleSaveC4Form,
  updateC4Form,
  validateForm,
})
</script>

<template>
  <template v-if="!isLoading">
    <div class="flex flex-row">
      <form @submit.prevent="" autocomplete="off" class="h-full w-full">
        <div class="w-full">
          <TabGroup>
            <TabList class="flex">
              <Tab v-for="subSection in c4Tabs" as="template" :key="subSection.index" v-slot="{ selected }">
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
              <!-- START OTHER INFORMATION CONTINUATION SECTION -->
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
                      <p class="text-xl italic text-primary-700 md:text-2xl">VIII. Other Information cont...</p>
                    </span>

                    <template v-if="true">
                      <!-- Question # 34 -->
                      <div>
                        <div class="mb-4 flex items-start gap-2">
                          <span class="w-6 shrink-0 text-base font-medium text-surface-600">34.</span>
                          <p class="text-lg font-medium text-surface-600">
                            Are you related by consanguinity or affinity to the appointing or recommending authority, or to the
                            chief of bureau or office or to the person who has immediate supervision over you in the Office,
                            Bureau or Department where you will be appointed,
                          </p>
                        </div>

                        <div class="grid grid-cols-1 gap-4 md:grid-cols-5">
                          <div class="mb-4 ml-10 flex items-start gap-2 md:col-span-4">
                            <span class="shrink-0 text-base font-medium text-surface-600">a.</span>
                            <p class="md:text-md text-lg text-surface-600">within the third degree ?</p>
                          </div>
                          <div class="flex flex-row items-center justify-center gap-12 p-4 md:justify-start md:p-2">
                            <div class="flex items-center">
                              <RadioButton
                                v-model="payload.individual_question[0].q34_a"
                                :id="getId('input-question-34a-yes')"
                                :readonly="pdsStore.isMyPds"
                                name="q34_a"
                                :value="true"
                                :class="[
                                  'scale-150 transform',
                                  pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                              />
                              <label :for="getId('input-question-34a-yes')" class="ml-2 cursor-pointer">Yes</label>
                            </div>
                            <div class="flex items-center">
                              <RadioButton
                                v-model="payload.individual_question[0].q34_a"
                                :id="getId('input-question-34a-no')"
                                :readonly="pdsStore.isMyPds"
                                name="q34_a"
                                :value="false"
                                :class="[
                                  'scale-150 transform',
                                  pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                              />
                              <label :for="getId('input-question-34a-no')" class="ml-2 cursor-pointer">No</label>
                            </div>
                          </div>
                        </div>

                        <div class="grid grid-cols-1 gap-4 md:grid-cols-5">
                          <div class="ml-10 flex items-start gap-2 md:col-span-4">
                            <span class="shrink-0 text-base font-medium text-surface-600">b.</span>
                            <p class="md:text-md text-lg text-surface-600">
                              within the fourth degree (for Local Government Unit - Career Employees)?
                            </p>
                          </div>
                          <div class="flex flex-row items-center justify-center gap-12 p-4 md:justify-start md:p-2">
                            <div class="flex items-center">
                              <RadioButton
                                v-model="payload.individual_question[0].q34_b"
                                :id="getId('input-question-34b-yes')"
                                :readonly="pdsStore.isMyPds"
                                name="q34_b"
                                :value="true"
                                :class="[
                                  'scale-150 transform',
                                  pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                              />
                              <label :for="getId('input-question-34b-yes')" class="ml-2 cursor-pointer">Yes</label>
                            </div>
                            <div class="flex items-center">
                              <RadioButton
                                v-model="payload.individual_question[0].q34_b"
                                :id="getId('input-question-34b-no')"
                                :readonly="pdsStore.isMyPds"
                                name="q34_b"
                                :value="false"
                                :class="[
                                  'scale-150 transform',
                                  pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                              />
                              <label :for="getId('input-question-34b-no')" class="ml-2 cursor-pointer">No</label>
                            </div>
                          </div>
                        </div>
                        <!-- Conditional input shown only if any answer is "Yes" -->
                        <div
                          v-if="payload.individual_question[0].q34_a === true || payload.individual_question[0].q34_b === true"
                          class="mb-2 ml-10 flex items-start gap-2 md:col-span-4"
                        >
                          <WbInputText
                            v-model="payload.individual_question[0].q34_details"
                            label="If YES, give details"
                            :readonly="pdsStore.isMyPds"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                            ]"
                            validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                            :invalid="validator.individual_question[0].q34_details.$error"
                            :invalid-text="validator.individual_question[0].q34_details.$errors[0]?.$message"
                            @blur="validator.individual_question[0].q34_details.$touch"
                          />
                        </div>
                      </div>
                      <hr />
                      <!-- Question # 35 -->
                      <!-- a. Have you ever been found guilty of any administrative offense? -->
                      <div>
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-5">
                          <div class="flex items-start gap-2 md:col-span-4">
                            <span class="shrink-0 text-base font-medium text-surface-600">35.</span>
                            <p class="md:text-md text-lg text-surface-600">
                              a. Have you ever been found guilty of any administrative offense?
                            </p>
                          </div>
                          <div class="flex flex-row items-center justify-center gap-12 p-4 md:justify-start md:p-2">
                            <div class="flex items-center">
                              <RadioButton
                                v-model="payload.individual_question[0].q35_a"
                                :id="getId('input-question-35a-yes')"
                                :readonly="pdsStore.isMyPds"
                                name="q35_a"
                                :value="true"
                                :class="[
                                  'scale-150 transform',
                                  pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                              />
                              <label :for="getId('input-question-34a-yes')" class="ml-2 cursor-pointer">Yes</label>
                            </div>
                            <div class="flex items-center">
                              <RadioButton
                                v-model="payload.individual_question[0].q35_a"
                                :id="getId('input-question-35a-no')"
                                :readonly="pdsStore.isMyPds"
                                name="q35_a"
                                :value="false"
                                :class="[
                                  'scale-150 transform',
                                  pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                              />
                              <label :for="getId('input-question-35a-no')" class="ml-2 cursor-pointer">No</label>
                            </div>
                          </div>
                        </div>
                        <!-- Conditional input shown only if any answer is "Yes" -->
                        <div
                          v-if="payload.individual_question[0].q35_a === true"
                          class="mb-2 ml-10 flex items-start gap-2 md:col-span-4"
                        >
                          <WbInputText
                            v-model="payload.individual_question[0].q35_a_details"
                            label="If YES, give details"
                            :readonly="pdsStore.isMyPds"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                            ]"
                            :invalid="validator.individual_question[0].q35_a_details.$error"
                            :invalid-text="validator.individual_question[0].q35_a_details.$errors[0]?.$message"
                            @blur="validator.individual_question[0].q35_a_details.$touch"
                            required
                          />
                        </div>
                        <!-- b. Have you been criminally charged before any court? -->
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-5">
                          <div class="ml-10 flex items-start gap-2 md:col-span-4">
                            <span class="shrink-0 text-base font-medium text-surface-600">b.</span>
                            <p class="md:text-md text-lg text-surface-600">Have you been criminally charged before any court?</p>
                          </div>
                          <div class="flex flex-row items-center justify-center gap-12 p-4 md:justify-start md:p-2">
                            <div class="flex items-center">
                              <RadioButton
                                v-model="payload.individual_question[0].q35_b"
                                :id="getId('input-question-35b-yes')"
                                :readonly="pdsStore.isMyPds"
                                name="q35_b"
                                :value="true"
                                :class="[
                                  'scale-150 transform',
                                  pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                              />
                              <label :for="getId('input-question-34b-yes')" class="ml-2 cursor-pointer">Yes</label>
                            </div>
                            <div class="flex items-center">
                              <RadioButton
                                v-model="payload.individual_question[0].q35_b"
                                :id="getId('input-question-35b-no')"
                                :readonly="pdsStore.isMyPds"
                                name="q35_b"
                                :value="false"
                                :class="[
                                  'scale-150 transform',
                                  pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                              />
                              <label :for="getId('input-question-35b-no')" class="ml-2 cursor-pointer">No</label>
                            </div>
                          </div>
                        </div>
                        <!-- Conditional input shown only if any answer is "Yes" -->
                        <div
                          v-if="payload.individual_question[0].q35_b === true"
                          class="mb-2 ml-10 grid grid-cols-1 items-start gap-4 md:grid-cols-4"
                        >
                          <div class="md:col-span-2">
                            <WbCalendar
                              v-model="payload.individual_question[0].q35_b_date_filed"
                              label="Date Filed"
                              :readonly="pdsStore.isMyPds"
                              label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm md:mb-1"
                              :class="[
                                'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                                pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                              ]"
                              validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                              :invalid="validator.individual_question[0].q35_b_date_filed.$error"
                              :invalid-text="validator.individual_question[0].q35_b_date_filed.$errors[0]?.$message"
                              @blur="validator.individual_question[0].q35_b_date_filed.$touch"
                              required
                            />
                          </div>
                          <div class="md:col-span-2">
                            <WbInputText
                              v-model="payload.individual_question[0].q35_b_status"
                              label="Status of Case/s"
                              :readonly="pdsStore.isMyPds"
                              label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                              :class="[
                                'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                                pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                              ]"
                              validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                              :invalid="validator.individual_question[0].q35_b_status.$error"
                              :invalid-text="validator.individual_question[0].q35_b_status.$errors[0]?.$message"
                              @blur="validator.individual_question[0].q35_b_status.$touch"
                              required
                            />
                          </div>
                        </div>
                      </div>
                      <hr />
                      <!-- Question # 36 -->
                      <div>
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-5">
                          <div class="flex items-start gap-2 md:col-span-4">
                            <span class="shrink-0 text-base font-medium text-surface-600">36.</span>
                            <p class="md:text-md text-lg text-surface-600">
                              Have you ever been convicted of any crime or violation of any law, decree, ordinance or regulation
                              by any court or tribunal?
                            </p>
                          </div>
                          <div class="flex flex-row items-center justify-center gap-12 p-4 md:justify-start md:p-2">
                            <div class="flex items-center">
                              <RadioButton
                                v-model="payload.individual_question[0].q36"
                                :id="getId('input-question-36-yes')"
                                :readonly="pdsStore.isMyPds"
                                name="q36"
                                :value="true"
                                :class="[
                                  'scale-150 transform',
                                  pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                              />
                              <label :for="getId('input-question-36-yes')" class="ml-2 cursor-pointer">Yes</label>
                            </div>
                            <div class="flex items-center">
                              <RadioButton
                                v-model="payload.individual_question[0].q36"
                                :id="getId('input-question-36-no')"
                                :readonly="pdsStore.isMyPds"
                                name="q36"
                                :value="false"
                                :class="[
                                  'scale-150 transform',
                                  pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                              />
                              <label :for="getId('input-question-36-no')" class="ml-2 cursor-pointer">No</label>
                            </div>
                          </div>
                        </div>
                        <!-- Conditional input shown only if any answer is "Yes" -->
                        <div
                          v-if="payload.individual_question[0].q36 === true"
                          class="mb-2 ml-10 flex items-start gap-2 md:col-span-4"
                        >
                          <WbInputText
                            v-model="payload.individual_question[0].q36_details"
                            label="If YES, give details"
                            :readonly="pdsStore.isMyPds"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                            ]"
                            :invalid="validator.individual_question[0].q36_details.$error"
                            :invalid-text="validator.individual_question[0].q36_details.$errors[0]?.$message"
                            @blur="validator.individual_question[0].q36_details.$touch"
                            required
                          />
                        </div>
                      </div>
                      <hr />
                      <!-- Question # 37 -->
                      <div>
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-5">
                          <div class="mb-2 flex items-start gap-2 md:col-span-4">
                            <span class="shrink-0 text-base font-medium text-surface-600">37.</span>
                            <p class="md:text-md text-lg text-surface-600">
                              Have you ever been separated from the service in any of the following modes: resignation,
                              retirement, dropped from the rolls, dismissal, termination, end of term, finished contract or phased
                              out (abolition) in the public or private sector?
                            </p>
                          </div>
                          <div class="flex flex-row items-center justify-center gap-12 p-4 md:justify-start md:p-2">
                            <div class="flex items-center">
                              <RadioButton
                                v-model="payload.individual_question[0].q37"
                                :id="getId('input-question-37-yes')"
                                :readonly="pdsStore.isMyPds"
                                name="q37"
                                :value="true"
                                :class="[
                                  'scale-150 transform',
                                  pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                              />
                              <label :for="getId('input-question-37-yes')" class="ml-2 cursor-pointer">Yes</label>
                            </div>
                            <div class="flex items-center">
                              <RadioButton
                                v-model="payload.individual_question[0].q37"
                                :id="getId('input-question-37-no')"
                                :readonly="pdsStore.isMyPds"
                                name="q37"
                                :value="false"
                                :class="[
                                  'scale-150 transform',
                                  pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                              />
                              <label :for="getId('input-question-37-no')" class="ml-2 cursor-pointer">No</label>
                            </div>
                          </div>
                        </div>
                        <!-- Conditional input shown only if any answer is "Yes" -->
                        <div
                          v-if="payload.individual_question[0].q37 === true"
                          class="mb-2 ml-10 flex items-start gap-2 md:col-span-4"
                        >
                          <WbInputText
                            v-model="payload.individual_question[0].q37_details"
                            label="If YES, give details"
                            :readonly="pdsStore.isMyPds"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                            ]"
                            :invalid="validator.individual_question[0].q37_details.$error"
                            :invalid-text="validator.individual_question[0].q37_details.$errors[0]?.$message"
                            @blur="validator.individual_question[0].q37_details.$touch"
                            required
                          />
                        </div>
                      </div>
                      <hr />
                      <!-- Question # 38 -->
                      <!--  a. Have you ever been a candidate in a nation or local election held within the last year(except Barangay election)? -->
                      <div>
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-5">
                          <div class="flex items-start gap-2 md:col-span-4">
                            <span class="shrink-0 text-base font-medium text-surface-600">38.</span>
                            <p class="md:text-md text-lg text-surface-600">
                              a. Have you ever been a candidate in a national or local election held within the last year(except
                              Barangay election)?
                            </p>
                          </div>
                          <div class="flex flex-row items-center justify-center gap-12 p-4 md:justify-start md:p-2">
                            <div class="flex items-center">
                              <RadioButton
                                v-model="payload.individual_question[0].q38_a"
                                :id="getId('input-question-38_a-yes')"
                                :readonly="pdsStore.isMyPds"
                                name="q38_a"
                                :value="true"
                                :class="[
                                  'scale-150 transform',
                                  pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                              />
                              <label :for="getId('input-question-38_a-yes')" class="ml-2 cursor-pointer">Yes</label>
                            </div>
                            <div class="flex items-center">
                              <RadioButton
                                v-model="payload.individual_question[0].q38_a"
                                :id="getId('input-question-38_a-no')"
                                :readonly="pdsStore.isMyPds"
                                name="q38_a"
                                :value="false"
                                :class="[
                                  'scale-150 transform',
                                  pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                              />
                              <label :for="getId('input-question-38_a-no')" class="ml-2 cursor-pointer">No</label>
                            </div>
                          </div>
                        </div>
                        <!-- Conditional input shown only if any answer is "Yes" -->
                        <div
                          v-if="payload.individual_question[0].q38_a === true"
                          class="mb-2 ml-10 flex items-start gap-2 md:col-span-4"
                        >
                          <WbInputText
                            v-model="payload.individual_question[0].q38_a_details"
                            label="If YES, give details"
                            :readonly="pdsStore.isMyPds"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                            ]"
                            :invalid="validator.individual_question[0].q38_a_details.$error"
                            :invalid-text="validator.individual_question[0].q38_a_details.$errors[0]?.$message"
                            @blur="validator.individual_question[0].q38_a_details.$touch"
                            required
                          />
                        </div>
                        <!-- b. Have you resigned from the government service during the three (3)-month period      
                             before the last election to promote/actively campaign for a national or local candidate? -->
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-5">
                          <div class="mb-2 ml-10 flex items-start gap-2 md:col-span-4">
                            <span class="shrink-0 text-base font-medium text-surface-600">b.</span>
                            <p class="md:text-md text-lg text-surface-600">
                              Have you resigned from the government service during the three (3)-month period before the last
                              election to promote/actively campaign for a national or local candidate?
                            </p>
                          </div>
                          <div class="flex flex-row items-center justify-center gap-12 p-4 md:justify-start md:p-2">
                            <div class="flex items-center">
                              <RadioButton
                                v-model="payload.individual_question[0].q38_b"
                                :id="getId('input-question-38_b-yes')"
                                :readonly="pdsStore.isMyPds"
                                name="q38_b"
                                :value="true"
                                :class="[
                                  'scale-150 transform',
                                  pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                              />
                              <label :for="getId('input-question-38_b-yes')" class="ml-2 cursor-pointer">Yes</label>
                            </div>
                            <div class="flex items-center">
                              <RadioButton
                                v-model="payload.individual_question[0].q38_b"
                                :id="getId('input-question-38_b-no')"
                                :readonly="pdsStore.isMyPds"
                                name="q38_b"
                                :value="false"
                                :class="[
                                  'scale-150 transform',
                                  pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                              />
                              <label :for="getId('input-question-38_b-no')" class="ml-2 cursor-pointer">No</label>
                            </div>
                          </div>
                        </div>
                        <!-- Conditional input shown only if any answer is "Yes" -->
                        <div
                          v-if="payload.individual_question[0].q38_b === true"
                          class="mb-2 ml-10 flex items-start gap-2 md:col-span-4"
                        >
                          <WbInputText
                            v-model="payload.individual_question[0].q38_b_details"
                            label="If YES, give details"
                            :readonly="pdsStore.isMyPds"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                            ]"
                            :invalid="validator.individual_question[0].q38_b_details.$error"
                            :invalid-text="validator.individual_question[0].q38_b_details.$errors[0]?.$message"
                            @blur="validator.individual_question[0].q38_b_details.$touch"
                            required
                          />
                        </div>
                      </div>
                      <hr />
                      <!-- Question # 39 -->
                      <div>
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-5">
                          <div class="flex items-start gap-2 md:col-span-4">
                            <span class="shrink-0 text-base font-medium text-surface-600">39.</span>
                            <p class="md:text-md text-lg text-surface-600">
                              Have you acquired the status of an immigrate or permanent resident of another country?
                            </p>
                          </div>
                          <div class="flex flex-row items-center justify-center gap-12 p-4 md:justify-start md:p-2">
                            <div class="flex items-center">
                              <RadioButton
                                v-model="payload.individual_question[0].q39"
                                :id="getId('input-question-39-yes')"
                                :readonly="pdsStore.isMyPds"
                                name="q39"
                                :value="true"
                                :class="[
                                  'scale-150 transform',
                                  pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                              />
                              <label :for="getId('input-question-39-yes')" class="ml-2 cursor-pointer">Yes</label>
                            </div>
                            <div class="flex items-center">
                              <RadioButton
                                v-model="payload.individual_question[0].q39"
                                :id="getId('input-question-39-no')"
                                :readonly="pdsStore.isMyPds"
                                name="q39"
                                :value="false"
                                :class="[
                                  'scale-150 transform',
                                  pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                              />
                              <label :for="getId('input-question-39-no')" class="ml-2 cursor-pointer">No</label>
                            </div>
                          </div>
                        </div>
                        <!-- Conditional input shown only if any answer is "Yes" -->
                        <div
                          v-if="payload.individual_question[0].q39 === true"
                          class="mb-2 ml-10 flex items-start gap-2 md:col-span-4"
                        >
                          <WbAutoComplete
                            :useApiFilter="true"
                            :apiEndpoint="'/libraries/countries/search'"
                            :suggestions="libraryStore.countryOptions"
                            :loading="libraryStore.countryOptionsLoading"
                            apiOptionLabel="country_code"
                            label="If YES, give details"
                            :readonly="pdsStore.isMyPds"
                            placeholder="Type the Country"
                            v-model="selectedCountry"
                            :id="getId('input-office')"
                            optionLabel="label"
                            optionValue="value"
                            required
                            forceSelection
                            @on-true-value-computed="
                              (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
                                useWbAutoCompleteHandleTrueValue(value, toRef(payload.individual_question[0], 'country_id'))
                            "
                            label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                            ]"
                            validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                            :invalid="validator.individual_question[0].country_id.$error"
                            :invalid-text="validator.individual_question[0].country_id.$errors[0]?.$message"
                            @blur="validator.individual_question[0].country_id.$touch"
                          >
                          </WbAutoComplete>
                        </div>
                      </div>
                      <hr />
                      <!-- Question # 40-->
                      <div>
                        <div class="flex items-start gap-2">
                          <div class="flex items-start gap-2 md:col-span-4">
                            <span class="shrink-0 text-base font-medium text-surface-600">40.</span>
                            <p class="md:text-md text-lg text-surface-600">
                              Pursuant to: (a) Indigenous People`s Act (RA 8371); (b) Magna Carta for readonly Persons (RA 7277);
                              and (c) Solo Parents Welfare Act of 2000 (RA 8972), please answer the following items:
                            </p>
                          </div>
                        </div>

                        <!--  a. Are you a member of any indigenous group? -->
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-5">
                          <div class="ml-10 flex items-start gap-2 md:col-span-4">
                            <span class="shrink-0 text-base font-medium text-surface-600">a.</span>
                            <p class="md:text-md text-lg text-surface-600">Are you a member of any indigenous group?</p>
                          </div>
                          <div class="flex flex-row items-center justify-center gap-12 p-4 md:justify-start md:p-2">
                            <div class="flex items-center">
                              <RadioButton
                                v-model="payload.individual_question[0].q40_a_indigenous_group"
                                :id="getId('input-question-q40_a_indigenous_group-yes')"
                                name="q40_a_indigenous_group"
                                :readonly="pdsStore.isMyPds"
                                :value="true"
                                :class="[
                                  'scale-150 transform',
                                  pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                              />
                              <label :for="getId('input-question-q40_a_indigenous_group-yes')" class="ml-2 cursor-pointer"
                                >Yes</label
                              >
                            </div>
                            <div class="flex items-center">
                              <RadioButton
                                v-model="payload.individual_question[0].q40_a_indigenous_group"
                                :id="getId('input-question-q40_a_indigenous_group-no')"
                                name="q40_a_indigenous_group"
                                :readonly="pdsStore.isMyPds"
                                :value="false"
                                :class="[
                                  'scale-150 transform',
                                  pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                              />
                              <label :for="getId('input-question-q40_a_indigenous_group-no')" class="ml-2 cursor-pointer"
                                >No</label
                              >
                            </div>
                          </div>
                        </div>
                        <!-- Conditional input shown only if any answer is "Yes" -->
                        <div
                          v-if="payload.individual_question[0].q40_a_indigenous_group === true"
                          class="mb-2 ml-10 flex items-start gap-2 md:col-span-4"
                        >
                          <WbInputText
                            v-model="payload.individual_question[0].q40_a_details"
                            label="If YES, give details"
                            :readonly="pdsStore.isMyPds"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                            ]"
                            :invalid="validator.individual_question[0].q40_a_details.$error"
                            :invalid-text="validator.individual_question[0].q40_a_details.$errors[0]?.$message"
                            @blur="validator.individual_question[0].q40_a_details.$touch"
                            required
                          />
                        </div>

                        <!--  b. Are you a person with disability? -->
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-5">
                          <div class="ml-10 flex items-start gap-2 md:col-span-4">
                            <span class="shrink-0 text-base font-medium text-surface-600">b.</span>
                            <p class="md:text-md text-lg text-surface-600">Are you a person with disability?</p>
                          </div>
                          <div class="flex flex-row items-center justify-center gap-12 p-4 md:justify-start md:p-2">
                            <div class="flex items-center">
                              <RadioButton
                                v-model="payload.individual_question[0].q40_b_pwd"
                                :id="getId('input-question-q40_b_pwd-yes')"
                                :readonly="pdsStore.isMyPds"
                                name="q40_b_pwd"
                                :value="true"
                                :class="[
                                  'scale-150 transform',
                                  pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                              />
                              <label :for="getId('input-question-q40_b_pwd-yes')" class="ml-2 cursor-pointer">Yes</label>
                            </div>
                            <div class="flex items-center">
                              <RadioButton
                                v-model="payload.individual_question[0].q40_b_pwd"
                                :id="getId('input-question-q40_b_pwd-no')"
                                :readonly="pdsStore.isMyPds"
                                name="q40_b_pwd"
                                :value="false"
                                :class="[
                                  'scale-150 transform',
                                  pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                              />
                              <label :for="getId('input-question-q40_b_pwd-no')" class="ml-2 cursor-pointer">No</label>
                            </div>
                          </div>
                        </div>
                        <!-- Conditional input shown only if any answer is "Yes" -->
                        <div
                          v-if="payload.individual_question[0].q40_b_pwd === true"
                          class="mb-2 ml-10 flex items-start gap-2 md:col-span-4"
                        >
                          <WbInputText
                            v-model="payload.individual_question[0].q40_b_details"
                            label="If YES, give details"
                            :readonly="pdsStore.isMyPds"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                            ]"
                            :invalid="validator.individual_question[0].q40_b_details.$error"
                            :invalid-text="validator.individual_question[0].q40_b_details.$errors[0]?.$message"
                            @blur="validator.individual_question[0].q40_b_details.$touch"
                            required
                          />
                        </div>

                        <!--  c. Are you a solo parent? -->
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-5">
                          <div class="ml-10 flex items-start gap-2 md:col-span-4">
                            <span class="shrink-0 text-base font-medium text-surface-600">c.</span>
                            <p class="md:text-md text-lg text-surface-600">Are you a solo parent?</p>
                          </div>
                          <div class="flex flex-row items-center justify-center gap-12 p-4 md:justify-start md:p-2">
                            <div class="flex items-center">
                              <RadioButton
                                v-model="payload.individual_question[0].q40_c_solo_parent"
                                :id="getId('input-question-q40_c_solo_parent-yes')"
                                :readonly="pdsStore.isMyPds"
                                name="q40_c_solo_parent"
                                :value="true"
                                :class="[
                                  'scale-150 transform',
                                  pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                              />
                              <label :for="getId('input-question-q40_c_solo_parent-yes')" class="ml-2 cursor-pointer">Yes</label>
                            </div>
                            <div class="flex items-center">
                              <RadioButton
                                v-model="payload.individual_question[0].q40_c_solo_parent"
                                :id="getId('input-question-q40_c_solo_parent-no')"
                                :readonly="pdsStore.isMyPds"
                                name="q40_c_solo_parent"
                                :value="false"
                                :class="[
                                  'scale-150 transform',
                                  pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                                ]"
                              />
                              <label :for="getId('input-question-q40_c_solo_parent-no')" class="ml-2 cursor-pointer">No</label>
                            </div>
                          </div>
                        </div>
                        <!-- Conditional input shown only if any answer is "Yes" -->
                        <div
                          v-if="payload.individual_question[0].q40_c_solo_parent === true"
                          class="mb-2 ml-10 flex items-start gap-2 md:col-span-4"
                        >
                          <WbInputText
                            v-model="payload.individual_question[0].q40_c_details"
                            label="If YES, give details"
                            :readonly="pdsStore.isMyPds"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                            :class="[
                              'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                              pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                            ]"
                            :invalid="validator.individual_question[0].q40_c_details.$error"
                            :invalid-text="validator.individual_question[0].q40_c_details.$errors[0]?.$message"
                            @blur="validator.individual_question[0].q40_c_details.$touch"
                            required
                          />
                        </div>
                      </div>

                      <hr />
                    </template>
                  </div>
                </TransitionRoot>
              </TabPanel>
              <!-- END VOLUNTARY WORK  SECTION -->

              <!-- START REFERENCES & GOV`T ISSUED ID -->
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
                      <p class="text-xl italic md:text-2xl">VIII. References</p>
                      <p class="md:text-md text-lg italic text-error-600">
                        (Person not related by consanguinity or affinity to applicant / appointee)
                      </p>
                    </span>

                    <template v-for="referenceIndex in payload.individual_reference.length" :key="referenceIndex">
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
                        <div v-if="!payload.individual_reference[referenceIndex - 1]?._delete">
                          <p class="mb-4 text-surface-700">
                            Reference #
                            {{
                              payload.individual_reference
                                .filter((ref) => !ref._delete)
                                .indexOf(payload.individual_reference[referenceIndex - 1]) + 1
                            }}
                          </p>
                          <div v-if="!payload.individual_reference[referenceIndex - 1]?._delete">
                            <div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-5">
                              <div class="md:col-span-2">
                                <WbInputText
                                  v-model="payload.individual_reference[referenceIndex - 1].name"
                                  label="Name"
                                  :readonly="pdsStore.isMyPds"
                                  label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-xs md:mb-1"
                                  :class="[
                                    pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                                    'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                                    validator.individual_reference[referenceIndex - 1].name.$error ? 'mb-0' : 'mb-6',
                                  ]"
                                  validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                  :invalidText="validator.individual_reference[referenceIndex - 1].name.$errors[0]?.$message"
                                  :invalid="validator.individual_reference[referenceIndex - 1].name.$error"
                                  @blur="validator.individual_reference[referenceIndex - 1].name.$touch()"
                                  required
                                />
                              </div>
                              <div class="md:col-span-2">
                                <WbInputText
                                  v-model="payload.individual_reference[referenceIndex - 1].address"
                                  label="Office / Residential Address"
                                  :readonly="pdsStore.isMyPds"
                                  label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                  :class="[
                                    pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                                    'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                                    validator.individual_reference[referenceIndex - 1].address.$error ? 'mb-0' : 'mb-6',
                                  ]"
                                  validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                  :invalidText="validator.individual_reference[referenceIndex - 1].address.$errors[0]?.$message"
                                  :invalid="validator.individual_reference[referenceIndex - 1].address.$error"
                                  @blur="validator.individual_reference[referenceIndex - 1].address.$touch()"
                                  required
                                />
                              </div>
                              <div class="flex items-end gap-2">
                                <!-- WbInputText takes most of the space -->
                                <WbInputText
                                  v-model="payload.individual_reference[referenceIndex - 1].tel_no"
                                  label="Contact No. and/or Email"
                                  :readonly="pdsStore.isMyPds"
                                  label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                  :class="[
                                    pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                                    'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                                    validator.individual_reference[referenceIndex - 1].tel_no.$error ? 'mb-0' : 'mb-10',
                                  ]"
                                  validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                  :invalidText="validator.individual_reference[referenceIndex - 1].tel_no.$errors[0]?.$message"
                                  :invalid="validator.individual_reference[referenceIndex - 1].tel_no.$error"
                                  @blur="validator.individual_reference[referenceIndex - 1].tel_no.$touch()"
                                  required
                                />

                                <!-- Delete button aligned right, below label -->
                                <Button
                                  v-if="!pdsStore.isMyPds"
                                  v-show="referenceIndex > 1"
                                  :id="getId(`button-remove-learning-development-${referenceIndex}`)"
                                  icon="pi pi-trash"
                                  @click="handleRemoveReference(referenceIndex)"
                                  v-tooltip.top="'Remove Reference'"
                                  severity="danger"
                                  :class="[
                                    'text-lg font-semibold dark:text-primary-100',
                                    validator.individual_reference[referenceIndex - 1].tel_no.$error ? 'mb-8' : 'mb-12',
                                  ]"
                                  text
                                />
                              </div>
                            </div>
                          </div>
                          <hr />
                        </div>
                      </TransitionRoot>
                    </template>

                    <Button
                      v-if="payload.individual_reference.filter((ref) => !ref._delete).length < 3 && !pdsStore.isMyPds"
                      label="Add additional References field"
                      @click="handleAdditionalReference"
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
                    <p class="md:text-md text-lg italic">Note: A maximum of 3 Reference entries are allowed.</p>
                  </span>
                  <hr />

                  <div class="mt-8 flex flex-col gap-4">
                    <span class="flex flex-col justify-center space-y-2 font-medium text-primary-700">
                      <p class="text-xl italic md:text-2xl">VIII. Goverment Issued ID</p>
                      <p class="md:text-md text-lg italic text-surface-600">
                        Government Issued ID (i.e.Passport, GSIS, SSS, PRC, Driver's License, etc.) PLEASE INDICATE ID Number and
                        Date of Issuance
                      </p>
                    </span>
                    <template v-if="true">
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
                        <div>
                          <div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-5">
                            <!-- Government Issued ID -->
                            <div class="md:col-span-2">
                              <WbInputText
                                v-model="payload.individual_government_id.gov_issued_id"
                                label="Government Issued ID"
                                :readonly="pdsStore.isMyPds"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm md:mb-1"
                                :class="[
                                  pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                                  'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                                  validator.individual_government_id.gov_issued_id.$error ? 'mb-0' : 'mb-6',
                                ]"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalid="validator.individual_government_id.gov_issued_id.$error"
                                :invalidText="validator.individual_government_id.gov_issued_id.$errors[0]?.$message"
                                @blur="validator.individual_government_id.gov_issued_id.$touch()"
                                required
                              />
                            </div>

                            <!-- ID / License / Passport No -->
                            <div class="md:col-span-2">
                              <WbInputText
                                v-model="payload.individual_government_id.gov_id_no"
                                label="ID / License / Passport No."
                                :readonly="pdsStore.isMyPds"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                :class="[
                                  pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                                  'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                                  validator.individual_government_id.gov_id_no.$error ? 'mb-0' : 'mb-6',
                                ]"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalid="validator.individual_government_id.gov_id_no.$error"
                                :invalidText="validator.individual_government_id.gov_id_no.$errors[0]?.$message"
                                @blur="validator.individual_government_id.gov_id_no.$touch()"
                                required
                              />
                            </div>

                            <!-- Date / Place of Issuance -->
                            <div class="flex items-end gap-2">
                              <WbInputText
                                v-model="payload.individual_government_id.gov_issuance"
                                label="Date / Place of Issuance"
                                :readonly="pdsStore.isMyPds"
                                label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                                :class="[
                                  pdsStore.isMyPds ? 'pointer-events-none cursor-default select-text' : '',
                                  'lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm',
                                  validator.individual_government_id.gov_issuance.$error ? 'mb-0' : 'mb-10',
                                ]"
                                validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                                :invalid="validator.individual_government_id.gov_issuance.$error"
                                :invalidText="validator.individual_government_id.gov_issuance.$errors[0]?.$message"
                                @blur="validator.individual_government_id.gov_issuance.$touch()"
                                required
                              />
                            </div>
                          </div>

                          <hr />
                        </div>
                      </TransitionRoot>
                    </template>
                  </div>

                  <span class="mt-10 flex flex-col justify-center space-y-4 font-medium text-surface-600">
                    <p class="md:text-md text-lg italic">
                      SUBSCRIBED AND SWORN to before me this __________________________, affiant exhibiting her validly issued
                      government ID as indicated above
                    </p>
                  </span>
                </TransitionRoot>
              </TabPanel>
              <!-- END LEARNING & DEVELOPMENT -->
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
