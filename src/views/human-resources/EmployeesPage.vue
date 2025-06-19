<script setup lang="ts">
import { onBeforeMount, ref, computed, watchEffect } from 'vue'
import { TransitionRoot } from '@headlessui/vue'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import InputGroup from 'primevue/inputgroup'
import InputText from 'primevue/inputtext'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import QRCodeStyling from 'qr-code-styling'
import { useAuthStore } from '@/stores/auth.store.ts'
import { usePersonnelStore } from '@/stores/personnel.store'
import { sleep } from '@/utils/helpers'
import DSWDLogo from '@/assets/image/DSWD logo_Mark.png'
import type { PersonnelResponse } from '@/typings/models.types'
const personnelStore = usePersonnelStore()

const columnWidths = ['w-32', 'w-24', 'w-64', 'w-24', 'w-40', 'w-32', 'w-48']
const searchQuery = ref('')
const menu = ref()
const items = ref([
  {
    items: [
      {
        label: 'via Manual Input',
        mode: 'via-manual-input',
        to: 'create-personnel',
      },
      {
        label: 'via PDS Importation',
        mode: 'via-pds-importation',
        to: 'dashboard',
      },
    ],
  },
])

const sampleEmployees = ref([
  {
    id: 1,
    first_name: 'John',
    middle_name: 'D.',
    last_name: 'Doe',
    ext_name: null,
    employee: {
      item: {
        number: 'EMP-001',
        position: {
          title: 'Software Engineer',
        },
      },
    },
    individual_contact_info: {
      email_address: 'john.doe@example.com',
    },
  },
  {
    id: 2,
    first_name: 'Jane',
    middle_name: 'A.',
    last_name: 'Smith',
    ext_name: null,
    employee: {
      item: {
        number: 'EMP-002',
        position: {
          title: 'UI/UX Designer',
        },
      },
    },
    individual_contact_info: {
      email_address: 'jane.smith@example.com',
    },
  },
  {
    id: 3,
    first_name: 'Peter',
    middle_name: 'B.',
    last_name: 'Jones',
    ext_name: null,
    employee: {
      item: {
        number: 'EMP-003',
        position: {
          title: 'Project Manager',
        },
      },
    },
    individual_contact_info: {
      email_address: 'peter.jones@example.com',
    },
  },
  {
    id: 4,
    first_name: 'Alice',
    middle_name: null,
    last_name: 'Williams',
    ext_name: 'Jr.',
    employee: {
      item: {
        number: 'EMP-004',
        position: {
          title: 'Data Analyst',
        },
      },
    },
    individual_contact_info: {
      email_address: 'alice.williams@example.com',
    },
  },
  {
    id: 5,
    first_name: 'Robert',
    middle_name: 'E.',
    last_name: 'Brown',
    ext_name: null,
    employee: {
      item: {
        number: 'EMP-005',
        position: {
          title: 'HR Specialist',
        },
      },
    },
    individual_contact_info: {
      email_address: 'robert.brown@example.com',
    },
  },
])

onBeforeMount(async () => {
  await sleep(1)
  personnelStore.employees = sampleEmployees.value
  personnelStore.isEmployeesLoading = false
})

const authStore = useAuthStore()

const canCreateNewEmployee = computed(() => {
  return authStore.authHasRequiredRole(['hr_ppms_admin', 'admin', 'super_user'])
})

const toggleAddingList = (event: Event) => {
  menu.value.toggle(event)
}

const handleSearchEmployee = () => {
  console.log('Searching for:', searchQuery.value)
}

const showQrModal = ref(false)
const selectedEmployeeForQr = ref<PersonnelResponse | null>(null)
const qrContainerRef = ref<HTMLElement | null>(null)
let qrCode: QRCodeStyling | null = null

const openQrModal = (employee: PersonnelResponse) => {
  selectedEmployeeForQr.value = employee
  showQrModal.value = true
}

const closeQrModal = () => {
  showQrModal.value = false
  selectedEmployeeForQr.value = null

  if (qrContainerRef.value) {
    qrContainerRef.value.innerHTML = ''
  }
  qrCode = null
}

const qrCodeData = computed(() => {
  if (selectedEmployeeForQr.value) {
    const employeeId = selectedEmployeeForQr.value.employee.item.number
    return btoa(employeeId)
  }
  return ''
})

watchEffect(() => {
  if (showQrModal.value && qrContainerRef.value && qrCodeData.value) {
    if (!qrCode) {
      qrCode = new QRCodeStyling({
        width: 250,
        height: 250,
        type: 'canvas',
        data: qrCodeData.value,
        image: DSWDLogo,
        dotsOptions: {
          color: '#000000',
          type: 'extra-rounded',
        },
        backgroundOptions: {
          color: '#FFFFFF',
        },
        imageOptions: {
          crossOrigin: 'anonymous',
          margin: 5,
        },
        qrOptions: {
          errorCorrectionLevel: 'H',
        },
        cornersSquareOptions: {
          type: 'extra-rounded',
          color: '#000000',
        },
        cornersDotOptions: {
          type: 'extra-rounded',
          color: '#000000',
        },
      })
      qrCode.append(qrContainerRef.value)
    } else {
      qrCode.update({
        data: qrCodeData.value,
        image: DSWDLogo,
        dotsOptions: {
          type: 'extra-rounded',
        },
        cornersSquareOptions: {
          type: 'extra-rounded',
          color: '#000000',
        },
        cornersDotOptions: {
          type: 'extra- rounded',
          color: '#000000',
        },
      })
    }
  }
})

const downloadQrCode = async () => {
  if (qrCode && selectedEmployeeForQr.value) {
    await qrCode.download({
      name: `${selectedEmployeeForQr.value.first_name}-${selectedEmployeeForQr.value.last_name}-QR`,
      extension: 'png',
    })
  }
}
</script>

<template>
  <div class="mx-auto flex h-full w-full flex-col">
    <div
      :class="[
        'h-full w-full rounded-md bg-surface-0 ',
        personnelStore.isEmployeesLoading ? '' : 'flex flex-col p-6',
        personnelStore.employees.length === 0 ? 'justify-center' : '',
      ]"
    >
      <template v-if="!personnelStore.isEmployeesLoading">
        <template v-if="personnelStore.employees.length === 0">
          <TransitionRoot
            appear
            :show="true"
            enter="transition-all ease-in-out duration-500 delay-[250ms]"
            enterFrom="opacity-0 translate-y-6"
            enterTo="opacity-100 translate-y-0"
            leave="transition-all ease-in-out duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div class="flex h-full flex-col items-center justify-center p-4 text-center lg:p-0">
              <div class="flex h-full flex-col items-center justify-center">
                <img src="@/assets/image/no-employees.svg" class="h-56 w-auto" />
                <h1 class="text-xl font-bold text-surface-600 lg:text-2xl">No Employees</h1>
                <p class="text-md text-surface-600 lg:text-lg">List of employees shall appear here.</p>

                <div v-if="canCreateNewEmployee" class="mt-4">
                  <Button size="large" outlined severity="info" class="rounded-sm" @click="toggleAddingList">
                    <template #icon>
                      <FontAwesomeIcon icon="fa-solid fa-plus" class="mr-1.5 h-4 w-4" />
                      <span class="lg:text-md text-sm">New Employee</span>
                    </template>
                  </Button>
                  <Menu ref="menu" id="overlay_menu" :model="items" :popup="true">
                    <template #item="{ item }">
                      <RouterLink :to="{ name: item.to, query: { mode: item.mode } }">
                        <span class="ml-2">{{ item.label }}</span>
                      </RouterLink>
                    </template>
                  </Menu>
                </div>
              </div>
            </div>
          </TransitionRoot>
        </template>
        <template v-else>
          <TransitionRoot
            appear
            :show="true"
            enter="transition-all ease-in-out duration-500 delay-[250ms]"
            enterFrom="opacity-0 translate-y-6"
            enterTo="opacity-100 translate-y-0"
            leave="transition-all ease-in-out duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div>
              <div
                class="flex flex-row items-center space-x-4 font-medium text-primary-700 dark:text-primary-100 md:ml-4 md:mt-2 md:flex-row"
              >
                <FontAwesomeIcon :icon="['fas', 'users']" class="text-2xl md:text-4xl" />
                <span class="flex flex-col justify-center">
                  <p class="text-xl md:text-3xl">Employees</p>
                </span>

                <div class="flex w-full items-center justify-end gap-4">
                  <div class="flex space-x-2 whitespace-nowrap md:w-auto">
                    <Button
                      icon="pi pi-filter-fill"
                      v-tooltip.top="'Filter Item'"
                      severity="info"
                      size="large"
                      class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100"
                      text
                    />
                    <Button
                      icon="pi pi-plus"
                      v-tooltip.top="'New Employee'"
                      severity="info"
                      size="large"
                      class="border border-primary-400 text-lg font-semibold text-primary-400 dark:text-primary-100"
                      text
                      @click="toggleAddingList"
                    />
                    <Menu ref="menu" id="overlay_menu" :model="items" :popup="true">
                      <template #item="{ item }">
                        <RouterLink :to="{ name: item.to, query: { mode: item.mode } }">
                          <span class="ml-2">{{ item.label }}</span>
                        </RouterLink>
                      </template>
                    </Menu>
                  </div>
                  <div class="flex w-full md:w-auto lg:w-1/2">
                    <InputGroup v-model="searchQuery" class="w-full">
                      <InputText
                        v-model="searchQuery"
                        placeholder="Search Item Number"
                        class="w-full"
                        :disabled="personnelStore.isEmployeesLoading"
                        @keyup.enter="handleSearchEmployee"
                      />
                      <Button icon="pi pi-search" @click="handleSearchEmployee" />
                    </InputGroup>
                  </div>
                </div>
              </div>
              <DataTable :value="personnelStore.employees" stripedRows class="mt-24" dataKey="id">
                <Column headerClass="w-64 bg-surface-100 border-surface-300 opacity-70 font-bold py-2">
                  <template #header>
                    <div>
                      Name <br />
                      Item Number
                    </div>
                  </template>
                  <template #body="props">
                    <p class="font-semibold uppercase text-surface-500">
                      {{ props.data.first_name }} {{ props.data.middle_name ?? null }} {{ props.data.last_name }}
                      {{ props.data.ext_name ?? null }}
                    </p>
                    <p class="font-semibold uppercase text-surface-500">
                      {{ props.data.employee.item.number }}
                    </p>
                  </template>
                </Column>
                <Column
                  field="employee.item.position.title"
                  header="Position / Designation"
                  headerClass=" w-80 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
                >
                </Column>
                <Column
                  field="individual_contact_info.email_address"
                  header="Email Address"
                  headerClass="w-64 bg-surface-100 border-surface-300 opacity-70 font-bold py-2"
                ></Column>
                <Column field="action" header="Actions" headerClass="w-64 bg-surface-100 opacity-70 font-bold py-2">
                  <template #body="props">
                    <div class="flex gap-4 whitespace-nowrap md:w-auto">
                      <Button
                        icon="pi pi-eye"
                        v-tooltip.top="'View Employee'"
                        severity="info"
                        class="border-none text-lg font-semibold text-primary-600 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
                        text
                      />
                      <Button
                        icon="pi pi-qrcode"
                        v-tooltip.top="'Generate QR Code'"
                        severity="info"
                        class="border-none text-lg font-semibold text-primary-600 dark:text-primary-100 sm:text-primary-400 md:text-primary-500 lg:text-primary-500 dark:lg:text-primary-500"
                        text
                        @click="openQrModal(props.data)"
                      />
                    </div>
                  </template>
                </Column>
              </DataTable>
            </div>
          </TransitionRoot>
        </template>
      </template>
      <template v-else>
        <div class="w-full">
          <div class="overflow-auto">
            <div role="table" class="animate-pulse">
              <table class="w-full">
                <thead class="bg-surface-0">
                  <tr class="border-[1px] border-surface-300">
                    <td v-for="(width, index) in columnWidths" :key="'header-' + index">
                      <div class="mx-4 mt-4 h-2.5 rounded-full bg-surface-300" :class="width + ' mb-4'"></div>
                    </td>
                  </tr>
                </thead>
                <tbody class="bg-surface-100">
                  <tr v-for="row in 15" :key="'row-' + row" class="border-[1px] border-t-0 border-surface-300">
                    <td v-for="(width, index) in columnWidths" :key="'row-' + row + '-col-' + index">
                      <div class="mx-4 mt-4 h-2.5 rounded-full bg-surface-300" :class="width + ' mb-4'"></div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>

  <Dialog
    v-model:visible="showQrModal"
    modal
    :draggable="false"
    :dismissableMask="true"
    :closable="false"
    class="w-[90vw] max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
    :pt="{
      mask: {
        style: 'backdrop-filter: blur(4px)',
      },
    }"
  >
    <template #container="{}">
      <div class="rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-xl font-semibold text-gray-500 dark:text-white">
            <font-awesome-icon :icon="['fas', 'qrcode']" /> QR CODE Generation
          </h2>
          <button @click="closeQrModal" class="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-500">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div v-if="selectedEmployeeForQr" class="text-left">
          <div class="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div class="text-center md:w-1/2 md:text-left">
              <p class="text-lg font-bold uppercase text-gray-500 dark:text-white">
                {{ selectedEmployeeForQr.last_name }}, {{ selectedEmployeeForQr.first_name }}
                {{ selectedEmployeeForQr.middle_name ? selectedEmployeeForQr.middle_name + ' ' : '' }}
                {{ selectedEmployeeForQr.ext_name ? selectedEmployeeForQr.ext_name : '' }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-300">
                {{ selectedEmployeeForQr.employee.item.position.title }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-300">
                {{ selectedEmployeeForQr.employee.item.number }}
              </p>
            </div>
            <div class="font-semibold md:w-1/2">
              <Button
                @click="downloadQrCode"
                severity="info"
                type="button"
                size="large"
                class="dark:text-secondary-100 bottom-0 right-0 mt-4 w-full border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
                text
              >
                <font-awesome-icon :icon="['fas', 'download']" class="mr-2" /> Download QR Code
              </Button>
            </div>
          </div>

          <div ref="qrContainerRef" class="my-6 flex justify-center"></div>
        </div>
      </div>
    </template>
  </Dialog>
</template>
