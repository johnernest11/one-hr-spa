import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  IndividualAddress,
  IndividualContactInfo,
  IndividualEducBg,
  IndividualEligibility,
  IndividualFamily,
  IndividualGovernmentIssue,
  IndividualLearningDevelopment,
  IndividualMembership,
  IndividualQuestion,
  IndividualRecognition,
  IndividualReference,
  IndividualSkills,
  IndividualVoluntaryWork,
  IndividualWorkExperience,
  PersonnelEmployee,
} from '@/typings/models.types.ts'
import { useApiCall } from '@/composables/network'
import { useAuthStore } from '@/stores/auth.store.ts'
import { ApiResponseBody } from '@/typings/http-resources.types'
import { formatDateFields, formatYear } from '@/utils/helpers.js'

/** Typings */
export type UploadProfilePictureResponse = { owner_id: string | number; path: string; url: string }

export type PersonalDataSheetPayload = {
  /** PDS-C1 */
  individual: {
    first_name: string | null
    last_name: string | null
    middle_name?: string | null
    ext_name?: string | null
    birthday: string | null
    sex: 'male' | 'female' | null
    /**Personnel Data Sheet  */
    place_of_birth: string | null
    civil_status: 'single' | 'married' | 'separated' | 'divorced' | 'widowed' | null
    height: number | null
    weight: number | null
    blood_type: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | '0+' | '0-' | null
    philhealth_no: string | null
    gsis_no: string | null
    pag_ibig_no: string | null
    sss_no: string | null
    tin: string | null
    agency_employee_no: string | null
    citizenship: string | null
    citizenship_country: string | null
    citizenship_acquisition: string | null
  }
  contact_info: IndividualContactInfo
  individual_contact_info: IndividualContactInfo[]
  individual_address: IndividualAddress[]
  individual_address_init: {
    /**Personnel Data Sheet Address */
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
  individual_family: IndividualFamily[] | null
  individual_family_spouse: IndividualFamily
  individual_family_father: IndividualFamily
  individual_family_mothers_maiden: IndividualFamily
  individual_family_children: IndividualFamily[]
  /** PDS-C2 */
  individual_eligibility: IndividualEligibility[]
  individual_work_experience: IndividualWorkExperience[]
  /** PDS-C3 */
  individual_voluntary_work: IndividualVoluntaryWork[]
  individual_lnd: IndividualLearningDevelopment[]
  individual_skills_hobby: IndividualSkills[]
  individual_recognition: IndividualRecognition[]
  individual_membership: IndividualMembership[]
  /** PDS-C4 */
  individual_question: IndividualQuestion[]
  individual_reference: IndividualReference[]
  individual_government_id: IndividualGovernmentIssue
  employee: PersonnelEmployee
  individual_educational_background: IndividualEducBg[]
  educations: {
    elementary: IndividualEducBg
    high_school: IndividualEducBg
    vocational: IndividualEducBg
    college: IndividualEducBg
    graduate: IndividualEducBg
  }
}

export const usePdsStore = defineStore('pds', () => {
  /** States */
  const authStore = useAuthStore()
  const pdsMode = ref('')

  const pdsInfo = ref<PersonalDataSheetPayload>({
    individual: {
      first_name: null,
      last_name: null,
      middle_name: null,
      ext_name: null,
      birthday: null,
      sex: null,
      /**Personnel Data Sheet  */
      place_of_birth: null,
      civil_status: null,
      height: null,
      weight: null,
      blood_type: null,
      philhealth_no: null,
      gsis_no: null,
      pag_ibig_no: null,
      sss_no: null,
      tin: null,
      agency_employee_no: null,
      citizenship: null,
      citizenship_country: null,
      citizenship_acquisition: null,
    },
    contact_info: {
      tel_no: null,
      mobile_no: null,
      email_address: null,
    },
    individual_contact_info: [],
    individual_address: [],
    individual_address_init: {
      /**Personnel Data Sheet Address */
      residential_house_block_lot_no: null,
      residential_street: null,
      residential_subdivision_village: null,
      residential_brgy_id: null,
      residential_citymun_id: null,
      residential_province_id: null,
      residential_region_id: null,
      residential_zip_code: null,
      permanent_house_block_lot_no: null,
      permanent_street: null,
      permanent_subdivision_village: null,
      permanent_brgy_id: null,
      permanent_citymun_id: null,
      permanent_province_id: null,
      permanent_region_id: null,
      permanent_zip_code: null,
    },
    individual_family: null,
    individual_family_spouse: {
      first_name: null,
      last_name: null,
      middle_name: null,
      ext_name: null,
      occupation: null,
      employers_business_name: null,
      business_address: null,
      telephone_no: null,
      class: 'Spouse',
      date_of_birth: null,
    },
    individual_family_father: {
      first_name: null,
      last_name: null,
      middle_name: null,
      ext_name: null,
      occupation: null,
      employers_business_name: null,
      business_address: null,
      telephone_no: null,
      class: 'Father',
      date_of_birth: null,
    },
    individual_family_mothers_maiden: {
      first_name: null,
      last_name: null,
      middle_name: null,
      ext_name: null,
      occupation: null,
      employers_business_name: null,
      business_address: null,
      telephone_no: null,
      class: 'Mother',
      date_of_birth: null,
    },
    individual_family_children: [
      {
        first_name: null,
        last_name: null,
        middle_name: null,
        ext_name: null,
        occupation: null,
        employers_business_name: null,
        business_address: null,
        telephone_no: null,
        class: 'Children',
        date_of_birth: null,
      },
    ],
    educations: {
      elementary: {
        schools_name: null,
        education_description: null,
        level: 'Elementary',
        period_of_attendance_from: null,
        period_of_attendance_to: null,
        highest_level_units_earned: null,
        year_graduated: null,
        scholarship_academic_honors_received: null,
      },
      high_school: {
        schools_name: null,
        education_description: null,
        level: 'Secondary',
        period_of_attendance_from: null,
        period_of_attendance_to: null,
        highest_level_units_earned: null,
        year_graduated: null,
        scholarship_academic_honors_received: null,
      },
      vocational: {
        schools_name: null,
        education_description: null,
        level: 'Vocational',
        period_of_attendance_from: null,
        period_of_attendance_to: null,
        highest_level_units_earned: null,
        year_graduated: null,
        scholarship_academic_honors_received: null,
      },
      college: {
        schools_name: null,
        education_description: null,
        level: 'College',
        period_of_attendance_from: null,
        period_of_attendance_to: null,
        highest_level_units_earned: null,
        year_graduated: null,
        scholarship_academic_honors_received: null,
      },
      graduate: {
        schools_name: null,
        education_description: null,
        level: 'Graduate',
        period_of_attendance_from: null,
        period_of_attendance_to: null,
        highest_level_units_earned: null,
        year_graduated: null,
        scholarship_academic_honors_received: null,
      },
    },
    individual_educational_background: [],
    /** PDS C2 */
    individual_eligibility: [
      {
        eligibility: '',
        rating: '',
        date_of_examination_conferment: '',
        place_of_examination: '',
        license_number: null,
        license_date_of_validity: null,
      },
    ],
    individual_work_experience: [
      {
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
      },
    ],
    /** PDS C3 */
    individual_voluntary_work: [
      {
        is_current_org: false,
        org_name: '',
        org_address: '',
        from: null,
        to: null,
        number_of_hours: null,
        position_nature_of_work: null,
      },
    ],
    individual_lnd: [
      {
        title: '',
        from: '',
        to: null,
        number_of_hours: null,
        type: null,
        conducted_sponsor: null,
      },
    ],
    individual_skills_hobby: [
      {
        skill_hobby: '',
      },
    ],
    individual_recognition: [
      {
        recognition: '',
      },
    ],
    individual_membership: [
      {
        association_organization: '',
      },
    ],
    /** PDS C4 */
    individual_question: [
      {
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
    individual_reference: [
      {
        name: '',
        address: '',
        tel_no: '',
      },
    ],
    individual_government_id: {
      gov_id_name: '',
      gov_id_no: '',
      gov_id_issuance: '',
    },
    employee: {
      id: 0,
      individual_basic_detail_id: null,
      id_number: null,
      item_id: null,
      salary_grade_id: null,
      position: null,
      fund_source: {
        id: null,
        name: null,
      },
      agency_employee_no: null,
      office_id: null,
      division_id: null,
      division: null,
      section_or_unit_id: null,
      section_or_unit: null,
      item: null,
    },
  })

  const savePds = async (payload: PersonalDataSheetPayload) => {
    const uri = '/individual-basic-details'

    // Format education dates to 'YYYY'
    payload.individual_educational_background.forEach((edu) => {
      edu.period_of_attendance_from = formatYear(edu.period_of_attendance_from)
      edu.period_of_attendance_to = formatYear(edu.period_of_attendance_to)
      edu.year_graduated = formatYear(edu.year_graduated)
    })

    //  Format all other date-based fields to 'YYYY-MM-DD'
    formatDateFields(payload.individual_eligibility, ['date_of_examination_conferment', 'license_date_of_validity'])
    formatDateFields(payload.individual_work_experience, ['inclusive_date_from', 'inclusive_date_to'])
    formatDateFields(payload.individual_voluntary_work, ['from', 'to'])
    formatDateFields(payload.individual_lnd, ['from', 'to'])

    const { data } = await useApiCall(uri, authStore.authenticationToken).post(payload).json()
    return data.value as ApiResponseBody
  }

  return {
    pdsInfo,
    savePds,
    pdsMode,
  }
})
