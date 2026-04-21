import { defineStore } from 'pinia'

import NotifiedError from '../data/NotifiedError'
import CookieRepository from '../services/Repositories/CookieRepository'
import ApiService, { ApiRequestError } from '../services/ApiService'
import TokenStorageService from '../services/TokenStorageService'
import type { ILoginPayload, TokenValue } from '../types_and_interfaces'

import { useAccountStore } from './account'

interface LoginResponse {
  token: string
}

interface IntroduceClientPayload {
  name: string
}

interface LaunchStudyPayload {
  title: string
  clientId: string
  type: 'happy_survey'
}

interface StudyListItem {
  id?: string
  title?: string
  type?: string
  clientId?: string
  token?: string
}

interface PlanCyclePayload {
  title: string
  studyId: string
  methodology: string
}

interface PlanCycleResponse {
  id?: string
  cycleId?: string
  cycle?: {
    id?: string
  }
}

interface PlanSurveyPayload {
  cycleId: string
  title: string
  attributes: Record<string, unknown>
  localizedAttributes: Record<string, Record<string, unknown>>
}

interface IntroduceClientResponse {
  id?: string
  clientId?: string
  client?: {
    id?: string
  }
}

const getClientIdFromResponse = (response: IntroduceClientResponse | null): string | null => {
  if (!response) {
    return null
  }

  return response.clientId ?? response.id ?? response.client?.id ?? null
}

const normalizeToken = (token: string | null | undefined): string | null => {
  if (!token) {
    return null
  }

  const withoutBearerPrefix = token.trim().replace(/^Bearer\s+/i, '')

  if (!withoutBearerPrefix) {
    return null
  }

  const hasDoubleQuotes =
    withoutBearerPrefix.startsWith('"') && withoutBearerPrefix.endsWith('"')
  const hasSingleQuotes =
    withoutBearerPrefix.startsWith("'") && withoutBearerPrefix.endsWith("'")

  const normalized = hasDoubleQuotes || hasSingleQuotes
    ? withoutBearerPrefix.slice(1, -1)
    : withoutBearerPrefix

  return normalized || null
}

const getCycleIdFromResponse = (response: PlanCycleResponse | null): string | null => {
  if (!response) {
    return null
  }

  return response.cycleId ?? response.id ?? response.cycle?.id ?? null
}

const DEFAULT_SURVEY_LOCALIZED_ATTRIBUTES: Record<string, Record<string, unknown>> = {
  ru: {
    p1_header: 'Приглашаем Вас принять участие <br>в исследовании вовлеченности',
    p1_descript: '<strong>100% анонимно</strong>',
    page_title: 'Исследование вовлеченности',
    p1_button: 'Пройти опрос',
    p2_button: 'Продолжить опрос',
    completionNotConfirmed: 'Нет',
    completionConfirmed: 'Да',
    last_header: 'Благодарим Вас!',
    last_desc: '100% ответов сохранено.',
  },
  en: {
    p1_header: 'You are welcome to take a survey <br>on employee engagement',
    page_title: 'Employee Engagement Survey',
    p1_button: 'Start the survey',
    p2_button: 'Continue survey',
    completionNotConfirmed: 'No',
    completionConfirmed: 'Yes',
    last_header: 'Thank you!',
    last_desc: '100% of your answers are saved.',
  },
}

interface SetQuestionTypePayload {
  questionId: string
  type: string
}

interface SetSubQuestionTitlePayload {
  subQuestionId: string
  title: string
}

interface SetQuestionTitlePayload {
  questionId: string
  title: string
}

interface SetSubQuestionAttributesPayload {
  subQuestionId: string
  localizedAttributes: Record<string, unknown>
}

interface SetQuestionMetricPayload {
  questionId: string
  metricId: string
}

interface SetQuestionAttributesPayload {
  questionId: string
  attributes: Record<string, unknown>
  localizedAttributes: Record<string, unknown>
}

interface SetChoiceTitlePayload {
  choiceId: string
  title: string
}

interface SetChoiceMarkPayload {
  choiceId: string
  mark: number
}

interface SetChoiceAttributesPayload {
  choiceId: string
  localizedAttributes: Record<string, unknown>
}

interface LinkThemeTreeToQuestionPayload {
  questionId: string
  themeTreeId: string
}

interface CreateGeneralLinkPayload {
  demo: boolean
  title: string
  locale: string
  generalLinkId: string
  surveyId: string
  additionalFilters: unknown[]
  status: string
  disableFilterWithoutVirtualRespondents: boolean
  filtersConfig: {
    type: string
    permissions: Record<string, unknown>
    filterId: string | null
    maxCompletionPercent: number | null
  }
}

export interface RemoteGeneralLink {
  id?: string
  generalLinkId?: string
  title?: string
  status?: string
  url?: string
  link?: string
  locale?: string
  surveyId?: string
}

export interface RemoteChoice {
  id?: string
  choiceId?: string
  title?: string
  mark?: number
}

export interface RemoteSubQuestion {
  id?: string
  subQuestionId?: string
  title?: string
}

export interface RemoteQuestion {
  id?: string
  questionId?: string
  type?: string
  title?: string
  queueCycle?: number
  subQuestion?: RemoteSubQuestion
  subQuestions?: RemoteSubQuestion[]
  choices?: RemoteChoice[]
}

interface AuthStoreState {
  tokenService: TokenStorageService
  currentEmail: CookieRepository
  currentCompanyName: CookieRepository
  currentClientId: CookieRepository
  currentStudyId: CookieRepository
  currentCycleId: CookieRepository
  currentSurveyId: CookieRepository
  currentStudyToken: CookieRepository
  api: ApiService
  LAST_STUDY_COOKIE_NAME: string
}

export const useAuthStore = defineStore('AuthStore', {
  state: (): AuthStoreState => ({
    tokenService: new TokenStorageService(null),
    currentEmail: new CookieRepository('df86380c2714'),
    currentCompanyName: new CookieRepository('company_name'),
    currentClientId: new CookieRepository('client_id'),
    currentStudyId: new CookieRepository('current_study_id'),
    currentCycleId: new CookieRepository('current_cycle_id'),
    currentSurveyId: new CookieRepository('current_survey_id'),
    currentStudyToken: new CookieRepository('fa9f01351858'),
    api: new ApiService(),
    LAST_STUDY_COOKIE_NAME: 'last_study',
  }),
  getters: {
    isAuthenticated: (state): boolean => Boolean(state.tokenService.tokens.account.value),
    companyName: (state): string => state.currentCompanyName.value ?? '',
    clientId: (state): string => state.currentClientId.value ?? '',
    studyId: (state): string => state.currentStudyId.value ?? '',
    cycleId: (state): string => state.currentCycleId.value ?? '',
    surveyId: (state): string => state.currentSurveyId.value ?? '',
  },
  actions: {
    setCompanyName(companyName: string): void {
      this.currentCompanyName.value = companyName.trim() || null
    },

    setClientId(clientId: string | null): void {
      this.currentClientId.value = clientId?.trim() || null
    },

    getAdminApiBase(): string {
      return import.meta.env.VITE_APP_API ?? ''
    },

    getAuthHeaders(): Record<string, string> {
      const token = this.tokenService.tokens.account.value

      if (!token) {
        throw new Error('Не найден токен авторизации для выполнения запроса')
      }

      return {
        Authorization: `Bearer ${token}`,
        locale: 'ru',
        Accept: 'application/json',
      }
    },

    getStudyAuthHeaders(): Record<string, string> {
      const token = normalizeToken(this.tokenService.tokens.study.value)

      if (!token) {
        throw new Error('Не найден study-токен для выполнения запроса')
      }

      return {
        Authorization: `Bearer ${token}`,
        locale: 'ru',
        Accept: 'application/json',
      }
    },

    async renameClient(name: string): Promise<void> {
      const clientId = this.clientId
      if (!clientId) throw new Error('Не найден clientId')

      await this.api.request(
        `${this.getAdminApiBase()}/admin/rename-client`,
        'POST',
        { ...this.getAuthHeaders(), 'content-type': 'application/json' },
        JSON.stringify({ clientId, name }),
      )

      this.setCompanyName(name)
    },

    async createClient(): Promise<void> {
      const companyName = this.companyName

      if (!companyName) {
        throw new Error('Не указано название компании')
      }

      const clientResult = await this.api.request<IntroduceClientResponse>(
        `${this.getAdminApiBase()}/admin/introduce-client`,
        'POST',
        this.getAuthHeaders(),
        JSON.stringify({
          name: companyName,
        } satisfies IntroduceClientPayload),
      )

      const clientId = getClientIdFromResponse(clientResult.body)

      if (!clientId) {
        throw new Error('Не удалось получить clientId созданного клиента')
      }

      this.setClientId(clientId)
    },

    async getStudies(): Promise<StudyListItem[]> {
      const studiesResult = await this.api.request<StudyListItem[]>(
        `${this.getAdminApiBase()}/admin/get-studies`,
        'POST',
        this.getAuthHeaders(),
      )

      return Array.isArray(studiesResult.body) ? studiesResult.body : []
    },

    async launchCustomStudy(): Promise<void> {
      const clientId = this.clientId

      if (!clientId) {
        throw new Error('Не найден clientId для запуска исследования')
      }

      await this.api.request<unknown>(
        `${this.getAdminApiBase()}/admin/launch-study`,
        'POST',
        this.getAuthHeaders(),
        JSON.stringify({
          title: 'Название 1',
          clientId,
          type: 'happy_survey',
        } satisfies LaunchStudyPayload),
      )

      const studies = await this.getStudies()
      const customStudies = studies.filter((study) =>
        study.type === 'happy_survey' &&
        study.clientId === clientId &&
        study.title === 'Название 1',
      )
      const createdStudy = customStudies.at(-1)
      const studyId = createdStudy?.id ?? null

      if (!studyId) {
        throw new Error('Не удалось получить studyId созданного исследования из get-studies')
      }

      this.currentStudyId.value = studyId

      const studyToken = normalizeToken(createdStudy?.token ?? null)

      if (studyToken) {
        this.tokenService.tokens.study.value = studyToken
        this.tokenService.saveTokens()
        this.currentStudyToken.value = studyToken
      }

      const cycleId = await this.planCycle(studyId)
      await this.planSurvey(cycleId)
    },

    async planCycle(studyId: string): Promise<string> {
      const cycleResult = await this.api.request<PlanCycleResponse>(
        `${this.getAdminApiBase()}/admin/plan-cycle`,
        'POST',
        this.getStudyAuthHeaders(),
        JSON.stringify({
          title: 'Цикл 1',
          studyId,
          methodology: '2026',
        } satisfies PlanCyclePayload),
      )

      const cycleId = getCycleIdFromResponse(cycleResult.body)

      if (!cycleId) {
        throw new Error('Не удалось получить cycleId созданного цикла')
      }

      this.currentCycleId.value = cycleId
      return cycleId
    },

    async planSurvey(cycleId: string): Promise<void> {
      const result = await this.api.request<{ id?: string; surveyId?: string; survey?: { id?: string } }>(
        `${this.getAdminApiBase()}/admin/plan-survey`,
        'POST',
        this.getStudyAuthHeaders(),
        JSON.stringify({
          cycleId,
          title: 'Опрос 1',
          attributes: {},
          localizedAttributes: DEFAULT_SURVEY_LOCALIZED_ATTRIBUTES,
        } satisfies PlanSurveyPayload),
      )
      const body = result.body
      const surveyId = body?.surveyId ?? body?.id ?? body?.survey?.id ?? null
      if (surveyId) {
        this.currentSurveyId.value = surveyId
      } else {
        // fallback: fetch surveys list to find the surveyId
        await this.fetchAndSaveSurveyId(cycleId)
      }
    },

    async fetchAndSaveSurveyId(cycleId: string): Promise<void> {
      try {
        const surveys = await this.getSurveys(cycleId)
        const firstId = surveys[0]?.surveyId ?? surveys[0]?.id ?? null
        if (firstId) {
          this.currentSurveyId.value = firstId
        }
      } catch {
        // ignore, surveyId may be set via another path
      }
    },

    async getSurveys(cycleId: string): Promise<{ id?: string; surveyId?: string }[]> {
      const result = await this.api.request<
        { id?: string; surveyId?: string }[] | { surveys?: { id?: string; surveyId?: string }[] }
      >(
        `${this.getAdminApiBase()}/admin/get-surveys`,
        'POST',
        this.getStudyAuthHeaders(),
        JSON.stringify({ cycleId }),
      )
      const body = result.body
      if (Array.isArray(body)) return body
      if (body && typeof body === 'object' && 'surveys' in body) {
        return Array.isArray(body.surveys) ? body.surveys : []
      }
      return []
    },

    async setQuestionType(questionId: string, type: string): Promise<void> {
      await this.api.request<unknown>(
        `${this.getAdminApiBase()}/admin/happy-survey/set-question-type`,
        'POST',
        this.getStudyAuthHeaders(),
        JSON.stringify({ questionId, type } satisfies SetQuestionTypePayload),
      )
    },

    async setSubQuestionTitle(subQuestionId: string, title: string): Promise<void> {
      await this.api.request<unknown>(
        `${this.getAdminApiBase()}/admin/happy-survey/set-sub-question-title`,
        'POST',
        this.getStudyAuthHeaders(),
        JSON.stringify({ subQuestionId, title } satisfies SetSubQuestionTitlePayload),
      )
    },

    async setQuestionTitle(questionId: string, title: string): Promise<void> {
      await this.api.request<unknown>(
        `${this.getAdminApiBase()}/admin/happy-survey/set-question-title`,
        'POST',
        this.getStudyAuthHeaders(),
        JSON.stringify({ questionId, title } satisfies SetQuestionTitlePayload),
      )
    },

    async setSubQuestionAttributes(
      subQuestionId: string,
      localizedAttributes: Record<string, unknown>,
    ): Promise<void> {
      await this.api.request<unknown>(
        `${this.getAdminApiBase()}/admin/happy-survey/set-sub-question-attributes`,
        'POST',
        this.getStudyAuthHeaders(),
        JSON.stringify({ subQuestionId, localizedAttributes } satisfies SetSubQuestionAttributesPayload),
      )
    },

    async setQuestionMetric(questionId: string, metricId: string): Promise<void> {
      await this.api.request<unknown>(
        `${this.getAdminApiBase()}/admin/happy-survey/set-question-metric`,
        'POST',
        this.getStudyAuthHeaders(),
        JSON.stringify({ questionId, metricId } satisfies SetQuestionMetricPayload),
      )
    },

    async setQuestionAttributes(
      questionId: string,
      attributes: Record<string, unknown>,
      localizedAttributes: Record<string, unknown>,
    ): Promise<void> {
      await this.api.request<unknown>(
        `${this.getAdminApiBase()}/admin/happy-survey/set-question-attributes`,
        'POST',
        this.getStudyAuthHeaders(),
        JSON.stringify({ questionId, attributes, localizedAttributes } satisfies SetQuestionAttributesPayload),
      )
    },

    async setChoiceTitle(choiceId: string, title: string): Promise<void> {
      await this.api.request<unknown>(
        `${this.getAdminApiBase()}/admin/happy-survey/set-choice-title`,
        'POST',
        this.getStudyAuthHeaders(),
        JSON.stringify({ choiceId, title } satisfies SetChoiceTitlePayload),
      )
    },

    async setChoiceMark(choiceId: string, mark: number): Promise<void> {
      await this.api.request<unknown>(
        `${this.getAdminApiBase()}/admin/happy-survey/set-choice-mark`,
        'POST',
        this.getStudyAuthHeaders(),
        JSON.stringify({ choiceId, mark } satisfies SetChoiceMarkPayload),
      )
    },

    async setChoiceAttributes(
      choiceId: string,
      localizedAttributes: Record<string, unknown>,
    ): Promise<void> {
      await this.api.request<unknown>(
        `${this.getAdminApiBase()}/admin/happy-survey/set-choice-attributes`,
        'POST',
        this.getStudyAuthHeaders(),
        JSON.stringify({ choiceId, localizedAttributes } satisfies SetChoiceAttributesPayload),
      )
    },

    async linkThemeTreeToQuestion(questionId: string, themeTreeId: string): Promise<void> {
      await this.api.request<unknown>(
        `${this.getAdminApiBase()}/admin/happy-job/link-theme-tree-to-question`,
        'POST',
        this.getStudyAuthHeaders(),
        JSON.stringify({ questionId, themeTreeId } satisfies LinkThemeTreeToQuestionPayload),
      )
    },

    async createGeneralLink(surveyId: string): Promise<RemoteGeneralLink> {
      const result = await this.api.request<RemoteGeneralLink>(
        `${this.getAdminApiBase()}/admin/general-link/create-general-link`,
        'POST',
        this.getStudyAuthHeaders(),
        JSON.stringify({
          demo: false,
          title: 'Общая ссылка',
          locale: 'ru',
          generalLinkId: '',
          surveyId,
          additionalFilters: [],
          status: 'active',
          disableFilterWithoutVirtualRespondents: false,
          filtersConfig: {
            type: 'without_choice_without_limit',
            permissions: {},
            filterId: null,
            maxCompletionPercent: null,
          },
        } satisfies CreateGeneralLinkPayload),
      )
      return result.body
    },

    async getGeneralLinks(surveyId: string, cycleId: string): Promise<RemoteGeneralLink[]> {
      const result = await this.api.request<RemoteGeneralLink[] | { generalLinks?: RemoteGeneralLink[] }>(
        `${this.getAdminApiBase()}/admin/general-link/get-general-links`,
        'POST',
        this.getStudyAuthHeaders(),
        JSON.stringify({ surveyId, offset: 0, limit: 20, cycleId }),
      )
      const body = result.body
      if (Array.isArray(body)) return body
      if (body && typeof body === 'object' && 'generalLinks' in body) {
        return Array.isArray(body.generalLinks) ? body.generalLinks : []
      }
      return []
    },

    async copyQuestions(fromCycleId: string, toCycleId: string, questionIds: string[]): Promise<void> {
      await this.api.request<unknown>(
        `${this.getAdminApiBase()}/admin/happy-survey/copy-questions`,
        'POST',
        this.getStudyAuthHeaders(),
        JSON.stringify({ fromCycleId, toCycleId, questionIds }),
      )
    },

    async getQuestions(cycleId: string): Promise<RemoteQuestion[]> {
      const result = await this.api.request<RemoteQuestion[] | { questions?: RemoteQuestion[] }>(
        `${this.getAdminApiBase()}/admin/happy-survey/get-questions`,
        'POST',
        this.getStudyAuthHeaders(),
        JSON.stringify({ cycleId }),
      )
      const body = result.body
      if (Array.isArray(body)) return body
      if (body && typeof body === 'object' && 'questions' in body) {
        return Array.isArray(body.questions) ? body.questions : []
      }
      return []
    },

    async getCycleThemeTrees(cycleId: string): Promise<unknown[]> {
      const result = await this.api.request<unknown[]>(
        `${this.getAdminApiBase()}/admin/happy-job/get-cycle-theme-trees`,
        'POST',
        this.getStudyAuthHeaders(),
        JSON.stringify({ cycleId }),
      )
      return Array.isArray(result.body) ? result.body : []
    },

    async getFilters(cycleId: string): Promise<unknown> {
      const result = await this.api.request<unknown>(
        `${this.getAdminApiBase()}/admin/get-filters`,
        'POST',
        this.getStudyAuthHeaders(),
        JSON.stringify({ cycleId }),
      )
      return result.body
    },

    async getMetrics(cycleId: string): Promise<unknown[]> {
      const result = await this.api.request<unknown[]>(
        `${this.getAdminApiBase()}/admin/happy-job/get-metrics`,
        'POST',
        this.getStudyAuthHeaders(),
        JSON.stringify({ cycleId }),
      )
      return Array.isArray(result.body) ? result.body : []
    },

    async acceptStudyToken(token: TokenValue, studyId: string | null): Promise<void> {
      const normalizedToken = normalizeToken(token)

      this.tokenService.tokens.study.value = normalizedToken
      this.tokenService.saveTokens()

      if (studyId) {
        const studyCookie = new CookieRepository(this.LAST_STUDY_COOKIE_NAME)
        studyCookie.value = studyId
      }
    },
    doLogout(): void {
      const accountStore = useAccountStore()

      this.tokenService.deleteToken(true)

      const studyCookie = new CookieRepository(this.LAST_STUDY_COOKIE_NAME)
      studyCookie.deleteValue()

      accountStore.selectedStudy.deleteValue()
      this.currentEmail.deleteValue()
      this.currentCompanyName.deleteValue()
      this.currentClientId.deleteValue()
      this.currentStudyId.deleteValue()
      this.currentCycleId.deleteValue()
      this.currentSurveyId.deleteValue()
      this.currentStudyToken.deleteValue()
    },
    async doLogin(loginPayload: ILoginPayload): Promise<boolean> {
      try {
        const loginResult = await this.api.request<LoginResponse>(
          `${import.meta.env.VITE_APP_API ?? ''}/authenticate`,
          'POST',
          {},
          JSON.stringify(loginPayload),
        )

        this.tokenService.tokens.account.value = loginResult.body.token
        this.tokenService.saveTokens()
        this.currentEmail.value = btoa(loginPayload.email)
        await this.createClient()
        await this.api.loadSpec()

        return true
      } catch (e: unknown) {
        console.error(e)

        this.tokenService.deleteToken(true)
        this.currentClientId.deleteValue()

        if (e instanceof ApiRequestError && e.statusCode === 401) {
          new NotifiedError(e, 'Неверный логин или пароль')
        } else if (e instanceof ApiRequestError && e.statusCode === 403) {
          new NotifiedError(e, 'Нет доступа к исследованию. Пожалуйста, обратитесь к вашему менеджеру')
        } else if (e instanceof Error && e.message === 'Не указано название компании') {
          new NotifiedError(e, 'Укажите название компании')
        } else if (e instanceof Error && e.message === 'Не найден токен авторизации для выполнения запроса') {
          new NotifiedError(e, 'Не удалось подготовить авторизацию для запроса')
        } else if (e instanceof Error && e.message === 'Не удалось получить clientId созданного клиента') {
          new NotifiedError(e, 'Клиент создан, но clientId не вернулся в ответе API')
        } else if (e instanceof Error) {
          new NotifiedError(e, 'Не удалось создать клиента после входа')
        }

        return false
      }
    },
  },
})

export type AuthStoreType = ReturnType<typeof useAuthStore>
