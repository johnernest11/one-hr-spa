<script setup lang="ts">
import { reactive, ref, onBeforeMount, computed } from 'vue'
import { useAddressStore } from '@/stores/address.store.ts'
import { usePdsStore, PersonalDataSheetPayload } from '@/stores/pds.store.ts'
const pdsStore = usePdsStore()
/** Payload */
const payload = reactive<PersonalDataSheetPayload>({
  ...pdsStore.pdsInfo,
})

/** Initialize Address Options List */
const publicStore = useAddressStore()
const addressesAreLoading = ref(false)
onBeforeMount(async () => {
  addressesAreLoading.value = true
  await Promise.allSettled([
    publicStore.fetchRegions(),
    publicStore.fetchProvinces(),
    publicStore.fetchCities(),
    publicStore.fetchBarangays(),
  ])
  addressesAreLoading.value = false
})

/************************************************************
 * Compute total service tenure combining:
 * 1. Current agency tenure (first work experience entry)
 * 2. All Permanent + Government Service
 ************************************************************/
const computeTotalServiceTenure = (experiences: typeof payload.individual_work_experience) => {
  if (!experiences || experiences.length === 0) return '-'

  // Include first entry (current agency)
  const firstExp = experiences[0] ? [experiences[0]] : []

  // Filter permanent + government service
  const permanentGov = experiences.filter(
    (exp) => exp.is_gov_service === true && exp.status_of_appointment?.toLowerCase() === 'permanent'
  )

  // Combine and remove duplicates (if firstExp is also in permanentGov)
  const combined = Array.from(new Set([...firstExp, ...permanentGov]))

  if (combined.length === 0) return '-'

  let totalYears = 0
  let totalMonths = 0
  let totalDays = 0

  combined.forEach((exp) => {
    if (!exp.inclusive_date_from) return

    const start = new Date(exp.inclusive_date_from)
    const end = exp.is_current_work
      ? new Date() // today
      : exp.inclusive_date_to
        ? new Date(exp.inclusive_date_to)
        : new Date()

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return

    let years = end.getFullYear() - start.getFullYear()
    let months = end.getMonth() - start.getMonth()
    let days = end.getDate() - start.getDate()

    if (days < 0) {
      months -= 1
      days += new Date(end.getFullYear(), end.getMonth(), 0).getDate()
    }

    if (months < 0) {
      years -= 1
      months += 12
    }

    totalYears += years
    totalMonths += months
    totalDays += days
  })

  // Normalize totals
  if (totalDays >= 30) {
    totalMonths += Math.floor(totalDays / 30)
    totalDays = totalDays % 30
  }
  if (totalMonths >= 12) {
    totalYears += Math.floor(totalMonths / 12)
    totalMonths = totalMonths % 12
  }

  const parts = []
  if (totalYears > 0) parts.push(`${totalYears} yr${totalYears > 1 ? 's' : ''}`)
  if (totalMonths > 0) parts.push(`${totalMonths} mo${totalMonths > 1 ? 's' : ''}`)
  if (totalDays > 0) parts.push(`${totalDays} day${totalDays > 1 ? 's' : ''}`)

  if (!parts.length) return '0 days'

  if (parts.length > 1) {
    const last = parts.pop()
    return `${parts.join(', ')} and ${last}`
  }

  return parts[0]
}

const allpermanentGovTenure = computed(() => computeTotalServiceTenure(payload.individual_work_experience))
const currentGovTenure = computed(() =>
  computeTotalServiceTenure(payload.individual_work_experience[0] ? [payload.individual_work_experience[0]] : [])
)
</script>

<template>
  <section class="bg-surface-0 p-4">
    <h2 class="mb-4 text-xl font-bold text-primary-800">Employment History</h2>

    <form autocomplete="off">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <!-- Current Agency -->
        <div class="flex items-center gap-2">
          <span class="w-40 text-sm font-medium text-surface-600">Current Agency:</span>
          <p class="text-lg text-surface-900">
            {{ payload.individual_work_experience[0]?.department_agency_office_company || '-' }}
          </p>
        </div>

        <!-- Position -->
        <div class="flex items-center gap-2">
          <span class="w-32 text-sm font-medium text-surface-600">Position:</span>
          <p class="text-lg text-surface-900">{{ payload.individual_work_experience[0]?.position_title || '-' }}</p>
        </div>

        <!-- Employement Status -->
        <div class="flex items-center gap-2">
          <span class="w-32 text-sm font-medium text-surface-600">Employement Status:</span>
          <p class="text-lg text-surface-900">{{ payload.individual_work_experience[0]?.status_of_appointment || '-' }}</p>
        </div>

        <!-- Length of Service (Current Agency) -->
        <div class="flex items-center gap-2">
          <span class="w-32 text-sm font-medium text-surface-600">Length of Service (Current Agency):</span>
          <p class="text-lg text-surface-900">{{ currentGovTenure }}</p>
        </div>
        <!-- Permanent Gov Service Tenure: -->
        <div class="flex items-center gap-2">
          <span class="w-32 text-sm font-medium text-surface-600"> Permanent Gov Service Tenure: </span>
          <p class="text-lg text-surface-900">
            {{ allpermanentGovTenure }}
          </p>
        </div>
      </div>
    </form>
  </section>
</template>
