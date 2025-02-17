<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useSidebarNavLinks } from '@/composables/sidebar.ts'
// import { useAuthStore } from '@/stores/auth.store.ts'
// import { computed } from 'vue'
// import Avatar from 'primevue/avatar'

// const authStore = useAuthStore()
const { navLinks } = useSidebarNavLinks()
// const fullName = computed(() => {
//   return authStore.authenticatedUser.user_profile?.full_name || ''
// })
</script>

<template>
  <div
    class="flex h-screen flex-col overflow-y-auto bg-gradient-to-b from-[#ffffff] to-[#2196F3] px-2 pt-4 dark:border-surface-700 dark:bg-surface-900"
  >
    <div class="flex justify-center px-12 py-6 dark:border-surface-900">
      <img src="@/assets/image/DSWD_LOGO.png" width="500" class="mx-auto my-1" />
    </div>
    <div class="flex justify-center px-12 text-2xl font-semibold dark:border-surface-900">
      <h1>HR CARES</h1>
    </div>
    <aside class="flex flex-grow flex-col overflow-y-auto px-5 pt-4 dark:border-surface-700 dark:bg-surface-900">
      <nav class="-mx-3 space-y-6">
        <div v-for="item in navLinks" :key="item.group" class="space-y-3">
          <label class="px-3 text-xs font-bold uppercase text-surface-600 dark:text-surface-400">
            {{ item.group }}
          </label>
          <RouterLink
            as="div"
            v-for="link in item.links"
            :key="link.label"
            :to="{ name: link.name }"
            :class="`flex transform items-center rounded-lg px-2 py-2 transition-colors duration-300 hover:bg-primary-100 
              hover:text-primary-900 dark:text-surface-200 dark:hover:bg-primary-400/70 ${
                $route.name === link.name
                  ? ' rounded-xl  bg-[#2196F3]/20 text-primary-900 dark:!bg-primary-400/70 dark:!text-surface-200'
                  : ''
              }`"
          >
            <i :class="link.icon"></i>
            <span class="mx-2 text-sm font-medium">{{ link.label }}</span>
          </RouterLink>
        </div>
      </nav>
    </aside>
    <div class="mb-8 flex justify-center px-12 text-2xl font-semibold dark:border-surface-900">
      <!-- <Avatar
        :image="authStore.authenticatedUser.user_profile?.profile_picture_url ?? undefined"
        :label="`${
            !authStore.authenticatedUser.user_profile?.profile_picture_url ? authStore.avatarDisplayNamePlaceholder : ''
        }`"
        class="mr-2.5 overflow-hidden"
        shape="square"
        size="large"
      /> -->
      <!-- <span class="inline-flex flex-col justify-start">
        <span class="mx-1 text-sm">{{ fullName }}</span>
        <span class="mx-1 mt-2 flex flex-wrap gap-1">
        </span>
      </span> -->
    </div>
  </div>
</template>
