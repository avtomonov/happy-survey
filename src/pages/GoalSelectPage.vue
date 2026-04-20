<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'

const router = useRouter()

const selectGoal = async (goal: 'custom' | 'engagement'): Promise<void> => {
  await router.push({ name: 'home', query: { goal } })
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
              <q-btn color="primary" label="Выбрать" unelevated @click.stop="selectGoal('custom')" />
            </q-card-actions>
          </q-card>

          <q-card
            clickable
            class="goal-card cursor-pointer"
            @click="selectGoal('engagement')"
          >
            <q-card-section class="column items-center q-gutter-sm">
              <q-icon name="people" size="48px" color="secondary" />
              <div class="text-h6 text-center">Исследование вовлечённости</div>
              <div class="text-body2 text-grey-7 text-center">
                Готовый шаблон для измерения<br />вовлечённости сотрудников
              </div>
            </q-card-section>
            <q-card-actions align="center">
              <q-btn color="secondary" label="Выбрать" unelevated @click.stop="selectGoal('engagement')" />
            </q-card-actions>
          </q-card>
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
