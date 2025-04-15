import { defineStore, storeToRefs } from 'pinia'
import { useApiCall } from '@/composables/network'
import { useAuthStore } from '@/stores/auth.store.ts'
import { UserResponse } from '@/typings/models.types.ts'
import { ApiResponseBody } from '@/typings/http-resources.types.ts'
import { useDateFormat } from '@vueuse/core'

/** Typings */
export type UploadProfilePictureResponse = { owner_id: string | number; path: string; url: string }

export type PersonalDataSheetPayload = {
  first_name: string
  last_name: string
  middle_name: string
  ext_name: string
  birthday: string
  sex: 'male' | 'female' | null
  /**Personnel Data Sheet  */
  place_of_birth: string
  civil_status: 'single' | 'married' | 'separated' | 'divorced' | 'widowed' | null
  height: string
  weight: string
  blood_type: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | '0+' | '0-' | null
  philhealth_no: string
  gsis_no: string
  pag_ibig_no: string
  sss_no: string
  tin_no: string
  agency_employee_no: string
  citizenship: string
  citizenship_country: string
  /**Personnel Data Sheet Contact Info*/
  tel_no: string
  mobile_no: string
  email_address: string
  /**Personnel Data Sheet Address */
  residential_house_block_lot_no: string
  residential_street: string
  residential_subdivision_village: string
  residential_brgy_id: string | number
  residential_citynum_id: string | number
  residential_province_id: string | number
  residential_region_id: string | number
  residential_zip_code: string
  permanent_house_block_lot_no: string
  permanent_street: string | null
  permanent_subdivision_village: string
  permanent_brgy_id: string | number
  permanent_citynum_id: string | number
  permanent_province_id: string | number
  permanent_region_id: string | number
  permanent_zip_code: string
  /**Personnel Data Sheet Family */
  family_first_name: string
  family_middle_name: string | null
  family_last_name: string
  family_ext_name: string | null
  family_occupation: string
  family_employers_business_name: string
  family_business_address: string
  family_telephone_no: string
  family_date_of_birth: string
  family_class: 'spouse' | 'father' | 'mother' | 'children' | null
  /**Personnel Data Sheet EducationalBackground */
  schools_name: string
  level: 'elementary' | 'high school' | 'college' | 'graduate' | null
  period_of_attendance_from: string
  period_of_attendance_to: string
  highest_level_units_earned: string | null
  year_graduated: string
  scholarship_academic_honors_received: string
}

export const useProfileStore = defineStore('profile', () => {
  /**
   * VueUse's useStorage() loses reactivity after serialization,
   * we make it reactive again by wrapping storeToRefs()
   *
   * @see https://pinia.vuejs.org/core-concepts/#Destructuring-from-a-Store
   */
  const auth = storeToRefs(useAuthStore())

  const fetchPersonalDataSheet = async () => {
    const { data } = await useApiCall('/profile', auth.authenticationToken.value).get().json()

    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      auth.authenticatedUser.value = responseBody.data as UserResponse
    }

    return responseBody
  }

  const updatePersonalDataSheet = async (payload: Partial<PersonalDataSheetPayload>) => {
    // The API only accepts Y-m-d format (2024-01-31)
    if (payload.birthday) {
      payload.birthday = useDateFormat(payload.birthday, 'YYYY-MM-DD').value.toString()
    }

    const { data } = await useApiCall('/profile', auth.authenticationToken.value).patch(payload).json()

    const responseBody: ApiResponseBody = data.value
    if (responseBody.success) {
      auth.authenticatedUser.value = responseBody.data as UserResponse
    }

    return responseBody
  }

  const uploadPersonalDataSheetPicture = async (payload: FormData) => {
    const { data } = await useApiCall('/profile/profile-picture', auth.authenticationToken.value).post(payload).json()

    const responseBody: ApiResponseBody = data.value
    if (responseBody.success && auth.authenticatedUser.value.user_profile) {
      const uploadProfilePictureResponse = responseBody.data as UploadProfilePictureResponse
      auth.authenticatedUser.value.user_profile.profile_picture_url = uploadProfilePictureResponse.url
    }

    return responseBody
  }

  return {
    fetchPersonalDataSheet,
    updatePersonalDataSheet,
    uploadPersonalDataSheetPicture,
  }
})
