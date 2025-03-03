import { ref } from 'vue'
import { useFetch } from '@vueuse/core'
import { useGlobalUiStore } from '@/stores/ui.store.ts'
import { useAuthStore } from '@/stores/auth.store.ts'

/**
 * @description Make an HTTP request to an endpoint where the expected response is a blob.
 * Call useFetch to intercept the response and get the header for the filename of the document.
 * The following code copies the structure in network.ts.
 * Only added afterFetch() to get the header.
 *
 * @example
 * const { data, fileNameHeader } = await useFetchBlob(api_url, auth.authenticationToken)
 *
 * @see https://vueuse.org/core/useFetch/
 */
export const useFetchBlob = async (uri: string, authToken: string | null = null) => {
  const baseUrl = import.meta.env.VITE_API_ROOT_URL
  const fileNameHeader = ref<string | null>(null)

  // Remove the first char of the uri if it starts with a '/'
  if (uri.charAt(0) === '/') uri = uri.substring(1)

  const { data } = await useFetch(`${baseUrl}/${uri}`, {
    async beforeFetch({ url, options }) {
      if (!authToken) return { url, options }

      // We add the auth token if the request needs authentication
      options.headers = {
        ...options.headers,
        Authorization: `Bearer ${authToken}`,
      }

      return { options, url }
    },
    // Intercept when the auth token expires
    onFetchError(ctx) {
      const authStore = useAuthStore()
      const authToken = authStore.authenticationToken
      if (authToken && ctx?.data?.error_code === 'UNAUTHORIZED_ERROR' && ctx?.response?.status === 401) {
        const authStore = useAuthStore()
        if (authStore.authenticatedUser !== null) authStore.authExpired = true
      }

      // Handle Rate limit
      const globalStore = useGlobalUiStore()
      if (ctx?.response?.status === 429) {
        globalStore.showRateLimitToast = new Date()
      }

      return ctx
    },
    updateDataOnError: true,
    afterFetch(ctx) {
      // Get Content-Disposition header to get the filename
      if (ctx.response && ctx.response.headers) {
        const contentDisposition = ctx.response.headers.get('content-disposition')
        if (contentDisposition) {
          const filenameMatch = /filename="([^"]+)"/.exec(contentDisposition)
          if (filenameMatch && filenameMatch[1]) {
            fileNameHeader.value = filenameMatch[1]
          } else {
            // Alternative regex for filename*
            const filenameMatch2 = /filename\*=UTF-8''([^"]+)/.exec(contentDisposition)
            if (filenameMatch2 && filenameMatch2[1]) {
              fileNameHeader.value = decodeURIComponent(filenameMatch2[1])
            }
          }
        }
      }
      return ctx
    },
  })
    .get()
    .blob() // Parse data as blob

  return {
    data,
    fileNameHeader,
  }
}
