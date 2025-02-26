import { createRouter, createWebHistory, RouteMeta } from 'vue-router'
import { vueApp } from '@/app.ts'
import Dashboard from '@/views/DashboardPage.vue'
import ProfilePage from '@/views/ProfilePage.vue'
import SupportPage from '@/views/SupportPage.vue'
import AccomplishmentReportPage from '@/views/AccomplishmentReportPage.vue'
import CreateAccomplishmentReportForm from '@/components/accomplishment-report/CreateAccomplishmentReportForm.vue'
import ViewAccomplishmentReport from '@/components/accomplishment-report/ViewAccomplishmentReport.vue'
import AboutUsPage from '@/views/AboutUsPage.vue'
import AnnouncementsPage from '@/views/AnnouncementsPage.vue'
import { AuthRole, AuthType } from '@/typings/auth.types.ts'
import { useAuthStore } from '@/stores/auth.store.ts'

const enum RouteGroup {
  MAIN = 'Main',
  ADMIN_TOOLS = 'Admin Tools',
  MISC = 'Misc',
  AUTH = 'Auth',
}

const routes = [
  {
    path: '',
    name: 'dashboard',
    component: Dashboard,
    meta: <RouteMeta>{
      group: RouteGroup.MAIN,
      label: 'Home',
      isSidebarMenu: true,
      authType: AuthType.AUTHENTICATED,
      roles: [AuthRole.STANDARD_USER, AuthRole.EMPLOYEE, AuthRole.ADMIN, AuthRole.SYSTEM_SUPPORT, AuthRole.SUPER_USER],
    },
  },

  {
    path: '/announcements',
    name: 'announcements',
    component: AnnouncementsPage,
    meta: <RouteMeta>{
      group: RouteGroup.MAIN,
      label: 'Request',
      isSidebarMenu: true,
      authType: AuthType.AUTHENTICATED,
      roles: [AuthRole.STANDARD_USER, AuthRole.EMPLOYEE, AuthRole.ADMIN, AuthRole.SYSTEM_SUPPORT, AuthRole.SUPER_USER],
    },
  },
  {
    path: '/profile',
    name: 'profile',
    component: ProfilePage,
    meta: <RouteMeta>{
      group: RouteGroup.MAIN,
      label: 'My Profile',
      isSidebarMenu: true,
      authType: AuthType.AUTHENTICATED,
      roles: [AuthRole.STANDARD_USER, AuthRole.EMPLOYEE, AuthRole.ADMIN, AuthRole.SYSTEM_SUPPORT, AuthRole.SUPER_USER],
    },
  },
  {
    path: '/commitments',
    name: 'commitments',
    meta: <RouteMeta>{
      group: RouteGroup.MAIN,
      label: 'Commitments',
      isSidebarMenu: true,
    },
    children: [
      {
        path: '/accomplishment-reports',
        name: 'accomplishment-reports',
        component: AccomplishmentReportPage,
        meta: <RouteMeta>{
          label: 'ARs',
          isSidebarMenu: true,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.STANDARD_USER, AuthRole.EMPLOYEE, AuthRole.ADMIN, AuthRole.SYSTEM_SUPPORT, AuthRole.SUPER_USER],
        },
      },
      {
        path: '/accomplishment-reports/store',
        name: 'accomplishment-reports/store',
        component: CreateAccomplishmentReportForm,
        meta: <RouteMeta>{
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.STANDARD_USER, AuthRole.EMPLOYEE, AuthRole.ADMIN, AuthRole.SYSTEM_SUPPORT, AuthRole.SUPER_USER],
        },
      },
      {
        path: '/accomplishment-reports/:id/editor',
        name: 'accomplishment-reports/editor',
        component: ViewAccomplishmentReport,
        meta: <RouteMeta>{
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.STANDARD_USER, AuthRole.EMPLOYEE, AuthRole.ADMIN, AuthRole.SYSTEM_SUPPORT, AuthRole.SUPER_USER],
        },
      },

      {
        path: '/ipcipc-ccef/',
        name: 'view-ipc-ccef/index',
        component: ViewAccomplishmentReport,
        meta: <RouteMeta>{
          label: 'IPC/CCEF',
          isSidebarMenu: true,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.STANDARD_USER, AuthRole.EMPLOYEE, AuthRole.ADMIN, AuthRole.SYSTEM_SUPPORT, AuthRole.SUPER_USER],
        },
      },
    ],
  },
  {
    path: '/support',
    name: 'support',
    component: SupportPage,
    meta: <RouteMeta>{
      group: RouteGroup.MISC,
      label: 'Support',
      isSidebarMenu: true,
      authType: AuthType.AUTHENTICATED,
      roles: [AuthRole.STANDARD_USER, AuthRole.ADMIN, AuthRole.SYSTEM_SUPPORT, AuthRole.SUPER_USER],
    },
  },
  {
    path: '/about-us',
    name: 'about-us',
    component: AboutUsPage,
    meta: <RouteMeta>{
      group: RouteGroup.MISC,
      label: 'About Us',
      isSidebarMenu: true,
      authType: AuthType.AUTHENTICATED,
      roles: [AuthRole.STANDARD_USER, AuthRole.ADMIN, AuthRole.SYSTEM_SUPPORT, AuthRole.SUPER_USER],
    },
  },
  {
    path: '/auth',
    name: 'auth',
    redirect: { name: 'login' },
    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import('@/views/AuthPage.vue'),
        meta: <RouteMeta>{
          label: 'Login',
          hideNavigation: true,
          authType: AuthType.UNAUTHENTICATED,
          group: RouteGroup.AUTH,
        },
      },
      {
        path: 'sign-up',
        name: 'sign-up',
        component: () => import('@/views/AuthPage.vue'),
        meta: <RouteMeta>{
          label: 'Sign Up',
          hideNavigation: true,
          authType: AuthType.UNAUTHENTICATED,
          group: RouteGroup.AUTH,
        },
      },
      {
        path: 'forgot-password',
        name: 'forgot-password',
        component: () => import('@/views/ForgotPasswordPage.vue'),
        meta: <RouteMeta>{
          label: 'Forgot Password',
          hideNavigation: true,
          authType: AuthType.UNAUTHENTICATED,
          group: RouteGroup.AUTH,
        },
      },
      {
        path: 'reset-password',
        name: 'reset-password',
        component: () => import('@/views/ResetPasswordPage.vue'),
        meta: <RouteMeta>{
          label: 'Reset Password',
          hideNavigation: true,
          authType: AuthType.UNAUTHENTICATED,
          group: RouteGroup.AUTH,
        },
      },
      {
        path: 'verify-email-guard',
        name: 'verify-email-guard',
        component: () => import('@/views/misc/VerifyEmailGuardPage.vue'),
        meta: <RouteMeta>{
          label: 'Verify Email',
          hideNavigation: true,
          authType: AuthType.AUTHENTICATED,
        },
      },
      {
        path: 'verify-email/:id/:hash',
        name: 'process-email-verification',
        component: () => import('@/views/misc/ProcessEmailVerificationPage.vue'),
        meta: <RouteMeta>{
          label: 'Email Verification In-progress',
          hideNavigation: true,
          authType: AuthType.OPEN,
        },
      },
      {
        path: 'verify-account/:id/:hash',
        name: 'verify-account',
        component: () => import('@/views/misc/VerifyAccountPage.vue'),
        meta: <RouteMeta>{
          label: 'Verify Your Account',
          hideNavigation: true,
          authType: AuthType.OPEN,
        },
      },
      {
        path: 'mfa-guard',
        name: 'mfa-guard-page',
        component: () => import('@/views/misc/MfaGuardPage.vue'),
        meta: <RouteMeta>{
          label: 'Multi-Factor Authentication',
          hideNavigation: true,
          authType: AuthType.MFA,
        },
      },
    ],
  },
  {
    path: '/admin',
    name: 'admin-tools',
    redirect: { name: 'user-management' },
    children: [
      {
        path: 'user-management',
        name: 'user-management',
        component: () => import('@/views/UsersManagementPage.vue'),
        meta: <RouteMeta>{
          label: 'User Management',
          isSidebarMenu: true,
          group: RouteGroup.ADMIN_TOOLS,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/views/SettingsPage.vue'),
        meta: <RouteMeta>{
          label: 'Settings',
          isSidebarMenu: true,
          group: RouteGroup.ADMIN_TOOLS,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },
    ],
  },
  {
    path: '/:catchAll(.*)',
    name: 'not-found',
    component: () => import('@/views/misc/404Page.vue'),
    meta: <RouteMeta>{
      label: 'Page not found',
      hideNavigation: true,
      authType: AuthType.OPEN,
    },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

/** Route Guards **/
const appName = import.meta.env.VITE_APP_NAME
router.beforeEach(async (to, from) => {
  // Always scroll to the top of the page
  window.scrollTo(0, 0)

  // Redirect 'domain.com/auth' to 'domain.com/auth/sign-up'
  if (to.name === 'auth') {
    return { name: 'sign-up' }
  }

  // Block authenticated users to routes that require them to be unauthenticated
  // Ex. Login, Sign-up, Forgot Password
  const authStore = useAuthStore()
  if (authStore.isAuthenticated && !authStore.authExpired && to.meta.authType === AuthType.UNAUTHENTICATED) {
    return from
  }

  // Redirect users to the Verify Email Guard Page if they are authenticated but don't have their email verified
  if (
    to.meta.authType === AuthType.AUTHENTICATED &&
    authStore.isAuthenticated &&
    to.name !== 'verify-email-guard' &&
    to.name !== 'verify-account' && // this page is omitted, uses can access even if their email is unverified
    !authStore.authEmailIsVerified
  ) {
    return { name: 'verify-email-guard' }
  }

  // Verify email guard page can only be accessed if the user have not validated their email address
  if (to.name === 'verify-email-guard' && authStore.authEmailIsVerified) {
    return { name: 'dashboard' }
  }

  // Protect routes that need authentication
  if (to.meta.authType === AuthType.AUTHENTICATED && !authStore.isAuthenticated) {
    if (authStore.mfaToken) return { name: 'mfa-guard-page' }
    return { name: 'login' }
  }

  // Protect routes that need certain roles to access
  if (to.meta.authType === AuthType.AUTHENTICATED) {
    const roles = authStore.authRoles
    if (to.meta.roles && !to.meta.roles.some((r: string) => roles.includes(r))) {
      return { name: 'main' }
    }
  }

  // Protect routes that need an MFA token to access
  if (to.meta.authType === AuthType.MFA && !authStore.mfaToken) {
    return { name: 'login' }
  }

  // Change the browser tab title
  document.title = `${appName} | ${to.meta.label}` || appName
})

/**
 * Extending vue-router type
 * @see https://router.vuejs.org/guide/advanced/meta.html#TypeScript
 */
export {}

declare module 'vue-router' {
  interface RouteMeta {
    group?: RouteGroup
    label: string
    isSidebarMenu?: boolean
    hideNavigation?: boolean
    roles?: AuthRole[]
    authType: AuthType
  }
}

vueApp.use(router)
