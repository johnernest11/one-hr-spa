import { ApiResponseData } from '@/typings/http-resources.types.ts'

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

export type ItemNumberResponse = {
  number: string | null
  date_of_creation: string | null
  status: string | null
  date_filled_up: string | null
  fund_source_id: FundSourceResponse | null
  employment_status: string | null
  position: PositionResponse | null
  position_id: PositionResponse | null
} & ApiResponseData

export type FundSourceResponse = {
  name: string
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
  active: boolean
  email_verified_at: string
  roles: Array<{ id: string | number; name: string }>
  user_profile?: UserProfileResponse
} & ApiResponseData

/** User (HTTP Responses) */
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
} & ApiResponseData

export type PersonnelCompensatoryDayTimeOffDetailsResponse = {
  days_of_the_week: string
  work_date: string
  time_start: string | null
  time_end: string | null
  accomplishment: string | null
  authorized_claim: string | null
} & ApiResponseData

export type WorkExperienceSheetResponse = {
  duration: string
  position: string
  name_office_unit: string
  immediate_supervisor: string
  name_agency: string | null
  list_accomplishment: string | null
  summary_duties: string | null
} & ApiResponseData

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
  blood_type: string
  gsis_no: string
  pag_ibig_no: string
  philhealth_no: string
  sss_no: string
  tin: string
  citizenship: string
  citizenship_acquisition: string
  individual_address: PersonnelAddress | null
  individual_contact_info: PersonnelContactInfo | null
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
  city: string | null
  province: string | null
  region: string | null
  barangay: string | null
}

export type PersonnelContactInfo = {
  id: string | null
  individual_basic_detail_id: number | null
  tel_no: string | null
  mobile_no: string | null
  email_address: string | null
}

export type PersonnelEmployee = {
  id: number | null
  individual_basic_detail_id: number | null
  id_number: string | null
  item_id: number | null
  salary_grade_id: number | null
  position?: string | null
  fund_source?: {
    id: number | null
    name: string | null
  }
  agency_employee_no: string | null
  office_id: number | null
  division_id: number | null
  section_or_unit_id: number | null
}

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
  employee_id: PersonnelResponse | null
  leave_type_id: LeaveTypeResponse | null
} & ApiResponseData

export type LeaveApplicationDateResponse = {
  leave_application_id: LeaveApplicationResponse | null
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
  period_covered_from: string | null
  period_covered_to: string | null
  period_request: string | null
  locator_slip_no: string | null
  status: string | null
  employee_id: PersonnelResponse | null
} & ApiResponseData

/** PayRoll (HTTP Responses) */
export type PayrollResponse = {
  id: number | null
  period_from: string | null
  period_to: string | null
  gross_monthly_salary: number
  net_pay: string | null
  total_deductions_1st_half: string | null
  amount_earned_1st_half: string | null
  total_deductions_2nd_half: string | null
  amount_earned_2nd_half: string | null
  total_deductions_whole: string | null
  amount_earned_whole: string | null
  payroll_deduction_id: Array<PayrollDeductionResponse> | null | undefined
  employee_id: PersonnelResponse | null
  generate_employee_id: PersonnelResponse | null
} & ApiResponseData

export type PayrollDeductionResponse = {
  amount: string | null
  range: string | null
  employee_id: PersonnelResponse | null
  deduction_id: DeductionResponse | null
  payroll_id: PayrollResponse | null
  employee_deduction_setting_id: PayrollDeductionSettingResponse | null
} & ApiResponseData

export type PayrollDeductionSettingResponse = {
  amount: string | null
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
