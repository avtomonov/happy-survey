<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'
import { getQuestionTypeConfig, getQuestionsByType, type SurveyQuestion } from '../data/questionSets'
import { useAuthStore, type RemoteQuestion } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const selectedTypeId = ref<string>(String(route.query.type ?? ''))
const selectedType = ref(getQuestionTypeConfig(selectedTypeId.value))
const surveyTypeLabel = computed(() => selectedType.value?.label ?? 'Свой опрос с нуля')
const emptyStateMessage = computed(() => {
  if (selectedType.value) {
    return 'Для выбранного типа пока нет вопросов.'
  }

  return 'В этом опросе пока нет вопросов. Создайте новый вопрос.'
})

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
  router.push({ name: 'home' })
}

// ───────── Sidebar ─────────
const sidebarTab = ref<'settings' | 'themes'>('settings')
const sidebarOpen = ref(false)

// ───────── Themes ─────────
interface SurveyTheme {
  id: string
  name: string
  bg: string
  text: string
  accent: string
}

const themes: SurveyTheme[] = [
  { id: 'default',  name: 'По умолчанию', bg: '#ffffff',  text: '#212121', accent: '#1976d2' },
  { id: 'dark',     name: 'Тёмная',       bg: '#1e1e2e',  text: '#cdd6f4', accent: '#89b4fa' },
  { id: 'ocean',    name: 'Океан',         bg: '#0077b6',  text: '#ffffff', accent: '#90e0ef' },
  { id: 'forest',   name: 'Лес',           bg: '#2d6a4f',  text: '#ffffff', accent: '#95d5b2' },
  { id: 'sunset',   name: 'Закат',         bg: '#ff6b6b',  text: '#ffffff', accent: '#ffd93d' },
  { id: 'lavender', name: 'Лаванда',       bg: '#7c3aed',  text: '#ffffff', accent: '#ddd6fe' },
  { id: 'coffee',   name: 'Кофе',          bg: '#5c4033',  text: '#fff8f0', accent: '#d4a574' },
  { id: 'mint',     name: 'Мята',          bg: '#e8f5e9',  text: '#1b5e20', accent: '#4caf50' },
]

const activeThemeId = ref('default')
const activeTheme = computed(() => themes.find((t) => t.id === activeThemeId.value) ?? themes[0])
const surveyContentStyle = computed(() => ({
  backgroundColor: activeTheme.value.bg,
  color: activeTheme.value.text,
  '--theme-text': activeTheme.value.text,
  '--theme-accent': activeTheme.value.accent,
  '--theme-border': `color-mix(in srgb, ${activeTheme.value.text} 25%, transparent)`,
  transition: 'background-color 0.3s, color 0.3s',
  borderRadius: '8px',
}))

// ───────── Settings ─────────
const uploadedLogo = ref<string | null>(null)
const logoFileRef = ref<File | null>(null)
const selectedFont = ref('Стандартный')
const selectedLayout = ref('centered')
const customBgColor = ref('#ffffff')

const fontOptions = ['Стандартный', 'Roboto', 'Open Sans', 'Montserrat', 'Playfair Display']
const presetColors = ['#ffffff', '#f5f5f5', '#e3f2fd', '#fce4ec', '#f3e5f5', '#e8f5e9']

const handleLogoUpload = (file: File | null): void => {
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => { uploadedLogo.value = e.target?.result as string }
  reader.readAsDataURL(file)
}
</script>

<template>
  <AppLayout>
    <q-page style="min-height: 100vh;">

      <!-- ───── Левый сайдбар ───── -->
      <!-- ───── Мобильный бургер ───── -->
      <q-btn
        class="sidebar-burger"
        flat
        round
        icon="tune"
        color="primary"
        @click="sidebarOpen = true"
      />

      <!-- ───── Оверлей (мобайл) ───── -->
      <div
        v-if="sidebarOpen"
        class="sidebar-overlay"
        @click="sidebarOpen = false"
      />

      <!-- ───── Левый сайдбар ───── -->
      <div class="sidebar-panel" :class="{ 'sidebar-panel--open': sidebarOpen }">

        <q-tabs
          v-model="sidebarTab"
          dense
          align="justify"
          class="sidebar-tabs"
          active-color="primary"
          indicator-color="primary"
        >
          <q-tab name="settings" label="Настройки" />
          <q-tab name="themes" label="Темы" />

          <!-- Закрыть на мобайле -->
          <q-btn
            flat
            round
            dense
            icon="close"
            color="grey-6"
            class="sidebar-close-btn"
            @click="sidebarOpen = false"
          />
        </q-tabs>

        <q-separator />

        <q-tab-panels v-model="sidebarTab" animated class="sidebar-panels">

          <!-- ───── Таб: Настройки ───── -->
          <q-tab-panel name="settings" class="q-pa-none">
            <div class="q-pa-md">

              <!-- Брендинг опроса -->
              <!-- <div class="settings-section">
                <div class="settings-section-title">Брендинг опроса</div>
                <p class="settings-section-desc">
                  Создайте тему на основе вашего логотипа или любого изображения.
                </p>
                <q-btn
                  label="Создать тему"
                  color="primary"
                  unelevated
                  size="sm"
                  class="full-width q-mb-xs"
                />
                <q-btn
                  label="Stone"
                  outline
                  color="grey-7"
                  size="sm"
                  class="full-width"
                />
              </div> -->

              <q-separator class="q-my-md" />

              <!-- Логотип -->
              <div class="settings-section">
                <div class="settings-section-title">Логотип</div>
                <div class="logo-upload-area">
                  <img v-if="uploadedLogo" :src="uploadedLogo" class="logo-preview" alt="logo" />
                  <q-btn
                    v-else
                    round
                    flat
                    icon="add"
                    color="grey-6"
                    size="lg"
                  />
                  <q-file
                    v-model="logoFileRef"
                    accept="image/*"
                    class="logo-file-input"
                    @update:model-value="handleLogoUpload"
                  />
                </div>
              </div>

              <q-separator class="q-my-md" />

              <!-- Футер -->
              <div class="settings-section">
                <div class="row items-center justify-between">
                  <div class="settings-section-title q-mb-none">Футер</div>
                  <q-btn flat round dense icon="more_horiz" color="grey-6" size="sm" />
                </div>
              </div>

              <q-separator class="q-my-md" />

              <!-- Шрифты -->
              <div class="settings-section">
                <div class="row items-center q-gutter-sm q-mb-sm">
                  <span class="settings-section-title q-mb-none">Шрифты</span>
                  <span class="font-preview-aa">Aa</span>
                </div>
                <q-select
                  v-model="selectedFont"
                  :options="fontOptions"
                  dense
                  outlined
                  label="Шрифт"
                />
              </div>

              <q-separator class="q-my-md" />

              <!-- Макет -->
              <div class="settings-section">
                <div class="settings-section-title">Макет</div>
                <div class="row q-gutter-xs">
                  <q-btn
                    :outline="selectedLayout !== 'centered'"
                    :unelevated="selectedLayout === 'centered'"
                    :color="selectedLayout === 'centered' ? 'primary' : 'grey-5'"
                    label="По центру"
                    size="sm"
                    class="col"
                    @click="selectedLayout = 'centered'"
                  />
                  <q-btn
                    :outline="selectedLayout !== 'full'"
                    :unelevated="selectedLayout === 'full'"
                    :color="selectedLayout === 'full' ? 'primary' : 'grey-5'"
                    label="Полный"
                    size="sm"
                    class="col"
                    @click="selectedLayout = 'full'"
                  />
                </div>
              </div>

              <q-separator class="q-my-md" />

              <!-- Фон -->
              <div class="settings-section">
                <div class="settings-section-title">Фон</div>
                <q-input
                  v-model="customBgColor"
                  dense
                  outlined
                  label="Цвет фона"
                >
                  <template #prepend>
                    <div
                      class="color-dot"
                      :style="{ background: customBgColor }"
                    />
                  </template>
                </q-input>
              </div>

              <q-separator class="q-my-md" />

              <!-- Цветовые пресеты -->
              <div class="settings-section">
                <div class="row items-center justify-between q-mb-sm">
                  <span class="settings-section-title q-mb-none">Цветовые пресеты</span>
                  <q-btn flat dense size="sm" label="Изменить" color="primary" />
                </div>
                <div class="row q-gutter-xs">
                  <div
                    v-for="color in presetColors"
                    :key="color"
                    class="preset-color-dot"
                    :style="{ background: color }"
                    @click="customBgColor = color"
                  />
                </div>
              </div>

            </div>
          </q-tab-panel>

          <!-- ───── Таб: Темы ───── -->
          <q-tab-panel name="themes" class="q-pa-none">
            <div class="q-pa-md">
              <div class="settings-section-title q-mb-md">Выберите тему</div>
              <div class="themes-grid">
                <div
                  v-for="theme in themes"
                  :key="theme.id"
                  class="theme-card"
                  :class="{ 'theme-card--active': activeThemeId === theme.id }"
                  @click="activeThemeId = theme.id"
                >
                  <div
                    class="theme-preview"
                    :style="{ background: theme.bg, color: theme.text }"
                  >
                    <div class="theme-preview-line" :style="{ background: theme.text }" />
                    <div class="theme-preview-line short" :style="{ background: theme.text }" />
                    <div class="theme-preview-accent" :style="{ background: theme.accent }" />
                  </div>
                  <div class="theme-name">{{ theme.name }}</div>
                  <q-icon
                    v-if="activeThemeId === theme.id"
                    name="check_circle"
                    color="primary"
                    size="18px"
                    class="theme-check"
                  />
                </div>
              </div>
            </div>
          </q-tab-panel>

        </q-tab-panels>
      </div>

      <!-- ───── Основной контент ───── -->
      <div class="main-content">
        <div class="q-pa-md">
          <div class="row justify-end q-gutter-sm q-mb-lg">
            <q-btn
              label="Назад к видам опросов"
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
              Тип: {{ surveyTypeLabel }}
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
        {{ emptyStateMessage }}
      </div>

      <div v-else class="column survey-cards-wrapper" :style="surveyContentStyle">
        <q-card v-for="(question, index) in localQuestions" :key="question.questionId" bordered flat>
          <q-card-section class="q-pb-sm">
            <div class="row items-start justify-between no-wrap">
              <div class="col">
                <div class="row items-center q-gutter-xs q-mb-xs">
                  <span class="text-caption text-grey-7">#{{ index + 1 }}</span>
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

        </div><!-- /q-pa-lg -->
      </div><!-- /col main content -->

    </q-page>
  </AppLayout>
</template>

<style scoped>
/* ── Sidebar ── */
.sidebar-panel {
  width: 280px;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  background: #fff;
  overflow-y: auto;
  position: fixed;
  top: 50px; /* высота q-header */
  left: 0;
  height: calc(100vh - 50px);
  z-index: 100;
}

.main-content {
  margin-left: 280px;
  min-height: 100vh;
  background-color: #f4f5f5;
}

/* ── Бургер-кнопка (только мобайл) ── */
.sidebar-burger {
  display: none;
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 200;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2px 12px rgba(0,0,0,0.18);
}

/* ── Кнопка закрытия (только мобайл) ── */
.sidebar-close-btn {
  display: none;
  margin-left: auto;
}

/* ── Оверлей ── */
.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 149;
}

/* ── Мобайл (≤ 768px) ── */
@media (max-width: 768px) {
  .sidebar-burger {
    display: flex;
  }

  .sidebar-close-btn {
    display: flex;
  }

  .sidebar-panel {
    transform: translateX(-100%);
    transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 150;
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.18);
  }

  .sidebar-panel--open {
    transform: translateX(0);
  }

  .main-content {
    margin-left: 0;
  }
}

.sidebar-tabs {
  flex-shrink: 0;
}

.sidebar-panels {
  flex: 1;
  overflow-y: auto;
  background: transparent;
}

/* ── Settings ── */
.settings-section {
  margin-bottom: 4px;
}

.settings-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #424242;
  margin-bottom: 8px;
}

.settings-section-desc {
  font-size: 12px;
  color: #757575;
  margin-bottom: 10px;
  line-height: 1.4;
}

.font-preview-aa {
  font-size: 18px;
  font-weight: 700;
  color: #424242;
  line-height: 1;
}

.logo-upload-area {
  position: relative;
  width: 80px;
  height: 80px;
  border: 2px dashed #bdbdbd;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
}

.logo-preview {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.logo-file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.color-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid #e0e0e0;
}

.preset-color-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid #e0e0e0;
  cursor: pointer;
  transition: transform 0.15s;
}

.preset-color-dot:hover {
  transform: scale(1.15);
}

/* ── Themes ── */
.themes-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.theme-card {
  border-radius: 10px;
  border: 2px solid #e0e0e0;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s, transform 0.15s;
  position: relative;
}

.theme-card:hover {
  border-color: #bdbdbd;
  transform: translateY(-2px);
}

.theme-card--active {
  border-color: #1976d2 !important;
}

.theme-preview {
  height: 64px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.theme-preview-line {
  height: 6px;
  border-radius: 3px;
  opacity: 0.7;
  width: 100%;
}

.theme-preview-line.short {
  width: 60%;
}

.theme-preview-accent {
  height: 8px;
  border-radius: 4px;
  width: 40%;
  margin-top: auto;
}

.theme-name {
  font-size: 11px;
  font-weight: 600;
  color: #424242;
  text-align: center;
  padding: 6px 4px;
  background: #fff;
}

.theme-check {
  position: absolute;
  top: 4px;
  right: 4px;
}

/* ── Themed cards ── */
.survey-cards-wrapper :deep(.q-card) {
  background: transparent;
  box-shadow: none;
  border-color: var(--theme-border) !important;
}

.survey-cards-wrapper :deep(.q-separator) {
  background: var(--theme-border) !important;
}

/* Перебиваем серые классы Quasar внутри темы */
.survey-cards-wrapper :deep(.text-grey-7),
.survey-cards-wrapper :deep(.text-grey-8),
.survey-cards-wrapper :deep(.text-grey-6) {
  color: var(--theme-text) !important;
  opacity: 0.65;
}

/* Кнопка редактирования */
.survey-cards-wrapper :deep(.q-btn .q-icon) {
  color: var(--theme-text) !important;
  opacity: 0.7;
}

/* ── Choices ── */
.choice-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--theme-border, #e0e0e0);
  border-radius: 8px;
  padding: 8px 10px;
}

.choice-title {
  font-size: 14px;
  color: var(--theme-text, inherit);
}

.choice-mark {
  min-width: 28px;
  text-align: center;
  font-weight: 700;
  color: var(--theme-accent, #1976d2);
}
</style>

