<script setup lang="ts">
import { PersonnelAccomplishmentReportResponse } from '@/typings/models.types.ts'
import { defineProps } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps<{ accomplishmentReport: PersonnelAccomplishmentReportResponse; roleFilter: number | string | null }>()
</script>

<template>
  <RouterLink
    :to="{
      name: 'accomplishment-reports/update',
      params: {
        id: props.accomplishmentReport.id,
        roleFilter: props.roleFilter,
      },
    }"
    class="border-none text-lg font-semibold text-primary-700 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
  >
    <span class="text-sm font-medium text-primary-600"><i class="pi pi-eye"></i></span>
  </RouterLink>
</template>
