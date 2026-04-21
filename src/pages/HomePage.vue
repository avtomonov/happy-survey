<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'
import { getQuestionsByType, TEMPLATE_CYCLE_ID } from '../data/questionSets'
import CookieRepository from '../services/Repositories/CookieRepository'
import { useAuthStore } from '../stores/auth'

interface SurveyCard {
  id: string
  title: string
  description: string
  icon: string
  iconColor: string
  kind: 'custom' | 'template' | 'engagement'
}

interface SurveyCardCategory {
  id: string
  title: string
  cards: SurveyCard[]
}

const surveyCardCategories: SurveyCardCategory[] = [
  {
    id: 'main',
    title: '',
    cards: [
      {
        id: 'custom',
        title: 'Свой опрос с нуля',
        description: 'Создайте собственный опрос с нужными вам вопросами',
        icon: 'edit_note',
        iconColor: 'primary',
        kind: 'custom',
      },
      {
        id: 'engagement',
        title: 'Исследование вовлеченности',
        description: 'Готовый шаблон для измерения вовлеченности сотрудников',
        icon: 'people',
        iconColor: 'secondary',
        kind: 'engagement',
      },
    ],
  },
  {
    id: 'marketing',
    title: 'Маркетинг, периодические и пульс (мес, неделя, день) для клиентов',
    cards: [
      {
        id: 'nps',
        title: 'NPS',
        description: 'Готовый шаблон опроса для оценки лояльности клиентов',
        icon: 'insights',
        iconColor: 'primary',
        kind: 'template',
      },
      {
        id: 'csat',
        title: 'CSAT',
        description: 'Шаблон для измерения удовлетворенности клиентов',
        icon: 'sentiment_satisfied',
        iconColor: 'primary',
        kind: 'template',
      },
      {
        id: 'ces',
        title: 'CES',
        description: 'Опрос для оценки усилий клиента при взаимодействии',
        icon: 'bolt',
        iconColor: 'primary',
        kind: 'template',
      },
      {
        id: 'our_products',
        title: 'Наши товары',
        description: 'Шаблон для обратной связи по линейке товаров',
        icon: 'inventory_2',
        iconColor: 'primary',
        kind: 'template',
      },
      {
        id: 'product_quality',
        title: 'Оценка качества продукта',
        description: 'Готовый опрос для проверки восприятия качества продукта',
        icon: 'verified',
        iconColor: 'primary',
        kind: 'template',
      },
      // {
      //   id: 'focus_group',
      //   title: 'Отбор для фокус-группы',
      //   description: 'Шаблон для предварительного отбора участников исследования',
      //   icon: 'groups',
      //   iconColor: 'primary',
      //   kind: 'template',
      // },
      {
        id: 'software',
        title: 'Оценка программного обеспечения',
        description: 'Опрос для сбора обратной связи по цифровому продукту',
        icon: 'laptop_chromebook',
        iconColor: 'primary',
        kind: 'template',
      },
    ],
  },
  {
    id: 'education',
    title: 'Образование',
    cards: [
      {
        id: 'school',
        title: 'Оценка деятельности школы глазами родителей',
        description: 'Готовый шаблон для сбора оценки школьной среды и процессов',
        icon: 'school',
        iconColor: 'primary',
        kind: 'template',
      },
      {
        id: 'courses',
        title: 'Оценка образовательных курсов',
        description: 'Шаблон для обратной связи по курсам и программам обучения',
        icon: 'menu_book',
        iconColor: 'primary',
        kind: 'template',
      },
    ],
  },
]

const router = useRouter()
const authStore = useAuthStore()
const loaderShownCookie = new CookieRepository('home_loader_shown')
const hasShownLoader = loaderShownCookie.value === '1'
const isLoading = ref<boolean>(false)
const errorMessage = ref<string>('')
const isLoaded = ref<boolean>(false)
const showLoader = ref<boolean>(!hasShownLoader)
const showCards = ref<boolean>(hasShownLoader)
const emit = defineEmits<{ (event: 'loaded'): void }>()

let finishTimerId: number | null = null
let hideTimerId: number | null = null
let cardsTimerId: number | null = null

interface CharSpan {
  char: string
  charIndex: number
  globalCharIndex: number
}

interface WordSpan {
  word: string
  wordIndex: number
  chars: CharSpan[]
}

function splitTextIntoWords(text: string): WordSpan[] {
  const words = text.split(' ')
  let globalCharIndex = 0
  return words.map((word, wordIndex) => ({
    word,
    wordIndex,
    chars: word.split('').map((char, charIndex) => {
      const charObj = { char, charIndex, globalCharIndex }
      globalCharIndex++
      return charObj
    }),
  }))
}

onMounted(() => {
  if (hasShownLoader) {
    emit('loaded')
    return
  }

  loaderShownCookie.value = '1'

  finishTimerId = window.setTimeout(() => {
    isLoaded.value = true

    hideTimerId = window.setTimeout(() => {
      showLoader.value = false
      emit('loaded')

      cardsTimerId = window.setTimeout(() => {
        showCards.value = true
      }, 154)
    }, 364)
  }, 2048)
})

onBeforeUnmount(() => {
  if (finishTimerId !== null) {
    window.clearTimeout(finishTimerId)
  }

  if (hideTimerId !== null) {
    window.clearTimeout(hideTimerId)
  }

  if (cardsTimerId !== null) {
    window.clearTimeout(cardsTimerId)
  }
})

const wait = (ms: number): Promise<void> => new Promise((resolve) => {
  window.setTimeout(resolve, ms)
})

const waitForQuestions = async (cycleId: string): Promise<void> => {
  while (true) {
    const remoteQuestions = await authStore.getQuestions(cycleId)

    if (remoteQuestions.length > 0) {
      return
    }

    await wait(1000)
  }
}

const openCustomSurvey = async (): Promise<void> => {
  if (isLoading.value) {
    return
  }

  errorMessage.value = ''
  isLoading.value = true

  try {
    await authStore.launchCustomStudy()
    await router.push({ name: 'question-set' })
  } catch (error: unknown) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : 'Не удалось выполнить выбранное действие. Повторите попытку.'
  } finally {
    isLoading.value = false
  }
}

const openTemplateSurvey = async (typeId: string): Promise<void> => {
  if (isLoading.value) {
    return
  }

  errorMessage.value = ''
  isLoading.value = true

  const questions = getQuestionsByType(typeId)
  if (questions.length === 0) {
    isLoading.value = false
    await router.push({ name: 'question-set', query: { type: typeId } })
    return
  }

  try {
    await authStore.launchCustomStudy()

    const cycleId = authStore.cycleId
    if (!cycleId) {
      throw new Error('Не удалось создать цикл опроса для загрузки шаблона')
    }

    await authStore.copyQuestions(
      TEMPLATE_CYCLE_ID,
      cycleId,
      questions.map((question) => question.questionId),
    )

    await waitForQuestions(cycleId)

    await router.push({ name: 'question-set', query: { type: typeId } })
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : 'Не удалось скопировать вопросы'
  } finally {
    isLoading.value = false
  }
}

const openEngagementSurvey = async (): Promise<void> => {
  if (isLoading.value) {
    return
  }

  errorMessage.value = 'Сценарий исследования вовлеченности пока не настроен отдельно.'
}

const openSurveyCard = async (card: SurveyCard): Promise<void> => {
  if (card.kind === 'custom') {
    await openCustomSurvey()
    return
  }

  if (card.kind === 'engagement') {
    await openEngagementSurvey()
    return
  }

  await openTemplateSurvey(card.id)
}
</script>

<template>
  <!-- <div v-if="showLoader" class="loader-container" :class="{ 'fade-out': isLoaded }">
    <svg
      viewBox="-3 -3 135 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="logo-svg"
    >
      <g>
        <path
          class="logo-icon"
          d="M18.3066 3.46139L10.83 0.169922L3.19414 3.37291L0 11.3185L3.29147 18.7508L10.7061 21.8299L18.8109 18.2907L21.66 10.6548L18.3066 3.46139ZM15.6079 15.5478C14.2114 16.6971 12.47 17.3451 10.6619 17.3882C8.90284 17.3723 7.21013 16.7147 5.90164 15.539C5.83076 15.4809 5.77202 15.4094 5.72877 15.3286C5.68552 15.2478 5.65861 15.1593 5.64957 15.0681C5.64053 14.9769 5.64955 14.8848 5.6761 14.7971C5.70265 14.7093 5.74622 14.6277 5.80431 14.5568C5.86241 14.486 5.9339 14.4272 6.0147 14.384C6.0955 14.3407 6.18402 14.3138 6.27522 14.3048C6.36642 14.2957 6.45851 14.3047 6.54622 14.3313C6.63394 14.3578 6.71557 14.4014 6.78645 14.4595C7.88346 15.4357 9.29961 15.977 10.7681 15.9814C12.2482 15.925 13.6688 15.3841 14.8116 14.4418C14.8838 14.3822 14.9673 14.338 15.0571 14.3117C15.1469 14.2854 15.2411 14.2776 15.334 14.2889C15.4268 14.3001 15.5165 14.3301 15.5974 14.3771C15.6783 14.4241 15.7489 14.487 15.8047 14.5621C15.8606 14.6371 15.9006 14.7228 15.9223 14.8138C15.944 14.9048 15.947 14.9993 15.9311 15.0915C15.9152 15.1837 15.8807 15.2717 15.8297 15.3501C15.7787 15.4286 15.7123 15.4958 15.6345 15.5478H15.6079Z"
          fill="transparent"
          stroke="#61C13A"
          stroke-width="1"
        />
        <path class="letter-path letter-1" d="M30.2168 5.19531H32.7385V9.7786H37.4368V5.19531H39.985V16.7774H37.4633V12.1322H32.7385V16.7774H30.2168V5.19531Z" fill="transparent" stroke="#5D5D5D" stroke-width="1" />
        <path class="letter-path letter-2" d="M46.4872 5.10742H48.8408L53.8045 16.778H51.1501L50.0883 14.1767H45.1865L44.1248 16.778H41.5234L46.4872 5.10742ZM49.1416 11.9293L47.6286 8.13345L46.0979 11.9293H49.1416Z" fill="transparent" stroke="#5D5D5D" stroke-width="1" />
        <path class="letter-path letter-3" d="M55.3174 5.19531H60.0511C62.8117 5.19531 64.4751 6.8322 64.4751 9.23002C64.4751 11.8844 62.387 13.3001 59.7945 13.3001H57.8656V16.7774H55.3174V5.19531ZM59.883 11.035C60.1353 11.0707 60.3923 11.0515 60.6365 10.9787C60.8806 10.9059 61.1062 10.7812 61.2978 10.6132C61.4893 10.4451 61.6423 10.2377 61.7463 10.0051C61.8503 9.77252 61.9028 9.5202 61.9003 9.26541C61.9003 8.12401 61.104 7.4958 59.8299 7.4958H57.8656V11.035H59.883Z" fill="transparent" stroke="#5D5D5D" stroke-width="1" />
        <path class="letter-path letter-4" d="M66.1035 5.19531H70.8372C73.5978 5.19531 75.2612 6.8322 75.2612 9.23002C75.2612 11.8844 73.1731 13.3001 70.5806 13.3001H68.6517V16.7774H66.1035V5.19531ZM70.6691 11.035C70.9214 11.0707 71.1784 11.0515 71.4226 10.9787C71.6668 10.9059 71.8923 10.7812 72.0839 10.6132C72.2754 10.4451 72.4284 10.2377 72.5324 10.0051C72.6364 9.77252 72.689 9.5202 72.6865 9.26541C72.6865 8.12401 71.8901 7.4958 70.616 7.4958H68.6517V11.035H70.6691Z" fill="transparent" stroke="#5D5D5D" stroke-width="1" />
        <path class="letter-path letter-5" d="M79.9865 12.2118L75.5625 5.19531H78.5443L81.3049 9.84938L84.0566 5.19531H86.9499L82.5259 12.1587V16.7774H79.9865V12.2118Z" fill="transparent" stroke="#5D5D5D" stroke-width="1" />
        <path class="letter-path letter-6" d="M91.834 15.2113L93.4355 13.4417C93.6862 13.7731 94.006 14.046 94.3726 14.2416C94.7393 14.4371 95.1441 14.5507 95.559 14.5742C96.5146 14.5742 97.1163 13.9991 97.1163 12.6542V5.19531H99.7707V12.7781C99.8051 13.3415 99.7257 13.9061 99.5372 14.4381C99.3487 14.9702 99.055 15.4588 98.6735 15.8749C98.2689 16.2456 97.7945 16.5319 97.2779 16.7173C96.7614 16.9026 96.2132 16.9832 95.6652 16.9544C94.9354 16.979 94.2098 16.8345 93.5452 16.5321C92.8806 16.2297 92.2949 15.7776 91.834 15.2113Z" fill="transparent" stroke="#5D5D5D" stroke-width="1" />
        <path class="letter-path letter-7" d="M101.549 10.9818C101.51 9.74705 101.842 8.52887 102.5 7.48387C103.159 6.43887 104.116 5.6148 105.247 5.11757C106.378 4.62034 107.631 4.47267 108.847 4.69355C110.062 4.91442 111.184 5.49374 112.068 6.35705C112.951 7.22037 113.557 8.32822 113.806 9.53823C114.055 10.7482 113.937 12.0051 113.466 13.1473C112.995 14.2895 112.194 15.2649 111.164 15.948C110.135 16.6311 108.925 16.9908 107.689 16.9808C106.89 17.0009 106.094 16.8605 105.349 16.5679C104.604 16.2754 103.925 15.8365 103.353 15.2773C102.781 14.7181 102.326 14.0499 102.016 13.3122C101.706 12.5744 101.548 11.782 101.549 10.9818ZM111.193 10.9818C111.206 10.5089 111.124 10.0382 110.952 9.59753C110.78 9.15683 110.522 8.7551 110.192 8.41607C109.862 8.07705 109.467 7.80762 109.031 7.6237C108.596 7.43978 108.127 7.34511 107.654 7.34529C107.184 7.3448 106.718 7.43974 106.286 7.62436C105.853 7.80898 105.462 8.07946 105.137 8.41941C104.812 8.75937 104.559 9.16174 104.394 9.60218C104.229 10.0426 104.155 10.512 104.177 10.9818C104.164 11.4547 104.246 11.9254 104.418 12.3661C104.59 12.8068 104.848 13.2086 105.178 13.5476C105.508 13.8866 105.903 14.1561 106.339 14.34C106.775 14.5239 107.243 14.6186 107.716 14.6184C108.186 14.6189 108.652 14.5239 109.085 14.3393C109.517 14.1547 109.908 13.8842 110.233 13.5443C110.558 13.2043 110.811 12.8019 110.976 12.3615C111.141 11.9211 111.215 11.4517 111.193 10.9818Z" fill="transparent" stroke="#5D5D5D" stroke-width="1" />
        <path class="letter-path letter-8" d="M115.848 5.1955H121.218C122.323 5.12296 123.412 5.49214 124.245 6.22188C124.51 6.4811 124.717 6.79296 124.854 7.13737C124.992 7.48178 125.055 7.85109 125.041 8.22153C125.059 8.74073 124.925 9.25389 124.654 9.69742C124.384 10.1409 123.989 10.4953 123.519 10.7167C124.158 10.8734 124.723 11.2463 125.118 11.772C125.513 12.2978 125.714 12.944 125.687 13.6011C125.687 15.7158 123.961 16.7776 121.351 16.7776H115.839L115.848 5.1955ZM120.688 9.90266C121.811 9.90266 122.528 9.53989 122.528 8.64624C122.528 7.88531 121.935 7.45175 120.856 7.45175H118.343V9.90266H120.688ZM121.369 14.5656C122.493 14.5656 123.138 14.1674 123.138 13.2738C123.138 12.3801 122.563 12.0173 121.254 12.0173H118.307V14.5656H121.369Z" fill="transparent" stroke="#5D5D5D" stroke-width="1" />
      </g>
    </svg>
  </div> -->

  <AppLayout>
    <q-page class="column items-center q-pa-md q-gutter-lg" style="justify-content: flex-start; padding-top: 40px">
      <div v-if="!isLoading" class="text-h2 text-center title-with-animation">
        Для какой цели вы хотите использовать конструктор?
        <!-- <span
          v-for="word in splitTextIntoWords('Для какой цели вы хотите использовать конструктор?')"
          :key="word.wordIndex"
          class="word"
          :data-word="word.word"
          :style="{ '--word-index': word.wordIndex }"
        >
          <span
            v-for="char in word.chars"
            :key="char.charIndex"
            class="char"
            :data-char="char.char"
            :style="{ '--global-char-index': char.globalCharIndex }"
          >
            {{ char.char }}
          </span> 
        </span>-->
      </div>

      <div v-if="isLoading" class="column items-center q-gutter-md q-my-md">
        <q-spinner size="48px" color="primary" />
        <div class="text-body2 text-grey-7 text-center">
          Подготавливаем опрос и загружаем выбранный набор вопросов
        </div>
      </div>

      <div v-if="!isLoading" class="survey-sections full-width">
        <div
          v-for="category in surveyCardCategories"
          :key="category.id"
          class="survey-section"
        >
          <div v-if="category.title" class="text-subtitle1 text-weight-bold q-mb-md category-heading ">
            {{ category.title }}
          </div>

          <div class="row q-gutter-md justify-center survey-card-grid">
            <q-card
              v-for="(card, index) in category.cards"
              :key="card.id"
              clickable
              v-ripple
              class="goal-card cursor-pointer"
              :class="`appear-card-${Math.min(index + 1, 3)}`"
              @click="openSurveyCard(card)"
            >
              <q-card-section class="goal-card-content column items-center q-gutter-sm">
                <q-icon :name="card.icon" size="48px" color="positive" />
                <div class="text-h6 text-center goal-title">{{ card.title }}</div>
                <div class="text-body2 text-grey-7 text-center goal-description">
                  {{ card.description }}
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>

      <div v-if="errorMessage" class="text-negative text-body2 text-center">
        {{ errorMessage }}
      </div>
    </q-page>
  </AppLayout>
</template>

<style scoped>
.loader-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: #fff;
  z-index: 9999;
  transition: opacity 0.52s ease-out, transform 0.52s ease-out;
  padding: 0 40px;
}

.loader-container.fade-out {
  opacity: 0;
  pointer-events: none;
}

.logo-svg {
  width: 100%;
  max-width: 100%;
  height: auto;
  margin-bottom: 40px;
  overflow: visible;
}

.logo-icon {
  opacity: 0;
  stroke-linecap: round;
  stroke-linejoin: round;
  animation: 2.6s ease-in-out infinite alternate animate-icon;
}

.letter-path {
  opacity: 0;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.letter-1 {
  animation: 2.6s ease-in-out 0s infinite alternate animate-letter;
}

.letter-2 {
  animation: 2.6s ease-in-out 0.1s infinite alternate animate-letter;
}

.letter-3 {
  animation: 2.6s ease-in-out 0.2s infinite alternate animate-letter;
}

.letter-4 {
  animation: 2.6s ease-in-out 0.29s infinite alternate animate-letter;
}

.letter-5 {
  animation: 2.6s ease-in-out 0.39s infinite alternate animate-letter;
}

.letter-6 {
  animation: 2.6s ease-in-out 0.49s infinite alternate animate-letter;
}

.letter-7 {
  animation: 2.6s ease-in-out 0.59s infinite alternate animate-letter;
}

.letter-8 {
  animation: 2.6s ease-in-out 0.68s infinite alternate animate-letter;
}

@keyframes animate-icon {
  0% {
    opacity: 1;
    fill: transparent;
    stroke: #61c13a;
    stroke-width: 1;
    stroke-dashoffset: 25%;
    stroke-dasharray: 0 32%;
  }
  50% {
    opacity: 1;
    fill: transparent;
    stroke: #61c13a;
    stroke-width: 1;
  }
  80%,
  100% {
    opacity: 1;
    fill: #61c13a;
    stroke: transparent;
    stroke-width: 0;
    stroke-dashoffset: -25%;
    stroke-dasharray: 32% 0;
  }
}

@keyframes animate-letter {
  0% {
    opacity: 1;
    fill: transparent;
    stroke: #5d5d5d;
    stroke-width: 1;
    stroke-dashoffset: 25%;
    stroke-dasharray: 0 32%;
  }
  50% {
    opacity: 1;
    fill: transparent;
    stroke: #5d5d5d;
    stroke-width: 1;
  }
  80%,
  100% {
    opacity: 1;
    fill: #5d5d5d;
    stroke: transparent;
    stroke-width: 0;
    stroke-dashoffset: -25%;
    stroke-dasharray: 32% 0;
  }
}

.survey-sections {
  max-width: 1120px;
}

.survey-section {
  margin-top: 20px;
}

.survey-card-grid {
  align-items: stretch;
}

.goal-card {
  position: relative;
  overflow: hidden;
  width: 270px;
  min-height: 235px;
  border-radius: 18px;
  border: 1px solid rgba(97, 193, 58, 0.22);
  background: transparent;
  box-shadow: none;
  opacity: 0;
  transform: translateY(28px) scale(0.97);
}

.goal-card::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.35s ease;
  pointer-events: none;
}

.goal-card:hover {
  transform: translateY(-6px) scale(1.01);
  box-shadow: 0 18px 36px rgba(18, 29, 14, 0.18);
  border-color: rgba(97, 193, 58, 0.38);
}

.goal-card:hover::before {
  opacity: 1;
}

.goal-card-content {
  min-height: 235px;
  justify-content: center;
  padding: 22px 18px;
}

.goal-title {
  min-height: 58px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1.2;
}

.goal-description {
  min-height: 54px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  line-height: 1.35;
}

.category-heading {
  color: #3f4a39;
  border-left: 4px solid #61c13a;
  padding-left: 12px;
  max-width: 1120px;
  margin-left: auto;
  margin-right: auto;
  margin-top: 60px;
}

.appear-card-1 {
  animation: cardIn 0.6s cubic-bezier(0.18, 0.72, 0.22, 1) 0.16s forwards;
}

.appear-card-2 {
  animation: cardIn 0.6s cubic-bezier(0.18, 0.72, 0.22, 1) 0.32s forwards;
}

.appear-card-3 {
  animation: cardIn 0.6s cubic-bezier(0.18, 0.72, 0.22, 1) 0.48s forwards;
}

@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(28px) scale(0.97);
    filter: blur(2px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

.title-with-animation {
  display: flex;
  gap: 0.25em;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 50px;
  margin-top: 100px;
}

.word {
  display: inline-flex;
  gap: 0;
}

.char {
  display: inline-block;
  opacity: 0;
  transform: translateY(20px);
  animation: charAppear 0.1s ease-in-out forwards;
  animation-delay: calc(var(--global-char-index, 0) * 0.03s);
}

@keyframes charAppear {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .loader-container {
    padding: 0 20px;
  }

  .goal-card {
    width: 100%;
    max-width: 320px;
  }
}
</style>
