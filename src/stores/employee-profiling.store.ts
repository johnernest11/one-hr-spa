import { ref, reactive, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  IndividualAddress,
  IndividualContactInfo,
  IndividualEducBg,
  PersonnelEmployee,
  PersonnelResponse,
} from '@/typings/models.types.ts'
import { useApiCall } from '@/composables/network'
import { useAuthStore } from '@/stores/auth.store.ts'
import { ApiResponseBody } from '@/typings/http-resources.types'
import { formatYear } from '@/utils/helpers.js'

import { useRoute } from 'vue-router'
import { CivilStatusType, SexType } from '@/typings/employee-entry.types'

/** Typings */
export type UploadProfilePictureResponse = { owner_id: string | number; path: string; url: string }

export type EmployeeProfilingPayload = {
  /**Personal Identification */
  individual: {
    first_name: string | null
    last_name: string | null
    middle_name?: string | null
    ext_name?: string | null
    birthday: string | null
    sex: 'male' | 'female' | null
    civil_status: 'Single' | 'Married' | 'Widowed' | 'Divorced' | 'Separated' | null
    tin: string | null
    agency_employee_no: string | null
    citizenship: string | null
    citizenship_acquisition: string | null
    country_id: number | null
  }
  /**Contact Information */
  contact_info: IndividualContactInfo
  individual_contact_info: IndividualContactInfo[]
  /**Address Information */
  individual_address: IndividualAddress[]
  individual_address_init: {
    /**Personnel Data Sheet Address */
    id: number | null
    residential_house_block_lot_no: string | null
    residential_street: string | null
    residential_subdivision_village: string | null
    residential_brgy_id: string | number | null
    residential_citymun_id: string | number | null
    residential_province_id: string | number | null
    residential_region_id: string | number | null
    residential_zip_code: string | null
    permanent_house_block_lot_no: string | null
    permanent_street: string | null
    permanent_subdivision_village: string | null
    permanent_brgy_id: string | number | null
    permanent_citymun_id: string | number | null
    permanent_province_id: string | number | null
    permanent_region_id: string | number | null
    permanent_zip_code: string | null
  }
  /**Educational Information */
  individual_educational_background: IndividualEducBg[]
  educations: {
    elementary: IndividualEducBg
    high_school: IndividualEducBg
    vocational: IndividualEducBg
    college: IndividualEducBg
    graduate: IndividualEducBg
  }
  employee: PersonnelEmployee
}

export const useProfilingStore = defineStore('profiling', () => {
  /** States */
  const authStore = useAuthStore()
  const profilingMode = ref('')
  const selectedProfile = ref<PersonnelResponse | null>(null)
  const personnelProfile = ref<PersonnelResponse[]>([])
  const route = useRoute()
  const isMyProfile = computed(() => route.path.startsWith('/my-employee-profile'))
  const individual = isMyProfile.value ? authStore.authenticatedUser?.user_profile?.individual_basic_detail : null
  const employee = individual?.employee
  const contactInfo = individual?.individual_contact_info
  const individual_address = individual?.individual_address

  const educations = (individual?.individual_educational_background ?? []) as IndividualEducBg[]
  const elementary = educations.find((e) => e.level === 'Elementary')
  const highSchool = educations.find((e) => e.level === 'Secondary')
  const college = educations.find((e) => e.level === 'College')
  const vocational = educations.find((e) => e.level === 'Vocational')
  const graduate = educations.find((e) => e.level === 'Graduate')
  const getEducationByLevel = (level: string) => educations.find((e) => e.level === level) ?? null

  const ProfilingInfo = reactive<EmployeeProfilingPayload>({
    individual: {
      first_name: individual?.first_name ?? null,
      last_name: individual?.last_name ?? null,
      middle_name: individual?.middle_name ?? null,
      ext_name: individual?.ext_name ?? null,
      birthday: individual?.birthday ?? null,
      sex: (individual?.sex as SexType) ?? null,
      civil_status: (individual?.civil_status as CivilStatusType) ?? null,
      tin: individual?.tin ?? null,
      agency_employee_no: individual?.employee?.agency_employee_no ?? null,
      citizenship: individual?.citizenship ?? null,
      citizenship_acquisition: individual?.citizenship_acquisition ?? null,
      country_id: individual?.country_id ?? null,
    },

    contact_info: {
      id: contactInfo?.id ?? null,
      tel_no: contactInfo?.tel_no ?? null,
      mobile_no: contactInfo?.mobile_no ?? null,
      email_address: contactInfo?.email_address ?? null,
    },
    individual_contact_info: [],
    individual_address: [],
    individual_address_init: {
      /**Personnel Data Sheet Address */
      id: individual_address?.id ?? null,
      residential_house_block_lot_no: individual_address?.residential_house_block_lot_no ?? null,
      residential_street: individual_address?.residential_street ?? null,
      residential_subdivision_village: individual_address?.residential_subdivision_village ?? null,
      residential_brgy_id: individual_address?.residential_brgy_id ?? null,
      residential_citymun_id: individual_address?.residential_citymun_id ?? null,
      residential_province_id: individual_address?.residential_province_id ?? null,
      residential_region_id: individual_address?.residential_region_id ?? null,
      residential_zip_code: individual_address?.residential_zip_code ?? null,
      permanent_house_block_lot_no: individual_address?.permanent_house_block_lot_no ?? null,
      permanent_street: individual_address?.permanent_street ?? null,
      permanent_subdivision_village: individual_address?.permanent_subdivision_village ?? null,
      permanent_brgy_id: individual_address?.permanent_brgy_id ?? null,
      permanent_citymun_id: individual_address?.permanent_citymun_id ?? null,
      permanent_province_id: individual_address?.permanent_province_id ?? null,
      permanent_region_id: individual_address?.permanent_region_id ?? null,
      permanent_zip_code: individual_address?.permanent_zip_code ?? null,
    },
    educations: {
      elementary: {
        id: getEducationByLevel('Elementary')?.id ?? null,
        level: 'Elementary',
        schools_name: getEducationByLevel('Elementary')?.schools_name ?? null,
        education_description: getEducationByLevel('Elementary')?.education_description ?? null,
        period_of_attendance_from: getEducationByLevel('Elementary')?.period_of_attendance_from ?? null,
        period_of_attendance_to: getEducationByLevel('Elementary')?.period_of_attendance_to ?? null,
        highest_level_units_earned: getEducationByLevel('Elementary')?.highest_level_units_earned ?? null,
        year_graduated: getEducationByLevel('Elementary')?.year_graduated ?? null,
        is_current_enrolled: getEducationByLevel('Elementary')?.is_current_enrolled ?? false,
        scholarship_academic_honors_received: getEducationByLevel('Elementary')?.scholarship_academic_honors_received ?? null,
      },
      high_school: {
        id: getEducationByLevel('Secondary')?.id ?? null,
        level: 'Secondary',
        schools_name: getEducationByLevel('Secondary')?.schools_name ?? null,
        education_description: getEducationByLevel('Secondary')?.education_description ?? null,
        period_of_attendance_from: getEducationByLevel('Secondary')?.period_of_attendance_from ?? null,
        period_of_attendance_to: getEducationByLevel('Secondary')?.period_of_attendance_to ?? null,
        highest_level_units_earned: getEducationByLevel('Secondary')?.highest_level_units_earned ?? null,
        year_graduated: getEducationByLevel('Secondary')?.year_graduated ?? null,
        is_current_enrolled: getEducationByLevel('Secondary')?.is_current_enrolled ?? false,
        scholarship_academic_honors_received: getEducationByLevel('Secondary')?.scholarship_academic_honors_received ?? null,
      },
      vocational: {
        id: getEducationByLevel('Vocational')?.id ?? null,
        level: 'Vocational',
        schools_name: getEducationByLevel('Vocational')?.schools_name ?? null,
        education_description: getEducationByLevel('Vocational')?.education_description ?? null,
        period_of_attendance_from: getEducationByLevel('Vocational')?.period_of_attendance_from ?? null,
        period_of_attendance_to: getEducationByLevel('Vocational')?.period_of_attendance_to ?? null,
        highest_level_units_earned: getEducationByLevel('Vocational')?.highest_level_units_earned ?? null,
        year_graduated: getEducationByLevel('Vocational')?.year_graduated ?? null,
        is_current_enrolled: getEducationByLevel('Vocational')?.is_current_enrolled ?? false,
        scholarship_academic_honors_received: getEducationByLevel('Vocational')?.scholarship_academic_honors_received ?? null,
      },
      college: {
        id: getEducationByLevel('College')?.id ?? null,
        level: 'College',
        schools_name: getEducationByLevel('College')?.schools_name ?? null,
        education_description: getEducationByLevel('College')?.education_description ?? null,
        period_of_attendance_from: getEducationByLevel('College')?.period_of_attendance_from ?? null,
        period_of_attendance_to: getEducationByLevel('College')?.period_of_attendance_to ?? null,
        highest_level_units_earned: getEducationByLevel('College')?.highest_level_units_earned ?? null,
        year_graduated: getEducationByLevel('College')?.year_graduated ?? null,
        is_current_enrolled: getEducationByLevel('College')?.is_current_enrolled ?? false,
        scholarship_academic_honors_received: getEducationByLevel('College')?.scholarship_academic_honors_received ?? null,
      },
      graduate: {
        id: getEducationByLevel('Graduate')?.id ?? null,
        level: 'Graduate',
        schools_name: getEducationByLevel('Graduate')?.schools_name ?? null,
        education_description: getEducationByLevel('Graduate')?.education_description ?? null,
        period_of_attendance_from: getEducationByLevel('Graduate')?.period_of_attendance_from ?? null,
        period_of_attendance_to: getEducationByLevel('Graduate')?.period_of_attendance_to ?? null,
        highest_level_units_earned: getEducationByLevel('Graduate')?.highest_level_units_earned ?? null,
        year_graduated: getEducationByLevel('Graduate')?.year_graduated ?? null,
        is_current_enrolled: getEducationByLevel('Graduate')?.is_current_enrolled ?? false,
        scholarship_academic_honors_received: getEducationByLevel('Graduate')?.scholarship_academic_honors_received ?? null,
      },
    },
    individual_educational_background: [],

    employee: {
      id: employee?.id ?? 0,
      individual_basic_detail_id: null,
      id_number: null,
      item_id: employee?.item_id ?? null,
      salary_grade_id: employee?.salary_grade_id ?? null,
      position: null,
      fund_source: {
        id: null,
        name: null,
      },
      agency_employee_no: employee?.agency_employee_no ?? null,
      office_id: employee?.office_id ?? null,
      office: employee?.office ?? null,
      division_id: employee?.division_id ?? null,
      division: employee?.division ?? null,
      section_or_unit_id: employee?.section_or_unit_id ?? null,
      section_or_unit: employee?.section_or_unit ?? null,
      item: null,
    },
  })

  const updateProfilingFromPersonnel = (personnel: PersonnelResponse | null) => {
    if (!personnel) return

    // === C1 -  Employee Info ===
    const employee = personnel.employee
    ProfilingInfo.employee.id = employee?.id ?? 0
    ProfilingInfo.employee.individual_basic_detail_id = employee?.individual_basic_detail_id ?? null
    ProfilingInfo.employee.id_number = employee?.id_number ?? null
    ProfilingInfo.employee.agency_employee_no = employee?.agency_employee_no ?? null

    // === C1 -  Individual Information ===
    ProfilingInfo.individual.first_name = personnel.first_name ?? null
    ProfilingInfo.individual.last_name = personnel.last_name ?? null
    ProfilingInfo.individual.middle_name = personnel.middle_name ?? null
    ProfilingInfo.individual.ext_name = personnel.ext_name ?? null
    ProfilingInfo.individual.birthday = personnel.birthday ?? null
    ProfilingInfo.individual.sex = (personnel.sex as SexType) ?? null
    ProfilingInfo.individual.civil_status = (personnel.civil_status as CivilStatusType) ?? null
    ProfilingInfo.individual.tin = personnel.tin ?? null
    ProfilingInfo.individual.agency_employee_no = personnel.employee?.agency_employee_no ?? null
    ProfilingInfo.individual.citizenship = personnel.citizenship ?? null
    ProfilingInfo.individual.citizenship_acquisition = personnel.citizenship_acquisition ?? null
    ProfilingInfo.individual.country_id = personnel.country_id ?? null

    // === C1 -  Contact Info ===
    const contactInfo = personnel.individual_contact_info
    ProfilingInfo.contact_info.id = contactInfo?.id ?? null
    ProfilingInfo.contact_info.mobile_no = contactInfo?.mobile_no ?? null
    ProfilingInfo.contact_info.email_address = contactInfo?.email_address ?? null

    // === C1 - Individual Address Init ===
    const address = personnel.individual_address
    ProfilingInfo.individual_address_init.id = address?.id ?? null
    ProfilingInfo.individual_address_init.residential_house_block_lot_no = address?.residential_house_block_lot_no ?? null
    ProfilingInfo.individual_address_init.residential_street = address?.residential_street ?? null
    ProfilingInfo.individual_address_init.residential_subdivision_village = address?.residential_subdivision_village ?? null
    ProfilingInfo.individual_address_init.residential_brgy_id = address?.residential_brgy_id ?? null
    ProfilingInfo.individual_address_init.residential_citymun_id = address?.residential_citymun_id ?? null
    ProfilingInfo.individual_address_init.residential_province_id = address?.residential_province_id ?? null
    ProfilingInfo.individual_address_init.residential_region_id = address?.residential_region_id ?? null
    ProfilingInfo.individual_address_init.residential_zip_code = address?.residential_zip_code ?? null

    ProfilingInfo.individual_address_init.permanent_house_block_lot_no = address?.permanent_house_block_lot_no ?? null
    ProfilingInfo.individual_address_init.permanent_street = address?.permanent_street ?? null
    ProfilingInfo.individual_address_init.permanent_subdivision_village = address?.permanent_subdivision_village ?? null
    ProfilingInfo.individual_address_init.permanent_brgy_id = address?.permanent_brgy_id ?? null
    ProfilingInfo.individual_address_init.permanent_citymun_id = address?.permanent_citymun_id ?? null
    ProfilingInfo.individual_address_init.permanent_province_id = address?.permanent_province_id ?? null
    ProfilingInfo.individual_address_init.permanent_region_id = address?.permanent_region_id ?? null
    ProfilingInfo.individual_address_init.permanent_zip_code = address?.permanent_zip_code ?? null

    // === C1 - Individual Education Background ===
    ProfilingInfo.educations = {
      elementary: {
        id: elementary?.id ?? null,
        level: 'Elementary',
        schools_name: elementary?.schools_name ?? null,
        education_description: elementary?.education_description ?? null,
        period_of_attendance_from: elementary?.period_of_attendance_from ?? null,
        period_of_attendance_to: elementary?.period_of_attendance_to ?? null,
        highest_level_units_earned: elementary?.highest_level_units_earned ?? null,
        year_graduated: elementary?.year_graduated ?? null,
        is_current_enrolled: elementary?.is_current_enrolled ?? false,
        scholarship_academic_honors_received: elementary?.scholarship_academic_honors_received ?? null,
      },
      high_school: {
        id: highSchool?.id ?? null,
        level: 'Secondary',
        schools_name: highSchool?.schools_name ?? null,
        education_description: highSchool?.education_description ?? null,
        period_of_attendance_from: highSchool?.period_of_attendance_from ?? null,
        period_of_attendance_to: highSchool?.period_of_attendance_to ?? null,
        highest_level_units_earned: highSchool?.highest_level_units_earned ?? null,
        year_graduated: highSchool?.year_graduated ?? null,
        is_current_enrolled: highSchool?.is_current_enrolled ?? false,
        scholarship_academic_honors_received: highSchool?.scholarship_academic_honors_received ?? null,
      },
      college: {
        id: college?.id ?? null,
        level: 'College',
        schools_name: college?.schools_name ?? null,
        education_description: college?.education_description ?? null,
        period_of_attendance_from: college?.period_of_attendance_from ?? null,
        period_of_attendance_to: college?.period_of_attendance_to ?? null,
        highest_level_units_earned: college?.highest_level_units_earned ?? null,
        year_graduated: college?.year_graduated ?? null,
        is_current_enrolled: college?.is_current_enrolled ?? false,
        scholarship_academic_honors_received: college?.scholarship_academic_honors_received ?? null,
      },
      vocational: {
        id: vocational?.id ?? null,
        level: 'Vocational',
        schools_name: vocational?.schools_name ?? null,
        education_description: vocational?.education_description ?? null,
        period_of_attendance_from: vocational?.period_of_attendance_from ?? null,
        period_of_attendance_to: vocational?.period_of_attendance_to ?? null,
        highest_level_units_earned: vocational?.highest_level_units_earned ?? null,
        year_graduated: vocational?.year_graduated ?? null,
        is_current_enrolled: vocational?.is_current_enrolled ?? false,
        scholarship_academic_honors_received: vocational?.scholarship_academic_honors_received ?? null,
      },
      graduate: {
        id: graduate?.id ?? null,
        level: 'Graduate',
        schools_name: graduate?.schools_name ?? null,
        education_description: graduate?.education_description ?? null,
        period_of_attendance_from: graduate?.period_of_attendance_from ?? null,
        period_of_attendance_to: graduate?.period_of_attendance_to ?? null,
        highest_level_units_earned: graduate?.highest_level_units_earned ?? null,
        year_graduated: graduate?.year_graduated ?? null,
        is_current_enrolled: graduate?.is_current_enrolled ?? false,
        scholarship_academic_honors_received: graduate?.scholarship_academic_honors_received ?? null,
      },
    }
  }

  const saveProfiling = async (payload: EmployeeProfilingPayload) => {
    const uri = '/individual-basic-details'

    // Format education dates to 'YYYY'
    payload.individual_educational_background.forEach((edu) => {
      edu.period_of_attendance_from = formatYear(edu.period_of_attendance_from)
      edu.period_of_attendance_to = formatYear(edu.period_of_attendance_to)
      edu.year_graduated = formatYear(edu.year_graduated)
    })

    const { data } = await useApiCall(uri, authStore.authenticationToken).post(payload).json()
    return data.value as ApiResponseBody
  }

  const fetchProfiling = async (id: number) => {
    const uri = `/individual-basic-details/${id}`

    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    return responseBody
  }

  const fetchProfilingById = async (id: string | number) => {
    const url = `/individual-basic-details/${id}`

    const { data } = await useApiCall(url, authStore.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    if (responseBody.success) {
      selectedProfile.value = responseBody.data as PersonnelResponse
    }

    return responseBody
  }

  const updateProfiling = async (
    payload: Partial<EmployeeProfilingPayload>,
    id: string | number,
    formType: 'C1' | 'C2' | 'C3' | 'C4'
  ) => {
    // Format education dates to 'YYYY'
    if (payload.individual_educational_background) {
      payload.individual_educational_background.forEach((edu) => {
        edu.period_of_attendance_from = formatYear(edu.period_of_attendance_from)
        edu.period_of_attendance_to = formatYear(edu.period_of_attendance_to)
        edu.year_graduated = formatYear(edu.year_graduated)
      })
    }

    const { data } = await useApiCall(`/individual-basic-details/${id}`, authStore.authenticationToken)
      .put({ ...payload, form_type: formType })
      .json()

    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const index = personnelProfile.value.findIndex((personnelProfile) => personnelProfile?.id === id)
      if (index !== -1) {
        personnelProfile.value[index] = responseBody.data as PersonnelResponse
      }
    }

    return responseBody
  }

  return {
    ProfilingInfo,
    updateProfilingFromPersonnel,
    saveProfiling,
    isMyProfile,
    profilingMode,
    fetchProfiling,
    updateProfiling,
    fetchProfilingById,
  }
})
