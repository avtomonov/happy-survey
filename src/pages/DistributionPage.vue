<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
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
    const questionIds = questions.map(q => q.questionId ?? q.id).filter(Boolean)
    if (questionIds.length > 0) {
      await authStore.linkQuestionsToSurvey(surveyId, questionIds)
    }
    links.value = await authStore.getGeneralLinks(surveyId, cycleId)
    await renderQrCodes()
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
    await renderQrCodes()
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

onMounted(loadLinks)
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
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}

.link-preview-frame {
  display: block;
  width: 100%;
  height: min(70vh, 560px);
  border: 0;
}
</style>
