<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useSidebarNavLinks } from '@/composables/sidebar.ts'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const { navLinks, toggleExpanded } = useSidebarNavLinks()
const appName = import.meta.env.VITE_APP_NAME
</script>

<template>
  <div
    class="sticky top-0 h-screen w-64 flex-col overflow-y-auto bg-gradient-to-b from-[#ffffff] to-[#2196F3] px-2 pt-4 dark:border-surface-700 dark:bg-surface-900"
  >
    <div class="flex justify-center px-12 py-6 dark:border-surface-900">
      <img src="@/assets/image/dswd-logo.png" width="500" class="mx-auto my-1" />
    </div>
    <div class="flex justify-center px-12 text-2xl font-semibold dark:border-surface-900">
      <h1>{{ appName }}</h1>
    </div>
    <aside class="flex flex-grow flex-col overflow-y-auto px-5 pt-4 dark:border-surface-700 dark:bg-surface-900">
      <nav class="-mx-3 space-y-6">
        <div v-for="item in navLinks" :key="item.group" class="space-y-3">
          <label class="px-3 text-xs font-bold uppercase text-surface-600 dark:text-surface-400">
            {{ item.group }}
          </label>
          <div v-for="link in item.links" :key="link.label">
            <!-- Parent Link (with toggle) -->
            <div
              v-if="link.children && link.children.length > 0"
              class="flex items-center justify-between rounded-lg px-2 py-2 transition-colors duration-300 hover:bg-primary-100 hover:text-primary-900 dark:text-surface-200 dark:hover:bg-primary-400/70"
              @click="toggleExpanded(link)"
            >
              <div class="flex items-center">
                <i :class="link.icon"></i>
                <span class="mx-2 text-sm font-medium">{{ link.label }}</span>
              </div>
              <!-- Toggle Icon (e.g., an arrow) -->
              <i :class="link.expanded"></i>
            </div>
            <!-- Regular Link (no children) -->
            <RouterLink
              v-else
              :to="{ name: link.name }"
              :class="`flex items-center rounded-lg px-2 py-2 transition-colors duration-300 hover:bg-primary-100 
              hover:text-primary-900 dark:text-surface-200 dark:hover:bg-primary-400/70 ${
                $route.name === link.name
                  ? ' rounded-xl  bg-[#2196F3]/20 text-primary-900 dark:!bg-primary-400/70 dark:!text-surface-200'
                  : ''
              }`"
            >
              <i :class="link.icon"></i>
              <span class="mx-2 text-sm font-medium">{{ link.label }}</span>
            </RouterLink>

            <!-- Child Links (conditionally rendered) -->
            <div v-if="link.children && link.expanded" class="ml-4 space-y-2">
              <RouterLink
                v-for="child in link.children"
                :key="child.label"
                :to="{ name: child.name }"
                :class="`mt-4 flex items-center rounded-lg px-2 py-2 transition-colors duration-300 hover:bg-primary-100 
              hover:text-primary-900 dark:text-surface-200 dark:hover:bg-primary-400/70 ${
                $route.name === child.name
                  ? ' rounded-xl  bg-[#2196F3]/20 text-primary-900 dark:!bg-primary-400/70 dark:!text-surface-200'
                  : ''
              }`"
              >
                <FontAwesomeIcon :icon="[child.icon.split(' ')[0], child.icon.split(' ')[1]]" />
                <span class="mx-2 text-sm font-medium">{{ child.label }}</span>
              </RouterLink>
            </div>
          </div>
        </div>
      </nav>
    </aside>
    <div class="mb-8 flex justify-center px-12 text-2xl font-semibold dark:border-surface-900"></div>
  </div>
</template>
