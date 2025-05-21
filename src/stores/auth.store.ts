import { defineStore } from 'pinia'
import { StorageSerializers, useDateFormat, useStorage } from '@vueuse/core'
import { computed, ref } from 'vue'
import { useApiCall } from '@/composables/network.ts'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { UserResponse } from '@/typings/models.types.ts'
import { RegistrationPayload } from '@/stores/forms.store.ts'

/** Typings */
export type LoginPayload = {
  email?: string
  mobile_number?: string
  password: string
  with_user?: boolean
  client_name?: string
}

export type AuthResponse = {
  token: string
  token_name: string
  expires_at: string
  user: UserResponse
}

type MfaResponseData = {
  mfa_token: string
  mfa_token_expires_at: string
  mfa_steps: Array<MfaStep>
}

type MfaStep = {
  name: string
  completed: boolean
  type: 'app' | 'delivery'
  enrolled: boolean
}

type MfaQrCodeResponseData = {
  qr_code: string
  backup_codes: Array<string>
  current_step: string
  secret_key: string
}

export type MfaAllStepsResponseData = Array<{
  name: string
  enabled: boolean
  type: 'app' | 'delivery'
}>

export type MfaVerifyBackupCodeResponseData = {
  message: string
  current_step: string
  qr_code: string
  secret_key: string
}

export type MfaUnEnrollUserPayload = {
  user_id: string | number
  mfa_step: string
}

export type ResetPasswordPayload = {
  email: string
  token: string
  password: string
  password_confirmation: string
}

export type VerifyEmailPayload = {
  id: string
  hash: string
  signature: string
  expires: string
}

export const useAuthStore = defineStore('auth', () => {
  /**
   * States
   * We use sessionStorage to hydrate state when the page reloads
   * @see https://vueuse.org/core/useStorage/#custom-serialization on why we need a serializer for `null` defaults
   */
  const authenticationToken = useStorage<string>('auth-token', null, sessionStorage, {
    serializer: StorageSerializers.string,
  })
  const authenticatedUser = useStorage<UserResponse>('auth-user', null, sessionStorage, {
    serializer: StorageSerializers.object,
    deep: true,
    mergeDefaults: true,
  })
  const authExpired = ref(false)

  const mfaToken = useStorage<string>('mfa-token', null, sessionStorage, {
    serializer: StorageSerializers.string,
  })

  const mfaSteps = useStorage<Array<MfaStep>>('mfa-steps', null, sessionStorage, {
    serializer: StorageSerializers.object,
    deep: true,
    mergeDefaults: true,
  })

  /** Computed / Getters */
  const isAuthenticated = computed(() => {
    return !!authenticatedUser.value && !!authenticationToken.value && !authExpired.value
  })

  const authRoles = computed(() => {
    return authenticatedUser?.value?.roles.map((role) => role.name)
  })

  const authFullName = computed(() => {
    return authenticatedUser?.value?.user_profile?.full_name
  })

  const authEmailIsVerified = computed(() => {
    return !!authenticatedUser?.value?.email_verified_at
  })

  const authAvatarDisplayNamePlaceholder = computed(() => {
    if (!authenticatedUser.value?.user_profile?.full_name) return null

    // we'll display the initials for the fake avatar
    const names = authenticatedUser.value.user_profile.full_name.split(' ')
    let initials = names[0].substring(0, 1).toUpperCase()

    if (names.length > 1) {
      initials += names[names.length - 1].substring(0, 1).toUpperCase()
    }

    return initials
  })

  const authFullAddress = computed(() => {
    if (!authenticatedUser.value) return null

    let address = ''
    address += authenticatedUser.value?.user_profile?.address?.home_address
      ? authenticatedUser.value.user_profile.address.home_address + ', '
      : ''
    address += authenticatedUser.value?.user_profile?.address?.barangay?.name
      ? authenticatedUser.value.user_profile.address.barangay.name + ', '
      : ''
    address += authenticatedUser.value?.user_profile?.address?.city?.name
      ? authenticatedUser.value.user_profile.address.city.name + ', '
      : ''
    address += authenticatedUser.value?.user_profile?.address?.province?.name
      ? authenticatedUser.value.user_profile.address.province.name + ', '
      : ''
    address += authenticatedUser.value?.user_profile?.address?.region?.name
      ? authenticatedUser.value.user_profile.address.region.name
      : ''

    return address
  })

  const currentMfaStep = computed(() => {
    if (!mfaSteps.value) return null

    // Get the first MFA step that has completed = false
    for (const step of mfaSteps.value) {
      if (!step.completed) {
        return step
      }
    }

    return null
  })

  const allMfaStepsCompeted = computed(() => {
    if (!mfaSteps.value) return true

    return mfaSteps.value.every((step) => step.completed)
  })

  /** Actions */
  const login = async (payload: LoginPayload) => {
    payload.with_user = true
    payload.client_name = 'HR CARES'

    const { data } = await useApiCall('auth/tokens').post(payload).json()
    const responseData: ApiResponseBody = data.value

    if (responseData.success) {
      const response = responseData.data
      if (response && 'mfa_token' in response) {
        const mfaResponse = response as MfaResponseData
        mfaToken.value = mfaResponse.mfa_token
        mfaSteps.value = mfaResponse.mfa_steps
        return responseData
      }

      const authResponse = response as AuthResponse
      authenticationToken.value = authResponse.token
      authenticatedUser.value = authResponse.user
      authExpired.value = false
    }

    return responseData
  }

  const ssoLogin = async (token: string): Promise<ApiResponseBody> => {
    const { data } = await useApiCall('auth/sso').post({ token }).json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      const authResponse = responseBody.data as AuthResponse
      authenticationToken.value = authResponse.token
      authenticatedUser.value = authResponse.user
      authExpired.value = false
      return responseBody
    }

    return responseBody
  }

  const register = async (payload: RegistrationPayload) => {
    const unWrappedPayload = {
      ...payload.credentials,
      ...payload.personal_info,
      ...payload.address,
      client_name: 'HR-CARES',
    }

    if (unWrappedPayload.birthday) {
      unWrappedPayload.birthday = useDateFormat(unWrappedPayload.birthday, 'YYYY-MM-DD').value.toString()
    }

    const { data } = await useApiCall('auth/register').post(unWrappedPayload).json()

    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const authResponse = responseBody.data as AuthResponse
      authenticationToken.value = authResponse.token
      authenticatedUser.value = authResponse.user
      authExpired.value = false
    }

    return responseBody
  }

  const logout = async () => {
    await useApiCall('auth/tokens', authenticationToken.value).delete()
    authenticatedUser.value = null
    authenticationToken.value = null
    authExpired.value = false
    mfaToken.value = null
    mfaSteps.value = null
  }

  const requestForgotPassword = async (email: string) => {
    const { data } = await useApiCall('auth/forgot-password').post({ email }).json()
    return data.value as ApiResponseBody
  }

  const resetPassword = async ({ email, token, password, password_confirmation }: ResetPasswordPayload) => {
    const { data } = await useApiCall('auth/reset-password')
      .post({
        email,
        token,
        password,
        password_confirmation,
      })
      .json()

    return data.value as ApiResponseBody
  }

  const resendEmailVerification = async () => {
    const { data } = await useApiCall('auth/email/send-verification', authenticationToken.value).get().json()
    return data.value as ApiResponseBody
  }

  const verifyEmail = async ({ id, hash, signature, expires }: VerifyEmailPayload) => {
    const url = `auth/email/verify/${id}/${hash}?expires=${expires}&signature=${signature}`
    const { data } = await useApiCall(url, authenticationToken.value).get().json()
    return data.value as ApiResponseBody
  }

  const resendMfaCode = async () => {
    const { data } = await useApiCall('auth/mfa/send-code')
      .post({
        token: mfaToken.value,
      })
      .json()

    return data.value as ApiResponseBody
  }

  const verifyMfaCode = async (code: string) => {
    const { data } = await useApiCall('auth/mfa/verify-code')
      .post({
        token: mfaToken.value,
        code: code,
      })
      .json()

    const responseBody = data.value as ApiResponseBody
    if (responseBody.success) {
      // Mark the MFA step as complete
      for (const step of mfaSteps.value) {
        if (!step.completed && step.name === currentMfaStep.value?.name) {
          step.completed = true
          break
        }
      }

      // If all steps are completed, an auth token is returned, and we log in the user
      if (allMfaStepsCompeted.value && responseBody.data && 'token' in responseBody.data) {
        const authResponse = responseBody.data as AuthResponse
        authenticationToken.value = authResponse.token
        authenticatedUser.value = authResponse.user
        authExpired.value = false
      }
    }

    return responseBody
  }

  const verifyMfaBackupCode = async (code: string) => {
    const { data } = await useApiCall('auth/mfa/verify-backup-code')
      .post({
        token: mfaToken.value,
        code: code,
      })
      .json()

    return data.value as ApiResponseBody
  }

  const fetchMfaQrCode = async () => {
    const { data } = await useApiCall('auth/mfa/generate-qrcode')
      .post({
        token: mfaToken.value,
      })
      .json()

    return data.value.data as MfaQrCodeResponseData
  }

  const fetchAllAvailableMfaMethods = async () => {
    const { data } = await useApiCall('auth/mfa/available-methods', authenticationToken.value).get().json()

    return data.value.data as MfaAllStepsResponseData
  }

  const unEnrollUserFromMfaMethod = async (payload: MfaUnEnrollUserPayload) => {
    const { data } = await useApiCall(`auth/mfa/un-enroll-user/${payload.user_id}`, authenticationToken.value)
      .post({
        mfa_step: payload.mfa_step,
      })
      .json()

    return data.value as ApiResponseBody
  }

  const authHasRequiredRole = (requiredRoles: string[]) => {
    const userRoles = authenticatedUser.value.roles.map((role) => role.name)
    return requiredRoles.some((r: string) => userRoles.includes(r))
  }

  return {
    authenticationToken,
    authenticatedUser,
    authExpired,
    isAuthenticated,
    authEmailIsVerified,
    avatarDisplayNamePlaceholder: authAvatarDisplayNamePlaceholder,
    authRoles,
    authHasRequiredRole,
    authFullName,
    authFullAddress,
    login,
    ssoLogin,
    register,
    logout,
    requestForgotPassword,
    resetPassword,
    resendEmailVerification,
    verifyEmail,
    mfaToken,
    mfaSteps,
    resendMfaCode,
    verifyMfaCode,
    currentMfaStep,
    fetchMfaQrCode,
    allMfaStepsCompeted,
    verifyMfaBackupCode,
    fetchAllAvailableMfaMethods,
    unEnrollUserFromMfaMethod,
  }
})
