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
    expanded?: boolean
  }

  type NavItem = {
    group: string
    links: NavLink[]
  }

  const navLinks = ref<NavItem[]>([])

  const handleRoutesVisibility = () => {
    navLinks.value = []
    router.getRoutes().forEach((route) => {
      if (route.meta.isSidebarMenu) {
        const navLink: NavLink = {
          name: route.name?.toString(),
          label: route.meta.label,
          icon: '',
          children: [],
        }
        const navLinkGroup = route.meta.group?.valueOf()

        // Filter routes that need to be authenticated
        if (route.meta.auth === AuthType.AUTHENTICATED && !authStore.isAuthenticated) return

        // Filter routes that need the user to NOT be authenticated
        if (route.meta.auth === AuthType.UNAUTHENTICATED && authStore.isAuthenticated) return

        // Filter routes that require roles
        if (route.meta.roles && authStore.isAuthenticated && !authStore.authHasRequiredRole(route.meta.roles)) return

        switch (route.name) {
          case 'dashboard':
            navLink.icon = 'pi pi-home'
            break
          case 'announcements':
            navLink.icon = 'pi pi-bookmark'
            break
          case 'profile':
            navLink.icon = 'pi pi-id-card'
            break
          case 'commitments':
            navLink.icon = 'pi pi-clock'
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
          case 'user-management':
            navLink.icon = 'pi pi-users'
            break
          default:
            navLink.icon = 'fa-solid fa-circle-question'
            break
        }

        // Handle parent routes and their children
        if (route.children && route.children.length > 0) {
          route.children.forEach((childRoute) => {
            if (childRoute.meta && childRoute.meta.isSidebarMenu) {
              // Check if child is in menu
              const childNavLink: NavLink = {
                name: childRoute.name?.toString(),
                label: childRoute.meta.label,
                icon: '', //assign icon if necessary
                expanded: false,
                // children: []  No need for children on child links in this example
              }

              // Authentication and Role checks for children
              if (childRoute.meta.auth === AuthType.AUTHENTICATED && !authStore.isAuthenticated) return
              if (childRoute.meta.auth === AuthType.UNAUTHENTICATED && authStore.isAuthenticated) return
              if (childRoute.meta.roles && authStore.isAuthenticated && !authStore.authHasRequiredRole(childRoute.meta.roles))
                return

              switch (childRoute.name) {
                case 'list-accomplishment-report':
                  childNavLink.icon = 'pi pi-list' // Example icon
                  break
                case 'create-accomplishment-report':
                  childNavLink.icon = 'pi pi-plus' // Example icon
                  break
                // ... other child route icon assignments
              }

              navLink.children?.push(childNavLink)
            }
          })
        }

        // Grouping logic (modified to handle children)
        if (navLinkGroup) {
          const foundGroup = navLinks.value.find((n) => n.group === navLinkGroup)
          if (!foundGroup) {
            return navLinks.value.push({ group: navLinkGroup, links: [navLink] })
          }

          navLinks.value.forEach((n) => {
            if (n.group === navLinkGroup) {
              n.links.push(navLink)
            }
          })
        }
      }
    })
  }

  handleRoutesVisibility()

  // Refresh the navbar items everytime the user re-authenticates
  watch(
    () => authStore.authenticationToken,
    () => {
      handleRoutesVisibility()
    }
  )

  return { navLinks }
}
