<script setup lang="ts">
import { ref, onBeforeMount } from 'vue'
import { usePersonnelStore } from '@/stores/personnel.store'
import type { PersonnelResponse } from '@/typings/models.types'

const personnelStore = usePersonnelStore()
const divisionIsLoading = ref(false)

const data = ref<{ status: string; level1: number; level2: number; level3: number }[]>([])
const totalLevel1 = ref(0)
const totalLevel2 = ref(0)
const totalLevel3 = ref(0)
const grandTotal = ref(0)

const desiredOrder = ['Permanent', 'Contractual', 'Casual', 'Contract of Service', 'Job Order']

/**--------------------------------------- 
 Fetch Employees Divisions 
 ---------------------------------------**/
onBeforeMount(async () => {
  divisionIsLoading.value = true

  const response = await personnelStore.fetchEmployees(1000)
  if (response.success && Array.isArray(response.data)) {
    const personnel = response.data as PersonnelResponse[]

    const grouped: Record<string, { level1: number; level2: number; level3: number }> = {}
    for (const s of desiredOrder) grouped[s] = { level1: 0, level2: 0, level3: 0 }

    for (const p of personnel) {
      const status = (p.employee?.item?.employment_status ?? 'Unknown').trim()
      const rawLevel = p.employee?.item?.position?.level ?? ''
      const levelStr = String(rawLevel).trim().toLowerCase()

      const lvlKey = /^1(st)?\b|first/.test(levelStr)
        ? 'level1'
        : /^2(nd)?\b|second/.test(levelStr)
          ? 'level2'
          : /^3(rd)?\b|third/.test(levelStr)
            ? 'level3'
            : null

      if (!grouped[status]) grouped[status] = { level1: 0, level2: 0, level3: 0 }
      if (lvlKey) grouped[status][lvlKey]++
    }

    data.value = desiredOrder.map((s) => ({
      status: s,
      level1: grouped[s]?.level1 ?? 0,
      level2: grouped[s]?.level2 ?? 0,
      level3: grouped[s]?.level3 ?? 0,
    }))

    totalLevel1.value = data.value.reduce((s, r) => s + r.level1, 0)
    totalLevel2.value = data.value.reduce((s, r) => s + r.level2, 0)
    totalLevel3.value = data.value.reduce((s, r) => s + r.level3, 0)
    grandTotal.value = totalLevel1.value + totalLevel2.value + totalLevel3.value
  } else {
    data.value = desiredOrder.map((s) => ({ status: s, level1: 0, level2: 0, level3: 0 }))
    totalLevel1.value = totalLevel2.value = totalLevel3.value = grandTotal.value = 0
  }

  divisionIsLoading.value = false
})
</script>

<template>
  <div class="flex h-full w-full flex-col shadow-md">
    <div class="p-4">
      <h2 class="mb-4 ml-4 text-2xl italic text-primary-700 dark:text-primary-600 md:ml-4">
        Distribution of Staff Per Position Level
      </h2>

      <div v-if="divisionIsLoading" class="py-10 text-center text-surface-500">Loading position data...</div>

      <div v-else>
        <!-- Header -->
        <div class="hidden grid-cols-6 gap-2 border-b-2 bg-surface-100 px-4 py-3 md:grid md:px-24">
          <div class="text-start text-sm font-semibold text-surface-500">STATUS</div>
          <div class="text-center text-sm font-semibold text-surface-500">1ST LEVEL</div>
          <div class="text-center text-sm font-semibold text-surface-500">2ND LEVEL</div>
          <div class="text-center text-sm font-semibold text-surface-500">3RD LEVEL</div>
          <div class="text-center text-sm font-semibold text-surface-500">TOTAL</div>
          <div class="text-center text-sm font-semibold text-surface-500">PERCENTAGE</div>
        </div>

        <!-- Data rows -->
        <div
          v-for="(row, i) in data"
          :key="i"
          class="grid grid-cols-6 items-center border-b border-surface-300 px-4 py-2 md:px-24"
        >
          <div class="text-base text-surface-700">{{ row.status }}</div>
          <div class="text-center text-base text-surface-700">{{ row.level1 }}</div>
          <div class="text-center text-base text-surface-700">{{ row.level2 }}</div>
          <div class="text-center text-base text-surface-700">{{ row.level3 }}</div>
          <div class="text-center text-base text-surface-700">
            {{ row.level1 + row.level2 + row.level3 }}
          </div>
          <div class="text-center text-base text-surface-700">
            {{ grandTotal ? (((row.level1 + row.level2 + row.level3) / grandTotal) * 100).toFixed(1) + '%' : '0%' }}
          </div>
        </div>

        <!-- Totals row -->
        <div class="grid grid-cols-6 items-center border-t-2 border-surface-400 px-4 py-3 font-semibold md:px-24">
          <div class="text-start text-surface-800">TOTAL</div>
          <div class="text-center text-surface-800">{{ totalLevel1 }}</div>
          <div class="text-center text-surface-800">{{ totalLevel2 }}</div>
          <div class="text-center text-surface-800">{{ totalLevel3 }}</div>
          <div class="text-center text-surface-800">{{ grandTotal }}</div>
          <div class="text-center text-surface-800">100%</div>
        </div>
      </div>
    </div>
  </div>
</template>
