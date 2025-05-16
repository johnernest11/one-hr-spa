import { ref } from 'vue'
import { defineStore } from 'pinia'
import { PersonnelEmployee } from '@/typings/models.types.ts'
import { useApiCall } from '@/composables/network'
import { useAuthStore } from '@/stores/auth.store.ts'
import { ApiResponseBody } from '@/typings/http-resources.types'

/** Typings */
export type UploadProfilePictureResponse = { owner_id: string | number; path: string; url: string }

export type PersonalDataSheetPayload = {
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
    tin_no: string | null
    agency_employee_no: string | null
    citizenship: string | null
    citizenship_country: string | null
    citizenship_acquisition: string | null
  }
  individual_contact_info: {
    /**Personnel Data Sheet Contact Info*/
    tel_no: string | null
    mobile_no: string | null
    email_address: string | null
  }
  individual_address: {
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
  individual_eligibility?: IndividualEducBg[]
  employee: PersonnelEmployee
  individual_educational_background: {
    schools_name: string | null
    education_description: string | null
    level: string | null
    period_of_attendance_from: string | null
    period_of_attendance_to: string | null
    highest_level_units_earned: string | null
    year_graduated: string | null
    scholarship_academic_honors_received: string | null
  } | null
  educations: {
    elementary: {
      schools_name: null | string
      education_description: null | string
      level: 'elementary'
      period_of_attendance_from: null | string
      period_of_attendance_to: null | string
      highest_level_units_earned: null | string
      year_graduated: null | string
      scholarship_academic_honors_received: null | string
    }
    high_school: {
      schools_name: null | string
      education_description: null | string
      level: 'high school'
      period_of_attendance_from: null | string
      period_of_attendance_to: null | string
      highest_level_units_earned: null | string
      year_graduated: null | string
      scholarship_academic_honors_received: null | string
    }
    college: {
      schools_name: null | string
      education_description: null | string
      level: 'college'
      period_of_attendance_from: null | string
      period_of_attendance_to: null | string
      highest_level_units_earned: null | string
      year_graduated: null | string
      scholarship_academic_honors_received: null | string
    }
    graduate: {
      schools_name: null | string
      education_description: null | string
      level: 'graduate'
      period_of_attendance_from: null | string
      period_of_attendance_to: null | string
      highest_level_units_earned: null | string
      year_graduated: null | string
      scholarship_academic_honors_received: null | string
    }
  }
}

export type IndividualEligibility = {
  eligibility: string
  rating: number
  date_of_examination_conferment: string
  place_of_examination: string
  license_number: string | null
  license_date_of_validity: string | null
}

export type IndividualFamily = {
  first_name: string | null
  last_name: string | null
  middle_name?: string | null
  ext_name?: string | null
  occupation: string | null
  employers_business_name: string | null
  business_address: string | null
  telephone_no?: string | null
  class: string
  date_of_birth?: string | null
}

export type IndividualEducBg = {
  schools_name: string
  education_description: string
  level: 'elementary' | 'high school' | 'college' | 'graduate' | null
  period_of_attendance_from: string
  period_of_attendance_to: string
  highest_level_units_earned: string | null
  year_graduated: string
  scholarship_academic_honors_received: string
}

export const usePdsStore = defineStore('pds', () => {
  /** States */
  const authStore = useAuthStore()

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
      tin_no: null,
      agency_employee_no: null,
      citizenship: null,
      citizenship_country: null,
      citizenship_acquisition: null,
    },
    individual_contact_info: {
      /**Personnel Data Sheet Contact Info */
      tel_no: null,
      mobile_no: null,
      email_address: null,
    },
    individual_address: {
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
      class: 'Mothers Maiden Name',
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
        level: 'elementary',
        period_of_attendance_from: null,
        period_of_attendance_to: null,
        highest_level_units_earned: null,
        year_graduated: null,
        scholarship_academic_honors_received: null,
      },
      high_school: {
        schools_name: null,
        education_description: null,
        level: 'high school',
        period_of_attendance_from: null,
        period_of_attendance_to: null,
        highest_level_units_earned: null,
        year_graduated: null,
        scholarship_academic_honors_received: null,
      },
      college: {
        schools_name: null,
        education_description: null,
        level: 'college',
        period_of_attendance_from: null,
        period_of_attendance_to: null,
        highest_level_units_earned: null,
        year_graduated: null,
        scholarship_academic_honors_received: null,
      },
      graduate: {
        schools_name: null,
        education_description: null,
        level: 'graduate',
        period_of_attendance_from: null,
        period_of_attendance_to: null,
        highest_level_units_earned: null,
        year_graduated: null,
        scholarship_academic_honors_received: null,
      },
    },
    individual_educational_background: null,
    individual_eligibility: null,
    employee: {
      id: null,
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
      section_or_unit: null,
    },
  })

  const saveC1 = async (payload: PersonalDataSheetPayload) => {
    const uri = '/individual-basic-details'

    const { data } = await useApiCall(uri, authStore.authenticationToken).post(payload).json()
    const responseBody: ApiResponseBody = data.value

    return responseBody
  }

  return {
    pdsInfo,
    saveC1,
  }
})
