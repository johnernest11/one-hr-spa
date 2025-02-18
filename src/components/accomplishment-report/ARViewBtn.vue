<script setup lang="ts">
import { PersonnelAccomplishmentReportResponse } from '@/typings/models.types.ts'
import Dialog from 'primevue/dialog'
import { ref } from 'vue'
import ViewAccomplishmentReport from '@/components/accomplishment-report/ViewAccomplishmentReport.vue'

const props = defineProps<{ accomplishmentReport: PersonnelAccomplishmentReportResponse; roleFilter: number | string | null }>()

/** Update User Dialog */
const showAccomplishmentDetailsDialog = ref(false)

const navigateToDetails = () => (showAccomplishmentDetailsDialog.value = !showAccomplishmentDetailsDialog.value)
</script>

<template>
  <button
    @click="navigateToDetails()"
    class="border-none text-lg font-semibold text-primary-700 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
  >
    <span class="text-sm font-medium text-primary-600"><i class="pi pi-eye"></i></span>
    <Dialog
      v-model:visible="showAccomplishmentDetailsDialog"
      :draggable="false"
      modal
      :style="{ width: '90vw', maxWidth: '1500px' }"
      :maximizable="true"
      class="large-dialog"
    >
      <ViewAccomplishmentReport
        :accomplishmentReport="props.accomplishmentReport"
        :current-role-filter="props.roleFilter"
        @user-updated="navigateToDetails"
      />
    </Dialog>
  </button>
</template>
