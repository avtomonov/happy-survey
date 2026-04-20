<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const isLoading = ref<boolean>(false)
const errorMessage = ref<string>('')

const selectGoal = async (goal: 'custom' | 'engagement'): Promise<void> => {
  if (isLoading.value) {
    return
  }

  errorMessage.value = ''
  isLoading.value = true

  try {
    if (goal === 'custom') {
      await authStore.launchCustomStudy()
      await router.push({ name: 'question-types' })
      return
    }

    await router.push({ name: 'home', query: { goal } })
  } catch (error: unknown) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : 'Не удалось выполнить выбранное действие. Повторите попытку.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <AppLayout>
    <q-page class="column items-center justify-center q-pa-md q-gutter-lg">
      <div class="text-h5 text-center">Для какой цели вы хотите использовать конструктор?</div>

      <div class="row q-gutter-md justify-center">
        <q-card
          clickable
          class="goal-card cursor-pointer"
          @click="selectGoal('custom')"
        >
          <q-card-section class="column items-center q-gutter-sm">
            <q-icon name="edit_note" size="48px" color="primary" />
            <div class="text-h6 text-center">Свой опрос с нуля</div>
            <div class="text-body2 text-grey-7 text-center">
              Создайте собственный опрос<br />с нужными вам вопросами
            </div>
          </q-card-section>
          <q-card-actions align="center">
            <q-btn
              color="primary"
              label="Выбрать"
              unelevated
              :loading="isLoading"
              :disable="isLoading"
              @click.stop="selectGoal('custom')"
            />
          </q-card-actions>
        </q-card>

        <q-card
          clickable
          class="goal-card cursor-pointer"
          @click="selectGoal('engagement')"
        >
          <q-card-section class="column items-center q-gutter-sm">
            <q-icon name="people" size="48px" color="secondary" />
            <div class="text-h6 text-center">Исследование вовлеченности</div>
            <div class="text-body2 text-grey-7 text-center">
              Готовый шаблон для измерения<br />вовлеченности сотрудников
            </div>
          </q-card-section>
          <q-card-actions align="center">
            <q-btn
              color="secondary"
              label="Выбрать"
              unelevated
              :loading="isLoading"
              :disable="isLoading"
              @click.stop="selectGoal('engagement')"
            />
          </q-card-actions>
        </q-card>
      </div>

      <div v-if="errorMessage" class="text-negative text-body2 text-center">
        {{ errorMessage }}
      </div>
    </q-page>
  </AppLayout>
</template>

<style scoped>
.goal-card {
  width: 240px;
  min-height: 220px;
  transition: box-shadow 0.2s;
}
.goal-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}
</style>
