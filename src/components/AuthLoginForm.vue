<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { ILoginPayload } from '../types_and_interfaces'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const companyName = ref<string>(authStore.companyName)
const email = ref<string>('')
const password = ref<string>('')
const isLoading = ref<boolean>(false)
const authMessage = ref<string>('')

const onLogin = async (): Promise<void> => {
  const trimmedCompanyName = companyName.value.trim()

  if (!trimmedCompanyName) {
    authMessage.value = 'Укажите название компании.'
    return
  }

  isLoading.value = true
  authMessage.value = ''

  authStore.setCompanyName(trimmedCompanyName)

  const payload: ILoginPayload = {
    email: email.value,
    password: password.value,
  }

  const success = await authStore.doLogin(payload)

  if (success) {
    await router.push('/goal')
  } else {
    authMessage.value = 'Не удалось авторизоваться. Проверьте данные и API.'
  }

  isLoading.value = false
}
</script>

<template>
  <q-card class="auth-card q-pa-md">
    <q-card-section>
      <div class="text-h6">Вход</div>
    </q-card-section>

    <q-card-section class="q-gutter-md">
      <form class="column q-gutter-md" @submit.prevent="onLogin">
        <q-input
          v-model="companyName"
          label="Название компании"
          autocomplete="organization"
          placeholder="ООО Пример"
          outlined
          dense
        />

        <q-input
          v-model="email"
          label="Email"
          type="email"
          autocomplete="username"
          placeholder="you@example.com"
          outlined
          dense
        />

        <q-input
          v-model="password"
          label="Пароль"
          type="password"
          autocomplete="current-password"
          placeholder="••••••••"
          outlined
          dense
        />

        <q-btn
          color="primary"
          label="Войти"
          type="submit"
          :loading="isLoading"
          :disable="isLoading"
        />
      </form>

      <div v-if="authMessage" class="text-body2 text-negative">
        {{ authMessage }}
      </div>
    </q-card-section>
  </q-card>
</template>

<style scoped>
.auth-card {
  min-width: 300px;
  width: 100%;
  max-width: 420px;
}
</style>
