<script setup lang="ts">
import { usePdsStore } from '@/stores/pds.store'
import { watch, ref, onMounted, onBeforeMount } from 'vue'
import { useItemNumberStore } from '@/stores/item-number.store.ts'
import { useSalaryGradesStore } from '@/stores/salary-grades.store.ts'
import { formatDate } from '@/utils/helpers.js'
const pdsStore = usePdsStore()
const itemStore = useItemNumberStore()
const sgStore = useSalaryGradesStore()
const payload = pdsStore.pdsInfo

const isItemLoading = ref(false)
const isSalaryGradeLoading = ref(false)
onBeforeMount(async () => {
  isItemLoading.value = true
  isSalaryGradeLoading.value = true

  // Load dropdowns and other reference data
  await Promise.allSettled([itemStore.fetchItemNumber(), sgStore.fetchSalaryGrade()])

  isItemLoading.value = false
})

/**
 * Fetch item and attach to employee
 */
const fetchItem = async () => {
  const itemId = payload?.employee?.item_id
  if (!itemId) return

  isItemLoading.value = true

  const res = await itemStore.fetchItemNumberById(itemId)

  payload.employee.item = res?.success && res.data ? (Array.isArray(res.data) ? res.data[0] : res.data) : null

  isItemLoading.value = false
}

/**
 * Run on mount
 */
onMounted(() => {
  fetchItem()
})

/**
 * Also watch item_id (important if data loads later)
 */
watch(
  () => payload.employee?.item_id,
  (newVal) => {
    if (newVal) {
      fetchItem()
    }
  }
)
</script>
<template>
  <template v-if="!isItemLoading">
    <section class="bg-surface-0 p-4">
      <h2 class="mb-4 text-xl font-bold text-primary-800">Employment Details</h2>

      <form autocomplete="off">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <!-- Position Title  -->
          <div class="flex items-center gap-2">
            <span class="w-32 text-sm font-medium text-surface-600">Position Title: </span>
            <p class="text-md text-surface-900">
              {{ payload.employee?.item?.position?.title || '-' }}
            </p>
          </div>

          <!-- Date of Original Appointment -->
          <div class="flex items-center gap-2">
            <span class="w-40 text-sm font-medium text-surface-600">Date of Original Appointment:</span>
            <p class="text-lg text-surface-900">
              {{ formatDate(payload.individual_work_experience?.[0]?.inclusive_date_from) || '-' }}
            </p>
          </div>

          <!-- Employment Type  -->
          <div class="flex items-center gap-2">
            <span class="w-32 text-sm font-medium text-surface-600">Employment Type: </span>
            <p class="text-lg text-surface-900">{{ payload.employee?.item?.employment_status || '-' }}</p>
          </div>

          <!-- Date of Last Promotion -->
          <div class="flex items-center gap-2">
            <span class="w-40 text-sm font-medium text-surface-600">Date of Last Promotion:</span>
            <p class="text-lg text-surface-900">
              {{ formatDate(payload.individual_work_experience?.[0]?.position_title) || '-' }}
            </p>
          </div>

          <div class="flex items-center gap-2">
            <span class="w-32 text-sm font-medium text-surface-600">Monthly Salary:</span>
            SG {{ payload.employee?.item?.salary_grade?.salary_grade || '-' }} -
            {{ payload.employee?.item?.salary_grade?.amount?.toLocaleString() || '-' }}
          </div>

          <!-- Entry Date (First Day in Service) -->
          <div class="flex items-center gap-2">
            <span class="w-40 text-sm font-medium text-surface-600">Entry Date (First Day in Service):</span>
            <p class="text-lg text-surface-900">
              {{ formatDate(payload.individual_work_experience?.[0]?.inclusive_date_to) || '-' }}
            </p>
          </div>
        </div>
      </form>
    </section>
  </template>

  <template v-else-if="isItemLoading">
    <div class="bg-surface-2 h-full w-full animate-pulse rounded-md p-6">
      <!-- --------------------------- Form Fields --------------------------- -->
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <!-- Field 1 -->
        <div class="flex flex-col gap-2">
          <div class="h-4 w-1/4 rounded bg-surface-300"></div>
          <div class="h-10 w-full rounded bg-surface-300"></div>
        </div>
      </div>
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <!-- Field 1 -->
        <div class="flex flex-col gap-2">
          <div class="h-4 w-1/4 rounded bg-surface-300"></div>
          <div class="h-10 w-full rounded bg-surface-300"></div>
        </div>
      </div>

      <!-- --------------------------- Textarea --------------------------- -->
      <div class="mt-6 flex flex-col gap-2">
        <div class="h-4 w-1/6 rounded bg-surface-300"></div>
        <div class="h-24 w-full rounded bg-surface-300"></div>
      </div>
    </div>
  </template>
</template>
