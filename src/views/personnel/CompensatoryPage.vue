<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { PersonnelCompensatoryDayTimeOffResponse } from '@/typings/models.types.ts'
import { useCompensatoryTimeOffStore } from '@/stores/personnel-compensatory-time-off.store'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { calcDurationMins, fmtHoursMins, extractMonthYear, extractMonthYearPlusOneYear } from '@/utils/helpers'
import Button from 'primevue/button'
import Card from 'primevue/card'

const compensatoryTimeOffStore = useCompensatoryTimeOffStore()
const isLoading = ref(true)
const toast = useToast()
const allCompensatoryData = ref<PersonnelCompensatoryDayTimeOffResponse[]>([])

onMounted(async () => {
  const response = await compensatoryTimeOffStore.fetchCompensatoryDayTimeOff()
  if (response && response.success && Array.isArray(response.data)) {
    allCompensatoryData.value = response.data
  }
  isLoading.value = false
})

const calcTotalDurationMins = (rows: PersonnelCompensatoryDayTimeOffResponse['rows']): number => {
  return (rows ?? []).reduce((total, subRow) => {
    if (subRow.time_start && subRow.time_end) {
      return total + calcDurationMins(subRow.time_start, subRow.time_end)
    }
    return total
  }, 0)
}

// Export PDF for a single compensatory time off entry
const exportPdf = async (compensatoryDayTimeOff: PersonnelCompensatoryDayTimeOffResponse) => {
  const { ctdo_period, id } = compensatoryDayTimeOff

  toast.add({
    severity: 'info',
    summary: 'Exporting...',
    detail: `Exporting ${ctdo_period} of Certificate of COC Earned '...`,
    life: 5000,
  })

  const reportResponse = await compensatoryTimeOffStore.generateCompensatoryDayTimeOff(String(id))
  const blob = reportResponse.data.value
  const fileName = reportResponse.fileNameHeader?.value || `Certificate-of-COC-Earned-${id}.docx`

  if (blob) {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    toast.add({
      severity: 'success',
      summary: 'Certificate of COC Earned Details Exported',
      detail: `The Certificate of COC Earned from ${compensatoryDayTimeOff.ctdo_period} was successfully exported.`,
      life: 5000,
    })
  }
}
</script>
<template>
  <div class="mx-auto flex h-full w-full flex-col pl-4 pt-8">
    <div class="flex w-full flex-col gap-4 pb-4 pl-4 pt-8">
      <Card class="h-full">
        <template #content>
          <div class="flex w-full flex-col items-start md:flex-row">
            <Button
              icon="pi pi-angle-left"
              severity="secondary"
              aria-label="Bookmark"
              rounded
              @click="$router.go(-1)"
              size="small"
              class="mb-2 ml-4 md:mb-0 md:ml-0"
            />
            <h2 class="mb-2 ml-4 text-3xl text-surface-600 dark:text-primary-100 md:ml-4">
              <font-awesome-icon :icon="['fas', 'hourglass-end']" class="h-5 text-surface-600 sm:h-6 md:h-7" />
              Compensatory Overtime Credits (COC)
              <br />
              <span class="ml-10 text-lg text-surface-600 md:text-xl lg:text-2xl">
                Earned as of
                {{ new Date().toLocaleString(undefined, { month: 'long', year: 'numeric' }) }}
              </span>
            </h2>
          </div>
          <br />

          <!-- Button Actions Section -->
          <div class="mt-6 flex flex-col gap-2 px-4 md:flex-row md:items-center md:justify-between">
            <!-- Placeholder for filters or extra info -->
            <div class="w-full md:w-2/3 lg:w-1/2"></div>

            <!-- Export & Navigation Buttons -->
            <div class="mb-4 flex w-full flex-col gap-4 md:w-auto md:flex-row md:justify-end">
              <Button
                label="Export Certificate"
                class="dark:text-secondary-100 border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
                text
                @click="exportPdf(allCompensatoryData[0])"
              >
                <template #icon>
                  <i class="pi pi-file-pdf mr-2"></i>
                </template>
              </Button>
              <RouterLink :to="{ name: 'my-cocs/list' }" class="w-full md:w-auto">
                <Button
                  label="Show all COCs"
                  class="dark:text-secondary-100 w-full border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
                  text
                >
                  <template #icon>
                    <i class="pi pi-file-word mr-2"></i>
                  </template>
                </Button>
              </RouterLink>
            </div>
          </div>
          <!-- Header: visible only on md and up -->
          <div class="hidden grid-cols-6 gap-2 border-b-2 bg-surface-100 px-4 py-4 md:grid md:px-24">
            <div class="text-start text-sm font-semibold text-surface-500">Hours Earned / Beginning</div>
            <div class="text-start text-sm font-semibold text-surface-500">Date of CTO</div>
            <div class="text-start text-sm font-semibold text-surface-500">Used COCs</div>
            <div class="text-start text-sm font-semibold text-surface-500">Remaining COCs</div>
            <div class="text-start text-sm font-semibold text-surface-500">Validity</div>
            <div class="text-start text-sm font-semibold text-surface-500">Remarks</div>
          </div>

          <!-- Data row -->
          <div
            v-for="(row, index) in allCompensatoryData"
            :key="index"
            class="grid grid-cols-1 gap-y-2 border-surface-300 px-4 py-2 md:grid-cols-6 md:gap-2 md:px-24"
          >
            <!-- Mobile label + value -->
            <div>
              <p class="text-xs font-semibold text-surface-500 md:hidden">Hours Earned / Beginning</p>
              <p class="text-base text-surface-600">
                {{ fmtHoursMins(calcTotalDurationMins(row.rows ?? [])) }}
              </p>
            </div>
            <div>
              <p class="text-xs font-semibold text-surface-500 md:hidden">Date of CTO</p>
              <p class="text-base text-surface-600">
                {{ extractMonthYear(row.ctdo_period) }}
              </p>
            </div>
            <div>
              <p class="text-xs font-semibold text-surface-500 md:hidden">Used COCs</p>
              <p class="text-base text-surface-600">—</p>
            </div>
            <div>
              <p class="text-xs font-semibold text-surface-500 md:hidden">Remaining COCs</p>
              <p class="text-base text-surface-600">—</p>
            </div>
            <div>
              <p class="text-xs font-semibold text-surface-500 md:hidden">Validity</p>
              <p class="text-base text-surface-600">
                {{ extractMonthYearPlusOneYear(row.ctdo_period) }}
              </p>
            </div>
            <div>
              <p class="text-xs font-semibold text-surface-500 md:hidden">Remarks</p>
              <p class="text-base text-surface-600">—</p>
            </div>
          </div>

          <div v-if="!isLoading && !compensatoryTimeOffStore.compensatory.length" class="mx-auto flex h-full w-full flex-col">
            <Card class="w-full p-0 shadow-none">
              <template #content>
                <div class="flex flex-col items-center">
                  <div
                    class="my-6 flex w-full flex-col items-center justify-between gap-4 rounded-lg bg-surface-0 px-6 py-6 dark:bg-surface-800 md:my-4 md:flex-row md:px-4 md:py-4"
                  ></div>
                  <div class="flex justify-center">
                    <img src="@/assets/image/undraw_terms.svg" class="w-80 pt-24" />
                  </div>
                  <h2
                    class="mb-2 mt-4 flex w-full justify-center text-center text-xl font-semibold text-surface-800 dark:text-primary-100 sm:text-2xl"
                  >
                    You have no Compensatory Overtime Credits
                  </h2>
                  <h1 class="mb-4 text-center text-base text-surface-600 dark:text-surface-400 sm:text-lg">
                    Compensatory Overtime Credits created by PAS HR shall appear here.
                  </h1>
                  <div class="mt-4 flex w-full justify-center"></div>
                </div>
              </template>
            </Card>
          </div>
          <hr />
        </template>
      </Card>
    </div>
  </div>
</template>
