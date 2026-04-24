<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import QRCode from 'qrcode'
import AppLayout from '../layouts/AppLayout.vue'
import { useAuthStore, type RemoteGeneralLink } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const links = ref<RemoteGeneralLink[]>([])
const isLoading = ref(false)
const isCreating = ref(false)
const errorMessage = ref('')
const qrCanvases = ref<Record<string, HTMLCanvasElement>>({})

const getDisplayUrl = (link: RemoteGeneralLink): string =>
  link.url ?? link.link ?? ''

const getEmbeddableUrl = (link: RemoteGeneralLink): string => {
  const raw = getDisplayUrl(link).trim()
  if (!raw) return ''

  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return ''
    }
    return parsed.toString()
  } catch {
    return ''
  }
}

const getLinkId = (link: RemoteGeneralLink): string =>
  link.generalLinkId ?? link.id ?? ''

const renderQrCodes = async (): Promise<void> => {
  await nextTick()
  for (const link of links.value) {
    const url = getDisplayUrl(link)
    const id = getLinkId(link)
    if (!url || !id) continue
    const canvas = qrCanvases.value[id]
    if (!canvas) continue
    await QRCode.toCanvas(canvas, url, { width: 180, margin: 1 })
  }
}

const ensureSurveyId = async (): Promise<string | null> => {
  if (authStore.surveyId) return authStore.surveyId

  const cycleId = authStore.cycleId
  if (!cycleId) return null

  try {
    await authStore.fetchAndSaveSurveyId(cycleId)
  } catch {
    // ignore
  }

  return authStore.surveyId || null
}

const loadLinks = async (): Promise<void> => {
  const surveyId = await ensureSurveyId()
  const cycleId = authStore.cycleId
  if (!surveyId || !cycleId) return

  isLoading.value = true
  errorMessage.value = ''
  try {
    // Получаем все вопросы для текущего цикла
    const questions = await authStore.getQuestions(cycleId)
    const questionIds = questions
      .map(q => q.questionId ?? q.id)
      .filter((id): id is string => typeof id === 'string' && !!id)
    if (questionIds.length > 0) {
      await authStore.linkQuestionsToSurvey(surveyId, questionIds)
    }
    links.value = await authStore.getGeneralLinks(surveyId, cycleId)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Ошибка загрузки ссылок'
  } finally {
    isLoading.value = false
  }
}

const createLink = async (): Promise<void> => {
  const surveyId = await ensureSurveyId()
  const cycleId = authStore.cycleId
  if (!surveyId) {
    errorMessage.value = 'Не найден surveyId. Убедитесь, что исследование создано.'
    return
  }

  isCreating.value = true
  errorMessage.value = ''
  try {
    await authStore.createGeneralLink(surveyId)
    links.value = await authStore.getGeneralLinks(surveyId, cycleId)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Ошибка создания ссылки'
  } finally {
    isCreating.value = false
  }
}

const copyToClipboard = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
}

const setCanvasRef = (el: unknown, id: string): void => {
  if (el instanceof HTMLCanvasElement) {
    qrCanvases.value[id] = el
  }
}

watch(links, async () => {
  await nextTick()
  await nextTick()
  await renderQrCodes()
})

// --- Дата окончания опроса ---
const surveyFinishTime = ref<string>('')
const finishTimeEdit = ref<string>('')
const isSavingFinishTime = ref(false)
const finishTimeSaved = ref(false)
const finishTimeError = ref('')

const formatLocalDatetime = (iso: string): string => {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch { return '' }
}

const formatDisplayDate = (iso: string): string => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  } catch { return iso }
}

const loadFinishTime = async (): Promise<void> => {
  const cycleId = authStore.cycleId
  if (!cycleId) return
  try {
    const surveys = await authStore.getSurveys(cycleId)
    const ft = surveys[0]?.finishTime ?? ''
    surveyFinishTime.value = ft
    finishTimeEdit.value = formatLocalDatetime(ft)
  } catch { /* ignore */ }
}

const saveFinishTime = async (): Promise<void> => {
  const surveyId = await ensureSurveyId()
  if (!surveyId) { finishTimeError.value = 'Не найден surveyId'; return }
  if (!finishTimeEdit.value) { finishTimeError.value = 'Укажите дату'; return }
  isSavingFinishTime.value = true
  finishTimeError.value = ''
  finishTimeSaved.value = false
  try {
    const isoDate = new Date(finishTimeEdit.value).toISOString()
    await authStore.changeSurveyFinishTime(surveyId, isoDate)
    surveyFinishTime.value = isoDate
    finishTimeSaved.value = true
    setTimeout(() => { finishTimeSaved.value = false }, 3000)
  } catch (e) {
    finishTimeError.value = e instanceof Error ? e.message : 'Ошибка сохранения'
  } finally {
    isSavingFinishTime.value = false
  }
}

onMounted(() => {
  loadLinks()
  loadFinishTime()
})

const emailsInput = ref('')
const emailSubject = ref('Приглашение пройти опрос')
const emailBody = ref(`<p>Здравствуйте!</p><p>Приглашаем вас принять участие в нашем корпоративном опросе. Ваше мнение очень важно для нас — это поможет сделать работу в компании лучше.</p><p><strong>Ссылка для прохождения:</strong> [ссылка будет добавлена автоматически]</p><p>Опрос займёт не более 5–10 минут. Все ответы анонимны.</p><p>С уважением,<br/>Команда Happy Job</p>`)
</script>

<template>
  <AppLayout>
    <q-page class="q-pa-lg">
      <div class="row justify-end q-mb-lg">
        <q-btn
          label="Назад к вопросам"
          color="primary"
          outline
          style="min-width: 160px"
          @click="router.back()"
        />
      </div>

      <!-- Дата окончания опроса -->
      <q-card flat bordered class="finish-time-card q-mb-xl">
        <q-card-section class="finish-time-inner">
          <div class="finish-time-left">
            <div class="finish-time-icon-wrap">
              <q-icon name="event" size="28px" color="primary" />
            </div>
            <div>
              <div class="text-caption text-grey-6 q-mb-xs" style="text-transform:uppercase;letter-spacing:.05em;font-size:11px">Дата окончания опроса</div>
              <div class="finish-time-display text-body1 text-weight-medium">
                {{ formatDisplayDate(surveyFinishTime) }}
              </div>
            </div>
          </div>
          <div class="finish-time-right">
            <q-input
              v-model="finishTimeEdit"
              type="datetime-local"
              dense
              outlined
              class="finish-time-input"
              :error="!!finishTimeError"
              :error-message="finishTimeError"
              hide-bottom-space
            />
            <q-btn
              label="Сохранить"
              color="primary"
              unelevated
              :loading="isSavingFinishTime"
              :disable="isSavingFinishTime"
              class="finish-time-btn"
              @click="saveFinishTime"
            />
            <transition name="fade">
              <div v-if="finishTimeSaved" class="finish-time-saved">
                <q-icon name="check_circle" color="positive" size="18px" />
                Сохранено
              </div>
            </transition>
          </div>
        </q-card-section>
      </q-card>


      <div class="column q-gutter-md q-mb-lg">
        <div class="text-h5">Распространение анкеты</div>
        <div class="text-body2 text-grey-7">
          Создайте общую ссылку для прохождения опроса
        </div>
      </div>

      <div v-if="errorMessage" class="text-negative text-body2 q-mb-md">
        {{ errorMessage }}
      </div>

      <q-btn
        label="Создать общую ссылку"
        color="primary"
        unelevated
        :loading="isCreating"
        :disable="isCreating || isLoading"
        class="q-mb-lg"
        @click="createLink"
      />

      <div v-if="isLoading" class="row justify-center q-pa-xl">
        <q-spinner size="40px" color="primary" />
      </div>

      <div v-else-if="links.length > 0" class="column q-gutter-md">
        <q-card
          v-for="link in links"
          :key="getLinkId(link)"
          bordered
          flat
        >
          <q-card-section>
            <div class="text-subtitle2 q-mb-xs">{{ link.title ?? 'Общая ссылка' }}</div>
            <div class="text-caption text-grey-6 q-mb-sm">
              Статус: {{ link.status ?? '—' }}
            </div>
            <template v-if="getDisplayUrl(link)">
              <div class="row items-start q-gutter-md">
                <canvas
                  :ref="(el) => setCanvasRef(el, getLinkId(link))"
                  class="qr-canvas"
                />
                <div class="col column q-gutter-sm justify-center">
                  <div class="text-body2 text-primary link-text">
                    {{ getDisplayUrl(link) }}
                  </div>
                  <div class="row q-gutter-sm">
                    <q-btn
                      flat
                      dense
                      icon="content_copy"
                      color="grey-7"
                      label="Скопировать"
                      @click="copyToClipboard(getDisplayUrl(link))"
                    />
                    <q-btn
                      flat
                      dense
                      icon="open_in_new"
                      color="primary"
                      label="Открыть"
                      :href="getDisplayUrl(link)"
                      target="_blank"
                      type="a"
                    />
                  </div>
                  <div v-if="getEmbeddableUrl(link)" class="link-preview-frame-wrap q-mt-sm">
                    <iframe
                      :src="getEmbeddableUrl(link)"
                      class="link-preview-frame"
                      title="Предпросмотр общей ссылки"
                      loading="lazy"
                      referrerpolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>
            </template>
            <div v-else class="text-caption text-grey-5">
              Ссылка ещё не сформирована
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div v-else-if="!isLoading" class="text-grey-6 text-body2">
        Ссылок пока нет. Нажмите «Создать общую ссылку».
      </div>

          <!-- Email рассылка -->
    <div class="q-mt-xl">
      <q-separator spaced />
      <div class="text-h5 q-mb-md q-mt-xl">Разослать приглашения по email</div>
      <div class="row q-col-gutter-md">
        <div class="col-12 col-md-5">
          <q-card flat bordered class="q-pa-md bg-grey-1">
            <div class="text-subtitle2 q-mb-sm">Email-адреса участников</div>
            <q-input
              v-model="emailsInput"
              type="textarea"
              autogrow
              placeholder="Введите email-адреса через запятую или с новой строки"
              class="q-mb-sm"
            />
            <div class="text-caption text-grey-7 q-mb-sm">Можно вставить список адресов из Excel/Google Sheets</div>
            <q-btn label="Добавить адреса" color="primary" flat :disable="true" />
          </q-card>
        </div>
        <div class="col-12 col-md-7">
          <q-card flat bordered class="q-pa-md bg-grey-1">
            <div class="text-subtitle2 q-mb-sm">Шаблон письма</div>
            <q-input
              v-model="emailSubject"
              label="Тема письма"
              class="q-mb-sm"
              :dense="true"
            />
            <q-editor
              v-model="emailBody"
              min-height="150px"
              placeholder="Текст письма..."
              toolbar-text-color="grey-8"
              toolbar-bg="grey-2"
              :dense="true"
              class="q-mb-md"
            />
            <!-- Предпросмотр письма -->
            <div class="email-preview q-mb-md">
              <div class="email-preview__label text-caption text-grey-6 q-mb-xs">Предпросмотр письма</div>
              <div class="email-preview__window">
                <div class="email-preview__header">
                  <div class="email-preview__dots">
                    <span /><span /><span />
                  </div>
                  <div class="email-preview__bar">📧 Входящие</div>
                </div>
                <div class="email-preview__body">
                  <div class="email-preview__meta">
                    <div class="email-preview__avatar">HJ</div>
                    <div class="email-preview__from">
                      <div class="text-weight-medium" style="font-size:13px">Happy Job <span class="text-grey-6" style="font-weight:400">&lt;noreply@happyjob.ru&gt;</span></div>
                      <div class="text-caption text-grey-6">Кому: участник@компания.ru</div>
                    </div>
                    <div class="text-caption text-grey-5 q-ml-auto">Сейчас</div>
                  </div>
                  <div class="email-preview__subject text-weight-bold q-mb-sm">{{ emailSubject || 'Тема письма' }}</div>
                  <div class="email-preview__content" v-html="emailBody || 'Текст письма...'" />
                </div>
              </div>
            </div>
            <q-btn label="Отправить приглашения" color="primary" unelevated :disable="true" />
            <div class="text-caption text-grey-7 q-mt-sm">Функция рассылки будет доступна в ближайших обновлениях</div>
          </q-card>
        </div>
      </div>
    </div>


    </q-page>
  </AppLayout>
</template>

<style scoped>
.qr-canvas {
  border-radius: 8px;
  flex-shrink: 0;
}

.link-text {
  word-break: break-all;
}

.link-preview-frame-wrap {
  width: 100%;
  max-width: 420px;
  height: 600px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;

  > iframe {
    height: 100%;
  }
}

.link-preview-frame {
  display: block;
  width: 100%;
  height: min(70vh, 560px);
  border: 0;
}

.email-preview__label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.email-preview__window {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.07);
  background: #fff;
}

.email-preview__header {
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  padding: 8px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.email-preview__dots {
  display: flex;
  gap: 5px;
  span {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #d0d0d0;
    &:nth-child(1) { background: #ff5f57; }
    &:nth-child(2) { background: #ffbd2e; }
    &:nth-child(3) { background: #27c93f; }
  }
}

.email-preview__bar {
  font-size: 12px;
  color: #888;
  flex: 1;
  text-align: center;
}

.email-preview__body {
  padding: 20px 24px 24px;
}

.email-preview__meta {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.email-preview__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.email-preview__from {
  flex: 1;
}

.email-preview__subject {
  font-size: 16px;
  color: #1a1a1a;
}

.email-preview__content {
  font-size: 14px;
  line-height: 1.7;
  color: #333;
  p {
    margin: 0 0 10px;
  }
}

/* --- finish time card --- */
.finish-time-card {
  border-radius: 14px;
  background: linear-gradient(100deg, #f9fffe 0%, #f0faf4 100%);
  border: 1.5px solid #d4eedb;
}

.finish-time-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}

.finish-time-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.finish-time-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #e8f7ee;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.finish-time-display {
  color: #1a1a1a;
  font-size: 16px;
}

.finish-time-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.finish-time-input {
  min-width: 220px;
}

.finish-time-btn {
  border-radius: 8px;
  min-height: 40px;
}

.finish-time-saved {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #27ae60;
  font-weight: 500;
}

.fade-enter-active, .fade-leave-active { transition: opacity .3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
