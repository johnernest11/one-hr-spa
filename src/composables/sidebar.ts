// composables/sidebar.ts
import { useRouter } from 'vue-router'
import { AuthType } from '@/typings/auth.types.ts'
import { useAuthStore } from '@/stores/auth.store.ts'
import { watch, ref } from 'vue'
export const useSidebarNavLinks = () => {
  const router = useRouter()
  const authStore = useAuthStore()
  type NavLink = {
    label: string
    icon: string
    name: string | undefined
    children?: NavLink[]
    expanded?: boolean // Add the expanded property
    active?: boolean // Track active state
  }
  type NavItem = {
    group: string
    links: NavLink[]
  }
  const navLinks = ref<NavItem[]>([])
  // Function to toggle the expanded state of a parent link
  const toggleExpanded = (link: NavLink) => {
    if (link.children) {
      link.expanded = !link.expanded
    }
  }
  const handleRoutesVisibility = () => {
    navLinks.value = []
    const routes = router.getRoutes()
    for (const route of routes) {
      if (route.meta.isSidebarMenu) {
        const navLink: NavLink = {
          name: route.name?.toString(),
          label: route.meta.label,
          icon: '',
          children: [],
          expanded: false, // Initialize as collapsed
        }
        const navLinkGroup = route.meta.group?.valueOf()
        // Authentication and Role Checks
        if (route.meta.auth === AuthType.AUTHENTICATED && !authStore.isAuthenticated) continue
        if (route.meta.auth === AuthType.UNAUTHENTICATED && authStore.isAuthenticated) continue
        if (route.meta.roles && authStore.isAuthenticated && !authStore.authHasRequiredRole(route.meta.roles)) continue
        // Icon Assignments
        switch (route.name) {
          case 'dashboard':
            navLink.icon = 'pi pi-home'
            break
          case 'time-logs':
            navLink.icon = 'pi pi-hourglass'
            break
          case 'my-profile':
            navLink.icon = 'pi pi-id-card'
            break
          case 'requests':
            navLink.icon = 'pi pi-bookmark'
            break
          case 'commitments':
            navLink.icon = 'pi pi-clock'
            break
          case 'recruitment':
            navLink.icon = 'pi pi-briefcase'
            break
          case 'responsibility':
            navLink.icon = 'pi pi-briefcase'
            break
          case 'personnel':
            navLink.icon = 'pi pi-users'
            break
          case 'settings':
            navLink.icon = 'pi pi-cog'
            break
          case 'support':
            navLink.icon = 'pi pi-phone'
            break
          case 'about-us':
            navLink.icon = 'pi pi-heart'
            break
          case 'management':
            navLink.icon = 'pi pi-book'
            break
          case 'odsus':
            navLink.icon = 'pi pi-book'
            break
          case 'user-management':
            navLink.icon = 'pi pi-users'
            break
          case 'personnel-managements':
            navLink.icon = 'pi pi-users'
            break

          default:
            navLink.icon = 'fa-solid fa-circle-question'
            break
        }
        // Handle Children
        if (route.children && route.children.length > 0) {
          // Ensure navLink.children is initialized
          if (!navLink.children) {
            navLink.children = [] // Initialize the children array if it's not already
          }
          for (const childRoute of route.children) {
            if (childRoute.meta && childRoute.meta.isSidebarMenu) {
              const childNavLink: NavLink = {
                name: childRoute.name?.toString(),
                label: childRoute.meta.label,
                icon: '', // assign icon if needed
                // expanded is not needed for the children
              }
              // Authentication and Role checks for children
              if (childRoute.meta.auth === AuthType.AUTHENTICATED && !authStore.isAuthenticated) continue
              if (childRoute.meta.auth === AuthType.UNAUTHENTICATED && authStore.isAuthenticated) continue
              if (childRoute.meta.roles && authStore.isAuthenticated && !authStore.authHasRequiredRole(childRoute.meta.roles))
                continue
              switch (childRoute.name) {
                case 'accomplishment-reports':
                  childNavLink.icon = 'fas fa-check-double'
                  break
                case 'ctdo-reports':
                  childNavLink.icon = 'fas fa-list-check'
                  break

                /*Request Routes */
                case 'request-documents':
                  childNavLink.icon = 'fas fa-list-check'
                  break
                case 'my-payslips':
                  childNavLink.icon = 'fas fa-receipt'
                  break

                /*Profile Routes */
                case 'my-pds':
                  childNavLink.icon = 'fas fa-sheet-plastic'
                  break
                case 'my-wes':
                  childNavLink.icon = 'fas fa-sheet-plastic'
                  break
                case 'my-leaveapplications':
                  childNavLink.icon = 'fas fa-file-signature'
                  break
                case 'my-locator-slips':
                  childNavLink.icon = 'fas fa-location-dot'
                  break
                case 'my-dtrs':
                  childNavLink.icon = 'fas fa-clipboard'
                  break
                case 'my-cocs':
                  childNavLink.icon = 'fas fa-file-circle-exclamation'
                  break
                case 'my-leavecredits':
                  childNavLink.icon = 'fas fa-box-archive'
                  break

                /*Recruitment Routes */
                case 'hrppms-dashboard':
                  childNavLink.icon = 'fas fa-file-circle-xmark'
                  break
                case 'employment':
                  childNavLink.icon = 'fas fa-circle-user'
                  break
                case 'create-employee':
                  childNavLink.icon = 'fas fa-circle-user'
                  break
                case 'item-numbers':
                  childNavLink.icon = 'fas fa-sitemap'
                  break

                /*Management Routes */
                case 'active-directories':
                  childNavLink.icon = 'fas fa-user-lock'
                  break
                case 'positions':
                  childNavLink.icon = 'fas fa-users-rays'
                  break
                case 'fund-sources':
                  childNavLink.icon = 'fas fa-wallet'
                  break
                case 'salary-grades':
                  childNavLink.icon = 'fas fa-coins'
                  break

                case 'offices':
                  childNavLink.icon = 'fas fa-building'
                  break
                case 'divisions':
                  childNavLink.icon = 'fas fa-braille'
                  break
                case 'section_or_units':
                  childNavLink.icon = 'fas fa-layer-group'
                  break
                case 'programs':
                  childNavLink.icon = 'fas fa-object-group'
                  break

                /*Responsibility Routes */
                case 'accomplishment-report-list':
                  childNavLink.icon = 'fas fa-check-double'
                  break
                case 'ctdo-report-list':
                  childNavLink.icon = 'fas fa-list-check'
                  break

                /*Personnel Management Routes */
                case 'hrpas-dashboard':
                  childNavLink.icon = 'fas fa-file-circle-xmark'
                  break
                case 'warm-bodies':
                  childNavLink.icon = 'fas fa-pie-chart'
                  break
                case 'employees':
                  childNavLink.icon = 'fas fa-user-tie'
                  break
                case 'leave-applications':
                  childNavLink.icon = 'fas fa-clipboard'
                  break
                case 'locator-slips':
                  childNavLink.icon = 'fas fa-location-dot'
                  break
                case 'document-requests':
                  childNavLink.icon = 'fas fa-file-lines'
                  break
                case 'daily-time-records':
                  childNavLink.icon = 'fas fa-file-signature'
                  break
                case 'payrolls':
                  childNavLink.icon = 'fas fa-piggy-bank'
                  break
                case 'staff-ctdos':
                  childNavLink.icon = 'fas fa-file-circle-xmark'
                  break
                case 'staff-cocs':
                  childNavLink.icon = 'fas fa-file-circle-xmark'
                  break
              }
              navLink.children.push(childNavLink) // Now safe to push

              // Set active state for child and parent
              if (childRoute.name === route.name) {
                childNavLink.active = true // Mark child active
                navLink.active = true // If any child is active, set parent active
              }
            }
          }
          // Only add the parent if it has children
          if (navLink.children.length > 0) {
            if (navLinkGroup) {
              const foundGroup = navLinks.value.find((n) => n.group === navLinkGroup)
              if (!foundGroup) {
                navLinks.value.push({ group: navLinkGroup, links: [navLink] })
              } else {
                foundGroup.links.push(navLink)
              }
            }
          }
        } else {
          // If the route has no children, just add the route.
          if (navLinkGroup) {
            const foundGroup = navLinks.value.find((n) => n.group === navLinkGroup)
            if (!foundGroup) {
              navLinks.value.push({ group: navLinkGroup, links: [navLink] })
            } else {
              foundGroup.links.push(navLink)
            }
          }
        }
      }
    }
  }
  handleRoutesVisibility()
  // Refresh the navbar items everytime the user re-authenticates
  watch(
    () => authStore.authenticationToken,
    () => {
      handleRoutesVisibility()
    }
  )
  return { navLinks, toggleExpanded } // Expose the toggle function
}
