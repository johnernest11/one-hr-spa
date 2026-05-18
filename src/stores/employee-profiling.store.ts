import { ref, reactive, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  IndividualAddress,
  IndividualContactInfo,
  IndividualEducBg,
  IndividualEligibility,
  IndividualQuestion,
  IndividualWorkExperience,
  PersonnelEmployee,
  PersonnelResponse,
} from '@/typings/models.types.ts'
import { useApiCall } from '@/composables/network'
import { useAuthStore } from '@/stores/auth.store.ts'
import { ApiResponseBody } from '@/typings/http-resources.types'
import { formatDateFields, formatYear } from '@/utils/helpers.js'

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
    philhealth_no: string | null
    gsis_no: string | null
    pag_ibig_no: string | null
    sss_no: string | null
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

  individual_eligibility: IndividualEligibility[]
  individual_work_experience: IndividualWorkExperience[]
  individual_question: IndividualQuestion[]
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
      philhealth_no: individual?.philhealth_no ?? null,
      gsis_no: individual?.gsis_no ?? null,
      pag_ibig_no: individual?.pag_ibig_no ?? null,
      sss_no: individual?.sss_no ?? null,
      agency_employee_no: individual?.employee?.agency_employee_no ?? null,
      citizenship: individual?.citizenship ?? 'Filipino',
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

    employee: {
      id: employee?.id ?? 0,
      individual_basic_detail_id: null,
      id_number: null,
      item_id: employee?.item_id ?? null,
      salary_grade_id: employee?.salary_grade_id ?? null,
      salary_grade: employee?.salary_grade ?? null,
      position: null,
      parenthetical_position: null,
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

    individual_eligibility: Array.isArray(individual?.individual_eligibility)
      ? individual.individual_eligibility.map((elgi) => ({
        ...elgi,
        id: elgi.id ?? null,
        eligibility: elgi.eligibility ?? '',
        rating: elgi.rating ?? '',
        date_of_examination_conferment: elgi.date_of_examination_conferment ?? '',
        place_of_examination: elgi.place_of_examination ?? '',
        license_number: elgi.license_number ?? null,
        license_date_of_validity: elgi.license_date_of_validity ?? '',
        _delete: elgi._delete ?? null,
      }))
      : [
        {
          id: null,
          eligibility: '',
          rating: '',
          date_of_examination_conferment: '',
          place_of_examination: '',
          license_number: '',
          license_date_of_validity: '',
          _delete: null,
        },
      ],

    individual_educational_background: Array.isArray(individual?.individual_educational_background)
      ? individual.individual_educational_background.map((educ) => ({
        ...educ,
        id: educ.id ?? null,
        schools_name: educ.schools_name ?? '',
        education_description: educ.education_description ?? '',
        level: educ.level ?? '',
        period_of_attendance_from: educ.period_of_attendance_from ?? '',
        period_of_attendance_to: educ.period_of_attendance_to ?? null,
        highest_level_units_earned: educ.highest_level_units_earned ?? '',
        year_graduated: educ.year_graduated ?? null,
        scholarship_academic_honers_recieved: educ.scholarship_academic_honers_recieved ?? '',
        _delete: educ._delete ?? null,
      }))
      : [
        {
          id: null,
          schools_name: '',
          education_description: '',
          level: '',
          period_of_attendance_from: '',
          period_of_attendance_to: null,
          highest_level_units_earned: '',
          year_graduated: null,
          scholarship_academic_honers_recieved: '',
          _delete: null,
        },
      ],

    // Temporary Data banking of Employement Details
    // Date of Original Appointment - inclusive_date_from
    // Date of Last Promotion - position_title
    // Entry Date (First Day in Service) - inclusive_date_to
    individual_work_experience: individual?.individual_work_experience
      ? [
        {
          id: individual.individual_work_experience.id,
          is_current_work: individual.individual_work_experience.is_current_work ?? false,
          inclusive_date_from: individual.individual_work_experience.inclusive_date_from ?? '',
          inclusive_date_to: individual.individual_work_experience.inclusive_date_to ?? '',
          position_title: individual.individual_work_experience.position_title ?? '',
          department_agency_office_company: individual.individual_work_experience.department_agency_office_company ?? '',
          monthly_salary: individual.individual_work_experience.monthly_salary ?? '',
          salary_grade_id: individual.individual_work_experience.salary_grade_id ?? null,
          salary_grade: individual.individual_work_experience.salary_grade ?? null,
          custom_salary_grade: individual.individual_work_experience.custom_salary_grade ?? '',
          status_of_appointment: individual.individual_work_experience.status_of_appointment ?? null,
          is_gov_service: individual.individual_work_experience.is_gov_service ?? false,
          immediate_supervisor: individual.individual_work_experience.immediate_supervisor ?? null,
          office_unit: individual.individual_work_experience.office_unit ?? null,
          significant_accomplishments: individual.individual_work_experience.significant_accomplishments ?? null,
          summary_of_actual_duties: individual.individual_work_experience.summary_of_actual_duties ?? null,
          _delete: individual.individual_work_experience._delete ?? null,
        },
      ]
      : [
        {
          id: null,
          is_current_work: false,
          inclusive_date_from: '',
          inclusive_date_to: '',
          position_title: '',
          department_agency_office_company: '',
          monthly_salary: '',
          salary_grade_id: null,
          salary_grade: null,
          custom_salary_grade: '',
          status_of_appointment: null,
          is_gov_service: false,
          immediate_supervisor: '',
          office_unit: '',
          significant_accomplishments: '',
          summary_of_actual_duties: '',
          _delete: null,
        },
      ],

    // Temporary Data banking of Sectoral Affiliations
    //Solo Parent - q34_a
    // Senior Citizen - q35_a
    // Person with Disability - q36
    // Type of Disability - q36_details
    // Member of Indigenous Group - q37
    // Type of Indigenous Group - q37_details
    individual_question: individual?.individual_question
      ? [
        {
          id: individual.individual_question.id ?? null,
          q34_a: individual.individual_question.q34_a ?? false,
          q34_b: individual.individual_question.q34_b ?? false,
          q34_details: individual.individual_question.q34_details ?? null,
          q35_a: individual.individual_question.q35_a ?? false,
          q35_a_details: individual.individual_question.q35_a_details ?? null,
          q35_b: individual.individual_question.q35_b ?? false,
          q35_b_date_filed: individual.individual_question.q35_b_date_filed ?? null,
          q35_b_status: individual.individual_question.q35_b_status ?? null,
          q36: individual.individual_question.q36 ?? false,
          q36_details: individual.individual_question.q36_details ?? null,
          q37: individual.individual_question.q37 ?? false,
          q37_details: individual.individual_question.q37_details ?? null,
          q38_a: individual.individual_question.q38_a ?? false,
          q38_a_details: individual.individual_question.q38_a_details ?? null,
          q38_b: individual.individual_question.q38_b ?? false,
          q38_b_details: individual.individual_question.q38_b_details ?? null,
          q39: individual.individual_question.q39 ?? false,
          country_id: individual.individual_question.country_id ?? null,
          q40_a_indigenous_group: individual.individual_question.q40_a_indigenous_group ?? false,
          q40_a_details: individual.individual_question.q40_a_details ?? null,
          q40_b_pwd: individual.individual_question.q40_b_pwd ?? false,
          q40_b_details: individual.individual_question.q40_b_details ?? null,
          q40_c_solo_parent: individual.individual_question.q40_c_solo_parent ?? false,
          q40_c_details: individual.individual_question.q40_c_details ?? null,
        },
      ]
      : [
        {
          // DEFAULT OBJECT: This prevents the "property of undefined" error
          id: null,
          q34_a: false,
          q34_b: false,
          q34_details: null,
          q35_a: false,
          q35_a_details: null,
          q35_b: false,
          q35_b_date_filed: null,
          q35_b_status: null,
          q36: false,
          q36_details: null,
          q37: false,
          q37_details: null,
          q38_a: false,
          q38_a_details: null,
          q38_b: false,
          q38_b_details: null,
          q39: false,
          country_id: null,
          q40_a_indigenous_group: false,
          q40_a_details: null,
          q40_b_pwd: false,
          q40_b_details: null,
          q40_c_solo_parent: false,
          q40_c_details: null,
        },
      ],
  })

  const updateProfilingFromPersonnel = (personnel: PersonnelResponse | null) => {
    if (!personnel) return

    // === C1 -  Employee Info ===
    const employee = personnel.employee
    ProfilingInfo.employee.id = employee?.id ?? 0
    ProfilingInfo.employee.individual_basic_detail_id = employee?.individual_basic_detail_id ?? null
    ProfilingInfo.employee.id_number = employee?.id_number ?? null
    ProfilingInfo.employee.item_id = employee?.item_id ?? null
    ProfilingInfo.employee.position = null
    ProfilingInfo.employee.parenthetical_position = null
    ProfilingInfo.employee.agency_employee_no = employee?.agency_employee_no ?? null

    // === C1 -  Individual Information ===
    ProfilingInfo.individual.first_name = personnel.first_name ?? null
    ProfilingInfo.individual.last_name = personnel.last_name ?? null
    ProfilingInfo.individual.middle_name = personnel.middle_name ?? null
    ProfilingInfo.individual.ext_name = personnel.ext_name ?? null
    ProfilingInfo.individual.birthday = personnel.birthday ?? null
    ProfilingInfo.individual.sex = (personnel.sex as SexType) ?? null
    ProfilingInfo.individual.civil_status = (personnel.civil_status as CivilStatusType) ?? null
    ProfilingInfo.individual.philhealth_no = personnel.philhealth_no ?? null
    ProfilingInfo.individual.gsis_no = personnel.gsis_no ?? null
    ProfilingInfo.individual.pag_ibig_no = personnel.pag_ibig_no ?? null
    ProfilingInfo.individual.sss_no = personnel.sss_no ?? null
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

    // === C2 -  Individual Eligibility ===
    ProfilingInfo.individual_eligibility = Array.isArray(personnel.individual_eligibility)
      ? personnel.individual_eligibility.map((e) => ({
        id: e.id,
        eligibility: e.eligibility ?? '',
        rating: e.rating ?? '',
        date_of_examination_conferment: e.date_of_examination_conferment ?? '',
        place_of_examination: e.place_of_examination ?? '',
        license_number: e.license_number ?? null,
        license_date_of_validity: e.license_date_of_validity ?? '',
        _delete: e._delete ?? null,
      }))
      : []

    // === C2 - Individual Work Experience ===
    ProfilingInfo.individual_work_experience = personnel.individual_work_experience
      ? [
        {
          id: personnel.individual_work_experience.id,
          is_current_work: personnel.individual_work_experience.is_current_work ?? false,
          inclusive_date_from: personnel.individual_work_experience.inclusive_date_from ?? '',
          inclusive_date_to: personnel.individual_work_experience.inclusive_date_to ?? '',
          position_title: personnel.individual_work_experience.position_title ?? '',
          department_agency_office_company: personnel.individual_work_experience.department_agency_office_company ?? '',
          monthly_salary: personnel.individual_work_experience.monthly_salary ?? '',
          salary_grade_id: personnel.individual_work_experience.salary_grade_id ?? null,
          salary_grade: personnel.individual_work_experience.salary_grade ?? null,
          custom_salary_grade: personnel.individual_work_experience.custom_salary_grade ?? '',
          status_of_appointment: personnel.individual_work_experience.status_of_appointment ?? null,
          is_gov_service: personnel.individual_work_experience.is_gov_service ?? false,
          immediate_supervisor: personnel.individual_work_experience.immediate_supervisor ?? null,
          office_unit: personnel.individual_work_experience.office_unit ?? null,
          significant_accomplishments: personnel.individual_work_experience.significant_accomplishments ?? null,
          summary_of_actual_duties: personnel.individual_work_experience.summary_of_actual_duties ?? null,
          _delete: personnel.individual_work_experience._delete ?? null,
        },
      ]
      : []

    // === Individual Questions ===
    ProfilingInfo.individual_question = personnel.individual_question
      ? [
        {
          id: personnel.individual_question.id ?? null,
          q34_a: personnel.individual_question.q34_a ?? false,
          q34_b: personnel.individual_question.q34_b ?? false,
          q34_details: personnel.individual_question.q34_details ?? null,
          q35_a: personnel.individual_question.q35_a ?? false,
          q35_a_details: personnel.individual_question.q35_a_details ?? null,
          q35_b: personnel.individual_question.q35_b ?? false,
          q35_b_date_filed: personnel.individual_question.q35_b_date_filed ?? null,
          q35_b_status: personnel.individual_question.q35_b_status ?? null,
          q36: personnel.individual_question.q36 ?? false,
          q36_details: personnel.individual_question.q36_details ?? null,
          q37: personnel.individual_question.q37 ?? false,
          q37_details: personnel.individual_question.q37_details ?? null,
          q38_a: personnel.individual_question.q38_a ?? false,
          q38_a_details: personnel.individual_question.q38_a_details ?? null,
          q38_b: personnel.individual_question.q38_b ?? false,
          q38_b_details: personnel.individual_question.q38_b_details ?? null,
          q39: personnel.individual_question.q39 ?? false,
          country_id: personnel.individual_question.country_id ?? null,
          q40_a_indigenous_group: personnel.individual_question.q40_a_indigenous_group ?? false,
          q40_a_details: personnel.individual_question.q40_a_details ?? null,
          q40_b_pwd: personnel.individual_question.q40_b_pwd ?? false,
          q40_b_details: personnel.individual_question.q40_b_details ?? null,
          q40_c_solo_parent: personnel.individual_question.q40_c_solo_parent ?? false,
          q40_c_details: personnel.individual_question.q40_c_details ?? null,
        },
      ]
      : [
        {
          id: null,
          q34_a: false,
          q34_b: false,
          q34_details: null,
          q35_a: false,
          q35_a_details: null,
          q35_b: false,
          q35_b_date_filed: null,
          q35_b_status: null,
          q36: false,
          q36_details: null,
          q37: false,
          q37_details: null,
          q38_a: false,
          q38_a_details: null,
          q38_b: false,
          q38_b_details: null,
          q39: false,
          country_id: null,
          q40_a_indigenous_group: false,
          q40_a_details: null,
          q40_b_pwd: false,
          q40_b_details: null,
          q40_c_solo_parent: false,
          q40_c_details: null,
        },
      ]
  }

  const saveProfiling = async (payload: EmployeeProfilingPayload) => {
    const uri = '/individual-basic-details'

    // Format education dates to 'YYYY'
    payload.individual_educational_background.forEach((edu) => {
      edu.period_of_attendance_from = formatYear(edu.period_of_attendance_from)
      edu.period_of_attendance_to = formatYear(edu.period_of_attendance_to)
      edu.year_graduated = formatYear(edu.year_graduated)
    })
    formatDateFields(payload.individual_work_experience, ['inclusive_date_from', 'inclusive_date_to'])

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

    if (payload.individual_work_experience) {
      formatDateFields(payload.individual_work_experience, ['inclusive_date_from', 'inclusive_date_to', 'position_title'])
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
