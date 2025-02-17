<script setup lang="ts">
import Card from 'primevue/card'
import Button from 'primevue/button'
</script>

<template>
  <div class="mx-auto flex h-[100%] w-full flex-col">
    <Card class="h-full">
      <template #content>
        <div
          class="my-6 flex w-full flex-col items-center justify-between gap-4 rounded-lg bg-surface-0 px-6 py-6 shadow-sm dark:bg-surface-800 md:my-4 md:flex-row md:px-4 md:py-4"
        >
          <div class="mb-4 ml-6 flex w-full flex-col items-start justify-center gap-2 py-2 md:w-4/12">
            <h2 class="mb-2 text-2xl font-semibold text-gray-800 dark:text-white">Accomplishment Reports</h2>
          </div>
        </div>
        <!-- End Filters & Controls -->
        <div class="mx-auto flex w-full flex-col items-center px-4 py-24 md:px-6 lg:px-8">
          <div class="flex flex-col items-center">
            <div><img src="@/assets/image/AR.png" width="500" class="mx-auto my-1" /></div>
            <h2 class="mb-2 text-2xl font-semibold text-gray-800 dark:text-white">You have no accomplishments</h2>
            <h1 class="mb-4 text-gray-600 dark:text-gray-400">Accomplishment Reports created by you shall appear here.</h1>
            <div class="mt-4 flex w-full justify-center">
              <Button
                label="New Accomplishment Report"
                severity="primary"
                outlined
                @click="$router.push({ name: 'create-accomplishment-report' })"
                class="h-8 w-fit !border-blue-500 text-blue-500 !ring-blue-500 hover:bg-blue-500/10 dark:text-surface-400 md:mx-0 md:h-fit md:w-fit md:text-xs"
              >
                <template #icon>
                  <i class="pi pi-plus mr-2" />
                </template>
              </Button>
            </div>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>
