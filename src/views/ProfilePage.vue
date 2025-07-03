<script setup lang="ts">
import Card from 'primevue/card'
import { useAuthStore } from '@/stores/auth.store.ts'
import { onBeforeMount } from 'vue'
import WbAvatarFileInput from '@/components/webkit/WbAvatarFileInput.vue'
import UpdateProfileForm from '@/components/profile-page/UpdateProfileForm.vue'
import { useProfileStore } from '@/stores/profile.store.ts'

const authStore = useAuthStore()
const profileStore = useProfileStore()

onBeforeMount(async () => {
  await profileStore.fetchProfile()
})
</script>

<template>
  <div class="mx-auto flex h-[100%] w-full flex-col">
    <Card>
      <template #header>
        <div class="h-2 w-full rounded-t-lg bg-primary-500"></div>
      </template>
      <template #content>
        <div class="flex flex-col px-4">
          <div class="flex flex-col items-center md:flex-row">
            <template v-if="authStore.isAuthenticated">
              <WbAvatarFileInput />
            </template>
            <div class="mt-8 flex flex-col text-center text-lg md:ml-8 md:mt-0 md:text-left lg:text-2xl">
              <span class="font-bold">{{ authStore.authFullName }}</span>
              <span class="text-xs sm:text-sm">{{ authStore.authFullAddress }}</span>
            </div>
          </div>
        </div>
      </template>
      <template #footer> </template>
    </Card>
    <Card class="mt-4">
      <template #content>
        <transition
          enter-active-class="transition duration-500"
          enter-from-class="translate-y-[20%] opacity-0"
          leave-to-class="opacity-0"
        >
          <UpdateProfileForm />
        </transition>
      </template>
    </Card>
  </div>
</template>
