import { createRouter, createWebHistory, RouteMeta } from 'vue-router'
import { vueApp } from '@/app.ts'
import Dashboard from '@/views/DashboardPage.vue'
import SupportPage from '@/views/SupportPage.vue'
import AccomplishmentReportPage from '@/views/commitment/AccomplishmentReportPage.vue'
import ItemNumberPage from '@/views/human-resources/ItemNumberPage.vue'
import ItemNumberForm from '@/components/item-number/ItemNumberForm.vue'
import AboutUsPage from '@/views/AboutUsPage.vue'
import { AuthRole, AuthType } from '@/typings/auth.types.ts'
import { useAuthStore } from '@/stores/auth.store.ts'
import TimeLogPage from '@/views/TimeLogPage.vue'

const enum RouteGroup {
  MAIN = 'Main',
  HUMAN_RESOURCES = 'Human Resources',
  IMMEDIATE_SUPERVISOR = 'Unit / Section / Division Head',
  ADMIN_TOOLS = 'Admin Tools',
  MISC = 'Misc',
  AUTH = 'Auth',
}

const routes = [
  /* Main Routes*/
  {
    path: '',
    name: 'dashboard',
    component: Dashboard,
    meta: <RouteMeta>{
      group: RouteGroup.MAIN,
      label: 'Home',
      isSidebarMenu: true,
      authType: AuthType.AUTHENTICATED,
      roles: [
        AuthRole.STANDARD_USER,
        AuthRole.SECTION_HEAD,
        AuthRole.DIVISION_HEAD,
        AuthRole.HR_PPMS_ADMIN,
        AuthRole.HR_PAS_ADMIN,
        AuthRole.ADMIN,
        AuthRole.SUPER_USER,
        AuthRole.SYSTEM_SUPPORT,
        AuthRole.TIME_LOGGER,
      ],
    },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/ProfilePage.vue'),
    meta: <RouteMeta>{
      isSidebarMenu: false,
      authType: AuthType.AUTHENTICATED,
      roles: [
        AuthRole.STANDARD_USER,
        AuthRole.SECTION_HEAD,
        AuthRole.DIVISION_HEAD,
        AuthRole.HR_PPMS_ADMIN,
        AuthRole.HR_PAS_ADMIN,
        AuthRole.ADMIN,
        AuthRole.SUPER_USER,
        AuthRole.SYSTEM_SUPPORT,
      ],
    },
  },
  {
    path: '/time-logs',
    name: 'time-logs',
    component: TimeLogPage,
    meta: <RouteMeta>{
      group: RouteGroup.MAIN,
      label: 'Time Logs',
      isSidebarMenu: true,
      authType: AuthType.AUTHENTICATED,
      hideNavigation: true,
      roles: [AuthRole.SUPER_USER, AuthRole.TIME_LOGGER],
    },
  },
  /*My Profile */
  {
    path: '/my-profile',
    name: 'my-profile',
    meta: <RouteMeta>{
      group: RouteGroup.MAIN,
      label: 'My Profile',
      isSidebarMenu: true,
      authType: AuthType.AUTHENTICATED,
      roles: [
        AuthRole.STANDARD_USER,
        AuthRole.SECTION_HEAD,
        AuthRole.DIVISION_HEAD,
        AuthRole.HR_PPMS_ADMIN,
        AuthRole.HR_PAS_ADMIN,
        AuthRole.ADMIN,
        AuthRole.SUPER_USER,
        AuthRole.SYSTEM_SUPPORT,
      ],
    },
    children: [
      {
        path: '/my-employee-profile',
        name: 'my-employee-profile',
        component: () => import('@/views/personnel/EmployeeProfilingPage.vue'),
        meta: <RouteMeta>{
          label: 'My Employee Profile',
          isSidebarMenu: true,
          authType: AuthType.AUTHENTICATED,
          roles: [
            AuthRole.STANDARD_USER,
            AuthRole.SECTION_HEAD,
            AuthRole.DIVISION_HEAD,
            AuthRole.HR_PPMS_ADMIN,
            AuthRole.HR_PAS_ADMIN,
            AuthRole.ADMIN,
            AuthRole.SUPER_USER,
            AuthRole.SYSTEM_SUPPORT,
          ],
        },
      },
      {
        path: '/my-wes',
        name: 'my-wes',
        component: () => import('@/views/personnel/WorkExperienceSheetPage.vue'),
        meta: <RouteMeta>{
          label: 'Work Experience Sheet',
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [
            AuthRole.STANDARD_USER,
            AuthRole.SECTION_HEAD,
            AuthRole.DIVISION_HEAD,
            AuthRole.HR_PPMS_ADMIN,
            AuthRole.HR_PAS_ADMIN,
            AuthRole.ADMIN,
            AuthRole.SUPER_USER,
            AuthRole.SYSTEM_SUPPORT,
          ],
        },
      },
      {
        path: '/my-wes/store',
        name: 'my-wes/store',
        component: () => import('@/components/wes/WorkExperienceSheetForm.vue'),
        meta: <RouteMeta>{
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [
            AuthRole.STANDARD_USER,
            AuthRole.SECTION_HEAD,
            AuthRole.DIVISION_HEAD,
            AuthRole.HR_PPMS_ADMIN,
            AuthRole.HR_PAS_ADMIN,
            AuthRole.ADMIN,
            AuthRole.SUPER_USER,
            AuthRole.SYSTEM_SUPPORT,
          ],
        },
      },
      {
        path: '/my-leaveapplications',
        name: 'my-leaveapplications',
        component: () => import('@/views/personnel/LeaveApplicationPage.vue'),
        meta: <RouteMeta>{
          label: 'Leave Application',
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [
            AuthRole.STANDARD_USER,
            AuthRole.SECTION_HEAD,
            AuthRole.DIVISION_HEAD,
            AuthRole.HR_PPMS_ADMIN,
            AuthRole.HR_PAS_ADMIN,
            AuthRole.ADMIN,
            AuthRole.SUPER_USER,
            AuthRole.SYSTEM_SUPPORT,
          ],
        },
      },
      {
        path: '/my-leaveapplications/store',
        name: 'my-leaveapplications/store',
        component: () => import('@/components/leave/ApplicationLeaveForm.vue'),
        meta: <RouteMeta>{
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [
            AuthRole.STANDARD_USER,
            AuthRole.HR_PPMS_ADMIN,
            AuthRole.HR_PAS_ADMIN,
            AuthRole.ADMIN,
            AuthRole.SYSTEM_SUPPORT,
            AuthRole.SUPER_USER,
          ],
        },
      },
      {
        path: '/my-leaveapplications/:id/editor',
        name: 'my-leaveapplications/editor',
        component: () => import('@/components/leave/ApplicationLeaveForm.vue'),
        meta: <RouteMeta>{
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [
            AuthRole.STANDARD_USER,
            AuthRole.HR_PPMS_ADMIN,
            AuthRole.HR_PAS_ADMIN,
            AuthRole.ADMIN,
            AuthRole.SYSTEM_SUPPORT,
            AuthRole.SUPER_USER,
          ],
        },
      },
      {
        path: '/my-payslips',
        name: 'my-payslips',
        component: () => import('@/views/personnel/PayslipPage.vue'),
        meta: <RouteMeta>{
          label: 'Payslip',
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [
            AuthRole.STANDARD_USER,
            AuthRole.SECTION_HEAD,
            AuthRole.DIVISION_HEAD,
            AuthRole.HR_PPMS_ADMIN,
            AuthRole.HR_PAS_ADMIN,
            AuthRole.ADMIN,
            AuthRole.SUPER_USER,
            AuthRole.SYSTEM_SUPPORT,
          ],
        },
      },
      {
        path: '/my-payslip/:id/editor',
        name: 'my-payslip/editor',
        component: () => import('@/components/payslip/PayslipView.vue'),
        meta: <RouteMeta>{
          label: 'Payslip',
          authType: AuthType.AUTHENTICATED,
          roles: [
            AuthRole.STANDARD_USER,
            AuthRole.SECTION_HEAD,
            AuthRole.DIVISION_HEAD,
            AuthRole.HR_PPMS_ADMIN,
            AuthRole.HR_PAS_ADMIN,
            AuthRole.ADMIN,
            AuthRole.SUPER_USER,
            AuthRole.SYSTEM_SUPPORT,
          ],
        },
      },
      {
        path: '/my-dtrs/:id?',
        name: 'my-dtrs',
        component: () => import('@/views/personnel/DailyTimeRecordPage.vue'),
        meta: <RouteMeta>{
          label: 'Daily Time Record',
          isSidebarMenu: true,
          authType: AuthType.AUTHENTICATED,
          roles: [
            AuthRole.STANDARD_USER,
            AuthRole.SECTION_HEAD,
            AuthRole.DIVISION_HEAD,
            AuthRole.HR_PPMS_ADMIN,
            AuthRole.HR_PAS_ADMIN,
            AuthRole.ADMIN,
            AuthRole.SUPER_USER,
            AuthRole.SYSTEM_SUPPORT,
          ],
        },
      },
      {
        path: '/my-monthly-dtrs/:id?/:year/:month',
        name: 'my-monthly-dtrs',
        component: () => import('@/components/dtr/MyDTR.vue'),
        meta: <RouteMeta>{
          label: 'Daily Time Record',
          authType: AuthType.AUTHENTICATED,
          roles: [
            AuthRole.STANDARD_USER,
            AuthRole.SECTION_HEAD,
            AuthRole.DIVISION_HEAD,
            AuthRole.HR_PPMS_ADMIN,
            AuthRole.HR_PAS_ADMIN,
            AuthRole.ADMIN,
            AuthRole.SUPER_USER,
            AuthRole.SYSTEM_SUPPORT,
          ],
        },
      },

      {
        path: '/my-dtrs/list/:id?',
        name: 'my-dtrs/list',
        component: () => import('@/components/dtr/DTRList.vue'),
        meta: <RouteMeta>{
          label: 'Daily Time Record',
          authType: AuthType.AUTHENTICATED,
          roles: [
            AuthRole.STANDARD_USER,
            AuthRole.SECTION_HEAD,
            AuthRole.DIVISION_HEAD,
            AuthRole.HR_PPMS_ADMIN,
            AuthRole.HR_PAS_ADMIN,
            AuthRole.ADMIN,
            AuthRole.SUPER_USER,
            AuthRole.SYSTEM_SUPPORT,
          ],
        },
      },

      {
        path: '/my-service-records/:id?',
        name: 'my-service-records',
        component: () => import('@/components/service-record/ServiceRecordForm.vue'),
        meta: <RouteMeta>{
          label: 'My Service Records',
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.STANDARD_USER, AuthRole.HR_PPMS_ADMIN, AuthRole.HR_PAS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },
      {
        path: '/my-cocs',
        name: 'my-cocs',
        component: () => import('@/views/personnel/CompensatoryPage.vue'),
        meta: <RouteMeta>{
          label: 'Compensatory Overtime Credit',
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [
            AuthRole.STANDARD_USER,
            AuthRole.SECTION_HEAD,
            AuthRole.DIVISION_HEAD,
            AuthRole.HR_PPMS_ADMIN,
            AuthRole.HR_PAS_ADMIN,
            AuthRole.ADMIN,
            AuthRole.SUPER_USER,
            AuthRole.SYSTEM_SUPPORT,
          ],
        },
      },
      {
        path: '/my-cocs/list',
        name: 'my-cocs/list',
        component: () => import('@/components/compensatory-time-off/CompensantoryOvertimeCreditList.vue'),
        meta: <RouteMeta>{
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [
            AuthRole.STANDARD_USER,
            AuthRole.SECTION_HEAD,
            AuthRole.DIVISION_HEAD,
            AuthRole.HR_PPMS_ADMIN,
            AuthRole.HR_PAS_ADMIN,
            AuthRole.ADMIN,
            AuthRole.SUPER_USER,
            AuthRole.SYSTEM_SUPPORT,
          ],
        },
      },
      {
        path: '/my-leavecredits',
        name: 'my-leavecredits',
        component: () => import('@/views/personnel/LeaveCreditsPage.vue'),
        meta: <RouteMeta>{
          label: 'Leave Credits',
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [
            AuthRole.STANDARD_USER,
            AuthRole.SECTION_HEAD,
            AuthRole.DIVISION_HEAD,
            AuthRole.HR_PPMS_ADMIN,
            AuthRole.HR_PAS_ADMIN,
            AuthRole.ADMIN,
            AuthRole.SUPER_USER,
            AuthRole.SYSTEM_SUPPORT,
          ],
        },
      },
    ],
  },

  /*Request Routes */
  {
    path: '/requests',
    name: 'requests',
    meta: <RouteMeta>{
      group: RouteGroup.MAIN,
      label: 'Requests',
      isSidebarMenu: true,
      authType: AuthType.AUTHENTICATED,
      roles: [
        AuthRole.STANDARD_USER,
        AuthRole.SECTION_HEAD,
        AuthRole.DIVISION_HEAD,
        AuthRole.HR_PPMS_ADMIN,
        AuthRole.HR_PAS_ADMIN,
        AuthRole.ADMIN,
        AuthRole.SUPER_USER,
        AuthRole.SYSTEM_SUPPORT,
      ],
    },
    children: [
      {
        path: '/request-documents/:id?',
        name: 'request-documents',
        component: () => import('@/views/request/DocumentsPage.vue'),
        meta: <RouteMeta>{
          label: 'Documents',
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [
            AuthRole.STANDARD_USER,
            AuthRole.SECTION_HEAD,
            AuthRole.DIVISION_HEAD,
            AuthRole.HR_PPMS_ADMIN,
            AuthRole.HR_PAS_ADMIN,
            AuthRole.ADMIN,
            AuthRole.SYSTEM_SUPPORT,
            AuthRole.SUPER_USER,
          ],
        },
      },
      {
        path: '/request-documents/store',
        name: 'request-documents/store',
        component: () => import('@/components/request/DocumentRequestForm.vue'),
        meta: <RouteMeta>{
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [
            AuthRole.STANDARD_USER,
            AuthRole.HR_PPMS_ADMIN,
            AuthRole.HR_PAS_ADMIN,
            AuthRole.ADMIN,
            AuthRole.SYSTEM_SUPPORT,
            AuthRole.SUPER_USER,
          ],
        },
      },
      {
        path: '/request-documents/:id/editor',
        name: 'request-documents/editor',
        component: () => import('@/components/request/DocumentRequestForm.vue'),
        meta: <RouteMeta>{
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [
            AuthRole.STANDARD_USER,
            AuthRole.HR_PPMS_ADMIN,
            AuthRole.HR_PAS_ADMIN,
            AuthRole.ADMIN,
            AuthRole.SYSTEM_SUPPORT,
            AuthRole.SUPER_USER,
          ],
        },
      },
      {
        path: '/my-locator-slips',
        name: 'my-locator-slips',
        component: () => import('@/views/request/LocatorSlipsPage.vue'),
        meta: <RouteMeta>{
          label: 'My Locator Slip',
          isSidebarMenu: true,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.STANDARD_USER, AuthRole.HR_PPMS_ADMIN, AuthRole.HR_PAS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },
      {
        path: '/my-locator-slips/:id/editor',
        name: 'my-locator-slips/editor',
        component: () => import('@/components/locator-slip/LocatorSlipForm.vue'),
        meta: <RouteMeta>{
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.STANDARD_USER, AuthRole.HR_PPMS_ADMIN, AuthRole.HR_PAS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },
    ],
  },
  /*Commitments Routes */
  {
    path: '/commitments',
    name: 'commitments',
    meta: <RouteMeta>{
      group: RouteGroup.MAIN,
      label: 'Commitments',
      isSidebarMenu: true,
      authType: AuthType.AUTHENTICATED,
      roles: [
        AuthRole.STANDARD_USER,
        AuthRole.SECTION_HEAD,
        AuthRole.DIVISION_HEAD,
        AuthRole.HR_PPMS_ADMIN,
        AuthRole.HR_PAS_ADMIN,
        AuthRole.ADMIN,
        AuthRole.SUPER_USER,
        AuthRole.SYSTEM_SUPPORT,
      ],
    },
    children: [
      {
        path: 'accomplishment-reports',
        name: 'accomplishment-reports',
        component: AccomplishmentReportPage,
        meta: <RouteMeta>{
          label: 'ARs',
          isSidebarMenu: true,
          authType: AuthType.AUTHENTICATED,
          roles: [
            AuthRole.STANDARD_USER,
            AuthRole.SECTION_HEAD,
            AuthRole.DIVISION_HEAD,
            AuthRole.HR_PPMS_ADMIN,
            AuthRole.HR_PAS_ADMIN,
            AuthRole.ADMIN,
            AuthRole.SUPER_USER,
            AuthRole.SYSTEM_SUPPORT,
          ],
        },
      },
      {
        path: 'accomplishment-reports/store',
        name: 'accomplishment-reports/store',
        component: () => import('@/components/accomplishment-report/AccomplishmentReportForm.vue'),
        meta: <RouteMeta>{
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [
            AuthRole.STANDARD_USER,
            AuthRole.SECTION_HEAD,
            AuthRole.DIVISION_HEAD,
            AuthRole.HR_PPMS_ADMIN,
            AuthRole.HR_PAS_ADMIN,
            AuthRole.ADMIN,
            AuthRole.SUPER_USER,
            AuthRole.SYSTEM_SUPPORT,
          ],
        },
      },
      {
        path: 'accomplishment-reports/:id/editor',
        name: 'accomplishment-reports/editor',
        component: () => import('@/components/accomplishment-report/AccomplishmentReportForm.vue'),
        meta: <RouteMeta>{
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [
            AuthRole.STANDARD_USER,
            AuthRole.SECTION_HEAD,
            AuthRole.DIVISION_HEAD,
            AuthRole.HR_PPMS_ADMIN,
            AuthRole.HR_PAS_ADMIN,
            AuthRole.ADMIN,
            AuthRole.SUPER_USER,
            AuthRole.SYSTEM_SUPPORT,
          ],
        },
      },
      {
        path: '/ctdo-reports/:id?',
        name: 'ctdo-reports',
        component: () => import('@/views/commitment/CompensatoryTimeOffPage.vue'),
        meta: <RouteMeta>{
          label: 'CTDos',
          isSidebarMenu: true,
          authType: AuthType.AUTHENTICATED,
          roles: [
            AuthRole.STANDARD_USER,
            AuthRole.SECTION_HEAD,
            AuthRole.DIVISION_HEAD,
            AuthRole.HR_PPMS_ADMIN,
            AuthRole.HR_PAS_ADMIN,
            AuthRole.ADMIN,
            AuthRole.SUPER_USER,
            AuthRole.SYSTEM_SUPPORT,
          ],
        },
      },
      {
        path: '/ctdo-reports/store',
        name: 'ctdo-reports/store',
        component: () => import('@/components/compensatory-time-off/CompensantoryTimeOffForm.vue'),
        meta: <RouteMeta>{
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [
            AuthRole.STANDARD_USER,
            AuthRole.SECTION_HEAD,
            AuthRole.DIVISION_HEAD,
            AuthRole.HR_PPMS_ADMIN,
            AuthRole.HR_PAS_ADMIN,
            AuthRole.ADMIN,
            AuthRole.SUPER_USER,
            AuthRole.SYSTEM_SUPPORT,
          ],
        },
      },
      {
        path: '/ctdo-reports/:id/editor',
        name: 'ctdo-reports/editor',
        component: () => import('@/components/compensatory-time-off/CompensantoryTimeOffForm.vue'),
        meta: <RouteMeta>{
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [
            AuthRole.STANDARD_USER,
            AuthRole.SECTION_HEAD,
            AuthRole.DIVISION_HEAD,
            AuthRole.HR_PPMS_ADMIN,
            AuthRole.HR_PAS_ADMIN,
            AuthRole.ADMIN,
            AuthRole.SUPER_USER,
            AuthRole.SYSTEM_SUPPORT,
          ],
        },
      },
    ],
  },

  /*Responsibility Routes */
  {
    path: '/responsibility',
    name: 'responsibility',
    meta: <RouteMeta>{
      group: RouteGroup.IMMEDIATE_SUPERVISOR,
      label: 'Responsibility',
      isSidebarMenu: false,
      authType: AuthType.AUTHENTICATED,
      roles: [AuthRole.SECTION_HEAD, AuthRole.DIVISION_HEAD, AuthRole.ADMIN, AuthRole.SYSTEM_SUPPORT, AuthRole.SUPER_USER],
    },
    children: [
      {
        path: 'accomplishment-report-list/:id?',
        name: 'accomplishment-report-list',
        component: AccomplishmentReportPage,
        meta: <RouteMeta>{
          label: 'Staff ARs',
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.SECTION_HEAD, AuthRole.ADMIN, AuthRole.SYSTEM_SUPPORT, AuthRole.SUPER_USER],
        },
      },
      {
        path: '/accomplishment-report-list/:id/editor',
        name: 'accomplishment-report-list/editor',
        component: () => import('@/components/accomplishment-report/AccomplishmentReportForm.vue'),
        meta: <RouteMeta>{
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.SECTION_HEAD, AuthRole.ADMIN, AuthRole.SYSTEM_SUPPORT, AuthRole.SUPER_USER],
        },
      },
      {
        path: '/ctdo-report-list/:id?',
        name: 'ctdo-report-list',
        component: () => import('@/views/commitment/CompensatoryTimeOffPage.vue'),
        meta: <RouteMeta>{
          label: 'Staff CTDos',
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.DIVISION_HEAD, AuthRole.ADMIN, AuthRole.SYSTEM_SUPPORT, AuthRole.SUPER_USER],
        },
      },
      {
        path: '/ctdo-report-list/:id/editor',
        name: 'ctdo-report-list/editor',
        component: () => import('@/components/compensatory-time-off/CompensantoryTimeOffForm.vue'),
        meta: <RouteMeta>{
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.DIVISION_HEAD, AuthRole.ADMIN, AuthRole.SYSTEM_SUPPORT, AuthRole.SUPER_USER],
        },
      },
    ],
  },
  /* Human Resources  Routes*/
  /*HRPPMS*/
  {
    path: '/recruitment',
    name: 'recruitment',
    meta: <RouteMeta>{
      group: RouteGroup.HUMAN_RESOURCES,
      label: 'Recruitment',
      isSidebarMenu: true,
      roles: [AuthRole.HR_PPMS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
    },
    children: [
      {
        path: '/hrppms-dashboard',
        name: 'hrppms-dashboard',
        component: () => import('@/views/human-resources/PPMSDashboardPage.vue'),
        meta: <RouteMeta>{
          label: 'Dashboard',
          isSidebarMenu: true,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.HR_PPMS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },
      {
        path: '/items/:id?',
        name: 'item-numbers',
        component: ItemNumberPage,
        meta: <RouteMeta>{
          label: 'Items',
          isSidebarMenu: true,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.HR_PPMS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },
      {
        path: '/items/store',
        name: 'item-numbers/store',
        component: ItemNumberForm,
        meta: <RouteMeta>{
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.HR_PPMS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },
      {
        path: '/item-numbers/:id/editor',
        name: 'item-numbers/editor',
        component: ItemNumberForm,
        meta: <RouteMeta>{
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.HR_PPMS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },
      {
        path: 'employment/:id?',
        name: 'employment',
        component: () => import('@/views/human-resources/EmployeesPage.vue'),
        meta: <RouteMeta>{
          label: 'Employment',
          isSidebarMenu: true,
          authType: AuthType.AUTHENTICATED,
          roles: [
            AuthRole.STANDARD_USER,
            AuthRole.EMPLOYEE,
            AuthRole.HR_PPMS_ADMIN,
            AuthRole.HR_PAS_ADMIN,
            AuthRole.ADMIN,
            AuthRole.SYSTEM_SUPPORT,
            AuthRole.SUPER_USER,
          ],
        },
      },
      {
        path: ':id?/editor',
        name: 'create-personnel',
        component: () => import('@/views/personnel/EmployeeProfilingPage.vue'),
        meta: <RouteMeta>{
          label: 'Create Personnel',
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.HR_PPMS_ADMIN, AuthRole.HR_PAS_ADMIN, AuthRole.ADMIN, AuthRole.SYSTEM_SUPPORT, AuthRole.SUPER_USER],
        },
      },
    ],
  },

  /*PAS*/
  {
    path: '/personnel-managements',
    name: 'personnel-managements',
    meta: <RouteMeta>{
      group: RouteGroup.HUMAN_RESOURCES,
      label: 'Personnel Management',
      isSidebarMenu: true,
      roles: [AuthRole.HR_PAS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
    },
    children: [
      {
        path: '/hrpas-dashboard',
        name: 'hrpas-dashboard',
        component: () => import('@/views/human-resources/PASDashboardPage.vue'),
        meta: <RouteMeta>{
          label: 'Dashboard',
          isSidebarMenu: true,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.HR_PAS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },
      {
        path: '/warm-bodies',
        name: 'warm-bodies',
        component: () => import('@/views/human-resources/WarmBodiesPage.vue'),
        meta: <RouteMeta>{
          label: 'Warm Bodies',
          isSidebarMenu: true,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.HR_PAS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },
      {
        path: '/employees/:id?',
        name: 'employees',
        component: () => import('@/views/human-resources/EmployeesPage.vue'),
        meta: <RouteMeta>{
          label: 'Employee',
          isSidebarMenu: true,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.HR_PAS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },
      {
        path: '/daily-time-records/:id?',
        name: 'daily-time-records',
        component: () => import('@/views/human-resources/DTRPage.vue'),
        meta: <RouteMeta>{
          label: 'Daily Time Record',
          isSidebarMenu: true,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.HR_PAS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },
      {
        path: '/leave-applications/:id?',
        name: 'leave-applications',
        component: () => import('@/views/personnel/LeaveApplicationPage.vue'),
        meta: <RouteMeta>{
          label: 'Leave Application',
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.HR_PAS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },
      {
        path: '/leave-applications/:id/editor',
        name: 'leave-applications/editor',
        component: () => import('@/components/leave/ApplicationLeaveForm.vue'),
        meta: <RouteMeta>{
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.HR_PAS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },

      {
        path: '/locator-slips/',
        name: 'locator-slips',
        component: () => import('@/views/request/LocatorSlipsPage.vue'),
        meta: <RouteMeta>{
          label: 'Locator Slip',
          isSidebarMenu: true,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.HR_PAS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },
      {
        path: '/locator-slips/:id/editor',
        name: 'locator-slips/editor',
        component: () => import('@/components/locator-slip/LocatorSlipForm.vue'),
        meta: <RouteMeta>{
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.HR_PAS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },
      {
        path: '/document-requests/:id?',
        name: 'document-requests',
        component: () => import('@/views/request/DocumentsPage.vue'),
        meta: <RouteMeta>{
          label: 'Document Request',
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.STANDARD_USER, AuthRole.HR_PPMS_ADMIN, AuthRole.HR_PAS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },
      {
        path: '/document-requests/:id/editor',
        name: 'document-requests/editor',
        component: () => import('@/components/request/DocumentRequestForm.vue'),
        meta: <RouteMeta>{
          label: 'Document Request',
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.STANDARD_USER, AuthRole.HR_PPMS_ADMIN, AuthRole.HR_PAS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },
      {
        path: '/payrolls/:id?',
        name: 'payrolls',
        component: () => import('@/views/human-resources/PayrollPage.vue'),
        meta: <RouteMeta>{
          label: 'Payroll',
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.HR_PAS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },
      {
        path: '/employee-payrolls/:id?',
        name: 'employee-payrolls',
        component: () => import('@/views/human-resources/EmployeesPayrollPage.vue'),
        meta: <RouteMeta>{
          label: 'Payroll',
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.HR_PAS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },
      {
        path: '/staff-ctdos/:id?',
        name: 'staff-ctdos',
        component: () => import('@/views/commitment/CompensatoryTimeOffPage.vue'),
        meta: <RouteMeta>{
          label: 'Staff CTDO`s',
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.HR_PAS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },
      {
        path: '/staff-cocs/:id?',
        name: 'staff-cocs',
        component: () => import('@/views/human-resources/COCPage.vue'),
        meta: <RouteMeta>{
          label: 'Staff COC`s',
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.HR_PAS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },
    ],
  },

  /*Libraries Management */
  /*HRPPMS*/
  {
    path: '/management',
    name: 'management',
    meta: <RouteMeta>{
      group: RouteGroup.HUMAN_RESOURCES,
      label: 'Management',
      isSidebarMenu: false,
      roles: [AuthRole.HR_PPMS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
    },
    children: [
      {
        path: '/active-directories',
        name: 'active-directories',
        component: () => import('@/views/human-resources/ActiveDirectPage.vue'),
        meta: <RouteMeta>{
          label: 'Active Directory',
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.HR_PPMS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },
      {
        path: '/positions',
        name: 'positions',
        component: () => import('@/views/human-resources/PositionPage.vue'),
        meta: <RouteMeta>{
          label: 'Positions',
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.HR_PPMS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },
      {
        path: '/fund-sources',
        name: 'fund-sources',
        component: () => import('@/views/human-resources/FundSourcePage.vue'),
        meta: <RouteMeta>{
          label: 'Fund Sources',
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.HR_PPMS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },
      {
        path: '/salary-grades',
        name: 'salary-grades',
        component: () => import('@/views/human-resources/SalaryGradePage.vue'),
        meta: <RouteMeta>{
          label: 'Salary Grades',
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.HR_PPMS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },
    ],
  },
  /*ODSUS*/
  {
    path: '/odsus',
    name: 'odsus',
    meta: <RouteMeta>{
      group: RouteGroup.HUMAN_RESOURCES,
      label: 'Odsus',
      isSidebarMenu: false,
      roles: [AuthRole.HR_PPMS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
    },
    children: [
      {
        path: '/offices',
        name: 'offices',
        component: () => import('@/views/human-resources/OfficePage.vue'),
        meta: <RouteMeta>{
          label: 'Offices',
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.HR_PPMS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },
      {
        path: '/divisions',
        name: 'divisions',
        component: () => import('@/views/human-resources/DivisionsPage.vue'),
        meta: <RouteMeta>{
          label: 'Divisions',
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.HR_PPMS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },
      {
        path: '/section_or_units',
        name: 'section_or_units',
        component: () => import('@/views/human-resources/SectionorUnitPage.vue'),
        meta: <RouteMeta>{
          label: 'Section/Units',
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.HR_PPMS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },
      {
        path: '/programs',
        name: 'programs',
        component: () => import('@/views/human-resources/ProgramPage.vue'),
        meta: <RouteMeta>{
          label: 'Programs',
          isSidebarMenu: false,
          authType: AuthType.AUTHENTICATED,
          roles: [AuthRole.HR_PPMS_ADMIN, AuthRole.ADMIN, AuthRole.SUPER_USER],
        },
      },
    ],
  },

  /* SUPPORT  ROUTE*/
  {
    path: '/support',
    name: 'support',
    component: SupportPage,
    meta: <RouteMeta>{
      group: RouteGroup.MISC,
      label: 'Support',
      isSidebarMenu: false,
      authType: AuthType.AUTHENTICATED,
      roles: [AuthRole.STANDARD_USER, AuthRole.HR_PPMS_ADMIN, AuthRole.ADMIN, AuthRole.SYSTEM_SUPPORT, AuthRole.SUPER_USER],
    },
  },
  {
    path: '/about-us',
    name: 'about-us',
    component: AboutUsPage,
    meta: <RouteMeta>{
      group: RouteGroup.MISC,
      label: 'About Us',
      isSidebarMenu: false,
      authType: AuthType.AUTHENTICATED,
      roles: [
        AuthRole.STANDARD_USER,
        AuthRole.HR_PPMS_ADMIN,
        AuthRole.HR_PPMS_ADMIN,
        AuthRole.ADMIN,
        AuthRole.SYSTEM_SUPPORT,
        AuthRole.SUPER_USER,
      ],
    },
  },
  /* ADMIN ROUTE*/
  {
    path: '/user-management',
    name: 'user-management',
    component: () => import('@/views/UsersManagementPage.vue'),
    meta: <RouteMeta>{
      label: 'User Management',
      isSidebarMenu: true,
      group: RouteGroup.ADMIN_TOOLS,
      authType: AuthType.AUTHENTICATED,
      roles: [AuthRole.ADMIN, AuthRole.SUPER_USER, AuthRole.HR_PPMS_ADMIN],
    },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsPage.vue'),
    meta: <RouteMeta>{
      label: 'Settings',
      isSidebarMenu: false,
      group: RouteGroup.ADMIN_TOOLS,
      authType: AuthType.AUTHENTICATED,
      roles: [AuthRole.ADMIN, AuthRole.SUPER_USER],
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

  // Attempt to refresh tokens if ever the auth token is expired.
  if (authStore.authExpired && authStore.refreshToken && !authStore.refreshTokenExpired) {
    try {
      await authStore.refreshCurrentTokens()
      return { name: 'time-logs' }
    } catch (err) {
      console.error('Failed to refresh tokens:', err)
      return { name: 'login' }
    }
  }

  // Protect routes that need authentication
  if (to.meta.authType === AuthType.AUTHENTICATED && !authStore.isAuthenticated) {
    if (authStore.refreshToken) {
      try {
        await authStore.refreshCurrentTokens()
        return { name: 'time-logs' }
      } catch (err) {
        console.error('Failed to refresh tokens:', err)
        return { name: 'login' }
      }
    }
    if (authStore.mfaToken) return { name: 'mfa-guard-page' }
    return { name: 'login' }
  }

  // Protect routes that need certain roles to access
  if (to.meta.authType === AuthType.AUTHENTICATED) {
    const roles = authStore.authRoles
    if (to.meta.roles && !to.meta.roles.some((r: string) => roles.includes(r))) {
      console.log(!to.meta.roles.some((r: string) => roles.includes(r)))
      return { name: 'dashboard' }
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
