import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import HomePage from '../pages/HomePage.vue'
import LoginPage from '../pages/LoginPage.vue'
import QuestionTypesPage from '../pages/QuestionTypesPage.vue'
import QuestionSetPage from '../pages/QuestionSetPage.vue'
import DistributionPage from '../pages/DistributionPage.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/login',
  },
  {
    path: '/home',
    name: 'home',
    component: HomePage,
    meta: { requiresAuth: true },
  },
  // {
  //   path: '/goal',
  //   name: 'goal',
  //   component: GoalSelectPage,
  //   meta: { requiresAuth: true },
  // },
  {
    path: '/login',
    name: 'login',
    component: LoginPage,
    meta: { guestOnly: true },
  },
  {
    path: '/question-types',
    name: 'question-types',
    component: QuestionTypesPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/question-set',
    name: 'question-set',
    component: QuestionSetPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/distribution',
    name: 'distribution',
    component: DistributionPage,
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
