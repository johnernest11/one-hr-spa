<script setup lang="ts">
import WbInputText from '@/components/webkit/WbInputText.vue'
import Message from 'primevue/message'
import Button from 'primevue/button'
import WbPassword from '@/components/webkit/WbPassword.vue'
import { reactive, ref, onMounted } from 'vue'
import useVuelidate from '@vuelidate/core'
import { helpers, required } from '@vuelidate/validators'
import { useRoute, useRouter } from 'vue-router'
import { LoginPayload, useAuthStore } from '@/stores/auth.store.ts'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import AppLogo from '@/components/layout/AppLogo.vue'
import { checkIfValidMobileNumber } from '@/utils/helpers.ts'
import { ApiErrorCode } from '@/typings/http-resources.types.ts'
import { useSettingsStore } from '@/stores/settings.store.ts'

/** Emits */
const emit = defineEmits<{
  (e: 'onCredentialsError', value: boolean): void
}>()

/** Props */
const props = withDefaults(defineProps<{ showLoginExpiredAlert: boolean }>(), {
  showLoginExpiredAlert: false,
})

const route = useRoute()
/** Payload */
const payload = reactive<LoginPayload>({
  email: (route.query.email as string) || '',
  password: '',
})

/** Form Validation */
const formRules = {
  $lazy: true,
  email: {
    required: helpers.withMessage('Enter your email or mobile number', required),
  },
  password: {
    required: helpers.withMessage('Enter your password', required),
  },
}
const validator = useVuelidate<LoginPayload>(formRules, payload)

/** Form Submission */
const formIsSubmitting = ref(false)
const showCredsErrorAlert = ref(false)
const credsErrorMessage = ref('')
const router = useRouter()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const hrCaresUrl = import.meta.env.VITE_SPA_SSO_URL
const token = ref<string | undefined>()
const handleSSO = async () => {
  window.location.href = hrCaresUrl
}

const ssoToken = async (token: string) => {
  const res = await authStore.ssoLogin(token)

  if (res.success) {
    await router.push({ name: 'dashboard' })
  } else {
    credsErrorMessage.value = 'Auto-login failed. Please log in manually.'
    showCredsErrorAlert.value = true
  }
}

onMounted(async () => {
  token.value = route.query.token as string | undefined
  if (token.value) {
    await ssoToken(token.value)
  }
})

const handleLogin = async () => {
  formIsSubmitting.value = true
  const valid = await validator.value.$validate()
  if (!valid) return (formIsSubmitting.value = false)

  const newPayload = manageIfEmailIsPhoneNumber(Object.assign({}, payload))
  const res = await authStore.login(newPayload)

  // Handle unsuccessful login attempt
  if (!res.success) {
    formIsSubmitting.value = false
    showCredsErrorAlert.value = true

    switch (res.error_code) {
      case ApiErrorCode.INVALID_CREDENTIALS_ERROR:
      case ApiErrorCode.VALIDATION_ERROR:
        credsErrorMessage.value = "The credentials you've entered are incorrect"
        break
      case ApiErrorCode.FORBIDDEN_ERROR:
        credsErrorMessage.value =
          "We're sorry, but your account login is currently disabled. To reactivate your account, please contact support."
        break
      case ApiErrorCode.TOO_MANY_REQUESTS_ERROR:
        credsErrorMessage.value = "We've received too many attempts from you. Please try again after a few minutes."
        break
      default:
        credsErrorMessage.value = 'Unable to login to your account. Please contact our support team.'
    }

    emit('onCredentialsError', true)
    return
  }

  formIsSubmitting.value = false

  // Handle Login -> MFA Guard -> Verify Account flow if MFA is enabled
  if (route.query.from === 'verify-account' && settingsStore.mfaIsEnabled) {
    return await router.replace({
      name: 'mfa-guard-page',
      query: {
        from: route.query.from,
        id: route.query.id,
        hash: route.query.hash,
        expires: route.query.expires,
        signature: route.query.signature,
      },
    })
  }

  // Handle Login -> Verify Account flow if MFA is disabled
  if (route.query.from === 'verify-account' && !settingsStore.mfaIsEnabled) {
    return await router.replace({
      name: route.query.from,
      params: {
        id: route.query.id as string,
        hash: route.query.hash as string,
      },
      query: {
        expires: route.query.expires,
        signature: route.query.signature,
      },
    })
  }

  // If MFA is enabled, the mfa_token and mfa_steps will be populated
  // and the user is not authenticated
  if (authStore.mfaToken && !authStore.isAuthenticated) {
    return await router.replace({
      name: 'mfa-guard-page',
      query: {
        from: route.query.from,
      },
    })
  }

  // Redirect to the `from` route if it exists
  if (route.query.from) {
    return await router.replace({ name: route.query.from as string })
  }

  // For normal log-ins, we go the dashboard page for verified emails, and to the guard page for those who
  // have un-verified emails
  if (authStore.authenticatedUser.email_verified_at) {
    return await router.replace({ name: 'dashboard' })
  } else {
    return await router.replace({ name: 'verify-email-guard' })
  }
}

const manageIfEmailIsPhoneNumber = (payload: LoginPayload) => {
  if (checkIfValidMobileNumber(payload.email || '')) {
    payload.mobile_number = payload.email
    delete payload.email
  }
  return payload
}
</script>

<template>
  <section class="bg-transparent">
    <div class="text-center text-surface-0 lg:text-surface-800">
      <div class="mb-2 mt-6 flex justify-center lg:hidden">
        <AppLogo color="light"></AppLogo>
      </div>
      <h2 class="font-menu text-2xl font-bold text-surface-0 md:text-3xl lg:mt-6 lg:text-surface-800 dark:lg:text-surface-0">
        Account Login
      </h2>
      <p class="mb-4 mt-2 text-sm text-surface-0 lg:text-surface-500 dark:lg:text-surface-200">
        Sign in to your existing account
      </p>
    </div>
    <!-- Start Alert Message -->
    <transition enter-active-class="transition duration-200" enter-from-class="scale-50 opacity-0" leave-to-class="opacity-0">
      <Message v-if="showCredsErrorAlert" :closable="false" severity="error">
        <span>{{ credsErrorMessage }}</span>
      </Message>
    </transition>
    <!-- End Alert Message -->
    <!-- Start Auth Token Expired Message -->
    <transition enter-active-class="transition duration-200" enter-from-class="scale-50 opacity-0" leave-to-class="opacity-0">
      <Message v-if="props.showLoginExpiredAlert && !showCredsErrorAlert" :closable="false" severity="warn">
        <span>Your login session has expired, please enter your credentials again to continue.</span>
      </Message>
    </transition>
    <!-- End Auth Token Expired Message -->
    <!-- Start Form -->
    <form class="mt-8 flex flex-col space-y-6" @submit.prevent>
      <WbInputText
        v-model="payload.email"
        label="Email or mobile number"
        :invalid="validator.email.$invalid"
        :invalid-text="validator.email.$errors[0]?.$message"
        label-class="text-xs text-surface-0 lg:text-surface-800 dark:lg:text-surface-200"
        validation-error-message-class="text-xs text-error-300 font-bold lg:font-normal lg:text-error-500 dark:lg:text-error-300"
      >
        <template #prepend-icon>
          <i class="pi pi-envelope" />
        </template>
      </WbInputText>
      <WbPassword
        v-model="payload.password"
        label="Password"
        :feedback="false"
        toggleMask
        :invalid="validator.password.$invalid"
        :invalid-text="validator.password.$errors[0]?.$message"
        @keyup.enter="handleLogin"
        label-class="text-xs text-surface-0 lg:text-surface-800 dark:lg:text-surface-200"
        validation-error-message-class="text-xs text-error-300 font-bold lg:font-normal lg:text-error-500 dark:lg:text-error-300"
      >
        <template #prepend-icon>
          <i class="pi pi-lock" />
        </template>
      </WbPassword>
      <div>
        <Button @click="handleLogin" label="Sign in" size="large" class="mt-3 w-full" :loading="formIsSubmitting"></Button>
        <Button @click="handleSSO" label="Sign in using your Active Directory (AD) account" size="large" class="mt-3 w-full"></Button>
      </div>
      <p class="flex justify-between pt-3 text-center">
        <Button
          label="Forgot Password"
          size="small"
          class="text-xs text-surface-0 hover:bg-surface-100 dark:text-primary-100 dark:hover:bg-primary-300/20 lg:text-surface-500 dark:lg:text-primary-400"
          text
          @click="$router.push({ name: 'forgot-password' })"
        >
          <template #icon>
            <FontAwesomeIcon icon="fa-solid fa-lock" class="mr-1.5" />
          </template>
        </Button>
        <Button
          label="Create an account"
          size="small"
          class="text-xs text-surface-0 dark:text-primary-100 lg:text-primary-400 dark:lg:text-primary-400"
          text
          @click="$router.push({ name: 'sign-up' })"
        >
          <template #icon>
            <FontAwesomeIcon icon="fa-solid fa-right-to-bracket" class="mr-1.5" />
          </template>
        </Button>
      </p>
    </form>
    <!-- End Form -->
  </section>
</template>

<style scoped></style>
