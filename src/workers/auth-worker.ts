/**
 * Web worker for running a timer in a background thread for handling refresh token cycle.
 * More info on web workers: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
 *
 */
let timer: ReturnType<typeof setInterval> | null = null

// Listen for messages from the main thread
self.onmessage = (e: MessageEvent) => {
  const { action, interval } = e.data

  if (action === 'start') {
    // If a timer is already running, clear it first
    if (timer) clearInterval(timer)

    timer = setInterval(() => {
      // Send a pulse back to the main thread
      self.postMessage('TICK')
    }, interval || 30000) // if interval is not configured, default to 30 seconds

    console.log('[Worker] Heartbeat started')
  }

  if (action === 'stop') {
    if (timer) {
      clearInterval(timer)
      timer = null
      console.log('[Worker] Heartbeat stopped')
    }
  }
}
