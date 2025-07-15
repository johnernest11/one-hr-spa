import { ApiResponseBody, ApiErrorCode } from '@/typings/http-resources.types.ts'

/** @description Format the error response from the API */
export const parseApiResponseError = (response: ApiResponseBody) => {
  if (!response?.error_code) return null

  const message = getErrorMessage(response.error_code, response.error_message)
  const errors = []
  if (Array.isArray(response.errors) && !!response.errors.length) {
    for (const error of response.errors) {
      errors.push(error.messages)
    }
  }

  return { code: response.error_code, message, errors: errors.flat() }
}

export const parseApiImportPDSResponseError = (response: ApiResponseBody) => {
  if (!response?.error_code) return null

  if (response.message?.includes('Duplicate entry') && response.message?.includes('individual_name_birthday_unique')) {
    return {
      code: response.error_code,
      message: 'An individual with the same first name, middle name, last name, extension name, and birthdate already exists.',
      errors: [],
    }
  }

  const message = getErrorMessage(response.error_code, response.error_message)

  const errors: string[] = []
  if (Array.isArray(response.errors) && response.errors.length > 0) {
    for (const error of response.errors) {
      if (typeof error === 'string') {
        errors.push(error)
      } else if (error?.messages) {
        errors.push(...error.messages)
      }
    }
  }

  return { code: response.error_code, message, errors }
}

const getErrorMessage = (errorCode: string, errorMessage?: string) => {
  let message: string
  switch (errorCode) {
    case ApiErrorCode[ApiErrorCode.UNAUTHENTICATED_ERROR]:
      message = 'Your login session has expired'
      break
    case ApiErrorCode[ApiErrorCode.UNAUTHORIZED_ERROR]:
      message = 'You are not authorized to access this section'
      break
    case ApiErrorCode[ApiErrorCode.FORBIDDEN_ERROR]:
      message = 'You are not allowed to access this section'
      break
    case ApiErrorCode[ApiErrorCode.INVALID_CREDENTIALS_ERROR]:
      message = 'Incorrect email or password'
      break
    case ApiErrorCode[ApiErrorCode.VALIDATION_ERROR]:
      message = "Please fix the issues with the details you've provided"
      break
    case ApiErrorCode[ApiErrorCode.SMTP_ERROR]:
      message = "Sorry, we've encountered problems sending your email"
      break
    case ApiErrorCode[ApiErrorCode.RESOURCE_NOT_FOUND_ERROR]:
      message = 'Sorry, the data you are looking for seems to be missing in our database'
      break
    case ApiErrorCode[ApiErrorCode.TOO_MANY_REQUESTS_ERROR]:
      message = "We've received too many request from you. Please try again later."
      break
    case ApiErrorCode[ApiErrorCode.INCORRECT_OLD_PASSWORD_ERROR]:
      message = "The current password you've entered is incorrect"
      break
    case ApiErrorCode[ApiErrorCode.PAYLOAD_TOO_LARGE_ERROR]:
      message = "The file you're uploading is too large"
      break
    case ApiErrorCode[ApiErrorCode.EMAIL_NOT_VERIFIED_ERROR]:
      message = 'Please validate your email address before proceeding'
      break
    case ApiErrorCode[ApiErrorCode.BAD_REQUEST_ERROR]:
      message = errorMessage || "Sorry, but we can't process your request"
      break
    default:
      message = 'Something went wrong. Please contact our technical support'
  }
  return message
}
