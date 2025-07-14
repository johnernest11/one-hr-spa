<script setup lang="ts">
import { reactive, ref, computed, toRef } from 'vue'
import { usePdsStore, PersonalDataSheetPayload } from '@/stores/pds.store.ts'
import { useLibrariesStore } from '@/stores/libraries.store.ts'
import { useRouter } from 'vue-router'
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
import { helpers, required } from '@vuelidate/validators'
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/vue'
import { mobilePhoneRule } from '@/utils/custom-validations'
import { usePrependOrAppendOnce } from '@/utils/helpers.js'
import { TransitionRoot } from '@headlessui/vue'

const getId = usePrependOrAppendOnce('pds-c3-section-form')
const pdsStore = usePdsStore()
const libraryStore = useLibrariesStore()
const toast = useToast()
const router = useRouter()

const maxToasts = 5
const pdsErrors = ref()
const errorMessage = ref()

const isC4Loading = ref(false)
const isPdsError = ref(false)
const activeToasts = ref<number>(0)
const selectedCountry = ref<WbAutoCompleteOption[] | null>(null)
const c4Tabs = ref([
  { name: ' Other Information Continued', index: 0 },
  { name: ' References & Gov` Issued ID', index: 1 },
])

defineProps({
  activeSubTab: {
    type: Number,
    default: undefined,
  },
})

/** Payload */
const payload = reactive<PersonalDataSheetPayload>({
  ...pdsStore.pdsInfo,
})

const conditionalRequiredIfTrue = (fields: keyof IndividualQuestion | (keyof IndividualQuestion)[]) =>
  helpers.withMessage('Please provide details if you answered YES.', (val: unknown, vm: IndividualQuestion) => {
    const fieldList = Array.isArray(fields) ? fields : [fields]
    return fieldList.some((field) => vm[field] === true) ? helpers.req(val) : true
  })

const formRules = computed(() => ({
  individual_question: {
    q34_details: {
      required: conditionalRequiredIfTrue(['q34_a', 'q34_b']),
    },
    q35_a_details: {
      required: conditionalRequiredIfTrue('q35_a'),
    },
    q35_b_date_filed: {
      required: conditionalRequiredIfTrue('q35_b'),
    },
    q35_b_status: {
      required: conditionalRequiredIfTrue('q35_b'),
    },
    q36_details: {
      required: conditionalRequiredIfTrue('q36'),
    },
    q37_details: {
      required: conditionalRequiredIfTrue('q37'),
    },
    q38_a_details: {
      required: conditionalRequiredIfTrue('q38_a'),
    },
    q38_b_details: {
      required: conditionalRequiredIfTrue('q38_b'),
    },
    country_id: {
      required: conditionalRequiredIfTrue('q39'),
    },
    q40_a_details: {
      required: conditionalRequiredIfTrue('q40_a_indigenous_group'),
    },
    q40_b_details: {
      required: conditionalRequiredIfTrue('q40_b_pwd'),
    },
    q40_c_details: {
      required: conditionalRequiredIfTrue('q40_c_solo_parent'),
    },
  },
  individual_reference: payload.individual_reference.map(() => ({
    name: {
      required: helpers.withMessage('Name is required.', required),
    },
    address: {
      required: helpers.withMessage('Address is required.', required),
    },
    tel_no: {
      required: helpers.withMessage('Tel No. Sponsor is required.', required),
      tel_no: helpers.withMessage('Must be a valid PH mobile number', mobilePhoneRule()),
    },
  })),
  individual_government_id: {
    gov_id_name: {
      required: helpers.withMessage('Goverment Id is required.', required),
    },
    gov_id_no: {
      required: helpers.withMessage('ID No is required.', required),
    },
    gov_id_issuance: {
      required: helpers.withMessage('Date/Place of Issuance Sponsor is required.', required),
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
    }, 5000)
  }
}

const handleAdditionalReference = () => {
  if (payload.individual_reference.length < 3) {
    payload.individual_reference.push({
      name: null,
      address: null,
      tel_no: null,
    })
  }
}

const handleRemoveReference = (referenceIndex: number) => {
  payload.individual_reference?.splice(referenceIndex, 1)
}

const handleSaveC4Form = async () => {
  isC4Loading.value = true

  const valid = await validator.value.$validate()
  if (!valid) {
    const hasIndividualQuestionError = Object.values(validator.value.individual_question).some(
      (entry) => (entry as { $error: boolean })?.$error
    )

    const hasIndividualReferenceError = Object.values(validator.value.individual_reference).some(
      (entry) => (entry as { $error: boolean })?.$error
    )

    const hasIndividualGovermentIDError = Object.values(validator.value.individual_government_id).some(
      (entry) => (entry as { $error: boolean })?.$error
    )

    let errorTabs = []
    if (hasIndividualQuestionError) errorTabs.push('Other Information Continued')
    if (hasIndividualReferenceError) errorTabs.push('References & Gov` Issued ID')
    if (hasIndividualGovermentIDError) errorTabs.push('References & Gov` Issued ID')

    const tabList = errorTabs.join(', ')
    showToast('error', 'Validation Error', `Please check the following tab(s): ${tabList}`)

    isC4Loading.value = false
    return { valid: false, errorTabs: ['C4'] }
  }
  console.log('Payload before save:', payload)
  const response = await pdsStore.savePds(payload)

  if (response.success === false) {
    const result = parseApiResponseError(response)

    isPdsError.value = true
    errorMessage.value = result?.message
    pdsErrors.value = result?.errors
    showToast('error', 'PDS C4 Error', 'Please see the validation messages')
  } else {
    showToast('success', 'PDS', 'PDS has been saved')
    router.push({ name: 'employment' })
  }

  isC4Loading.value = false
}

defineExpose({
  handleSaveC4Form,
})
</script>

<template>
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
                          chief of bureau or office or to the person who has immediate supervision over you in the Office, Bureau
                          or Department where you will be appointed,
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
                              name="q34_a"
                              :value="true"
                              class="scale-150 transform"
                            />
                            <label :for="getId('input-question-34a-yes')" class="ml-2 cursor-pointer">Yes</label>
                          </div>
                          <div class="flex items-center">
                            <RadioButton
                              v-model="payload.individual_question[0].q34_a"
                              :id="getId('input-question-34a-no')"
                              name="q34_a"
                              :value="false"
                              class="scale-150 transform"
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
                              name="q34_b"
                              :value="true"
                              class="scale-150 transform"
                            />
                            <label :for="getId('input-question-34b-yes')" class="ml-2 cursor-pointer">Yes</label>
                          </div>
                          <div class="flex items-center">
                            <RadioButton
                              v-model="payload.individual_question[0].q34_b"
                              :id="getId('input-question-34b-no')"
                              name="q34_b"
                              :value="false"
                              class="scale-150 transform"
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
                          label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :invalid="validator.individual_question.q34_details.$error"
                          :invalid-text="validator.individual_question.q34_details.$errors[0]?.$message"
                          @blur="validator.individual_question.q34_details.$touch"
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
                              name="q35_a"
                              :value="true"
                              class="scale-150 transform"
                            />
                            <label :for="getId('input-question-34a-yes')" class="ml-2 cursor-pointer">Yes</label>
                          </div>
                          <div class="flex items-center">
                            <RadioButton
                              v-model="payload.individual_question[0].q35_a"
                              :id="getId('input-question-35a-no')"
                              name="q35_a"
                              :value="false"
                              class="scale-150 transform"
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
                          label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          :invalid="validator.individual_question.q35_a_details.$error"
                          :invalid-text="validator.individual_question.q35_a_details.$errors[0]?.$message"
                          @blur="validator.individual_question.q35_a_details.$touch"
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
                              name="q35_b"
                              :value="true"
                              class="scale-150 transform"
                            />
                            <label :for="getId('input-question-34b-yes')" class="ml-2 cursor-pointer">Yes</label>
                          </div>
                          <div class="flex items-center">
                            <RadioButton
                              v-model="payload.individual_question[0].q35_b"
                              :id="getId('input-question-35b-no')"
                              name="q35_b"
                              :value="false"
                              class="scale-150 transform"
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
                            label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm md:mb-1"
                            class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                            validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                            :invalid="validator.individual_question.q35_b_date_filed.$error"
                            :invalid-text="validator.individual_question.q35_b_date_filed.$errors[0]?.$message"
                            @blur="validator.individual_question.q35_b_date_filed.$touch"
                            required
                          />
                        </div>
                        <div class="md:col-span-2">
                          <WbInputText
                            v-model="payload.individual_question[0].q35_b_status"
                            label="Status of Case/s"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                            class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                            validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                            :invalid="validator.individual_question.q35_b_status.$error"
                            :invalid-text="validator.individual_question.q35_b_status.$errors[0]?.$message"
                            @blur="validator.individual_question.q35_b_status.$touch"
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
                            Have you ever been convicted of any crime or violation of any law, decree, ordinance or regulation by
                            any court or tribunal?
                          </p>
                        </div>
                        <div class="flex flex-row items-center justify-center gap-12 p-4 md:justify-start md:p-2">
                          <div class="flex items-center">
                            <RadioButton
                              v-model="payload.individual_question[0].q36"
                              :id="getId('input-question-36-yes')"
                              name="q36"
                              :value="true"
                              class="scale-150 transform"
                            />
                            <label :for="getId('input-question-36-yes')" class="ml-2 cursor-pointer">Yes</label>
                          </div>
                          <div class="flex items-center">
                            <RadioButton
                              v-model="payload.individual_question[0].q36"
                              :id="getId('input-question-36-no')"
                              name="q36"
                              :value="false"
                              class="scale-150 transform"
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
                          label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          :invalid="validator.individual_question.q36_details.$error"
                          :invalid-text="validator.individual_question.q36_details.$errors[0]?.$message"
                          @blur="validator.individual_question.q36_details.$touch"
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
                            Have you ever been separated from the service in any of the following modes: resignation, retirement,
                            dropped from the rolls, dismissal, termination, end of term, finished contract or phased out
                            (abolition) in the public or private sector?
                          </p>
                        </div>
                        <div class="flex flex-row items-center justify-center gap-12 p-4 md:justify-start md:p-2">
                          <div class="flex items-center">
                            <RadioButton
                              v-model="payload.individual_question[0].q37"
                              :id="getId('input-question-37-yes')"
                              name="q37"
                              :value="true"
                              class="scale-150 transform"
                            />
                            <label :for="getId('input-question-37-yes')" class="ml-2 cursor-pointer">Yes</label>
                          </div>
                          <div class="flex items-center">
                            <RadioButton
                              v-model="payload.individual_question[0].q37"
                              :id="getId('input-question-37-no')"
                              name="q37"
                              :value="false"
                              class="scale-150 transform"
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
                          label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          :invalid="validator.individual_question.q37_details.$error"
                          :invalid-text="validator.individual_question.q37_details.$errors[0]?.$message"
                          @blur="validator.individual_question.q37_details.$touch"
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
                              name="q38_a"
                              :value="true"
                              class="scale-150 transform"
                            />
                            <label :for="getId('input-question-38_a-yes')" class="ml-2 cursor-pointer">Yes</label>
                          </div>
                          <div class="flex items-center">
                            <RadioButton
                              v-model="payload.individual_question[0].q38_a"
                              :id="getId('input-question-38_a-no')"
                              name="q38_a"
                              :value="false"
                              class="scale-150 transform"
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
                          label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          :invalid="validator.individual_question.q38_a_details.$error"
                          :invalid-text="validator.individual_question.q38_a_details.$errors[0]?.$message"
                          @blur="validator.individual_question.q38_a_details.$touch"
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
                              name="q38_b"
                              :value="true"
                              class="scale-150 transform"
                            />
                            <label :for="getId('input-question-38_b-yes')" class="ml-2 cursor-pointer">Yes</label>
                          </div>
                          <div class="flex items-center">
                            <RadioButton
                              v-model="payload.individual_question[0].q38_b"
                              :id="getId('input-question-38_b-no')"
                              name="q38_b"
                              :value="false"
                              class="scale-150 transform"
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
                          label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          :invalid="validator.individual_question.q38_b_details.$error"
                          :invalid-text="validator.individual_question.q38_b_details.$errors[0]?.$message"
                          @blur="validator.individual_question.q38_b_details.$touch"
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
                              name="q39"
                              :value="true"
                              class="scale-150 transform"
                            />
                            <label :for="getId('input-question-39-yes')" class="ml-2 cursor-pointer">Yes</label>
                          </div>
                          <div class="flex items-center">
                            <RadioButton
                              v-model="payload.individual_question[0].q39"
                              :id="getId('input-question-39-no')"
                              name="q39"
                              :value="false"
                              class="scale-150 transform"
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
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                          :invalid="validator.individual_question.country_id.$error"
                          :invalid-text="validator.individual_question.country_id.$errors[0]?.$message"
                          @blur="validator.individual_question.country_id.$touch"
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
                            Pursuant to: (a) Indigenous People`s Act (RA 8371); (b) Magna Carta for Disabled Persons (RA 7277);
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
                              :value="true"
                              class="scale-150 transform"
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
                              :value="false"
                              class="scale-150 transform"
                            />
                            <label :for="getId('input-question-q40_a_indigenous_group-no')" class="ml-2 cursor-pointer">No</label>
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
                          label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          :invalid="validator.individual_question.q40_a_details.$error"
                          :invalid-text="validator.individual_question.q40_a_details.$errors[0]?.$message"
                          @blur="validator.individual_question.q40_a_details.$touch"
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
                              name="q40_b_pwd"
                              :value="true"
                              class="scale-150 transform"
                            />
                            <label :for="getId('input-question-q40_b_pwd-yes')" class="ml-2 cursor-pointer">Yes</label>
                          </div>
                          <div class="flex items-center">
                            <RadioButton
                              v-model="payload.individual_question[0].q40_b_pwd"
                              :id="getId('input-question-q40_b_pwd-no')"
                              name="q40_b_pwd"
                              :value="false"
                              class="scale-150 transform"
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
                          label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          :invalid="validator.individual_question.q40_b_details.$error"
                          :invalid-text="validator.individual_question.q40_b_details.$errors[0]?.$message"
                          @blur="validator.individual_question.q40_b_details.$touch"
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
                              name="q40_c_solo_parent"
                              :value="true"
                              class="scale-150 transform"
                            />
                            <label :for="getId('input-question-q40_c_solo_parent-yes')" class="ml-2 cursor-pointer">Yes</label>
                          </div>
                          <div class="flex items-center">
                            <RadioButton
                              v-model="payload.individual_question[0].q40_c_solo_parent"
                              :id="getId('input-question-q40_c_solo_parent-no')"
                              name="q40_c_solo_parent"
                              :value="false"
                              class="scale-150 transform"
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
                          label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                          :invalid="validator.individual_question.q40_c_details.$error"
                          :invalid-text="validator.individual_question.q40_c_details.$errors[0]?.$message"
                          @blur="validator.individual_question.q40_c_details.$touch"
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
                      <p class="mb-4 text-surface-700">Reference # {{ referenceIndex }}</p>
                      <div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-5">
                        <div class="md:col-span-2">
                          <WbInputText
                            v-model="payload.individual_reference[referenceIndex - 1].name"
                            label="Name"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-xs md:mb-1"
                            class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
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
                            label="Address"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                            class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
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
                            label="Tel. No"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                            class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                            validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                            :invalidText="validator.individual_reference[referenceIndex - 1].tel_no.$errors[0]?.$message"
                            :invalid="validator.individual_reference[referenceIndex - 1].tel_no.$error"
                            @blur="validator.individual_reference[referenceIndex - 1].tel_no.$touch()"
                            required
                          />

                          <!-- Delete button aligned right, below label -->
                          <Button
                            v-show="referenceIndex - 1 > 0"
                            :id="getId(`button-remove-learning-development-${referenceIndex - 1}`)"
                            icon="pi pi-trash"
                            @click="handleRemoveReference(referenceIndex - 1)"
                            v-tooltip.top="'Remove L&D'"
                            severity="danger"
                            class="mb-2 text-lg font-semibold dark:text-primary-100"
                            text
                          />
                        </div>
                      </div>
                      <hr />
                    </TransitionRoot>
                  </template>

                  <Button
                    v-if="payload.individual_reference.length < 3"
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
                      enter="transition-all ease-in-out duration-500 "
                      enterFrom="opacity-0 translate-y-6"
                      enterTo="opacity-100 translate-y-0"
                      leave="transition-all ease-in-out duration-800"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                    >
                      <div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-5">
                        <div class="md:col-span-2">
                          <WbInputText
                            v-model="payload.individual_government_id.gov_id_name"
                            label="Government Issued ID"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm md:mb-1"
                            class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                            validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                            :invalid="validator.individual_government_id.gov_id_name.$error"
                            :invalid-text="validator.individual_government_id.gov_id_name.$errors[0]?.$message"
                            @blur="validator.individual_government_id.gov_id_name.$touch"
                            required
                          />
                        </div>
                        <div class="md:col-span-2">
                          <WbInputText
                            v-model="payload.individual_government_id.gov_id_no"
                            label="ID/License/Passport No."
                            label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                            class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                            validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                            :invalid="validator.individual_government_id.gov_id_no.$error"
                            :invalid-text="validator.individual_government_id.gov_id_no.$errors[0]?.$message"
                            @blur="validator.individual_government_id.gov_id_no.$touch"
                            required
                          />
                        </div>
                        <div class="flex items-end gap-2">
                          <WbInputText
                            v-model="payload.individual_government_id.gov_id_issuance"
                            label="Date/Place of Issuance"
                            label-class="text-md text-surface-600 dark:lg:text-surface-200 md:text-sm"
                            class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
                            validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
                            :invalid="validator.individual_government_id.gov_id_issuance.$error"
                            :invalid-text="validator.individual_government_id.gov_id_issuance.$errors[0]?.$message"
                            @blur="validator.individual_government_id.gov_id_issuance.$touch"
                            required
                          />
                        </div>
                      </div>
                      <hr />
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
