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
        const navLink: NavLink = { name: route.name?.toString(), label: route.meta.label, icon: '' }
        const navLinkGroup = route.meta.group?.valueOf()

        // Filter routes that need to be authenticated
        if (route.meta.auth === AuthType.AUTHENTICATED && !authStore.isAuthenticated) return

        // Filter routes that need the user to NOT be authenticated
        if (route.meta.auth === AuthType.UNAUTHENTICATED && authStore.isAuthenticated) return

        // Filter routes that require roles
        if (route.meta.roles && authStore.isAuthenticated && !authStore.authHasRequiredRole(route.meta.roles)) return

        switch (route.name) {
          case 'dashboard':
            navLink.icon = 'pi pi-desktop'
            break
          case 'profile':
            navLink.icon = 'pi pi-id-card'
            break
          case 'announcements':
            navLink.icon = 'pi pi-megaphone'
            break
          case 'user-management':
            navLink.icon = 'pi pi-users'
            break
          case 'commitments':
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
          default:
            navLink.icon = 'fa-solid fa-circle-question'
            break
        }

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
