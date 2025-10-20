<script setup lang="ts">
import { ref, onBeforeMount, computed } from 'vue'
import type { PersonnelResponse } from '@/typings/models.types'
import { usePersonnelStore } from '@/stores/personnel.store'

type PositionItem = {
  name: string
  male: number
  female: number
  total: number
}

type ManagementLevel = {
  cluster: string
  positions: PositionItem[]
  totalMale: number
  totalFemale: number
  total: number
}

const positions = ref<ManagementLevel[]>([])
const divisionIsLoading = ref(false)
const personnelStore = usePersonnelStore()
const paginationLimit = 1000

/** ------------------------------------------
Mapping: which positions belong to which cluster
------------------------------------------------ */
const clusterMappings: Record<string, string[]> = {
  'Executive Level': ['DIRECTOR IV', 'DIRECTOR III'],
  'Division Head': [
    'CHIEF ADMINISTRATIVE OFFICER',
    'SUPERVISING ADMINISTRATIVE OFFICER',
    'ADMINISTRATIVE OFFICER V',
    'PROJECT DEVELOPMENT OFFICER IV',
  ],
  'Section Head': [],
  'Unit Head': [],
}

/**--------------------------------------- 
 Fetch Employees and Group by Position 
 ---------------------------------------**/
onBeforeMount(async () => {
  divisionIsLoading.value = true

  const employeeResponse = await personnelStore.fetchEmployees(paginationLimit)

  if (employeeResponse.success && Array.isArray(employeeResponse.data)) {
    const personnel = employeeResponse.data as PersonnelResponse[]

    positions.value = Object.entries(clusterMappings).map(([clusterName, positionList]) => {
      const positionsData: PositionItem[] = positionList.map((posTitle) => {
        const employees = personnel.filter(
          (p) => p.employee?.item?.position?.title.trim().toUpperCase() === posTitle.toUpperCase()
        )
        const male = employees.filter((p) => p.sex?.toLowerCase() === 'male').length
        const female = employees.filter((p) => p.sex?.toLowerCase() === 'female').length
        const total = employees.length

        return { name: posTitle, male, female, total }
      })

      const totalMale = positionsData.reduce((s, p) => s + p.male, 0)
      const totalFemale = positionsData.reduce((s, p) => s + p.female, 0)
      const total = positionsData.reduce((s, p) => s + p.total, 0)

      return { cluster: clusterName, positions: positionsData, totalMale, totalFemale, total }
    })
  }

  divisionIsLoading.value = false
})

const totalMale = computed(() => positions.value.reduce((s, c) => s + c.totalMale, 0))
const totalFemale = computed(() => positions.value.reduce((s, c) => s + c.totalFemale, 0))
const grandTotal = computed(() => positions.value.reduce((s, c) => s + c.total, 0))
</script>

<template>
  <div class="flex h-full w-full flex-col shadow-md">
    <div class="p-4">
      <!-- Page title -->
      <h2 class="mb-4 ml-4 text-2xl italic text-primary-700 dark:text-primary-600 md:ml-4">
        Distribution of Filled Positions per Management Level
      </h2>

      <!-- Loading / Empty states -->
      <div v-if="divisionIsLoading" class="py-10 text-center text-surface-500">Loading position data...</div>
      <div v-else-if="!positions.length" class="py-10 text-center text-surface-500">No data available.</div>

      <!-- Header row -->
      <div v-else class="hidden grid-cols-6 gap-2 border-b-2 bg-surface-100 px-4 py-3 md:grid md:px-24">
        <div class="col-span-2 text-start text-sm font-semibold text-surface-500">POSITION</div>
        <div class="text-center text-sm font-semibold text-surface-500">MALE</div>
        <div class="text-center text-sm font-semibold text-surface-500">FEMALE</div>
        <div class="text-center text-sm font-semibold text-surface-500">TOTAL</div>
        <div class="text-center text-sm font-semibold text-surface-500">PERCENTAGE</div>
      </div>

      <!-- Cluster sections -->
      <div v-for="(cluster, i) in positions" :key="i" class="px-4 py-3 md:px-24">
        <!-- Cluster total -->
        <div
          class="grid grid-cols-6 items-center border-b-2 border-surface-300 bg-surface-50 px-4 py-2 font-semibold uppercase text-primary-700"
        >
          <div class="col-span-2">{{ cluster.cluster }}</div>
          <div class="text-center">{{ cluster.totalMale }}</div>
          <div class="text-center">{{ cluster.totalFemale }}</div>
          <div class="text-center">{{ cluster.total }}</div>
          <div class="text-center">{{ ((cluster.total / grandTotal) * 100).toFixed(1) }}%</div>
        </div>

        <!-- Positions under cluster -->
        <div
          v-for="(pos, j) in cluster.positions"
          :key="j"
          class="grid grid-cols-6 items-center border-b border-surface-200 px-4 py-2 md:px-4"
        >
          <div class="col-span-2 text-base text-surface-700">• {{ pos.name }}</div>
          <div class="text-center text-base text-surface-700">{{ pos.male }}</div>
          <div class="text-center text-base text-surface-700">{{ pos.female }}</div>
          <div class="text-center text-base text-surface-700">{{ pos.total }}</div>
          <div class="text-center text-base text-surface-700">{{ ((pos.total / grandTotal) * 100).toFixed(1) }}%</div>
        </div>
      </div>

      <!-- Grand total -->
      <div class="grid grid-cols-6 items-center border-t-2 border-surface-400 px-4 py-3 font-semibold md:px-24">
        <div class="col-span-2 text-start text-surface-800">TOTAL</div>
        <div class="text-center text-surface-800">{{ totalMale }}</div>
        <div class="text-center text-surface-800">{{ totalFemale }}</div>
        <div class="text-center text-surface-800">{{ grandTotal }}</div>
        <div class="text-center text-surface-800">100%</div>
      </div>
    </div>
  </div>
</template>
