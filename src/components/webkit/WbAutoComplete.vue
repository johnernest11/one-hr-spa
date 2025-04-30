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
import { ref } from 'vue'
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
  suggestions: WbAutoCompleteOption[]
  trueValueKey?: WbAutoCompleteOptionKey
  invalid?: boolean
  invalidText?: string
  success?: boolean
  successText?: string
  wrapperClass?: string
  labelClass?: string
  required?: boolean
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
  validationErrorMessageClass: '',
  validationSuccessMessageClass: '',
})

/** Search functionality */
const filteredSuggestions = ref<WbAutoCompleteOption[]>()

const search = useDebounceFn(async (event: AutoCompleteCompleteEvent) => {
  const query = event.query.trim().toLowerCase().replace(/\s+/g, '')
  if (!query.length) {
    filteredSuggestions.value = [...props.suggestions]
    return
  }

  console.log(props.useApiFilter)

  if (props.useApiFilter) {
    const apiUrl = createUrlWithParams(props.apiEndpoint, {
      ...props.apiFilters,
      query: event.query.trim(),
    })

    console.log(apiUrl)

    const { data } = await useApiCall(apiUrl, auth.authenticationToken.value).get().json()
    const apiSuggestions = (data.value?.data || []) as ApiSuggestion[]

    filteredSuggestions.value = []
    apiSuggestions.forEach((element: ApiSuggestion) => {
      const label = getObjectValueUsingPath(element, props.apiOptionLabel)

      filteredSuggestions.value?.push({
        label: label,
        value: element[props.apiOptionValue],
      })
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
  emit('onTrueValueComputed', selectedOption[props.trueValueKey])
}

/** We send back null as the true value when the clear event is emitted */
const handleItemClear = (): void => {
  emit('onTrueValueComputed', null)
}
</script>

<template>
  <div :class="`flex w-full flex-col gap-2 ${wrapperClass}`">
    <label :for="$.uid.toString()" :class="`${props.labelClass || 'text-xs text-surface-800 dark:text-surface-200'}`">
      {{ props.label }}
      <span v-if="props.required" class="text-red-500">*</span>
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
      />
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
