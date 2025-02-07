export const enum AuthType {
  AUTHENTICATED = 'authenticated',
  UNAUTHENTICATED = 'unauthenticated',
  OPEN = 'open',
  MFA = 'mfa',
}

export enum AuthRole {
  STANDARD_USER = 'standard_user',
  EMPLOYEE = 'employee',
  HR_ADMIN_PAS = 'hr_admin_pas',
  HR_ADMIN_PPMS = 'hr_admin_ppms',
  ADMIN = 'admin',
  SUPER_USER = 'super_user',
  SYSTEM_SUPPORT = 'system_support',
}
