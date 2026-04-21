<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'
import { getQuestionTypeConfig, getQuestionsByType, type SurveyQuestion } from '../data/questionSets'
import { useAuthStore, type RemoteQuestion } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const selectedTypeId = ref<string>(String(route.query.type ?? ''))
const selectedType = ref(getQuestionTypeConfig(selectedTypeId.value))

const localQuestions = ref<SurveyQuestion[]>([])
const isLoadingQuestions = ref(false)
const loadError = ref('')

const mapRemoteQuestion = (q: RemoteQuestion): SurveyQuestion => {
  const subQuestion = Array.isArray(q.subQuestions) && q.subQuestions.length > 0
    ? q.subQuestions[0]
    : q.subQuestion
  const title = subQuestion?.title ?? q.title ?? ''
  const choices: SurveyQuestion['choices'] = (q.choices ?? []).map((c) => ({
    choiceId: c.id ?? c.choiceId ?? '',
    title: c.title ?? '',
    mark: c.mark ?? 0,
  }))
  return {
    questionId: q.questionId ?? q.id ?? '',
    type: q.type ?? '',
    queueCycle: q.queueCycle ?? 0,
    title,
    choices,
  }
}

const loadFromBackend = async (cycleId: string): Promise<void> => {
  isLoadingQuestions.value = true
  loadError.value = ''
  try {
    const remote = await authStore.getQuestions(cycleId)
    if (remote.length > 0) {
      localQuestions.value = remote.map(mapRemoteQuestion)
      return
    }
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Ошибка загрузки вопросов'
  } finally {
    isLoadingQuestions.value = false
  }
  // Fallback to local data if backend returned nothing
  localQuestions.value = getQuestionsByType(selectedTypeId.value).map((q) => ({
    ...q,
    choices: q.choices.map((c) => ({ ...c })),
  }))
}

onMounted(async () => {
  const cycleId = authStore.cycleId
  if (cycleId) {
    await loadFromBackend(cycleId)
  } else {
    localQuestions.value = getQuestionsByType(selectedTypeId.value).map((q) => ({
      ...q,
      choices: q.choices.map((c) => ({ ...c })),
    }))
  }
})

interface QuestionDraft {
  type: string
  title: string
  choices: { choiceId: string; title: string; mark: number }[]
}

const editingDrafts = ref<Record<string, QuestionDraft>>({})
const savingMap = ref<Record<string, boolean>>({})
const errorMap = ref<Record<string, string>>({})

const isEditing = (questionId: string): boolean => questionId in editingDrafts.value
const isSaving = (questionId: string): boolean => !!savingMap.value[questionId]

const startEdit = (question: SurveyQuestion): void => {
  editingDrafts.value[question.questionId] = {
    type: question.type,
    title: question.title,
    choices: question.choices.map((c) => ({ ...c })),
  }
  delete errorMap.value[question.questionId]
}

const cancelEdit = (questionId: string): void => {
  delete editingDrafts.value[questionId]
  delete errorMap.value[questionId]
}

const saveQuestion = async (questionId: string): Promise<void> => {
  const question = localQuestions.value.find((q) => q.questionId === questionId)
  const draft = editingDrafts.value[questionId]

  if (!question || !draft) return

  savingMap.value[questionId] = true
  errorMap.value[questionId] = ''

  try {
    const promises: Promise<void>[] = []

    if (draft.type !== question.type) {
      promises.push(authStore.setQuestionType(questionId, draft.type))
    }

    if (draft.title !== question.title) {
      promises.push(authStore.setQuestionTitle(questionId, draft.title))
    }

    for (const draftChoice of draft.choices) {
      const orig = question.choices.find((c) => c.choiceId === draftChoice.choiceId)
      if (!orig) continue

      if (draftChoice.title !== orig.title) {
        promises.push(authStore.setChoiceTitle(draftChoice.choiceId, draftChoice.title))
      }
      if (draftChoice.mark !== orig.mark) {
        promises.push(authStore.setChoiceMark(draftChoice.choiceId, draftChoice.mark))
      }
    }

    await Promise.all(promises)

    const idx = localQuestions.value.findIndex((q) => q.questionId === questionId)
    if (idx !== -1) {
      localQuestions.value[idx] = {
        ...localQuestions.value[idx],
        type: draft.type,
        title: draft.title,
        choices: draft.choices.map((c) => ({ ...c })),
      }
    }

    cancelEdit(questionId)
  } catch (e) {
    errorMap.value[questionId] = e instanceof Error ? e.message : 'Ошибка сохранения'
  } finally {
    delete savingMap.value[questionId]
  }
}

const goBack = (): void => {
  router.push({ name: 'question-types' })
}
</script>

<template>
  <AppLayout>
    <q-page class="q-pa-lg">
      <div class="row justify-end q-gutter-sm q-mb-lg">
        <q-btn
          label="Назад к типам"
          color="primary"
          outline
          style="min-width: 160px"
          @click="goBack"
        />
        <q-btn
          label="Распространение анкеты"
          color="primary"
          unelevated
          style="min-width: 160px"
          @click="router.push({ name: 'distribution' })"
        />
      </div>

      <div class="column q-gutter-md q-mb-lg">
        <div class="text-h5">Набор вопросов</div>
        <div class="text-subtitle1 text-grey-8">
          Тип: {{ selectedType?.label ?? 'Не выбран' }}
        </div>
        <div class="text-body2 text-grey-7">
          Всего вопросов: {{ localQuestions.length }}
        </div>
      </div>

      <div v-if="isLoadingQuestions" class="row justify-center q-pa-xl">
        <q-spinner size="40px" color="primary" />
      </div>

      <div v-else-if="loadError" class="text-negative text-body2 q-mb-md">
        {{ loadError }}
      </div>

      <div v-else-if="localQuestions.length === 0" class="text-negative text-body1 q-mb-md">
        Для выбранного типа пока нет вопросов.
      </div>

      <div v-else class="column q-gutter-md">
        <q-card v-for="question in localQuestions" :key="question.questionId" bordered flat>
          <q-card-section class="q-pb-sm">
            <div class="row items-start justify-between no-wrap">
              <div class="col">
                <div class="row items-center q-gutter-xs q-mb-xs">
                  <span class="text-caption text-grey-7">#{{ question.queueCycle + 1 }}</span>
                  <template v-if="isEditing(question.questionId)">
                    <q-input
                      v-model="editingDrafts[question.questionId].type"
                      dense
                      outlined
                      label="Тип"
                      style="max-width: 140px"
                    />
                  </template>
                  <span v-else class="text-caption text-grey-7">· {{ question.type }}</span>
                </div>

                <template v-if="isEditing(question.questionId)">
                  <q-input
                    v-model="editingDrafts[question.questionId].title"
                    dense
                    outlined
                    autogrow
                    label="Заголовок вопроса"
                  />
                </template>
                <div v-else class="text-subtitle1 text-weight-medium q-mt-xs">
                  {{ question.title }}
                </div>
              </div>

              <q-btn
                v-if="!isEditing(question.questionId)"
                flat
                dense
                round
                icon="edit"
                color="grey-6"
                class="q-ml-sm"
                @click="startEdit(question)"
              />
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section class="q-pt-sm">
            <div class="text-caption text-grey-7 q-mb-xs">Варианты ответов:</div>

            <div class="column q-gutter-xs">
              <template v-if="isEditing(question.questionId)">
                <div
                  v-for="(choice, idx) in editingDrafts[question.questionId].choices"
                  :key="choice.choiceId"
                  class="row items-center q-gutter-sm"
                >
                  <q-input
                    v-model="editingDrafts[question.questionId].choices[idx].title"
                    dense
                    outlined
                    label="Текст варианта"
                    class="col"
                  />
                  <q-input
                    v-model.number="editingDrafts[question.questionId].choices[idx].mark"
                    dense
                    outlined
                    type="number"
                    label="Оценка"
                    style="max-width: 90px"
                  />
                </div>
              </template>

              <template v-else>
                <div
                  v-for="choice in question.choices"
                  :key="choice.choiceId"
                  class="choice-row"
                >
                  <span class="choice-title">{{ choice.title || 'Без подписи' }}</span>
                  <span class="choice-mark">{{ choice.mark }}</span>
                </div>
              </template>
            </div>
          </q-card-section>

          <template v-if="isEditing(question.questionId)">
            <q-separator />
            <q-card-section class="q-pt-sm">
              <div
                v-if="errorMap[question.questionId]"
                class="text-negative text-caption q-mb-sm"
              >
                {{ errorMap[question.questionId] }}
              </div>
              <div class="row q-gutter-sm">
                <q-btn
                  label="Сохранить"
                  color="primary"
                  unelevated
                  dense
                  :loading="isSaving(question.questionId)"
                  :disable="isSaving(question.questionId)"
                  @click="saveQuestion(question.questionId)"
                />
                <q-btn
                  label="Отмена"
                  flat
                  dense
                  :disable="isSaving(question.questionId)"
                  @click="cancelEdit(question.questionId)"
                />
              </div>
            </q-card-section>
          </template>
        </q-card>
      </div>


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

