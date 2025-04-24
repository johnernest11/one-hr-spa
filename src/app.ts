/**
 * We'll use this instance for binding plugins, routes, methods, etc.
 */
import { createApp } from 'vue'
import App from '@/App.vue'

import { library } from '@fortawesome/fontawesome-svg-core'

import { fas } from '@fortawesome/free-solid-svg-icons'

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

library.add(fas)

const app = createApp(App)

app.component('font-awesome-icon', FontAwesomeIcon)

export const vueApp = createApp(App)
