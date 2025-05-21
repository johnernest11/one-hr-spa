<script setup lang="ts">
import Button from 'primevue/button'
import Card from 'primevue/card'
import { useRouter } from 'vue-router'
import Menu from 'primevue/menu'
import { ref } from 'vue'
const router = useRouter()

const exportMenu = ref()
const exportItems = [
  { label: 'Export as PDF', icon: 'pi pi-file-pdf', command: () => console.log('Export PDF') },
  { label: 'Export as Excel', icon: 'pi pi-file-excel', command: () => console.log('Export Excel') },
]

const toggleExportMenu = (event: Event) => {
  exportMenu.value.toggle(event)
}
/** End of Search and Filters */
const navigateToCreate = () => {
  router.push({ name: 'work-experience-sheet/store' })
}
</script>
<template>
  <div class="mx-auto flex h-full w-full flex-col pl-4 pt-8">
    <Card class="h-full">
      <template #content>
        <div>
          <div class="flex w-full items-center justify-end gap-4">
            <div class="gap-4 whitespace-nowrap md:w-auto">
              <Menu ref="exportMenu" :model="exportItems" popup />
              <Button
                icon="pi pi-file-word mr-2"
                v-tooltip.top="'Export WES'"
                label="Export WES"
                severity="info"
                size="large"
                class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100 sm:text-primary-400 md:text-primary-400 lg:text-primary-400 dark:lg:text-primary-400"
                text
                @click="toggleExportMenu"
              />
            </div>
          </div>
          <div class="mx-auto flex h-full w-full flex-col">
            <Card class="w-full p-0 shadow-none">
              <template #content>
                <div class="flex flex-col items-center sm:flex-col md:flex-col">
                  <div
                    class="my-6 flex w-full flex-col items-center justify-between gap-4 rounded-lg bg-surface-0 px-6 py-6 dark:bg-surface-800 md:my-4 md:flex-row md:px-4 md:py-4"
                  ></div>
                  <div class="flex justify-center">
                    <img src="@/assets/image/undraw_WES.svg" class="w-96 pt-12" />
                  </div>
                  <h2
                    class="mb-2 mt-4 flex w-full justify-center text-center text-xl font-semibold text-surface-800 dark:text-primary-100 sm:text-2xl"
                  >
                    You have not filled out your WES
                  </h2>
                  <h1 class="mb-4 text-center text-base text-gray-600 dark:text-gray-400 sm:text-lg">
                    You can start filling out your WES by clicking the button below <br />
                    or by importing using the prescribed template
                  </h1>
                  <div class="mt-4 flex w-full justify-center">
                    <Button
                      icon="pi pi-plus"
                      label="Fill out my WES"
                      severity="info"
                      size="large"
                      class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100 sm:text-primary-400 md:text-primary-400 lg:text-primary-400 dark:lg:text-primary-400"
                      text
                      @click="navigateToCreate"
                    />
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
