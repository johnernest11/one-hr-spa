<script setup lang="ts">
import Tag from 'primevue/tag'
import { UserResponse } from '@/typings/models.types.ts'
import { getAvatarDisplayNamePlaceholder, snakeCaseToTitleCase } from '@/utils/helpers.ts'
import Dialog from 'primevue/dialog'
import UserDetailsForm from '@/components/users-management-page/UserDetailsForm.vue'
import { ref } from 'vue'

const props = defineProps<{ user: UserResponse; roleFilter: number | string | null }>()

/** Update User Dialog */
const showUserDetailsDialog = ref(false)
const toggleUserDetailsDialog = () => (showUserDetailsDialog.value = !showUserDetailsDialog.value)
</script>

<template>
  <button
    @click="toggleUserDetailsDialog"
    class="relative flex min-h-56 flex-col items-center rounded-lg bg-surface-0 px-4 py-6 shadow-md dark:bg-surface-800"
  >
    <!-- Start Avatar -->
    <div class="absolute -top-6 left-1/2 h-24 w-24 -translate-x-1/2">
      <img
        v-if="props.user.user_profile?.profile_picture_url"
        :src="props.user.user_profile?.profile_picture_url"
        alt="Profile Picture"
        class="h-full w-full rounded-lg bg-primary-700 object-cover shadow-md"
      />
      <div
        v-if="!props.user.user_profile?.profile_picture_url"
        class="flex h-full w-full items-center justify-center rounded-lg bg-primary-700 text-xl text-surface-0 dark:bg-primary-400 dark:text-surface-900"
      >
        {{ getAvatarDisplayNamePlaceholder(props.user.user_profile?.full_name || 'User') }}
      </div>
    </div>
    <!-- End Avatar -->
    <!-- Start Name -->
    <p class="mt-16 text-center font-menu font-bold text-primary-600 dark:text-primary-400">
      {{ props.user.name }}
    </p>
    <!-- End Name -->
    <!-- Start Email -->
    <p class="text-center text-sm text-surface-700 dark:text-surface-400">Email: {{ props.user.email }}</p>
    <p class="text-center text-sm text-surface-700 dark:text-surface-400">Username: {{ props.user.username }}</p>
    <!-- End Email -->
    <!-- Start Role Tags -->
    <div class="mt-2.5 flex w-full flex-wrap justify-center gap-2">
      <template v-if="user.roles && user.roles.length > 0">
        <Tag class="bg-surface-500" v-for="role in user.roles" :key="role.id">
          {{ snakeCaseToTitleCase(role.name) }}
        </Tag>
      </template>
      <div v-else class="text-gray-500"><Tag class="!bg-warn-400"> Account Not Yet Activated </Tag></div>
    </div>
    <!-- End Role Tags -->

    <!-- Start Update User Dialog -->
    <Dialog
      v-model:visible="showUserDetailsDialog"
      header="User Details"
      :draggable="false"
      modal
      maximizable
      class="mx-4 w-full sm:mx-0"
    >
      <UserDetailsForm :user="props.user" :current-role-filter="props.roleFilter" @user-updated="toggleUserDetailsDialog" />
    </Dialog>
    <!-- End Update-User Dialog -->
    <!-- Start Deactivated Flag -->
    <footer
      v-if="!props.user.active"
      class="absolute bottom-0 flex w-full items-center justify-center rounded-b-lg bg-error-500 p-1 text-surface-0 shadow-md"
    >
      <span class="text-xs">Deactivated</span>
    </footer>
    <!-- End Deactivated Flag -->
  </button>
</template>
