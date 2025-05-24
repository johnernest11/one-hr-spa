<script setup lang="ts">
import Card from 'primevue/card'
import { RouterLink } from 'vue-router'
</script>
<template>
  <div class="mx-auto flex h-full w-full flex-col pl-4 pt-8">
    <Card class="h-full">
      <template #content>
        <div>
          <div class="mx-auto flex h-full w-full flex-col">
            <Card class="w-full p-0 shadow-none">
              <template #content>
                <div class="flex flex-col items-center">
                  <div
                    class="my-6 flex w-full flex-col items-center justify-between gap-4 rounded-lg bg-surface-0 px-6 py-6 dark:bg-surface-800 md:my-4 md:flex-row md:px-4 md:py-4"
                  ></div>
                  <div class="flex justify-center">
                    <img src="@/assets/image/undraw_payments.svg" class="w-96 pt-44" />
                  </div>
                  <h2
                    class="mb-2 mt-4 flex w-full justify-center text-center text-xl font-semibold text-surface-800 dark:text-primary-100 sm:text-2xl"
                  >
                    You have no Payroll Records
                  </h2>
                  <h1 class="mb-4 text-center text-base text-surface-600 dark:text-surface-400 sm:text-lg">
                    Employee Payroll Records created by you shall appear here.
                  </h1>
                  <div class="mt-4 flex w-full justify-center">
                    <RouterLink :to="{ name: 'payrolls' }">
                      <Button
                        icon="pi pi-plus"
                        label="New Application for Leave"
                        severity="info"
                        size="large"
                        class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100 sm:text-primary-400 md:text-primary-400 lg:text-primary-400 dark:lg:text-primary-400"
                        text
                      />
                    </RouterLink>
                  </div>
                </div>
              </template>
            </Card>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>
