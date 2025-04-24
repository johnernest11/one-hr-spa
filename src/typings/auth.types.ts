export const enum AuthType {
  AUTHENTICATED = 'authenticated',
  UNAUTHENTICATED = 'unauthenticated',
  OPEN = 'open',
  MFA = 'mfa',
}

export enum AuthRole {
  STANDARD_USER = 'standard_user',
  EMPLOYEE = 'employee',
  HR_PAS_ADMIN = 'hr_pas_admin',
  HR_PPMS_ADMIN = 'hr_ppms_admin',
  ADMIN = 'admin',
  SUPER_USER = 'super_user',
  SYSTEM_SUPPORT = 'system_support',
}
