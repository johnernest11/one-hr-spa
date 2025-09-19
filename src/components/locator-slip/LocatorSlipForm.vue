<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { helpers, maxLength, required } from '@vuelidate/validators'
import useVuelidate from '@vuelidate/core'
import { useRoute } from 'vue-router'
import Button from 'primevue/button'
import RadioButton from 'primevue/radiobutton'
import Card from 'primevue/card'
import { useLocatorSlipStore, LocatorSlipPayload } from '@/stores/locator-slip.store'
import { formatDate } from '@/utils/helpers.ts'
import WbInputText from '@/components/webkit/WbInputText.vue'

const locatorSlipStore = useLocatorSlipStore()
const route = useRoute()

const addLoggerBtn = ref(true)
const isLoading = ref(true)
const formIsSubmitting = ref(false)

onMounted(async () => {
  const id = route.params.id as string
  if (id) {
    const response = await locatorSlipStore.fetchLocatorSlipById(id)
    if (response && response.success) {
      const locatorSlipData = response.data
      updatePayloadFromResponse(locatorSlipData as LocatorSlipPayload)
    }
  }

  isLoading.value = false
})

const payload = reactive<LocatorSlipPayload>({
  form_type: '',
  month: null,
  period: null,
  ls_logger: [
    {
      locator_slip_id: null,
      date: null,
      time_in: null,
      time_out: null,
      destination: '',
      purpose: '',
      approve_for: null,
      duration: null,
      remarks: '',
    },
  ],
})

const updatePayloadFromResponse = (locatorSlip: LocatorSlipPayload | null) => {
  ;(payload.form_type = locatorSlip?.form_type ?? ''),
  (payload.month = locatorSlip?.month ?? null),
  (payload.period = locatorSlip?.period ?? null),
  (payload.ls_logger = locatorSlip?.ls_logger ?? [])
}

/** Validation */
const globalStringMaxLength = import.meta.env.VITE_GLOBAL_STRING_MAX_LENGTH
const globalStringMaxLengthRule = helpers.withMessage(
  `Must not exceed ${globalStringMaxLength} characters`,
  maxLength(globalStringMaxLength)
)
const formRules = {
  $lazy: true,
  ls_logger: {
    $each: helpers.forEach({
      destination: {
        required: helpers.withMessage('Destination is required', required),
        maxLength: helpers.withMessage('', globalStringMaxLengthRule),
      },
      purpose: {
        required: helpers.withMessage('Purpose is required', required),
        maxLength: helpers.withMessage('', globalStringMaxLengthRule),
      },
      remarks: {
        maxLength: helpers.withMessage('', globalStringMaxLengthRule),
      },
    }),
  },
}

/** Handle Form Submission */
const validator = useVuelidate<LocatorSlipPayload>(formRules, payload)

/* -------------------------------------------------------------------------- */
/*                             Button Interactions                            */
/* -------------------------------------------------------------------------- */

const buttonLabel = computed(() => {
  return route.params.id ? 'Update' : 'Save'
})

const isButtonVisible = computed(() => true)
const handleButtonClick = async () => {
  formIsSubmitting.value = true

  if (route.params.id) {
    await updateButtonSubmission()
  } else {
    await saveButtonSubmission()
  }

  formIsSubmitting.value = false
}

/** Function to add a new ls logger */
const addLogger = () => {
  const dateNow = new Date()
  const id = Number(route.params.id)

  const defaultLog = {
    locator_slip_id: id ?? null,
    date: dateNow.toString(),
    time_in: null,
    time_out: null,
    destination: '',
    purpose: '',
    approve_for: null,
    duration: null,
    remarks: '',
  }

  const newLSLog = { ...defaultLog }
  payload.ls_logger.push(newLSLog)
}

/** Function to remove ls loggers */
const removeLoggers = (index: number) => {
  if (index >= 0 && index < payload.ls_logger.length) {
    payload.ls_logger.splice(index, 1)
  }
}

/** Form Submission */
const saveButtonSubmission = async () => {
  //@todo Add integration here...
}

/** Handle Updates */
const updateButtonSubmission = async () => {
  //@todo Add integration here...
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
          <h2 class="mb-2 ml-4 pb-6 text-3xl font-semibold text-primary-800 dark:text-primary-100 md:ml-4">
            <font-awesome-icon :icon="['fas', 'location-dot']" class="h-5 text-primary-700 sm:h-6 md:h-7" />
            Locator Slip Logger
          </h2>
        </div>

        <!-- Content for Locator Slip Logger-->
        <div class="p-4">
          <h2 class="mb-4 ml-4 text-2xl italic text-primary-700 dark:text-primary-700 md:ml-4">
            Locator Slip Form {{ payload.form_type.toUpperCase() }}
            <br />
          </h2>
          <!-- Header: visible only on md and up -->
          <div class="grid-rows-2">
            <div class="hidden grid-cols-10 items-center gap-2 bg-surface-100 px-4 py-1 text-center md:grid md:px-10">
              <div class="row-span-2 flex items-center justify-center text-sm font-semibold text-surface-500">Date</div>
              <div class="row-span-2 flex items-center justify-center text-sm font-semibold text-surface-500">Time Out</div>
              <div class="row-span-2 flex items-center justify-center text-sm font-semibold text-surface-500">Time In</div>
              <div class="row-span-2 flex items-center justify-center text-sm font-semibold text-surface-500">Destination</div>
              <div class="row-span-2 flex items-center justify-center text-sm font-semibold text-surface-500">Purpose</div>
              <div class="col-span-2 text-sm font-semibold text-surface-500">
                Approved For
                <div class="text-xs font-normal text-surface-400">To be check by Division Chief concerned / Section Head</div>
              </div>
              <div class="text-sm font-semibold text-surface-500">
                No. of Hrs/Mins on Personal Time
                <div class="text-xs font-normal text-surface-400">(to be accomplished by PAS)</div>
              </div>
              <div class="col-span-2 row-span-2 flex items-center justify-center text-sm font-semibold text-surface-500">
                Remarks
              </div>
            </div>
            <div class="hidden grid-cols-10 gap-2 border-b-2 bg-surface-100 px-4 py-1 text-center md:grid md:px-10">
              <div class="col-span-5"></div>
              <div class="text-sm font-semibold text-surface-500">Official Time</div>
              <div class="text-sm font-semibold text-surface-500">Personal Time</div>
              <div class="col-span-3"></div>
            </div>
          </div>

          <!-- Data row -->
          <div
            v-for="(row, index) in payload.ls_logger"
            :key="index"
            class="grid grid-cols-10 items-center justify-items-center gap-2 border-b border-surface-300 px-4 py-2 text-center"
          >
            <div>
              <p class="text-xs font-semibold text-surface-500 md:hidden">Date</p>
              <p class="text-base text-surface-600">{{ formatDate(row.date) }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold text-surface-500 md:hidden">Time Out</p>
              <p class="text-base text-surface-600">
                {{ row.time_out }}
              </p>
            </div>
            <div>
              <p class="text-xs font-semibold text-surface-500 md:hidden">Time In</p>
              <p class="text-base text-surface-600">
                {{ row.time_in }}
              </p>
            </div>
            <div>
              <p class="text-xs font-semibold text-surface-500 md:hidden">Destination</p>
              <p class="text-base text-surface-600">
                <WbInputText
                  v-model="row.destination"
                  label=""
                  label-class="text-sm text-surface-600"
                  placeholder="e.g. Robinsons, San Fernando, La Union"
                  class="w-full"
                  :invalidText="validator.ls_logger?.[index]?.destination?.$errors[0]?.$message"
                  :invalid="validator.ls_logger?.[index]?.destination?.$error"
                  @blur="validator.ls_logger?.[index]?.destination?.$touch()"
                />
              </p>
            </div>
            <div>
              <p class="text-xs font-semibold text-surface-500 md:hidden">Purpose</p>
              <WbInputText
                v-model="row.purpose"
                label=""
                label-class="text-sm text-surface-600"
                placeholder="e.g. Wellness Activity"
                class="w-full"
                :invalidText="validator.ls_logger?.[index]?.purpose?.$errors[0]?.$message"
                :invalid="validator.ls_logger?.[index]?.purpose?.$error"
                @blur="validator.ls_logger?.[index]?.purpose?.$touch()"
              />
              <p class="text-base text-surface-600"></p>
            </div>
            <div class="flex items-center">
              <p class="text-xs font-semibold text-surface-500 md:hidden">Official Time</p>
              <RadioButton
                v-model="row.approve_for"
                name="official"
                inputId="official"
                value="official"
                class="scale-150 transform"
              />
            </div>
            <div class="flex items-center">
              <p class="text-xs font-semibold text-surface-500 md:hidden">Personal Time</p>
              <RadioButton
                v-model="row.approve_for"
                name="personal"
                inputId="personal"
                value="personal"
                class="scale-150 transform"
              />
            </div>
            <div>
              <p class="text-xs font-semibold text-surface-500 md:hidden">No. of Hours</p>
              <p class="text-base text-surface-600">
                {{ row.duration }}
              </p>
            </div>

            <div class="col-span-2 flex w-full">
              <div class="w-3/4">
                <p class="text-xs font-semibold text-surface-500 md:hidden">Remarks</p>
                <p class="text-base text-surface-600">
                  <WbInputText
                    v-model="row.remarks"
                    label=""
                    label-class="text-sm text-surface-600"
                    placeholder="e.g. Wellness Activity"
                    :invalidText="validator.ls_logger?.[index]?.remarks?.$errors[0]?.$message"
                    :invalid="validator.ls_logger?.[index]?.remarks?.$error"
                    @blur="validator.ls_logger?.[index]?.remarks?.$touch()"
                  />
                </p>
              </div>
              <div class="flex w-1/4 items-center justify-end">
                <p class="text-xs font-semibold text-surface-500 md:hidden">Actions</p>
                <Button icon="pi pi-trash" severity="danger" rounded @click="removeLoggers(index)" v-if="!row.id" />
              </div>
            </div>
          </div>
        </div>
        <div class="flex w-full flex-col gap-4 p-4">
          <Button
            v-if="addLoggerBtn"
            label="+ Request New Logger"
            @click="addLogger"
            class="dark:text-secondary-100 border border-primary-500 text-sm text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
            text
          />
        </div>

        <br />

        <!-- Save/Update Buttons -->
        <div class="mt-2 flex justify-end gap-2">
          <Button
            label="Cancel"
            class="dark:text-secondary-100 border border-surface-400 text-base text-surface-500 dark:border-surface-700 lg:text-surface-500 dark:lg:text-surface-400"
            text
            @click="$router.go(-1)"
          >
            <template #icon>
              <i class="pi pi-ban mr-2"></i>
            </template>
          </Button>
          <Button
            v-if="isButtonVisible"
            :label="buttonLabel"
            @click="handleButtonClick"
            :loading="formIsSubmitting"
            :disabled="formIsSubmitting"
            size="large"
            class="dark:text-secondary-100 border border-primary-500 text-base text-primary-600 dark:border-surface-700 lg:text-primary-400 dark:lg:text-surface-400"
            text
          >
            <template #icon>
              <i class="pi pi-save mr-2"></i>
            </template>
          </Button>
        </div>
      </template>
    </Card>
  </div>
</template>
