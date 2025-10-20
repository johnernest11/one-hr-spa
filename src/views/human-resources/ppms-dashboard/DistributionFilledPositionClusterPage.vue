<script setup lang="ts">
import { ref, onBeforeMount, computed } from 'vue'
import type { DivisionResponse, PersonnelResponse } from '@/typings/models.types'
import { useLibrariesStore } from '@/stores/libraries.store'
import { usePersonnelStore } from '@/stores/personnel.store'

type Office = { name: string; male: number; female: number; total: number }
type Cluster = {
  cluster: string
  offices: Office[]
  totalMale: number
  totalFemale: number
  total: number
}

const clusters = ref<Cluster[]>([])
const divisionIsLoading = ref(false)
const divisionStore = useLibrariesStore()
const personnelStore = usePersonnelStore()
const paginationLimit = 1000

/**  -------------------
Base cluster structure
--------------------------**/
const baseClusters: Cluster[] = [
  { cluster: 'Operations Cluster', offices: [], totalMale: 0, totalFemale: 0, total: 0 },
  { cluster: 'General Administration and Support (GASS) Cluster', offices: [], totalMale: 0, totalFemale: 0, total: 0 },
  { cluster: 'Support to Operations Cluster', offices: [], totalMale: 0, totalFemale: 0, total: 0 },
]
/**  ------------------------------------------
Mapping: which divisions belong to which cluster
------------------------------------------------**/
const clusterMappings: Record<string, string[]> = {
  'Operations Cluster': ['DISASTER RESPONSE MANAGEMENT DIVISION', 'SPECIALIZED PROGRAMS DIVISION', 'STATUTORY PROGRAMS DIVISION'],
  'General Administration and Support (GASS) Cluster': [
    'HUMAN RESOURCE MANAGEMENT AND DEVELOPMENT DIVISION',
    'FINANCE AND MANAGEMENT DIVISION',
    'ADMINISTRATIVE DIVISION',
  ],
  'Support to Operations Cluster': ['OFFICE OF THE REGIONAL DIRECTOR', 'POLICY AND PLANS DIVISION', 'INNOVATIONS DIVISION'],
}

/**--------------------------------------- 
 Fetch divisions and Employees Gender Data 
 ---------------------------------------**/
onBeforeMount(async () => {
  divisionIsLoading.value = true

  const [divisionResponse, employeeResponse] = await Promise.all([
    divisionStore.fetchListDivisions(1000),
    personnelStore.fetchEmployees(paginationLimit),
  ])

  if (
    divisionResponse.success &&
    Array.isArray(divisionResponse.data) &&
    employeeResponse.success &&
    Array.isArray(employeeResponse.data)
  ) {
    const divisions = divisionResponse.data as DivisionResponse[]
    const personnel = employeeResponse.data as PersonnelResponse[]

    clusters.value = baseClusters.map((cluster) => {
      const offices = divisions
        .filter((d) =>
          clusterMappings[cluster.cluster]?.some((mappedName) => mappedName.toLowerCase() === d.name.trim().toLowerCase())
        )
        .map((d) => {
          const employeesInDivision = personnel.filter(
            (p) => p.employee?.division?.name?.trim().toLowerCase() === d.name.trim().toLowerCase()
          )

          const male = employeesInDivision.filter((p) => p.sex?.toLowerCase() === 'male').length
          const female = employeesInDivision.filter((p) => p.sex?.toLowerCase() === 'female').length
          const total = employeesInDivision.length

          return { name: d.name, male, female, total }
        })

      const totalMale = offices.reduce((sum, o) => sum + o.male, 0)
      const totalFemale = offices.reduce((sum, o) => sum + o.female, 0)
      const total = offices.reduce((sum, o) => sum + o.total, 0)

      return { ...cluster, offices, totalMale, totalFemale, total }
    })
  }

  divisionIsLoading.value = false
})

const totalMale = computed(() => clusters.value.reduce((sum, c) => sum + (c.totalMale || 0), 0))
const totalFemale = computed(() => clusters.value.reduce((sum, c) => sum + (c.totalFemale || 0), 0))
const grandTotal = computed(() => clusters.value.reduce((sum, c) => sum + (c.total || 0), 0))
</script>
<template>
  <div class="flex h-full w-full flex-col shadow-md">
    <div class="p-4">
      <!-- Page title -->
      <h2 class="mb-4 ml-4 text-2xl italic text-primary-700 dark:text-primary-600 md:ml-4">
        Distribution of Filled Position per Cluster
      </h2>

      <!-- Loading / Empty states -->
      <div v-if="divisionIsLoading" class="py-10 text-center text-surface-500">Loading division data...</div>
      <div v-else-if="!clusters.length" class="py-10 text-center text-surface-500">No divisions available.</div>

      <!-- Header row -->
      <div v-else class="hidden grid-cols-6 gap-2 border-b-2 bg-surface-100 px-4 py-3 md:grid md:px-24">
        <div class="col-span-2 text-start text-sm font-semibold text-surface-500"></div>
        <div class="text-center text-sm font-semibold text-surface-500">Male</div>
        <div class="text-center text-sm font-semibold text-surface-500">Female</div>
        <div class="text-center text-sm font-semibold text-surface-500">Total</div>
        <div class="text-center text-sm font-semibold text-surface-500">Percentage</div>
      </div>

      <!-- Cluster sections -->
      <div v-for="(cluster, i) in clusters" :key="i" class="px-4 py-3 md:px-24">
        <!-- Cluster total row -->
        <div
          class="grid grid-cols-6 items-center border-b-2 border-surface-300 bg-surface-50 px-4 py-2 font-semibold uppercase text-primary-700"
        >
          <div class="col-span-2">{{ cluster.cluster }}</div>
          <div class="text-center">{{ cluster.totalMale }}</div>
          <div class="text-center">{{ cluster.totalFemale }}</div>
          <div class="text-center">{{ cluster.total }}</div>
          <div class="text-center">{{ ((cluster.total / grandTotal) * 100).toFixed(1) }}%</div>
        </div>

        <!-- Offices under cluster -->
        <div
          v-for="(office, j) in cluster.offices"
          :key="j"
          class="grid grid-cols-6 items-center border-b border-surface-200 px-4 py-2 md:px-4"
        >
          <div class="col-span-2 list-inside list-disc text-base text-surface-700">• {{ office.name }}</div>
          <div class="text-center text-base text-surface-700">{{ office.male }}</div>
          <div class="text-center text-base text-surface-700">{{ office.female }}</div>
          <div class="text-center text-base text-surface-700">{{ office.total }}</div>
          <div></div>
        </div>
      </div>

      <!-- Grand total row -->
      <div class="grid grid-cols-6 items-center border-t-2 border-surface-400 px-4 py-3 font-semibold md:px-24">
        <div class="col-span-2 text-start text-surface-800">TOTAL</div>
        <div class="text-center text-surface-800">{{ totalMale }}</div>
        <div class="text-center text-surface-800">{{ totalFemale }}</div>
        <div class="text-center text-surface-800">{{ grandTotal }}</div>
        <div></div>
      </div>
    </div>
  </div>
</template>
