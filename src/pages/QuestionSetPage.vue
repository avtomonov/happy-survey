<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import draggable from 'vuedraggable'
import AppLayout from '../layouts/AppLayout.vue'
import SchemaField from '../components/SchemaField.vue'
import {
  getQuestionTypeConfig,
  type SurveyQuestion,
  type SubQuestion,
  SURVEY_QUESTION_TYPES,
} from '../data/questionSets'
import {
  QUESTION_SCHEMAS,
  getSchemaDefaults,
} from '../data/questionSchemas'
import { useAuthStore, type RemoteQuestion } from '../stores/auth'

import { reorderQuestions, renumberAllQueueCycles } from '../stores/reorderQuestions'

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
const surveyTitle = ref('Новый опрос')
const surveyTitleDraft = ref('Новый опрос')
const surveyLocalizedAttributes = ref<Record<string, unknown>>({})
const isSavingSurveyTitle = ref(false)
const surveyTitleError = ref('')
const isEditingSurveyTitle = ref(false)
const surveyTitleInputRef = ref<{ focus: () => void; select: () => void } | null>(null)
let surveyRenameDebounceTimer: number | null = null
const SURVEY_TITLE_RENAME_DEBOUNCE_MS = 5000

const routeSurveyTitle = computed(() => {
  const raw = route.query.surveyTitle
  return typeof raw === 'string' ? raw.trim() : ''
})

const ensureQuestionIds = (questions: SurveyQuestion[]): SurveyQuestion[] => (
  questions.map((question, index) => ({
    ...question,
    questionId: question.questionId?.trim() || `question-${index + 1}`,
    queueCycle: Number.isFinite(question.queueCycle) ? question.queueCycle : index,
  }))
)

const mapRemoteQuestion = (q: RemoteQuestion): SurveyQuestion => {
  const subQuestion = Array.isArray(q.subQuestions) && q.subQuestions.length > 0
    ? q.subQuestions[0]
    : q.subQuestion
  const title = subQuestion?.title ?? q.title ?? ''
  const choices: SurveyQuestion['choices'] = (q.choices ?? []).map((c) => ({
    choiceId: c.id ?? c.choiceId ?? '',
    title: c.title ?? '',
    mark: c.mark ?? 0,
    filterId: c.filterId,
    attributes: c.attributes ?? c.localizedAttributes,
  }))
  const subQuestions: SubQuestion[] = Array.isArray(q.subQuestions)
    ? q.subQuestions.map((s) => ({
        subQuestionId: s.subQuestionId ?? s.id ?? '',
        title: s.title ?? '',
        attributes: s.attributes ?? s.localizedAttributes,
      }))
    : []
  return {
    questionId: q.questionId ?? q.id ?? '',
    type: q.type ?? '',
    queueCycle: q.queueCycle ?? (q.attributes?.queueCycle as number | undefined) ?? 0,
    title,
    choices,
    subQuestions,
    attributes: q.attributes,
    localizedAttributes: q.localizedAttributes,
  }
}

const loadFromBackend = async (cycleId: string): Promise<void> => {
  isLoadingQuestions.value = true
  loadError.value = ''
  try {
    const remote = await authStore.getQuestions(cycleId)
    if (remote.length > 0) {
      localQuestions.value = ensureQuestionIds(remote.map(mapRemoteQuestion))
        .sort((a, b) => a.queueCycle - b.queueCycle)
      return
    }
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Ошибка загрузки вопросов'
  } finally {
    isLoadingQuestions.value = false
  }
  // Fallback to empty list if backend returned nothing
  localQuestions.value = []
}

const loadSurveyMeta = async (cycleId: string): Promise<void> => {
  try {
    const surveys = await authStore.getSurveys(cycleId)
    const activeSurveyId = authStore.surveyId
    const activeSurvey = surveys.find((s) => (s.surveyId ?? s.id) === activeSurveyId) ?? surveys[0]

    const localizedAttributes = (activeSurvey?.localizedAttributes ?? {}) as Record<string, unknown>
    const localizedTitle = (() => {
      if (typeof localizedAttributes.title === 'string') {
        return localizedAttributes.title
      }

      const ruAttrs = localizedAttributes.ru
      if (ruAttrs && typeof ruAttrs === 'object' && 'title' in (ruAttrs as Record<string, unknown>)) {
        const ruTitle = (ruAttrs as Record<string, unknown>).title
        if (typeof ruTitle === 'string') {
          return ruTitle
        }
      }

      const firstLocaleAttrs = Object.values(localizedAttributes).find(
        (value) => value && typeof value === 'object' && 'title' in (value as Record<string, unknown>),
      ) as Record<string, unknown> | undefined

      if (firstLocaleAttrs && typeof firstLocaleAttrs.title === 'string') {
        return firstLocaleAttrs.title
      }

      return ''
    })()
    const resolvedTitle =
      (localizedTitle || activeSurvey?.title || '').trim()
      || routeSurveyTitle.value
      || surveyTypeLabel.value
      || 'Новый опрос'

    surveyLocalizedAttributes.value = { ...localizedAttributes }
    surveyTitle.value = resolvedTitle
    surveyTitleDraft.value = resolvedTitle

    if (activeSurvey && !activeSurveyId) {
      authStore.currentSurveyId.value = (activeSurvey.surveyId ?? activeSurvey.id) ?? null
    }
  } catch {
    // Silent fallback: we keep default title if survey meta is unavailable.
  }
}

const renameSurvey = async (): Promise<void> => {
  const nextTitle = surveyTitleDraft.value.trim()

  if (!nextTitle) {
    surveyTitleError.value = 'Название опроса не может быть пустым'
    return
  }

  const currentTitle = surveyTitle.value.trim()
  if (nextTitle === currentTitle) {
    surveyTitleError.value = ''
    return
  }

  const surveyId = authStore.surveyId
  if (!surveyId) {
    surveyTitleError.value = 'Не найден surveyId для переименования'
    return
  }

  isSavingSurveyTitle.value = true
  surveyTitleError.value = ''

  try {
    const nextLocalizedAttributes = {
      ...surveyLocalizedAttributes.value,
      title: nextTitle,
    }

    await authStore.changeSurveyLocalizedAttributes(surveyId, nextLocalizedAttributes)

    surveyLocalizedAttributes.value = nextLocalizedAttributes
    surveyTitle.value = nextTitle
    surveyTitleDraft.value = nextTitle
  } catch (e) {
    console.error(e)
    surveyTitleError.value = 'Не удалось переименовать опрос'
  } finally {
    isSavingSurveyTitle.value = false
  }
}

const clearSurveyRenameDebounce = (): void => {
  if (surveyRenameDebounceTimer !== null) {
    window.clearTimeout(surveyRenameDebounceTimer)
    surveyRenameDebounceTimer = null
  }
}

const scheduleSurveyRename = (): void => {
  surveyTitleError.value = ''
  clearSurveyRenameDebounce()
  surveyRenameDebounceTimer = window.setTimeout(() => {
    void renameSurvey()
  }, SURVEY_TITLE_RENAME_DEBOUNCE_MS)
}

const startSurveyTitleEdit = async (): Promise<void> => {
  isEditingSurveyTitle.value = true
  surveyTitleDraft.value = surveyTitle.value
  surveyTitleError.value = ''
  await nextTick()
  surveyTitleInputRef.value?.focus()
  surveyTitleInputRef.value?.select()
}

const stopSurveyTitleEdit = async (): Promise<void> => {
  clearSurveyRenameDebounce()
  await renameSurvey()
  isEditingSurveyTitle.value = false
}

onMounted(async () => {
  const cycleId = authStore.cycleId
  if (cycleId) {
    await Promise.all([
      loadFromBackend(cycleId),
      loadSurveyMeta(cycleId),
    ])
  } else {
    localQuestions.value = []
  }
})

onBeforeUnmount(() => {
  clearSurveyRenameDebounce()
})

interface QuestionDraftChoice {
  choiceId: string
  title: string
  mark: number
  filterId: string
  attributes: Record<string, any>
}

interface QuestionDraftSubQuestion {
  subQuestionId: string
  title: string
  attributes: Record<string, any>
}

interface QuestionDraft {
  type: string
  title: string
  choices: QuestionDraftChoice[]
  subQuestions: QuestionDraftSubQuestion[]
  localizedAttributes: Record<string, any>
  attributes: Record<string, any>
}

const editingDrafts = ref<Record<string, QuestionDraft>>({})
const savingMap = ref<Record<string, boolean>>({})
const errorMap = ref<Record<string, string>>({})

const isEditing = (questionId: string): boolean => questionId in editingDrafts.value
const isSaving = (questionId: string): boolean => !!savingMap.value[questionId]

const getActiveSchema = (questionId: string) => {
  const type = editingDrafts.value[questionId]?.type
  return type ? QUESTION_SCHEMAS[type] : undefined
}

const startEdit = (question: SurveyQuestion): void => {
  const schema = QUESTION_SCHEMAS[question.type]
  editingDrafts.value[question.questionId] = {
    type: question.type,
    title: question.title,
    choices: question.choices.map((c) => ({
      choiceId: c.choiceId,
      title: c.title,
      mark: c.mark,
      filterId: c.filterId ?? '',
      attributes: {
        ...getSchemaDefaults(schema?.choiceAttributeFields),
        ...(c.attributes ?? {}),
      },
    })),
    subQuestions: (question.subQuestions ?? []).map((s) => ({
      subQuestionId: s.subQuestionId,
      title: s.title,
      attributes: {
        ...getSchemaDefaults(schema?.subQuestionAttributeFields),
        ...(s.attributes ?? {}),
      },
    })),
    localizedAttributes: {
      ...getSchemaDefaults(schema?.localizedAttributes),
      ...(question.localizedAttributes ?? {}),
    },
    attributes: {
      ...getSchemaDefaults(schema?.attributes),
      ...(question.attributes ?? {}),
    },
  }
  delete errorMap.value[question.questionId]
}

const cancelEdit = (questionId: string): void => {
  delete editingDrafts.value[questionId]
  delete errorMap.value[questionId]
}

const toggleEdit = (question: SurveyQuestion): void => {
  if (isEditing(question.questionId)) {
    cancelEdit(question.questionId)
    return
  }

  startEdit(question)
}

// Re-initialize attributes when type changes in the editor
const onDraftTypeChange = (questionId: string, newType: string): void => {
  const draft = editingDrafts.value[questionId]
  if (!draft) return
  const schema = QUESTION_SCHEMAS[newType]
  draft.localizedAttributes = getSchemaDefaults(schema?.localizedAttributes)
  draft.attributes = getSchemaDefaults(schema?.attributes)
}

const saveQuestion = async (questionId: string): Promise<void> => {
  const question = localQuestions.value.find((q) => q.questionId === questionId)
  const draft = editingDrafts.value[questionId]

  if (!question || !draft) return

  savingMap.value[questionId] = true
  errorMap.value[questionId] = ''

  try {
    const schema = QUESTION_SCHEMAS[draft.type]

    // 1. Create any new choices (with temp IDs) first — sequential, to get real IDs
    for (const draftChoice of draft.choices) {
      if (draftChoice.choiceId.startsWith('new-')) {
        const realId = await authStore.addChoice(questionId, draftChoice.title, draftChoice.mark)
        draftChoice.choiceId = realId
        // Save choice attributes immediately after creation
        if (schema?.choiceAttributeFields && Object.keys(draftChoice.attributes).length > 0) {
          await authStore.setChoiceAttributes(realId, draftChoice.attributes)
        }
      }
    }

    // 2. Create any new subQuestions (with empty IDs) first
    for (const draftSubQ of draft.subQuestions) {
      if (!draftSubQ.subQuestionId) {
        const realId = await authStore.addSubQuestion(questionId, draftSubQ.title)
        draftSubQ.subQuestionId = realId
        // Save subQuestion attributes immediately after creation
        if (schema?.subQuestionAttributeFields && Object.keys(draftSubQ.attributes).length > 0) {
          await authStore.setSubQuestionAttributes(realId, draftSubQ.attributes)
        }
      }
    }

    // 3. Parallel updates for changed fields
    const promises: Promise<void>[] = []

    if (draft.type !== question.type) {
      promises.push(authStore.setQuestionType(questionId, draft.type))
    }

    if (draft.title !== question.title) {
      promises.push(authStore.setQuestionTitle(questionId, draft.title))
    }

    // Save question-level attributes/localizedAttributes if changed or schema exists
    if (schema?.localizedAttributes || schema?.attributes) {
      const origStr = JSON.stringify({
        a: question.attributes ?? {},
        la: question.localizedAttributes ?? {},
      })
      const draftStr = JSON.stringify({
        a: draft.attributes,
        la: draft.localizedAttributes,
      })
      if (origStr !== draftStr) {
        promises.push(
          authStore.setQuestionAttributes(questionId, draft.attributes, draft.localizedAttributes),
        )
      }
    }

    for (const draftChoice of draft.choices) {
      const orig = question.choices.find((c) => c.choiceId === draftChoice.choiceId)
      if (!orig) continue // newly created

      if (draftChoice.title !== orig.title) {
        promises.push(authStore.setChoiceTitle(draftChoice.choiceId, draftChoice.title))
      }
      if (draftChoice.mark !== orig.mark) {
        promises.push(authStore.setChoiceMark(draftChoice.choiceId, draftChoice.mark))
      }
      if (
        schema?.choiceAttributeFields &&
        JSON.stringify(draftChoice.attributes) !== JSON.stringify(orig.attributes ?? {})
      ) {
        promises.push(authStore.setChoiceAttributes(draftChoice.choiceId, draftChoice.attributes))
      }
    }

    for (const draftSubQ of draft.subQuestions) {
      const origSubQ = question.subQuestions?.find((s) => s.subQuestionId === draftSubQ.subQuestionId)
      if (!origSubQ) continue // newly created

      if (draftSubQ.title !== origSubQ.title) {
        promises.push(authStore.setSubQuestionTitle(draftSubQ.subQuestionId, draftSubQ.title))
      }
      if (
        schema?.subQuestionAttributeFields &&
        JSON.stringify(draftSubQ.attributes) !== JSON.stringify(origSubQ.attributes ?? {})
      ) {
        promises.push(
          authStore.setSubQuestionAttributes(draftSubQ.subQuestionId, draftSubQ.attributes),
        )
      }
    }

    await Promise.all(promises)

    // 4. Commit to local state
    const idx = localQuestions.value.findIndex((q) => q.questionId === questionId)
    if (idx !== -1) {
      localQuestions.value[idx] = {
        ...localQuestions.value[idx],
        type: draft.type,
        title: draft.title,
        choices: draft.choices.map((c) => ({ ...c })),
        subQuestions: draft.subQuestions.map((s) => ({ ...s })),
        attributes: { ...draft.attributes },
        localizedAttributes: { ...draft.localizedAttributes },
      }
    }

    cancelEdit(questionId)
  } catch (e) {
    errorMap.value[questionId] = e instanceof Error ? e.message : 'Ошибка сохранения'
  } finally {
    delete savingMap.value[questionId]
  }
}

// ───────── Create / Delete question ─────────
const isCreatingQuestion = ref(false)
const createError = ref('')
const newQuestionId = ref<string | null>(null)

const insertMenuBefore = ref(false)
const insertMenuAfter = ref<string | null>(null)

const createNewQuestion = async (type: string, insertIndex?: number): Promise<void> => {
  const cycleId = authStore.cycleId
  if (!cycleId) {
    createError.value = 'Нет активного цикла для создания вопроса'
    return
  }
  isCreatingQuestion.value = true
  createError.value = ''
  try {
    const newId = await authStore.createChoiceQuestion(cycleId, type)
    const targetIndex = insertIndex ?? localQuestions.value.length

    // Вычисляем queueCycle до вставки, смотрим на соседей
    const prevQC = targetIndex > 0 ? localQuestions.value[targetIndex - 1].queueCycle : undefined
    const nextQC = targetIndex < localQuestions.value.length
      ? localQuestions.value[targetIndex].queueCycle
      : undefined

    let newQueueCycle: number
    let needsFullRenumber = false

    if (prevQC === undefined && nextQC === undefined) {
      newQueueCycle = 1000
    } else if (prevQC === undefined) {
      newQueueCycle = (nextQC as number) - 1000
    } else if (nextQC === undefined) {
      newQueueCycle = prevQC + 1000
    } else if (nextQC - prevQC < 1) {
      needsFullRenumber = true
      newQueueCycle = prevQC // временное значение, заменится при перенумерации
    } else {
      newQueueCycle = (prevQC + nextQC) / 2
    }

    const newQuestion: SurveyQuestion = {
      questionId: newId,
      type,
      title: '',
      queueCycle: newQueueCycle,
      choices: [],
      subQuestions: [],
    }
    localQuestions.value.splice(targetIndex, 0, newQuestion)

    if (needsFullRenumber) {
      await renumberAllQueueCycles(
        localQuestions.value,
        (qId, qc, existingAttrs, existingLocalizedAttrs) =>
          authStore.setQuestionQueueCycle(qId, qc, existingAttrs, existingLocalizedAttrs),
      )
    } else {
      await authStore.setQuestionQueueCycle(newId, newQueueCycle)
    }

    // Сортируем по queueCycle
    localQuestions.value = [...localQuestions.value].sort((a, b) => a.queueCycle - b.queueCycle)

    startEdit(newQuestion)
    newQuestionId.value = newId
    setTimeout(() => {
      const el = document.querySelector(`[data-question-id="${newId}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
    setTimeout(() => {
      newQuestionId.value = null
    }, 4200)
  } catch (e) {
    createError.value = e instanceof Error ? e.message : 'Ошибка создания вопроса'
  } finally {
    isCreatingQuestion.value = false
  }
}

const deletingMap = ref<Record<string, boolean>>({})

const deleteQuestion = async (questionId: string): Promise<void> => {
  if (!confirm('Удалить вопрос?')) return
  deletingMap.value[questionId] = true
  try {
    await authStore.archiveQuestion(questionId)
    localQuestions.value = localQuestions.value.filter((q) => q.questionId !== questionId)
    cancelEdit(questionId)
  } catch (e) {
    errorMap.value[questionId] = e instanceof Error ? e.message : 'Ошибка удаления вопроса'
  } finally {
    delete deletingMap.value[questionId]
  }
}

// ───────── Add / remove choices in draft ─────────
const addDraftChoice = (questionId: string): void => {
  const schema = QUESTION_SCHEMAS[editingDrafts.value[questionId]?.type ?? '']
  editingDrafts.value[questionId]?.choices.push({
    choiceId: `new-${Date.now()}`,
    title: '',
    mark: 0,
    filterId: '',
    attributes: getSchemaDefaults(schema?.choiceAttributeFields),
  })
}

const removeDraftChoice = async (questionId: string, idx: number): Promise<void> => {
  const draft = editingDrafts.value[questionId]
  if (!draft) return
  const choice = draft.choices[idx]
  if (choice.choiceId.startsWith('new-')) {
    draft.choices.splice(idx, 1)
    return
  }
  try {
    await authStore.archiveChoice(choice.choiceId)
    draft.choices.splice(idx, 1)
    // Sync local question state too
    const q = localQuestions.value.find((q) => q.questionId === questionId)
    if (q) {
      q.choices = q.choices.filter((c) => c.choiceId !== choice.choiceId)
    }
  } catch (e) {
    errorMap.value[questionId] = e instanceof Error ? e.message : 'Ошибка удаления варианта'
  }
}

// ───────── Add / remove subQuestions in draft ─────────
const addDraftSubQuestion = (questionId: string): void => {
  const schema = QUESTION_SCHEMAS[editingDrafts.value[questionId]?.type ?? '']
  editingDrafts.value[questionId]?.subQuestions.push({
    subQuestionId: '',
    title: '',
    attributes: getSchemaDefaults(schema?.subQuestionAttributeFields),
  })
}

const removeDraftSubQuestion = async (questionId: string, idx: number): Promise<void> => {
  const draft = editingDrafts.value[questionId]
  if (!draft) return
  const subQ = draft.subQuestions[idx]
  if (!subQ.subQuestionId) {
    draft.subQuestions.splice(idx, 1)
    return
  }
  try {
    await authStore.archiveSubQuestion(subQ.subQuestionId)
    draft.subQuestions.splice(idx, 1)
    const q = localQuestions.value.find((q) => q.questionId === questionId)
    if (q?.subQuestions) {
      q.subQuestions = q.subQuestions.filter((s) => s.subQuestionId !== subQ.subQuestionId)
    }
  } catch (e) {
    errorMap.value[questionId] = e instanceof Error ? e.message : 'Ошибка удаления подвопроса'
  }
}

// Helpers for draft type capabilities
const draftHasChoices = (questionId: string): boolean => {
  const type = editingDrafts.value[questionId]?.type ?? ''
  return SURVEY_QUESTION_TYPES.find((t) => t.type === type)?.hasChoices ?? true
}

const draftHasSubQuestions = (questionId: string): boolean => {
  const type = editingDrafts.value[questionId]?.type ?? ''
  return SURVEY_QUESTION_TYPES.find((t) => t.type === type)?.hasSubQuestions ?? false
}

const goBack = (): void => {
  router.push({ name: 'home' })
}

// Drag-and-drop reorder handler
async function handleDragEnd(newList: SurveyQuestion[], evt: { newIndex: number }) {
  await reorderQuestions(
    newList,
    evt.newIndex,
    (qId, qc, existingAttrs, existingLocalizedAttrs) =>
      authStore.setQuestionQueueCycle(qId, qc, existingAttrs, existingLocalizedAttrs),
  )
  localQuestions.value = [...newList].sort((a, b) => a.queueCycle - b.queueCycle)
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
  { id: 'default',  name: 'По умолчанию', bg: '#ffffff',  text: '#212121', accent: '#61c13a' },
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
const resolvedSurveyBackground = computed(() => customBgColor.value.trim() || activeTheme.value.bg)
const surveyContentStyle = computed(() => ({
  backgroundColor: resolvedSurveyBackground.value,
  color: activeTheme.value.text,
  '--theme-bg': resolvedSurveyBackground.value,
  '--theme-text': activeTheme.value.text,
  '--theme-accent': activeTheme.value.accent,
  '--theme-border': `color-mix(in srgb, ${activeTheme.value.text} 25%, transparent)`,
  '--survey-font-family': selectedFontFamily.value,
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

const fontFamilyByOption: Record<string, string> = {
  Стандартный: 'Helvetica, Arial, sans-serif',
  Roboto: 'Roboto, Helvetica, Arial, sans-serif',
  'Open Sans': '"Open Sans", Helvetica, Arial, sans-serif',
  Montserrat: 'Montserrat, Helvetica, Arial, sans-serif',
  'Playfair Display': '"Playfair Display", Georgia, serif',
}

const selectedFontFamily = computed(() => {
  return fontFamilyByOption[selectedFont.value] ?? fontFamilyByOption['Стандартный']
})

const mainContentInnerStyle = computed(() => ({
  maxWidth: selectedLayout.value === 'full' ? '100%' : '1200px',
  margin: '0 auto',
}))

const handleLogoUpload = (file: File | null): void => {
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => { uploadedLogo.value = e.target?.result as string }
  reader.readAsDataURL(file)
}

const previewDialogOpen = ref(false)
const previewDialogTitle = ref('')
const previewDialogImageSrc = ref('')
const brokenPreviewTypes = ref<Record<string, boolean>>({})
const brokenChoiceImages = ref<Record<string, boolean>>({})

const getQuestionPreviewSrc = (type: string): string => `/question-type-previews/${type}.svg`

const normalizeImageUrl = (value: unknown): string => {
  return typeof value === 'string' ? value.trim() : ''
}

const getChoiceImageSrc = (questionId: string, choiceId: string, attributes?: Record<string, any>): string => {
  const imageUrl = normalizeImageUrl(attributes?.image)

  if (!imageUrl || brokenChoiceImages.value[`${questionId}:${choiceId}`]) {
    return ''
  }

  return imageUrl
}

const hasQuestionPreview = (type: string): boolean => {
  return !!type && !brokenPreviewTypes.value[type]
}

const markQuestionPreviewMissing = (type: string): void => {
  brokenPreviewTypes.value = {
    ...brokenPreviewTypes.value,
    [type]: true,
  }

  if (previewDialogImageSrc.value === getQuestionPreviewSrc(type)) {
    previewDialogOpen.value = false
  }
}

const markChoiceImageMissing = (questionId: string, choiceId: string): void => {
  const key = `${questionId}:${choiceId}`
  brokenChoiceImages.value = {
    ...brokenChoiceImages.value,
    [key]: true,
  }

  if (previewDialogImageSrc.value && previewDialogImageSrc.value === getChoiceImageSrc(questionId, choiceId)) {
    previewDialogOpen.value = false
  }
}

const openPreviewDialog = (title: string, imageSrc: string): void => {
  if (!imageSrc) return

  previewDialogTitle.value = title
  previewDialogImageSrc.value = imageSrc
  previewDialogOpen.value = true
}

const openQuestionPreview = (type: string): void => {
  if (!hasQuestionPreview(type)) return

  openPreviewDialog(
    SURVEY_QUESTION_TYPES.find((item) => item.type === type)?.typeName ?? type,
    getQuestionPreviewSrc(type),
  )
}

const openChoiceImagePreview = (
  questionTitle: string,
  choiceTitle: string,
  imageSrc: string,
): void => {
  const title = [questionTitle, choiceTitle].filter(Boolean).join(' / ')
  openPreviewDialog(title || 'Изображение варианта ответа', imageSrc)
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
              <!-- <div class="settings-section">
                <div class="row items-center justify-between">
                  <div class="settings-section-title q-mb-none">Футер</div>
                  <q-btn flat round dense icon="more_horiz" color="grey-6" size="sm" />
                </div>
              </div>

              <q-separator class="q-my-md" /> -->

              <!-- Шрифты -->
              <div class="settings-section">
                <div class="row items-center q-mb-sm">
                  <span class="settings-section-title q-mb-none q-mr-sm">Шрифты</span>
                  <span class="font-preview-aa" :style="{ fontFamily: selectedFontFamily }">Aa</span>
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
                <div class="settings-section-title q-mb-sm">Макет</div>
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
              <!-- <div class="settings-section">
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
              </div> -->

              <!-- <q-separator class="q-my-md" /> -->

              <!-- Цветовые пресеты -->
              <!-- <div class="settings-section">
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
              </div> -->

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
                  @click="() => { activeThemeId = theme.id; customBgColor = theme.bg }"
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
        <div class="q-pa-md" :style="mainContentInnerStyle">
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

      <div class="text-subtitle1 text-grey-8">
        Тип: {{ surveyTypeLabel }}
      </div>
      <div class="text-body2 text-grey-7 q-mb-md">
        Всего вопросов: {{ localQuestions.length }}
      </div>


          <!-- Добавить вопрос -->
          <div class="row items-center q-gutter-sm q-mb-md">
            <q-btn-dropdown
              color="primary"
              unelevated
              label="Добавить вопрос"
              icon="add"
              :loading="isCreatingQuestion"
              :disable="isCreatingQuestion"
            >
              <q-list dense>
                <q-item
                  v-for="qType in SURVEY_QUESTION_TYPES"
                  :key="qType.type"
                  clickable
                  v-close-popup
                  class="question-type-menu-item"
                  @click="createNewQuestion(qType.type)"
                >
                  <div
                    v-if="hasQuestionPreview(qType.type)"
                    class="question-type-menu-preview"
                  >
                    <img
                      :src="getQuestionPreviewSrc(qType.type)"
                      :alt="`Превью ${qType.type}`"
                      class="question-type-menu-preview-image"
                      @error="markQuestionPreviewMissing(qType.type)"
                    />
                  </div>
                  <q-item-section>
                    <q-item-label>{{ qType.typeName }}</q-item-label>
                    <q-item-label caption>{{ qType.type }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>
            <div v-if="createError" class="text-negative text-caption">{{ createError }}</div>
          </div>
      

      <div v-if="isLoadingQuestions" class="row justify-center q-pa-xl">
        <q-spinner size="40px" color="primary" />
      </div>

      <div v-else-if="loadError" class="text-negative text-body2 q-mb-md">
        {{ loadError }}
      </div>

      <div v-else-if="localQuestions.length === 0" class="text-body1 text-grey-7 q-mb-md">
        {{ emptyStateMessage }}
      </div>

      <div v-else class="column survey-cards-wrapper" :style="surveyContentStyle">

                <div v-if="surveyTitleError" class="text-negative text-caption q-my-md">
        {{ surveyTitleError }}
      </div>
          <div class="column q-gutter-md q-my-md q-px-md">
            <div class="survey-title-editor">
              <div v-if="!isEditingSurveyTitle" class="survey-title-display-row">
                <div class="text-h5 survey-title-text" :title="surveyTitle">{{ surveyTitle }}</div>
                <q-btn
                  class="survey-title-edit-btn"
                  flat
                  dense
                  round
                  icon="edit"
                  color="grey-6"
                  :disable="isSavingSurveyTitle"
                  @click="startSurveyTitleEdit"
                />
              </div>
              <q-input
                v-else
                ref="surveyTitleInputRef"
                v-model="surveyTitleDraft"
                dense
                outlined
                class="survey-title-input"
                :disable="isSavingSurveyTitle"
                @update:model-value="scheduleSurveyRename"
                @keyup.enter="stopSurveyTitleEdit"
                @blur="stopSurveyTitleEdit"
              >
                <template #append>
                  <q-spinner v-if="isSavingSurveyTitle" size="16px" color="primary" />
                </template>
              </q-input>
            </div>

          </div>

          <!-- Insert before first question -->
          <div class="insert-between-row" @click="insertMenuBefore = !insertMenuBefore">
            <div class="insert-between-line" />
            <q-btn
              round
              unelevated
              size="sm"
              color="positive"
              class="insert-between-btn"
              :loading="isCreatingQuestion"
              :disable="isCreatingQuestion"
              @click.stop="insertMenuBefore = !insertMenuBefore"
            >
              <i class="fa-solid fa-plus" />
            </q-btn>
            <div class="insert-between-line" />
            <q-menu
                v-if="insertMenuBefore"
                v-model="insertMenuBefore"
                no-parent-event
                anchor="bottom middle"
                self="top middle"
                auto-close
                style="min-width: 220px; border-radius: 8px"
              >
                <q-list separator>
                  <q-item-label header class="text-caption text-weight-bold q-pb-xs">Тип вопроса</q-item-label>
                  <q-item
                    v-for="qType in SURVEY_QUESTION_TYPES"
                    :key="qType.type"
                    v-ripple
                    clickable
                    class="question-type-menu-item"
                    @click="createNewQuestion(qType.type, 0)"
                  >
                    <div
                      v-if="hasQuestionPreview(qType.type)"
                      class="question-type-menu-preview"
                    >
                      <img
                        :src="getQuestionPreviewSrc(qType.type)"
                        :alt="`Превью ${qType.type}`"
                        class="question-type-menu-preview-image"
                        @error="markQuestionPreviewMissing(qType.type)"
                      />
                    </div>
                    <q-item-section>
                      <q-item-label>{{ qType.typeName }}</q-item-label>
                      <q-item-label caption>{{ qType.type }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
            </q-menu>
          </div>

          <draggable
            v-model="localQuestions"
            item-key="questionId"
            :animation="180"
            ghost-class="question-drag-ghost"
            chosen-class="question-drag-chosen"
            drag-class="question-dragging"
            @end="(evt: { newIndex: number }) => handleDragEnd(localQuestions, evt)"
          >
            <template #item="{ element: question, index }">
              <div class="question-item-wrapper">
              <q-card
                :key="question.questionId"
                :data-question-id="question.questionId"
                flat
                :class="['question-card custom-question-card', { 'question-card--new': newQuestionId === question.questionId, 'question-card--editing': isEditing(question.questionId) }]"
              >
                <q-card-section class="q-pb-sm">
                  <div class="row items-start justify-between no-wrap">
                    <div class="col min-width-0">
                      <div
                        :class="[
                          'q-mb-xs',
                          isEditing(question.questionId)
                            ? 'question-edit-handle-block'
                            : 'row items-center q-gutter-xs',
                        ]"
                      >
                        <q-icon
                          name="drag_indicator"
                          :class="[
                            'drag-handle',
                            'drag-handle-icon',
                            { 'drag-handle-icon--editing': isEditing(question.questionId) },
                          ]"
                        />
                        <span
                          v-if="isEditing(question.questionId)"
                          class="question-number-badge"
                        >{{ index + 1 }}</span>
                      </div>
                      <template v-if="isEditing(question.questionId)">
                        <!-- Тип вопроса -->
                        <q-select
                          :model-value="editingDrafts[question.questionId].type"
                          :options="SURVEY_QUESTION_TYPES"
                          option-value="type"
                          option-label="typeName"
                          emit-value
                          map-options
                          dense
                          outlined
                          label="Тип вопроса"
                          class="q-mb-sm"
                          @update:model-value="(v) => { editingDrafts[question.questionId].type = v; onDraftTypeChange(question.questionId, v) }"
                        />
                        <!-- Заголовок -->
                        <q-input
                          v-model="editingDrafts[question.questionId].title"
                          dense
                          outlined
                          autogrow
                          label="Заголовок вопроса"
                        />

                        <!-- ── Настройки: localizedAttributes ── -->
                        <template v-if="getActiveSchema(question.questionId)?.localizedAttributes">
                          <q-separator class="q-my-sm" />
                          <div class="schema-section-title">Локализованные настройки</div>
                          <template
                            v-for="(fieldDef, fieldKey) in getActiveSchema(question.questionId)?.localizedAttributes"
                            :key="`la-${fieldKey}`"
                          >
                            <schema-field
                              :field-def="fieldDef"
                              :model-value="editingDrafts[question.questionId].localizedAttributes[fieldKey]"
                              class="q-mb-xs"
                              @update:model-value="editingDrafts[question.questionId].localizedAttributes[fieldKey] = $event"
                            />
                          </template>
                        </template>

                        <!-- ── Настройки: attributes ── -->
                        <template v-if="getActiveSchema(question.questionId)?.attributes">
                          <q-separator class="q-my-sm" />
                          <div class="schema-section-title">Настройки вопроса</div>
                          <template
                            v-for="(fieldDef, fieldKey) in getActiveSchema(question.questionId)?.attributes"
                            :key="`a-${fieldKey}`"
                          >
                            <schema-field
                              :field-def="fieldDef"
                              :model-value="editingDrafts[question.questionId].attributes[fieldKey]"
                              class="q-mb-xs"
                              @update:model-value="editingDrafts[question.questionId].attributes[fieldKey] = $event"
                            />
                          </template>
                        </template>
                      </template>

                      <div v-else class="question-view-title">
                        <span class="question-number-badge">{{ index + 1 }}</span>
                        <span class="question-title-text">{{ question.title || 'Без заголовка' }}</span>
                        <q-badge
                          v-if="question.type"
                          color="blue-grey-2"
                          text-color="blue-grey-8"
                          class="q-ml-sm question-type-badge"
                        >{{ question.type }}</q-badge>
                      </div>
                    </div>
                    <div class="row items-start no-wrap q-ml-sm question-card-side">
                      <button
                        v-if="!isEditing(question.questionId) && hasQuestionPreview(question.type)"
                        type="button"
                        class="question-preview-button"
                        :aria-label="`Открыть превью для ${question.type}`"
                        @click="openQuestionPreview(question.type)"
                      >
                        <img
                          :src="getQuestionPreviewSrc(question.type)"
                          :alt="`Превью ${question.type}`"
                          class="question-preview-image"
                          @error="markQuestionPreviewMissing(question.type)"
                        />
                      </button>
                      <q-btn
                        flat
                        dense
                        round
                        icon="edit"
                        color="grey-6"
                        class="edit-btn-on-hover"
                        @click="toggleEdit(question)"
                      />
                    </div>
                  </div>
                </q-card-section>

                <q-card-section class="q-pt-sm">
                  <div class="column q-gutter-xs">
                    <!-- ── Edit mode ── -->
                    <template v-if="isEditing(question.questionId)">

                      <!-- Choices -->
                      <template v-if="draftHasChoices(question.questionId)">
                        <q-separator class="q-my-xs" />
                        <div class="schema-section-title">
                          {{ getActiveSchema(question.questionId)?.choicesTitle ?? 'Варианты ответов' }}
                        </div>
                        <div
                          v-for="(choice, idx) in editingDrafts[question.questionId].choices"
                          :key="choice.choiceId"
                          class="choice-edit-block q-mb-sm"
                        >
                          <div class="row items-center q-gutter-sm q-mb-xs">
                            <!-- title field -->
                            <q-input
                              v-if="!getActiveSchema(question.questionId)?.choiceSchemaFields || 'title' in (getActiveSchema(question.questionId)?.choiceSchemaFields ?? {})"
                              v-model="editingDrafts[question.questionId].choices[idx].title"
                              dense
                              outlined
                              :label="getActiveSchema(question.questionId)?.choiceSchemaFields?.title?.caption ?? 'Текст варианта'"
                              class="col"
                            />
                            <!-- mark field -->
                            <q-input
                              v-if="!getActiveSchema(question.questionId)?.choiceSchemaFields || 'mark' in (getActiveSchema(question.questionId)?.choiceSchemaFields ?? {})"
                              v-model.number="editingDrafts[question.questionId].choices[idx].mark"
                              dense
                              outlined
                              type="number"
                              :label="getActiveSchema(question.questionId)?.choiceSchemaFields?.mark?.caption ?? 'Балл'"
                              style="max-width: 90px"
                            />
                            <!-- filterId field (filters type) -->
                            <q-input
                              v-if="getActiveSchema(question.questionId)?.choiceSchemaFields?.filterId"
                              v-model="editingDrafts[question.questionId].choices[idx].filterId"
                              dense
                              outlined
                              label="ID фильтра"
                              class="col"
                            />
                            <q-btn
                              flat
                              dense
                              round
                              icon="delete"
                              color="negative"
                              size="sm"
                              :disable="isSaving(question.questionId)"
                              @click="removeDraftChoice(question.questionId, idx)"
                            />
                          </div>
                          <!-- Choice attributes from schema -->
                          <div
                            v-if="getActiveSchema(question.questionId)?.choiceAttributeFields"
                            class="choice-attrs-block q-pl-sm"
                          >
                            <template
                              v-for="(fieldDef, fieldKey) in getActiveSchema(question.questionId)?.choiceAttributeFields"
                              :key="`ca-${fieldKey}`"
                            >
                              <schema-field
                                :field-def="fieldDef"
                                :model-value="editingDrafts[question.questionId].choices[idx].attributes[fieldKey]"
                                class="q-mb-xs"
                                @update:model-value="editingDrafts[question.questionId].choices[idx].attributes[fieldKey] = $event"
                              />
                            </template>
                          </div>
                        </div>
                        <q-btn
                          flat
                          dense
                          size="sm"
                          icon="add"
                          label="Добавить вариант"
                          color="primary"
                          class="q-mt-xs"
                          :disable="isSaving(question.questionId)"
                          @click="addDraftChoice(question.questionId)"
                        />
                      </template>

                      <!-- SubQuestions (complex) -->
                      <template v-if="draftHasSubQuestions(question.questionId)">
                        <q-separator class="q-my-sm" />
                        <div class="schema-section-title">
                          {{ getActiveSchema(question.questionId)?.subQuestionsTitle ?? 'Подвопросы' }}
                        </div>
                        <div
                          v-for="(subQ, idx) in editingDrafts[question.questionId].subQuestions"
                          :key="subQ.subQuestionId || idx"
                          class="choice-edit-block q-mb-sm"
                        >
                          <div class="row items-center q-gutter-sm q-mb-xs">
                            <q-input
                              v-model="editingDrafts[question.questionId].subQuestions[idx].title"
                              dense
                              outlined
                              label="Текст подвопроса"
                              class="col"
                            />
                            <q-btn
                              flat
                              dense
                              round
                              icon="delete"
                              color="negative"
                              size="sm"
                              :disable="isSaving(question.questionId)"
                              @click="removeDraftSubQuestion(question.questionId, idx)"
                            />
                          </div>
                          <!-- SubQuestion attributes -->
                          <div
                            v-if="getActiveSchema(question.questionId)?.subQuestionAttributeFields"
                            class="choice-attrs-block q-pl-sm"
                          >
                            <template
                              v-for="(fieldDef, fieldKey) in getActiveSchema(question.questionId)?.subQuestionAttributeFields"
                              :key="`sqa-${fieldKey}`"
                            >
                              <schema-field
                                :field-def="fieldDef"
                                :model-value="editingDrafts[question.questionId].subQuestions[idx].attributes[fieldKey]"
                                class="q-mb-xs"
                                @update:model-value="editingDrafts[question.questionId].subQuestions[idx].attributes[fieldKey] = $event"
                              />
                            </template>
                          </div>
                        </div>
                        <q-btn
                          flat
                          dense
                          size="sm"
                          icon="add"
                          label="Добавить подвопрос"
                          color="primary"
                          class="q-mt-xs"
                          :disable="isSaving(question.questionId)"
                          @click="addDraftSubQuestion(question.questionId)"
                        />
                      </template>
                    </template>

                    <!-- ── View mode ── -->
                    <template v-else>
                      <div
                        v-for="choice in question.choices"
                        :key="choice.choiceId"
                        class="choice-row"
                      >
                        <button
                          v-if="getChoiceImageSrc(question.questionId, choice.choiceId, choice.attributes)"
                          type="button"
                          class="choice-image-button"
                          :aria-label="`Открыть изображение варианта ${choice.title || choice.choiceId}`"
                          @click="openChoiceImagePreview(question.title || 'Без заголовка', choice.title || 'Без подписи', getChoiceImageSrc(question.questionId, choice.choiceId, choice.attributes))"
                        >
                          <img
                            :src="getChoiceImageSrc(question.questionId, choice.choiceId, choice.attributes)"
                            :alt="`Изображение варианта ${choice.title || choice.choiceId}`"
                            class="choice-image-thumb"
                            @error="markChoiceImageMissing(question.questionId, choice.choiceId)"
                          />
                        </button>
                        <span v-else class="choice-radio-circle" />
                        <span class="choice-title">{{ choice.title || 'Без подписи' }}</span>
                      </div>
                      <template v-if="question.subQuestions && question.subQuestions.length">
                        <q-separator class="q-my-xs" />
                        <div
                          v-for="subQ in question.subQuestions"
                          :key="subQ.subQuestionId"
                          class="subquestion-row"
                        >
                          <q-icon name="subdirectory_arrow_right" size="14px" class="q-mr-xs" />
                          <span>{{ subQ.title || 'Без названия' }}</span>
                        </div>
                      </template>
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
                    <div class="row justify-between items-center">
                      <div class="row q-gutter-sm">
                        <q-btn
                          label="Сохранить"
                          color="primary"
                          unelevated
                          dense
                          :loading="isSaving(question.questionId)"
                          :disable="isSaving(question.questionId) || deletingMap[question.questionId]"
                          @click="saveQuestion(question.questionId)"
                        />
                        <q-btn
                          label="Отмена"
                          flat
                          dense
                          :disable="isSaving(question.questionId) || deletingMap[question.questionId]"
                          @click="cancelEdit(question.questionId)"
                        />
                      </div>
                      <q-btn
                        label="Удалить вопрос"
                        flat
                        dense
                        color="negative"
                        icon="delete"
                        :loading="deletingMap[question.questionId]"
                        :disable="isSaving(question.questionId) || deletingMap[question.questionId]"
                        @click="deleteQuestion(question.questionId)"
                      />
                    </div>
                  </q-card-section>
                </template>
              </q-card>
              <!-- Insert after this question -->
              <div class="insert-between-row" @click="insertMenuAfter = question.questionId">
                <div class="insert-between-line" />
                <q-btn
                  round
                  unelevated
                  size="sm"
                  color="positive"
                  class="insert-between-btn"
                  :loading="isCreatingQuestion"
                  :disable="isCreatingQuestion"
                  @click.stop="insertMenuAfter = question.questionId"
                >
                  <i class="fa-solid fa-plus" />
                  <q-menu
                    :model-value="insertMenuAfter === question.questionId"
                    no-parent-event
                    anchor="bottom middle"
                    self="top middle"
                    auto-close
                    style="min-width: 220px; border-radius: 8px"
                    @update:model-value="v => { if (!v) insertMenuAfter = null }"
                  >
                    <q-list separator>
                      <q-item-label header class="text-caption text-weight-bold q-pb-xs">Тип вопроса</q-item-label>
                      <q-item
                        v-for="qType in SURVEY_QUESTION_TYPES"
                        :key="qType.type"
                        v-ripple
                        clickable
                        class="question-type-menu-item"
                        @click="createNewQuestion(qType.type, index + 1)"
                      >
                        <div
                          v-if="hasQuestionPreview(qType.type)"
                          class="question-type-menu-preview"
                        >
                          <img
                            :src="getQuestionPreviewSrc(qType.type)"
                            :alt="`Превью ${qType.type}`"
                            class="question-type-menu-preview-image"
                            @error="markQuestionPreviewMissing(qType.type)"
                          />
                        </div>
                        <q-item-section>
                          <q-item-label>{{ qType.typeName }}</q-item-label>
                          <q-item-label caption>{{ qType.type }}</q-item-label>
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
                <div class="insert-between-line" />
              </div>
              </div>
            </template>
          </draggable>
      </div>

        </div><!-- /q-pa-lg -->
      </div><!-- /col main content -->

      <q-dialog v-model="previewDialogOpen">
        <q-card class="question-preview-dialog-card">
          <q-card-section class="row items-center justify-between q-pb-sm">
            <div class="text-subtitle1 text-weight-medium">
              {{ previewDialogTitle }}
            </div>
            <q-btn
              flat
              dense
              round
              icon="close"
              @click="previewDialogOpen = false"
            />
          </q-card-section>

          <q-card-section class="q-pt-none">
            <img
              v-if="previewDialogImageSrc"
              :src="previewDialogImageSrc"
              :alt="previewDialogTitle"
              class="question-preview-dialog-image"
            />
          </q-card-section>
        </q-card>
      </q-dialog>

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

.survey-title-editor {
  width: min(100%, 680px);
  min-height: 40px;
}

.survey-title-display-row {
  width: 100%;
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

:deep(.survey-title-edit-btn) {
  opacity: 0 !important;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.survey-title-display-row:hover :deep(.survey-title-edit-btn),
.survey-title-display-row:focus-within :deep(.survey-title-edit-btn) {
  opacity: 1 !important;
  pointer-events: auto;
}

.survey-title-text {
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.survey-title-input {
  width: 100%;
}

.logo-upload-area {
  position: relative;
  width: 120px;
  height: 120px;
  border: 2px dashed #bdbdbd;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  margin-top: 8px;
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
  border-color: #61c13a !important;
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
.survey-cards-wrapper {
  padding: 0 12px;
}

.survey-cards-wrapper,
.survey-cards-wrapper :deep(.q-card),
.survey-cards-wrapper :deep(.q-item),
.survey-cards-wrapper :deep(.q-btn),
.survey-cards-wrapper :deep(.q-field),
.survey-cards-wrapper :deep(.q-input),
.survey-cards-wrapper :deep(input),
.survey-cards-wrapper :deep(textarea),
.survey-cards-wrapper :deep(select) {
  font-family: var(--survey-font-family, Helvetica, Arial, sans-serif) !important;
}

.survey-cards-wrapper :deep(.q-card) {
  background: color-mix(in srgb, white 14%, var(--theme-bg, #fff)) !important;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04);
  border-radius: 8px;
  border: none !important;
}

.survey-cards-wrapper :deep(.q-separator) {
  background: rgba(0,0,0,0.08) !important;
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
  gap: 10px;
  padding: 7px 4px;
  border-radius: 4px;
  transition: background 0.12s;
}

.choice-row:hover {
  background: rgba(0,0,0,0.03);
}

.choice-radio-circle {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #9e9e9e;
  background: #fff;
  display: inline-block;
}

.choice-image-button {
  flex: 0 0 auto;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: zoom-in;
  border-radius: 10px;
  overflow: hidden;
  line-height: 0;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.choice-image-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 5px 14px rgba(0, 0, 0, 0.16);
}

.choice-image-thumb {
  display: block;
  width: 48px;
  height: 48px;
  object-fit: cover;
  background: #f4f8f2;
}

.choice-title {
  font-size: 14px;
  color: var(--theme-text, #212121);
}

.subquestion-row {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: var(--theme-text, #616161);
  padding: 4px 6px;
  opacity: 0.85;
}

/* ── Question view title ── */
.question-view-title {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
}

.question-card-side {
  align-items: flex-start;
  gap: 8px;
}

.question-preview-button {
  border: 0;
  padding: 0;
  background: transparent;
  cursor: zoom-in;
  border-radius: 12px;
  overflow: hidden;
  line-height: 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.question-preview-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.14);
}

.question-preview-image {
  display: block;
  width: 120px;
  height: 76px;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.5);
}

.question-preview-dialog-card {
  width: min(92vw, 760px);
  max-width: 760px;
  border-radius: 20px;
}

.question-preview-dialog-image {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 14px;
}

.question-type-menu-item {
  align-items: center;
  gap: 12px;
}

.question-type-menu-preview {
  flex: 0 0 auto;
  width: 72px;
  height: 48px;
  border-radius: 10px;
  overflow: hidden;
  background: #f4f8f2;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.question-type-menu-preview-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.question-number-badge {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: #61c13a;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.question-title-text {
  font-size: 15px;
  font-weight: 600;
  color: var(--theme-text, #212121);
  line-height: 1.4;
}

.question-type-badge {
  font-size: 10px !important;
  font-weight: 500;
  letter-spacing: 0.02em;
  align-self: center;
}

/* ── Schema fields ── */
.schema-section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--theme-text, #757575);
  margin-bottom: 6px;
}

.choice-edit-block {
  border: 1px solid var(--theme-border, #e8e8e8);
  border-radius: 8px;
  padding: 8px 10px;
  background: var(--theme-surface, #fafafa);
}

.choice-attrs-block {
  border-top: 1px dashed var(--theme-border, #e0e0e0);
  padding-top: 6px;
  margin-top: 4px;
}


/* Стили для карточки и кнопки редактирования */
.survey-cards-wrapper :deep(.custom-question-card) {
  transition: box-shadow 0.22s, background-color 0.22s;
}

.survey-cards-wrapper :deep(.custom-question-card.question-card--editing) {
  outline: 2px solid #61c13a;
  outline-offset: -2px;
}

.survey-cards-wrapper :deep(.custom-question-card:hover) {
  box-shadow: 0 3px 12px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06);
  background-color: color-mix(in srgb, var(--theme-text, #212121) 3%, var(--theme-bg, #fff)) !important;
}

/* Вставка вопроса между карточками */
.question-item-wrapper {
  display: block;
}

.insert-between-row {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 4px;
  opacity: 0;
  transition: opacity 0.18s;
  justify-content: center;
  cursor: pointer;
}

.insert-between-row:hover,
.insert-between-row:focus-within {
  opacity: 1;
}

.insert-between-line {
  flex: 1;
  height: 2px;
  border-radius: 1px;
  background: linear-gradient(90deg, transparent, #61c13a 40%, #61c13a 60%, transparent);
}

.insert-between-btn {
  flex-shrink: 0;
  align-self: center;
  min-width: 32px !important;
  min-height: 32px !important;
  box-shadow: 0 2px 8px rgba(97, 193, 58, 0.45);
}

/* Кнопка edit всегда занимает место, но скрывается по opacity */
.edit-btn-on-hover {
  opacity: 0 !important;
  transition: opacity 0.22s;
  pointer-events: none;
}

.survey-cards-wrapper :deep(.custom-question-card:hover) .edit-btn-on-hover {
  opacity: 1 !important;
  pointer-events: auto;
}

/* Иконка перетаскивания — скрыта, появляется при ховере на карточку */
.drag-handle-icon {
  cursor: grab;
  opacity: 0;
  transition: opacity 0.22s;
  margin-right: 4px;
  color: var(--theme-text, #424242);
}

.survey-cards-wrapper :deep(.custom-question-card:hover) .drag-handle-icon {
  opacity: 0.5;
}

.question-edit-handle-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
}

.survey-cards-wrapper :deep(.custom-question-card.question-card--editing) .drag-handle-icon--editing {
  opacity: 0.75 !important;
}

@media (max-width: 768px) {
  .question-card-side {
    flex-direction: column;
    align-items: flex-end;
  }

  .question-preview-image {
    width: 96px;
    height: 64px;
  }
}

/* Drag-and-drop states */
/* ghost = место-«дырка» в списке, делаем невидимым */
.survey-cards-wrapper :deep(.question-drag-ghost) {
  opacity: 0 !important;
}

.survey-cards-wrapper :deep(.question-drag-chosen),
.survey-cards-wrapper :deep(.question-dragging) {
  opacity: 1;
}

/* Pulse animation for newly inserted question */
@keyframes question-pulse {
  0%   { outline-color: rgba(97, 193, 58, 1); }
  50%  { outline-color: rgba(97, 193, 58, 0.05); }
  100% { outline-color: rgba(97, 193, 58, 1); }
}

.survey-cards-wrapper :deep(.question-card--new) {
  animation: question-pulse 1s ease-in-out 4 !important;
  outline: 3px solid rgba(97, 193, 58, 1);
  outline-offset: -3px;
  border-radius: 8px;
}

</style>
