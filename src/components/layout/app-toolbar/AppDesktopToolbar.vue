<script setup lang="ts">
import WbBreadcrumbs from '@/components/layout/AppBreadcrumbs.vue'
import Toolbar from 'primevue/toolbar'
import Avatar from 'primevue/avatar'
import Badge from 'primevue/badge'
import Menu from 'primevue/menu'
import Tag from 'primevue/tag'
import type { MenuItem } from 'primevue/menuitem'
import { useAuthStore } from '@/stores/auth.store.ts'
import { useRouter } from 'vue-router'
import { computed, ref, reactive, onMounted } from 'vue'
import { snakeCaseToTitleCase } from '@/utils/helpers.ts'
import { usePdsStore, PersonalDataSheetPayload } from '@/stores/pds.store.ts'
import { PersonnelResponse } from '@/typings/models.types'

const authStore = useAuthStore()
const pdsStore = usePdsStore()

/** Payload */
const payload = reactive<PersonalDataSheetPayload>({
  ...pdsStore.pdsInfo,
})

const isLoading = ref(true)

/***
 * Always fetch and display the authenticated user's own PDS information.
 * Even if the user is currently viewing another employee's record,
 * this section ensures that only the logged-in user's data populates
 * their personal profile and related UI components.
 ***/
onMounted(async () => {
  // Always derive ID from authenticated user, not from route or selection
  const id = authStore.authenticatedUser?.user_profile?.individual_basic_detail_id

  if (id) {
    try {
      const response = await pdsStore.fetchPdsById(id)

      if (response?.success) {
        const data = response.data as PersonnelResponse
        // Update Pinia store and payload to always reflect logged-in user
        pdsStore.updatePdsFromPersonnel(data)
        Object.assign(payload, pdsStore.pdsInfo)
      } else {
        console.warn('Failed to fetch PDS or response unsuccessful.')
      }
    } catch (error) {
      console.error('Error fetching authenticated user PDS:', error)
    }
  } else {
    console.warn('Authenticated user ID not found.')
  }

  isLoading.value = false
})

const router = useRouter()

/** Avatar Menu */
const avatarMenu = ref()
const avatarMenuItems = ref<MenuItem[]>([
  {
    label: 'Logout',
    icon: 'pi pi-sign-out',
    noArrow: true,
    command: async () => {
      await handleLogout()
    },
  },
])

// Always show the logged-in user's name in the profile button
const fullName = computed(() => {
  const user = authStore.authenticatedUser?.user_profile?.individual_basic_detail
  if (!user) return ''

  const initials = [user.first_name, user.middle_name, user.last_name, user.ext_name].filter(Boolean).join(' ')

  return initials
})

// Computed AvatarDisplayNamePlaceholder
const AvatarDisplayNamePlaceholder = computed(() => {
  const individual = authStore.authenticatedUser?.user_profile?.individual_basic_detail
  if (!individual) return ''

  const initials = [
    ...(individual.first_name?.split(' ').map((n) => n[0]?.toUpperCase()) || []),
    ...(individual.middle_name?.split(' ').map((n) => n[0]?.toUpperCase()) || []),
    individual.last_name?.[0]?.toUpperCase() ?? '',
    individual.ext_name?.[0]?.toUpperCase() ?? '',
  ]
    .filter(Boolean)
    .join('')

  return initials || ''
})

const toggleAvatarMenu = (event: Event) => {
  avatarMenu.value.toggle(event)
}

const handleLogout = async () => {
  await authStore.logout()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <Toolbar class="min-h-[4rem] bg-surface-100 px-6 py-6 shadow-none !ring-0 dark:bg-surface-950">
    <template #start>
      <WbBreadcrumbs class="mt-4 px-6 !font-medium" />
    </template>

    <template #end>
      <template v-if="authStore.isAuthenticated">
        <Avatar
          :image="authStore.authenticatedUser.user_profile?.profile_picture_url ?? undefined"
          :label="!authStore.authenticatedUser.user_profile?.profile_picture_url ? AvatarDisplayNamePlaceholder : undefined"
          shape="circle"
          size="large"
          class="cursor-pointer transition-transform hover:scale-105 hover:ring-2 hover:ring-primary-500 dark:!bg-primary-500"
          @click="toggleAvatarMenu"
          aria-haspopup="true"
          aria-controls="avatar-menu"
        />

        <Menu
          ref="avatarMenu"
          id="avatar-menu"
          :model="avatarMenuItems"
          :popup="true"
          @show="$nextTick(() => (avatarMenu.focusedOptionIndex = -1))"
          @mouseleave="avatarMenu?.hide()"
        >
          <template #start>
            <button
              class="p-link relative mb-2 flex w-full items-center overflow-hidden rounded-md p-2 pl-3 hover:bg-surface-100 dark:hover:bg-surface-400/10"
              @click="router.push({ name: 'profile' })"
            >
              <Avatar
                :image="authStore.authenticatedUser.user_profile?.profile_picture_url ?? undefined"
                :label="`${!authStore.authenticatedUser.user_profile?.profile_picture_url ? AvatarDisplayNamePlaceholder : ''}`"
                class="mr-2.5 overflow-hidden dark:!bg-primary-500"
                shape="square"
                size="large"
              />
              <span class="inline-flex flex-col justify-start">
                <span class="mx-1 text-left text-sm">{{ fullName }}</span>
                <span class="mx-1 mt-2 flex flex-wrap gap-1">
                  <Tag v-for="role in authStore.authRoles" :value="snakeCaseToTitleCase(role)" :key="role"></Tag>
                </span>
              </span>
            </button>
          </template>

          <template #item="{ item, props }">
            <a class="flex items-center text-sm" v-bind="props.action">
              <span :class="item.icon" />
              <span class="ml-2 font-normal">{{ item.label }}</span>
              <Badge v-if="item.badge" class="ml-auto" :value="item.badge" />
              <i v-if="!item.noArrow" class="pi pi-angle-right ml-auto text-xs"></i>
            </a>
          </template>
        </Menu>
      </template>
    </template>
  </Toolbar>
</template>
