<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const goToProfile = async (): Promise<void> => {
  await router.push('/')
}

const doLogout = (): void => {
  authStore.doLogout()
  void router.push('/login')
}
</script>

<template>
  <q-layout>
    <q-page-container>
      <q-page class="row items-center justify-center q-pa-md">
        <q-card class="q-pa-md" style="width: 100%; max-width: 420px;">
          <q-card-section>
            <div class="text-h6">Главная</div>
            <div class="text-subtitle2">Вы авторизованы</div>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn color="primary" label="Кнопка 1" @click="goToProfile" />
            <q-btn flat color="secondary" label="Выйти" @click="doLogout" />
          </q-card-actions>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>
