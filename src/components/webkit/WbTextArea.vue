<script setup lang="ts">
/**
 * @see https://tailwind.primevue.org/guides/building-ui-library/
 * @see https://primevue.org/steps/#pt
 */

// No longer importing InputText, as we're using a native textarea
// import InputText from 'primevue/inputtext'

defineOptions({
  inheritAttrs: false,
})

/** Props */
type WbTextAreaProps = {
  label: string
  required?: boolean
  invalid?: boolean
  invalidText?: string
  success?: boolean
  successText?: string
  wrapperClass?: string
  labelClass?: string
  validationErrorMessageClass?: string
  validationSuccessMessageClass?: string
  rows?: number // Add rows prop for textarea initial height
}

const props = withDefaults(defineProps<WbTextAreaProps>(), {
  invalid: false,
  required: false,
  invalidText: '',
  success: false,
  successText: '',
  wrapperClass: '',
  labelClass: '',
  validationErrorMessageClass: '',
  validationSuccessMessageClass: '',
  rows: 5, // Default rows for textarea
})
</script>

<template>
  <div :class="`flex w-full flex-col gap-2 ${wrapperClass}`">
    <label :for="$.uid.toString()" :class="`${props.labelClass || 'text-xs text-surface-800 dark:text-surface-200'}`">
      {{ props.label }}
      <span v-if="props.required" class="text-error-500">*</span>
    </label>

    <div :class="`relative ${$attrs.disabled ? 'hover:cursor-not-allowed' : ''}`">
      <!-- Note: Prepend icons are less common and might look awkward with textareas.
           Consider if this slot is truly needed for a textarea component. -->
      <div
        :class="`absolute left-3 top-3 z-10 ${
          // Adjusted top for textarea
          $attrs.disabled ? 'text-surface-300 dark:text-surface-700' : 'text-surface-500'
        }`"
      >
        <slot name="prepend-icon"></slot>
      </div>
      <textarea
        v-bind="$attrs"
        :aria-describedby="`${$.uid.toString()}-help`"
        :rows="props.rows"
        :class="`min-h-[3rem] w-full resize-y rounded-md border border-surface-300 bg-surface-0 p-3 text-surface-800 shadow-sm outline-none transition-all duration-300 ease-in-out focus:text-surface-900 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-0 ${$slots['prepend-icon'] ? 'pl-10' : ''} ${
          props.invalid ? 'ring-2 !ring-error-500 dark:!ring-error-300' : '' // Added ring-2 for invalid state
        } ${$attrs.disabled ? '!bg-surface-100 hover:cursor-not-allowed dark:!bg-surface-800 dark:!text-surface-0/70' : ''}`"
      ></textarea>
    </div>
    <small
      v-if="props.invalid && props.invalidText"
      :class="`ml-0.5 ${props.validationErrorMessageClass || 'text-xs text-error-500 dark:text-error-300'}`"
    >
      <i class="pi pi-exclamation-triangle mr-0.5"></i>
      {{ props.invalidText }}
    </small>
    <small
      v-if="props.success && props.successText"
      :class="`ml-0.5 ${props.validationSuccessMessageClass || 'text-xs text-success-500 dark:text-success-300'}`"
    >
      <i class="pi pi-check-circle mr-0.5"></i>
      {{ props.successText }}
    </small>
  </div>
</template>
