<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import Sidebar from 'primevue/sidebar'
import Avatar from 'primevue/avatar'
import { RouterLink, useRouter } from 'vue-router'
import { useSidebarNavLinks } from '@/composables/sidebar.ts'
import { useAuthStore } from '@/stores/auth.store.ts'
import { snakeCaseToTitleCase } from '@/utils/helpers.ts'
import Tag from 'primevue/tag'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const { navLinks } = useSidebarNavLinks()
const visible = ref(false)
const toggleVisibility = () => {
  visible.value = !visible.value
}

/** Handle Logout */
const router = useRouter()
const authStore = useAuthStore()
const handleLogout = async () => {
  await authStore.logout()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <div class="card flex justify-center">
    <Sidebar
      v-model:visible="visible"
      position="right"
      class="md:w-280 lg:w-280 w-full bg-gradient-to-b from-white to-primary-400"
      @click="visible = false"
    >
      <template #closeicon>
        <FontAwesomeIcon icon="fa fa-xmark" class="h-4 w-4" />
      </template>
      <template #header>
        <button class="flex items-center gap-2" @click="router.push({ name: 'profile' })">
          <template v-if="authStore.isAuthenticated">
            <Avatar
              :image="authStore.authenticatedUser.user_profile?.profile_picture_url ?? undefined"
              :label="`${
                !authStore.authenticatedUser.user_profile?.profile_picture_url ? authStore.avatarDisplayNamePlaceholder : ''
              }`"
              class="mr-2.5 overflow-hidden"
              shape="square"
              size="large"
            />
            <div class="flex flex-col">
              <span class="text-left font-bold">{{ authStore.authFullName }}</span>
              <span class="mx-1 mt-2 flex flex-wrap gap-1">
                <Tag v-for="role in authStore.authRoles" :value="snakeCaseToTitleCase(role)" :key="role"></Tag>
              </span>
            </div>
          </template>
        </button>
      </template>
      <!-- Start Nav Items -->
      <aside class="flex flex-col overflow-y-auto">
        <div class="flex flex-1 flex-col justify-between">
          <nav class="space-y-6">
            <div v-for="item in navLinks" :key="item.group" class="space-y-3">
              <label class="px-3 text-xs font-bold uppercase text-surface-600 dark:text-surface-400">
                {{ item.group }}
              </label>
              <RouterLink
                as="div"
                v-for="link in item.links"
                :key="link.label"
                :to="{ name: link.name }"
                :class="`flex transform items-center rounded-lg px-3 py-2 transition-colors duration-300 hover:bg-primary-100 hover:text-primary-900 dark:text-surface-200 dark:hover:bg-primary-400/70${
                  $route.name === link.name
                    ? 'bg-primary-100 text-primary-900 dark:!bg-primary-400/70 dark:!text-surface-200'
                    : ''
                }`"
              >
                <i :class="link.icon"></i>
                <span class="mx-2 text-sm font-medium">{{ link.label }}</span>
              </RouterLink>
            </div>
          </nav>
        </div>
      </aside>
      <!-- End Nav Items -->
      <!-- Start Logout Link -->
      <Button label="Logout" severity="secondary" class="mt-10 flex w-full" @click="handleLogout"></Button>
      <!-- End Logout Link -->
    </Sidebar>
    <Button
      @click="toggleVisibility"
      icon="pi pi-th-large"
      rounded
      class="text-surface-0 dark:!text-surface-100"
      aria-label="Toggle Sidebar button"
    ></Button>
  </div>
</template>
