<script setup lang="ts">
import { reactive, ref } from 'vue'
import { UserPayload, useUsersStore } from '@/stores/users.store'
import { helpers, required } from '@vuelidate/validators'
import useVuelidate from '@vuelidate/core'
import { useToast } from 'primevue/usetoast'
import { UserResponse } from '@/typings/models.types.ts'
import { parseApiResponseError } from '@/utils/error-handle.ts'
import Button from 'primevue/button'
import WbInputText from '@/components/webkit/WbInputText.vue'
import Message from 'primevue/message'

/** Emits */

/** Props */
type UserDetailsFormProps = {
  currentRoleFilter: number | string | null
  user: UserResponse
}
const props = withDefaults(defineProps<UserDetailsFormProps>(), {
  currentRoleFilter: null,
})

/** Payload */
const payload = reactive<Partial<UserPayload>>({
  email: props.user.email || '',
  mobile_number: props.user.user_profile?.mobile_number || null,
  first_name: props.user.user_profile?.first_name || '',
  last_name: props.user.user_profile?.last_name || '',
  middle_name: props.user.user_profile?.middle_name || null,
  ext_name: props.user.user_profile?.ext_name || null,
  birthday: props.user.user_profile?.birthday || null,
  sex: props.user.user_profile?.sex || null,
  home_address: props.user.user_profile?.address?.home_address || null,
  city_id: props.user.user_profile?.address?.city?.id || null,
  province_id: props.user.user_profile?.address?.province?.id || null,
  region_id: props.user.user_profile?.address?.region?.id || null,
  postal_code: props.user.user_profile?.address?.postal_code || null,
  barangay_id: props.user.user_profile?.address?.barangay?.id || null,
  roles: props.user.roles.map((r) => r.id),
  active: props.user.active,
})

/** Form Validation */
const formRules = {
  $lazy: true,
  code: {
    required: helpers.withMessage('Uuid is required', required),
  },
  name: {
    required: helpers.withMessage('Uuid is required', required),
  },
}

// Handle Form Submission
const validator = useVuelidate<Partial<UserPayload>>(formRules, payload)
const formIsSubmitting = ref(false)
const showErrorAlert = ref(false)
const errorMessage = ref<string | null>(null)
const errorDetails = ref<string[]>([])
const odsuStore = useUsersStore()
const toast = useToast()
const handleFormSubmission = async () => {
  const valid = await validator.value.$validate()
  if (!valid) {
    document.getElementsByClassName('update-odsu-creds-section')[0]?.scrollIntoView({ behavior: 'smooth' })
    toast.add({
      severity: 'error',
      summary: 'Odsu Details',
      detail: 'Please see the validation messages',
      life: 5000,
    })
    return
  }

  formIsSubmitting.value = true
  const response = await odsuStore.updateUser(payload, props.user.id, props.currentRoleFilter)
  // Handle the API error
  if (!response.success) {
    const result = parseApiResponseError(response)
    if (!result) return (formIsSubmitting.value = false)

    showErrorAlert.value = true
    errorMessage.value = result.message
    errorDetails.value = result.errors

    formIsSubmitting.value = false
    return document.getElementsByClassName('create-odsu-creds-section')[0]?.scrollIntoView({ behavior: 'smooth' })
  }

  formIsSubmitting.value = false
  toast.add({
    severity: 'success',
    summary: 'Odsu Details',
    detail: "You've successfully updated a odsu",
    life: 5000,
  })
}

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

const weekOptions = ref([
  { label: 'Week 1', value: 1 },
  { label: 'Week 2', value: 2 },
  { label: 'Week 3', value: 3 },
  { label: 'Week 4', value: 4 },
  { label: 'Week 5', value: 5 },
  // ... your week options
])
</script>

<template v-if="props.user">
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
              <i class="pi pi-angle-double-down" style="font-size: 1.5rem"></i>Viewing Accomplishment
            </h2>
          </div>
          <p class="mb-2 ml-20 text-xl font-semibold text-blue-900 dark:text-white">Viewings Accomplishments</p>
          <br />
          <h2 class="mb-2 text-lg font-semibold text-gray-600 dark:text-white">Timeline</h2>
          <div class="flex flex-col md:flex-row">
            <div class="mb-4 ml-6 flex w-full flex-col items-start justify-center gap-2 py-2 md:w-4/12">
              <div class="flex w-full flex-col">
                <label for="password" class="mb-0 text-sm text-gray-600">
                  Period of Accomplishment <span class="text-red-500">*</span>
                </label>
                <WbInputText
                  v-model="payload.email"
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

            <div class="mt-2 flex w-full justify-end gap-2 md:ml-auto md:w-auto md:items-center md:justify-start">
              <Button
                @click="handleFormSubmission"
                label="Export to MS Word"
                :loading="formIsSubmitting"
                :disabled="formIsSubmitting"
                class="border border-blue-400 px-4 py-2 text-sm font-semibold text-surface-0 dark:text-primary-100 lg:text-primary-400 dark:lg:text-primary-400"
                text
              >
                <template #icon>
                  <i class="pi pi-file mr-2"></i>
                </template>
              </Button>
              <Button
                @click="handleFormSubmission"
                label="Mark as Done"
                :loading="formIsSubmitting"
                :disabled="formIsSubmitting"
                class="border border-blue-400 px-4 py-2 text-sm font-semibold text-surface-0 dark:text-primary-100 lg:text-primary-400 dark:lg:text-primary-400"
                text
              >
                <template #icon>
                  <i class="pi pi-save mr-2"></i>
                </template>
              </Button>
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
          <span> <i class="pi pi-ban mr-2"></i>Double click the area you wish to edit</span>
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
                  v-model="payload.roles"
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
            <div class="flex w-full flex-col items-start justify-center gap-3 py-2 md:w-5/12">
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
            <div class="flex w-full flex-col items-start justify-center gap-3 py-2 md:w-5/12">
              <div class="flex w-full flex-col gap-2">
                <Textarea
                  v-model="payload.last_name"
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
              label="+ Add Additional Week"
              @click="addAccomplishment"
              class="border border-blue-400 text-xs font-semibold text-surface-0 dark:text-primary-100 lg:text-primary-400 dark:lg:text-primary-400"
              text
            />
          </div>
          <div class="mt-2 flex justify-end gap-2">
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
