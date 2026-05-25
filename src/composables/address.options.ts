import { computed, Ref, ToRefs, UnwrapNestedRefs, watch } from 'vue'
import { WbAutoCompleteOption } from '@/components/webkit/WbAutoComplete.vue'
import { RegistrationAddressPayload } from '@/stores/forms.store.ts'
import { UserProfilePayload } from '@/stores/profile.store.ts'

/**
 * @description Filter the list of address based on the parent.
 * If NCR is selected as the region (parentId), then the four districts in NCR
 * should only be available for selection in the Province Options. Same goes for
 * City and Barangays
 *
 * @example
 * const { provinceOptions, cityOptions, barangayOptions } = storeToRefs(publicStore)
 * const filteredProvinces = useFilterByParentId(toRef(payload, 'region_id'), provinceOptions)
 * const filteredCities = useFilterByParentId(toRef(payload, 'province_id'), cityOptions)
 * const filteredBarangays = useFilterByParentId(toRef(payload, 'city_id'), barangayOptions)
 *
 */
export const useFilterByParentId = (
  parentId: Ref<number | string | { value: number | string } | null>,
  fullOptionsList: Ref<WbAutoCompleteOption[]>
) => {
  return computed(() => {
    const id = typeof parentId.value === 'object' ? parentId.value?.value : parentId.value

    if (id === null || id === undefined) return []

    return fullOptionsList.value.filter((option) => Number(option.parent_value) === Number(id))
  })
}

/**
 * @description Clear the selected address if the parent is changed or cleared.
 * Let's say the region, province, city, and barangay are already selected,
 * then the user decided to change the province -- the behavior for this will be:
 * the selected values for barangay and city will be cleared.
 */
export const useClearSelectedAddressIfNotInParentList = (
  payload: ToRefs<UnwrapNestedRefs<RegistrationAddressPayload | Partial<UserProfilePayload>>>,
  selectedProvinceObjRef: Ref<WbAutoCompleteOption | null>,
  selectedCityObjectRef: Ref<WbAutoCompleteOption | null>,
  selectedBarangayObjectRef: Ref<WbAutoCompleteOption | null>,
  provinceOptionsList: Ref<WbAutoCompleteOption[]>,
  cityOptionsList: Ref<WbAutoCompleteOption[]>,
  barangayOptionsList: Ref<WbAutoCompleteOption[]>
) => {
  // Check if selected province is still in the filtered list when region is changed
  watch(
    () => payload.region_id,
    (newRegionId) => {
      if (!newRegionId?.value) return clearProvinceAndDown()

      const provinceStillInList = !!provinceOptionsList.value.find((p) => p.value === payload.province_id?.value)
      if (!provinceStillInList) clearProvinceAndDown()
    },
    { deep: true }
  )

  // Check if selected city is still in the filtered list when province is changed
  watch(
    () => payload.province_id,
    (newProvinceId) => {
      if (!newProvinceId?.value) return clearCityAndDown()

      const cityStillInList = !!cityOptionsList.value.find((c) => c.value === payload.city_id?.value)
      if (!cityStillInList) clearCityAndDown()
    },
    { deep: true }
  )

  // Check if selected barangay is still in the filtered list when city is changed
  watch(
    () => payload.city_id,
    (newCityId) => {
      if (!newCityId?.value) return clearBarangay()

      const barangayStillInList = !!barangayOptionsList.value.find((b) => b.value === payload.barangay_id?.value)
      if (!barangayStillInList) clearBarangay()
    },
    { deep: true }
  )

  const clearProvinceAndDown = () => {
    // Clear current selection for province, city, and barangay
    if (payload.province_id !== undefined) payload.province_id.value = null
    selectedProvinceObjRef.value = null

    if (payload.city_id !== undefined) payload.city_id.value = null
    selectedCityObjectRef.value = null

    if (payload.barangay_id !== undefined) payload.barangay_id.value = null
    selectedBarangayObjectRef.value = null
  }

  const clearCityAndDown = () => {
    // Clear current selection for city, and barangay
    if (payload.city_id !== undefined) payload.city_id.value = null
    selectedCityObjectRef.value = null

    if (payload.barangay_id !== undefined) payload.barangay_id.value = null
    selectedBarangayObjectRef.value = null
  }

  const clearBarangay = () => {
    // Clear current selection for barangay
    if (payload.barangay_id !== undefined) payload.barangay_id.value = null
    selectedBarangayObjectRef.value = null
  }
}
