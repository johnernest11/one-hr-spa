export type ApiResponseBody = {
  success: boolean
  data?: Array<object> | object
  file?: Blob
  message?: string
  error_code?: string
  error_message?: string
  errors?: Array<{ field: string; messages: string[] }>
  pagination?: ApiResponsePagination
}

export type ApiResponsePagination = {
  current_page: number
  last_page: number
  first_page_url: string
  last_page_url: string
  next_page_url: string | null
  previous_page_url: string | null
  from: number
  to: number
  per_page: number
  total: number
  path: string
}

export type ApiResponseData = {
  id: number | string
  created_at?: string
  updated_at?: string
  deleted_at?: string
}

export enum ApiErrorCode {
  UNAUTHENTICATED_ERROR = 'UNAUTHENTICATED_ERROR',
  UNAUTHORIZED_ERROR = 'UNAUTHORIZED_ERROR',
  FORBIDDEN_ERROR = 'FORBIDDEN_ERROR',
  INVALID_CREDENTIALS_ERROR = 'INVALID_CREDENTIALS_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SMTP_ERROR = 'SMTP_ERROR',
  RESOURCE_NOT_FOUND_ERROR = 'RESOURCE_NOT_FOUND_ERROR',
  TOO_MANY_REQUESTS_ERROR = 'TOO_MANY_REQUESTS_ERROR',
  INCORRECT_OLD_PASSWORD_ERROR = 'INCORRECT_OLD_PASSWORD_ERROR',
  PAYLOAD_TOO_LARGE_ERROR = 'PAYLOAD_TOO_LARGE_ERROR',
  EMAIL_NOT_VERIFIED_ERROR = 'EMAIL_NOT_VERIFIED_ERROR',
  BAD_REQUEST_ERROR = 'BAD_REQUEST_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  INVALID_MFA_ATTEMPT_TOKEN_ERROR = 'INVALID_MFA_ATTEMPT_TOKEN_ERROR',
  INVALID_MFA_CODE_ERROR = 'INVALID_MFA_CODE_ERROR',
  INVALID_MFA_BACKUP_CODE_ERROR = 'INVALID_MFA_BACKUP_CODE_ERROR',
}
