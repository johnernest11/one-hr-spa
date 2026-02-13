import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

window.Pusher = Pusher

let echoInstance: Echo<'pusher'> | null = null
let currentToken: string | null = null

export const getEcho = () => {
    const token = localStorage.getItem('auth-token')

    console.log('getEcho called.')

    if (echoInstance && token !== currentToken) {
        console.log("Token mismatch detected. Re-initializing Echo...")
        echoInstance.disconnect()
        echoInstance = null
    }   

    if (echoInstance) {
        return echoInstance
    }

    console.log("Creating fresh Echo instance with token:", token?.substring(0, 10) + '...')
    currentToken = token

    echoInstance = new Echo({
        broadcaster: 'pusher',
        key: import.meta.env.VITE_PUSHER_APP_KEY,
        cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || 'mt1', 
        wsHost: import.meta.env.VITE_PUSHER_HOST,
        wsPort: import.meta.env.VITE_PUSHER_PORT,
        forceTLS: import.meta.env.VITE_PUSHER_SCHEME === 'https',
        disableStats: true,
        enabledTransports: ['ws', 'wss'],

        // --- PRIVATE CHANNEL AUTHENTICATION ---
        authEndpoint: `${import.meta.env.VITE_API_ROOT_URL}/broadcasting/auth`, 
        auth: { 
            headers: {
                // Pass your user's login token here
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
        }
    })

    return echoInstance
}

export const resetEcho = () => {
    if (echoInstance) {
        echoInstance.disconnect()
        echoInstance = null
        currentToken = null
        console.log("Echo instance destroyed.")
    }
}