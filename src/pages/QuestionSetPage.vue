<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'
import { getQuestionTypeConfig, getQuestionsByType } from '../data/questionSets'

const route = useRoute()
const router = useRouter()

const selectedTypeId = computed<string>(() => String(route.query.type ?? ''))
const selectedType = computed(() => getQuestionTypeConfig(selectedTypeId.value))
const questions = computed(() => getQuestionsByType(selectedTypeId.value))

const goBack = (): void => {
  router.push({ name: 'question-types' })
}
</script>

<template>
  <AppLayout>
    <q-page class="q-pa-lg">
      <div class="column q-gutter-md q-mb-lg">
        <div class="text-h5">Набор вопросов</div>
        <div class="text-subtitle1 text-grey-8">
          Тип: {{ selectedType?.label ?? 'Не выбран' }}
        </div>
        <div class="text-body2 text-grey-7">
          Всего вопросов: {{ questions.length }}
        </div>
      </div>

      <div v-if="questions.length === 0" class="text-negative text-body1 q-mb-md">
        Для выбранного типа пока нет вопросов.
      </div>

      <div v-else class="column q-gutter-md">
        <q-card v-for="question in questions" :key="question.questionId" bordered flat>
          <q-card-section class="q-pb-sm">
            <div class="text-caption text-grey-7">
              #{{ question.queueCycle + 1 }} · {{ question.type }}
            </div>
            <div class="text-subtitle1 text-weight-medium q-mt-xs">{{ question.title }}</div>
          </q-card-section>
          <q-separator />
          <q-card-section class="q-pt-sm">
            <div class="text-caption text-grey-7 q-mb-xs">Варианты ответов:</div>
            <div class="column q-gutter-xs">
              <div
                v-for="choice in question.choices"
                :key="choice.choiceId"
                class="choice-row"
              >
                <span class="choice-title">{{ choice.title || 'Без подписи' }}</span>
                <span class="choice-mark">{{ choice.mark }}</span>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <q-btn
        label="Назад к типам"
        color="primary"
        outline
        class="q-mt-lg"
        @click="goBack"
      />
    </q-page>
  </AppLayout>
</template>

<style scoped>
.choice-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 8px 10px;
}

.choice-title {
  font-size: 14px;
}

.choice-mark {
  min-width: 28px;
  text-align: center;
  font-weight: 700;
  color: #1976d2;
}
</style>
