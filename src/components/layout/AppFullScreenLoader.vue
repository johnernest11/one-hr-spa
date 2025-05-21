<script setup lang="ts">
import { Dialog as MainDialog, DialogPanel, DialogTitle } from '@headlessui/vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { ref } from 'vue'

const focusableEl = ref(null)
const props = defineProps<{ isOpen: boolean }>()
</script>

<template>
  <MainDialog as="div" class="relative z-20" :open="props.isOpen" :initial-focus="focusableEl">
    <div class="fixed inset-0 bg-surface-900 bg-opacity-100 backdrop-blur-sm dark:bg-opacity-80" aria-hidden="true" />
    <div class="fixed inset-0 flex items-center justify-center p-4">
      <!-- The actual dialog panel -->
      <DialogPanel class="w-full max-w-md">
        <DialogTitle class="rounded-xl px-6 py-10 text-center text-xl tracking-widest md:text-2xl">
          <font-awesome-icon
            icon="fa-solid fa-cog"
            class="h-8 animate-spin text-surface-0 dark:text-primary-500 md:h-12"
          ></font-awesome-icon>
          <br />
          <span class="font-menu text-xl font-bold text-surface-0 dark:text-primary-500 md:text-2xl"
            >Initializing Settings...</span
          >
          <!-- Start fake focusable element (to get rid of that pesky console warning https://github.com/tailwindlabs/headlessui/issues/265#issuecomment-835888771) -->
          <div ref="focusableEl" class="invisible"></div>
          <!-- End fake focusable element -->
        </DialogTitle>
      </DialogPanel>
    </div>
  </MainDialog>
</template>
