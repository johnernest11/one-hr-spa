<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { LeaveCreditsResponse } from '@/typings/models.types.ts'
import { useLeaveCreditsStore } from '@/stores/leave-credits.store.ts'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/vue'
import { summarizeLeaveDates } from '@/utils/helpers'
import Button from 'primevue/button'
import Card from 'primevue/card'

const leaveCreditsStore = useLeaveCreditsStore()
const isLoading = ref(true)
const allLeaveCreditsData = ref<LeaveCreditsResponse[]>([])

onMounted(async () => {
  const response = await leaveCreditsStore.fetchLeaveCredits()
  if (response && response.success && Array.isArray(response.data)) {
    allLeaveCreditsData.value = response.data
  }
  isLoading.value = false
})

const leaveTabs = ref([
  { name: 'Vacation Leave', index: 0 },
  { name: 'Sick Leave', index: 1 },
])

const formattedVacationLeaveCredits = computed(() =>
  allLeaveCreditsData.value
    .filter((row) => row.type === 'Vacation Leave')
    .map((row) => ({
      ...row,
      summarizedDates: summarizeLeaveDates(
        (row.leave_credits_dates || [])
          .filter((date) => date && typeof date.start_date === 'string' && typeof date.end_date === 'string')
          .map((date) => ({
            start_date: date.start_date as string,
            end_date: date.end_date as string,
          }))
      ),
    }))
)

const formattedSickLeaveCredits = computed(() =>
  allLeaveCreditsData.value
    .filter((row) => row.type === 'Sick Leave')
    .map((row) => ({
      ...row,
      summarizedDates: summarizeLeaveDates(
        (row.leave_credits_dates || [])
          .filter((date) => date && typeof date.start_date === 'string' && typeof date.end_date === 'string')
          .map((date) => ({
            start_date: date.start_date as string,
            end_date: date.end_date as string,
          }))
      ),
    }))
)
</script>
<template>
  <div class="flex h-full w-full flex-col shadow-md">
    <Card class="h-full">
      <template #content>
        <TabGroup>
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
              <font-awesome-icon :icon="['fas', 'chalkboard']" class="h-5 text-surface-600 sm:h-6 md:h-7" />
              My Leave Credits
              <br />
              <span class="ml-10 text-lg text-surface-600 md:text-xl lg:text-2xl">
                Earned as of
                {{ new Date().toLocaleString(undefined, { month: 'long', year: 'numeric' }) }}
              </span>
            </h2>
          </div>
          <TabList class="mb-4 flex border-b border-gray-300">
            <Tab v-for="tab in leaveTabs" :key="tab.index" as="template" :index="tab.index" v-slot="{ selected }">
              <button
                :class="[
                  'w-full px-4 py-2 text-sm font-medium transition duration-300',
                  selected ? 'border-b-2 border-primary-600 text-primary-600' : 'text-surface-600 hover:bg-gray-100',
                ]"
              >
                {{ tab.name }}
              </button>
            </Tab>
          </TabList>

          <TabPanels>
            <!-- Vacation Leave Panel -->
            <TabPanel>
              <!-- Content for Vacation Leave -->
              <div class="p-4">
                <h2 class="mb-4 ml-4 text-2xl italic text-primary-700 dark:text-primary-600 md:ml-4">
                  Vacation Leave
                  <br />
                </h2>
                <!-- Header: visible only on md and up -->
                <div class="hidden grid-cols-9 gap-2 border-b-2 bg-surface-100 px-4 py-4 md:grid md:px-24">
                  <div class="text-start text-sm font-semibold text-surface-500">Date</div>
                  <div class="text-start text-sm font-semibold text-surface-500">Particular</div>
                  <div class="text-start text-sm font-semibold text-surface-500">
                    Under time with pay
                    <div class="text-xs font-normal text-surface-400">Day · Hour · Minute</div>
                  </div>
                  <div class="text-start text-sm font-semibold text-surface-500">
                    Under time
                    <div class="text-xs font-normal text-surface-400">Day · Hour · Minute</div>
                  </div>
                  <div class="text-start text-sm font-semibold text-surface-500">Absence/Under time with pay</div>
                  <div class="text-start text-sm font-semibold text-surface-500">Earned</div>
                  <div class="text-start text-sm font-semibold text-surface-500">Balance</div>
                  <div class="text-start text-sm font-semibold text-surface-500">Absence/Under time without pay</div>
                  <div class="text-start text-sm font-semibold text-surface-500">
                    LWOP equivalent
                    <div class="text-xs font-normal text-surface-400">Salary · ACA/PERA</div>
                  </div>
                </div>

                <!-- Data row -->
                <div
                  v-for="(row, index) in formattedVacationLeaveCredits"
                  :key="index"
                  class="grid grid-cols-1 gap-y-2 border-b border-surface-300 px-4 py-1 md:grid-cols-9 md:gap-2 md:px-24"
                >
                  <!-- Mobile label + value -->
                  <div>
                    <p class="text-xs font-semibold text-surface-500 md:hidden">Date</p>
                    <p class="text-base text-surface-600">{{ row.summarizedDates }}</p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-surface-500 md:hidden">Particular</p>
                    <p class="text-base text-surface-600">
                      {{ row.particular }}
                    </p>
                  </div>

                  <div>
                    <p class="text-xs font-semibold text-surface-500 md:hidden">Under time with pay</p>
                    <p class="text-base text-surface-600">
                      {{ row.ut_w_pay_day }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-surface-500 md:hidden">Under time</p>
                    <p class="text-base text-surface-600">
                      {{ row.ut_w_pay_day }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-surface-500 md:hidden">Absence/Under time with pay</p>
                    <p class="text-base text-surface-600">
                      {{ row.ut_w_pay }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-surface-500 md:hidden">Earned</p>
                    <p class="text-base text-surface-600">
                      {{ row.earned }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-surface-500 md:hidden">Balance</p>
                    <p class="text-base text-surface-600">
                      {{ row.balance }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-surface-500 md:hidden">Absence/Under time without pay</p>
                    <p class="text-base text-surface-600">
                      {{ row.ut_wo_pay }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-surface-500 md:hidden">LWOP equivalent</p>
                    <p class="text-base text-surface-600">{{ row.salary }} / {{ row.aca_pera }}</p>
                  </div>
                </div>
              </div>
            </TabPanel>

            <!-- Sick Leave Panel -->
            <TabPanel>
              <!-- Content for Sick Leave -->
              <div class="p-4">
                <h2 class="mb-4 ml-4 text-2xl italic text-primary-700 dark:text-primary-600 md:ml-4">
                  Sick Leave
                  <br />
                </h2>
                <!-- Header: visible only on md and up -->
                <div class="hidden grid-cols-9 gap-2 border-b-2 bg-surface-100 px-4 py-4 md:grid md:px-24">
                  <div class="text-start text-sm font-semibold text-surface-500">Date</div>
                  <div class="text-start text-sm font-semibold text-surface-500">Particular</div>
                  <div class="text-start text-sm font-semibold text-surface-500">
                    Under time with pay
                    <div class="text-xs font-normal text-surface-400">Day · Hour · Minute</div>
                  </div>
                  <div class="text-start text-sm font-semibold text-surface-500">
                    Under time
                    <div class="text-xs font-normal text-surface-400">Day · Hour · Minute</div>
                  </div>
                  <div class="text-start text-sm font-semibold text-surface-500">Absence/Under time with pay</div>
                  <div class="text-start text-sm font-semibold text-surface-500">Earned</div>
                  <div class="text-start text-sm font-semibold text-surface-500">Balance</div>
                  <div class="text-start text-sm font-semibold text-surface-500">Absence/Under time without pay</div>
                  <div class="text-start text-sm font-semibold text-surface-500">
                    LWOP equivalent
                    <div class="text-xs font-normal text-surface-400">Salary · ACA/PERA</div>
                  </div>
                </div>

                <!-- Data row -->
                <div
                  v-for="(row, index) in formattedSickLeaveCredits"
                  :key="index"
                  class="grid grid-cols-1 gap-y-2 border-b border-surface-300 px-4 py-1 md:grid-cols-9 md:gap-2 md:px-24"
                >
                  <!-- Mobile label + value -->
                  <div>
                    <p class="text-xs font-semibold text-surface-500 md:hidden">Date</p>
                    <p class="text-base text-surface-600">{{ row.summarizedDates }}</p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-surface-500 md:hidden">Particular</p>
                    <p class="text-base text-surface-600">
                      {{ row.particular }}
                    </p>
                  </div>

                  <div>
                    <p class="text-xs font-semibold text-surface-500 md:hidden">Under time with pay</p>
                    <p class="text-base text-surface-600">
                      {{ row.ut_w_pay_day }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-surface-500 md:hidden">Under time</p>
                    <p class="text-base text-surface-600">
                      {{ row.ut_w_pay_day }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-surface-500 md:hidden">Absence/Under time with pay</p>
                    <p class="text-base text-surface-600">
                      {{ row.ut_w_pay }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-surface-500 md:hidden">Earned</p>
                    <p class="text-base text-surface-600">
                      {{ row.earned }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-surface-500 md:hidden">Balance</p>
                    <p class="text-base text-surface-600">
                      {{ row.balance }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-surface-500 md:hidden">Absence/Under time without pay</p>
                    <p class="text-base text-surface-600">
                      {{ row.ut_wo_pay }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-surface-500 md:hidden">LWOP equivalent</p>
                    <p class="text-base text-surface-600">{{ row.salary }} / {{ row.aca_pera }}</p>
                  </div>
                </div>
              </div>
            </TabPanel>
          </TabPanels>
        </TabGroup>

        <br />

        <div v-if="!isLoading && !leaveCreditsStore.leaveCredits.length" class="mx-auto flex h-full w-full flex-col">
          <Card class="w-full p-0 shadow-none">
            <template #content>
              <div class="flex flex-col items-center">
                <div
                  class="my-6 flex w-full flex-col items-center justify-between gap-4 rounded-lg bg-surface-0 px-6 py-6 dark:bg-surface-800 md:my-4 md:flex-row md:px-4 md:py-4"
                ></div>
                <div class="flex justify-center">
                  <img src="@/assets/image/undraw_filing-system.svg" class="w-96 pt-36" />
                </div>
                <h2
                  class="mb-2 mt-4 flex w-full justify-center text-center text-xl font-semibold text-surface-800 dark:text-primary-100 sm:text-2xl"
                >
                  You have no Leave Credits
                </h2>
                <h1 class="mb-4 text-center text-base text-surface-600 dark:text-surface-400 sm:text-lg">
                  Leave Credits created by PAS HR shall appear here
                </h1>
                <div class="mt-4 flex w-full justify-center"></div>
              </div>
            </template>
          </Card>
        </div>
      </template>
    </Card>
  </div>
</template>
