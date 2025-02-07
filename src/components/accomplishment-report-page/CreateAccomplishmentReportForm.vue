<script setup lang="ts">
import { computed, onBeforeMount, reactive, ref } from 'vue'
import { UserPayload, useUsersStore } from '@/stores/users.store.ts'
import useVuelidate from '@vuelidate/core'
import { email, helpers, maxLength, minLength, required, sameAs } from '@vuelidate/validators'
import { digitCountRule, mobilePhoneRule, passwordRule, uniqueUserIdentifierRule } from '@/utils/custom-validations.ts'
import { useToast } from 'primevue/usetoast'
import { parseApiResponseError } from '@/utils/error-handle.ts'
// import WbAutoComplete, { WbAutoCompleteOption, WbAutoCompleteOptionTrueValue } from '@/components/webkit/WbAutoComplete.vue'
// import { storeToRefs } from 'pinia'
import WbInputText from '@/components/webkit/WbInputText.vue'
import Textarea from 'primevue/textarea'
// import { useWbAutoCompleteHandleTrueValue } from '@/composables/wb-ui-components.ts'
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import Card from 'primevue/card'
import Message from 'primevue/message'
import Dropdown from 'primevue/dropdown'
import { useRolesStore } from '@/stores/roles.store.ts'
// import { AuthRole } from '@/typings/auth.types.ts'

/** Props */
const props = withDefaults(defineProps<{ currentRoleFilter: number | string | null }>(), {
  currentRoleFilter: null,
})

/** Payload */
const payload = reactive<Partial<UserPayload>>({
  email: '',
  mobile_number: null,
  first_name: '',
  last_name: '',
  middle_name: null,
  ext_name: null,
  birthday: null,
  sex: null,
  home_address: null,
  city_id: null,
  province_id: null,
  region_id: null,
  postal_code: null,
  barangay_id: null,
  roles: [],
})

/** Roles Options */
const rolesStore = useRolesStore()
const rolesOptionsIsLoading = ref(false)

onBeforeMount(async () => {
  rolesOptionsIsLoading.value = true
  await rolesStore.fetchRoles()
  rolesOptionsIsLoading.value = false
})

/** Validation */
const globalStringMaxLength = import.meta.env.VITE_GLOBAL_STRING_MAX_LENGTH
const globalStringMaxLengthRule = helpers.withMessage(
  `Must not exceed ${globalStringMaxLength} characters`,
  maxLength(globalStringMaxLength)
)
const formRules = {
  $lazy: true,
  email: {
    required: helpers.withMessage('The email address is required', required),
    email: helpers.withMessage('Email format is invalid', email),
    unique: helpers.withAsync(helpers.withMessage('This email is already taken', uniqueUserIdentifierRule('email'))),
  },
  mobile_number: {
    mobile_number: helpers.withMessage('Must be a valid PH mobile number', mobilePhoneRule()),
    unique: helpers.withAsync(
      helpers.withMessage('This mobile number is already taken', uniqueUserIdentifierRule('mobile_number'))
    ),
  },
  first_name: {
    required: helpers.withMessage('First name is required', required),
    maxLength: helpers.withMessage('', globalStringMaxLengthRule),
  },
  last_name: {
    required: helpers.withMessage('Last name is required', required),
    maxLength: globalStringMaxLengthRule,
  },
  middle_name: {
    maxLength: globalStringMaxLengthRule,
  },
  ext_name: {
    maxLength: globalStringMaxLengthRule,
  },
  home_address: {
    maxLength: globalStringMaxLengthRule,
  },
  postal_code: {
    digitCount: helpers.withMessage('Enter your 4-digit zip code', digitCountRule(4)),
  },
  roles: {
    required: helpers.withMessage('A user must have a role selected', required),
  },
  password: {
    required: helpers.withMessage('Please enter their password', required),
    minLength: helpers.withMessage('Must be at least 8 characters long', minLength(8)),
    maxLength: helpers.withMessage('Must be a maximum of 50 characters', maxLength(50)),
    password: helpers.withMessage('Must include at least one number, and one uppercase and lowercase letter', passwordRule()),
  },
  password_confirmation: {
    required: helpers.withMessage('Please confirm their password', required),
    sameAsPassword: helpers.withMessage('Must match the password field', sameAs(computed(() => payload.password))),
  },
}

/** Handle Form Submission */
const validator = useVuelidate<Partial<UserPayload>>(formRules, payload)
const formIsSubmitting = ref(false)
const showErrorAlert = ref(false)
const errorMessage = ref<string | null>(null)
const errorDetails = ref<string[]>([])
const userStore = useUsersStore()
const toast = useToast()

/** Emits */
const emit = defineEmits<{
  (e: 'user-created', value: boolean): void
}>()

/** Form Submission */
const handleFormSubmission = async () => {
  const valid = await validator.value.$validate()
  if (!valid) {
    document.getElementsByClassName('create-user-creds-section')[0]?.scrollIntoView({ behavior: 'smooth' })
    toast.add({
      severity: 'error',
      summary: 'Create User',
      detail: 'Please see the validation messages',
      life: 5000,
    })
    return
  }

  formIsSubmitting.value = true
  const response = await userStore.createUser(payload, props.currentRoleFilter)
  // Handle the API error
  if (!response.success) {
    const result = parseApiResponseError(response)
    if (!result) return (formIsSubmitting.value = false)

    showErrorAlert.value = true
    errorMessage.value = result.message
    errorDetails.value = result.errors

    formIsSubmitting.value = false
    return document.getElementsByClassName('create-user-creds-section')[0]?.scrollIntoView({ behavior: 'smooth' })
  }

  formIsSubmitting.value = false
  toast.add({
    severity: 'success',
    summary: 'Create User',
    detail: "You've successfully created a user",
    life: 5000,
  })

  emit('user-created', true)
}
const weekOptions = ref([
  { label: 'Week 1', value: 1 },
  { label: 'Week 2', value: 2 },
  { label: 'Week 3', value: 3 },
  { label: 'Week 4', value: 4 },
  { label: 'Week 5', value: 5 },
  // ... your week options
])

const selectedWeek = ref(null)
const AccomplishmentBtn = ref(false) // Initially hide the buttons
const AddAccomplishmentFieldBtn = ref(false) // Initially hide the buttons
// const showDateInput = ref(false);
const showTextArea1 = ref(false)
const showTextArea2 = ref(false)

const accomplishments = ref([
  {
    week: null,
    dates: '',
    activity: '',
    highlights: '',
  },
])
const addAccomplishment = () => {
  accomplishments.value.push({
    week: null,
    dates: '',
    activity: '',
    highlights: '',
  })
}

const removeAccomplishment = (index: number) => {
  if (index >= 0 && index < accomplishments.value.length) {
    accomplishments.value.splice(index, 1)
  } else {
    console.error('Invalid index for removing accomplishment:', index)
    // Optionally, handle the error more gracefully, e.g., display a message to the user.
  }
}

const handleWeekChange = (index: number) => {
  if (index >= 0 && index < accomplishments.value.length) {
    // Important bounds check!
    showTextArea1.value = selectedWeek.value !== null
    showTextArea2.value = selectedWeek.value !== null
    AccomplishmentBtn.value = selectedWeek.value !== null
    AddAccomplishmentFieldBtn.value = selectedWeek.value !== null

    console.log('Selected Week for index ' + index + ':', accomplishments.value[index].week)
  } else {
    console.error('Invalid index:', index) // Handle out-of-bounds index
  }
}
</script>

<template>
  <form autocomplete="off" @submit.prevent>
    <div class="flex w-full flex-col gap-4 pb-4">
      <Card class="h-full">
        <template #content>
          <div class="flex w-full">
            <Button
              icon="pi pi-angle-left"
              severity="secondary"
              aria-label="Bookmark"
              rounded
              v-tooltip.top="'Filter Accomplishments'"
              @click="$router.go(-1)"
              size="small"
            />
            <h2 class="mb-2 ml-4 text-3xl font-semibold text-blue-900 dark:text-white">
              <i class="pi pi-angle-double-down" style="font-size: 1.5rem"></i>New Accomplishment Reports
            </h2>
          </div>
          <br />
          <h2 class="mb-2 text-lg font-semibold text-gray-600 dark:text-white">Timeline</h2>
          <div class="flex flex-col md:flex-row">
            <div class="mb-4 ml-6 flex w-full flex-col items-start justify-center gap-2 py-2 md:w-4/12">
              <div class="flex w-full flex-col">
                <label for="password" class="mb-0 text-sm text-gray-600"
                  >Period of Accomplishment <span class="text-red-500">*</span></label
                >
                <WbInputText
                  v-model="payload.first_name"
                  label=""
                  placeholder="Period of Accomplishment"
                  :invalid="validator.first_name.$invalid"
                  :invalid-text="validator.first_name.$errors?.$message"
                  @blur="validator.first_name.$touch"
                  class="w-full"
                >
                </WbInputText>
              </div>
            </div>
          </div>
          <!-- Start Alert Message -->
          <transition
            enter-active-class="transition duration-200"
            enter-from-class="scale-50 opacity-0"
            leave-to-class="opacity-0"
          >
            <Message v-if="showErrorAlert" :closable="false" severity="error" class="mb-2">
              <span>{{ errorMessage }}</span>
              <div class="flex flex-col text-xs">
                <div v-for="error in errorDetails" :key="error" class="mt-0.5">{{ '- ' + error }}</div>
              </div>
            </Message>
          </transition>
          <!-- End Alert Message -->
          <h1 class="mb-2 text-lg font-semibold text-gray-600 dark:text-white">Accomplishment</h1>
          <div class="flex justify-center border-b-2 bg-gray-100 py-2" style="min-width: 50rem">
            <div class="ml-12 w-1/6 text-left font-semibold text-gray-500">Week # (Date/s)</div>
            <div class="ml-12 w-1/2 text-center font-semibold text-gray-500">SPECIFIC ACTIVITY</div>
            <div class="w-1/2 text-center font-semibold text-gray-500">HIGHLIGHTS OF ACCOMPLISHMENT</div>
          </div>
          <div v-for="(_, index) in accomplishments" :key="index" class="mb-4 flex flex-col md:flex-row">
            <div class="mb-4 ml-6 flex w-full flex-col items-start justify-center gap-2 py-2 pt-8 md:w-2/12">
              <div class="flex w-full flex-col">
                <label for="password" class="mb-0 text-sm text-gray-600">Week <span class="text-red-500">*</span></label>
                <Dropdown
                  v-model="selectedWeek"
                  :options="weekOptions"
                  optionLabel="label"
                  optionValue="value"
                  @change="handleWeekChange(index)"
                  class="mb-4 w-full md:w-11/12"
                  placeholder="Choose a Week"
                >
                </Dropdown>
                <label for="password" class="mb-0 text-sm text-gray-600"
                  >Date/s or Converage <span class="text-red-500">*</span></label
                >
                <WbInputText
                  v-model="payload.first_name"
                  label=""
                  placeholder="e.g. 16 - 17 January 2025"
                  :invalid="validator.first_name.$invalid"
                  :invalid-text="validator.first_name.$errors?.$message"
                  @blur="validator.first_name.$touch"
                  class="md:w-12/12 w-full"
                >
                </WbInputText>
              </div>
            </div>
            <Divider layout="vertical"></Divider>
            <div v-if="showTextArea1" class="flex w-full flex-col items-start justify-center gap-3 py-2 md:w-5/12">
              <div class="flex w-full flex-col gap-2">
                <Textarea
                  v-model="payload.mobile_number"
                  rows="10"
                  class="w-full"
                  :invalid="validator.mobile_number.$invalid"
                  :invalid-text="validator.mobile_number.$errors[0]?.$message"
                  @blur="validator.mobile_number.$touch"
                  @focusin="validator.mobile_number.$dirty = false"
                >
                </Textarea>
              </div>
            </div>
            <Divider layout="vertical"></Divider>
            <div v-if="showTextArea2" class="flex w-full flex-col items-start justify-center gap-3 py-2 md:w-5/12">
              <div class="flex w-full flex-col gap-2">
                <Textarea
                  v-model="payload.mobile_number"
                  rows="10"
                  class="w-full"
                  :invalid="validator.mobile_number.$invalid"
                  :invalid-text="validator.mobile_number.$errors[0]?.$message"
                  @blur="validator.mobile_number.$touch"
                  @focusin="validator.mobile_number.$dirty = false"
                >
                </Textarea>
              </div>
            </div>

            <Button
              icon="pi pi-trash"
              severity="danger"
              rounded
              @click="removeAccomplishment(index)"
              v-if="accomplishments.length > 1"
              class="mt-2"
            />
          </div>
          <div class="flex w-full flex-col gap-4 pb-4">
            <hr />
            <Button
              v-if="AddAccomplishmentFieldBtn"
              label="+ Add Additional Week"
              @click="addAccomplishment"
              class="border border-blue-400 text-xs font-semibold text-surface-0 dark:text-primary-100 lg:text-primary-400 dark:lg:text-primary-400"
              text
            />
          </div>
          <div v-if="AccomplishmentBtn" class="mt-2 flex justify-end gap-2">
            <Button
              @click="handleFormSubmission"
              label="Cancel"
              :loading="formIsSubmitting"
              :disabled="formIsSubmitting"
              class="dark:text-secondary-100 lg:text-secondary-400 dark:lg:text-secondary-400 border border-gray-300 text-xs text-gray-500 dark:border-surface-700"
              text
            >
              <template #icon>
                <i class="pi pi-ban mr-2"></i>
              </template>
            </Button>
            <Button
              @click="handleFormSubmission"
              label="Save as Draft"
              :loading="formIsSubmitting"
              :disabled="formIsSubmitting"
              class="border border-blue-400 text-xs font-semibold text-surface-0 dark:text-primary-100 lg:text-primary-400 dark:lg:text-primary-400"
              text
            >
              <template #icon>
                <i class="pi pi-file mr-2"></i>
              </template>
            </Button>
            <Button
              @click="handleFormSubmission"
              label="Save Accomplishment"
              :loading="formIsSubmitting"
              :disabled="formIsSubmitting"
              class="border border-blue-400 text-xs font-semibold text-surface-0 dark:text-primary-100 lg:text-primary-400 dark:lg:text-primary-400"
              text
            >
              <template #icon>
                <i class="pi pi-save mr-2"></i>
              </template>
            </Button>
          </div>

          <!-- End Action Buttons -->
        </template>
      </Card>
    </div>
  </form>
</template>
