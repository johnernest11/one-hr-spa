<script setup lang="ts">
import { ref, onBeforeMount, computed } from 'vue'
import { usePersonnelStore } from '@/stores/personnel.store'
import { PersonnelResponse } from '@/typings/models.types'

const personnelStore = usePersonnelStore()
const paginationLimit = 1000
const divisionIsLoading = ref(false)
const data = ref<{ status: string; male: number; female: number }[]>([])
const isLoading = ref(false)

const defaultStatuses = ['Permanent', 'Coterminous', 'Contractual', 'Casual', 'Contract of Service']

/**--------------------------------------- 
 Fetch all Position where Social Welfare 
 ---------------------------------------**/
onBeforeMount(async () => {
  divisionIsLoading.value = true
  const response = await personnelStore.fetchEmployees(paginationLimit)

  if (response.success && Array.isArray(response.data)) {
    const personnel = response.data as PersonnelResponse[]

    const socialWelfare = personnel.filter((p) => p.employee?.item?.position?.title?.toUpperCase()?.includes('SOCIAL WELFARE'))

    data.value = defaultStatuses.map((status) => {
      const employees = socialWelfare.filter(
        (p) => (p.employee?.item?.employment_status || '').trim().toLowerCase() === status.toLowerCase()
      )

      const male = employees.filter((p) => p.sex?.toLowerCase() === 'male').length
      const female = employees.filter((p) => p.sex?.toLowerCase() === 'female').length
      const total = employees.length

      return { status, male, female, total }
    })
  }

  divisionIsLoading.value = false
})

const totalMale = computed(() => data.value.reduce((s, r) => s + r.male, 0))
const totalFemale = computed(() => data.value.reduce((s, r) => s + r.female, 0))
const grandTotal = computed(() => totalMale.value + totalFemale.value)
</script>

<template>
  <div class="flex h-full w-full flex-col shadow-md">
    <div class="p-4">
      <h2 class="mb-4 ml-4 text-2xl italic text-primary-700 dark:text-primary-600 md:ml-4">Distribution of Social Workers</h2>

      <div v-if="isLoading" class="py-6 text-center text-surface-500">Loading...</div>

      <template v-else>
        <!-- Header -->
        <div class="hidden grid-cols-7 gap-2 border-b-2 bg-surface-100 px-4 py-4 md:grid md:px-24">
          <div></div>
          <div class="text-md col-span-5 text-center font-semibold text-surface-500">NUMBER OF STAFF</div>
          <div class="text-md text-center font-semibold text-surface-500">PERCENTAGE</div>
        </div>

        <!-- Column Headers -->
        <div class="hidden grid-cols-6 gap-2 border-b-2 bg-surface-100 px-4 py-3 md:grid md:px-24">
          <div class="col-span-2 text-start text-sm font-semibold text-surface-500">STATUS OF EMPLOYMENT</div>
          <div class="text-center text-sm font-semibold text-surface-500">MALE</div>
          <div class="text-center text-sm font-semibold text-surface-500">FEMALE</div>
          <div class="text-center text-sm font-semibold text-surface-500">TOTAL</div>
          <div class="text-center text-sm font-semibold text-surface-500">PERCENTAGE</div>
        </div>

        <!-- Data Rows -->
        <div
          v-for="(row, i) in data"
          :key="i"
          class="grid grid-cols-6 items-center border-b border-surface-300 px-4 py-2 md:px-24"
        >
          <div class="col-span-2 text-base text-surface-700">{{ row.status }}</div>
          <div class="text-center text-base text-surface-700">{{ row.male }}</div>
          <div class="text-center text-base text-surface-700">{{ row.female }}</div>
          <div class="text-center text-base text-surface-700">{{ row.male + row.female }}</div>
          <div class="text-center text-base text-surface-700">
            {{ grandTotal > 0 ? (((row.male + row.female) / grandTotal) * 100).toFixed(1) + '%' : '0%' }}
          </div>
        </div>

        <!-- Totals -->
        <div class="grid grid-cols-6 items-center border-t-2 border-surface-400 px-4 py-3 font-semibold md:px-24">
          <div class="col-span-2 text-start text-surface-800">TOTAL</div>
          <div class="text-center text-surface-800">{{ totalMale }}</div>
          <div class="text-center text-surface-800">{{ totalFemale }}</div>
          <div class="text-center text-surface-800">{{ grandTotal }}</div>
          <div class="text-center text-surface-800">100%</div>
        </div>
      </template>
    </div>
  </div>
</template>
