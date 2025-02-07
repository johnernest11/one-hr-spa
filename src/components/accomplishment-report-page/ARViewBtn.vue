<script setup lang="ts">
import { UserResponse } from '@/typings/models.types.ts'
import Dialog from 'primevue/dialog'
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import { nextTick } from 'vue'
import ViewAR from '@/components/accomplishment-report-page/ViewAccomplishmentReport.vue'
import { useUsersStore } from '@/stores/users.store.ts' // Import the user store

const props = defineProps<{ user: UserResponse; roleFilter: number | string | null }>()

const showOdsuDetailsDialog = ref(false)
// const toggleOdsuDetailsDialog = () => (showOdsuDetailsDialog.value = !showOdsuDetailsDialog.value);
const userStore = useUsersStore() // Initialize the user store
const router = useRouter()

const navigateToDetails = () => {
  nextTick(() => {
    // Use nextTick here
    userStore.selectedUser = props.user
    router.push({ name: 'view-accomplishment-report' })
  })
}
</script>

<template>
  <button
    @click="navigateToDetails"
    class="relative mt-2 flex min-h-10 flex-col items-center rounded-lg bg-surface-100 px-2 py-2 shadow-md dark:bg-surface-800"
  >
    <span class="text-sm font-medium text-primary-600">View/Edit Report</span>
    <Dialog
      v-model:visible="showOdsuDetailsDialog"
      header="Odsu Details"
      :draggable="false"
      modal
      maximizable
      class="mx-2 w-full sm:mx-0"
    >
      <ViewAR :user="props.user" :current-role-filter="props.roleFilter" @user-updated="navigateToDetails" />
    </Dialog>
  </button>
</template>
