import { helpers, maxLength, required, email } from '@vuelidate/validators'
import { digitCountRule, mobilePhoneRule, uniqueUserIdentifierRule } from './custom-validations'

const generateMessage = (fieldName: string): { required: string; maxLength: string } => ({
  required: `Please enter your ${fieldName.replace(/_/g, ' ')}`,
  maxLength: `${fieldName.replace(/_/g, ' ')} cannot exceed the maximum length`,
})

const globalStringMaxLength = import.meta.env.VITE_GLOBAL_STRING_MAX_LENGTH
const globalStringMaxLengthRule = helpers.withMessage(
  `Must not exceed ${globalStringMaxLength} characters`,
  maxLength(globalStringMaxLength)
)

export const EmployeeEntryC1FormRules = {
  $lazy: true,
  /** User Profile */
  first_name: {
    required: helpers.withMessage(() => generateMessage('first_name').required, required),
    maxLength: helpers.withMessage(() => generateMessage('first_name').maxLength, globalStringMaxLengthRule),
  },
  last_name: {
    required: helpers.withMessage(() => generateMessage('last_name').required, required),
    maxLength: helpers.withMessage(() => generateMessage('last_name').maxLength, globalStringMaxLengthRule),
  },
  middle_name: {
    maxLength: helpers.withMessage(() => generateMessage('middle_name').maxLength, globalStringMaxLengthRule),
  },
  ext_name: {
    maxLength: helpers.withMessage(() => generateMessage('ext_name').maxLength, globalStringMaxLengthRule),
  },
  birthday: {
    required: helpers.withMessage(() => generateMessage('birthday').required, required),
    date: helpers.withMessage('Invalid date format, please use YYYY-MM-DD', required),
  },
  sex: {
    in: helpers.withMessage('Select a valid sex option: male or female', required),
  },
  /** Personnel Data Sheet */
  place_of_birth: {
    maxLength: helpers.withMessage(() => generateMessage('place_of_birth').maxLength, globalStringMaxLengthRule),
  },
  civil_status: {
    in: helpers.withMessage('Select a valid civil status from the list', required),
  },
  height: {
    maxLength: helpers.withMessage(() => generateMessage('height').maxLength, globalStringMaxLengthRule),
    regex: helpers.withMessage('Invalid height format. Please enter a valid height.', required),
  },
  weight: {
    maxLength: helpers.withMessage(() => generateMessage('weight').maxLength, globalStringMaxLengthRule),
    regex: helpers.withMessage('Invalid weight format. Please enter a valid weight.', required),
  },
  blood_type: {
    in: helpers.withMessage('Select a valid blood type from the list', required),
  },
  gsis_no: {
    maxLength: helpers.withMessage(() => generateMessage('gsis_no').maxLength, globalStringMaxLengthRule),
  },
  philhealth_no: {
    maxLength: helpers.withMessage(() => generateMessage('philhealth_no').maxLength, globalStringMaxLengthRule),
  },
  pag_ibig_no: {
    maxLength: helpers.withMessage(() => generateMessage('pag_ibig_no').maxLength, globalStringMaxLengthRule),
  },
  sss_no: {
    maxLength: helpers.withMessage(() => generateMessage('sss_no').maxLength, globalStringMaxLengthRule),
  },
  tin_no: {
    maxLength: helpers.withMessage(() => generateMessage('tin_no').maxLength, globalStringMaxLengthRule),
  },
  agency_employee_no: {
    maxLength: helpers.withMessage(() => generateMessage('agency_employee_no').maxLength, globalStringMaxLengthRule),
  },
  citizenship: {
    maxLength: helpers.withMessage(() => generateMessage('citizenship').maxLength, globalStringMaxLengthRule),
  },
  citizenship_country: {
    maxLength: helpers.withMessage(() => generateMessage('citizenship_country').maxLength, globalStringMaxLengthRule),
  },
  citizenship_acquisition: {
    maxLength: helpers.withMessage(() => generateMessage('citizenship_acquisition').maxLength, globalStringMaxLengthRule),
  },
  /** Personnel Contact Info */
  tel_no: {
    maxLength: helpers.withMessage(() => generateMessage('tin_no').maxLength, globalStringMaxLengthRule),
  },
  mobile_no: {
    mobile_no: helpers.withMessage('Must be a valid PH mobile number', mobilePhoneRule()),
    unique: helpers.withAsync(
      helpers.withMessage('This mobile number is already taken', uniqueUserIdentifierRule('mobile_number'))
    ),
  },
  email_address: {
    required: helpers.withMessage('Please enter your email address', required),
    email: helpers.withMessage('Email format is invalid', email),
    unique: helpers.withAsync(helpers.withMessage('This email is already taken', uniqueUserIdentifierRule('email'))),
    maxLength: helpers.withMessage(() => generateMessage('email_address').maxLength, globalStringMaxLengthRule),
  },
  /** Personnel Addresses */
  residential_house_block_lot_no: {
    maxLength: helpers.withMessage(() => generateMessage('residential_house_block_lot_no').maxLength, globalStringMaxLengthRule),
  },
  residential_street: {
    maxLength: helpers.withMessage(() => generateMessage('residential_street').maxLength, globalStringMaxLengthRule),
  },
  residential_subdivision_village: {
    maxLength: helpers.withMessage(() => generateMessage('residential_subdivision_village').maxLength, globalStringMaxLengthRule),
  },
  residential_brgy_id: {
    required: helpers.withMessage(() => generateMessage('residential_brgy_id').required, required),
  },
  residential_citynum_id: {
    required: helpers.withMessage(() => generateMessage('residential_citynum_id').required, required),
  },
  residential_province_id: {
    required: helpers.withMessage(() => generateMessage('residential_province_id').required, required),
  },
  residential_region_id: {
    required: helpers.withMessage(() => generateMessage('residential_region_id').required, required),
  },
  residential_zip_code: {
    required: helpers.withMessage(() => generateMessage('residential_zip_code').required, required),
    digitCount: helpers.withMessage('Enter a 5-digit zip code', digitCountRule(5)),
  },
  permanent_house_block_lot_no: {
    required: helpers.withMessage(() => generateMessage('permanent_house_block_lot_no').required, required),
    maxLength: helpers.withMessage(() => generateMessage('permanent_house_block_lot_no').maxLength, globalStringMaxLengthRule),
  },
  permanent_street: {
    maxLength: helpers.withMessage(() => generateMessage('permanent_street').maxLength, globalStringMaxLengthRule),
  },
  permanent_subdivision_village: {
    required: helpers.withMessage(() => generateMessage('permanent_subdivision_village').required, required),
    maxLength: helpers.withMessage(() => generateMessage('permanent_subdivision_village').maxLength, globalStringMaxLengthRule),
  },
  permanent_brgy_id: {
    required: helpers.withMessage(() => generateMessage('permanent_brgy_id').required, required),
  },
  permanent_citymun_id: {
    required: helpers.withMessage(() => generateMessage('permanent_citynum_id').required, required),
  },
  permanent_province_id: {
    required: helpers.withMessage(() => generateMessage('permanent_province_id').required, required),
  },
  permanent_region_id: {
    required: helpers.withMessage(() => generateMessage('permanent_region_id').required, required),
  },
  permanent_zip_code: {
    required: helpers.withMessage(() => generateMessage('permanent_zip_code').required, required),
    digitCount: helpers.withMessage('Enter a 5-digit zip code', digitCountRule(5)),
  },
  /** Personnel Family */
  family_last_name: {
    required: helpers.withMessage(() => generateMessage('family_last_name').required, required),
    maxLength: helpers.withMessage(() => generateMessage('family_last_name').maxLength, globalStringMaxLengthRule),
  },
  family_first_name: {
    required: helpers.withMessage(() => generateMessage('family_first_name').required, required),
    maxLength: helpers.withMessage(() => generateMessage('family_first_name').maxLength, globalStringMaxLengthRule),
  },
  family_middle_name: {
    required: helpers.withMessage(() => generateMessage('family_middle_name').required, required),
    maxLength: helpers.withMessage(() => generateMessage('family_middle_name').maxLength, globalStringMaxLengthRule),
  },
  family_ext_name: {
    required: helpers.withMessage(() => generateMessage('family_ext_name').required, required),
    maxLength: helpers.withMessage(() => generateMessage('family_ext_name').maxLength, globalStringMaxLengthRule),
  },
  occupation: {
    required: helpers.withMessage(() => generateMessage('occupation').required, required),
    maxLength: helpers.withMessage(() => generateMessage('occupation').maxLength, globalStringMaxLengthRule),
  },
  employers_business_name: {
    required: helpers.withMessage(() => generateMessage('employers_business_name').required, required),
    maxLength: helpers.withMessage(() => generateMessage('employers_business_name').maxLength, globalStringMaxLengthRule),
  },
  business_address: {
    required: helpers.withMessage(() => generateMessage('business_address').required, required),
    maxLength: helpers.withMessage(() => generateMessage('business_address').maxLength, globalStringMaxLengthRule),
  },
  family_telephone_no: {
    required: helpers.withMessage(() => generateMessage('family_telephone_no').required, required),
    maxLength: helpers.withMessage(() => generateMessage('family_telephone_no').maxLength, globalStringMaxLengthRule),
  },
  family_date_of_birth: {
    required: helpers.withMessage(() => generateMessage('family_date_of_birth').required, required),
    maxLength: helpers.withMessage(() => generateMessage('family_date_of_birth').maxLength, globalStringMaxLengthRule),
  },
  class: {
    required: helpers.withMessage(() => generateMessage('class').required, required),
    maxLength: helpers.withMessage(() => generateMessage('class').maxLength, globalStringMaxLengthRule),
  },
  /** Personnel Educational Background */
  schools_name: {
    required: helpers.withMessage(() => generateMessage('schools_name').required, required),
    maxLength: helpers.withMessage(() => generateMessage('schools_name').maxLength, globalStringMaxLengthRule),
  },
  level: {
    in: helpers.withMessage('Select a valid educational level.', required),
  },
  period_of_attendance_from: {
    required: helpers.withMessage(() => generateMessage('period_of_attendance_from').required, required),
  },
  period_of_attendance_to: {
    required: helpers.withMessage(() => generateMessage('period_of_attendance_to').required, required),
  },
  highest_level_units_earned: {
    maxLength: helpers.withMessage(() => generateMessage('highest_level_units_earned').maxLength, globalStringMaxLengthRule),
  },
  year_graduated: {
    required: helpers.withMessage(() => generateMessage('year_graduated').required, required),
  },
  scholarship_academic_honors_received: {
    maxLength: helpers.withMessage(
      () => generateMessage('scholarship_academic_honors_received').maxLength,
      globalStringMaxLengthRule
    ),
  },
}
