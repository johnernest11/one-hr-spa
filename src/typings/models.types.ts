import { ApiResponseData } from '@/typings/http-resources.types.ts'
import { BloodType } from './employee-entry.types'

/** Libraries (HTTP Responses) */
export type RegionResponse = {
  code_correspondence: string
  code: string
  name: string
  alt_name: string
  geo_level: string
} & ApiResponseData

export type ProvinceResponse = {
  code_correspondence: string
  code: string
  name: string
  alt_name: string
  geo_level: string
  region_id: number
  old_name?: string
  income_classification: string
} & ApiResponseData

export type CityResponse = {
  code_correspondence: string
  code: string
  name: string
  alt_name: string
  province_id: number
  old_name?: string
  income_classification: string
  classification: 'city' | 'municipality'
  city_class?: string
} & ApiResponseData

export type BarangayResponse = {
  code_correspondence: string
  city_id: number
  name: string
} & ApiResponseData

export type AddressResponse = {
  home_address: string | null
  postal_code: string | null
  barangay_id: string | number | null
  city_id: string | number | null
  province_id: string | number | null
  region_id: string | number | null
  barangay: BarangayResponse | null
  city: CityResponse | null
  province: ProvinceResponse | null
  region: RegionResponse | null
} & ApiResponseData

export type OfficesResponse = {
  name: string
  head_user_id: string | null
  added_by_user_id: string | null
  last_modified_by_user_id: string | null
} & ApiResponseData

export type DivisionResponse = {
  name: string
  head_user_id: string | null
  added_by_user_id: string | null
  last_modified_by_user_id: string | null
} & ApiResponseData

export type SectionorUnitResponse = {
  id: number
  name: string
  head_user_id: string | null
  division_id: string | null
  added_by_user_id: string | null
  last_modified_by_user_id: string | null
} & ApiResponseData

export type ProgramResponse = {
  name: string
} & ApiResponseData

export type ItemNumberResponse = {
  id: number
  number: string
  date_of_creation: string | null
  status: string | null
  date_filled_up: string | null
  fund_source_id: number
  fund_source: FundSourceResponse | null
  employment_status: string | null
  position_id: number
  position: PositionResponse | null
} & ApiResponseData

export type FundSourceResponse = {
  name: string
} & ApiResponseData

export type SalaryGradeResponse = {
  nbc_no: number | null
  effective_date: string | null
  tranche: number | null
  salary_grade: number | null
  step: number | null
  amount: number
} & ApiResponseData

export type PositionResponse = {
  title: string
  parenthetical_title: string | number | null
  level: '1st' | '2nd' | '3rd' | null
} & ApiResponseData

export type LeaveTypeResponse = {
  title: string
  description: string | number | null
} & ApiResponseData

export type DeductionResponse = {
  name: string
  code: string | number | null
  details: string | number | null
} & ApiResponseData

/** User (HTTP Responses) */
export type UserResponse = {
  email: string
  name: string
  username: string
  active: boolean
  email_verified_at: string
  roles: Array<{ id: string | number; name: string }>
  user_profile?: UserProfileResponse
} & ApiResponseData

/** Active Directory (HTTP Responses) */
export type ActiveDiretoryResponse = {
  guid: string
  name: string
  username: string
  email: string
  active: boolean
  email_verified_at: string
} & ApiResponseData

/** User Profile (HTTP Responses) */
export type UserProfileResponse = {
  first_name: string
  last_name: string
  middle_name: string | null
  ext_name: string | null
  mobile_number: string | null
  telephone_number: string | null
  sex: 'male' | 'female' | null
  birthday: string | null
  full_name: string
  profile_picture_url: string | null
  address: AddressResponse
  individual_basic_detail_id: number | null
  individual_basic_detail?: PersonnelResponse | null
  personnel_accomplishment_report?: Array<PersonnelAccomplishmentReportResponse> | null | undefined
} & ApiResponseData

/** Accomplishment Report (HTTP Responses) */
export type PersonnelAccomplishmentReportResponse = {
  period: string
  supervisor_notes: string
  status: string
  rows: Array<PersonnelAccomplishmentReportDetialsResponse> | null | undefined
} & ApiResponseData

export type PersonnelAccomplishmentReportDetialsResponse = {
  week_num: string
  dates_in_week: string
  specific_activity: string | null
  highlights: string | null
} & ApiResponseData

/** Compensatory Time Day Off (HTTP Responses) */
export type PersonnelCompensatoryDayTimeOffResponse = {
  ctdo_period: string
  ctdo_supervisor_notes: string
  ctdo_status: string
  rows: Array<PersonnelCompensatoryDayTimeOffDetailsResponse> | null | undefined
  employee_id: PersonnelEmployee | null
} & ApiResponseData

export type PersonnelCompensatoryDayTimeOffDetailsResponse = {
  days_of_the_week: string
  work_date: string
  time_start: string | null
  time_end: string | null
  accomplishment: string | null
  authorized_claim: string | null
} & ApiResponseData

/**Work Experience Sheet (WES) (HTTP Responses) */
export type WorkExperienceSheetResponse = {
  duration: string
  position: string
  name_office_unit: string
  immediate_supervisor: string
  name_agency: string | null
  list_accomplishment: string | null
  summary_duties: string | null
} & ApiResponseData

/**Employee Data  (HTTP Responses) */
export type ImportPdsResponse = {
  id_number: string | null
  is_update: number | null
  item_id: number | null
  item?: ItemNumberResponse | null
  salary_grade_id: SalaryGradeResponse | null
  office_id: number | null
  division_id: number | null
  division?: DivisionResponse | null
  section_or_unit_id: number | null
  section_or_unit?: SectionorUnitResponse | null
  agency_employee_no: string | null
  employee_id: number | null
}

export type PersonnelEmployee = {
  id: number
  individual_basic_detail_id: PersonnelResponse | null
  id_number: string | null
  item_id: number | null
  salary_grade_id: SalaryGradeResponse | null
  position?: string | null
  fund_source?: {
    id: number | null
    name: string | null
  }
  agency_employee_no: string | null
  office_id: number | null
  office: OfficesResponse | null
  division_id: number | null
  division: DivisionResponse | null
  section_or_unit_id: number | null
  section_or_unit: SectionorUnitResponse | null
  item: ItemNumberResponse | null
}

/**Personnel Data Sheet (C1 FORM) (HTTP Responses) */
export type PersonnelResponse = {
  id: number
  first_name: string
  last_name: string
  middle_name: string | null
  ext_name: string | null
  birthday: string
  sex: string
  place_of_birth: string
  civil_status: string
  height: number
  weight: number
  blood_type: BloodType | null
  gsis_no: string
  pag_ibig_no: string
  philhealth_no: string
  sss_no: string
  tin: string
  citizenship: string
  citizenship_acquisition: string
  individual_address: PersonnelAddress | null
  individual_contact_info: PersonnelContactInfo | null
  individual_family: IndividualFamily | null
  individual_educational_background: IndividualEducBg | null
  individual_eligibility: IndividualEligibility | null
  individual_work_experience: IndividualWorkExperience | null
  individual_voluntary_work: IndividualVoluntaryWork | null
  individual_lnd: IndividualLearningDevelopment | null
  individual_skills_hobby: IndividualSkills | null
  individual_recognition: IndividualRecognition | null
  individual_membership: IndividualMembership | null
  individual_question: IndividualQuestion | null
  individual_reference: IndividualReference | null
  employee: PersonnelEmployee | null
} & ApiResponseData

export type PersonnelAddress = {
  id: number
  individual_basic_detail_id: string | null
  residential_house_block_lot_no: string | null
  residential_street: string | null
  residential_subdivision_village: string | null
  residential_brgy_id: number | null
  residential_citymun_id: number | null
  residential_province_id: number | null
  residential_region_id: number | null
  residential_zip_code: string | null
  permanent_house_block_lot_no: string | null
  permanent_street: string | null
  permanent_subdivision_village: string | null
  permanent_brgy_id: number | null
  permanent_citymun_id: number | null
  permanent_province_id: number | null
  permanent_region_id: number | null
  permanent_zip_code: string | null
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
  barangay: BarangayResponse | null
  city: CityResponse | null
  province: ProvinceResponse | null
  region: RegionResponse | null
}

export type PersonnelContactInfo = {
  id: string | null
  individual_basic_detail_id: number | null
  tel_no: string | null
  mobile_no: string | null
  email_address: string | null
}

export type IndividualContactInfo = {
  tel_no: string | null
  mobile_no: string | null
  email_address: string | null
}

export type IndividualAddress = {
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

export type IndividualFamily = {
  id: number | null
  first_name: string | null
  last_name: string | null
  middle_name?: string | null
  ext_name?: string | null
  occupation: string | null
  employers_business_name: string | null
  business_address: string | null
  telephone_no?: string | null
  class: 'Spouse' | 'Father' | 'Mother' | 'Children' | null
  date_of_birth?: string | null
  _delete: boolean | null
} & Omit<ApiResponseData, 'id'>

export type IndividualEducBg = {
  id: number | null
  schools_name: string | null
  education_description: string | null
  level: 'Elementary' | 'Secondary' | 'College' | 'Vocational' | 'Graduate' | null
  period_of_attendance_from: string | null
  period_of_attendance_to: string | null
  highest_level_units_earned: string | null
  year_graduated: string | null
  is_current_enrolled: boolean
  scholarship_academic_honors_received: string | null
}

/**Personnel Data Sheet (C2 FORM) (HTTP Responses) */
export type IndividualEligibility = {
  id: number | null
  eligibility: string | null
  rating: string | null
  date_of_examination_conferment: string | null
  place_of_examination: string | null
  license_number: string | null
  license_date_of_validity: string | null
  _delete: boolean | null
} & Omit<ApiResponseData, 'id'>

export type IndividualWorkExperience = {
  id: number | null
  is_current_work: boolean
  inclusive_date_from: string | null
  inclusive_date_to: string | null
  position_title: string | null
  department_agency_office_company: string | null
  monthly_salary: string | null
  salary_grade_id: number | null
  salary_grade: SalaryGradeResponse | null
  custom_salary_grade: string | null
  status_of_appointment: string | null
  is_gov_service: boolean
  _delete: boolean | null
} & Omit<ApiResponseData, 'id'>

/**Personnel Data Sheet (C3 FORM) (HTTP Responses) */
export type IndividualVoluntaryWork = {
  id: number | null
  is_current_org: boolean
  org_name: string | null
  org_address: string | null
  from: string | Date | null
  to: string | Date | null
  number_of_hours: string | null
  position_nature_of_work: string | null
  _delete: boolean | null
} & Omit<ApiResponseData, 'id'>

export type IndividualLearningDevelopment = {
  id: number | null
  title: string | null
  from: string | null
  to: string | null
  number_of_hours: string | null
  type: string | null
  conducted_sponsor: string | null
  _delete: boolean | null
} & Omit<ApiResponseData, 'id'>

export type IndividualSkills = {
  id: number | null
  skill_hobby: string | null
  _delete: boolean | null
} & Omit<ApiResponseData, 'id'>

export type IndividualRecognition = {
  id: number | null
  recognition: string | null
  _delete: boolean | null
} & Omit<ApiResponseData, 'id'>

export type IndividualMembership = {
  id: number | null
  association_organization: string | null
  _delete: boolean | null
} & Omit<ApiResponseData, 'id'>

/**Personnel Data Sheet (C4 FORM) (HTTP Responses) */
export type IndividualQuestion = {
  id: number | null
  q34_a: boolean
  q34_b: boolean
  q34_details: string | null
  q35_a: boolean
  q35_a_details: string | null
  q35_b: boolean
  q35_b_date_filed: string | null
  q35_b_status: string | null
  q36: boolean
  q36_details: string | null
  q37: boolean
  q37_details: string | null
  q38_a: boolean
  q38_a_details: string | null
  q38_b: boolean
  q38_b_details: string | null
  q39: boolean
  country_id: number | null
  q40_a_indigenous_group: boolean
  q40_a_details: string | null
  q40_b_pwd: boolean
  q40_b_details: string | null
  q40_c_solo_parent: boolean
  q40_c_details: string | null
} & Omit<ApiResponseData, 'id'>

export type IndividualReference = {
  id: number | null
  name: string | null
  address: string | null
  tel_no: string | null
  _delete: boolean | null
} & Omit<ApiResponseData, 'id'>

export type IndividualGovernmentIssue = {
  gov_id_name: string | null
  gov_id_no: string | null
  gov_id_issuance: string | null
}

/**Daily Time Record (HTTP Responses) */
export type DailyTimeRecordResponse = {
  id: number | null
  date: string
  ut: string | null
  is_edit_ut: boolean | null
  ot: string | null
  is_missing: boolean | null
  employee_remarks: string | null
  hr_remarks: string | null
  status: string | null
  warm_bodies: Array<WarmBodyResponse> | null | undefined
}

export type ViewDailyTimeRecordResponse = {
  id: number | null
  employee_id: number | null
  date: string
  ut: number | null
  is_edit_ut: boolean | null
  ot: number | null
  is_missing: boolean | null
  employee_remarks: string | null
  hr_remarks: string | null
  status: string | null
  time_log: Array<TimeLogResponse> | null | undefined
}

export type ViewTimeLogsResponse = {
  dtr_date: string
  time_log_id: number
  is_in: boolean
  scanned_time: string
  time_log_date: string
  id_number: string | null
  first_name: string
  middle_name: string | null
  last_name: string
  ext_name: string | null
  division_name: string
  section_name: string
}

export type CountWarmBodiesResponse = {
  date: string
  total_employees: number
  in_office: number
  out_of_office: number
  per_division: Array<{
    division_id: number
    division_name: string
    total_employees: number
    in_office: number
    out_of_office: number
  }>
  per_section: Array<{
    division_id: number
    division_name: string
    section_id: number
    section_name: string
    total_employees: number
    in_office: number
    out_of_office: number
  }>
}

export type WarmBodyResponse = {
  id: number
  employee_id: PersonnelEmployee | null
  timestamp: string
  daily_time_record_id: number
  is_in: boolean // true = IN, false = OUT
}

export type TimeLogResponse = {
  id: number
  daily_time_record_id: number | null
  date: string
  scanned_time: string
  is_in: boolean // true = IN, false = OUT
  is_selected: boolean // true = SELECTED, false = NOT SELECTED
}

export type QrCodeResponse = {
  id: number
  employee: PersonnelEmployee | null
  qr_code_value: string | null
  last_generated_at: string | null
  is_active: boolean
} & ApiResponseData

/** Leave Application (HTTP Responses) */
export type LeaveApplicationResponse = {
  id: number | null
  date_of_filing: string | null
  others_notes: string | null
  number_of_days: string | null
  detail_of_leave: string | null
  specific_detail: string | null
  commutation: string | null
  status: string | null
  division_head_disapproval_notes: string | null
  days_with_pay: string | null
  days_without_pay: string | null
  disapproved_notes: string | null
  dates: Array<LeaveApplicationDateResponse> | null | undefined
  employee_id: PersonnelEmployee | null
  leave_type_id: LeaveTypeResponse | null
} & ApiResponseData

export type LeaveApplicationDateResponse = {
  leave_application_id: LeaveApplicationResponse | null
  start_date: string | null
  end_date: string | null
} & ApiResponseData

/** Leave Credits (HTTP Responses) */
export type LeaveCreditsResponse = {
  id: number | null
  type: string | null
  particular: string | null
  ut_w_pay_day: string | null
  ut_w_pay_hr: string | null
  ut_w_pay_min: string | null
  ut_day: string | null
  ut_hr: string
  ut_min: string | null
  ut_w_pay: string | null
  earned: string | null
  balance: string | null
  ut_wo_pay: string | null
  salary: string | null
  aca_pera: string | null
  leave_credits_dates: Array<LeaveCreditsDateResponse> | null | undefined
  employee_id: PersonnelEmployee | null
} & ApiResponseData

export type LeaveCreditsDateResponse = {
  leave_credits_id: LeaveCreditsResponse | null
  start_date: string | null
  end_date: string | null
} & ApiResponseData

/** Document Request (HTTP Responses) */
export type DocumentRequestResponse = {
  id: number | null
  request_date: string | null
  certificate_type: string | number | null
  others_type: string | null
  additional_info: string | null
  others_additional_info: string | null
  purpose: string | null
  mode_of_receipt: string | null
  status: string | null
  employee_id: PersonnelResponse | null
} & ApiResponseData

/** Locator Slip (HTTP Responses) */
export type LocatorSlipResponse = {
  id: number | null
  locator_slip_no: string | null
  employee_id: PersonnelResponse | null
  status: string | null //@todo enum
  form_type: string //@todo enum
  month: string | null
  period: string | null
  ls_logger: LSLoggerResponse[] | null
} & ApiResponseData

/** Locator Slip Logger (HTTP Responses) */
export type LSLoggerResponse = {
  id?: number | null
  locator_slip_id: number | null
  date: string | null
  time_in: string | null
  time_out: string | null
  destination: string | null
  purpose: string | null
  approve_for: string | null //@todo either: official or personal time
  duration: number | null
  remarks: string | null
} & ApiResponseData

/** PayRoll (HTTP Responses) */
export type PayrollResponse = {
  id: number | null
  period: string | null
  gross_monthly_salary: string | null
  net_pay: string | null
  total_deductions_1st_half: string | null
  amount_earned_1st_half: string | null
  total_deductions_2nd_half: string | null
  amount_earned_2nd_half: string | null
  total_deductions_whole: string | null
  amount_earned_whole: string | null
  payroll_deduction_id: Array<PayrollDeductionResponse> | null | undefined
  employee_id: PersonnelEmployee | null
} & ApiResponseData

export type PayrollDeductionResponse = {
  amount: number | null
  range: string | null
  // employee_deduction_setting_id: PayrollDeductionResponse | null
  deduction_id: DeductionResponse | null
  // employee_id: PersonnelResponse | null
} & ApiResponseData

export type PayrollDeductionSettingResponse = {
  amount: number | null
  range: string | null
  employee_id: PersonnelResponse | null
  deduction_id: DeductionResponse | null
} & ApiResponseData

/** Role (HTTP Responses) */
export type RoleResponse = {
  name: string
} & ApiResponseData

/** Settings (HTTPResponse) */
export type SettingsResponse = {
  name: string
  value: string
} & ApiResponseData

export interface ScannedEmployeeResponse {
  id: string | number
  name: string
  position: string
  is_in: boolean
  timestamp: string
  photo_url: string
}
