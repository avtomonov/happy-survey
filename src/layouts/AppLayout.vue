<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const companyName = computed<string>(() => authStore.companyName)

const doLogout = (): void => {
  authStore.doLogout()
  void router.push('/login')
}
</script>

<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-white text-dark">
      <q-toolbar>
        <q-toolbar-title>Happy Job Constructor</q-toolbar-title>
        <div v-if="companyName" class="text-body2 q-mr-md">{{ companyName }}</div>
        <q-btn flat round icon="logout" title="Выйти" @click="doLogout" />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <slot />
    </q-page-container>
  </q-layout>
</template>
