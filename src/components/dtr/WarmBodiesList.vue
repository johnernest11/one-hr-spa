<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { TransitionRoot } from '@headlessui/vue'
import Paginator from 'primevue/paginator'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

// Use PrimeVue's PageState type for the @page event
type PageState = {
  page: number // Current page number (0-indexed)
  first: number // Index of the first record on the current page
  rows: number // Number of rows per page
  pageCount?: number // Total number of pages (optional)
}

const employees = ref([
  { id: '012431', name: 'Reyes, Ranvil Mae C', division: 'Policy and Plans Division', section: 'RICTMS', time_in_out: '8:15 AM' },
  {
    id: '015421',
    name: 'Catungal, John Ernest C.',
    division: 'Policy and Plans Division',
    section: 'ICTMS',
    time_in_out: '7:55 AM',
  },
  {
    id: '012431',
    name: 'Quinzon, Marianne Cyra Jun E.',
    division: 'Policy and Plans Division',
    section: 'RICTMS',
    time_in_out: '7:48 AM',
  },
  {
    id: '015431',
    name: 'Seguritan, Marianne Yvonne C.',
    division: 'Policy and Plans Division',
    section: 'RICTMS',
    time_in_out: '7:48 AM',
  },
  { id: '012431', name: 'Fernandez, Prelux C.', division: 'Policy and Plans Division', section: 'ICTMS', time_in_out: '7:45 AM' },
  {
    id: '012431',
    name: 'Ascaño, Mclen Werniel C.',
    division: 'Policy and Plans Division',
    section: 'ICTMS',
    time_in_out: '7:35 AM',
  },
  { id: '012431', name: 'Ayson, Kevin C.', division: 'Policy and Plans Division', section: 'RICTMS', time_in_out: '7:21 AM' },
  { id: '012431', name: 'Dato, Rommel C.', division: 'Policy and Plans Division', section: 'RICTMS', time_in_out: '7:19 AM' },
])

const employeeSearchQuery = ref('')
const currentDate = ref('')

const selectedDivision = ref('')
const selectedSection = ref('')
const selectedDate = ref('')
const selectedTimeInOut = ref('')

const employeeCurrentPage = ref(1)
const employeeItemsPerPage = ref(10)

const localPagination = ref({
  totalRecords: 0,
})

function updateDateTime(): void {
  const now = new Date()
  const optionsDate: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Manila',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }

  currentDate.value = now.toLocaleDateString('en-PH', optionsDate)
}

const filteredAndSortedEmployeeData = computed(() => {
  const query = employeeSearchQuery.value.trim().toLowerCase()
  let data = employees.value

  if (query) {
    data = data.filter(
      (emp) =>
        emp.name.toLowerCase().includes(query) ||
        emp.id.toLowerCase().includes(query) ||
        emp.division.toLowerCase().includes(query) ||
        emp.section.toLowerCase().includes(query)
    )
  }
  return data
})

const paginatedEmployeeData = computed(() => {
  const data = filteredAndSortedEmployeeData.value
  const startIndex = (employeeCurrentPage.value - 1) * employeeItemsPerPage.value
  const endIndex = startIndex + employeeItemsPerPage.value
  return data.slice(startIndex, endIndex)
})

const selectedSubTabIndex = ref(0)

watch(
  employees,
  (newEmployees) => {
    if (newEmployees.length === 0) {
      selectedSubTabIndex.value = 1
    } else {
      selectedSubTabIndex.value = 0
    }
  },
  { immediate: true }
)

watch(
  () => filteredAndSortedEmployeeData.value.length,
  (newLength) => {
    localPagination.value.totalRecords = newLength
  },
  { immediate: true }
)

const handleEmployeePaginationChange = (event: PageState): void => {
  employeeCurrentPage.value = event.page + 1
  employeeItemsPerPage.value = event.rows
}

watch([selectedDivision, selectedSection, selectedDate, selectedTimeInOut, employeeSearchQuery], () => {
  employeeCurrentPage.value = 1
})

let dateTimeInterval: ReturnType<typeof setInterval>

onMounted(() => {
  updateDateTime()
  dateTimeInterval = setInterval(updateDateTime, 1000)
})

onUnmounted(() => {
  clearInterval(dateTimeInterval)
})
</script>

<template>
  <div class="m-8">
    <div class="mb-4 flex flex-row items-center font-medium text-gray-500">
      <font-awesome-icon :icon="['fas', 'users-rectangle']" class="mr-2 text-2xl" />
      <span class="flex flex-col justify-center text-gray-500">
        <p class="text-xl font-semibold text-gray-500 md:text-2xl">Warm Bodies</p>
        <p class="text-sm text-gray-500">{{ currentDate }}</p>
      </span>
    </div>
    <TransitionRoot
      appear
      :show="true"
      enter="transition-all ease-in-out duration-500"
      enterFrom="opacity-0 translate-y-6"
      enterTo="opacity-100 translate-y-0"
      leave="transition-all ease-in-out duration-800"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <!-- Content for "View Records" tab -->
      <div v-if="localPagination.totalRecords > 0 || employeeSearchQuery">
        <!-- Updated Search Input and Button -->
        <div class="mb-6 flex flex-grow rounded-md shadow-sm">
          <input
            type="text"
            v-model="employeeSearchQuery"
            placeholder="Search employee by name, ID, or division..."
            class="flex-grow rounded-l-md border border-gray-300 p-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
          <button
            class="rounded-r-md bg-blue-500 p-2 text-white transition-colors duration-200 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-blue-700 dark:hover:bg-blue-800"
          >
            <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path
                fill-rule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clip-rule="evenodd"
              ></path>
            </svg>
          </button>
        </div>

        <div class="overflow-x-auto rounded-lg shadow">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Employee<br />ID Number
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Division
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Section
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Time-in/Time-out
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              <tr v-for="employee in paginatedEmployeeData" :key="employee.id">
                <td class="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                  {{ employee.name }}<br />{{ employee.id }}
                </td>
                <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{{ employee.division }}</td>
                <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{{ employee.section }}</td>
                <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{{ employee.time_in_out }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination component -->
        <div class="mt-6 flex w-full justify-center md:mt-10">
          <Paginator
            v-if="localPagination.totalRecords > 0"
            :rows="employeeItemsPerPage"
            :total-records="localPagination.totalRecords"
            :first="(employeeCurrentPage - 1) * employeeItemsPerPage"
            template="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
            @page="handleEmployeePaginationChange"
            class="text-s md:text-sm"
            :pt="{ pageButton: {} }"
          />
        </div>
      </div>
      <!-- If no employees AND no search query, show the 'No records to display' message -->
      <div v-else class="p-8 text-center text-gray-500">
        <p>No records to display. Please try the 'Upload/Empty' tab to import data.</p>
      </div>
    </TransitionRoot>
  </div>
</template>
