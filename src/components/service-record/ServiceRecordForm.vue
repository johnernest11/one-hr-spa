<script setup lang="ts">
import { reactive, computed } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { usePdsStore, PersonalDataSheetPayload } from '@/stores/pds.store.ts'
import Button from 'primevue/button'
import Card from 'primevue/card'
import { formatPeso } from '@/utils/helpers'

const pdsStore = usePdsStore()
/** Payload */
const payload = reactive<PersonalDataSheetPayload>({
  ...pdsStore.pdsInfo,
})

/** Filtered Work Experience for Service Record */
const filteredWorkExperience = computed(() =>
  payload.individual_work_experience
    .filter((work) => work.status_of_appointment === 'Permanent' || work.status_of_appointment === 'Contractual')
    .sort((b, a) => {
      return new Date(a.inclusive_date_from ?? '').getTime() - new Date(b.inclusive_date_to ?? '').getTime()
    })
)

/** Helper function to format date as M/D/YY */
const formatDate = (dateStr: string | Date | null) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '-'

  const month = (date.getMonth() + 1).toString().padStart(2, '0') // pad month
  const day = date.getDate().toString().padStart(2, '0') // pad day
  const year = (date.getFullYear() % 100).toString().padStart(2, '0') // last 2 digits

  return `${month}/${day}/${year}`
}
</script>
<template>
  <div class="flex h-full w-full flex-col shadow-md">
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
          <h2 class="mb-2 ml-4 text-3xl text-primary-700 dark:text-primary-100 md:ml-4">
            <font-awesome-icon :icon="['fas', 'file']" class="h-5 text-surface-600 sm:h-6 md:h-7" />
            My Service Record
            <br />
            <span class="ml-10 text-lg text-primary-700 md:text-xl lg:text-2xl">
              As of
              {{ new Date().toLocaleString(undefined, { month: 'long', year: 'numeric' }) }}
            </span>
          </h2>
        </div>

        <div v-if="filteredWorkExperience.length > 0" class="p-4">
          <!-- Header: visible only on md and up -->
          <div class="hidden grid-cols-10 gap-2 border-b-2 bg-surface-100 px-4 py-4 md:grid md:px-24">
            <div class="col-span-2 mr-24 text-center text-sm font-semibold text-surface-500">SERVICE</div>
            <div class="col-span-3 mr-24 text-center text-sm font-semibold text-surface-500">RECORD OF APPOINTMENT</div>
            <div class="col-span-3 text-center text-sm font-semibold text-surface-500">OFFICE ENTITY/DIVISION</div>
            <div class="col-span-2 mr-12 text-right text-sm font-semibold text-surface-500">SEPARATION</div>
          </div>
          <div class="hidden grid-cols-11 gap-2 border-b-2 bg-surface-100 px-4 py-4 md:grid md:px-24">
            <div class="text-start text-xs font-semibold text-surface-500">From</div>
            <div class="text-start text-xs font-semibold text-surface-500">To</div>
            <div class="text-start text-xs font-semibold text-surface-500">DESIGNATION</div>
            <div class="text-start text-xs font-semibold text-surface-500">STATUS</div>
            <div class="text-start text-xs font-semibold text-surface-500">SALARY PER ANNUM</div>
            <div class="col-span-2 text-end text-xs font-semibold text-surface-500">PLACE OF ASSIGNMENT</div>
            <div class="text-end text-xs font-semibold text-surface-500">BRANCH</div>
            <div class="text-end text-xs font-semibold text-surface-500">LEAVE OF ABSENCE W/O PAY</div>
            <div class="text-end text-xs font-semibold text-surface-500">DATE</div>
            <div class="text-end text-xs font-semibold text-surface-500">CAUSE</div>
          </div>

          <!-- Data row -->
          <!-- Data Rows -->
          <div
            v-for="(work, index) in filteredWorkExperience"
            :key="index"
            class="grid grid-cols-1 gap-y-2 border-b border-surface-300 px-4 py-1 md:grid-cols-11 md:gap-2 md:px-24"
          >
            <!-- From -->
            <div>
              <p class="text-xs font-semibold text-surface-500 md:hidden">From</p>
              <p class="text-sm text-surface-600">{{ formatDate(work.inclusive_date_from) }}</p>
            </div>

            <!-- To -->
            <div>
              <p class="text-xs font-semibold text-surface-500 md:hidden">To</p>
              <p class="text-sm text-surface-600">
                {{ work.is_current_work ? 'PRESENT' : formatDate(work.inclusive_date_to) }}
              </p>
            </div>

            <!-- Designation -->
            <div>
              <p class="text-xs font-semibold text-surface-500 md:hidden">Designation</p>
              <p class="text-sm text-surface-600">{{ work.position_title || '-' }}</p>
            </div>

            <!-- Status -->
            <div>
              <p class="text-xs font-semibold text-surface-500 md:hidden">Status</p>
              <p class="text-sm text-surface-600">{{ work.status_of_appointment || '-' }}</p>
            </div>

            <!-- Salary Per Annum -->
            <div>
              <p class="text-xs font-semibold text-surface-500 md:hidden">Salary Per Annum</p>
              <p class="text-sm text-surface-600">
                {{ work.monthly_salary ? formatPeso(Number(work.monthly_salary) * 12) : '-' }}
              </p>
            </div>

            <!-- Place of Assignment (col-span-2) -->
            <div class="col-span-2 text-center">
              <p class="text-xs font-semibold text-surface-500 md:hidden">Place of Assignment</p>
              <p class="text-sm text-surface-600">{{ work.department_agency_office_company || '-' }}</p>
            </div>

            <!-- Branch -->
            <div class="text-end">
              <p class="text-xs font-semibold text-surface-500 md:hidden">Branch</p>
              <p class="text-sm text-surface-600">{{ '-' }}</p>
            </div>

            <!-- Leave of Absence W/O Pay -->
            <div class="text-end">
              <p class="text-xs font-semibold text-surface-500 md:hidden">Leave of Absence W/O Pay</p>
              <p class="text-sm text-surface-600">{{ '-' }}</p>
            </div>

            <!-- Date -->
            <div class="text-end">
              <p class="text-xs font-semibold text-surface-500 md:hidden">Date</p>
              <p class="text-sm text-surface-600">{{ '-' }}</p>
            </div>

            <!-- Cause -->
            <div class="text-end">
              <p class="text-xs font-semibold text-surface-500 md:hidden">Cause</p>
              <p class="text-sm text-surface-600">{{ '-' }}</p>
            </div>
          </div>
        </div>

        <br />

        <div v-if="!filteredWorkExperience.length" class="mx-auto flex h-full w-full flex-col">
          <Card class="w-full p-0 shadow-none">
            <template #content>
              <div class="flex flex-col items-center text-center">
                <!-- Title -->
                <h2 class="mb-2 text-2xl font-bold text-surface-800 dark:text-primary-100">Certificate of Employment</h2>

                <!-- Subtitle / Description -->
                <p class="mb-4 text-base text-surface-600 dark:text-surface-400">
                  This is to certify that <span class="font-semibold">NAME OF EMPLOYEE</span> is employed with us, but currently
                  does not hold a Permanent or Contractual status.
                </p>

                <!-- Optional Issued Date -->
                <p class="mb-8 text-sm text-surface-500 dark:text-surface-400">
                  Issued on: {{ new Date().toLocaleDateString() }}
                </p>

                <!-- Signature Section -->
                <div class="mt-8 flex w-full justify-between px-96">
                  <div class="flex flex-col items-center">
                    <div class="w-40 border-t-2 border-surface-400"></div>
                    <p class="text-sm text-surface-600 dark:text-surface-400">Authorized Signature</p>
                  </div>
                  <div class="flex flex-col items-center">
                    <div class="w-40 border-t-2 border-surface-400"></div>
                    <p class="text-sm text-surface-600 dark:text-surface-400">HR Department</p>
                  </div>
                </div>
              </div>
            </template>
          </Card>
        </div>
      </template>
    </Card>
  </div>
</template>
