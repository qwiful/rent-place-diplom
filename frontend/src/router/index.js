import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/home/HomeView.vue'),
  },
  {
    path: '/properties/:id',
    name: 'PropertyDetail',
    component: () => import('@/views/properties/PropertyDetailView.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { requiresGuest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { requiresGuest: true },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/profile/ProfileView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/dashboard/rental-objects',
    name: 'RentalObjectsDashboard',
    component: () => import('@/views/dashboard/RentalObjectsView.vue'),
    meta: { requiresAuth: true, roles: ['manager', 'admin'] },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
  {
    path: '/dashboard/viewing-requests',
    name: 'ViewingRequestsDashboard',
    component: () => import('@/views/dashboard/ViewingRequestsView.vue'),
    meta: { requiresAuth: true, roles: ['manager', 'admin'] },
  },
  {
    path: '/admin',
    name: 'AdminPanel',
    component: () => import('@/views/admin/AdminView.vue'),
    meta: { requiresAuth: true, roles: ['admin'] },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach(async (to, from) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth) {
    if (!auth.isAuthenticated && localStorage.getItem('accessToken')) {
      await auth.init()
    }
    if (!auth.isAuthenticated) {
      return { name: 'Login' }
    }
  }

  if (to.meta.roles && auth.isAuthenticated) {
    const userRole = auth.user?.roles?.name || auth.user?.role
    if (!to.meta.roles.includes(userRole)) {
      return { name: 'Home' }
    }
  }

  return true
})

export default router
