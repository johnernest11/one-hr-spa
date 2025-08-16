import { Ref, ref, reactive } from 'vue'
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
  ImportPdsResponse,
  PersonnelResponse,
} from '@/typings/models.types.ts'
import { useApiCall } from '@/composables/network'
import { useAuthStore } from '@/stores/auth.store.ts'
import { ApiResponseBody } from '@/typings/http-resources.types'
import { formatDateFields, formatYear } from '@/utils/helpers.js'
import { useRoute } from 'vue-router'
import { BloodType, CivilStatusType, SexType } from '@/typings/employee-entry.types'

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
    civil_status: 'Single' | 'Married' | 'Widowed' | 'Divorced' | 'Separated' | null
    height: number | null
    weight: number | null
    blood_type: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null
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
  const importResult: Ref<ApiResponseBody | null> = ref(null)
  const selectedPDS = ref<PersonnelResponse | null>(null)
  const personnelPds = ref<PersonnelResponse[]>([])

  const route = useRoute()
  const isMyPds = route.name === 'my-pds'
  const individual = isMyPds ? authStore.authenticatedUser?.user_profile?.individual_basic_detail : null
  const employee = individual?.employee
  const contactInfo = individual?.individual_contact_info
  const individual_address = individual?.individual_address
  const individual_family_list = individual?.individual_family as IndividualFamily[] | null
  const individual_family_spouse = individual_family_list?.find((f) => f.class === 'Spouse')
  const individual_family_father = individual_family_list?.find((f) => f.class === 'Father')
  const individual_family_mothers_maiden = individual_family_list?.find((f) => f.class === 'Mother')
  const individual_family_children = individual_family_list?.filter((f) => f.class === 'Children') ?? []
  const educations = (individual?.individual_educational_background ?? []) as IndividualEducBg[]

  const getEducationByLevel = (level: string) => educations.find((e) => e.level === level) ?? null

  const pdsInfo = reactive<PersonalDataSheetPayload>({
    individual: {
      first_name: individual?.first_name ?? null,
      last_name: individual?.last_name ?? null,
      middle_name: individual?.middle_name ?? null,
      ext_name: individual?.ext_name ?? null,
      birthday: individual?.birthday ?? null,
      sex: (individual?.sex as SexType) ?? null,
      place_of_birth: individual?.place_of_birth ?? null,
      civil_status: (individual?.civil_status as CivilStatusType) ?? null,
      height: individual?.height ?? null,
      weight: individual?.weight ?? null,
      blood_type: (individual?.blood_type as BloodType) ?? null,
      philhealth_no: individual?.philhealth_no ?? null,
      gsis_no: individual?.gsis_no ?? null,
      pag_ibig_no: individual?.pag_ibig_no ?? null,
      sss_no: individual?.sss_no ?? null,
      tin: individual?.tin ?? null,
      agency_employee_no: individual?.employee?.agency_employee_no ?? null,
      citizenship: individual?.citizenship ?? null,
      citizenship_country: null,
      citizenship_acquisition: individual?.citizenship_acquisition ?? null,
    },

    contact_info: {
      tel_no: contactInfo?.tel_no ?? null,
      mobile_no: contactInfo?.mobile_no ?? null,
      email_address: contactInfo?.email_address ?? null,
    },
    individual_contact_info: [],
    individual_address: [],
    individual_address_init: {
      /**Personnel Data Sheet Address */
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
    individual_family: null,

    individual_family_spouse: {
      first_name: individual_family_spouse?.first_name ?? null,
      last_name: individual_family_spouse?.last_name ?? null,
      middle_name: individual_family_spouse?.middle_name ?? null,
      ext_name: individual_family_spouse?.ext_name ?? null,
      occupation: individual_family_spouse?.occupation ?? null,
      employers_business_name: individual_family_spouse?.employers_business_name ?? null,
      business_address: individual_family_spouse?.business_address ?? null,
      telephone_no: individual_family_spouse?.telephone_no ?? null,
      class: 'Spouse',
      date_of_birth: individual_family_spouse?.date_of_birth ?? null,
    },

    individual_family_father: {
      first_name: individual_family_father?.first_name ?? null,
      last_name: individual_family_father?.last_name ?? null,
      middle_name: individual_family_father?.middle_name ?? null,
      ext_name: individual_family_father?.ext_name ?? null,
      occupation: individual_family_father?.occupation ?? null,
      employers_business_name: individual_family_father?.employers_business_name ?? null,
      business_address: individual_family_father?.business_address ?? null,
      telephone_no: individual_family_father?.telephone_no ?? null,
      class: 'Father',
      date_of_birth: individual_family_father?.date_of_birth ?? null,
    },

    individual_family_mothers_maiden: {
      first_name: individual_family_mothers_maiden?.first_name ?? null,
      last_name: individual_family_mothers_maiden?.last_name ?? null,
      middle_name: individual_family_mothers_maiden?.middle_name ?? null,
      ext_name: individual_family_mothers_maiden?.ext_name ?? null,
      occupation: individual_family_mothers_maiden?.occupation ?? null,
      employers_business_name: individual_family_mothers_maiden?.employers_business_name ?? null,
      business_address: individual_family_mothers_maiden?.business_address ?? null,
      telephone_no: individual_family_mothers_maiden?.telephone_no ?? null,
      class: 'Mother',
      date_of_birth: individual_family_mothers_maiden?.date_of_birth ?? null,
    },
    individual_family_children: individual_family_children.map((child) => ({
      first_name: child.first_name ?? null,
      last_name: child.last_name ?? null,
      middle_name: child.middle_name ?? null,
      ext_name: child.ext_name ?? null,
      occupation: child.occupation ?? null,
      employers_business_name: child.employers_business_name ?? null,
      business_address: child.business_address ?? null,
      telephone_no: child.telephone_no ?? null,
      class: 'Children',
      date_of_birth: child.date_of_birth ?? null,
    })),

    educations: {
      elementary: {
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

  const updatePdsFromPersonnel = (personnel: PersonnelResponse | null) => {
    if (!personnel) return

    // === Employee Info ===
    const employee = personnel.employee
    pdsInfo.employee.id = employee?.id ?? 0
    pdsInfo.employee.individual_basic_detail_id = employee?.individual_basic_detail_id ?? null
    pdsInfo.employee.id_number = employee?.id_number ?? null
    pdsInfo.employee.item_id = employee?.item_id ?? null
    pdsInfo.employee.salary_grade_id = employee?.salary_grade_id ?? null
    pdsInfo.employee.position = null
    pdsInfo.employee.fund_source = {
      id: employee?.fund_source?.id ?? null,
      name: employee?.fund_source?.name ?? null,
    }
    pdsInfo.employee.agency_employee_no = employee?.agency_employee_no ?? null
    pdsInfo.employee.office_id = employee?.office_id ?? null
    pdsInfo.employee.office = employee?.office ?? null
    pdsInfo.employee.division_id = employee?.division_id ?? null
    pdsInfo.employee.division = employee?.division ?? null
    pdsInfo.employee.section_or_unit_id = employee?.section_or_unit_id ?? null
    pdsInfo.employee.section_or_unit = employee?.section_or_unit ?? null
    pdsInfo.employee.item = null

    // === Individual Information ===
    pdsInfo.individual.first_name = personnel.first_name ?? null
    pdsInfo.individual.last_name = personnel.last_name ?? null
    pdsInfo.individual.middle_name = personnel.middle_name ?? null
    pdsInfo.individual.ext_name = personnel.ext_name ?? null
    pdsInfo.individual.birthday = personnel.birthday ?? null
    pdsInfo.individual.sex = (personnel.sex as SexType) ?? null
    pdsInfo.individual.place_of_birth = personnel.place_of_birth ?? null
    pdsInfo.individual.civil_status = (personnel.civil_status as CivilStatusType) ?? null
    pdsInfo.individual.height = personnel.height ?? null
    pdsInfo.individual.weight = personnel.weight ?? null
    pdsInfo.individual.blood_type = (personnel.blood_type as BloodType) ?? null
    pdsInfo.individual.philhealth_no = personnel.philhealth_no ?? null
    pdsInfo.individual.gsis_no = personnel.gsis_no ?? null
    pdsInfo.individual.pag_ibig_no = personnel.pag_ibig_no ?? null
    pdsInfo.individual.sss_no = personnel.sss_no ?? null
    pdsInfo.individual.tin = personnel.tin ?? null
    pdsInfo.individual.agency_employee_no = personnel.employee?.agency_employee_no ?? null
    pdsInfo.individual.citizenship = personnel.citizenship ?? null
    pdsInfo.individual.citizenship_acquisition = personnel.citizenship_acquisition ?? null
    pdsInfo.individual.citizenship_country = null

    // === Contact Info ===
    const contactInfo = personnel.individual_contact_info
    pdsInfo.contact_info.tel_no = contactInfo?.tel_no ?? null
    pdsInfo.contact_info.mobile_no = contactInfo?.mobile_no ?? null
    pdsInfo.contact_info.email_address = contactInfo?.email_address ?? null

    // === Individual Address Init ===
    const address = personnel.individual_address

    pdsInfo.individual_address_init.residential_house_block_lot_no = address?.residential_house_block_lot_no ?? null
    pdsInfo.individual_address_init.residential_street = address?.residential_street ?? null
    pdsInfo.individual_address_init.residential_subdivision_village = address?.residential_subdivision_village ?? null
    pdsInfo.individual_address_init.residential_brgy_id = address?.residential_brgy_id ?? null
    pdsInfo.individual_address_init.residential_citymun_id = address?.residential_citymun_id ?? null
    pdsInfo.individual_address_init.residential_province_id = address?.residential_province_id ?? null
    pdsInfo.individual_address_init.residential_region_id = address?.residential_region_id ?? null
    pdsInfo.individual_address_init.residential_zip_code = address?.residential_zip_code ?? null

    pdsInfo.individual_address_init.permanent_house_block_lot_no = address?.permanent_house_block_lot_no ?? null
    pdsInfo.individual_address_init.permanent_street = address?.permanent_street ?? null
    pdsInfo.individual_address_init.permanent_subdivision_village = address?.permanent_subdivision_village ?? null
    pdsInfo.individual_address_init.permanent_brgy_id = address?.permanent_brgy_id ?? null
    pdsInfo.individual_address_init.permanent_citymun_id = address?.permanent_citymun_id ?? null
    pdsInfo.individual_address_init.permanent_province_id = address?.permanent_province_id ?? null
    pdsInfo.individual_address_init.permanent_region_id = address?.permanent_region_id ?? null
    pdsInfo.individual_address_init.permanent_zip_code = address?.permanent_zip_code ?? null
  }

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

  const importPds = async (file: File, metadata: ImportPdsResponse): Promise<ApiResponseBody> => {
    const formData = new FormData()

    // --- Required fields ---
    formData.append('excel_file', file)
    formData.append('is_update', '0')
    formData.append('employee_id', '')

    // --- Append optional metadata if present ---
    const appendIfDefined = (key: string, value: unknown) => {
      if (value !== null && value !== undefined && value !== '') {
        formData.append(key, String(value))
      }
    }

    appendIfDefined('item_id', metadata.item_id)
    appendIfDefined('salary_grade_id', metadata.salary_grade_id)
    appendIfDefined('office_id', metadata.office_id)
    appendIfDefined('division_id', metadata.division_id)
    appendIfDefined('section_or_unit_id', metadata.section_or_unit_id)
    appendIfDefined('id_number', metadata.id_number)
    appendIfDefined('agency_employee_no', metadata.agency_employee_no)

    const { data } = await useApiCall('/individual-basic-details/import', authStore.authenticationToken).post(formData).json()

    importResult.value = data.value
    return data.value
  }

  const generatePDSFormTemplate = async (id: string) => {
    const response = await fetch('/mock/CSC-FORM-212-Template.xlsx')
    const blob = await response.blob()
    const fileNameHeader = `Certificate-of-COC-Earned-${id}.docx`

    return {
      data: ref(blob),
      fileNameHeader: ref(fileNameHeader),
    }
  }

  const fetchPds = async (id: number) => {
    const uri = `/individual-basic-details/${id}`

    const { data } = await useApiCall(uri, authStore.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value

    return responseBody
  }

  const fetchPdsById = async (id: string | number) => {
    const url = `/individual-basic-details/${id}`
    const { data } = await useApiCall(url, authStore.authenticationToken).get().json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      selectedPDS.value = responseBody.data as PersonnelResponse
    }
    return responseBody
  }

  const updatePds = async (pds: Partial<PersonalDataSheetPayload>, id: string | number, formType: 'C1' | 'C2' | 'C3' | 'C4') => {
    const { data } = await useApiCall(`/individual-basic-details/${id}`, authStore.authenticationToken)
      .put({ ...pds, form_type: formType })
      .json()
    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      const index = personnelPds.value.findIndex((personnelPds) => personnelPds?.id === id)
      if (index === -1) return responseBody
      personnelPds.value[index] = responseBody.data as PersonnelResponse
    }
    return responseBody
  }

  return {
    pdsInfo,
    savePds,
    importPds,
    generatePDSFormTemplate,
    pdsMode,
    importResult,
    fetchPds,
    updatePdsFromPersonnel,
    updatePds,
    fetchPdsById,
  }
})
