import { useFetch } from '@vueuse/core'
import { useGlobalUiStore } from '@/stores/ui.store.ts'
import { useAuthStore } from '@/stores/auth.store.ts'

/**
 * @description Make an HTTP request to an endpoint.
 * This is a wrapper for VueUse's useFetch composable.
 *
 * @example
 * const { data, statusCode } = await apiCall('auth/tokens').post(payload).json()
 * if (statusCode.value === 200) {
 *   console.log(data.value)
 * }
 *
 * @see https://vueuse.org/core/useFetch/
 */
export const useApiCall = (uri: string, authToken: string | null = null) => {
  const baseUrl = import.meta.env.VITE_API_ROOT_URL

  // Remove the first char of the uri if it starts with a '/'
  if (uri.charAt(0) === '/') uri = uri.substring(1)

  return useFetch(`${baseUrl}/${uri}`, {
    async beforeFetch({ url, options }) {
      if (!authToken) return { url, options }

      // We add the auth token if the request needs authentication
      options.headers = {
        ...options.headers,
        Authorization: `Bearer ${authToken}`,
        'Access-Control-Allow-Origin': '*',
      }

      return { options, url }
    },
    // Intercept when the auth token expires
    onFetchError(ctx) {
      const authStore = useAuthStore()
      const authToken = authStore.authenticationToken

      if (authToken && ctx?.data?.error_code === 'UNAUTHORIZED_ERROR' && ctx?.response?.status === 401) {
        const authStore = useAuthStore()
        if (authStore.authenticatedUser !== null) {
          authStore.clearAuthTokenOnStorage()
          authStore.authExpired = true
        }
      }

      // Handle Rate limit
      const globalStore = useGlobalUiStore()
      if (ctx?.response?.status === 429) {
        globalStore.showRateLimitToast = new Date()
      }

      return ctx
    },
    updateDataOnError: true,
  })
}
