<script setup lang="ts">
import AnimatedFloaters from '@/components/misc/AnimatedFloaters.vue'
import LoginForm from '@/components/auth-page/LoginForm.vue'
import { useRoute } from 'vue-router'
import { computed, onMounted, ref, watch } from 'vue'
import RegisterForm from '@/components/auth-page/register-form/RegisterForm.vue'
import { useAuthStore } from '@/stores/auth.store.ts'
import { TransitionRoot } from '@headlessui/vue'

/** We either show the Login Form or the Create Account Form based on the route */
const route = useRoute()
const showLogin = ref(true)
const token = ref<string | undefined>()
// We check route when DOM mounts
onMounted(() => {
  showLogin.value = route.name === 'login' ? (showLogin.value = true) : (showLogin.value = false)
  token.value = route.query.token as string | undefined
})

// We toggle background color of the Webkit text on the left side based on form errors and warnings
const formHasError = ref(false)
const formHasWarning = ref(false)

// We also watch for route changes
watch(
  () => route.name,
  (name) => {
    showLogin.value = name === 'login'
    formHasError.value = false
    formHasWarning.value = false
  }
)

// Handle Login Expiration
const authStore = useAuthStore()
const showLoginExpiredAlert = computed(() => {
  return authStore.authExpired
})

// Handle Refresh Token Expiration
const showRefreshTokenExpiredAlert = computed(() => {
  return authStore.refreshTokenExpired
})
</script>

<template>
  <div class="relative flex min-h-screen">
    <AnimatedFloaters class="lg:hidden" />
    <div class="flex min-w-0 flex-auto flex-col items-center lg:flex-row">
      <div
        :class="`relative hidden h-full flex-auto items-center justify-center overflow-hidden bg-primary-900 p-10 text-surface-0 transition-colors duration-500 md:hidden lg:flex ${
          formHasWarning || showLoginExpiredAlert || showRefreshTokenExpiredAlert ? '!bg-warn-500' : ''
        } ${formHasError ? '!bg-error-500' : ''}`"
      >
        <div
          :class="`absolute inset-0 z-0 bg-gradient-to-b from-primary-500 to-primary-900 transition-colors duration-500 dark:from-primary-900 dark:to-primary-950 ${
            formHasWarning || showLoginExpiredAlert || showRefreshTokenExpiredAlert
              ? '!from-warn-500 !to-warn-900 dark:!from-warn-800 '
              : ''
          } ${formHasError ? '!from-error-500 !to-error-900 dark:!from-error-800 ' : ''}`"
        ></div>
        <!-- Start Webkit Text -->
        <div
          :class="`z-10 w-full max-w-2xl ${formHasError || formHasWarning || showLoginExpiredAlert || showRefreshTokenExpiredAlert ? 'animate-shake' : ''}`"
        >
          <div class="flex items-center gap-6">
            <TransitionRoot
              :show="true"
              appear
              enter="transition-all duration-700 delay-700"
              enterFrom="opacity-0 translate-y-6"
              enterTo="opacity-100 translate-y-0"
            >
              <img src="@/assets/favicon.svg" class="mr-2 h-28 w-auto" />
            </TransitionRoot>

            <TransitionRoot
              :show="true"
              appear
              enter="transition-all duration-1000 delay-1000"
              enterFrom="opacity-0 translate-y-6"
              enterTo="opacity-100 translate-y-0"
            >
              <div class="flex flex-col">
                <h1 class="font-menu font-bold leading-tight dark:text-surface-0 sm:text-4xl xl:text-5xl">HRCARES</h1>
                <span class="font-normal text-surface-200 dark:text-surface-0 sm:text-sm xl:text-lg">
                  Human Resources Comprehensive Access to Records and Employee Services</span
                >
              </div>
              <div v-if="token" class="animate-fade-in z-10 flex flex-col items-center justify-center space-y-6 text-center">
                <div class="animate-fade-in flex items-center gap-3 text-base">
                  <svg
                    class="h-5 w-5 animate-spin text-surface-0"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  <span class="tracking-wide">Authenticating, please wait...</span>
                </div>
              </div>
            </TransitionRoot>
          </div>
        </div>
        <!-- End Webkit Text -->
        <AnimatedFloaters class="hidden lg:flex" />
      </div>
      <div
        v-if="!token"
        :class="`h-full w-full bg-gradient-to-b
         from-primary-500 to-primary-900 p-8 transition-all duration-500
         dark:from-primary-900 dark:to-primary-950 sm:w-auto
         md:rounded-none lg:flex lg:h-full
         lg:items-center lg:justify-center
         lg:bg-gradient-to-b lg:from-surface-0 lg:to-surface-0 lg:p-10 dark:lg:from-surface-950
         dark:lg:to-surface-950
         xl:p-14 ${showLogin ? 'md:w-[100%] md:px-16 lg:w-[40%]' : 'md:w-[100%] md:px-16 lg:w-[60%]'}`"
      >
        <!-- Start Login Form -->
        <transition
          enter-active-class="transition duration-500"
          enter-from-class="translate-y-40 opacity-0"
          leave-active-class="opacity-0"
          leave-to-class="opacity-0"
        >
          <template v-if="showLogin">
            <LoginForm
              class="mt-6 w-full lg:mt-0"
              @on-credentials-error="formHasError = true"
              :show-login-expired-alert="showLoginExpiredAlert"
              :show-refresh-token-expired-alert="showRefreshTokenExpiredAlert"
            />
          </template>
          <template v-else>
            <RegisterForm class="mt-6 w-full lg:mt-0" />
          </template>
        </transition>
        <!-- End Login Form -->
      </div>
    </div>
  </div>
</template>
