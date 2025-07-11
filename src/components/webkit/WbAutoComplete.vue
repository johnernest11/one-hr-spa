<script setup lang="ts">
/**
 * @see https://tailwind.primevue.org/guides/building-ui-library/
 * @see https://tailwind.primevue.org/autocomplete/
 */
import AutoComplete, { AutoCompleteCompleteEvent, AutoCompleteItemSelectEvent } from 'primevue/autocomplete'
import { useDebounceFn } from '@vueuse/core'
import { useAuthStore } from '@/stores/auth.store.ts'
import { useApiCall } from '@/composables/network.ts'
import { createUrlWithParams, getObjectValueUsingPath } from '@/utils/helpers.ts'
import { ref, onMounted, nextTick } from 'vue'
import { storeToRefs } from 'pinia'

const auth = storeToRefs(useAuthStore())
defineOptions({
  inheritAttrs: false,
})

/** Emits **/
export type WbAutoCompleteOptionTrueValue = string | number | null | object
const emit = defineEmits<{
  (e: 'onTrueValueComputed', value: WbAutoCompleteOptionTrueValue | WbAutoCompleteOptionTrueValue[]): void
}>()

interface ApiSuggestion {
  [key: string]: string | number
  id: string | number
  name: string
}

/** Props */
export type WbAutoCompleteOption = {
  value: string | number
  label: string
  parent_value?: string | number
}

export type WbAutoCompleteOptionKey = 'value' | 'label'

type WbAutoCompleteProps = {
  label: string
  apiEndpoint?: string | undefined
  apiOptionLabel?: string
  apiOptionValue?: string
  useApiFilter?: boolean
  apiFilters?: object
  suggestions: WbAutoCompleteOption[]
  trueValueKey?: WbAutoCompleteOptionKey
  invalid?: boolean
  invalidText?: string
  success?: boolean
  successText?: string
  wrapperClass?: string
  labelClass?: string
  required?: boolean
  employeeMode?: boolean
  validationErrorMessageClass?: string
  validationSuccessMessageClass?: string
}

const props = withDefaults(defineProps<WbAutoCompleteProps>(), {
  trueValueKey: 'value',
  apiOptionLabel: 'name',
  apiOptionValue: 'id',
  invalid: false,
  invalidText: '',
  success: false,
  successText: '',
  wrapperClass: '',
  labelClass: '',
  required: false,
  employeeMode: false,
  validationErrorMessageClass: '',
  validationSuccessMessageClass: '',
})

interface PrimeVueAutoCompleteInstance extends InstanceType<typeof AutoComplete> {
  $el: HTMLElement
}

/** Refs for managing input width */
const autoCompleteRef = ref<PrimeVueAutoCompleteInstance | null>(null)
const dropdownCalculatedWidth = ref('auto')

const updateDropdownWidth = () => {
  // Get width of the wrapper element of the AutoComplete as basis for the size of the dropdown.
  if (autoCompleteRef.value && autoCompleteRef.value.$el) {
    const inputWrapperElement = autoCompleteRef.value.$el
    dropdownCalculatedWidth.value = `${inputWrapperElement.offsetWidth}px`
  }
}

// Set width on mount
onMounted(() => {
  nextTick(() => {
    updateDropdownWidth()
  })
})

// Recalculate width when the dropdown is shown (to handle dynamic changes like dialog resizing)
// This is important because the dialog might affect the input's rendered width.
const onShowHandler = () => {
  nextTick(() => {
    updateDropdownWidth()
  })
}

/** Search functionality */
const filteredSuggestions = ref<WbAutoCompleteOption[]>()

const search = useDebounceFn(async (event: AutoCompleteCompleteEvent) => {
  const query = event.query.trim().toLowerCase().replace(/\s+/g, '')
  if (!query.length) {
    filteredSuggestions.value = [...props.suggestions]
    return
  }

  if (props.useApiFilter) {
    const apiUrl = createUrlWithParams(props.apiEndpoint, {
      ...props.apiFilters,
      query: event.query.trim(),
    })

    const { data } = await useApiCall(apiUrl, auth.authenticationToken.value).get().json()
    const apiSuggestions = (data.value?.data || []) as ApiSuggestion[]

    filteredSuggestions.value = []
    apiSuggestions.forEach((element: ApiSuggestion) => {
      const label = getObjectValueUsingPath(element, props.apiOptionLabel)

      if (props.apiOptionLabel === 'salary_grade') {
        filteredSuggestions.value?.push({
          label: `SG-${element.salary_grade}-${element.step} FY: ${element.effective_date} Tranche: ${element.tranche} NBC no: ${element.nbc_no} (${element.amount})`,
          value: element[props.apiOptionValue],
        })
      } else if (props.apiOptionLabel === 'work_experience_salary_grade') {
        filteredSuggestions.value?.push({
          label: `SG-${element.salary_grade}-${element.step} FY: ${element.effective_date} Tranche: ${element.tranche}`,
          value: element[props.apiOptionValue],
        })
      } else if (props.apiOptionLabel === 'employee_name') {
        const first = element.first_name ?? ''
        const middle = element.middle_name ? `${element.middle_name}. ` : ''
        const last = element.last_name ?? ''
        const ext = element.ext_name ?? ''

        filteredSuggestions.value?.push({
          label: `${first} ${middle}${last} ${ext}`.trim().toUpperCase(),
          value: element[props.apiOptionValue],
        })
      } else if (props.apiOptionLabel === 'country_code') {
        filteredSuggestions.value?.push({
          label: `${element.official_name}`,
          value: element[props.apiOptionValue],
        })
      } else {
        filteredSuggestions.value?.push({
          label: label,
          value: element[props.apiOptionValue],
        })
      }
    })

    const localSuggestions = props.suggestions.filter((suggestion) => {
      return suggestion.label.toLowerCase().replace(/\s+/g, '').includes(event.query.toLowerCase().replace(/\s+/g, ''))
    })

    filteredSuggestions.value = [...filteredSuggestions.value, ...localSuggestions]
  } else {
    filteredSuggestions.value = props.suggestions.filter((suggestion) => {
      return suggestion.label.toLowerCase().replace(/\s+/g, '').includes(event.query.toLowerCase().replace(/\s+/g, ''))
    })
  }
}, 250)

/** Send back the true value of an object to the parent */
const handleItemSelect = (event: AutoCompleteItemSelectEvent): void => {
  const selectedOption: WbAutoCompleteOption = event.value

  if (props.employeeMode || props.apiOptionLabel === 'employee_name') {
    // Emit the full employee object
    emit('onTrueValueComputed', selectedOption)
  } else {
    // Emit only the specific field (e.g. value)
    emit('onTrueValueComputed', selectedOption[props.trueValueKey])
  }
}

/** We send back null as the true value when
 *
 * the clear event is emitted */
const handleItemClear = (): void => {
  emit('onTrueValueComputed', null)
}
</script>

<template>
  <div :class="`flex w-full flex-col gap-2 ${wrapperClass}`">
    <label :for="$.uid.toString()" :class="`${props.labelClass || 'text-xs text-surface-800 dark:text-surface-200'}`">
      {{ props.label }}
      <span v-if="props.required" class="text-error-500">*</span>
      <!-- Asterisk for required fields -->
    </label>
    <!-- Start AutoComplete-->
    <div :class="`relative ${$attrs.disabled ? 'hover:cursor-not-allowed' : ''}`">
      <!-- Start Prepend Icon -->
      <div
        :class="`absolute left-3 top-2/4 z-10 -mt-2.5 ${
          $attrs.disabled ? 'text-surface-300 dark:!text-surface-700' : 'text-surface-500'
        }`"
      >
        <slot name="prepend-icon"></slot>
      </div>
      <!-- End Prepend Icon -->
      <AutoComplete
        ref="autoCompleteRef"
        v-bind="$attrs"
        :aria-describedby="`${$.uid.toString()}-help`"
        :class="`h-12 w-full transition-all duration-300 ease-in-out ${$attrs.class}`"
        :input-class="`h-12 w-full ${$slots['prepend-icon'] ? 'pl-10' : ''}
        ${props.invalid ? '!ring-error-500 dark:!ring-error-300' : ''}
        ${$attrs.disabled ? '!text-surface-600 dark:!text-surface-0/70' : ''}
        ${$attrs.inputClass}`"
        @complete="search"
        :suggestions="filteredSuggestions"
        :fluid="true"
        @item-select="(event: AutoCompleteItemSelectEvent) => handleItemSelect(event)"
        @clear="handleItemClear"
        :panelStyle="{ width: dropdownCalculatedWidth, 'box-sizing': 'border-box' }"
        :panelClass="['autocomplete-panel-wrap-text']"
        @show="onShowHandler"
      >
        <template #item="slotProps">
          <div class="p-autocomplete-item-text-wrapper">
            {{ slotProps.item.label }}
          </div>
        </template>
      </AutoComplete>
    </div>
    <!-- End AutoComplete -->
    <!-- Start Validation Messages -->
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
    <!-- End Validation Messages -->
  </div>
</template>

<style>
/* Ensure the panel itself allows content to flow */
.autocomplete-panel-wrap-text.p-autocomplete-panel {
  /* Set a defined max-width if you want to ensure it doesn't go wider than the input.
     The dropdownCalculatedWidth should ideally handle this, but for long text,
     sometimes a max-width on the panel can help it respect bounds. */
  max-width: v-bind(dropdownCalculatedWidth);
  /* Use v-bind for reactivity from script setup */
  width: v-bind(dropdownCalculatedWidth) !important;
  /* Ensure the width is strictly applied */
  box-sizing: border-box !important;
  /* Critical for width calculation */
  overflow: hidden;
  /* Hide horizontal overflow on the panel if content still pushes it */
}

/* Target the list items within the panel */
.autocomplete-panel-wrap-text.p-autocomplete-panel .p-autocomplete-items .p-autocomplete-item {
  display: block !important;
  /* Ensure it behaves like a block element, taking full width */
  padding: 0.5rem 1rem !important;
  /* Adjust padding as needed for visual spacing */
  white-space: normal !important;
  /* Allow text to wrap within the item */
  /* Remove other text overflow properties if they are present elsewhere */
  text-overflow: unset !important;
  overflow: visible !important;
  /* Ensure the item itself doesn't hide its children's overflow */
}

/* Target your custom text wrapper within each list item (MOST IMPORTANT for wrapping) */
.p-autocomplete-item-text-wrapper {
  /* Apply word wrapping properties with !important */
  white-space: normal !important;
  word-break: break-word !important;
  /* Breaks words if they are too long for the container */
  overflow-wrap: break-word !important;
  /* Modern alias for word-break, for compatibility */

  /* Ensure no fixed width or flex shrinking prevents wrapping */
  width: 100% !important;
  /* Take full width of its parent (.p-autocomplete-item) */
  min-width: 0 !important;
  /* Prevent content from forcing min-width */
  flex-shrink: 1 !important;
  /* If parent is flex, allow it to shrink */

  /* Remove text-overflow ellipsis if present */
  text-overflow: unset !important;
  overflow: visible !important;
  /* Ensure content is not hidden */
}
</style>
