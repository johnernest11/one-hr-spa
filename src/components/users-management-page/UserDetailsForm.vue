<script setup lang="ts">
import { computed, onBeforeMount, reactive, ref, toRef, watch } from 'vue'
import { UserPayload, useUsersStore } from '@/stores/users.store.ts'
import { helpers, required } from '@vuelidate/validators'
import useVuelidate from '@vuelidate/core'
import { useRolesStore } from '@/stores/roles.store.ts'
import { AuthRole } from '@/typings/auth.types.ts'
import { useToast } from 'primevue/usetoast'
import { UserResponse } from '@/typings/models.types.ts'
import { parseApiResponseError } from '@/utils/error-handle.ts'

import Button from 'primevue/button'
import WbMultiSelect from '@/components/webkit/WbMultiSelect.vue'
import WbInputText from '@/components/webkit/WbInputText.vue'
import WbDropdown from '@/components/webkit/WbDropdown.vue'
import InputSwitch from 'primevue/inputswitch'
import Message from 'primevue/message'

import { useConfirm } from 'primevue/useconfirm'
import Dialog from 'primevue/dialog'
import ManageMfaForm from '@/components/users-management-page/ManageMfaForm.vue'
import { useSettingsStore } from '@/stores/settings.store.ts'
import WbAutoComplete, { WbAutoCompleteOption, WbAutoCompleteOptionTrueValue } from '@/components/webkit/WbAutoComplete.vue'
import { useWbAutoCompleteHandleTrueValue } from '@/composables/wb-ui-components'
import { usePrependOrAppendOnce } from '@/utils/helpers'

const getId = usePrependOrAppendOnce('user-management')
const selectedEmployee = ref<WbAutoCompleteOption[] | null>(null)
const usersStore = useUsersStore()
/** Emits */
const emit = defineEmits<{
  (e: 'user-updated', value: boolean): void
  (e: 'user-deleted', value: boolean): void
}>()

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
  username: props.user.username || '',
  roles: props.user.roles.map((r) => r.id),
  active: props.user.active,
  individual_basic_detail_id: 0,
})

watch(
  () => payload.individual_basic_detail_id,
  (newSelectedItem) => {
    console.log(payload.individual_basic_detail_id)
    if (!newSelectedItem) {
      selectedEmployee.value = null
      return
    }
  }
)

// We disabled editing and deletion for super users
const userIsSuperUser = computed(() => {
  return !!props.user.roles.find((r) => AuthRole.SUPER_USER.toString() === r.name)
})

// Toggle Edit Button
const editingEnabled = ref(false)

const activationOptions = [
  { label: 'Activated', value: true },
  { label: 'Deactivated', value: false },
]

/** Roles Options */
const rolesStore = useRolesStore()
const rolesOptionsIsLoading = ref(false)
const rolesOptions = computed(() => {
  // Admins should not be able to select the Super User option
  return rolesStore.roleOptions.filter((r) => r.name !== AuthRole.SUPER_USER.toString())
})
onBeforeMount(async () => {
  rolesOptionsIsLoading.value = true

  try {
    const response = await rolesStore.fetchRoles()

    if (!response?.success) {
      console.error('Failed to fetch roles:', response?.errors || response?.message)
    }
  } catch (error) {
    console.error('Unexpected error while fetching roles:', error)
  } finally {
    rolesOptionsIsLoading.value = false
  }
})

const formRules = {
  $lazy: true,
  roles: {
    required: helpers.withMessage('A user must have a role selected', required),
  },
  individual_basic_detail_id: {
    required: helpers.withMessage('A user must have a Employee to Activate', required),
  },
}

// Handle Form Submission
const validator = useVuelidate<Partial<UserPayload>>(formRules, payload)
const formIsSubmitting = ref(false)
const showErrorAlert = ref(false)
const errorMessage = ref<string | null>(null)
const errorDetails = ref<string[]>([])
const userStore = useUsersStore()
const toast = useToast()
const handleFormSubmission = async () => {
  const valid = await validator.value.$validate()
  if (!valid) {
    document.getElementsByClassName('update-user-creds-section')[0]?.scrollIntoView({ behavior: 'smooth' })
    toast.add({
      severity: 'error',
      summary: 'User Details',
      detail: 'Please see the validation messages',
      life: 5000,
    })
    return
  }

  formIsSubmitting.value = true
  const response = await userStore.updateUser(payload, props.user.id, props.currentRoleFilter)
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
    summary: 'User Details',
    detail: "You've successfully updated a user",
    life: 5000,
  })

  emit('user-updated', true)
}

/** Handle User Deletion */
const userIsBeingDeleted = ref(false)
const handleUserDeletion = async () => {
  userIsBeingDeleted.value = true
  const response = await userStore.deleteUser(props.user.id)

  if (!response.success) {
    const result = parseApiResponseError(response)
    if (!result) return (formIsSubmitting.value = false)

    showErrorAlert.value = true
    errorMessage.value = result.message
    errorDetails.value = result.errors
    userIsBeingDeleted.value = false
    return document.getElementsByClassName('create-user-creds-section')[0]?.scrollIntoView({ behavior: 'smooth' })
  }

  toast.add({
    severity: 'success',
    summary: 'User Deletion',
    detail: `${props.user.user_profile?.full_name || 'The user '} was successfully deleted`,
    life: 5000,
  })

  userIsBeingDeleted.value = false
  emit('user-deleted', true)
}

const confirm = useConfirm()
const requireConfirmation = (event: Event) => {
  confirm.require({
    group: 'global',
    target: event.currentTarget as HTMLElement,
    message: ` Are you sure you want to delete ${props.user.user_profile?.full_name || 'this user'}? You cannot undo this.`,
    header: 'Delete User',
    acceptLabel: 'Confirm Deletion',
    rejectLabel: 'Cancel',
    accept: () => {
      handleUserDeletion()
    },
  })
}

/** Handle MFA Config */
const showMfaConfigDialog = ref(false)
const settingsStore = useSettingsStore()
</script>

<template>
  <form autocomplete="off" @submit.prevent>
    <div class="flex w-full flex-col gap-4 pb-4">
      <!-- Start Alert Message -->
      <transition enter-active-class="transition duration-200" enter-from-class="scale-50 opacity-0" leave-to-class="opacity-0">
        <Message v-if="showErrorAlert" :closable="false" severity="error">
          <span>{{ errorMessage }}</span>
          <div class="flex flex-col text-xs">
            <div v-for="error in errorDetails" :key="error" class="mt-0.5">{{ '- ' + error }}</div>
          </div>
        </Message>
      </transition>
      <!-- End Alert Message -->
      <!-- Start Super User Cannot be Edited nor Deleted Warning -->
      <!-- End Super User Cannot be Edited nor Deleted Warning -->
      <Message v-if="userIsSuperUser" :closable="false" severity="warn">
        <span>A Super User can neither be edited or deleted.</span>
      </Message>
      <!-- Start Toggle Edit Switch & MFA Pop-up -->
      <div class="mb-1 flex items-center justify-between">
        <!-- Start MFA Dialog Button -->
        <div class="flex items-center">
          <button
            v-if="settingsStore.mfaIsEnabled && settingsStore.mfaIsConfigurable"
            @click="showMfaConfigDialog = true"
            class="!px-0 text-xs transition-all hover:underline"
          >
            <i class="pi pi-lock mr-1" />
            <span class="hidden sm:inline">Configure Multi-Factor Authentication</span>
            <span class="inline font-medium text-surface-500 sm:hidden">MFA</span>
          </button>
        </div>
        <!-- End MFA Dialog Button -->
        <!-- Start Enable Editing Switch -->
        <div class="flex items-center justify-between">
          <span class="mr-3 text-xs text-surface-500">{{ !editingEnabled ? 'Enable Editing' : 'Disabled Editing' }}</span>
          <InputSwitch v-model="editingEnabled" :disabled="userIsSuperUser"></InputSwitch>
        </div>
        <!-- End Enable Editing Switch -->
      </div>
      <!-- End Toggle Edit Switch & MFA Pop-up -->

      <!-- Start Credentials -->
      <p class="create-user-creds-section text-xs font-medium uppercase">Credentials of {{ payload.name }}</p>
      <!-- Start Roles & Activation Select -->
      <div class="flex flex-col gap-4 md:flex-row">
        <WbInputText v-model="payload.email" label="Email" :disabled="!editingEnabled">
          <template #prepend-icon>
            <i class="pi pi-envelope" />
          </template>
        </WbInputText>
        <WbInputText v-model="payload.username" label="User Name" :disabled="!editingEnabled">
          <template #prepend-icon>
            <i class="pi pi-envelope" />
          </template>
        </WbInputText>
      </div>
      <!-- End Roles & Activation Select -->
      <!-- Start Roles & Activation Select -->
      <div class="flex flex-col gap-4 md:flex-row">
        <WbMultiSelect
          v-model="payload.roles"
          :options="rolesOptions"
          label="Roles"
          placeholder="-- Select Roles --"
          optionLabel="label"
          optionValue="value"
          optionDisabled="disabled"
          :loading="rolesOptionsIsLoading"
          :disabled="rolesOptionsIsLoading || !editingEnabled"
          display="chip"
          class="text-xs"
          :invalid="validator.roles.$invalid"
          :invalid-text="validator.roles.$errors[0]?.$message"
          @blur="validator.roles.$touch"
          @focusin="validator.roles.$dirty = false"
        />
        <WbDropdown
          v-model="payload.active"
          :options="activationOptions"
          optionLabel="label"
          optionValue="value"
          label="Activation Status"
          :disabled="!editingEnabled"
        >
          <template #prepend-icon>
            <i class="pi pi-lock" />
          </template>
        </WbDropdown>
      </div>
      <div class="flex flex-col gap-4 md:flex-row" v-if="!props.user.user_profile">
        <WbAutoComplete
          :useApiFilter="true"
          :apiEndpoint="'/individual-basic-details/search'"
          :suggestions="usersStore.employeeOptions"
          :loading="usersStore.employeeOptionsLoading"
          apiOptionLabel="employee_name"
          label="Employee Activation"
          placeholder="Search Employee`s to activate SSO Account"
          v-model="selectedEmployee"
          :id="getId('input-user-management')"
          optionLabel="label"
          optionValue="value"
          @on-true-value-computed="
            (value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]) =>
              useWbAutoCompleteHandleTrueValue(value, toRef(payload, 'individual_basic_detail_id'))
          "
          label-class="text-sm text-start text-surface-600 dark:lg:text-surface-200"
          class="lg:text-md lg:placeholder:text-md w-full text-sm placeholder:text-sm"
          validation-error-message-class="text-xs text-error-500 font-bold lg:font-normal dark:lg:text-error-300"
          :invalid="validator.individual_basic_detail_id.$invalid"
          :invalid-text="validator.individual_basic_detail_id.$errors[0]?.$message"
          @blur="validator.individual_basic_detail_id.$touch"
          @focusin="validator.individual_basic_detail_id.$dirty = false"
          :disabled="!editingEnabled"
        />
      </div>
      <!-- End Roles & Activation Select -->
      <!-- End Credentials -->

      <!-- Start Action Buttons -->
      <div class="mt-2 flex justify-between">
        <!-- Start Delete Button with Confirmation -->
        <Button
          @click="requireConfirmation($event)"
          label="Delete"
          severity="danger"
          :loading="userIsBeingDeleted"
          :disabled="formIsSubmitting || addressesAreLoading || !editingEnabled || userIsBeingDeleted"
        >
          <template #icon>
            <i class="pi pi-trash mr-2"></i>
          </template>
        </Button>
        <!-- End Delete Button with Confirmation -->
        <!-- Start Update Button -->
        <Button
          @click="handleFormSubmission"
          label="Update"
          :loading="formIsSubmitting"
          :disabled="formIsSubmitting || addressesAreLoading || !editingEnabled"
        >
          <template #icon>
            <i class="pi pi-save mr-2"></i>
          </template>
        </Button>
      </div>
      <!-- End Update Button -->
      <!-- End Action Buttons -->
    </div>
    <Dialog
      v-if="settingsStore.mfaIsEnabled && settingsStore.mfaIsConfigurable"
      v-model:visible="showMfaConfigDialog"
      header="MFA Config"
      modal
      :draggable="false"
      class="mx-2 w-full sm:mx-0"
    >
      <ManageMfaForm
        :user-id="props.user.id"
        :user-full-name="props.user.user_profile?.full_name || ''"
        @mfa-config-updated="showMfaConfigDialog = false"
      />
    </Dialog>
  </form>
</template>
